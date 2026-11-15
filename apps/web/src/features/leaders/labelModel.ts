/**
 * Content of each Tesla label and of the honesty header (§3.4). Pure. Every figure
 * comes from `MetricView` (snapshot or engine) or from the manifest; here we only choose what to show:
 *  - ■ Jezero only if the view carries `marsValue` (slope, roughness and relief);
 *  - otherwise, «┆ rule» (bounded_preference) or «Mars: no comparable measurement»;
 *  - criterion similarity as an integer; no data → «to be calculated» / «no data», dashed stroke.
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
  /** Sector value already formatted (es-CL). */
  siteText: string
  reference: LeaderReference
  /** Criterion similarity, integer 0–100; null = no data or to be calculated. */
  similarity: number | null
  /** «69 %» or the reason there is no figure. */
  similarityText: string
  /** No data or to be calculated: dashed line, no bar. */
  pending: boolean
  /** Limiting factor = most negative contribution (decided by buildMetricViews with `contribution`). */
  limiting: boolean
  /** «meets the rule · does not mean equal to Mars» / «saturates». */
  note: string | null
  /**
   * Requirement of the test on this criterion (Mission): ✓/✕/○ and the condition as written by
   * the team's engine (`required`, same wording as the exported JSON). null if no requirement.
   */
  requirement: { mark: string; status: RequirementResult['status']; text: string } | null
}

export const NO_MARS_TEXT = 'Mars: no comparable measurement'
export const RULE_SATURATES_TEXT = 'meets the rule · does not mean equal to Mars'

/** Label with the test requirement on that criterion (Mission). */
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
    similarityText: similarity !== null ? `${formatWhole(similarity)}%` : view.status === 'missing' ? 'no data' : 'not yet calculated',
    pending,
    limiting: view.isLimiting,
    note: view.saturates ? (view.rule ? RULE_SATURATES_TEXT : 'satura') : null,
    requirement: null,
  }
}

/** The most demanding requirement of the criterion (essential first): ✓/✕/○ and its condition. */
export function requirementText(requirements: readonly RequirementResult[]): LeaderLabelModel['requirement'] {
  const first = [...requirements].sort((a, b) => Number(b.importance === 'critical') - Number(a.importance === 'critical'))[0]
  if (!first) return null
  const condition = first.required.includes(': ') ? first.required.slice(first.required.indexOf(': ') + 2) : first.required
  return { mark: REQUIREMENT_MARK[first.status], status: first.status, text: `${condition}${requirements.length > 1 ? ` (+${requirements.length - 1})` : ''}` }
}

export interface LeaderHeaderModel {
  /** «≈ 450 km²» (two significant figures: the polygon is an approximate cell). */
  area: string | null
  /** Scale of the topographic medians according to the manifest («~460–480 m»); null if it does not declare one. */
  scale: string | null
  /** There is at least one ■ Jezero among the labels. */
  vsMars: boolean
  /** The lines show the requirements of your test (the weights remain those of the snapshot). */
  mission: boolean
}

const TOPO_SCALE = /(~\s*\d[\d.,]*(?:\s*[–-]\s*\d[\d.,]*)?\s*m)\s+comparación topográfica/i

/** Topographic comparison scale declared in the manifest for these datasets, if it exists. */
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

/** Plain text of the header (the component paints it in parts to color ■). */
export function headerText(model: LeaderHeaderModel): string {
  return [
    'Whole sector',
    model.area,
    model.scale ? `medians ${model.scale}` : 'medians',
    model.vsMars ? 'vs ■ Jezero (MOLA)' : null,
    model.mission ? 'with your requirements' : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ')
}
