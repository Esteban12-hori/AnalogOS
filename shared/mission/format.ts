// Shared formatting for the confirmation summary, results and printed report (UI).
// Presentation only: JSON values keep their canonical unit and exact number. Nothing is rounded or given extra
// precision (the shortest representation of each number is used), and the output is identical in Node and in the
// browser (no Intl). The UI uses the English pack; deterministic records use the pack of their own version
// (shared/mission/text), so the frozen 1.0.0 Spanish formatters stay bound to historical reconstruction.
import type { Requirement, ScopeResolution, WindowRelation } from './types'
import { IMPORTANCE_LABEL, describeEffective, fmtNumber } from './text/en'
export { IMPORTANCE_LABEL, SCALE_LABEL, describeCondition, describeEffective, fmtNumber, fmtObserved, fmtQuantity } from './text/en'

export const describeRequirementLine = (r: Requirement): string =>
  `${r.label}: ${r.kind === 'unmeasured' ? `not measured${r.detail ? ` — ${r.detail}` : ''}` : describeEffective(r)} (${IMPORTANCE_LABEL[r.importance]})`

export const RELATION_LABEL: Record<WindowRelation, string> = {
  identical: 'matches the window',
  contains_point: 'contains the point',
  contains_bbox: 'contains your rectangle',
  overlaps_bbox: 'partially overlaps',
  inside_bbox: 'lies inside your rectangle',
}

export const SCOPE_STATE_LABEL: Record<string, string> = {
  covered: 'Geometry with evidence',
  window_selected: 'Full window chosen by you (different from the request)',
  needs_window_selection: 'Window not chosen yet',
  partial_coverage: 'Partial coverage',
  no_coverage: 'No coverage',
}

const coord = (x: number): string => fmtNumber(Number(x.toFixed(6)))
const boxText = (b: [number, number, number, number]): string => `west ${coord(b[0])}, south ${coord(b[1])}, east ${coord(b[2])}, north ${coord(b[3])}`

export interface ScopeLines {
  requested: string
  state: string
  measured: string[]
  matches: string[]
}

/** Requested vs measured geometry as explicit text (self-contained as an analysis request). */
export function describeScope(res: ScopeResolution, nameOf: (siteId: string) => string): ScopeLines {
  const r = res.requested
  const requested =
    res.mode === 'catalog' ? 'The seven snapshot windows with evidence (comparison).'
    : r.point ? `Point: longitude ${coord(r.point[0])}, latitude ${coord(r.point[1])} (decimal degrees, WGS84).`
    : r.bbox ? `Rectangle: ${boxText(r.bbox)} (degrees, WGS84)${r.approx_area_km2 !== null ? `; approximate area ${fmtNumber(r.approx_area_km2)} km²` : ''}.`
    : 'No geometry.'
  const measured = res.measured.length
    ? res.measured.map((m) => `${nameOf(m.site_id)}: ${boxText(m.bbox)}; polygon extent ≈ ${fmtNumber(m.area_km2)} km² (not free surface).`)
    : ['No measured geometry: no metric was assigned to the request.']
  const matches = res.matches.map((m) => `${nameOf(m.site_id)} · ${RELATION_LABEL[m.relation]}${m.request_covered_fraction !== null ? ` · covers ${Math.round(m.request_covered_fraction * 100)}% of the request` : ''}`)
  return { requested, state: SCOPE_STATE_LABEL[res.state] ?? res.state, measured, matches }
}
