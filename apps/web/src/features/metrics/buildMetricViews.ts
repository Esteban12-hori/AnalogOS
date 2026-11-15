/**
 * Pure model of the metrics rail (increment 5, docs/UX_REDESIGN.md §3.6).
 *
 * Every figure comes from the snapshot (the pipeline's score_breakdown), from the Jezero MOLA reference
 * (analysis-summary.json) or from the mission engine (weights and contributions). Here things are only sorted,
 * compared and labeled: no similarity is recalculated and no Mars value is invented.
 *
 *  - Order: weight of the active profile, from highest to lowest; ties by canonical order.
 *  - ■ Jezero: only slope, roughness and relief (MOLA). The rest carry null.
 *  - Limiting: the most negative contribution (field `contribution`), not the lowest similarity.
 *  - «saturates»: bounded preference that reached the cap of its rule.
 *  - Shared regional value: same value and same source in another evaluated sector.
 */
import type { CriterionId, MissionCriterion, ScoreBreakdownItem } from '../../domain/contracts'
import { CRITERION_IDS, isCriterionId } from '../../domain/criteria'
import { formatRawValue } from '../../domain/formatting'
import { localizedRecord } from '../../domain/localizedLabels'
import { getLocale, type Locale } from '../../i18n/core'
import { tCommon } from '../../i18n/messages/common'
import { tMetricDetails } from '../../i18n/messages/metricDetails'
import type { BuildMetricViewsInput, MetricView } from './index'

/** Criteria with a comparable Martian value (Jezero MOLA medians) and the required unit. */
export const MARS_COMPARABLE: Readonly<Partial<Record<CriterionId, string>>> = Object.freeze({
  slope: 'degree',
  terrain_roughness: 'meter',
  local_relief: 'meter',
})

/** Short name of each criterion in the UI (the same name in the rail, lines and Reading), in the current language. */
export const METRIC_LABELS: Readonly<Record<CriterionId, string>> = localizedRecord(CRITERION_IDS, (id) => tCommon(`criterion.${id}`))

/** What each criterion measures, in one line (current language). */
export const METRIC_MEASURES: Readonly<Record<CriterionId, string>> = localizedRecord(CRITERION_IDS, (id) => tMetricDetails(`measure.${id}`))

interface BoundedRule {
  /** Text of the rule (┆), in the current language. */
  readonly text: string
  /** The same formula applied by the pipeline; used for the consistency check. */
  similarity: (raw: number) => number
}

/**
 * Rules of the bounded preferences, copied from `pipelines/build_precision_snapshot.py`
 * (they are not planetary ranges). Before displaying them, it is verified that they reproduce the similarity of the
 * snapshot: if they do not match, the UI does not show the formula and issues a warning.
 */
type RuleCriterion = 'bare_ground_fraction' | 'aridity_context' | 'surface_temperature_variability'

function boundedRule(id: RuleCriterion, similarity: (raw: number) => number): BoundedRule {
  return Object.freeze({
    get text(): string {
      return tMetricDetails(`rule.${id}`)
    },
    similarity,
  })
}

export const BOUNDED_RULES: Readonly<Partial<Record<CriterionId, BoundedRule>>> = Object.freeze({
  bare_ground_fraction: boundedRule('bare_ground_fraction', (raw: number) => Math.max(0, Math.min(1, raw))),
  aridity_context: boundedRule('aridity_context', (raw: number) => 1 / (1 + raw / 25)),
  surface_temperature_variability: boundedRule('surface_temperature_variability', (raw: number) => Math.min(raw / 45, 1)),
})

/** English source wording (tests, tools); the views carry `tMetricDetails('rule.generic' | 'rule.unverified')` of their language. */
export const GENERIC_RULE_TEXT = tMetricDetails.in('en')('rule.generic')
export const UNVERIFIED_RULE_TEXT = tMetricDetails.in('en')('rule.unverified')

/** The pipeline rounds the similarity to 6 decimals. */
export const RULE_TOLERANCE = 1e-5
/** Cap of a bounded preference (similarity 1). */
const SATURATION_EPS = 1e-9
/** Band in which sector and Jezero are considered «similar» (the ratio is shown with 1 decimal). */
export const SIMILAR_RATIO_BAND = 0.05
/** Weight ties: mission weights come from a division and may differ in the last bit. */
const WEIGHT_TIE = 1e-12

const CANONICAL_INDEX: ReadonlyMap<string, number> = new Map(CRITERION_IDS.map((id, index) => [id, index]))

function canonicalIndex(id: string): number {
  return CANONICAL_INDEX.get(id) ?? CRITERION_IDS.length
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function atBound(similarity: number | null): boolean {
  return similarity !== null && (similarity >= 1 - SATURATION_EPS || similarity <= SATURATION_EPS)
}

function siteValueText(item: ScoreBreakdownItem | null, unit: string, locale: Locale): string {
  const raw = item?.raw_value ?? null
  if (isFiniteNumber(raw)) return formatRawValue(raw, unit, locale)
  if (typeof raw === 'string' && raw.trim()) return raw
  switch (item?.status) {
    case 'needs_calibration':
      return tCommon.in(locale)('status.notYetCalculated')
    case 'excluded':
      return tMetricDetails.in(locale)('value.excluded')
    default:
      return tCommon.in(locale)('status.noData')
  }
}

function ruleFor(
  criterion: MissionCriterion | null,
  id: CriterionId,
  item: ScoreBreakdownItem | null,
  locale: Locale,
): MetricView['rule'] {
  if (criterion?.method !== 'bounded_preference') return null
  const t = tMetricDetails.in(locale)
  const known = BOUNDED_RULES[id]
  const knownText = known ? t(`rule.${id as RuleCriterion}`) : null
  const raw = item?.raw_value
  const s = item?.status === 'valid' ? item.normalized_similarity : null
  if (s === null || s === undefined || !isFiniteNumber(raw)) {
    return { text: knownText ?? t('rule.generic'), satisfied: null, consistent: null }
  }
  const satisfied = s >= 1 - SATURATION_EPS
  if (!known || knownText === null) return { text: t('rule.generic'), satisfied, consistent: null }
  const consistent = Math.abs(known.similarity(raw) - s) <= RULE_TOLERANCE
  return consistent
    ? { text: knownText, satisfied, consistent: true }
    : { text: t('rule.unverified'), satisfied: null, consistent: false }
}

function sharedRegional(
  id: CriterionId,
  item: ScoreBreakdownItem | null,
  siteId: string,
  sites: BuildMetricViewsInput['sites'],
): string[] {
  if (!item || item.status !== 'valid' || !isFiniteNumber(item.raw_value)) return []
  // Two sectors at the cap (or the floor) of a rule coincide because of saturation, not because
  // they share the same cell of the source: that is not a shared regional value.
  if (atBound(item.normalized_similarity)) return []
  const shared: string[] = []
  for (const other of sites) {
    if (other.site_id === siteId) continue
    const match = other.score_breakdown.find((row) => row.criterion_id === id)
    if (match && match.status === 'valid' && match.dataset_id === item.dataset_id && match.raw_value === item.raw_value) {
      shared.push(other.site_id)
    }
  }
  return shared.sort()
}

function vsMarsFor(raw: unknown, valid: boolean, marsValue: MetricView['marsValue']): MetricView['vsMars'] {
  if (!marsValue || !valid || !isFiniteNumber(raw) || raw < 0) return null
  const ratio = raw / marsValue.raw
  const direction = ratio > 1 + SIMILAR_RATIO_BAND ? 'more_demanding' : ratio < 1 - SIMILAR_RATIO_BAND ? 'less_demanding' : 'similar'
  return { direction, ratio }
}

/**
 * Sorts by the weight of the active profile; ties broken by the canonical order of criteria. The texts of the views
 * (label, measure, values, rule) are in `locale` (default: the current one); order, figures and flags never depend on it.
 */
export function buildMetricViews(input: BuildMetricViewsInput, locale: Locale = getLocale()): MetricView[] {
  const { site, sites, profile, weights, contributions, marsReference } = input
  const items = new Map<string, ScoreBreakdownItem>(site.score_breakdown.map((item) => [item.criterion_id, item]))
  const criteria = new Map<string, MissionCriterion>(profile.criteria.map((criterion) => [criterion.id, criterion]))

  // Criteria of the profile and, in case the snapshot brings any more, those of the breakdown (without repeating).
  const ids: CriterionId[] = []
  for (const id of [...profile.criteria.map((criterion) => criterion.id), ...site.score_breakdown.map((item) => item.criterion_id)]) {
    if (isCriterionId(id) && !ids.includes(id)) ids.push(id)
  }

  const views: MetricView[] = ids.map((id) => {
    const item = items.get(id) ?? null
    const criterion = criteria.get(id) ?? null
    const status = item?.status ?? 'missing'
    const valid = status === 'valid'
    const unit = item?.unit ?? criterion?.unit ?? ''
    const baseWeight = criterion?.weight ?? item?.weight ?? 0
    const weight = weights === null ? baseWeight : (weights[id] ?? 0)
    const similarity = valid && item && item.normalized_similarity !== null ? item.normalized_similarity * 100 : null
    const contribution = contributions === null ? (item?.contribution ?? null) : (contributions[id] ?? null)

    const marsUnit = MARS_COMPARABLE[id]
    const marsRaw = marsUnit !== undefined && unit === marsUnit ? marsReference?.byCriterion[id] : undefined
    const marsValue = isFiniteNumber(marsRaw) && marsRaw > 0 ? { raw: marsRaw, unit, text: formatRawValue(marsRaw, unit, locale) } : null

    const rule = ruleFor(criterion, id, item, locale)
    return {
      criterionId: id,
      label: tCommon.in(locale)(`criterion.${id}`) || criterion?.label || id,
      measure: tMetricDetails.in(locale)(`measure.${id}`),
      weight,
      baseWeight,
      status,
      similarity,
      siteValue: { raw: item?.raw_value ?? null, unit, text: siteValueText(item, unit, locale) },
      marsValue,
      rule,
      vsMars: vsMarsFor(item?.raw_value, valid, marsValue),
      isLimiting: false,
      contribution: isFiniteNumber(contribution) ? contribution : null,
      // A criterion outside the profile (weight 0) does not «saturate»: it does not count toward the %.
      saturates: weight > 0 && rule !== null && valid && item !== null && item.normalized_similarity !== null && item.normalized_similarity >= 1 - SATURATION_EPS,
      sharedRegionalWith: sharedRegional(id, item, site.site_id, sites),
      quality: item?.quality ?? 0,
      datasetId: item?.dataset_id ?? 'none',
    }
  })

  // Limiting = most negative contribution among the criteria that carry weight; tie → canonical order.
  let limiting: MetricView | null = null
  for (const view of [...views].sort((a, b) => canonicalIndex(a.criterionId) - canonicalIndex(b.criterionId))) {
    if (view.weight <= 0 || view.contribution === null || view.contribution >= 0) continue
    if (limiting === null || limiting.contribution === null || view.contribution < limiting.contribution) limiting = view
  }
  if (limiting) limiting.isLimiting = true

  return views.sort((a, b) => {
    const delta = b.weight - a.weight
    if (Math.abs(delta) > WEIGHT_TIE) return delta
    return canonicalIndex(a.criterionId) - canonicalIndex(b.criterionId)
  })
}

/** The limiting metric of a list of views (null if no contribution is negative). */
export function limitingView(views: readonly MetricView[]): MetricView | null {
  return views.find((view) => view.isLimiting) ?? null
}
