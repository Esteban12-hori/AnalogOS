import type { CandidateSite } from '../domain/contracts'
import type { MissionScope, ScopeResolution, WindowMatch } from './types'

export type Bbox = [number, number, number, number] // [oeste, sur, este, norte]

/**
 * Única tolerancia: épsilon NUMÉRICA de serialización/coma flotante (los bordes publicados traen ruido
 * como -69.60000000000001). ~0,1 mm: NO es una tolerancia científica. Una geometría distinta de la
 * ventana, por poco que sea, no hereda sus estadísticos; solo entra eligiendo la ventana explícitamente.
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

/** Bbox del anillo exterior. Devuelve null si el polígono no es un rectángulo alineado a los ejes. */
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
    return ['bbox debe ser [oeste, sur, este, norte] con números finitos.']
  }
  const [w, s, e, n] = b as Bbox
  const issues: string[] = []
  if (w < -180 || e > 180 || w > 180 || e < -180) issues.push('Longitud fuera de [-180, 180].')
  if (s < -90 || n > 90 || s > 90 || n < -90) issues.push('Latitud fuera de [-90, 90].')
  if (w >= e) issues.push('Orden de longitud inválido: oeste debe ser menor que este (no se admite cruzar el antimeridiano).')
  if (s >= n) issues.push('Orden de latitud inválido: sur debe ser menor que norte.')
  if (!issues.length) {
    if (e - w < MIN_SPAN_DEG || n - s < MIN_SPAN_DEG) issues.push(`El bbox es menor que ${MIN_SPAN_DEG}° por lado.`)
    if (e - w > MAX_SPAN_DEG || n - s > MAX_SPAN_DEG) issues.push(`El bbox supera ${MAX_SPAN_DEG}° por lado.`)
  }
  return issues
}

export function validatePoint(lon: unknown, lat: unknown): string[] {
  if (typeof lon !== 'number' || typeof lat !== 'number' || !Number.isFinite(lon) || !Number.isFinite(lat)) {
    return ['Coordenadas deben ser números finitos.']
  }
  const issues: string[] = []
  if (lon < -180 || lon > 180) issues.push('Longitud fuera de [-180, 180].')
  if (lat < -90 || lat > 90) issues.push('Latitud fuera de [-90, 90].')
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
 * Resuelve qué ventanas del snapshot tienen evidencia para la geometría pedida.
 * Nunca hereda métricas de una geometría distinta: solo una ventana idéntica (dentro de la
 * tolerancia) o elegida de forma explícita (`window_site_id`) pasa a `evaluated_site_ids`.
 * Los sitios con polígono no rectangular se excluyen del cruce (y el test de datos lo detecta).
 */
export function resolveScope(scope: MissionScope, sites: CandidateSite[]): ScopeResolution {
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
    res.notes.push('Comparación entre las ventanas con evidencia del snapshot; cada una con sus propias métricas.')
    return res
  }

  if (scope.mode === 'sector') {
    const hit = rects.find((r) => r.site.site_id === scope.site_id)
    const res = base('sector')
    if (!hit) {
      res.notes.push(`El sector «${scope.site_id}» no existe en el snapshot.`)
      return res
    }
    res.state = 'covered'
    res.requested = { bbox: hit.box, point: null, approx_area_km2: round(rectAreaKm2(hit.box)) }
    res.measured = [windowOf(hit.site, hit.box)]
    res.evaluated_site_ids = [hit.site.site_id]
    res.notes.push('Geometría pedida y medida coinciden: es la ventana completa del snapshot.')
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
      res.notes.push('El punto está fuera de las ventanas con evidencia. No se usa el vecino más cercano.')
      return res
    }
    res.notes.push('Hay evidencia de la ventana que contiene el punto, no del punto exacto: las métricas son medianas de la ventana completa.')
    const chosen = scope.window_site_id ? res.matches.find((m) => m.site_id === scope.window_site_id) : null
    if (!chosen) {
      res.state = 'needs_window_selection'
      res.notes.push(
        res.matches.length > 1
          ? 'El punto cae en varias ventanas: elija explícitamente una antes de evaluar.'
          : 'Elija explícitamente la ventana antes de evaluar.',
      )
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
    res.notes.push('El bbox no se superpone con ninguna ventana con evidencia. No se usa el vecino más cercano.')
    return res
  }
  const identical = res.matches.filter((m) => m.relation === 'identical')
  if (identical.length === 1) {
    const hit = rects.find((r) => r.site.site_id === identical[0].site_id)!
    res.state = 'covered'
    res.measured = [windowOf(hit.site, hit.box)]
    res.evaluated_site_ids = [hit.site.site_id]
    res.notes.push('El bbox coincide con la ventana completa (épsilon numérica 1e-9°).')
    return res
  }
  res.state = 'partial_coverage'
  res.notes.push(
    'El bbox no coincide con una ventana completa (subárea, cobertura parcial o mayor que la ventana): ninguna métrica agregada se hereda de la ventana.',
  )
  const chosen = scope.window_site_id ? res.matches.find((m) => m.site_id === scope.window_site_id) : null
  if (chosen) {
    const hit = rects.find((r) => r.site.site_id === chosen.site_id)!
    res.state = 'window_selected'
    res.measured = [windowOf(hit.site, hit.box)]
    res.evaluated_site_ids = [chosen.site_id]
    res.notes.push('Se evalúa la ventana completa elegida explícitamente; no equivale a la geometría pedida.')
  }
  return res
}
