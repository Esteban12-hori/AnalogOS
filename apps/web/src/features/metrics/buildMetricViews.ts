/**
 * Modelo puro del riel de métricas (incremento 5, docs/UX_REDESIGN.md §3.6).
 *
 * Toda cifra sale del snapshot (score_breakdown del pipeline), de la referencia MOLA de Jezero
 * (analysis-summary.json) o del motor de misión (pesos y contribuciones). Aquí solo se ordena,
 * se compara y se rotula: no se recalcula ninguna similitud ni se inventa un valor de Marte.
 *
 *  - Orden: peso del perfil activo, de mayor a menor; empates por el orden canónico.
 *  - ■ Jezero: solo pendiente, rugosidad y relieve (MOLA). El resto lleva null.
 *  - Limitante: la contribución más negativa (campo `contribution`), no la similitud más baja.
 *  - «satura»: preferencia acotada que alcanzó el tope de su regla.
 *  - Valor regional compartido: mismo valor y misma fuente en otro sector evaluado.
 */
import { CRITERION_IDS, isCriterionId, type CriterionId, type MissionCriterion, type ScoreBreakdownItem } from '../../domain/contracts'
import { criterionLabels, formatRawValue } from '../../domain/formatting'
import type { BuildMetricViewsInput, MetricView } from './index'

/** Criterios con valor marciano comparable (medianas MOLA de Jezero) y la unidad exigida. */
export const MARS_COMPARABLE: Readonly<Partial<Record<CriterionId, string>>> = Object.freeze({
  slope: 'degree',
  terrain_roughness: 'meter',
  local_relief: 'meter',
})

/** Nombre corto de cada criterio en la UI (un mismo nombre en riel, líneas y Lectura). */
export const METRIC_LABELS: Readonly<Record<CriterionId, string>> = Object.freeze({
  slope: 'Pendiente',
  terrain_roughness: 'Rugosidad',
  local_relief: 'Relieve local',
  bare_ground_fraction: 'Suelo expuesto',
  aridity_context: 'Aridez',
  surface_temperature_variability: 'Rango térmico',
  geologic_relevance: 'Geología',
})

/** Qué mide cada criterio, en una línea. */
export const METRIC_MEASURES: Readonly<Record<CriterionId, string>> = Object.freeze({
  slope: 'Mediana del terreno a ~480 m',
  terrain_roughness: 'Desnivel mediano entre celdas vecinas',
  local_relief: 'Desnivel mediano en ventanas 3×3',
  bare_ground_fraction: 'Píxeles sin vegetación · Sentinel-2 2025',
  aridity_context: 'Precipitación climatológica · NASA POWER',
  surface_temperature_variability: 'Amplitud climatológica de la superficie',
  geologic_relevance: 'Compatibilidad litológica con el objetivo',
})

interface BoundedRule {
  /** Texto de la regla (┆). */
  text: string
  /** La misma fórmula que aplica el pipeline; sirve para el chequeo de consistencia. */
  similarity: (raw: number) => number
}

/**
 * Reglas de las preferencias acotadas, copiadas de `pipelines/build_precision_snapshot.py`
 * (no son rangos planetarios). Antes de mostrarlas se verifica que reproducen la similitud del
 * snapshot: si no coinciden, la UI no muestra la fórmula y avisa.
 */
export const BOUNDED_RULES: Readonly<Partial<Record<CriterionId, BoundedRule>>> = Object.freeze({
  bare_ground_fraction: {
    text: 'Más suelo sin vegetación, más análogo: la similitud es la fracción no vegetada (Sentinel-2, SCL clase 5).',
    similarity: (raw: number) => Math.max(0, Math.min(1, raw)),
  },
  aridity_context: {
    text: 'Menos lluvia, más análogo: la similitud es 1 ÷ (1 + lluvia ÷ 25 mm/año); vale 50 a 25 mm/año.',
    similarity: (raw: number) => 1 / (1 + raw / 25),
  },
  surface_temperature_variability: {
    text: 'Más amplitud térmica, más análogo, hasta saturar en 45 K.',
    similarity: (raw: number) => Math.min(raw / 45, 1),
  },
})

export const GENERIC_RULE_TEXT = 'Preferencia acotada del perfil: la similitud crece hacia el extremo preferido y se detiene en su tope.'
export const UNVERIFIED_RULE_TEXT = 'La regla conocida no reproduce la similitud del snapshot; consulta «Método» antes de interpretarla.'

/** El pipeline redondea la similitud a 6 decimales. */
export const RULE_TOLERANCE = 1e-5
/** Tope de una preferencia acotada (similitud 1). */
const SATURATION_EPS = 1e-9
/** Banda en la que sector y Jezero se consideran «similares» (la razón se muestra con 1 decimal). */
export const SIMILAR_RATIO_BAND = 0.05
/** Empates de peso: los pesos de misión salen de una división y pueden diferir en el último bit. */
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
      return 'por calcular'
    case 'excluded':
      return 'excluido'
    default:
      return 'sin dato'
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
  // Dos sectores en el tope (o el piso) de una regla coinciden por saturación, no porque
  // compartan la misma celda de la fuente: eso no es un valor regional compartido.
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

/** Ordena por el peso del perfil activo; desempate por el orden canónico de criterios. */
export function buildMetricViews(input: BuildMetricViewsInput): MetricView[] {
  const { site, sites, profile, weights, contributions, marsReference } = input
  const items = new Map<string, ScoreBreakdownItem>(site.score_breakdown.map((item) => [item.criterion_id, item]))
  const criteria = new Map<string, MissionCriterion>(profile.criteria.map((criterion) => [criterion.id, criterion]))

  // Criterios del perfil y, por si el snapshot trae alguno más, los del desglose (sin repetir).
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
      saturates: rule !== null && valid && item !== null && item.normalized_similarity !== null && item.normalized_similarity >= 1 - SATURATION_EPS,
      sharedRegionalWith: sharedRegional(id, item, site.site_id, sites),
      quality: item?.quality ?? 0,
      datasetId: item?.dataset_id ?? 'none',
    }
  })

  // Limitante = contribución más negativa entre los criterios que pesan; empate → orden canónico.
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

/** La métrica limitante de una lista de vistas (null si ninguna contribución es negativa). */
export function limitingView(views: readonly MetricView[]): MetricView | null {
  return views.find((view) => view.isLimiting) ?? null
}
