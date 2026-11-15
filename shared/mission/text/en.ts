// English text pack: evaluation/export 1.1.0 (the default for new records). Same logic, thresholds, ordering and
// IDs as the frozen Spanish 1.0.0 pack; only authored wording and number formatting differ. Formatters are
// hand-rolled (no Intl) so Node and the browser produce identical bytes, and they never round: the shortest
// round-trip representation of each number is kept, exponents included.
import type { Requirement } from '../types'
import type { ConditionInput, MissionText } from './types'

export function fmtNumber(x: number): string {
  if (!Number.isFinite(x)) return '—'
  const t = String(x)
  // Keep the exponent: small thresholds must not turn into zero or lose digits.
  if (/e/i.test(t)) return t
  const neg = t.startsWith('-')
  const [int, frac] = (neg ? t.slice(1) : t).split('.')
  const grouped = int.length >= 4 ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : int // en-US groups from 4 digits
  return `${neg ? '-' : ''}${grouped}${frac ? `.${frac}` : ''}`
}

const UNIT_SUFFIX: Record<string, string> = { degree: '°', meter: ' m', percent: '%', km2: ' km²', ratio: ' (fraction 0–1)', iso_alpha2: '' }

export const fmtQuantity = (value: number, unit: string): string => `${fmtNumber(value)}${UNIT_SUFFIX[unit] ?? ` ${unit}`}`

/** Observed value (canonical unit). A fraction is also shown as %, exact ×100 conversion. */
export function fmtObserved(value: number | string | null, unit: string | null): string {
  if (value === null) return '—'
  if (typeof value === 'string') return value
  if (unit === 'ratio') return `${fmtNumber(value)} (fraction 0–1; ${fmtNumber(Number((value * 100).toPrecision(12)))}%)`
  return fmtQuantity(value, unit ?? '')
}

export const SCALE_LABEL: Record<'window' | 'point', string> = {
  window: 'Full window (~20 km)',
  point: 'Point scale (not assessable with these data)',
}

/** “≤ 2.3°”, “between 1 and 5 m”, “one of CL, AR”. */
export function describeCondition(r: ConditionInput): string {
  if (r.operator === 'in') return `one of ${(r.value as string[]).join(', ')}`
  if (r.operator === 'between') {
    const [lo, hi] = r.value as [number, number]
    return `between ${fmtNumber(lo)} and ${fmtQuantity(hi, r.unit)}`
  }
  return `${r.operator === '<=' ? '≤' : '≥'} ${fmtQuantity(r.value as number, r.unit)}`
}

export function describeEffective(r: Requirement): string {
  return r.kind === 'unmeasured' ? `Not measured${r.detail ? ` — ${r.detail}` : ''}` : `${describeCondition(r)} · ${SCALE_LABEL[r.scale]}`
}

export const IMPORTANCE_LABEL = { critical: 'must-have', preference: 'preference' } as const

export const EN_TEXT: MissionText = {
  lang: 'en',
  fmtNumber,
  fmtQuantity,
  fmtObserved,
  describeCondition,
  describeEffective,
  scaleLabel: SCALE_LABEL,
  importanceLabel: IMPORTANCE_LABEL,
  metricScaleNote: {
    median_slope_degree: 'Median over the full window, NASADEM aggregated to ~471 m; not a point slope.',
    terrain_roughness_meter: 'Median difference between neighboring cells at ~471 m; does not describe rocks or wheel-scale obstacles.',
    local_relief_meter: 'Median 3×3 relief on aggregated NASADEM (~471 m).',
    nonvegetated_fraction: 'Median of 12 monthly Sentinel-2 L2A mosaics (SCL class 5); does not prove traction or mineralogy.',
    polygon_area_km2: 'Approximate extent of the evaluated polygon; not free or usable surface.',
    country: 'Polygon attribute in the snapshot.',
  },
  topicLabel: {
    max_point_slope: 'Maximum point slope for the rover',
    rock_size: 'Rock size',
    traction: 'Traction',
    loose_soil: 'Loose soil',
    road_access: 'Road or vehicle access',
    cost: 'Cost',
    permits: 'Permits',
    operational_date: 'Operational date',
    local_rain: 'Local rain',
    mobile_coverage: 'Mobile coverage',
  },
  unknownTopic: 'Uncatalogued topic',
  limits: [
    'Desktop screening on the science-screening-v3 snapshot: it prioritizes reconnaissance; it does not approve, authorize or guarantee the safety of a sector.',
    'Requirements are test conditions defined by the user, not NASA or other agency standards.',
    'Metrics are full-window statistics (analysis at ~471 m); they do not describe point slope, rocks, traction or loose soil.',
    'Area is the extent of the evaluated polygon, not free or usable surface.',
    'SCL class 5 measures non-vegetated surface; it does not prove traction or mineralogy. NASA POWER is regional context: it does not establish local rain or forecasts.',
    'Territorial feasibility (permits, access, protected areas, ownership) is pending and independent of this result.',
    'Similarity and confidence are those of the v3 snapshot, not recalculated; similarity is not a probability of success. It is valid for no option to be prioritized.',
  ],
  orderingRule:
    'Must-have requirements are applied first: an observed failure excludes the option, and a missing value or one at an inadequate scale leaves it with insufficient evidence. ' +
    'Options that meet every must-have are ordered by (1) preferences met, descending; (2) v3 similarity, descending; (3) sector identifier, ascending. ' +
    'Unknown preferences count neither as met nor as unmet; they are reported separately and the comparison is labeled partial. There is no new suitability percentage.',
  statusDefinitions: {
    priorizado_para_reconocimiento: 'Meets every assessable must-have requirement; worth reconnaissance. It is not an approval or authorization.',
    no_cumple_requisitos: 'Fails at least one must-have requirement with an observed value.',
    evidencia_insuficiente: 'Evidence or an adequate scale is missing for some must-have requirement; it is not approved.',
    objetivo_no_soportado: 'The objective does not match the only supported profile (Mars rover, Jezero, v3).',
  },
  siteRecordClaim: 'Polygon area and country as listed in the snapshot candidate-details.json.',
  snapshotScaleNote: (scaleNote, explanation) => `${scaleNote} Snapshot explanation (original source text, Spanish): ${explanation}`,
  pointScaleReason: 'The requirement is at point scale; the snapshot only measures full-window statistics and a regional median is not substituted for it.',
  noValueReason: 'No valid value of this metric for the window in the snapshot.',
  percentConversion: 'Threshold in % converted to a 0–1 fraction by dividing by 100; the snapshot stores the fraction.',
  observedReason: (shown, pass, cond) => `Observed value ${shown} ${pass ? 'meets' : 'does not meet'} the condition ${cond}.`,
  unmeasuredReason: (topic) => `“${topic}” is not measured in the v3 snapshot: it remains pending and is not interpreted as another available metric.`,
  wouldChangeFailed: (label, observed) => `Review whether “${label}” is really necessary or choose another sector: observed ${observed}.`,
  wouldChangeMeasure: (label, importance, reason) => `Measure “${label}” at the required scale (${importance}): ${reason}`,
  tileProduct: 'NASADEM_HGT.001 (tiles according to the geometry)',
  dataRequestNote: 'Reproducible analysis request. This version does not acquire new data or query satellites: there is not enough evidence for this geometry, and nothing was estimated from neighboring windows.',
  scopeNotes: {
    catalog: 'Comparison among the snapshot windows with evidence; each one with its own metrics.',
    sectorMissing: (siteId) => `Sector “${siteId}” does not exist in the snapshot.`,
    sectorCovered: 'Requested and measured geometry match: it is the full snapshot window.',
    pointOutside: 'The point is outside the windows with evidence. The nearest neighbor is not used.',
    pointWindow: 'There is evidence for the window that contains the point, not for the exact point: metrics are medians over the full window.',
    pointChooseMany: 'The point falls in several windows: choose one explicitly before evaluating.',
    pointChooseOne: 'Choose the window explicitly before evaluating.',
    bboxNone: 'The bbox does not overlap any window with evidence. The nearest neighbor is not used.',
    bboxIdentical: 'The bbox matches the full window (numerical epsilon 1e-9°).',
    bboxPartial: 'The bbox does not match a full window (sub-area, partial coverage or larger than the window): no aggregated metric is inherited from the window.',
    bboxSelected: 'The full window chosen explicitly is evaluated; it is not equivalent to the requested geometry.',
  },
  verification: {
    confirmFailure: (label) => `Confirm the failure of “${label}” or review whether the requirement is essential.`,
    measure: (label) => `Obtain a measurement of “${label}” at the required scale.`,
  },
  explanationNotice: {
    anthropic: 'AI-assisted interpretation (Anthropic): it only selects references from the calculation; it does not change statuses, values or exclusions.',
    deterministic_template: 'Deterministic template without AI: it selects the requirements that are not met or not assessable.',
  },
}
