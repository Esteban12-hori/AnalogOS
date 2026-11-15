import type { CandidateSite } from '../domain/contracts'
import { DEFAULT_EVALUATION_VERSION, missionText, type ScopeNotes } from './text'
import type { MissionScope, ScopeResolution, WindowMatch } from './types'

export type Bbox = [number, number, number, number] // [west, south, east, north]

/**
 * Sole tolerance: NUMERIC epsilon for serialization/floating point (published edges carry noise
 * like -69.60000000000001). ~0,1 mm: this is NOT a scientific tolerance. A geometry different from the
 * window, however slightly, does not inherit its statistics; it only enters by explicitly choosing the window.
 */
export const GEOMETRY_EPSILON_DEG = 1e-9
const POINT_EPS = GEOMETRY_EPSILON_DEG
export const MIN_SPAN_DEG = 0.001
export const MAX_SPAN_DEG = 10
const EARTH_RADIUS_KM = 6371.0088

export function rectAreaKm2(b: Bbox): number {
  const rad = Math.PI / 180
  return EARTH_RADIUS_KM ** 2 * (b[2] - b[0]) * rad * (Math.sin(b[3] * rad) - Math.sin(b[1] * rad))
}

/** Bbox of the outer ring. Returns null if the polygon is not an axis-aligned rectangle. */
export function siteRectangle(site: CandidateSite): Bbox | null {
  if (site.geometry.type !== 'Polygon') return null
  const ring = site.geometry.coordinates[0]
  const lons = ring.map((p) => p[0])
  const lats = ring.map((p) => p[1])
  const box: Bbox = [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]
  const eps = 1e-9
  const corners = ring.every(
    (p) => (Math.abs(p[0] - box[0]) < eps || Math.abs(p[0] - box[2]) < eps) && (Math.abs(p[1] - box[1]) < eps || Math.abs(p[1] - box[3]) < eps),
  )
  return corners ? box : null
}

export function validateBbox(b: unknown): string[] {
  if (!Array.isArray(b) || b.length !== 4 || !b.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    return ['bbox must be [west, south, east, north] with finite numbers.']
  }
  const [w, s, e, n] = b as Bbox
  const issues: string[] = []
  if (w < -180 || e > 180 || w > 180 || e < -180) issues.push('Longitude outside [-180, 180].')
  if (s < -90 || n > 90 || s > 90 || n < -90) issues.push('Latitude outside [-90, 90].')
  if (w >= e) issues.push('Invalid longitude order: west must be less than east (crossing the antimeridian is not supported).')
  if (s >= n) issues.push('Invalid latitude order: south must be less than north.')
  if (!issues.length) {
    if (e - w < MIN_SPAN_DEG || n - s < MIN_SPAN_DEG) issues.push(`The bbox is smaller than ${MIN_SPAN_DEG}° per side.`)
    if (e - w > MAX_SPAN_DEG || n - s > MAX_SPAN_DEG) issues.push(`The bbox exceeds ${MAX_SPAN_DEG}° per side.`)
  }
  return issues
}

export function validatePoint(lon: unknown, lat: unknown): string[] {
  if (typeof lon !== 'number' || typeof lat !== 'number' || !Number.isFinite(lon) || !Number.isFinite(lat)) {
    return ['Coordinates must be finite numbers.']
  }
  const issues: string[] = []
  if (lon < -180 || lon > 180) issues.push('Longitude outside [-180, 180].')
  if (lat < -90 || lat > 90) issues.push('Latitude outside [-90, 90].')
  return issues
}

function intersect(a: Bbox, b: Bbox): Bbox | null {
  const r: Bbox = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])]
  return r[0] < r[2] && r[1] < r[3] ? r : null
}

const sameEdges = (a: Bbox, b: Bbox): boolean => a.every((v, i) => Math.abs(v - b[i]) <= GEOMETRY_EPSILON_DEG)
const round = (x: number): number => Math.round(x * 1000) / 1000

function windowOf(site: CandidateSite, box: Bbox) {
  return { site_id: site.site_id, bbox: box, area_km2: site.area_km2 }
}

/**
 * Resolves which snapshot windows have evidence for the requested geometry.
 * It never inherits metrics from a different geometry: only an identical window (within the
 * tolerance) or one chosen explicitly (`window_site_id`) passes to `evaluated_site_ids`.
 * Sites with a non-rectangular polygon are excluded from the cross-match (and the data test detects this).
 * `notes` only changes the wording of `notes` (text pack of the record version); never the resolution itself.
 */
export function resolveScope(scope: MissionScope, sites: CandidateSite[], notes: ScopeNotes = missionText(DEFAULT_EVALUATION_VERSION).scopeNotes): ScopeResolution {
  const rects = sites
    .map((site) => ({ site, box: siteRectangle(site) }))
    .filter((x): x is { site: CandidateSite; box: Bbox } => x.box !== null)
  const base = (mode: MissionScope['mode']): ScopeResolution => ({
    mode,
    state: 'no_coverage',
    requested: { bbox: null, point: null, approx_area_km2: null },
    measured: [],
    matches: [],
    evaluated_site_ids: [],
    notes: [],
  })

  if (scope.mode === 'catalog') {
    const res = base('catalog')
    res.state = 'covered'
    res.measured = rects.map((r) => windowOf(r.site, r.box))
    res.evaluated_site_ids = rects.map((r) => r.site.site_id).sort()
    res.notes.push(notes.catalog)
    return res
  }

  if (scope.mode === 'sector') {
    const hit = rects.find((r) => r.site.site_id === scope.site_id)
    const res = base('sector')
    if (!hit) {
      res.notes.push(notes.sectorMissing(scope.site_id))
      return res
    }
    res.state = 'covered'
    res.requested = { bbox: hit.box, point: null, approx_area_km2: round(rectAreaKm2(hit.box)) }
    res.measured = [windowOf(hit.site, hit.box)]
    res.evaluated_site_ids = [hit.site.site_id]
    res.notes.push(notes.sectorCovered)
    return res
  }

  if (scope.mode === 'point') {
    const res = base('point')
    res.requested = { bbox: null, point: [scope.lon, scope.lat], approx_area_km2: null }
    res.matches = rects
      .filter((r) => scope.lon >= r.box[0] - POINT_EPS && scope.lon <= r.box[2] + POINT_EPS && scope.lat >= r.box[1] - POINT_EPS && scope.lat <= r.box[3] + POINT_EPS)
      .map<WindowMatch>((r) => ({
        site_id: r.site.site_id,
        name: r.site.name,
        relation: 'contains_point',
        request_covered_fraction: null,
        window_covered_fraction: null,
      }))
      .sort((a, b) => a.site_id.localeCompare(b.site_id))
    if (!res.matches.length) {
      res.notes.push(notes.pointOutside)
      return res
    }
    res.notes.push(notes.pointWindow)
    const chosen = scope.window_site_id ? res.matches.find((m) => m.site_id === scope.window_site_id) : null
    if (!chosen) {
      res.state = 'needs_window_selection'
      res.notes.push(res.matches.length > 1 ? notes.pointChooseMany : notes.pointChooseOne)
      return res
    }
    const hit = rects.find((r) => r.site.site_id === chosen.site_id)!
    res.state = 'window_selected'
    res.measured = [windowOf(hit.site, hit.box)]
    res.evaluated_site_ids = [chosen.site_id]
    return res
  }

  // bbox
  const res = base('bbox')
  const req = scope.bbox
  res.requested = { bbox: req, point: null, approx_area_km2: round(rectAreaKm2(req)) }
  const reqArea = rectAreaKm2(req)
  for (const r of rects) {
    const inter = intersect(req, r.box)
    if (!inter) continue
    const interArea = rectAreaKm2(inter)
    const fullyInside = intersect(req, r.box) && sameEdges(inter, r.box)
    const reqInside = sameEdges(inter, req)
    const relation: WindowMatch['relation'] = sameEdges(req, r.box)
      ? 'identical'
      : reqInside
        ? 'contains_bbox'
        : fullyInside
          ? 'inside_bbox'
          : 'overlaps_bbox'
    res.matches.push({
      site_id: r.site.site_id,
      name: r.site.name,
      relation,
      request_covered_fraction: round(interArea / reqArea),
      window_covered_fraction: round(interArea / rectAreaKm2(r.box)),
    })
  }
  res.matches.sort((a, b) => a.site_id.localeCompare(b.site_id))
  if (!res.matches.length) {
    res.notes.push(notes.bboxNone)
    return res
  }
  const identical = res.matches.filter((m) => m.relation === 'identical')
  if (identical.length === 1) {
    const hit = rects.find((r) => r.site.site_id === identical[0].site_id)!
    res.state = 'covered'
    res.measured = [windowOf(hit.site, hit.box)]
    res.evaluated_site_ids = [hit.site.site_id]
    res.notes.push(notes.bboxIdentical)
    return res
  }
  res.state = 'partial_coverage'
  res.notes.push(notes.bboxPartial)
  const chosen = scope.window_site_id ? res.matches.find((m) => m.site_id === scope.window_site_id) : null
  if (chosen) {
    const hit = rects.find((r) => r.site.site_id === chosen.site_id)!
    res.state = 'window_selected'
    res.measured = [windowOf(hit.site, hit.box)]
    res.evaluated_site_ids = [chosen.site_id]
    res.notes.push(notes.bboxSelected)
  }
  return res
}
