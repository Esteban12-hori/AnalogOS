/**
 * "Honest orbit" boot layer (slot `stage.overlay`). Seamlessly continues what the static
 * HTML painted (same markup and same satellite phase) and advances only on real milestones:
 *
 *   orbit  · poster/silhouette, ring, satellite (2 × 2,4 s) and log
 *   reveal · the 3D globe is now visible: ring wave, ui.introPhase = 'play' (globe landing)
 *   fold   · ~1,6 s later the log folds into the chip (CSS, 280 ms)
 *   done   · ui.introPhase = 'done'; only the AI-wait orbit remains, when requested
 *
 * Any pointerdown, wheel or key jumps to the final state. Completes once per session;
 * `?intro=full` forces it. If everything loads in <300 ms: no orbit or log, only the landing.
 * The animations are CSS (boot.css) on `data-phase`; here there are only timers and state.
 */
import { lazy, Suspense, useEffect, useLayoutEffect, useReducer, useRef, useState, type CSSProperties } from 'react'
import { bootPoster, GLOBE_POSTER } from '../../data/preload'
import { announce, stageTramo, useViewportLayout } from '../../shell/public'
import { useStore } from '../../state/store'
import { uiActions } from '../../state/ui'
import { getStageProjection, subscribeStageFrame } from '../globe'
import {
  BOOT_TIMING,
  bootLines,
  bootReducer,
  initialBootState,
  INTRO_SESSION_KEY,
  introPhaseFor,
  LINE_GLYPH,
  orbitGeometry,
  orbitVars,
  phaseTimer,
  resolveIntroMode,
  revealDelay,
  snapshotAnnouncement,
  snapshotLabel,
  stageVisible,
  type IntroMode,
} from './bootModel'
import { now, useBootMilestones, useStageOrbit } from './milestones'
import type { StageFrameBridge } from './StageOrbit'
import type { BootLayerProps } from './index'
import './boot.css'

// The AI-wait orbit (Mission) is downloaded the first time it is requested.
const StageOrbit = lazy(() => import('./StageOrbit'))
const BRIDGE: StageFrameBridge = { getProjection: getStageProjection, subscribe: subscribeStageFrame }

/** Start (document clock) of the static HTML animations, if they were already running. */
const STATIC_CLOCK = (() => {
  const start = typeof document === 'undefined' ? null : document.querySelector('.boot-orbit')?.getAnimations?.()[0]?.startTime
  return typeof start === 'number' ? start : null
})()

function session(write?: boolean): boolean {
  try {
    if (write) sessionStorage.setItem(INTRO_SESSION_KEY, '1')
    return sessionStorage.getItem(INTRO_SESSION_KEY) !== null
  } catch {
    return false // no session storage: treated as a first visit
  }
}

function initialMode(): IntroMode {
  if (typeof window === 'undefined') return 'normal'
  const preset = document.documentElement.dataset.boot
  return preset === 'full' || preset === 'normal' || preset === 'quiet' ? preset : resolveIntroMode(location.search, session())
}

export function BootLayer({ data }: BootLayerProps) {
  const { width, height } = useViewportLayout()
  const milestones = useBootMilestones()
  const posterHidden = useStore(bootPoster, (state) => state.hidden)
  const orbitRequested = useStageOrbit() !== null
  const [{ phase, mode }, dispatch] = useReducer(bootReducer, undefined, () => initialBootState(initialMode()))
  const [shift] = useState(() => (STATIC_CLOCK === null ? 0 : Math.min(0, STATIC_CLOCK - now())))
  const [posterGone, setPosterGone] = useState(false)
  const [elapsed, setElapsed] = useState<number | null>(null)
  const [waitOrbit, setWaitOrbit] = useState(false)
  const version = data.snapshot?.manifest.snapshot_version ?? null
  const evaluated = data.snapshot?.candidates.filter((site) => site.role !== 'reference').length ?? 0
  const references = data.snapshot?.candidates.filter((site) => site.role === 'reference').length ?? 0
  const visible = stageVisible(milestones, stageTramo(width) !== 'narrow', posterHidden)
  const intro = introPhaseFor({ phase, mode }, milestones.globe)

  // The mode lives in <html data-boot>: it is read by the CSS of the static HTML and of React.
  useLayoutEffect(() => {
    document.documentElement.dataset.boot = mode
  }, [mode])

  useEffect(() => uiActions.setIntroPhase(intro), [intro])

  // Revealed when the 3D globe is already visible (or there will be no globe); with ?intro=full, after holding the orbit.
  useEffect(() => {
    if (!visible || phase !== 'orbit') return
    const at = now()
    const timer = window.setTimeout(() => dispatch({ type: 'visible', at }), revealDelay(mode, at))
    return () => window.clearTimeout(timer)
  }, [visible, phase, mode])

  // reveal → fold at ~1,6 s; fold → done when the fold ends. Once per session.
  useEffect(() => {
    const ms = phaseTimer(phase)
    if (phase === 'done') session(true)
    if (ms === null) return
    const timer = window.setTimeout(() => dispatch({ type: 'timer' }), ms)
    return () => window.clearTimeout(timer)
  }, [phase])

  // Any pointerdown, wheel or key jumps to the final state.
  const interruptible = phase === 'orbit' || phase === 'reveal'
  useEffect(() => {
    if (!interruptible) return
    const skip = () => dispatch({ type: 'interaction' })
    const events = ['pointerdown', 'wheel', 'keydown'] as const
    for (const name of events) window.addEventListener(name, skip, { capture: true, passive: true })
    return () => {
      for (const name of events) window.removeEventListener(name, skip, { capture: true })
    }
  }, [interruptible])

  // With the orbit already still (2 turns), the in-progress lines show the elapsed time.
  const waiting = phase === 'orbit' && mode !== 'quiet'
  useEffect(() => {
    if (!waiting) return setElapsed(null)
    const still = BOOT_TIMING.fastMs + BOOT_TIMING.loopMs * BOOT_TIMING.loops
    const tick = () => setElapsed(now() >= still ? Math.floor(now() / 1000) : null)
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [waiting])

  // The poster fades out (450 ms) and then leaves the DOM.
  useEffect(() => {
    if (!posterHidden) return
    const timer = window.setTimeout(() => setPosterGone(true), 600)
    return () => window.clearTimeout(timer)
  }, [posterHidden])

  // A single announcement when the snapshot is validated (the log is aria-hidden).
  const announced = useRef(false)
  useEffect(() => {
    if (announced.current || milestones.snapshot !== 'ok' || !version) return
    announced.current = true
    announce(snapshotAnnouncement(version, evaluated, references))
  }, [milestones.snapshot, version, evaluated, references])

  useEffect(() => {
    if (orbitRequested) setWaitOrbit(true)
  }, [orbitRequested])

  const intact = phase === 'orbit' || phase === 'reveal'
  const style = { ...orbitVars(orbitGeometry(width, height)), '--boot-shift': `${shift}ms` } as CSSProperties
  return (
    <>
      {(phase !== 'done' || !posterGone) && (
        <div className="boot" data-phase={phase} aria-hidden="true" style={style}>
          {!posterGone && (
            <picture>
              <source media="(min-width: 1100px)" srcSet={GLOBE_POSTER.url} />
              <img className="boot-poster" alt="" decoding="sync" data-hidden={posterHidden ? '' : undefined} />
            </picture>
          )}
          {intact && <span className="boot-disc" data-hidden={phase !== 'orbit' || posterHidden ? '' : undefined} />}
          {intact && mode !== 'quiet' && (
            <span className="boot-orbit"><span className="boot-wave"><span className="boot-ring"><span className="boot-sat" /></span></span></span>
          )}
          {phase !== 'done' && mode !== 'quiet' && (
            <ul className="boot-log">
              {bootLines(milestones, version, elapsed).map((line) => (
                <li key={line.id} data-s={line.state}><span>{LINE_GLYPH[line.state]}</span>{line.text}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {phase === 'done' && waitOrbit && (
        <Suspense fallback={null}>
          <StageOrbit bridge={BRIDGE} />
        </Suspense>
      )}
    </>
  )
}
