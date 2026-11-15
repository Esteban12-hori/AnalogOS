/**
 * Contenido de cada etiqueta Tesla y del encabezado de honestidad (§3.4). Puro. Toda cifra
 * viene de `MetricView` (snapshot o motor) o del manifiesto; aquí solo se elige qué mostrar:
 *  - ■ Jezero solo si la vista trae `marsValue` (pendiente, rugosidad y relieve);
 *  - si no, «┆ regla» (bounded_preference) o «Marte: sin medición comparable»;
 *  - similitud del criterio en entero; sin dato → «por calcular» / «sin dato», trazo discontinuo.
 */
import type { CandidateSite, DataManifest } from '../../domain/contracts'
import { criterionLabels, formatArea, formatWhole } from '../../domain/formatting'
import { REQUIREMENT_MARK } from '../../domain/missionView'
import type { RequirementResult } from '../../mission/types'
import type { MetricView } from '../metrics'

export type LeaderReference =
  | { kind: 'mars'; text: string }
  | { kind: 'rule'; satisfied: boolean | null }
  | { kind: 'none' }

export interface LeaderLabelModel {
  id: string
  title: string
  /** Valor del sector ya formateado (es-CL). */
  siteText: string
  reference: LeaderReference
  /** Similitud del criterio, entera 0–100; null = sin dato o por calcular. */
  similarity: number | null
  /** «69 %» o el motivo de no tener cifra. */
  similarityText: string
  /** Sin dato o por calcular: línea discontinua, sin barra. */
  pending: boolean
  /** Limitante = contribución más negativa (lo decide buildMetricViews con `contribution`). */
  limiting: boolean
  /** «cumple la regla · no significa igual a Marte» / «satura». */
  note: string | null
  /**
   * Requisito de la prueba sobre este criterio (Misión): ✓/✕/○ y la condición tal como la escribió
   * el motor del equipo (`required`, misma redacción que el JSON exportado). null sin requisito.
   */
  requirement: { mark: string; status: RequirementResult['status']; text: string } | null
}

export const NO_MARS_TEXT = 'Marte: sin medición comparable'
export const RULE_SATURATES_TEXT = 'cumple la regla · no significa igual a Marte'

/** Etiqueta con el requisito de la prueba sobre ese criterio (Misión). */
export function leaderLabelModelFor(view: MetricView, requirements: readonly RequirementResult[]): LeaderLabelModel {
  return { ...leaderLabelModel(view), requirement: requirementText(requirements) }
}

export function leaderLabelModel(view: MetricView): LeaderLabelModel {
  const raw = view.similarity
  const missing = raw === null || !Number.isFinite(raw) || view.status === 'missing'
  const pending = missing || view.status === 'needs_calibration'
  const similarity = pending || raw === null ? null : Math.round(Math.min(100, Math.max(0, raw)))
  const reference: LeaderReference = view.marsValue
    ? { kind: 'mars', text: view.marsValue.text }
    : view.rule
      ? { kind: 'rule', satisfied: view.rule.satisfied }
      : { kind: 'none' }
  return {
    id: view.criterionId,
    title: criterionLabels[view.criterionId] ?? view.label,
    siteText: view.siteValue.text.trim() || '—',
    reference,
    similarity,
    similarityText: similarity !== null ? `${formatWhole(similarity)} %` : view.status === 'missing' ? 'sin dato' : 'por calcular',
    pending,
    limiting: view.isLimiting,
    note: view.saturates ? (view.rule ? RULE_SATURATES_TEXT : 'satura') : null,
    requirement: null,
  }
}

/** El requisito más exigente del criterio (imprescindible primero): ✓/✕/○ y su condición. */
export function requirementText(requirements: readonly RequirementResult[]): LeaderLabelModel['requirement'] {
  const first = [...requirements].sort((a, b) => Number(b.importance === 'critical') - Number(a.importance === 'critical'))[0]
  if (!first) return null
  const condition = first.required.includes(': ') ? first.required.slice(first.required.indexOf(': ') + 2) : first.required
  return { mark: REQUIREMENT_MARK[first.status], status: first.status, text: `${condition}${requirements.length > 1 ? ` (+${requirements.length - 1})` : ''}` }
}

export interface LeaderHeaderModel {
  /** «≈ 450 km²» (dos cifras significativas: el polígono es una celda aproximada). */
  area: string | null
  /** Escala de las medianas topográficas según el manifiesto («~460–480 m»); null si no la declara. */
  scale: string | null
  /** Hay al menos un ■ Jezero entre las etiquetas. */
  vsMars: boolean
  /** Las líneas muestran los requisitos de tu prueba (los pesos siguen siendo los del snapshot). */
  mission: boolean
}

const TOPO_SCALE = /(~\s*\d[\d.,]*(?:\s*[–-]\s*\d[\d.,]*)?\s*m)\s+comparación topográfica/i

/** Escala de comparación topográfica declarada en el manifiesto para estos datasets, si existe. */
export function topographicScale(manifest: DataManifest | null, datasetIds: readonly string[]): string | null {
  if (!manifest) return null
  for (const dataset of manifest.datasets) {
    if (!datasetIds.includes(dataset.dataset_id)) continue
    const match = TOPO_SCALE.exec(dataset.spatial_resolution)
    if (match?.[1]) return match[1].replace(/\s+/g, ' ').replace(/~ /, '~')
  }
  return null
}

export function leaderHeader(args: {
  site: CandidateSite
  manifest: DataManifest | null
  principal: readonly MetricView[]
  missionActive: boolean
}): LeaderHeaderModel {
  const area = Number.isFinite(args.site.area_km2) && args.site.area_km2 > 0 ? formatArea(args.site.area_km2) : null
  const datasets = args.principal.filter((view) => view.marsValue !== null).map((view) => view.datasetId)
  return {
    area,
    scale: topographicScale(args.manifest, datasets),
    vsMars: args.principal.some((view) => view.marsValue !== null),
    mission: args.missionActive,
  }
}

/** Texto plano del encabezado (el componente lo pinta por partes para colorear ■). */
export function headerText(model: LeaderHeaderModel): string {
  return [
    'Todo el sector',
    model.area,
    model.scale ? `medianas ${model.scale}` : 'medianas',
    model.vsMars ? 'vs ■ Jezero (MOLA)' : null,
    model.mission ? 'con tus requisitos' : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ')
}
