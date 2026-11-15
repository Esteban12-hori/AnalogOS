import type { CandidateSite } from '../domain/contracts'
import { METRIC_IDS, METRICS } from './catalog'
import type { MetricId } from './types'

export interface SiteMeasure {
  metric_id: MetricId
  label: string
  value: number | string | null
  unit: string
  scale_note: string
}

/** Snapshot measures for a sector (independent of the requirements). Read-only; does not compute anything new. */
export function siteMeasures(site: CandidateSite): SiteMeasure[] {
  return METRIC_IDS.map((id) => {
    const spec = METRICS[id]
    let value: number | string | null = null
    if (spec.source.kind === 'criterion') {
      const cid = spec.source.criterion_id
      const item = site.score_breakdown.find((b) => b.criterion_id === cid)
      value = item && item.status === 'valid' && typeof item.raw_value === 'number' ? item.raw_value : null
    } else {
      value = spec.source.field === 'area_km2' ? site.area_km2 : (site.country ?? null)
    }
    return { metric_id: id, label: spec.label, value, unit: spec.canonical_unit, scale_note: spec.scale_note }
  })
}
