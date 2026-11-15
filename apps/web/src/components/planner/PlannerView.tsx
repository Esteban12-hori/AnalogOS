import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import type { CandidateSite } from '../../domain/contracts'
import { shortCandidateName } from '../../domain/formatting'
import { MAX_BRIEF_CHARS, exampleState, type JourneyId, type PlannerState } from '../../mission'
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
  /** title of "Clear all"; by default, the team's (the standalone panel does not save anything). */
  resetHint?: string
  /** Extra content at the bottom (history and Undo in "Your mission"). */
  footer?: ReactNode
  /** "Go to the Reading" of the compact result (integrated interface, M11). */
  onOpenReading?: () => void
  /** Printable report of the current evaluation mounted (integrated interface, M11); defaults to true. */
  printReady?: boolean
}
const STEP_LABEL: Record<StepId, string> = { describe: 'Describe the test', scope: 'Choose the sector', confirm: 'Confirm and evaluate', result: 'Result' }
const ORDER: Record<JourneyId, StepId[]> = {
  test: ['describe', 'scope', 'confirm', 'result'],
  sector: ['scope', 'describe', 'confirm', 'result'],
}

const RESET_HINT = 'The text lives only on this page; nothing is saved in the browser.'

/**
 * Last external request that already moved the focus. A remount (e.g., returning to the Mission tab)
 * reapplies the requested step but does not steal focus again with an old request.
 */
let focusedRequestNonce = 0

export function PlannerView({ snapshot, api, intent, compact = false, stepRequest = null, resetHint = RESET_HINT, footer, onOpenReading, printReady }: PlannerViewProps) {
  const { state, dispatch, built, evaluate, evaluationError, runDraft, runExplain, geologyUi, exportJson, exportError } = api
  const [step, setStep] = useState<StepId>(() => initialStep(state))
  const titleId = `${useId().replace(/[^\w-]/g, '')}-planner-title`
  const [announce, setAnnounce] = useState('')
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
    setAnnounce(`Step ${idx + 1} of ${steps.length}: ${STEP_LABEL[step]}`)
    const brief = focusBrief.current && step === 'describe' ? briefRef.current : null
    focusBrief.current = false
    // Focus scrolls the panel to the step (or the loaded text) even if "Your mission" is a strip.
    if (brief) brief.focus()
    else if (step === 'result') document.getElementById('pl-result-title')?.focus()
    else headingRef.current?.focus()
  }, [step, journey, focusTick]) // eslint-disable-line react-hooks/exhaustive-deps

  const current = state.scope
  const scopeSummary = (() => {
    if (current.mode === 'catalog') return 'Compare the seven areas'
    if (current.mode === 'sector') {
      const c = snapshot.candidates.find((x) => x.site_id === current.siteId)
      return c ? `Sector: ${shortCandidateName(c.name)}` : 'No sector chosen'
    }
    if (current.mode === 'point') return `Point: ${current.lon || '…'}, ${current.lat || '…'}`
    return `Rectangle: ${[current.west, current.south, current.east, current.north].map((v) => v || '…').join(', ')}`
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
      <span>Describe your test (optional, up to {MAX_BRIEF_CHARS} characters)</span>
      <textarea ref={briefRef} rows={compact ? 4 : 5} maxLength={MAX_BRIEF_CHARS} value={state.brief} onChange={(e) => dispatch({ type: 'set_brief', brief: e.target.value })}
        placeholder="What you want to test, what is a must-have and what is preferred…" aria-describedby={briefCountId} />
      <small id={briefCountId}>{state.brief.length} / {MAX_BRIEF_CHARS}</small>
    </label>
  )
  const exampleActions = (
    <div className="pl-actions">
      <button type="button" onClick={() => dispatch({ type: 'load_example', example: exampleState() })}>Load an example</button>
      <span className="pl-hint">Editable example with sample values: it is not a recommendation or a standard.</span>
    </div>
  )

  return (
    <section id={compact ? undefined : 'planner'} className={`planner${compact ? ' is-compact' : ' glass'}`} aria-labelledby={compact ? titleId : 'planner-title'}>
      {compact ? (
        <h2 id={titleId} className="pl-sr">Test planner</h2>
      ) : (
        <header className="pl-head">
          <span className="section-kicker">Test planner</span>
          <h2 id="planner-title">Which sector deserves reconnaissance for your test?</h2>
          <p>Describe your test or choose a sector. The result says which area to prioritize, what rules it out and what still needs measuring, with real snapshot data and without approving anything.</p>
        </header>
      )}

      <div className="pl-entry" role="group" aria-label="Choose a path">
        <button type="button" className={`pl-card${journey === 'test' ? ' on' : ''}`} aria-pressed={journey === 'test'} onClick={() => { dispatch({ type: 'set_journey', journey: 'test' }); setStep('describe') }}>
          <strong>Define a test</strong>
          <span>Tell me what you want to test and I will show you which areas meet it and which do not.</span>
        </button>
        <button type="button" className={`pl-card${journey === 'sector' ? ' on' : ''}`} aria-pressed={journey === 'sector'} onClick={() => { dispatch({ type: 'set_journey', journey: 'sector' }); setStep('scope') }}>
          <strong>Evaluate a sector</strong>
          <span>Choose one of the seven areas with evidence, a point or a rectangle.</span>
        </button>
      </div>

      {!journey && (
        <p className="pl-hint pl-start">
          First supported profile: Mars rover with the regional Jezero reference. Other objectives are kept as “not supported”.
          It works offline and without AI; the AI is an optional helper.
        </p>
      )}

      {journey && (
        <div className="pl-flow">
          <ol className="pl-steps" aria-label="Steps">
            {steps.map((s, i) => {
              const disabled = s === 'result' && !state.result
              return (
                <li key={s}>
                  <button type="button" disabled={disabled} aria-current={s === step ? 'step' : undefined} className={s === step ? 'on' : ''} onClick={() => setStep(s)}>
                    <b>{i + 1}</b> {STEP_LABEL[s]}
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="pl-bar">
            <span className="pl-tag">{scopeSummary}</span>
            {step !== 'scope' && step !== 'result' && <button type="button" className="pl-ghost" onClick={() => setStep('scope')}>Change sector</button>}
            <button type="button" className="pl-ghost" onClick={() => dispatch({ type: 'reset' })} title={resetHint}>Clear everything and start over</button>
          </div>

          <div className="pl-body">
            {step === 'describe' && (
              <>
                <h3 ref={headingRef} tabIndex={-1}>{idx + 1}. Describe your test</h3>
                {/* In "Your mission" (panel strip) the example and the text go at the top: in view without scrolling. */}
                {compact && exampleActions}
                {compact && briefField}
                <fieldset className="pl-modes">
                  <legend>Objective</legend>
                  <label className={`pl-radio${state.target.kind === 'rover' ? ' on' : ''}`}>
                    <input type="radio" name="target" checked={state.target.kind === 'rover'} onChange={() => dispatch({ type: 'set_target', target: { kind: 'rover', stated: '' } })} />
                    <span><strong>Mars rover (Jezero reference)</strong><small>The only profile supported with real data.</small></span>
                  </label>
                  <label className={`pl-radio${state.target.kind === 'other' ? ' on' : ''}`}>
                    <input type="radio" name="target" checked={state.target.kind === 'other'} onChange={() => dispatch({ type: 'set_target', target: { kind: 'other', stated: state.target.stated } })} />
                    <span><strong>Other objective / not supported</strong><small>Your request is kept, but nothing is calculated or recommended.</small></span>
                  </label>
                  {state.target.kind === 'other' && (
                    <label className="pl-field wide">
                      <span>Describe it</span>
                      <input type="text" maxLength={200} value={state.target.stated} onChange={(e) => dispatch({ type: 'set_target', target: { kind: 'other', stated: e.target.value } })} placeholder="E.g. lunar habitat, drilling…" />
                    </label>
                  )}
                  {moonHint && <p className="pl-notice">The text mentions the Moon: the only supported profile is Mars rover. Choose “Other objective” if that applies.</p>}
                </fieldset>

                {!compact && briefField}
                <label className="pl-field wide">
                  <span>Activity (optional)</span>
                  <input type="text" maxLength={200} value={state.activity} onChange={(e) => dispatch({ type: 'set_activity', activity: e.target.value })} placeholder="E.g. rover autonomous navigation" />
                </label>

                {!compact && exampleActions}
                <div className="pl-ai-box">
                  <button type="button" onClick={runDraft} disabled={!state.brief.trim() || d.status === 'pending'} aria-busy={d.status === 'pending'}>
                    {d.status === 'pending' ? 'Asking the AI…' : 'Propose requirements with AI (optional)'}
                  </button>
                  <p className="pl-hint">When you press it, the text of your test is sent to Anthropic to propose a draft. The manual flow sends nothing. The AI does not confirm or evaluate: you review and confirm.</p>
                  <div aria-live="polite">
                    {(d.status === 'error' || d.status === 'unavailable') && <p className="pl-notice">{d.message}</p>}
                    {d.status === 'idle' && d.message && <p className="pl-hint">{d.message}</p>}
                    {d.status === 'done' && (
                      <p className="pl-ok">The AI proposed {aiReqs} requirement(s). Review them below: they are not confirmed.
                        {d.warnings.map((w) => <span key={w} className="pl-notice block">{w}</span>)}</p>
                    )}
                  </div>
                </div>
                <RequirementEditor state={state} dispatch={dispatch} />
              </>
            )}

            {step === 'scope' && (
              <>
                <h3 ref={headingRef} tabIndex={-1}>{idx + 1}. Choose the sector</h3>
                <ScopePicker journey={journey} scope={state.scope} candidates={snapshot.candidates} dispatch={dispatch} />
              </>
            )}

            {step === 'confirm' && (
              <>
                <h3 ref={headingRef} tabIndex={-1}>{idx + 1}. Confirm and evaluate</h3>
                <ConfirmSummary state={state} candidates={snapshot.candidates} />
                <ul className="pl-warns">
                  {state.requirements.length === 0 && <li>Without requirements, every area is prioritized by similarity alone. Add requirements for a useful recommendation.</li>}
                  {critUnmeasured > 0 && <li>{critUnmeasured} unmeasured must-have requirement(s): no area can be prioritized (insufficient evidence).</li>}
                  {pointReqs > 0 && <li>{pointReqs} point-scale requirement(s): they are not assessed with window medians.</li>}
                  {aiReqs > 0 && <li>{aiReqs} requirement(s) come from an unedited AI proposal; by confirming, you make them yours.</li>}
                  {state.target.kind === 'other' && <li>The objective is not supported: a report without calculation or recommendation will be generated.</li>}
                </ul>
                {built.issues.length > 0 && <ul className="pl-problems" role="alert">{built.issues.map((i) => <li key={i}>{i}</li>)}</ul>}
                {!state.confirmed ? (
                  <button type="button" disabled={built.issues.length > 0} onClick={() => dispatch({ type: 'confirm' })}>Confirm requirements and sector</button>
                ) : (
                  <div className="pl-actions">
                    <p className="pl-ok">Confirmed. If you change anything you will have to confirm again.</p>
                    <button type="button" onClick={() => evaluate()}>Evaluate now</button>
                    <button type="button" className="pl-ghost" onClick={() => dispatch({ type: 'unconfirm' })}>Edit</button>
                  </div>
                )}
                {evaluationError && <p className="pl-notice" role="alert">{evaluationError}</p>}
              </>
            )}

            {step === 'result' && state.result && built.request && (
              <ResultView evaluation={state.result} request={built.request} state={state} candidates={snapshot.candidates}
                onExplain={runExplain} geo={geologyUi} onExport={exportJson} exportError={exportError} onEdit={() => dispatch({ type: 'unconfirm' })} compact={compact}
                onOpenReading={onOpenReading} printReady={printReady} />
            )}
          </div>

          {step !== 'result' && (
            <nav className="pl-nav" aria-label="Step navigation">
              <button type="button" className="pl-ghost" disabled={idx <= 0} onClick={() => go(-1)}>← Back</button>
              {step !== 'confirm' && <button type="button" onClick={() => go(1)}>Next →</button>}
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
