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
import type { RequirementResult } from '../../mission/types'
import { useLocale, useT, withPercent } from '../../i18n'
import { tBoot } from '../../i18n/messages/boot'
import { tCommon } from '../../i18n/messages/common'
import { tMetrics } from '../../i18n/messages/metrics'
import { announce, GLYPH, useRecordText, type AppData } from '../../shell/public'
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
    if (this.state.failed) return <DetailsError />
    return this.props.children
  }
}

function DetailsError() {
  const t = useT(tMetrics)
  return (
    <p className="metrics-note metrics-error" role="alert">
      <span aria-hidden="true">{GLYPH.fail}</span> {t('detail.loadError')}
    </p>
  )
}

function DetailsPending() {
  const t = useT(tMetrics)
  return <p className="metrics-note metrics-pending" aria-busy="true">{t('detail.loading')}</p>
}

function profileLine(context: MetricContext, t: ReturnType<typeof tMetrics.in>): string {
  const calibration = context.profileStatus === 'needs_calibration' ? t('profile.calibration') : ''
  return t('profile.line', { version: context.profileVersion, calibration })
}

/** "Candidate · Chile" / "REF · Known reference · Chile" and the link to the Origin tab. */
function RoleLine({ context }: { context: MetricContext }) {
  const common = useT(tCommon)
  const country = context.country ? countryLabels[context.country] : null
  return (
    <p className="metrics-role">
      {context.role === 'reference' ? <b className="metrics-ref">{common('role.refKnownReference')}</b> : <span>{common('role.searchCandidate')}</span>}
      {country && <span> · {country}</span>}
      <span> · {common('feasibility.territorialPending')}</span>
    </p>
  )
}

/**
 * A requirement row: ✓/✕/○, what is required, what is observed and the reason (all from the evaluation). Record text
 * (`required`, `reason`) and the observed value are shown in the interface language without touching the record (§5);
 * the label is the user's text and stays as typed.
 */
export function RequirementRow({ result }: { result: RequirementResult }) {
  const t = useT(tMetrics)
  const record = useRecordText()
  const observed = result.kind === 'measurable' ? t('requirement.observed', { observed: record.pack.fmtObserved(result.observed_value, result.observed_unit) }) : ''
  return (
    <li className="metrics-req" data-status={result.status}>
      <span className="metrics-req-mark" aria-hidden="true">{REQUIREMENT_MARK[result.status]}</span>
      <span className="metrics-req-body">
        <b>{result.label}</b> <small>({record.pack.importanceLabel[result.importance]} · {REQUIREMENT_STATUS_LABEL[result.status]})</small>
        <span className="metrics-req-line">{t('requirement.line', { required: record.text(result.required) })}{observed}</span>
        <span className="metrics-req-reason">{record.text(result.reason)}</span>
      </span>
    </li>
  )
}

/** Place status in the evaluation and site requirements (area, country) and unmeasured ones. */
function MissionSummary({ layer, rank, reference }: { layer: MissionLayer; rank: number | null; reference: boolean }) {
  const locale = useLocale()
  const t = tMetrics.in(locale)
  const option = layer.option
  const preferences = option ? preferencesText(option, locale) : null
  return (
    <section className="metrics-mission" aria-label={t('mission.aria')} data-stale={layer.stale ? '' : undefined}>
      <p className="metrics-mission-status" data-status={layer.status}>
        {rank !== null && <b>#{rank} · </b>}
        {reference && <b>REF · </b>}
        {MISSION_STATUS_LABEL[layer.status]}
        {preferences && <small> · {preferences}</small>}
      </p>
      {layer.stale && <p className="metrics-note">{t('mission.stale')}</p>}
      {layer.siteRows.length + layer.unmeasured.length > 0 && (
        <ul className="metrics-reqs" aria-label={t('mission.rowsAria')}>
          {layer.siteRows.map((result) => <RequirementRow key={result.requirement_id} result={result} />)}
          {layer.unmeasured.map((result) => <RequirementRow key={result.requirement_id} result={result} />)}
        </ul>
      )}
      <p className="metrics-coverage">{t('mission.coverage', { rules: layer.rulesVersion })}</p>
    </section>
  )
}

/** Place figures (rail and detail panel): similarity · confidence · stability · feasibility. */
function Summary({ context, site }: { context: MetricContext; site: CandidateSite }) {
  const locale = useLocale()
  const t = tMetrics.in(locale)
  const figures = context.figures
  const scored = figures.similarity !== null
  const confidence = figures.confidence
  return (
    <section className="metrics-summary" aria-label={t('summary.aria')}>
      <div className="metrics-score">
        <span className="metrics-score-glyph" aria-hidden="true">{scored ? GLYPH.evaluated : GLYPH.insufficient}</span>
        <strong className={scored ? 'metrics-score-value' : 'metrics-score-value is-empty'} data-sim-tone={similarityTone(figures.similarity) ?? undefined}>
          <FadeNumber value={figures.similarity}>{siteSimilarityText(figures, locale)}</FadeNumber>
          {scored && <small>{withPercent('', locale)}</small>}
        </strong>
        <span className="metrics-score-label">
          {tCommon.in(locale)('similarity.v3')}{context.kind === 'base' && context.rank !== null ? t('summary.rank', { rank: context.rank, count: context.rankedCount }) : ''}
          {context.mission?.status === 'objetivo_no_soportado' ? t('summary.unsupported') : context.kind === 'mission' ? t('summary.notRecalculated') : ''}
        </span>
      </div>
      {figures.similarityState === 'insufficient' && (
        <p className="metrics-note">
          {t('summary.insufficient', { percent: withPercent(formatWhole(context.minimumValidWeight * 100, locale), locale) })}
        </p>
      )}
      <p className="metrics-profile">{profileLine(context, t)}</p>
      <RoleLine context={context} />
      {context.mission && <MissionSummary layer={context.mission} rank={context.rank} reference={context.role === 'reference'} />}
      <dl className="metrics-figures">
        <div className="metrics-fig metrics-fig-confidence">
          <dt>{t('figure.confidence')}</dt>
          <dd>{confidence === null ? <span className="metrics-fig-pending">{t('figure.notCalculated')}</span> : <FadeNumber value={confidence}>{formatScore(confidence, locale)}</FadeNumber>}</dd>
          {confidence !== null && <i className="metrics-confidence-bar" aria-hidden="true"><em style={{ transform: `scaleX(${Math.max(0, Math.min(1, confidence / 100))})` }} /></i>}
        </div>
        <div className="metrics-fig">
          <dt>{t('figure.stability')}</dt>
          <dd>{figures.stability === null ? <span className="metrics-fig-pending">{t('figure.notCalculated')}</span> : <FadeNumber value={figures.stability}>{formatScore(figures.stability, locale)}</FadeNumber>}</dd>
        </div>
        <div className="metrics-fig">
          <dt>{t('figure.feasibility')}</dt>
          <dd>{feasibilityLabels[figures.feasibility]}</dd>
        </div>
      </dl>
      <p className="metrics-coverage">
        {coverageText(figures, locale)} · <span aria-hidden="true">{GLYPH.sector}</span> {formatArea(site.area_km2, locale)}
      </p>
    </section>
  )
}

/** S1: "‹ #1 of 3 · 75,7 % ›" to browse the places in the current order. */
function SheetSummary({ context, site, data }: { context: MetricContext; site: CandidateSite; data: AppData }) {
  const locale = useLocale()
  const t = tMetrics.in(locale)
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
    announce(t('sheet.announce', { name: siteShortName(target.name, locale), position, total: order.length }))
  }
  const confidence = figures.confidence
  const stability = figures.stability
  return (
    <section className="metrics-summary metrics-summary-sheet" aria-label={t('summary.aria')}>
      <div className="metrics-sitenav" role="group" aria-label={t('sheet.changePlace')}>
        <button
          type="button"
          className="metrics-step"
          aria-disabled={previous === null}
          aria-label={previous ? t('sheet.previous', { name: siteShortName(previous.name, locale) }) : t('sheet.noPrevious')}
          onClick={() => go(previous)}
        >
          ‹
        </button>
        <p className="metrics-sitenav-score">
          <strong data-sim-tone={similarityTone(figures.similarity) ?? undefined}>
            {context.rank !== null && <span className="metrics-rank">#{context.rank}{context.kind === 'base' ? t('sheet.rankOf', { count: context.rankedCount }) : ''} · </span>}
            {/* The REF never appears without its label: in Mission the team's engine may give it a rank. */}
            {context.role === 'reference' && <span className="metrics-rank">REF · </span>}
            <FadeNumber value={figures.similarity}>{siteSimilarityText(figures, locale)}</FadeNumber>
            {figures.similarity !== null && ' %'}
          </strong>
          <small>{context.mission ? MISSION_STATUS_LABEL[context.mission.status] : t('sheet.base')}</small>
        </p>
        <button
          type="button"
          className="metrics-step"
          aria-disabled={next === null}
          aria-label={next ? t('sheet.next', { name: siteShortName(next.name, locale) }) : t('sheet.noNext')}
          onClick={() => go(next)}
        >
          ›
        </button>
      </div>
      <p className="metrics-figline">
        <span>{t('figure.confidenceValue', { value: confidence === null ? t('figure.notCalculated') : formatScore(confidence, locale) })}</span>
        <span>{t('figure.stabilityValue', { value: stability === null ? t('figure.notCalculated') : formatScore(stability, locale) })}</span>
        <span>{feasibilityLabels[figures.feasibility]}</span>
        <span>{tCommon.in(locale)('feasibility.territorialPending')}</span>
      </p>
    </section>
  )
}

export function MetricRail({ data, site, variant, onShowOnMap }: MetricRailProps) {
  const locale = useLocale()
  const context = useMetricContext(data, site)
  // After an edit, the Mission layer stays at --o-busy (without inert) until re-evaluation.
  const busy = context?.mission?.stale === true
  if (!context) {
    return <p className="metrics-note" aria-busy="true">{tBoot.in(locale)('chip.loading')}</p>
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
