/**
 * Formulario del composer en Misión: textarea de 1 a 4 líneas, pastilla del perfil activo
 * («Tu misión»: panel ≥1440, popover <1440), recientes ⟲, chips «Refinar», Enviar/Detener y una
 * línea de estado con la fase REAL. La espera (§2.3 C) muestra la órbita de `boot` y la luz del
 * borde, en fase y 2 vueltas como máximo. El orquestador (motor + contratos), los recientes, los
 * chips y la tarjeta se cargan en diferido; este formulario va en el chunk principal porque un
 * formulario diferido hace que el empaquetador parta React y el armazón en chunks comunes.
 */
import { lazy, Suspense, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { GLYPH, useViewportLayout } from '../../shell/public'
import { useMission } from '../../state/mission'
import { useUi } from '../../state/ui'
import { LKTRON_ENABLED } from '../analysis'
import { OrbitLoader } from '../boot'
import { getStageProjection } from '../globe'
import { useComposer } from './composerStore'
import { COMPOSER_FOCUS_EVENT, takeFocusRequest } from './focus'
import { DEMO_TAG, elapsedSeconds, isWaitingPhase, phaseLabel } from './labels'
import { LazyMissionPanel, MISSION_PANEL_ID } from './panel'
import { hidePopover, placeAbove } from './popover'
import { loadController, withController } from './runLoader'
import type { ComposerProps } from './index'
import type { MissionSnapshotData } from './missionRun'
import './composer-form.css'

export const PROMPT = 'Describe el trabajo que quieres probar para Marte…'
const RecentsMenu = lazy(() => import('./ComposerExtras').then((module) => ({ default: module.RecentsMenu })))
const PresetChips = lazy(() => import('./ComposerExtras').then((module) => ({ default: module.PresetChips })))

function snapshotOf(data: ComposerProps['data']): MissionSnapshotData | null {
  const snapshot = data.snapshot
  return data.status === 'ready' && snapshot ? { candidates: snapshot.candidates, profile: snapshot.profile } : null
}

/** Segundos de espera, una vez por segundo y solo mientras se muestran (nunca por cuadro). */
function useElapsed(startedAt: number | null, visible: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (startedAt === null || !visible) return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [startedAt, visible])
  return startedAt === null ? 0 : elapsedSeconds(startedAt, now)
}

/** Órbita alrededor del globo durante la espera (solo si la vista global está en pantalla). */
export function GlobeOrbit({ active, label }: { active: boolean; label: string }) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setHost(active && getStageProjection()?.mode !== 'flat' ? document.querySelector<HTMLElement>('[data-slot="stage.overlay"]') : null)
  }, [active])
  return host ? createPortal(<OrbitLoader active label={label} placement="globe" />, host) : null
}

export function MissionComposer({ data, placement }: Pick<ComposerProps, 'data' | 'placement'>) {
  const phase = useUi((state) => state.missionPhase)
  const run = useComposer((state) => state.run)
  const wait = useComposer((state) => state.wait)
  const result = useComposer((state) => state.result)
  const lastText = useComposer((state) => state.lastText)
  const profile = useMission((state) => state.profile)
  const source = useMission((state) => state.source)
  const error = useMission((state) => state.error)
  const revision = useMission((state) => state.revision)
  const { tramo } = useViewportLayout()
  const panelInLayout = tramo === 'wide'
  const [text, setText] = useState('')
  const [missionOpen, setMissionOpen] = useState(false)
  const field = useRef<HTMLTextAreaElement>(null)
  const missionPopover = useRef<HTMLDivElement>(null)
  const profileButton = useRef<HTMLButtonElement>(null)
  const submitted = useRef<string | null>(null)
  const uid = useId().replace(/[^\w-]/g, '')

  // Envío en curso antes de que arranque la corrida (el chunk de misión aún carga): el botón
  // pasa a Detener al instante y Detener anula el envío pendiente.
  const [sending, setSending] = useState<number | null>(null)
  const sendSeq = useRef(0)
  useEffect(() => {
    if (phase === 'error') setSending(null)
  }, [phase])
  const waiting = (run !== null && isWaitingPhase(phase)) || sending !== null
  const moving = waiting && wait !== null && wait !== 'quiet'
  const label = phaseLabel(run === null && sending !== null ? 'interpreting' : phase, run?.interpreter ?? (LKTRON_ENABLED ? 'lktron' : 'demo'))
  const snapshot = snapshotOf(data)
  const elapsed = useElapsed(run?.startedAt ?? null, waiting && (wait === 'counter' || wait === 'slow'))

  const submit = useCallback(() => {
    if (!snapshot || !text.trim()) return
    submitted.current = text
    sendSeq.current += 1
    const id = sendSeq.current
    setSending(id)
    withController(async (mission) => {
      try {
        if (sendSeq.current === id) await mission.submit(text, snapshot)
      } finally {
        if (sendSeq.current === id) setSending(null)
      }
    })
  }, [snapshot, text])
  const cancel = () => {
    sendSeq.current += 1
    setSending(null)
    withController((mission) => mission.cancel())
  }

  // Foco pedido con «/» o «✦ Refinar» (también si llegó antes de montarse) y precarga del motor.
  useEffect(() => {
    if (takeFocusRequest()) field.current?.focus()
    const onFocusRequest = () => {
      takeFocusRequest()
      field.current?.focus()
    }
    window.addEventListener(COMPOSER_FOCUS_EVENT, onFocusRequest)
    void loadController().catch(() => undefined)
    return () => window.removeEventListener(COMPOSER_FOCUS_EVENT, onFocusRequest)
  }, [])

  // Llegan resultados: «Tu misión» (popover) se cierra sola y el campo queda listo para refinar.
  const seenRevision = useRef(revision)
  useEffect(() => {
    if (revision === seenRevision.current) return
    seenRevision.current = revision
    hidePopover(missionPopover.current)
    const sent = submitted.current
    if (sent !== null) setText((current) => (current === sent ? '' : current))
    submitted.current = null
  }, [revision])

  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (waiting) cancel()
      else event.currentTarget.blur()
    } else if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      if (!waiting) submit()
    }
  }

  const active = profile ? Object.values(profile.levels).filter((level) => level > 0).length : 0
  const profileText = profile ? `${profile.origin === 'preset' ? profile.label : 'Tu perfil'} · ${active}` : 'Perfil base'
  const statusId = `composer-status-${placement}`
  const missionId = `composer-mission-${uid}`

  let status: ReactNode
  if (!snapshot) {
    status = (
      <span className="composer-status-text">
        {data.status === 'error' ? <><span aria-hidden="true">{GLYPH.fail} </span>Sin snapshot: la misión no puede calcularse.</> : 'Esperando el snapshot validado…'}
      </span>
    )
  } else if (waiting && wait === 'slow') {
    status = (
      <>
        <span className="composer-status-text">Está tardando más de lo normal · {elapsed} s</span>
        <button type="button" className="composer-link" onClick={cancel}>Cancelar</button>
        <button type="button" className="composer-link" onClick={() => withController((mission) => mission.useBaseProfile(snapshot))}>Usar perfil base</button>
      </>
    )
  } else if (waiting) {
    status = (
      <>
        {moving ? <OrbitLoader active label={label} placement="inline" /> : <span className="composer-status-text">{label}</span>}
        {wait === 'counter' && <span className="composer-status-count">· {elapsed} s</span>}
      </>
    )
  } else if ((phase === 'error' || phase === 'cancelled') && error) {
    status = (
      <>
        <span className="composer-status-text" data-tone={phase}>
          {phase === 'error' && <span aria-hidden="true">{GLYPH.fail} </span>}
          {error.message}
        </span>
        {phase === 'error' && lastText && error.code !== 'insufficient' && error.code !== 'unavailable' && (
          <button type="button" className="composer-link" onClick={() => withController((mission) => mission.retry(snapshot))}>Reintentar</button>
        )}
      </>
    )
  } else if ((phase === 'analysis' || phase === 'done') && result?.revision === revision) {
    status = (
      <span className="composer-status-text" data-tone="ok">
        {/* El rótulo DEMO va primero: el texto se trunca con elipsis y el rótulo nunca debe perderse. */}
        {source === 'demo' && <span className="composer-tag">{DEMO_TAG}</span>}
        <span aria-hidden="true">{GLYPH.ok} </span>
        {result.text}
        {phase === 'analysis' && <span className="composer-status-count"> · {label}</span>}
      </span>
    )
  } else {
    status = LKTRON_ENABLED ? (
      <span className="composer-status-text">La IA solo propone niveles por criterio; el % lo calcula el motor determinista.</span>
    ) : (
      <span className="composer-status-text"><span className="composer-tag">{DEMO_TAG}</span>Interpretación por palabras clave; el % lo calcula el motor determinista.</span>
    )
  }

  return (
    <div className="composer" data-placement={placement}>
      {!waiting && (
        <Suspense fallback={null}>
          <PresetChips snapshot={snapshot} activeProfileId={profile?.id ?? null} />
        </Suspense>
      )}

      <form
        className="composer-form"
        aria-busy={waiting || undefined}
        onSubmit={(event) => {
          event.preventDefault()
          if (waiting) cancel()
          else submit()
        }}
      >
        {moving && (
          <span className="composer-light" aria-hidden="true" key={run?.id}>
            <span className="composer-light-beam" />
          </span>
        )}
        <span aria-hidden="true" className="composer-glyph" data-done={phase === 'done' ? '' : undefined}>{GLYPH.ai}</span>
        <button
          ref={profileButton}
          type="button"
          className="composer-profile"
          aria-label={`Tu misión: ${profileText}`}
          aria-expanded={panelInLayout ? undefined : missionOpen}
          aria-controls={panelInLayout ? MISSION_PANEL_ID : missionId}
          popoverTarget={panelInLayout ? undefined : missionId}
          onClick={() => {
            if (!panelInLayout) return
            const panel = document.getElementById(MISSION_PANEL_ID)
            panel?.scrollIntoView({ block: 'nearest' })
            panel?.focus()
          }}
        >
          <span className="composer-profile-text" data-short={profile ? `Perfil · ${active}` : 'Base'}>
            <span>{profileText}</span>
          </span>
          <span aria-hidden="true" className="composer-caret">▾</span>
        </button>
        <label className="sr-only" htmlFor={`composer-${placement}`}>Tu misión</label>
        <textarea
          id={`composer-${placement}`}
          ref={field}
          rows={1}
          maxLength={600}
          value={text}
          placeholder={profile ? 'Refina tu misión…' : tramo === 'narrow' ? 'Describe tu misión…' : PROMPT}
          aria-describedby={statusId}
          aria-keyshortcuts="/"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <Suspense fallback={null}>
          <RecentsMenu
            id={`composer-recent-${uid}`}
            onPick={(value) => {
              setText(value)
              field.current?.focus()
            }}
          />
        </Suspense>
        <button type="submit" className="composer-send" data-stop={waiting ? '' : undefined} disabled={!waiting && (!snapshot || !text.trim())}>
          <span aria-hidden="true">{waiting ? '■' : '↑'}</span> <span className="composer-send-text">{waiting ? 'Detener' : 'Enviar'}</span>
        </button>
      </form>

      <p id={statusId} className="composer-status">{status}</p>

      {!panelInLayout && (
        <div
          ref={missionPopover}
          id={missionId}
          popover="auto"
          role="dialog"
          aria-label="Tu misión"
          className="composer-popover composer-mission-popover"
          onBeforeToggle={(event) => {
            if (event.newState === 'open') placeAbove(missionPopover.current, profileButton.current, 380)
          }}
          onToggle={(event) => setMissionOpen(event.newState === 'open')}
        >
          {missionOpen && (
            <Suspense fallback={<p className="composer-card-note">Tu misión · cargando…</p>}>
              <LazyMissionPanel data={data} placement="popover" />
            </Suspense>
          )}
        </div>
      )}

      <GlobeOrbit active={moving} label={label} />
    </div>
  )
}
