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
import { criterionLabels, formatRawValue } from '../../domain/formatting'
import type { BuildMetricViewsInput, MetricView } from './index'

/** Criteria with a comparable Martian value (Jezero MOLA medians) and the required unit. */
export const MARS_COMPARABLE: Readonly<Partial<Record<CriterionId, string>>> = Object.freeze({
  slope: 'degree',
  terrain_roughness: 'meter',
  local_relief: 'meter',
})

/** Short name of each criterion in the UI (the same name in the rail, lines and Reading). */
export const METRIC_LABELS: Readonly<Record<CriterionId, string>> = Object.freeze({
  slope: 'Slope',
  terrain_roughness: 'Roughness',
  local_relief: 'Local relief',
  bare_ground_fraction: 'Bare ground',
  aridity_context: 'Aridity',
  surface_temperature_variability: 'Thermal range',
  geologic_relevance: 'Geology',
})

/** What each criterion measures, in one line. */
export const METRIC_MEASURES: Readonly<Record<CriterionId, string>> = Object.freeze({
  slope: 'Terrain median at ~480 m',
  terrain_roughness: 'Median height difference between neighboring cells',
  local_relief: 'Median height difference in 3×3 windows',
  bare_ground_fraction: 'Pixels without vegetation · Sentinel-2 2025',
  aridity_context: 'Climatological precipitation · NASA POWER',
  surface_temperature_variability: 'Climatological surface amplitude',
  geologic_relevance: 'Lithological compatibility with the objective',
})

interface BoundedRule {
  /** Text of the rule (┆). */
  text: string
  /** The same formula applied by the pipeline; used for the consistency check. */
  similarity: (raw: number) => number
}

/**
 * Rules of the bounded preferences, copied from `pipelines/build_precision_snapshot.py`
 * (they are not planetary ranges). Before displaying them, it is verified that they reproduce the similarity of the
 * snapshot: if they do not match, the UI does not show the formula and issues a warning.
 */
export const BOUNDED_RULES: Readonly<Partial<Record<CriterionId, BoundedRule>>> = Object.freeze({
  bare_ground_fraction: {
    text: 'More ground without vegetation, more analog: similarity is the non-vegetated fraction (Sentinel-2, SCL class 5).',
    similarity: (raw: number) => Math.max(0, Math.min(1, raw)),
  },
  aridity_context: {
    text: 'Less rain, more analog: similarity is 1 ÷ (1 + rain ÷ 25 mm/year); it is 50 at 25 mm/year.',
    similarity: (raw: number) => 1 / (1 + raw / 25),
  },
  surface_temperature_variability: {
    text: 'More thermal amplitude, more analog, until it saturates at 45 K.',
    similarity: (raw: number) => Math.min(raw / 45, 1),
  },
})

export const GENERIC_RULE_TEXT = 'Bounded profile preference: similarity grows toward the preferred end and stops at its cap.'
export const UNVERIFIED_RULE_TEXT = 'The known rule does not reproduce the snapshot similarity; check “Method” before interpreting it.'

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

function siteValueText(item: ScoreBreakdownItem | null, unit: string): string {
  const raw = item?.raw_value ?? null
  if (isFiniteNumber(raw)) return formatRawValue(raw, unit)
  if (typeof raw === 'string' && raw.trim()) return raw
  switch (item?.status) {
    case 'needs_calibration':
      return 'not yet calculated'
    case 'excluded':
      return 'excluded'
    default:
      return 'no data'
  }
}

function ruleFor(
  criterion: MissionCriterion | null,
  id: CriterionId,
  item: ScoreBreakdownItem | null,
): MetricView['rule'] {
  if (criterion?.method !== 'bounded_preference') return null
  const known = BOUNDED_RULES[id]
  const raw = item?.raw_value
  const s = item?.status === 'valid' ? item.normalized_similarity : null
  if (s === null || s === undefined || !isFiniteNumber(raw)) {
    return { text: known?.text ?? GENERIC_RULE_TEXT, satisfied: null, consistent: null }
  }
  const satisfied = s >= 1 - SATURATION_EPS
  if (!known) return { text: GENERIC_RULE_TEXT, satisfied, consistent: null }
  const consistent = Math.abs(known.similarity(raw) - s) <= RULE_TOLERANCE
  return consistent
    ? { text: known.text, satisfied, consistent: true }
    : { text: UNVERIFIED_RULE_TEXT, satisfied: null, consistent: false }
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

/** Sorts by the weight of the active profile; ties broken by the canonical order of criteria. */
export function buildMetricViews(input: BuildMetricViewsInput): MetricView[] {
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
    const marsValue = isFiniteNumber(marsRaw) && marsRaw > 0 ? { raw: marsRaw, unit, text: formatRawValue(marsRaw, unit) } : null

    const rule = ruleFor(criterion, id, item)
    return {
      criterionId: id,
      label: METRIC_LABELS[id] ?? criterionLabels[id] ?? criterion?.label ?? id,
      measure: METRIC_MEASURES[id],
      weight,
      baseWeight,
      status,
      similarity,
      siteValue: { raw: item?.raw_value ?? null, unit, text: siteValueText(item, unit) },
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
