import type { CandidateSite, CriterionStatus, ScoreBreakdownItem } from './contracts'

const number = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })
const integer = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })

export const criterionLabels: Record<string, string> = {
  slope: 'Pendiente',
  terrain_roughness: 'Rugosidad',
  local_relief: 'Relieve local',
  bare_ground_fraction: 'Suelo expuesto',
  aridity_context: 'Aridez',
  surface_temperature_variability: 'Variabilidad térmica',
  geologic_relevance: 'Geología',
}

export const criterionStatusLabels: Record<CriterionStatus, string> = {
  valid: 'Válido',
  missing: 'Sin dato',
  needs_calibration: 'Sin calibrar',
  excluded: 'Excluido',
}

export const ITEM_STATUS_LABEL = criterionStatusLabels

export const PROFILE_STATUS_LABEL: Record<string, string> = {
  needs_calibration: 'Necesita calibración',
  needs_expert_review: 'Requiere revisión experta',
  optional: 'Opcional',
  validated: 'Validado',
  deprecated: 'Obsoleto',
}

export const feasibilityLabels: Record<CandidateSite['feasibility'], string> = {
  unknown: 'Sin evaluar',
  requires_review: 'Requiere revisión',
  potentially_feasible: 'Potencialmente factible',
  excluded: 'Excluido',
}

export function formatScore(value: number | null): string {
  return value === null ? '—' : number.format(value)
}

export function formatArea(value: number): string {
  return `≈ ${integer.format(Math.round(value / 100) * 100)} km²`
}

export function formatPercent(value: number): string {
  return `${number.format(value * 100)} %`
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
  if (value === null) return 'sin valor bruto'
  if (typeof value === 'number') {
    if (unit === 'ratio') return `${number.format(value * 100)} %`
    if (unit === 'degree') return `${number.format(value)}°`
    if (unit === 'meter') return `${number.format(value)} m`
    if (unit === 'kelvin') return `${number.format(value)} K`
    if (unit === 'millimeter_per_year') return `${number.format(value)} mm/año`
    return number.format(value)
  }
  return value
}

export function shortCandidateName(name: string): string {
  return name.replace(' (sintético, ubicación arbitraria)', '')
}
