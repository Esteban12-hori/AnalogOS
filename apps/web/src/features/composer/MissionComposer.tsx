/**
 * Composer form in Mission (ADR-013): a layer of the redesign on top of the team's planner.
 * Textarea of 1 to 4 lines, "Your mission" pill (panel ≥1440,, popover <1440), recents ⟲,
 * suggestions, Submit/Cancel, and a status line showing the REAL phase.
 *
 * "Submit" NEVER calls the AI: it opens "Your mission" at the requirements step with the brief loaded.
 * The AI is only used if the user clicks "Propose requirements with AI" there; while it is proposing, the
 * dock shows the orbit with a counter at 3 s, a slowness notice at 10 s, and "Cancel".
 * This form goes in the main chunk; the controller, the extras, and the card are deferred.
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

export const PROMPT = 'Describe the Mars test you want to run…'
export const MAX_BRIEF = 3000
const RecentsMenu = lazy(() => import('./ComposerExtras').then((module) => ({ default: module.RecentsMenu })))
const SuggestionChips = lazy(() => import('./ComposerExtras').then((module) => ({ default: module.SuggestionChips })))

/** Seconds of waiting, once per second and only while they are shown (never per frame). */
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

/** Orbit around the globe during the wait (only if the global view is on screen). */
export function GlobeOrbit({ active, label }: { active: boolean; label: string }) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setHost(active && getStageProjection()?.mode !== 'flat' ? document.querySelector<HTMLElement>('[data-slot="stage.overlay"]') : null)
  }, [active])
  return host ? createPortal(<OrbitLoader active label={label} placement="globe" />, host) : null
}

/**
 * Suggestions float above the dock when the composer is focused. With results on screen
 * they would cover the newly sorted cards: they are only offered before evaluating. Nor with the
 * "Your mission" popover open (<1440): they would overlap with it and with the cards.
 */
export function showSuggestions(phase: MissionPhase, waiting: boolean, missionPopoverOpen = false): boolean {
  return !waiting && !missionPopoverOpen && phase !== 'analysis' && phase !== 'done'
}

/** Status line after "Submit": the text is already in "Your mission" (Submit never calls the AI). */
export const SENT_TEXT = 'Text loaded in “Your mission”: review the requirements, confirm and evaluate.'

/** Last request to open "Your mission" that has already been handled (survives the composer remounting). */
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
  // Last text submitted: as long as it is still the planner's brief, the status line says so.
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

  /** Opens "Your mission": focus on the left panel (≥1440) or popover over the pill (<1440). */
  const openMission = useCallback(() => {
    if (panelInLayout) {
      const panel = document.getElementById(MISSION_PANEL_ID)
      if (!panel) return
      // The planner has already moved focus to the requested step (or to the submitted text): it does not take it away.
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
        // Popover not supported: the "Your mission" tab of the record remains available.
      }
    }
  }, [panelInLayout])

  // Requests from the controller (Submit, "Evaluate this sector", restore): "Your mission" is opened.
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

  // Focus requested with "/" or "Refine" (also if it arrived before mounting) and preload from the planner.
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

  // When a new evaluation arrives the popover closes by itself: the results remain in view.
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

  const profileText = requirementCount > 0 ? `Your mission · ${requirementCount} ${requirementCount === 1 ? 'requirement' : 'requirements'}` : 'Your mission'
  const statusId = `composer-status-${placement}`
  const missionId = `composer-mission-${uid}`

  let status: ReactNode
  if (!snapshot) {
    status = (
      <span className="composer-status-text">
        {data.status === 'error' ? <><span aria-hidden="true">{GLYPH.fail} </span>No snapshot: the mission cannot be evaluated.</> : 'Waiting for the validated snapshot…'}
      </span>
    )
  } else if (waiting && wait === 'slow') {
    status = (
      <>
        <span className="composer-status-text">The AI is taking longer than usual · {elapsed} s</span>
        <button type="button" className="composer-link" onClick={cancel}>Cancel</button>
      </>
    )
  } else if (waiting) {
    status = (
      <>
        {moving ? <OrbitLoader active label="Proposing requirements…" placement="inline" /> : <span className="composer-status-text">Proposing requirements…</span>}
        {wait === 'counter' && <span className="composer-status-count">· {elapsed} s</span>}
        <button type="button" className="composer-link" onClick={cancel}>Cancel</button>
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
    status = <span className="composer-status-text">You edited the test: confirm and evaluate again in “Your mission”.</span>
  } else if (phase === 'review') {
    status = (
      <span className="composer-status-text">
        {phaseLabel('review')}
        {requirementCount > 0 ? ` · ${requirementCount} ${requirementCount === 1 ? 'requirement' : 'requirements'}` : ''}
      </span>
    )
  } else {
    status = <span className="composer-status-text">Send opens “Your mission”: you define and confirm the requirements; the AI is optional.</span>
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
          <span className="composer-profile-text" data-short={requirementCount > 0 ? `Mission · ${requirementCount}` : 'Mission'}>
            <span>{profileText}</span>
          </span>
          <span aria-hidden="true" className="composer-caret">▾</span>
        </button>
        <label className="sr-only" htmlFor={`composer-${placement}`}>Describe your test</label>
        <textarea
          id={`composer-${placement}`}
          ref={field}
          rows={1}
          maxLength={MAX_BRIEF}
          value={text}
          placeholder={tramo === 'narrow' ? 'Describe your test…' : PROMPT}
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
          <span aria-hidden="true">{waiting ? '■' : '↑'}</span> <span className="composer-send-text">{waiting ? 'Cancel' : 'Send'}</span>
        </button>
      </form>

      <p id={statusId} className="composer-status">{status}</p>

      {!panelInLayout && (
        <div
          ref={missionPopover}
          id={missionId}
          popover="auto"
          role="dialog"
          aria-label="Your mission"
          className="composer-popover composer-mission-popover"
          onBeforeToggle={(event) => {
            if (event.newState === 'open') placeAbove(missionPopover.current, profileButton.current, 460)
          }}
          onToggle={(event) => setMissionOpen(event.newState === 'open')}
        >
          {missionOpen && (
            <Suspense fallback={<p className="composer-card-note">Your mission · loading…</p>}>
              <LazyMissionPanel data={data} placement="popover" />
            </Suspense>
          )}
        </div>
      )}

      <GlobeOrbit active={moving} label="Proposing requirements…" />
    </div>
  )
}
