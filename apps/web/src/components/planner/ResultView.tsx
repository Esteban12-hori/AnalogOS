import type { CandidateSite } from '../../domain/contracts'
import { formatScore, getLocale, useLocale, useT, type Locale } from '../../i18n'
import { tMission } from '../../i18n/messages/mission'
import { tPlanner } from '../../i18n/messages/planner'
import { displayRecordText, displayVerificationText } from '../../i18n/recordText'
import { scienceText } from '../../i18n/science'
import {
  composeExplanation, describeScope, evaluationFingerprint, scopeStateLabel, siteMeasures, type EvidenceRef, type MissionEvaluation, type MissionRequest,
  type OptionEvaluation, type OptionStatus, type PlannerState, type RequirementResult,
} from '../../mission'
import { displayMissionMessage } from '../../mission/messages'
import { uiPack } from '../../mission/pack'
import { countryName, metricLabel, mixedText, siteName } from '../../mission/uiText'
import { GeometryFigure } from './GeometryFigure'
import { GeologyGuidance, PrintGeology, guidanceView } from './GeologyGuidance'
import type { GeologyUi } from './usePlanner'
import type { GeologyCatalog, GeologyGuidanceView } from '../../../../../shared/geology/guidance'

/*
 * Language (ADR-017): interface text comes from the `planner`/`mission` catalogs; text written by the deterministic
 * engine (reasons, required conditions, notes, limits, ordering rule…) is shown with displayRecordText; snapshot
 * evidence (field checks, limitations, site names) with scienceText; values with the pack of the language. The
 * record itself is never changed: the export and the fingerprints are the same in both languages.
 */

const safeUrl = (u: string | null): string | null => (u && /^https:\/\//.test(u) ? u : null)

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
  const locale = useLocale()
  const t = useT(tPlanner)
  const tm = useT(tMission)
  const pack = uiPack(locale)
  if (!results.length) return <p className="pl-muted">{t('table.empty')}</p>
  return (
    <div className="pl-table-wrap">
      <table className="pl-table pl-criteria-table">
        <thead><tr><th>{t('table.requirement')}</th><th>{t('table.required')}</th><th>{t('table.observed')}</th><th>{t('table.result')}</th><th>{t('table.scalePeriod')}</th><th>{t('table.evidence')}</th></tr></thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.requirement_id} className={r.status}>
              <th scope="row">{r.label}<small>{tm(`importance.${r.importance}`)}</small></th>
              <td>{displayRecordText(r.required, locale)}{r.conversion && <small>{displayRecordText(r.conversion, locale)}</small>}</td>
              <td>{pack.fmtObserved(r.observed_value, r.observed_unit)}</td>
              <td><b className={`pl-res ${r.status}`}>{tm(`reqStatus.${r.status}`)}</b><small>{displayRecordText(r.reason, locale)}</small></td>
              <td><small>{r.scale_note === null ? '—' : mixedText(r.scale_note, locale)}{r.period ? ` · ${r.period}` : ''}</small></td>
              <td><EvidenceLinks ids={r.evidence_ids} map={map} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Measures({ site }: { site: CandidateSite }) {
  const locale = useLocale()
  const t = useT(tPlanner)
  const pack = uiPack(locale)
  return (
    <div className="pl-table-wrap">
      <table className="pl-table compact">
        <caption>{t('measures.caption')}</caption>
        <thead><tr><th>{t('measures.measurement')}</th><th>{t('measures.value')}</th><th>{t('measures.scale')}</th></tr></thead>
        <tbody>
          {siteMeasures(site).map((m) => (
            <tr key={m.metric_id}>
              <th scope="row">{locale === 'en' ? m.label : metricLabel(m.metric_id, locale)}</th>
              <td>{m.value === null ? t('measures.noData') : typeof m.value === 'number' ? pack.fmtQuantity(m.value, m.unit) : m.value}</td>
              <td><small>{locale === 'en' ? m.scale_note : pack.metricScaleNote[m.metric_id]}</small></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** “Label: reason” of a blocking requirement, with the reason in the interface language. */
function Blockers({ results }: { results: RequirementResult[] }) {
  const locale = useLocale()
  const t = useT(tPlanner)
  const tm = useT(tMission)
  const blockers = results.filter((r) => r.importance === 'critical' && r.status !== 'cumple')
  if (!blockers.length) return null
  return (
    <ul className="pl-blockers" aria-label={t('option.blockers')}>
      {blockers.map((b) => <li key={b.requirement_id}><b className={`pl-res ${b.status}`}>{tm(`reqStatus.${b.status}`)}</b> {b.label}: {displayRecordText(b.reason, locale)}</li>)}
    </ul>
  )
}

const scoreOr = (value: number | null, missing: string, locale: Locale): string => (value === null ? missing : formatScore(value, locale))

function OptionCard({ o, site, map }: { o: OptionEvaluation; site: CandidateSite | undefined; map: Map<string, EvidenceRef> }) {
  const locale = useLocale()
  const t = useT(tPlanner)
  const tm = useT(tMission)
  const crit = o.requirement_results.filter((r) => r.importance === 'critical')
  return (
    <article className={`pl-opt ${o.status}`}>
      <header>
        {o.rank !== null && <span className="pl-rank" aria-label={t('option.rank', { rank: o.rank })}>{o.rank}</span>}
        <div>
          <h4>{siteName(o.name, locale)}</h4>
          <small>{countryName(o.country, locale)}{o.role === 'reference' && <b className="pl-tag ref">{t('option.knownReference')}</b>}</small>
        </div>
        <span className={`pl-status ${o.status}`}>{tm(`status.${o.status}`)}</span>
      </header>
      {o.status !== 'objetivo_no_soportado' && (
        <p className="pl-counts">
          {t('option.mustHaves', { met: crit.filter((r) => r.status === 'cumple').length, failed: o.critical_failed.length, unknown: o.critical_unknown.length })}
          {' '}{t('option.preferences', { met: o.preferences.met, total: o.preferences.total, unknown: o.preferences.unknown > 0 ? t('option.preferencesUnknown', { count: o.preferences.unknown }) : '' })}
        </p>
      )}
      <Blockers results={o.requirement_results} />
      <details>
        <summary>{t('option.details')}</summary>
        <CriteriaTable results={o.requirement_results} map={map} />
        {site && <Measures site={site} />}
        <p className="pl-scores">
          {t('option.scores', {
            similarity: scoreOr(o.snapshot_scores.similarity, t('option.noScore'), locale),
            confidence: formatScore(o.snapshot_scores.confidence, locale),
            stability: scoreOr(o.snapshot_scores.stability, '—', locale),
          })}
        </p>
        <p className="pl-scores">{t('option.feasibilityLead')}<b>{t('option.feasibilityPending')}</b>{t('option.feasibilityTail')}</p>
        {o.what_would_change.length > 0 && <><h5>{t('option.whatWouldChange')}</h5><ul>{o.what_would_change.map((text) => <li key={text}>{displayRecordText(text, locale)}</li>)}</ul></>}
        {o.field_checks.length > 0 && <><h5>{t('option.fieldChecks')}</h5><ul>{o.field_checks.map((text) => <li key={text}>{scienceText(text, locale)}</li>)}</ul></>}
        <details className="pl-nested"><summary>{t('option.limits')}</summary><ul>{o.limitations.map((text) => <li key={text}>{scienceText(text, locale)}</li>)}</ul></details>
      </details>
    </article>
  )
}

function AiPanel({ state, evaluation, onExplain, geo }: { state: PlannerState; evaluation: MissionEvaluation; onExplain: (withGeology?: boolean) => void; geo: GeologyUi }) {
  const locale = useLocale()
  const t = useT(tPlanner)
  const tm = useT(tMission)
  const e = state.explain
  const view = e.record ? composeExplanation(evaluation, e.record.selection, 'anthropic') : null
  return (
    <section className="pl-ai" aria-labelledby="pl-ai-title">
      <h3 id="pl-ai-title">{t('ai.title')} <span className="pl-tag ai">{t('ai.optional')}</span></h3>
      <p className="pl-hint">
        {geo.available && geo.useGeology ? t('ai.sendsGeology') : t('ai.sendsBasic')}
        {' '}{t('ai.onlyHighlights')}
      </p>
      {geo.available ? (
        <label className="pl-geo-opt">
          <input type="checkbox" checked={geo.useGeology} onChange={(ev) => geo.setUseGeology(ev.target.checked)} />
          <span>{t('ai.includeGeology')}</span>
        </label>
      ) : (
        <p className="pl-hint">{t('ai.geologyUnavailable', { reason: geo.unavailableReason === null ? t('ai.geologyMissing') : displayMissionMessage(geo.unavailableReason, locale) })}</p>
      )}
      <button type="button" disabled={e.status === 'pending'} onClick={() => onExplain()} aria-busy={e.status === 'pending'}>
        {e.status === 'pending' ? t('ai.asking') : view ? t('ai.again') : t('ai.highlight')}
      </button>
      <div aria-live="polite" className="pl-ai-status">
        {(e.status === 'error' || e.status === 'unavailable') && <p className="pl-notice">{t('ai.resultUnchanged', { message: e.message === null ? '' : displayMissionMessage(e.message, locale) })}</p>}
        {e.status === 'error' && e.geologyFailed && (
          <p className="pl-notice">
            {t('ai.geologyFailed')}{' '}
            <button type="button" className="pl-ghost" onClick={() => onExplain(false)}>{t('ai.retryWithoutGeology')}</button>
          </p>
        )}
      </div>
      {view && e.record && (
        <div className="pl-ai-view">
          <p className="pl-hint">{t('ai.provenance', {
            notice: displayRecordText(view.notice, locale),
            model: e.record.provenance.model,
            date: e.record.provenance.created_at.slice(0, 10),
            requestId: e.record.provenance.request_id ? ` · ${e.record.provenance.request_id}` : '',
          })}</p>
          <ul>
            {view.options.map((o) => (
              <li key={o.site_id}>
                <strong>{siteName(o.name, locale)}</strong> — {tm(`status.${o.status}`)}
                <ul>{o.highlighted.map((r) => <li key={r.requirement_id}><b className={`pl-res ${r.status}`}>{tm(`reqStatus.${r.status}`)}</b> {r.label}: {displayRecordText(r.reason, locale)}</li>)}</ul>
              </li>
            ))}
          </ul>
          {view.verifications.length > 0 && <><h5>{t('ai.verifications')}</h5><ol>{view.verifications.map((v) => <li key={v.id}>{displayVerificationText(v, locale)}</li>)}</ol></>}
        </div>
      )}
    </section>
  )
}

function GeometryText({ ev, byId }: { ev: MissionEvaluation; byId: Map<string, CandidateSite> }) {
  const locale = useLocale()
  const t = useT(tPlanner)
  const lines = describeScope(ev.resolution, (id) => siteName(byId.get(id)?.name ?? id, locale), uiPack(locale))
  return (
    <div className="pl-geotext">
      <p><b>{t('geometry.requested')}</b> {lines.requested}</p>
      <p><b>{t('geometry.state')}</b> {lines.state}.</p>
      <p><b>{t('geometry.measured')}</b></p>
      <ul>{lines.measured.map((m) => <li key={m}>{m}</li>)}</ul>
      {lines.matches.length > 0 && <><p><b>{t('geometry.matches')}</b></p><ul>{lines.matches.map((m) => <li key={m}>{m}</li>)}</ul></>}
      <ul>{ev.resolution.notes.map((n) => <li key={n}>{displayRecordText(n, locale)}</li>)}</ul>
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
  const locale = useLocale()
  const t = useT(tPlanner)
  return (
    <li className={`pl-copt ${o.status}`}>
      <span className="pl-copt-head">
        {o.rank !== null && <b className="pl-rank" aria-label={t('option.rank', { rank: o.rank })}>{o.rank}</b>}
        <strong>{siteName(o.name, locale)}</strong>
        {o.role === 'reference' && <b className="pl-tag ref">REF</b>}
        <small>{countryName(o.country, locale)}</small>
      </span>
      {o.status !== 'objetivo_no_soportado' && o.preferences.total > 0 && (
        <small className="pl-copt-prefs">{t('option.compactPreferences', { met: o.preferences.met, total: o.preferences.total, unknown: o.preferences.unknown > 0 ? t('option.compactUnknown', { count: o.preferences.unknown }) : '' })}</small>
      )}
      <Blockers results={o.requirement_results} />
    </li>
  )
}

const GROUPS: readonly OptionStatus[] = ['priorizado_para_reconocimiento', 'no_cumple_requisitos', 'evidencia_insuficiente', 'objetivo_no_soportado']

export function ResultView({ evaluation: ev, request, state, candidates, onExplain, geo = NO_GEO, onExport, exportError, onEdit, compact = false, onOpenReading, printReady = true }: Props) {
  const locale = useLocale()
  const t = useT(tPlanner)
  const tm = useT(tMission)
  const byId = new Map(candidates.map((c) => [c.site_id, c]))
  const map = new Map(ev.evidence.map((e) => [e.evidence_id, e]))
  const group = (s: OptionStatus) => ev.options.filter((o) => o.status === s)
  const prior = group('priorizado_para_reconocimiento')
  const headline = resultHeadline(ev, locale)
  const top = prior[0]
  const gview = guidanceView(geo.catalog, state)

  return (
    <div className="pl-result">
      <div className="pl-screen-only">
        <h3 id="pl-result-title" tabIndex={-1} className="pl-headline">{headline}</h3>
        <p className="pl-lead">
          {ev.outcome === 'evaluated' && top && <>{t('lead.first')}<strong>{siteName(top.name, locale)}</strong>{t('lead.firstTail')}</>}
          {ev.outcome === 'evaluated' && !top && <>{t('lead.none')}</>}
          {ev.outcome !== 'evaluated' && <>{t('lead.notEvaluated')}</>}
        </p>
        {/* "Go to the Reading" (M11): single action next to the summary, in the first view of the compact result. */}
        {compact && onOpenReading && <p className="pl-reading-cta"><button type="button" className="pl-reading-link" onClick={onOpenReading}>{t('result.openReading')}</button></p>}
        <p className="pl-chips">
          <span className="pl-tag">{scopeStateLabel(ev.resolution.state, locale)}</span>
          {ev.comparability === 'partial' && <span className="pl-tag warn">{t('result.partial')}</span>}
          <span className="pl-tag">{t('result.feasibilityPending')}</span>
        </p>

        {!compact && <GeometryFigure candidates={candidates} resolution={ev.resolution} />}
        <details className="pl-more"><summary>{t('result.geometryDetails')}</summary>
          <GeometryText ev={ev} byId={byId} />
        </details>

        {ev.data_request && (
          <section className="pl-diag" aria-labelledby="pl-diag-title">
            <h3 id="pl-diag-title">{t('result.diagTitle')}</h3>
            <p>{displayRecordText(ev.data_request.note, locale)}</p>
            <h5>{t('result.diagSources')}</h5>
            <ul>{ev.data_request.planned_sources.map((s) => <li key={s.dataset_id}><a href={safeUrl(s.landing_url) ?? undefined} target="_blank" rel="noreferrer noopener">{mixedText(s.product, locale)}</a> · {mixedText(s.provider, locale)}</li>)}</ul>
            <p className="pl-hint">{t('result.diagNote')}</p>
          </section>
        )}

        {ev.options.length > 0 && (
          <>
            {GROUPS.map((s) => {
              const list = group(s)
              if (!list.length) return null
              return compact ? (
                <section key={s} className="pl-group">
                  <h4>{tm(`status.${s}`)} <small>({list.length})</small></h4>
                  <ul className="pl-clist">{list.map((o) => <CompactOption key={o.site_id} o={o} />)}</ul>
                </section>
              ) : (
                <section key={s} className="pl-group">
                  <h3>{tm(`status.${s}`)} <small>({list.length})</small></h3>
                  {list.map((o) => <OptionCard key={o.site_id} o={o} site={byId.get(o.site_id)} map={map} />)}
                </section>
              )
            })}
          </>
        )}

        <details className="pl-more"><summary>{t('result.ordering')}</summary><p>{displayRecordText(ev.ordering_rule, locale)}</p></details>
        {ev.pending_requirements.length > 0 && <p className="pl-notice">{t('result.pendingRequirements', { count: ev.pending_requirements.length })}</p>}
        {ev.open_questions.length > 0 && <details className="pl-more"><summary>{t('result.openQuestions', { count: ev.open_questions.length })}</summary><ul>{ev.open_questions.map((q) => <li key={q}>{displayMissionMessage(q, locale)}</li>)}</ul></details>}

        {ev.outcome === 'evaluated' && !compact && <AiPanel state={state} evaluation={ev} onExplain={onExplain} geo={geo} />}
        {ev.outcome === 'evaluated' && gview && !compact && <GeologyGuidance view={gview} onExport={geo.onExportGeology} exportError={geo.exportError} />}

        <section className="pl-export" aria-label={t('result.exportLabel')}>
          <button type="button" onClick={onExport}>{t('result.download')}</button>
          <button type="button" disabled={!printReady} aria-busy={!printReady || undefined} onClick={() => window.print()}>{printReady ? t('result.print') : t('result.preparing')}</button>
          <button type="button" className="pl-ghost" onClick={onEdit}>{t('result.backToEdit')}</button>
          {exportError && <p className="pl-notice" role="alert">{displayMissionMessage(exportError, locale)}</p>}
        </section>

        {ev.outcome === 'evaluated' && gview && compact && <CompactGeology view={gview} geo={geo} />}

        <details className="pl-more"><summary>{t('result.technical')}</summary>
          <h5>{t('result.limits')}</h5><ul>{ev.limits.map((l) => <li key={l}>{displayRecordText(l, locale)}</li>)}</ul>
          <h5>{t('result.evidence')}</h5>
          <ul>{ev.evidence.map((e) => <li key={e.evidence_id}><EvidenceLinks ids={[e.evidence_id]} map={map} /> — {mixedText(e.claim, locale)}</li>)}</ul>
          <h5>{t('result.versions')}</h5>
          <p>{t('result.versionLine', { snapshot: ev.snapshot_version, profile: ev.profile.id, profileVersion: ev.profile.version, rules: ev.rules_version })}</p>
          <p className="pl-mono">{t('result.requestFp', { fp: ev.request_fingerprint })}<br />{t('result.evaluationFp', { fp: evaluationFingerprint(ev) })}</p>
        </details>
      </div>

      {!compact && <PrintReport ev={ev} request={request} state={state} byId={byId} map={map} headline={headline} gview={gview} />}
    </div>
  )
}

/** Hint for the compact "Your mission": where the AI geological selection is requested (the Reading button). English. */
export const COMPACT_GEOLOGY_WHERE = tPlanner.in('en')('compact.geologyWhere')

/**
 * Compact "Your mission" (integrated interface): the team's geological guidance is collapsed AFTER
 * exporting, so that the result and its actions do not end up thousands of pixels further down. The summary
 * repeats the team's label ("AI selection" or "General guidance without AI") and how many sectors
 * it contains; inside, `GeologyGuidance` unchanged (same texts, limits, source and export).
 */
function CompactGeology({ view, geo }: { view: GeologyGuidanceView; geo: GeologyUi }) {
  const t = useT(tPlanner)
  const ai = view.source === 'anthropic'
  const count = view.sites.length
  return (
    <details className="pl-more pl-geo-fold">
      <summary>
        <span>{t('geo.title')}</span>
        <span className={`pl-tag ${ai ? 'ai' : ''}`}>{ai ? t('geo.aiTag') : t('geo.generalTag')}</span>
        <small>{t('compact.sectors', { count })}</small>
      </summary>
      <p className="pl-hint pl-geo-where">{t('compact.geologyWhere')}</p>
      <GeologyGuidance view={view} onExport={geo.onExportGeology} exportError={geo.exportError} />
    </details>
  )
}

/** Result headline (same text on screen and in the report), in the interface language. */
export function resultHeadline(ev: MissionEvaluation, locale: Locale = getLocale()): string {
  const t = tPlanner.in(locale)
  const prior = ev.options.filter((o) => o.status === 'priorizado_para_reconocimiento')
  if (ev.outcome !== 'evaluated') return t(`outcome.${ev.outcome}`)
  return prior.length ? t('headline.prioritized', { count: prior.length, total: ev.options.length }) : t('headline.none')
}

/** Report language disclosure (English): what is translated for reading and what the JSON keeps verbatim. */
export const REPORT_LANGUAGE_NOTE = tPlanner.in('en')('print.language')

/**
 * Printable report to be mounted outside ResultView (integrated interface: only one per page).
 * With the geological catalog of the current evaluation it includes the geological guidance (M10), just
 * like the report of `ResultView`. It follows the interface language (record text through i18n/recordText).
 */
export function MissionPrintReport({ evaluation: ev, request, state, candidates, geologyCatalog = null }: { evaluation: MissionEvaluation; request: MissionRequest; state: PlannerState; candidates: CandidateSite[]; geologyCatalog?: GeologyCatalog | null }) {
  const locale = useLocale()
  const byId = new Map(candidates.map((c) => [c.site_id, c]))
  const map = new Map(ev.evidence.map((e) => [e.evidence_id, e]))
  return <PrintReport ev={ev} request={request} state={state} byId={byId} map={map} headline={resultHeadline(ev, locale)} gview={guidanceView(geologyCatalog, state)} />
}

/** Printable report: complete content with no interactive elements (only visible with @media print). */
function PrintReport({ ev, request, state, byId, map, headline, gview }: { ev: MissionEvaluation; request: MissionRequest; state: PlannerState; byId: Map<string, CandidateSite>; map: Map<string, EvidenceRef>; headline: string; gview: ReturnType<typeof guidanceView> }) {
  const locale = useLocale()
  const t = useT(tPlanner)
  const tm = useT(tMission)
  const pack = uiPack(locale)
  const draft = state.draft.record
  const expl = state.explain.record
  const noId = t('print.noId')
  return (
    <article className="pl-print-only">
      <h1>{t('print.title')}</h1>
      <p><strong>{headline}</strong>{t('print.lead', { snapshot: ev.snapshot_version })}</p>
      <p className="pl-print-lang">{t('print.language')}</p>
      <h2>{t('print.test')}</h2>
      <p><b>{t('print.activity')}</b> {request.activity || '—'}<br /><b>{t('print.objective')}</b> {request.target.profile_id === 'unsupported' ? t('print.unsupported', { stated: request.target.stated }) : t('print.rover', { profile: ev.profile.id, version: ev.profile.version })}</p>
      <h3>{t('print.brief')}</h3>
      <p className="pl-pre">{request.brief || t('print.noBrief')}</p>
      <h3>{t('print.requirements')}</h3>
      <table className="pl-table"><thead><tr><th>{t('table.requirement')}</th><th>{t('print.effective')}</th><th>{t('req.importance')}</th><th>{t('print.origin')}</th><th>{t('print.quote')}</th></tr></thead>
        <tbody>{request.requirements.map((r) => <tr key={r.requirement_id}><td>{r.label}</td><td>{pack.describeEffective(r)}</td><td>{tm(`importance.${r.importance}`)}</td><td>{r.origin === 'ai' ? tm('origin.ai') : tm('origin.user')}</td><td>{r.source_quote ?? '—'}</td></tr>)}</tbody></table>
      {request.requirements.length === 0 && <p>{t('print.noRequirements')}</p>}
      {ev.open_questions.length > 0 && <><h3>{t('print.pending')}</h3><ul>{ev.open_questions.map((q) => <li key={q}>{displayMissionMessage(q, locale)}</li>)}</ul></>}
      <h2>{t('print.geometry')}</h2>
      <GeometryText ev={ev} byId={byId} />
      <GeometryFigure candidates={[...byId.values()]} resolution={ev.resolution} />
      <h2>{t('print.result')}</h2>
      {ev.options.map((o) => (
        <section key={o.site_id} className="pl-print-opt">
          <h3>{o.rank !== null ? `${o.rank}. ` : ''}{siteName(o.name, locale)} — {tm(`status.${o.status}`)}{o.role === 'reference' ? t('print.reference') : ''}</h3>
          <CriteriaTable results={o.requirement_results} map={map} />
          <p>{t('print.scores', {
            similarity: scoreOr(o.snapshot_scores.similarity, t('option.noScore'), locale),
            confidence: formatScore(o.snapshot_scores.confidence, locale),
            stability: scoreOr(o.snapshot_scores.stability, '—', locale),
          })}</p>
          {o.what_would_change.length > 0 && <ul>{o.what_would_change.map((text) => <li key={text}>{displayRecordText(text, locale)}</li>)}</ul>}
          {o.field_checks.length > 0 && <><b>{t('print.fieldChecks')}</b><ul>{o.field_checks.map((text) => <li key={text}>{scienceText(text, locale)}</li>)}</ul></>}
        </section>
      ))}
      {gview && <PrintGeology view={gview} />}
      {ev.data_request && <><h2>{t('print.dataRequest')}</h2><p>{displayRecordText(ev.data_request.note, locale)}</p><ul>{ev.data_request.planned_sources.map((s) => <li key={s.dataset_id}>{mixedText(s.product, locale)} · {mixedText(s.provider, locale)} · {s.landing_url}</li>)}</ul></>}
      <h2>{t('print.ordering')}</h2><p>{displayRecordText(ev.ordering_rule, locale)}</p>
      <h2>{t('print.limits')}</h2><ul>{ev.limits.map((l) => <li key={l}>{displayRecordText(l, locale)}</li>)}</ul>
      <h2>{t('print.evidence')}</h2><ul>{ev.evidence.map((e) => <li key={e.evidence_id}><code>{e.evidence_id}</code> — {mixedText(e.claim, locale)} {e.source_url ?? ''}</li>)}</ul>
      <section className="pl-print-provenance">
        <h2>{t('print.provenance')}</h2>
        <p>{t('print.versionLine', { snapshot: ev.snapshot_version, profile: ev.profile.id, profileVersion: ev.profile.version, rules: ev.rules_version, record: ev.evaluation_version })}<br />
          {t('print.draft', { value: draft ? t('print.draftYes', { model: draft.provenance.model, date: draft.provenance.created_at.slice(0, 10), requestId: draft.provenance.request_id ?? noId }) : t('print.no') })}<br />
          {t('print.explanation', { value: expl ? t('print.explanationYes', { model: expl.provenance.model, date: expl.provenance.created_at.slice(0, 10), requestId: expl.provenance.request_id ?? noId }) : t('print.no') })}</p>
        <p className="pl-mono">{t('print.fingerprints', { request: ev.request_fingerprint, evaluation: evaluationFingerprint(ev) })}</p>
      </section>
    </article>
  )
}
