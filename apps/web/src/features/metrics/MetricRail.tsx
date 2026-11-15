/**
 * Metrics rail (docs/UX_REDESIGN.md §3.6; ADR-008/009/013). Three variants:
 *  - 'rail'  (≥1100, 340–380 px): place figures + accordion-carousel per criterion.
 *  - 'full'  (520 px detail panel or S2): place figures + full cards with visualization.
 *  - 'sheet' (<1100, S1): "‹ % ›" to switch places + tabs and a swipeable track.
 *
 * This file goes in the main chunk and instantly renders whatever does not depend on the detail:
 * similarity, confidence, stability and feasibility, each one separately (never combined),
 * always from the snapshot. In Mission with an evaluation, it adds the place status and the layer of
 * requirements (✓ meets · ✕ does not meet · ○ not evaluable) from the team's evaluation.
 * The per-criterion detail (MetricDetails) is loaded lazily.
 */
import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react'
import type { CandidateSite } from '../../domain/contracts'
import { countryLabels } from '../../domain/discovery'
import { feasibilityLabels, formatArea, formatScore, formatWhole } from '../../domain/formatting'
import { MISSION_STATUS_LABEL, REQUIREMENT_MARK, REQUIREMENT_STATUS_LABEL, preferencesText } from '../../domain/missionView'
import { fmtObserved } from '../../mission/format'
import type { RequirementResult } from '../../mission/types'
import { announce, GLYPH, type AppData } from '../../shell/public'
import { uiActions } from '../../state/ui'
import { FadeNumber } from './FadeNumber'
import type { MetricRailProps } from './index'
import { useMetricContext, type MetricContext, type MissionLayer } from './metricContext'
import { coverageText, siteShortName, siteSimilarityText } from './summaryText'
import './metric-rail.css'
import { similarityTone } from '../../domain/similarityScale'

const loadDetails = () => import('./MetricDetails')
const MetricDetails = lazy(loadDetails)

/** Preloads the detail once the page has finished loading and the thread is idle. */
function preloadWhenIdle(): void {
  const idle = (callback: () => void) => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(callback, { timeout: 4000 })
    else window.setTimeout(callback, 1500)
  }
  const start = () => idle(() => void loadDetails().catch(() => undefined))
  if (document.readyState === 'complete') start()
  else window.addEventListener('load', start, { once: true })
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') preloadWhenIdle()

class DetailsBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    void info
    console.error('features/metrics: the per-criterion detail could not be loaded', error)
  }
  render(): ReactNode {
    if (this.state.failed) {
      return (
        <p className="metrics-note metrics-error" role="alert">
          <span aria-hidden="true">{GLYPH.fail}</span> The per-criterion detail could not be loaded. The place figures are still valid; reload the page to try again.
        </p>
      )
    }
    return this.props.children
  }
}

function DetailsPending() {
  return <p className="metrics-note metrics-pending" aria-busy="true">Loading the per-criterion detail…</p>
}

function profileLine(context: MetricContext): string {
  const calibration = context.profileStatus === 'needs_calibration' ? ' · needs calibration' : ''
  return `${context.profileLabel.replace(/^base profile/, 'Base profile')}${calibration} · snapshot v3 similarity`
}

/** "Candidate · Chile" / "REF · Known reference · Chile" and the link to the Origin tab. */
function RoleLine({ context }: { context: MetricContext }) {
  const country = context.country ? countryLabels[context.country] : null
  return (
    <p className="metrics-role">
      {context.role === 'reference' ? <b className="metrics-ref">REF · Known reference</b> : <span>Search candidate</span>}
      {country && <span> · {country}</span>}
      <span> · Territorial feasibility: pending</span>
    </p>
  )
}

/** A requirement row: ✓/✕/○, what is required, what is observed and the reason (all from the evaluation). */
export function RequirementRow({ result }: { result: RequirementResult }) {
  return (
    <li className="metrics-req" data-status={result.status}>
      <span className="metrics-req-mark" aria-hidden="true">{REQUIREMENT_MARK[result.status]}</span>
      <span className="metrics-req-body">
        <b>{result.label}</b> <small>({result.importance === 'critical' ? 'must-have' : 'preference'} · {REQUIREMENT_STATUS_LABEL[result.status]})</small>
        <span className="metrics-req-line">Required: {result.required}{result.kind === 'measurable' ? ` · observed: ${fmtObserved(result.observed_value, result.observed_unit)}` : ''}</span>
        <span className="metrics-req-reason">{result.reason}</span>
      </span>
    </li>
  )
}

/** Place status in the evaluation and site requirements (area, country) and unmeasured ones. */
function MissionSummary({ layer, rank, reference }: { layer: MissionLayer; rank: number | null; reference: boolean }) {
  const option = layer.option
  const preferences = option ? preferencesText(option) : null
  return (
    <section className="metrics-mission" aria-label="Your mission result" data-stale={layer.stale ? '' : undefined}>
      <p className="metrics-mission-status" data-status={layer.status}>
        {rank !== null && <b>#{rank} · </b>}
        {reference && <b>REF · </b>}
        {MISSION_STATUS_LABEL[layer.status]}
        {preferences && <small> · {preferences}</small>}
      </p>
      {layer.stale && <p className="metrics-note">You edited the test: this status belongs to the previous evaluation until you confirm and evaluate again.</p>}
      {layer.siteRows.length + layer.unmeasured.length > 0 && (
        <ul className="metrics-reqs" aria-label="Site requirements and unmeasured ones">
          {layer.siteRows.map((result) => <RequirementRow key={result.requirement_id} result={result} />)}
          {layer.unmeasured.map((result) => <RequirementRow key={result.requirement_id} result={result} />)}
        </ul>
      )}
      <p className="metrics-coverage">Deterministic calculation · rules {layer.rulesVersion} · the rail weights are the snapshot ones</p>
    </section>
  )
}

/** Place figures (rail and detail panel): similarity · confidence · stability · feasibility. */
function Summary({ context, site }: { context: MetricContext; site: CandidateSite }) {
  const figures = context.figures
  const scored = figures.similarity !== null
  const confidence = figures.confidence
  return (
    <section className="metrics-summary" aria-label="Place figures">
      <div className="metrics-score">
        <span className="metrics-score-glyph" aria-hidden="true">{scored ? GLYPH.evaluated : GLYPH.insufficient}</span>
        <strong className={scored ? 'metrics-score-value' : 'metrics-score-value is-empty'} data-sim-tone={similarityTone(figures.similarity) ?? undefined}>
          <FadeNumber value={figures.similarity}>{siteSimilarityText(figures)}</FadeNumber>
          {scored && <small>%</small>}
        </strong>
        <span className="metrics-score-label">
          v3 similarity{context.kind === 'base' && context.rank !== null ? ` · #${context.rank} of ${context.rankedCount}` : ''}
          {context.mission?.status === 'objetivo_no_soportado' ? ' · Mars rover profile · does not apply to this objective' : context.kind === 'mission' ? ' · not recalculated' : ''}
        </span>
      </div>
      {figures.similarityState === 'insufficient' && (
        <p className="metrics-note">
          Valid weight below the profile minimum ({formatWhole(context.minimumValidWeight * 100)}%): no % is calculated for this place.
        </p>
      )}
      <p className="metrics-profile">{profileLine(context)}</p>
      <RoleLine context={context} />
      {context.mission && <MissionSummary layer={context.mission} rank={context.rank} reference={context.role === 'reference'} />}
      <dl className="metrics-figures">
        <div className="metrics-fig metrics-fig-confidence">
          <dt>Confidence</dt>
          <dd>{confidence === null ? <span className="metrics-fig-pending">not calculated</span> : <FadeNumber value={confidence}>{formatScore(confidence)}</FadeNumber>}</dd>
          {confidence !== null && <i className="metrics-confidence-bar" aria-hidden="true"><em style={{ transform: `scaleX(${Math.max(0, Math.min(1, confidence / 100))})` }} /></i>}
        </div>
        <div className="metrics-fig">
          <dt>Stability</dt>
          <dd>{figures.stability === null ? <span className="metrics-fig-pending">not calculated</span> : <FadeNumber value={figures.stability}>{formatScore(figures.stability)}</FadeNumber>}</dd>
        </div>
        <div className="metrics-fig">
          <dt>Feasibility</dt>
          <dd>{feasibilityLabels[figures.feasibility]}</dd>
        </div>
      </dl>
      <p className="metrics-coverage">
        {coverageText(figures)} · <span aria-hidden="true">{GLYPH.sector}</span> {formatArea(site.area_km2)}
      </p>
    </section>
  )
}

/** S1: "‹ #1 of 3 · 75,7 % ›" to browse the places in the current order. */
function SheetSummary({ context, site, data }: { context: MetricContext; site: CandidateSite; data: AppData }) {
  const figures = context.figures
  const order = context.order
  const index = order.indexOf(site.site_id)
  const candidates = data.snapshot?.candidates ?? []
  const byId = (id: string | undefined) => (id === undefined ? null : candidates.find((candidate) => candidate.site_id === id) ?? null)
  const previous = index > 0 ? byId(order[index - 1]) : null
  const next = index >= 0 ? byId(order[index + 1]) : null
  const go = (target: CandidateSite | null) => {
    if (!target) return
    uiActions.select(target.site_id, 'evaluated')
    const position = order.indexOf(target.site_id) + 1
    announce(`${siteShortName(target.name)}, place ${position} of ${order.length}`)
  }
  const confidence = figures.confidence
  const stability = figures.stability
  return (
    <section className="metrics-summary metrics-summary-sheet" aria-label="Place figures">
      <div className="metrics-sitenav" role="group" aria-label="Change place">
        <button
          type="button"
          className="metrics-step"
          aria-disabled={previous === null}
          aria-label={previous ? `Previous place: ${siteShortName(previous.name)}` : 'No previous place'}
          onClick={() => go(previous)}
        >
          ‹
        </button>
        <p className="metrics-sitenav-score">
          <strong data-sim-tone={similarityTone(figures.similarity) ?? undefined}>
            {context.rank !== null && <span className="metrics-rank">#{context.rank}{context.kind === 'base' ? ` of ${context.rankedCount}` : ''} · </span>}
            {/* The REF never appears without its label: in Mission the team's engine may give it a rank. */}
            {context.role === 'reference' && <span className="metrics-rank">REF · </span>}
            <FadeNumber value={figures.similarity}>{siteSimilarityText(figures)}</FadeNumber>
            {figures.similarity !== null && ' %'}
          </strong>
          <small>{context.mission ? MISSION_STATUS_LABEL[context.mission.status] : 'v3 similarity · base profile'}</small>
        </p>
        <button
          type="button"
          className="metrics-step"
          aria-disabled={next === null}
          aria-label={next ? `Next place: ${siteShortName(next.name)}` : 'No next place'}
          onClick={() => go(next)}
        >
          ›
        </button>
      </div>
      <p className="metrics-figline">
        <span>Confidence {confidence === null ? 'not calculated' : formatScore(confidence)}</span>
        <span>Stability {stability === null ? 'not calculated' : formatScore(stability)}</span>
        <span>{feasibilityLabels[figures.feasibility]}</span>
        <span>Territorial feasibility: pending</span>
      </p>
    </section>
  )
}

export function MetricRail({ data, site, variant, onShowOnMap }: MetricRailProps) {
  const context = useMetricContext(data, site)
  // After an edit, the Mission layer stays at --o-busy (without inert) until re-evaluation.
  const busy = context?.mission?.stale === true
  if (!context) {
    return <p className="metrics-note" aria-busy="true">Loading validated snapshot…</p>
  }
  return (
    <div className="metrics" data-variant={variant} data-busy={busy ? '' : undefined} aria-busy={busy || undefined}>
      {variant === 'sheet' ? <SheetSummary context={context} site={site} data={data} /> : <Summary context={context} site={site} />}
      <DetailsBoundary>
        <Suspense fallback={<DetailsPending />}>
          <MetricDetails data={data} site={site} variant={variant} context={context} onShowOnMap={onShowOnMap} />
        </Suspense>
      </DetailsBoundary>
    </div>
  )
}
