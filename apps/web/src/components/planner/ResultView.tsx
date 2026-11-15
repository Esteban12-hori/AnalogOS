import type { CandidateSite } from '../../domain/contracts'
import { formatScore, shortCandidateName } from '../../domain/formatting'
import {
  composeExplanation, describeEffective, describeScope, evaluationFingerprint, fmtObserved, fmtQuantity, SCOPE_STATE_LABEL, siteMeasures, type EvidenceRef, type MissionEvaluation, type MissionRequest,
  type OptionEvaluation, type OptionStatus, type PlannerState, type RequirementResult,
} from '../../mission'
import { displaySource, verificationDisplayText } from '../../i18n/sourceText'
import { GeometryFigure } from './GeometryFigure'
import { GeologyGuidance, PrintGeology, guidanceView } from './GeologyGuidance'
import type { GeologyUi } from './usePlanner'
import type { GeologyCatalog, GeologyGuidanceView } from '../../../../../shared/geology/guidance'

const STATUS: Record<OptionStatus, string> = {
  priorizado_para_reconocimiento: 'Prioritized for reconnaissance',
  no_cumple_requisitos: 'Does not meet requirements',
  evidencia_insuficiente: 'Insufficient evidence',
  objetivo_no_soportado: 'Unsupported objective',
}
const REQ_STATUS: Record<RequirementResult['status'], string> = { cumple: 'Met', no_cumple: 'Not met', no_evaluable: 'Not assessable' }
const SCOPE_STATE = SCOPE_STATE_LABEL
const OUTCOME_COPY: Record<MissionEvaluation['outcome'], string> = {
  evaluated: '', unsupported_target: 'This objective has no supported profile',
  needs_window_selection: 'There is evidence for a window, not for the point: it still needs to be chosen',
  insufficient_coverage: 'Insufficient evidence for this geometry',
}

const safeUrl = (u: string | null): string | null => (u && /^https:\/\//.test(u) ? u : null)
const country = (c: string | null) => (c === 'AR' ? 'Argentina' : c === 'CL' ? 'Chile' : '—')

function EvidenceLinks({ ids, map }: { ids: string[]; map: Map<string, EvidenceRef> }) {
  if (!ids.length) return <span className="pl-muted">—</span>
  return (
    <>
      {ids.map((id) => {
        const url = safeUrl(map.get(id)?.source_url ?? null)
        return url ? <a key={id} href={url} target="_blank" rel="noreferrer noopener" className="pl-evid">{id}</a> : <code key={id} className="pl-evid">{id}</code>
      })}
    </>
  )
}

export function CriteriaTable({ results, map }: { results: RequirementResult[]; map: Map<string, EvidenceRef> }) {
  if (!results.length) return <p className="pl-muted">There are no requirements to evaluate.</p>
  return (
    <div className="pl-table-wrap">
      <table className="pl-table pl-criteria-table">
        <thead><tr><th>Requirement</th><th>Required</th><th>Observed</th><th>Result</th><th>Scale · period</th><th>Evidence</th></tr></thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.requirement_id} className={r.status}>
              <th scope="row">{r.label}<small>{r.importance === 'critical' ? 'Must-have' : 'Preference'}</small></th>
              <td>{r.required}{r.conversion && <small>{r.conversion}</small>}</td>
              <td>{fmtObserved(r.observed_value, r.observed_unit)}</td>
              <td><b className={`pl-res ${r.status}`}>{REQ_STATUS[r.status]}</b><small>{r.reason}</small></td>
              <td><small>{r.scale_note === null ? '—' : displaySource(r.scale_note)}{r.period ? ` · ${r.period}` : ''}</small></td>
              <td><EvidenceLinks ids={r.evidence_ids} map={map} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Measures({ site }: { site: CandidateSite }) {
  return (
    <div className="pl-table-wrap">
      <table className="pl-table compact">
        <caption>Snapshot measurements for this window (full-window statistics)</caption>
        <thead><tr><th>Measurement</th><th>Value</th><th>Scale</th></tr></thead>
        <tbody>
          {siteMeasures(site).map((m) => (
            <tr key={m.metric_id}><th scope="row">{m.label}</th><td>{m.value === null ? 'no data' : typeof m.value === 'number' ? fmtQuantity(m.value, m.unit) : m.value}</td><td><small>{m.scale_note}</small></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OptionCard({ o, site, map }: { o: OptionEvaluation; site: CandidateSite | undefined; map: Map<string, EvidenceRef> }) {
  const crit = o.requirement_results.filter((r) => r.importance === 'critical')
  const blockers = o.requirement_results.filter((r) => r.importance === 'critical' && r.status !== 'cumple')
  return (
    <article className={`pl-opt ${o.status}`}>
      <header>
        {o.rank !== null && <span className="pl-rank" aria-label={`Rank ${o.rank}`}>{o.rank}</span>}
        <div>
          <h4>{shortCandidateName(o.name)}</h4>
          <small>{country(o.country)}{o.role === 'reference' && <b className="pl-tag ref">REF · known reference</b>}</small>
        </div>
        <span className={`pl-status ${o.status}`}>{STATUS[o.status]}</span>
      </header>
      {o.status !== 'objetivo_no_soportado' && (
        <p className="pl-counts">
          Must-haves: {crit.filter((r) => r.status === 'cumple').length} met · {o.critical_failed.length} not met · {o.critical_unknown.length} not assessable.
          {' '}Preferences: {o.preferences.met} of {o.preferences.total} met{o.preferences.unknown > 0 && `, ${o.preferences.unknown} unknown`}.
        </p>
      )}
      {blockers.length > 0 && (
        <ul className="pl-blockers" aria-label="What blocks it">
          {blockers.map((b) => <li key={b.requirement_id}><b className={`pl-res ${b.status}`}>{REQ_STATUS[b.status]}</b> {b.label}: {b.reason}</li>)}
        </ul>
      )}
      <details>
        <summary>Detail by criterion, measurements and checks</summary>
        <CriteriaTable results={o.requirement_results} map={map} />
        {site && <Measures site={site} />}
        <p className="pl-scores">
          Original v3 snapshot values, not recalculated: similarity {o.snapshot_scores.similarity === null ? 'no score' : formatScore(o.snapshot_scores.similarity)} · confidence {formatScore(o.snapshot_scores.confidence)} · stability {o.snapshot_scores.stability === null ? '—' : formatScore(o.snapshot_scores.stability)}.
          Similarity is not a probability of success.
        </p>
        <p className="pl-scores">Territorial feasibility: <b>pending</b> (permits, access, protected areas, ownership). It is independent of this result.</p>
        {o.what_would_change.length > 0 && <><h5>What evidence would change the decision</h5><ul>{o.what_would_change.map((t) => <li key={t}>{t}</li>)}</ul></>}
        {o.field_checks.length > 0 && <><h5>Field checks</h5><ul>{o.field_checks.map((t) => <li key={t}>{displaySource(t)}</li>)}</ul></>}
        <details className="pl-nested"><summary>Snapshot limits for this window</summary><ul>{o.limitations.map((t) => <li key={t}>{displaySource(t)}</li>)}</ul></details>
      </details>
    </article>
  )
}

function AiPanel({ state, evaluation, onExplain, geo }: { state: PlannerState; evaluation: MissionEvaluation; onExplain: (withGeology?: boolean) => void; geo: GeologyUi }) {
  const e = state.explain
  const view = e.record ? composeExplanation(evaluation, e.record.selection, 'anthropic') : null
  return (
    <section className="pl-ai" aria-labelledby="pl-ai-title">
      <h3 id="pl-ai-title">AI interpretation <span className="pl-tag ai">Optional</span></h3>
      <p className="pl-hint">
        {geo.available && geo.useGeology
          ? 'When you press the button, the confirmed requirements, the already calculated results, the confirmed objective (brief text, activity and requirements) and the official public geological mapping of the evaluated sectors are sent to Anthropic.'
          : 'When you press the button, the confirmed requirements and the already calculated results are sent to Anthropic (not the full brief text or geological mapping).'}
        {' '}The AI only highlights reasons from facts already calculated: it does not change statuses, values or exclusions, and blockers are always shown.
      </p>
      {geo.available ? (
        <label className="pl-geo-opt">
          <input type="checkbox" checked={geo.useGeology} onChange={(ev) => geo.setUseGeology(ev.target.checked)} />
          <span>Include geological guidance for the test (the AI only chooses among checks calculated by the app).</span>
        </label>
      ) : (
        <p className="pl-hint">AI geological guidance not available: {geo.unavailableReason ?? 'the official geology context is missing.'} The requirements explanation works the same without geology.</p>
      )}
      <button type="button" disabled={e.status === 'pending'} onClick={() => onExplain()} aria-busy={e.status === 'pending'}>
        {e.status === 'pending' ? 'Asking the AI…' : view ? 'Ask the AI for another selection' : 'Highlight reasons with AI'}
      </button>
      <div aria-live="polite" className="pl-ai-status">
        {(e.status === 'error' || e.status === 'unavailable') && <p className="pl-notice">{e.message} The calculated result did not change.</p>}
        {e.status === 'error' && e.geologyFailed && (
          <p className="pl-notice">
            The geological guidance could not be requested. You can retry the explanation without geology (only the calculated requirements and results will be sent, without the brief text or mapping).{' '}
            <button type="button" className="pl-ghost" onClick={() => onExplain(false)}>Retry without geology</button>
          </p>
        )}
      </div>
      {view && e.record && (
        <div className="pl-ai-view">
          <p className="pl-hint">{view.notice} Model {e.record.provenance.model} · {e.record.provenance.created_at.slice(0, 10)}{e.record.provenance.request_id ? ` · ${e.record.provenance.request_id}` : ''}.</p>
          <ul>
            {view.options.map((o) => (
              <li key={o.site_id}>
                <strong>{shortCandidateName(o.name)}</strong> — {STATUS[o.status]}
                <ul>{o.highlighted.map((r) => <li key={r.requirement_id}><b className={`pl-res ${r.status}`}>{REQ_STATUS[r.status]}</b> {r.label}: {r.reason}</li>)}</ul>
              </li>
            ))}
          </ul>
          {view.verifications.length > 0 && <><h5>Checks in the order the AI suggests</h5><ol>{view.verifications.map((v) => <li key={v.id}>{verificationDisplayText(v)}</li>)}</ol></>}
        </div>
      )}
    </section>
  )
}

function GeometryText({ ev, byId }: { ev: MissionEvaluation; byId: Map<string, CandidateSite> }) {
  const lines = describeScope(ev.resolution, (id) => shortCandidateName(byId.get(id)?.name ?? id))
  return (
    <div className="pl-geotext">
      <p><b>Requested:</b> {lines.requested}</p>
      <p><b>Status:</b> {lines.state}.</p>
      <p><b>Measured:</b></p>
      <ul>{lines.measured.map((m) => <li key={m}>{m}</li>)}</ul>
      {lines.matches.length > 0 && <><p><b>Intersecting windows:</b></p><ul>{lines.matches.map((m) => <li key={m}>{m}</li>)}</ul></>}
      <ul>{ev.resolution.notes.map((n) => <li key={n}>{n}</li>)}</ul>
    </div>
  )
}

const NO_GEO: GeologyUi = { available: false, unavailableReason: null, useGeology: false, setUseGeology: () => undefined, catalog: null, onExportGeology: () => undefined, exportError: null }

interface Props {
  evaluation: MissionEvaluation
  request: MissionRequest
  state: PlannerState
  candidates: CandidateSite[]
  onExplain: (withGeology?: boolean) => void
  geo?: GeologyUi
  onExport: () => void
  exportError: string | null
  onEdit: () => void
  /**
   * Variant of "Your mission" in the integrated interface (ADR-013): headline, blockers, ordering rule,
   * pending items, limits and export. The per-criterion detail lives in the rail, the reasons and the
   * AI button in the Reading, and the printable report is mounted only once by the mission
   * controller. Without this prop, the view is the team's.
   */
  compact?: boolean
  /**
   * "Go to the Reading" (integrated interface, M11): with this prop the compact result shows the action
   * that leads to the Reading. It only navigates: it does not change the selection, requirements or scope, nor does it call the AI.
   */
  onOpenReading?: () => void
  /**
   * Is the printable report for THIS evaluation already mounted? (integrated interface, M11). While it is not
   * mounted, "Print report" stays disabled with "Preparing report…"; the click prints
   * immediately, with no waiting or deferred printing. In the team view the report is included inside (true).
   */
  printReady?: boolean
}

/** Compact summary of an option: status, position and what blocks it (no tables). */
function CompactOption({ o }: { o: OptionEvaluation }) {
  const blockers = o.requirement_results.filter((r) => r.importance === 'critical' && r.status !== 'cumple')
  return (
    <li className={`pl-copt ${o.status}`}>
      <span className="pl-copt-head">
        {o.rank !== null && <b className="pl-rank" aria-label={`Rank ${o.rank}`}>{o.rank}</b>}
        <strong>{shortCandidateName(o.name)}</strong>
        {o.role === 'reference' && <b className="pl-tag ref">REF</b>}
        <small>{country(o.country)}</small>
      </span>
      {o.status !== 'objetivo_no_soportado' && o.preferences.total > 0 && (
        <small className="pl-copt-prefs">Preferences: {o.preferences.met} of {o.preferences.total}{o.preferences.unknown > 0 ? ` · ${o.preferences.unknown} no data` : ''}</small>
      )}
      {blockers.length > 0 && (
        <ul className="pl-blockers" aria-label="What blocks it">
          {blockers.map((b) => <li key={b.requirement_id}><b className={`pl-res ${b.status}`}>{REQ_STATUS[b.status]}</b> {b.label}: {b.reason}</li>)}
        </ul>
      )}
    </li>
  )
}

export function ResultView({ evaluation: ev, request, state, candidates, onExplain, geo = NO_GEO, onExport, exportError, onEdit, compact = false, onOpenReading, printReady = true }: Props) {
  const byId = new Map(candidates.map((c) => [c.site_id, c]))
  const map = new Map(ev.evidence.map((e) => [e.evidence_id, e]))
  const group = (s: OptionStatus) => ev.options.filter((o) => o.status === s)
  const prior = group('priorizado_para_reconocimiento')
  const headline = ev.outcome === 'evaluated'
    ? (prior.length ? `${prior.length} of ${ev.options.length} areas are prioritized for reconnaissance` : 'No area is prioritized with these requirements')
    : OUTCOME_COPY[ev.outcome]
  const top = prior[0]
  const gview = guidanceView(geo.catalog, state)

  return (
    <div className="pl-result">
      <div className="pl-screen-only">
        <h3 id="pl-result-title" tabIndex={-1} className="pl-headline">{headline}</h3>
        <p className="pl-lead">
          {ev.outcome === 'evaluated' && top && <>First in order: <strong>{shortCandidateName(top.name)}</strong>. It is a screening prioritization for reconnaissance; it does not approve or authorize the sector.</>}
          {ev.outcome === 'evaluated' && !top && <>This is a valid result: no sector meets every must-have with sufficient evidence. Review the reasons below.</>}
          {ev.outcome !== 'evaluated' && <>Nothing was estimated from neighboring windows and no satellites were queried. You can export the request as a diagnostic.</>}
        </p>
        {/* "Go to the Reading" (M11): single action next to the summary, in the first view of the compact result. */}
        {compact && onOpenReading && <p className="pl-reading-cta"><button type="button" className="pl-reading-link" onClick={onOpenReading}>Go to Reading</button></p>}
        <p className="pl-chips">
          <span className="pl-tag">{SCOPE_STATE[ev.resolution.state]}</span>
          {ev.comparability === 'partial' && <span className="pl-tag warn">Partial comparison: some preferences could not be measured</span>}
          <span className="pl-tag">Territorial feasibility pending</span>
        </p>

        {!compact && <GeometryFigure candidates={candidates} resolution={ev.resolution} />}
        <details className="pl-more"><summary>Requested and measured geometry</summary>
          <GeometryText ev={ev} byId={byId} />
        </details>

        {ev.data_request && (
          <section className="pl-diag" aria-labelledby="pl-diag-title">
            <h3 id="pl-diag-title">Insufficient-evidence report</h3>
            <p>{ev.data_request.note}</p>
            <h5>Planned sources for a future analysis</h5>
            <ul>{ev.data_request.planned_sources.map((s) => <li key={s.dataset_id}><a href={safeUrl(s.landing_url) ?? undefined} target="_blank" rel="noreferrer noopener">{displaySource(s.product)}</a> · {displaySource(s.provider)}</li>)}</ul>
            <p className="pl-hint">The request (geometry, requirements and sources) travels in the exported JSON.</p>
          </section>
        )}

        {ev.options.length > 0 && (
          <>
            {(['priorizado_para_reconocimiento', 'no_cumple_requisitos', 'evidencia_insuficiente', 'objetivo_no_soportado'] as OptionStatus[]).map((s) => {
              const list = group(s)
              if (!list.length) return null
              return compact ? (
                <section key={s} className="pl-group">
                  <h4>{STATUS[s]} <small>({list.length})</small></h4>
                  <ul className="pl-clist">{list.map((o) => <CompactOption key={o.site_id} o={o} />)}</ul>
                </section>
              ) : (
                <section key={s} className="pl-group">
                  <h3>{STATUS[s]} <small>({list.length})</small></h3>
                  {list.map((o) => <OptionCard key={o.site_id} o={o} site={byId.get(o.site_id)} map={map} />)}
                </section>
              )
            })}
          </>
        )}

        <details className="pl-more"><summary>How options are ordered and what the statuses mean</summary><p>{ev.ordering_rule}</p></details>
        {ev.pending_requirements.length > 0 && <p className="pl-notice">There are {ev.pending_requirements.length} unmeasured requirement(s) in this evaluation: they were kept as pending and never count as met.</p>}
        {ev.open_questions.length > 0 && <details className="pl-more"><summary>Open questions ({ev.open_questions.length})</summary><ul>{ev.open_questions.map((q) => <li key={q}>{q}</li>)}</ul></details>}

        {ev.outcome === 'evaluated' && !compact && <AiPanel state={state} evaluation={ev} onExplain={onExplain} geo={geo} />}
        {ev.outcome === 'evaluated' && gview && !compact && <GeologyGuidance view={gview} onExport={geo.onExportGeology} exportError={geo.exportError} />}

        <section className="pl-export" aria-label="Export">
          <button type="button" onClick={onExport}>Download JSON</button>
          <button type="button" disabled={!printReady} aria-busy={!printReady || undefined} onClick={() => window.print()}>{printReady ? 'Print report' : 'Preparing report…'}</button>
          <button type="button" className="pl-ghost" onClick={onEdit}>Back to editing</button>
          {exportError && <p className="pl-notice" role="alert">{exportError}</p>}
        </section>

        {ev.outcome === 'evaluated' && gview && compact && <CompactGeology view={gview} geo={geo} />}

        <details className="pl-more"><summary>Limits, evidence and technical detail</summary>
          <h5>Limits</h5><ul>{ev.limits.map((l) => <li key={l}>{l}</li>)}</ul>
          <h5>Cited evidence</h5>
          <ul>{ev.evidence.map((e) => <li key={e.evidence_id}><EvidenceLinks ids={[e.evidence_id]} map={map} /> — {displaySource(e.claim)}</li>)}</ul>
          <h5>Versions</h5>
          <p>Snapshot {ev.snapshot_version} · profile {ev.profile.id} {ev.profile.version} · rules {ev.rules_version}</p>
          <p className="pl-mono">request {ev.request_fingerprint}<br />evaluation {evaluationFingerprint(ev)}</p>
        </details>
      </div>

      {!compact && <PrintReport ev={ev} request={request} state={state} byId={byId} map={map} headline={headline} gview={gview} />}
    </div>
  )
}

/** Hint for the compact "Your mission": where the AI geological selection is requested (the Reading button). */
export const COMPACT_GEOLOGY_WHERE = 'The AI geology selection is requested with “Highlight reasons with AI” in Reading, by ticking the geological guidance option.'

/**
 * Compact "Your mission" (integrated interface): the team's geological guidance is collapsed AFTER
 * exporting, so that the result and its actions do not end up thousands of pixels further down. The summary
 * repeats the team's label ("AI selection" or "General guidance without AI") and how many sectors
 * it contains; inside, `GeologyGuidance` unchanged (same texts, limits, source and export).
 */
function CompactGeology({ view, geo }: { view: GeologyGuidanceView; geo: GeologyUi }) {
  const ai = view.source === 'anthropic'
  const count = view.sites.length
  return (
    <details className="pl-more pl-geo-fold">
      <summary>
        <span>Geological guidance for this test</span>
        <span className={`pl-tag ${ai ? 'ai' : ''}`}>{ai ? 'AI selection' : 'General guidance without AI'}</span>
        <small>{count} {count === 1 ? 'sector' : 'sectors'}</small>
      </summary>
      <p className="pl-hint pl-geo-where">{COMPACT_GEOLOGY_WHERE}</p>
      <GeologyGuidance view={view} onExport={geo.onExportGeology} exportError={geo.exportError} />
    </details>
  )
}

/** Result headline (same text on screen and in the report). */
export function resultHeadline(ev: MissionEvaluation): string {
  const prior = ev.options.filter((o) => o.status === 'priorizado_para_reconocimiento')
  return ev.outcome === 'evaluated'
    ? (prior.length ? `${prior.length} of ${ev.options.length} areas are prioritized for reconnaissance` : 'No area is prioritized with these requirements')
    : OUTCOME_COPY[ev.outcome]
}

/** Report language disclosure: what is translated for reading and what the JSON keeps verbatim. */
export const REPORT_LANGUAGE_NOTE =
  'Language: this report is in English. Source evidence copied from the snapshot and the official geology data (site names, field checks, '
  + 'limitations, evidence claims, criterion explanations, unit descriptions) is shown here in an English translation for reading; the '
  + 'downloadable JSON keeps the original wording (mostly Spanish) as the audit record. Official names and titles are kept as in the source. '
  + 'Your own text (brief, labels, quotes) is reproduced as written.'

/**
 * Printable report to be mounted outside ResultView (integrated interface: only one per page).
 * With the geological catalog of the current evaluation it includes the geological guidance (M10), just
 * like the report of `ResultView`.
 */
export function MissionPrintReport({ evaluation: ev, request, state, candidates, geologyCatalog = null }: { evaluation: MissionEvaluation; request: MissionRequest; state: PlannerState; candidates: CandidateSite[]; geologyCatalog?: GeologyCatalog | null }) {
  const byId = new Map(candidates.map((c) => [c.site_id, c]))
  const map = new Map(ev.evidence.map((e) => [e.evidence_id, e]))
  return <PrintReport ev={ev} request={request} state={state} byId={byId} map={map} headline={resultHeadline(ev)} gview={guidanceView(geologyCatalog, state)} />
}

/** Printable report: complete content with no interactive elements (only visible with @media print). */
function PrintReport({ ev, request, state, byId, map, headline, gview }: { ev: MissionEvaluation; request: MissionRequest; state: PlannerState; byId: Map<string, CandidateSite>; map: Map<string, EvidenceRef>; headline: string; gview: ReturnType<typeof guidanceView> }) {
  const draft = state.draft.record
  const expl = state.explain.record
  return (
    <article className="pl-print-only">
      <h1>AnalogOS · Recommendation report for a test</h1>
      <p><strong>{headline}</strong>. Desktop screening on snapshot {ev.snapshot_version}: it does not approve or authorize any sector.</p>
      <p className="pl-print-lang">{REPORT_LANGUAGE_NOTE}</p>
      <h2>Test</h2>
      <p><b>Activity:</b> {request.activity || '—'}<br /><b>Objective:</b> {request.target.profile_id === 'unsupported' ? `Not supported — ${request.target.stated}` : `Mars rover, Jezero reference (profile ${ev.profile.id} ${ev.profile.version})`}</p>
      <h3>Full brief text</h3>
      <p className="pl-pre">{request.brief || '(no text)'}</p>
      <h3>Confirmed requirements</h3>
      <table className="pl-table"><thead><tr><th>Requirement</th><th>Effective condition</th><th>Importance</th><th>Origin</th><th>Quote from the brief</th></tr></thead>
        <tbody>{request.requirements.map((r) => <tr key={r.requirement_id}><td>{r.label}</td><td>{describeEffective(r)}</td><td>{r.importance === 'critical' ? 'Must-have' : 'Preference'}</td><td>{r.origin === 'ai' ? 'Proposed by AI' : 'User'}</td><td>{r.source_quote ?? '—'}</td></tr>)}</tbody></table>
      {request.requirements.length === 0 && <p>No requirements.</p>}
      {ev.open_questions.length > 0 && <><h3>Pending items and open questions</h3><ul>{ev.open_questions.map((q) => <li key={q}>{q}</li>)}</ul></>}
      <h2>Geometry</h2>
      <GeometryText ev={ev} byId={byId} />
      <GeometryFigure candidates={[...byId.values()]} resolution={ev.resolution} />
      <h2>Result</h2>
      {ev.options.map((o) => (
        <section key={o.site_id} className="pl-print-opt">
          <h3>{o.rank !== null ? `${o.rank}. ` : ''}{shortCandidateName(o.name)} — {STATUS[o.status]}{o.role === 'reference' ? ' (REF, known reference)' : ''}</h3>
          <CriteriaTable results={o.requirement_results} map={map} />
          <p>Snapshot v3 (not recalculated): similarity {o.snapshot_scores.similarity === null ? 'no score' : formatScore(o.snapshot_scores.similarity)} · confidence {formatScore(o.snapshot_scores.confidence)} · stability {o.snapshot_scores.stability === null ? '—' : formatScore(o.snapshot_scores.stability)}. Territorial feasibility: pending.</p>
          {o.what_would_change.length > 0 && <ul>{o.what_would_change.map((t) => <li key={t}>{t}</li>)}</ul>}
          {o.field_checks.length > 0 && <><b>Field checks</b><ul>{o.field_checks.map((t) => <li key={t}>{displaySource(t)}</li>)}</ul></>}
        </section>
      ))}
      {gview && <PrintGeology view={gview} />}
      {ev.data_request && <><h2>Data request</h2><p>{ev.data_request.note}</p><ul>{ev.data_request.planned_sources.map((s) => <li key={s.dataset_id}>{displaySource(s.product)} · {displaySource(s.provider)} · {s.landing_url}</li>)}</ul></>}
      <h2>Ordering rule</h2><p>{ev.ordering_rule}</p>
      <h2>Limits</h2><ul>{ev.limits.map((l) => <li key={l}>{l}</li>)}</ul>
      <h2>Evidence</h2><ul>{ev.evidence.map((e) => <li key={e.evidence_id}><code>{e.evidence_id}</code> — {displaySource(e.claim)} {e.source_url ?? ''}</li>)}</ul>
      <section className="pl-print-provenance">
        <h2>Provenance and versions</h2>
        <p>Snapshot {ev.snapshot_version} · profile {ev.profile.id} {ev.profile.version} · rules {ev.rules_version} · record version {ev.evaluation_version}.<br />
          AI draft: {draft ? `yes (${draft.provenance.model}, ${draft.provenance.created_at.slice(0, 10)}, ${draft.provenance.request_id ?? 'no id'}); the user edited or confirmed the requirements.` : 'no'}.<br />
          AI interpretation: {expl ? `yes (${expl.provenance.model}, ${expl.provenance.created_at.slice(0, 10)}, ${expl.provenance.request_id ?? 'no id'}); it only selects references.` : 'no'}.</p>
        <p className="pl-mono">request {ev.request_fingerprint} · evaluation {evaluationFingerprint(ev)}</p>
      </section>
    </article>
  )
}
