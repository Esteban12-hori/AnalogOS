import { displaySource } from '../i18n/sourceText'
import type { CandidateSite, CriterionStatus, ScoreBreakdownItem } from './contracts'

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
/** Place similarity, confidence and stability: FIXED 1 decimal (49.99 → “50.0”, not “50”). */
const score = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const criterionLabels: Record<string, string> = {
  slope: 'Slope',
  terrain_roughness: 'Roughness',
  local_relief: 'Local relief',
  bare_ground_fraction: 'Bare ground',
  aridity_context: 'Aridity',
  surface_temperature_variability: 'Thermal range',
  geologic_relevance: 'Geology',
}

export const criterionStatusLabels: Record<CriterionStatus, string> = {
  valid: 'Valid',
  missing: 'No data',
  needs_calibration: 'Not calibrated',
  excluded: 'Excluded',
}

export const ITEM_STATUS_LABEL = criterionStatusLabels

export const PROFILE_STATUS_LABEL: Record<string, string> = {
  needs_calibration: 'Needs calibration',
  needs_expert_review: 'Needs expert review',
  optional: 'Optional',
  validated: 'Validated',
  deprecated: 'Deprecated',
}

export const feasibilityLabels: Record<CandidateSite['feasibility'], string> = {
  unknown: 'Not evaluated',
  requires_review: 'Requires review',
  potentially_feasible: 'Potentially feasible',
  excluded: 'Excluded',
}

/** 0–100 place score (similarity, confidence, stability) with a fixed decimal, en-US format. */
export function formatScore(value: number | null): string {
  return value === null ? '—' : score.format(value)
}

/** Number with up to 1 decimal (no trailing zeros), en-US format: weights, quality, magnitudes. */
export function formatDecimal(value: number): string {
  return number.format(value)
}

/** en-US integer: per-criterion similarity (the exact value only in “Method”). */
export function formatWhole(value: number): string {
  return integer.format(value)
}

export function formatArea(value: number): string {
  // ponytail: two significant figures; the polygons are approximate cells, not boundary delineations.
  return `≈ ${integer.format(Number(value.toPrecision(2)))} km²`
}

export function formatPercent(value: number): string {
  return `${number.format(value * 100)}%`
}

export function formatRatio(value: number): string {
  return number.format(value)
}

export function formatRawValue(item: Pick<ScoreBreakdownItem, 'raw_value' | 'unit'>): string
export function formatRawValue(value: number | string | null, unit: string): string
export function formatRawValue(
  valueOrItem: number | string | null | Pick<ScoreBreakdownItem, 'raw_value' | 'unit'>,
  explicitUnit?: string,
): string {
  const value = typeof valueOrItem === 'object' && valueOrItem !== null
    ? valueOrItem.raw_value
    : valueOrItem
  const unit = typeof valueOrItem === 'object' && valueOrItem !== null
    ? valueOrItem.unit
    : (explicitUnit ?? '')
  if (value === null) return 'no raw value'
  if (typeof value === 'number') {
    if (unit === 'ratio') return `${number.format(value * 100)}%`
    if (unit === 'degree') return `${number.format(value)}°`
    if (unit === 'meter') return `${number.format(value)} m`
    if (unit === 'kelvin') return `${number.format(value)} K`
    if (unit === 'millimeter_per_year') return `${number.format(value)} mm/year`
    return number.format(value)
  }
  return value
}

/** Display name of a site: drops the synthetic-fixture suffix and shows the English rendering (coordinates with a decimal point, W for “O”). */
export function shortCandidateName(name: string): string {
  return displaySource(name.replace(' (sintético, ubicación arbitraria)', ''))
}
