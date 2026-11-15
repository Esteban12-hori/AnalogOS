/**
 * Formulario del composer en Misión (ADR-013): una capa del rediseño sobre el planificador del
 * equipo. Textarea de 1 a 4 líneas, pastilla «Tu misión» (panel ≥1440, popover <1440), recientes ⟲,
 * sugerencias, Enviar/Cancelar y una línea de estado con la fase REAL.
 *
 * «Enviar» NUNCA llama a la IA: abre «Tu misión» en el paso de requisitos con el brief cargado.
 * La IA solo se usa si el usuario pulsa «Proponer requisitos con IA» allí; mientras propone, el
 * dock muestra la órbita con contador a los 3 s, aviso de lentitud a los 10 s y «Cancelar».
 * Este formulario va en el chunk principal; el controlador, los extras y la tarjeta, en diferido.
 */
import { lazy, Suspense, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { GLYPH, useViewportLayout } from '../../shell/public'
import { useMission } from '../../state/mission'
import { useUi, type MissionPhase } from '../../state/ui'
import { OrbitLoader } from '../boot'
import { getStageProjection } from '../globe'
import { useComposer } from './composerStore'
import { COMPOSER_FOCUS_EVENT, takeFocusRequest } from './focus'
import { elapsedSeconds, isWaitingPhase, phaseLabel } from './labels'
import { resultLineText } from './model'
import { LazyMissionPanel, MISSION_PANEL_ID } from './panel'
import { hidePopover, isPopoverOpen, placeAbove } from './popover'
import { loadController, withController } from './runLoader'
import type { ComposerProps } from './index'
import './composer-form.css'

export const PROMPT = 'Describe la prueba que quieres hacer para Marte…'
export const MAX_BRIEF = 3000
const RecentsMenu = lazy(() => import('./ComposerExtras').then((module) => ({ default: module.RecentsMenu })))
const SuggestionChips = lazy(() => import('./ComposerExtras').then((module) => ({ default: module.SuggestionChips })))

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

/**
 * Las sugerencias flotan sobre el dock al enfocar el composer. Con resultados en pantalla
 * taparían las tarjetas recién ordenadas: solo se ofrecen antes de evaluar. Tampoco con el
 * popover de «Tu misión» abierto (<1440): se encimarían con él y con las tarjetas.
 */
export function showSuggestions(phase: MissionPhase, waiting: boolean, missionPopoverOpen = false): boolean {
  return !waiting && !missionPopoverOpen && phase !== 'analysis' && phase !== 'done'
}

/** Línea de estado tras «Enviar»: el texto ya está en «Tu misión» (Enviar nunca llama a la IA). */
export const SENT_TEXT = 'Texto cargado en «Tu misión»: revise los requisitos, confirme y evalúe.'

/** Último pedido de apertura de «Tu misión» ya atendido (sobrevive al remontaje del composer). */
let consumedOpenRequest = 0

export function MissionComposer({ data, placement }: Pick<ComposerProps, 'data' | 'placement'>) {
  const phase = useUi((state) => state.missionPhase)
  const wait = useComposer((state) => state.wait)
  const startedAt = useComposer((state) => state.draftStartedAt)
  const notice = useComposer((state) => state.notice)
  const openRequest = useComposer((state) => state.openRequest)
  const planner = useMission((state) => state.planner)
  const evaluation = useMission((state) => state.evaluation)
  const stale = useMission((state) => state.stale)
  const { tramo } = useViewportLayout()
  const panelInLayout = tramo === 'wide'
  const [text, setText] = useState('')
  const [missionOpen, setMissionOpen] = useState(false)
  // Último texto enviado: mientras siga siendo el brief del planificador, la línea de estado lo dice.
  const [sentBrief, setSentBrief] = useState<string | null>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const missionPopover = useRef<HTMLDivElement>(null)
  const profileButton = useRef<HTMLButtonElement>(null)
  const uid = useId().replace(/[^\w-]/g, '')
  const snapshot = data.status === 'ready' ? data.snapshot : null

  const waiting = isWaitingPhase(phase)
  const moving = waiting && wait !== null && wait !== 'quiet'
  const elapsed = useElapsed(startedAt, waiting && (wait === 'counter' || wait === 'slow'))
  const requirementCount = planner?.requirements.length ?? 0
  const draftMessage = planner && (planner.draft.status === 'error' || planner.draft.status === 'unavailable') ? planner.draft.message : null

  /** Abre «Tu misión»: foco al panel izquierdo (≥1440) o popover sobre la pastilla (<1440). */
  const openMission = useCallback(() => {
    if (panelInLayout) {
      const panel = document.getElementById(MISSION_PANEL_ID)
      if (!panel) return
      // El planificador ya llevó el foco al paso pedido (o al texto enviado): no se lo quita.
      const active = document.activeElement
      if (active && active !== panel && panel.contains(active)) return
      panel.scrollIntoView({ block: 'nearest' })
      panel.focus()
      return
    }
    const popover = missionPopover.current
    if (popover && !isPopoverOpen(popover)) {
      try {
        popover.showPopover()
      } catch {
        // Popover no soportado: la pestaña «Tu misión» de la ficha sigue disponible.
      }
    }
  }, [panelInLayout])

  // Pedidos del controlador (Enviar, «Evaluar este sector», restaurar): se abre «Tu misión».
  useEffect(() => {
    if (openRequest === consumedOpenRequest) return
    consumedOpenRequest = openRequest
    window.setTimeout(openMission, 0)
  }, [openRequest, openMission])

  const submit = useCallback(() => {
    const value = text.trim()
    if (!snapshot || !value) return
    withController((mission) => {
      mission.submitBrief(text)
      setSentBrief(mission.getState().brief)
      setText('')
    })
  }, [snapshot, text])
  const cancel = () => withController((mission) => mission.cancelDraft())

  // Foco pedido con «/» o «Refinar» (también si llegó antes de montarse) y precarga del planificador.
  useEffect(() => {
    if (takeFocusRequest()) field.current?.focus()
    const onFocusRequest = () => {
      takeFocusRequest()
      field.current?.focus()
    }
    window.addEventListener(COMPOSER_FOCUS_EVENT, onFocusRequest)
    if (snapshot) void loadController().catch(() => undefined)
    return () => window.removeEventListener(COMPOSER_FOCUS_EVENT, onFocusRequest)
  }, [snapshot])

  // Al llegar una evaluación nueva el popover se cierra solo: los resultados quedan a la vista.
  const revision = useMission((state) => state.revision)
  const seenRevision = useRef(revision)
  useEffect(() => {
    if (revision === seenRevision.current) return
    seenRevision.current = revision
    if (!panelInLayout) hidePopover(missionPopover.current)
  }, [revision, panelInLayout])

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

  const profileText = requirementCount > 0 ? `Tu misión · ${requirementCount} ${requirementCount === 1 ? 'requisito' : 'requisitos'}` : 'Tu misión'
  const statusId = `composer-status-${placement}`
  const missionId = `composer-mission-${uid}`

  let status: ReactNode
  if (!snapshot) {
    status = (
      <span className="composer-status-text">
        {data.status === 'error' ? <><span aria-hidden="true">{GLYPH.fail} </span>Sin snapshot: la misión no puede evaluarse.</> : 'Esperando el snapshot validado…'}
      </span>
    )
  } else if (waiting && wait === 'slow') {
    status = (
      <>
        <span className="composer-status-text">La IA está tardando más de lo normal · {elapsed} s</span>
        <button type="button" className="composer-link" onClick={cancel}>Cancelar</button>
      </>
    )
  } else if (waiting) {
    status = (
      <>
        {moving ? <OrbitLoader active label="Proponiendo requisitos…" placement="inline" /> : <span className="composer-status-text">Proponiendo requisitos…</span>}
        {wait === 'counter' && <span className="composer-status-count">· {elapsed} s</span>}
        <button type="button" className="composer-link" onClick={cancel}>Cancelar</button>
      </>
    )
  } else if (evaluation && snapshot && !stale) {
    status = (
      <span className="composer-status-text" data-tone="ok">
        <span aria-hidden="true">{GLYPH.ok} </span>
        {resultLineText(evaluation, snapshot.candidates)}
      </span>
    )
  } else if (draftMessage) {
    status = <span className="composer-status-text" data-tone="cancelled">{draftMessage}</span>
  } else if (sentBrief !== null && planner?.brief === sentBrief) {
    status = <span className="composer-status-text">{SENT_TEXT}</span>
  } else if (notice) {
    status = <span className="composer-status-text" data-tone="cancelled">{notice}</span>
  } else if (stale) {
    status = <span className="composer-status-text">Editó la prueba: confirme y evalúe de nuevo en «Tu misión».</span>
  } else if (phase === 'review') {
    status = (
      <span className="composer-status-text">
        {phaseLabel('review')}
        {requirementCount > 0 ? ` · ${requirementCount} ${requirementCount === 1 ? 'requisito' : 'requisitos'}` : ''}
      </span>
    )
  } else {
    status = <span className="composer-status-text">Enviar abre «Tu misión»: usted define y confirma los requisitos; la IA es opcional.</span>
  }

  return (
    <div className="composer" data-placement={placement}>
      {showSuggestions(phase, waiting, missionOpen) && snapshot && (
        <Suspense fallback={null}>
          <SuggestionChips />
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
          <span className="composer-light" aria-hidden="true" key={startedAt ?? 0}>
            <span className="composer-light-beam" />
          </span>
        )}
        <button
          ref={profileButton}
          type="button"
          className="composer-profile"
          aria-label={profileText}
          aria-expanded={panelInLayout ? undefined : missionOpen}
          aria-controls={panelInLayout ? MISSION_PANEL_ID : missionId}
          popoverTarget={panelInLayout ? undefined : missionId}
          onClick={() => {
            if (panelInLayout) openMission()
          }}
        >
          <span className="composer-profile-text" data-short={requirementCount > 0 ? `Misión · ${requirementCount}` : 'Misión'}>
            <span>{profileText}</span>
          </span>
          <span aria-hidden="true" className="composer-caret">▾</span>
        </button>
        <label className="sr-only" htmlFor={`composer-${placement}`}>Describa su prueba</label>
        <textarea
          id={`composer-${placement}`}
          ref={field}
          rows={1}
          maxLength={MAX_BRIEF}
          value={text}
          placeholder={tramo === 'narrow' ? 'Describe tu prueba…' : PROMPT}
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
          <span aria-hidden="true">{waiting ? '■' : '↑'}</span> <span className="composer-send-text">{waiting ? 'Cancelar' : 'Enviar'}</span>
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
            if (event.newState === 'open') placeAbove(missionPopover.current, profileButton.current, 460)
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

      <GlobeOrbit active={moving} label="Proponiendo requisitos…" />
    </div>
  )
}
