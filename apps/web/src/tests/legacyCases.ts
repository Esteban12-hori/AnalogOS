// Representative confirmed requests used to pin legacy (1.0.0, Spanish) outputs and to compare English 1.1.0 results.
// Test support only (imported by *.test.* files, never by the app).
import type { MissionRequest } from '../mission'

type Req = MissionRequest['requirements'][number]
const base = (over: Partial<MissionRequest> = {}): MissionRequest => ({
  schema_version: '1.0.0', brief: 'Ensayo de un rover de ruedas en terreno árido; pendiente mediana ≤ 3° imprescindible.', activity: 'Ensayo de movilidad',
  target: { profile_id: 'mars-rover-screening-v3', stated: 'rover marciano' }, requirements: [], open_questions: ['¿Hay acceso en invierno?'],
  scope: { mode: 'catalog' }, confirmed: true, ...over,
})
const m = (id: string, metric_id: string, operator: string, value: unknown, unit: string, importance: 'critical' | 'preference' = 'critical', scale: 'window' | 'point' = 'window'): Req =>
  ({ kind: 'measurable', requirement_id: id, label: `Requisito ${id}`, importance, origin: 'user', confirmed: true, source_quote: null, metric_id, operator, value, unit, scale }) as Req
const u = (id: string, topic_id: string, importance: 'critical' | 'preference' = 'preference'): Req =>
  ({ kind: 'unmeasured', requirement_id: id, label: `Pendiente ${id}`, importance, origin: 'user', confirmed: true, source_quote: null, topic_id, detail: 'medir en terreno' }) as Req

const mixed: Req[] = [
  m('slope', 'median_slope_degree', '<=', 3, 'degree'),
  m('bare', 'nonvegetated_fraction', '>=', 95, 'percent', 'preference'),
  m('rough', 'terrain_roughness_meter', 'between', [0.5, 1234.5], 'meter', 'preference'),
  m('area', 'polygon_area_km2', '>=', 12345.5, 'km2', 'preference'),
  m('country', 'country', 'in', ['CL', 'AR'], 'iso_alpha2', 'preference'),
  m('point', 'median_slope_degree', '<=', 15, 'degree', 'preference', 'point'),
  u('traction', 'traction'),
  u('other', 'other_unmeasured', 'critical'),
]

export const CASES: Record<string, MissionRequest> = {
  catalog_mixed: base({ requirements: mixed }),
  catalog_empty: base(),
  none_prioritized: base({ requirements: [m('slope', 'median_slope_degree', '<=', 0.01, 'degree')] }),
  unsupported_objective: base({ target: { profile_id: 'other', stated: 'hábitat lunar' }, requirements: [m('slope', 'median_slope_degree', '<=', 3, 'degree')] }),
  point_no_coverage: base({ scope: { mode: 'point', lon: -70.5, lat: -33.4, window_site_id: null }, requirements: [m('slope', 'median_slope_degree', '<=', 3, 'degree')] }),
  bbox_no_coverage: base({ scope: { mode: 'bbox', bbox: [-71, -34, -70.5, -33.5], window_site_id: null }, requirements: [m('slope', 'median_slope_degree', '<=', 3, 'degree')] }),
  point_needs_window: base({ scope: { mode: 'point', lon: -67.5, lat: -26.2, window_site_id: null } }),
  point_window_selected_ar: base({ scope: { mode: 'point', lon: -67.5, lat: -26.2, window_site_id: 'ar-win-s2620-w06750' }, requirements: mixed }),
  bbox_partial_selected: base({ scope: { mode: 'bbox', bbox: [-67.6, -26.3, -67.45, -26.15], window_site_id: 'ar-win-s2620-w06750' }, requirements: mixed }),
  sector_ar6_geology: base({ scope: { mode: 'sector', site_id: 'ar-win-s2580-w06710' }, requirements: [m('slope', 'median_slope_degree', '<=', 5, 'degree'), u('traction', 'traction'), u('rock', 'rock_size')] }),
  sector_cl_partial: base({ scope: { mode: 'sector', site_id: 'cl-win-s2500-w06970' }, requirements: mixed }),
  sector_reference: base({ scope: { mode: 'sector', site_id: 'cl-pampa-yungay-screening' }, requirements: mixed }),
}
