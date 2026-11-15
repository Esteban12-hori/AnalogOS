import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { CandidateSite } from '../../domain/contracts'
import { useLiveText, useLocale, useT } from '../../i18n'
import { tMission } from '../../i18n/messages/mission'
import { tPlanner } from '../../i18n/messages/planner'
import { MAX_BRIEF_CHARS, exampleState, type JourneyId, type PlannerState } from '../../mission'
import { displayMissionMessage } from '../../mission/messages'
import { siteName } from '../../mission/siteName'
import { ConfirmSummary } from './ConfirmSummary'
import { RequirementEditor } from './RequirementEditor'
import { ResultView } from './ResultView'
import { ScopePicker } from './ScopePicker'
import type { PlannerApi } from './usePlanner'
import './planner.css'

export interface PlannerIntent {
  journey: JourneyId
  siteId?: string
  nonce: number
}

export type StepId = 'describe' | 'scope' | 'confirm' | 'result'

/** Step with which the view opens on a planner that already carries state (e.g., shared). */
export function initialStep(state: Pick<PlannerState, 'journey' | 'scope' | 'result'>): StepId {
  if (state.result) return 'result'
  if (state.journey === 'sector' && state.scope.mode === 'sector' && !state.scope.siteId) return 'scope'
  return 'describe'
}

export interface PlannerViewProps {
  snapshot: { candidates: CandidateSite[] }
  /** Planner: the one from usePlanner (PlannerPanel) or one shared across the whole interface. */
  api: PlannerApi
  intent: PlannerIntent | null
  /**
   * Variant for "Your mission" in the integrated interface (ADR-013): without the large header and with the
   * compact result (the per-site detail lives in the carousel, the rail and the Reading). Without it,
   * the view is identical to the team panel.
   */
  compact?: boolean
  /**
   * Requests a step from outside (e.g., "Send" in the dock opens the requirements). Each new request
   * brings focus to the step even if it was already open; with `target: 'brief'`, to the text of the test.
   */
  stepRequest?: { step: StepId; nonce: number; target?: 'brief' } | null
  /** title of "Clear all"; by default, the team's in the interface language (the standalone panel saves nothing). */
  resetHint?: string
  /** Extra content at the bottom (history and Undo in "Your mission"). */
  footer?: ReactNode
  /** "Go to the Reading" of the compact result (integrated interface, M11). */
  onOpenReading?: () => void
  /** Printable report of the current evaluation mounted (integrated interface, M11); defaults to true. */
  printReady?: boolean
}
const STEP_KEY = { describe: 'step.describe', scope: 'step.scope', confirm: 'step.confirm', result: 'step.result' } as const satisfies Record<StepId, string>
const ORDER: Record<JourneyId, StepId[]> = {
  test: ['describe', 'scope', 'confirm', 'result'],
  sector: ['scope', 'describe', 'confirm', 'result'],
}

/**
 * Last external request that already moved the focus. A remount (e.g., returning to the Mission tab)
 * reapplies the requested step but does not steal focus again with an old request.
 */
let focusedRequestNonce = 0

export function PlannerView({ snapshot, api, intent, compact = false, stepRequest = null, resetHint, footer, onOpenReading, printReady }: PlannerViewProps) {
  const { state, dispatch, built, evaluate, evaluationError, runDraft, runExplain, geologyUi, exportJson, exportError } = api
  const locale = useLocale()
  const t = useT(tPlanner)
  const tm = useT(tMission)
  const [step, setStep] = useState<StepId>(() => initialStep(state))
  const titleId = `${useId().replace(/[^\w-]/g, '')}-planner-title`
  // Step announcement: emptied when the language changes (useLiveText), never re-announced in the other language.
  const [announce, setAnnounce] = useLiveText()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const briefRef = useRef<HTMLTextAreaElement>(null)
  // Each external request brings focus back, even if the step does not change ("Send" twice).
  const [focusTick, setFocusTick] = useState(0)
  const focusBrief = useRef(false)
  const firstRender = useRef(true)
  const journey = state.journey
  const steps = journey ? ORDER[journey] : []

  useEffect(() => {
    if (!intent) return
    dispatch({ type: 'set_journey', journey: intent.journey, siteId: intent.siteId })
    setStep(intent.journey === 'sector' && !intent.siteId ? 'scope' : 'describe')
  }, [intent, dispatch])

  useEffect(() => {
    if (!stepRequest) return
    setStep(stepRequest.step === 'result' && !state.result ? 'confirm' : stepRequest.step)
    if (stepRequest.nonce === focusedRequestNonce) return
    focusedRequestNonce = stepRequest.nonce
    focusBrief.current = stepRequest.target === 'brief' && stepRequest.step === 'describe'
    setFocusTick((tick) => tick + 1)
  }, [stepRequest]) // eslint-disable-line react-hooks/exhaustive-deps

  // The result only exists while the confirmed request remains current.
  useEffect(() => {
    if (state.result) setStep('result')
    else if (step === 'result') setStep('confirm')
  }, [state.result]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (!journey) return
    const idx = steps.indexOf(step)
    setAnnounce(t('step.announce', { n: idx + 1, total: steps.length, label: t(STEP_KEY[step]) }))
    const brief = focusBrief.current && step === 'describe' ? briefRef.current : null
    focusBrief.current = false
    // Focus scrolls the panel to the step (or the loaded text) even if "Your mission" is a strip.
    if (brief) brief.focus()
    else if (step === 'result') document.getElementById('pl-result-title')?.focus()
    else headingRef.current?.focus()
  }, [step, journey, focusTick]) // eslint-disable-line react-hooks/exhaustive-deps

  const current = state.scope
  const scopeSummary = (() => {
    if (current.mode === 'catalog') return t('bar.catalog')
    if (current.mode === 'sector') {
      const c = snapshot.candidates.find((x) => x.site_id === current.siteId)
      return c ? t('bar.sector', { name: siteName(c.name, locale) }) : t('bar.noSector')
    }
    if (current.mode === 'point') return t('bar.point', { lon: current.lon || '…', lat: current.lat || '…' })
    return t('bar.bbox', { coords: [current.west, current.south, current.east, current.north].map((v) => v || '…').join(', ') })
  })()

  const idx = journey ? steps.indexOf(step) : -1
  const go = (delta: number) => setStep(steps[Math.min(Math.max(idx + delta, 0), steps.length - 2)])
  const moonHint = state.target.kind === 'rover' && /\b(luna|lunar|moon)\b/i.test(state.brief)
  const critUnmeasured = state.requirements.filter((r) => r.kind === 'unmeasured' && r.importance === 'critical').length
  const pointReqs = state.requirements.filter((r) => r.kind === 'measurable' && r.scale === 'point').length
  const aiReqs = state.requirements.filter((r) => r.origin === 'ai').length
  const d = state.draft
  const briefCountId = compact ? `${titleId}-brief-count` : 'pl-brief-count'
  const briefField = (
    <label className="pl-field wide">
      <span>{t('brief.label', { max: MAX_BRIEF_CHARS })}</span>
      <textarea ref={briefRef} rows={compact ? 4 : 5} maxLength={MAX_BRIEF_CHARS} value={state.brief} onChange={(e) => dispatch({ type: 'set_brief', brief: e.target.value })}
        placeholder={t('brief.placeholder')} aria-describedby={briefCountId} />
      <small id={briefCountId}>{state.brief.length} / {MAX_BRIEF_CHARS}</small>
    </label>
  )
  const exampleActions = (
    <div className="pl-actions">
      <button type="button" onClick={() => dispatch({ type: 'load_example', example: exampleState(locale) })}>{t('example.load')}</button>
      <span className="pl-hint">{t('example.hint')}</span>
    </div>
  )

  return (
    <section id={compact ? undefined : 'planner'} className={`planner${compact ? ' is-compact' : ' glass'}`} aria-labelledby={compact ? titleId : 'planner-title'}>
      {compact ? (
        <h2 id={titleId} className="pl-sr">{t('head.title')}</h2>
      ) : (
        <header className="pl-head">
          <span className="section-kicker">{t('head.title')}</span>
          <h2 id="planner-title">{t('head.question')}</h2>
          <p>{t('head.lead')}</p>
        </header>
      )}

      <div className="pl-entry" role="group" aria-label={t('entry.group')}>
        <button type="button" className={`pl-card${journey === 'test' ? ' on' : ''}`} aria-pressed={journey === 'test'} onClick={() => { dispatch({ type: 'set_journey', journey: 'test' }); setStep('describe') }}>
          <strong>{t('entry.test')}</strong>
          <span>{t('entry.testHint')}</span>
        </button>
        <button type="button" className={`pl-card${journey === 'sector' ? ' on' : ''}`} aria-pressed={journey === 'sector'} onClick={() => { dispatch({ type: 'set_journey', journey: 'sector' }); setStep('scope') }}>
          <strong>{t('entry.sector')}</strong>
          <span>{t('entry.sectorHint')}</span>
        </button>
      </div>

      {!journey && (
        <p className="pl-hint pl-start">{t('entry.start')}</p>
      )}

      {journey && (
        <div className="pl-flow">
          <ol className="pl-steps" aria-label={t('step.list')}>
            {steps.map((s, i) => {
              const disabled = s === 'result' && !state.result
              return (
                <li key={s}>
                  <button type="button" disabled={disabled} aria-current={s === step ? 'step' : undefined} className={s === step ? 'on' : ''} onClick={() => setStep(s)}>
                    <b>{i + 1}</b> {t(STEP_KEY[s])}
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="pl-bar">
            <span className="pl-tag">{scopeSummary}</span>
            {step !== 'scope' && step !== 'result' && <button type="button" className="pl-ghost" onClick={() => setStep('scope')}>{t('bar.changeSector')}</button>}
            <button type="button" className="pl-ghost" onClick={() => dispatch({ type: 'reset' })} title={resetHint ?? t('reset.hint')}>{t('reset.button')}</button>
          </div>

          <div className="pl-body">
            {step === 'describe' && (
              <>
                <h3 ref={headingRef} tabIndex={-1}>{t('step.headingDescribe', { n: idx + 1 })}</h3>
                {/* In "Your mission" (panel strip) the example and the text go at the top: in view without scrolling. */}
                {compact && exampleActions}
                {compact && briefField}
                <fieldset className="pl-modes">
                  <legend>{t('target.legend')}</legend>
                  <label className={`pl-radio${state.target.kind === 'rover' ? ' on' : ''}`}>
                    <input type="radio" name="target" checked={state.target.kind === 'rover'} onChange={() => dispatch({ type: 'set_target', target: { kind: 'rover', stated: '' } })} />
                    <span><strong>{tm('rover')}</strong><small>{t('target.roverHint')}</small></span>
                  </label>
                  <label className={`pl-radio${state.target.kind === 'other' ? ' on' : ''}`}>
                    <input type="radio" name="target" checked={state.target.kind === 'other'} onChange={() => dispatch({ type: 'set_target', target: { kind: 'other', stated: state.target.stated } })} />
                    <span><strong>{t('target.other')}</strong><small>{t('target.otherHint')}</small></span>
                  </label>
                  {state.target.kind === 'other' && (
                    <label className="pl-field wide">
                      <span>{t('target.describe')}</span>
                      <input type="text" maxLength={200} value={state.target.stated} onChange={(e) => dispatch({ type: 'set_target', target: { kind: 'other', stated: e.target.value } })} placeholder={t('target.placeholder')} />
                    </label>
                  )}
                  {moonHint && <p className="pl-notice">{t('target.moon')}</p>}
                </fieldset>

                {!compact && briefField}
                <label className="pl-field wide">
                  <span>{t('activity.label')}</span>
                  <input type="text" maxLength={200} value={state.activity} onChange={(e) => dispatch({ type: 'set_activity', activity: e.target.value })} placeholder={t('activity.placeholder')} />
                </label>

                {!compact && exampleActions}
                <div className="pl-ai-box">
                  <button type="button" onClick={runDraft} disabled={!state.brief.trim() || d.status === 'pending'} aria-busy={d.status === 'pending'}>
                    {d.status === 'pending' ? t('ai.asking') : t('draft.button')}
                  </button>
                  <p className="pl-hint">{t('draft.hint')}</p>
                  <div aria-live="polite">
                    {(d.status === 'error' || d.status === 'unavailable') && <p className="pl-notice">{d.message === null ? null : displayMissionMessage(d.message, locale)}</p>}
                    {d.status === 'idle' && d.message && <p className="pl-hint">{displayMissionMessage(d.message, locale)}</p>}
                    {d.status === 'done' && (
                      <p className="pl-ok">{t('draft.done', { count: aiReqs })}
                        {d.warnings.map((w) => <span key={w} className="pl-notice block">{displayMissionMessage(w, locale)}</span>)}</p>
                    )}
                  </div>
                </div>
                <RequirementEditor state={state} dispatch={dispatch} />
              </>
            )}

            {step === 'scope' && (
              <>
                <h3 ref={headingRef} tabIndex={-1}>{t('step.headingScope', { n: idx + 1 })}</h3>
                <ScopePicker journey={journey} scope={state.scope} candidates={snapshot.candidates} dispatch={dispatch} />
              </>
            )}

            {step === 'confirm' && (
              <>
                <h3 ref={headingRef} tabIndex={-1}>{t('step.headingConfirm', { n: idx + 1 })}</h3>
                <ConfirmSummary state={state} candidates={snapshot.candidates} />
                <ul className="pl-warns">
                  {state.requirements.length === 0 && <li>{t('confirm.noRequirements')}</li>}
                  {critUnmeasured > 0 && <li>{t('confirm.criticalUnmeasured', { count: critUnmeasured })}</li>}
                  {pointReqs > 0 && <li>{t('confirm.pointScale', { count: pointReqs })}</li>}
                  {aiReqs > 0 && <li>{t('confirm.aiUnedited', { count: aiReqs })}</li>}
                  {state.target.kind === 'other' && <li>{t('confirm.unsupported')}</li>}
                </ul>
                {built.issues.length > 0 && <ul className="pl-problems" role="alert">{built.issues.map((i) => <li key={i}>{displayMissionMessage(i, locale)}</li>)}</ul>}
                {!state.confirmed ? (
                  <button type="button" disabled={built.issues.length > 0} onClick={() => dispatch({ type: 'confirm' })}>{t('confirm.button')}</button>
                ) : (
                  <div className="pl-actions">
                    <p className="pl-ok">{t('confirm.done')}</p>
                    <button type="button" onClick={() => evaluate()}>{t('confirm.evaluate')}</button>
                    <button type="button" className="pl-ghost" onClick={() => dispatch({ type: 'unconfirm' })}>{t('confirm.edit')}</button>
                  </div>
                )}
                {evaluationError && <p className="pl-notice" role="alert">{displayMissionMessage(evaluationError, locale)}</p>}
              </>
            )}

            {step === 'result' && state.result && built.request && (
              <ResultView evaluation={state.result} request={built.request} state={state} candidates={snapshot.candidates}
                onExplain={runExplain} geo={geologyUi} onExport={exportJson} exportError={exportError} onEdit={() => dispatch({ type: 'unconfirm' })} compact={compact}
                onOpenReading={onOpenReading} printReady={printReady} />
            )}
          </div>

          {step !== 'result' && (
            <nav className="pl-nav" aria-label={t('nav.label')}>
              <button type="button" className="pl-ghost" disabled={idx <= 0} onClick={() => go(-1)}>{t('nav.back')}</button>
              {step !== 'confirm' && <button type="button" onClick={() => go(1)}>{t('nav.next')}</button>}
            </nav>
          )}
        </div>
      )}

      {footer}
      {/* The printable report lives in ResultView; here only the accessible announcement of steps. */}
      <div className="pl-sr" role="status" aria-live="polite">{announce}</div>
    </section>
  )
}
