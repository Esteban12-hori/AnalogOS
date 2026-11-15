/**
 * Pure scene geometry (increment 4): point-in-polygon, regions and approximate zones.
 * No three.js or DOM. Coordinates are always [lon, lat] in WGS84 degrees.
 *
 * Data rule (docs/UX_REDESIGN.md §1.16): a ◆ whose cited point falls inside an evaluated
 * sector is shown as a "matches" badge on that ●; a region has its own ◆, and
 * "contains N sectors" is only claimed if this point-in-polygon test supports it.
 */
import type { CandidateGeometry, Position, ReferenceAnalog } from '../../domain/contracts'

const DEG = Math.PI / 180
/** Mean Earth radius (km), the same as in domain/mapZoom. */
export const EARTH_RADIUS_KM = 6371.0088

/**
 * Point in ring by crossing parity (ray casting) in the lon/lat plane. Sufficient for
 * sectors of tens of km far from the poles. The ring may be closed or open.
 */
export function pointInRing(point: Position, ring: readonly Position[]): boolean {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i]
    const b = ring[j]
    if (!a || !b) continue
    const [xi, yi] = a
    const [xj, yj] = b
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Point inside a Polygon (outside its holes) or inside any part of a MultiPolygon. */
export function pointInGeometry(point: Position, geometry: CandidateGeometry): boolean {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.some(([outer, ...holes]) => outer !== undefined && pointInRing(point, outer) && !holes.some((hole) => pointInRing(point, hole)))
}

export type Bbox = readonly [west: number, south: number, east: number, north: number]

/** Does the point fall within the box [west, south, east, north]? Supports boxes that cross the antimeridian. */
export function bboxContains([lon, lat]: Position, [west, south, east, north]: Bbox): boolean {
  if (lat < south || lat > north) return false
  return west <= east ? lon >= west && lon <= east : lon >= west || lon <= east
}

/** Closed ring of the box (to draw it as an approximate zone). */
export function bboxRing([west, south, east, north]: Bbox): Position[] {
  const eastUnwrapped = west <= east ? east : east + 360
  return [[west, south], [eastUnwrapped, south], [eastUnwrapped, north], [west, north], [west, south]]
}

/** Center of the box, with the antimeridian resolved. */
export function bboxCenter([west, south, east, north]: Bbox): Position {
  const eastUnwrapped = west <= east ? east : east + 360
  let lon = (west + eastUnwrapped) / 2
  if (lon > 180) lon -= 360
  return [lon, (south + north) / 2]
}

/** All vertices of the outer rings fall within the box (point-in-polygon test). */
export function geometryInsideBbox(geometry: CandidateGeometry, bbox: Bbox): boolean {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  const vertices = polygons.flatMap((polygon) => polygon[0] ?? [])
  return vertices.length > 0 && vertices.every((vertex) => bboxContains(vertex, bbox))
}

/** Point at `distanceKm` from `origin` with bearing `bearingDeg` on the sphere. */
export function destinationPoint([lon, lat]: Position, distanceKm: number, bearingDeg: number): Position {
  const delta = distanceKm / EARTH_RADIUS_KM
  const theta = bearingDeg * DEG
  const phi1 = lat * DEG
  const lambda1 = lon * DEG
  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(delta) + Math.cos(phi1) * Math.sin(delta) * Math.cos(theta))
  const lambda2 = lambda1 + Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(phi1), Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2))
  let lon2 = lambda2 / DEG
  if (lon2 > 180) lon2 -= 360
  if (lon2 < -180) lon2 += 360
  return [lon2, phi2 / DEG]
}

/** Angular distance (degrees of arc) between two lon/lat points. */
export function angularDistanceDeg([lon1, lat1]: Position, [lon2, lat2]: Position): number {
  const dPhi = (lat2 - lat1) * DEG
  const dLambda = (lon2 - lon1) * DEG
  const h = Math.sin(dPhi / 2) ** 2 + Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLambda / 2) ** 2
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / DEG
}

/** Representative point of a ◆ analog: the cited point or the center of its region. */
export function analogCenter(analog: Pick<ReferenceAnalog, 'location'>): Position {
  const { location } = analog
  return location.kind === 'approximate_point' ? [location.lon, location.lat] : bboxCenter(location.bbox)
}

/**
 * Outline of the "approximate zone" of a ◆: geodesic circle of the cited radius or the box of the
 * region. It is always drawn dashed: it is never a boundary survey or an exact pin.
 */
export function approximateZoneRing(analog: Pick<ReferenceAnalog, 'location'>, segments = 48): Position[] {
  const { location } = analog
  if (location.kind === 'region') return bboxRing(location.bbox)
  const center: Position = [location.lon, location.lat]
  const ring: Position[] = []
  for (let step = 0; step < segments; step += 1) ring.push(destinationPoint(center, location.radius_km, (360 * step) / segments))
  ring.push(ring[0] as Position)
  return ring
}
