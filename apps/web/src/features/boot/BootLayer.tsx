/**
 * Capa de arranque «Órbita honesta» (slot `stage.overlay`). Continúa sin saltos lo que pintó el
 * HTML estático (mismo marcado y la misma fase del satélite) y avanza solo con hitos reales:
 *
 *   orbit  · póster/silueta, anillo, satélite (2 × 2,4 s) y bitácora
 *   reveal · el globo 3D ya se ve: onda del anillo, ui.introPhase = 'play' (aterrizaje del globo)
 *   fold   · ~1,6 s después la bitácora se pliega en el chip (CSS, 280 ms)
 *   done   · ui.introPhase = 'done'; queda solo la órbita de la espera de la IA cuando se pide
 *
 * Cualquier pointerdown, rueda o tecla salta al estado final. Completa una vez por sesión;
 * `?intro=full` la fuerza. Si todo carga en <300 ms: sin órbita ni bitácora, solo el aterrizaje.
 * Las animaciones son CSS (boot.css) sobre `data-phase`; aquí solo hay temporizadores y estado.
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

// La órbita de la espera de la IA (Misión) se descarga la primera vez que se pide.
const StageOrbit = lazy(() => import('./StageOrbit'))
const BRIDGE: StageFrameBridge = { getProjection: getStageProjection, subscribe: subscribeStageFrame }

/** Inicio (reloj del documento) de las animaciones del HTML estático, si ya corrían. */
const STATIC_CLOCK = (() => {
  const start = typeof document === 'undefined' ? null : document.querySelector('.boot-orbit')?.getAnimations?.()[0]?.startTime
  return typeof start === 'number' ? start : null
})()

function session(write?: boolean): boolean {
  try {
    if (write) sessionStorage.setItem(INTRO_SESSION_KEY, '1')
    return sessionStorage.getItem(INTRO_SESSION_KEY) !== null
  } catch {
    return false // sin almacenamiento de sesión: se trata como primera visita
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

  // El modo vive en <html data-boot>: lo lee el CSS del HTML estático y de React.
  useLayoutEffect(() => {
    document.documentElement.dataset.boot = mode
  }, [mode])

  useEffect(() => uiActions.setIntroPhase(intro), [intro])

  // Revelado cuando el globo 3D ya se ve (o no habrá globo); con ?intro=full, tras sostener la órbita.
  useEffect(() => {
    if (!visible || phase !== 'orbit') return
    const at = now()
    const timer = window.setTimeout(() => dispatch({ type: 'visible', at }), revealDelay(mode, at))
    return () => window.clearTimeout(timer)
  }, [visible, phase, mode])

  // reveal → fold a los ~1,6 s; fold → done al terminar el pliegue. Una vez por sesión.
  useEffect(() => {
    const ms = phaseTimer(phase)
    if (phase === 'done') session(true)
    if (ms === null) return
    const timer = window.setTimeout(() => dispatch({ type: 'timer' }), ms)
    return () => window.clearTimeout(timer)
  }, [phase])

  // Cualquier pointerdown, rueda o tecla salta al estado final.
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

  // Con la órbita ya quieta (2 vueltas), las líneas en curso muestran el tiempo transcurrido.
  const waiting = phase === 'orbit' && mode !== 'quiet'
  useEffect(() => {
    if (!waiting) return setElapsed(null)
    const still = BOOT_TIMING.fastMs + BOOT_TIMING.loopMs * BOOT_TIMING.loops
    const tick = () => setElapsed(now() >= still ? Math.floor(now() / 1000) : null)
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [waiting])

  // El póster se funde (450 ms) y luego sale del DOM.
  useEffect(() => {
    if (!posterHidden) return
    const timer = window.setTimeout(() => setPosterGone(true), 600)
    return () => window.clearTimeout(timer)
  }, [posterHidden])

  // Un solo anuncio al validarse el snapshot (la bitácora es aria-hidden).
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
