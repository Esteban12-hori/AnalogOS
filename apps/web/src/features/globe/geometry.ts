/**
 * Geometría pura del escenario (incremento 4): punto-en-polígono, regiones y zonas aproximadas.
 * Sin three.js ni DOM. Coordenadas siempre [lon, lat] en grados WGS84.
 *
 * Regla de datos (docs/UX_REDESIGN.md §1.16): un ◆ cuyo punto citado cae dentro de un sector
 * evaluado se muestra como insignia «coincide con» sobre ese ●; una región tiene su ◆ propio, y
 * «contiene N sectores» solo se afirma si este test de punto-en-polígono lo respalda.
 */
import type { CandidateGeometry, Position, ReferenceAnalog } from '../../domain/contracts'

const DEG = Math.PI / 180
/** Radio medio terrestre (km), el mismo de domain/mapZoom. */
export const EARTH_RADIUS_KM = 6371.0088

/**
 * Punto en anillo por paridad de cruces (ray casting) en el plano lon/lat. Suficiente para
 * sectores de decenas de km lejos de los polos. El anillo puede venir cerrado o abierto.
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

/** Punto dentro de un Polygon (fuera de sus huecos) o de cualquier parte de un MultiPolygon. */
export function pointInGeometry(point: Position, geometry: CandidateGeometry): boolean {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.some(([outer, ...holes]) => outer !== undefined && pointInRing(point, outer) && !holes.some((hole) => pointInRing(point, hole)))
}

export type Bbox = readonly [west: number, south: number, east: number, north: number]

/** ¿El punto cae en la caja [oeste, sur, este, norte]? Admite cajas que cruzan el antimeridiano. */
export function bboxContains([lon, lat]: Position, [west, south, east, north]: Bbox): boolean {
  if (lat < south || lat > north) return false
  return west <= east ? lon >= west && lon <= east : lon >= west || lon <= east
}

/** Anillo cerrado de la caja (para dibujarla como zona aproximada). */
export function bboxRing([west, south, east, north]: Bbox): Position[] {
  const eastUnwrapped = west <= east ? east : east + 360
  return [[west, south], [eastUnwrapped, south], [eastUnwrapped, north], [west, north], [west, south]]
}

/** Centro de la caja, con el antimeridiano resuelto. */
export function bboxCenter([west, south, east, north]: Bbox): Position {
  const eastUnwrapped = west <= east ? east : east + 360
  let lon = (west + eastUnwrapped) / 2
  if (lon > 180) lon -= 360
  return [lon, (south + north) / 2]
}

/** Todos los vértices de los anillos exteriores caen dentro de la caja (test punto-en-polígono). */
export function geometryInsideBbox(geometry: CandidateGeometry, bbox: Bbox): boolean {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  const vertices = polygons.flatMap((polygon) => polygon[0] ?? [])
  return vertices.length > 0 && vertices.every((vertex) => bboxContains(vertex, bbox))
}

/** Punto a `distanceKm` desde `origin` con rumbo `bearingDeg` sobre la esfera. */
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

/** Distancia angular (grados de arco) entre dos puntos lon/lat. */
export function angularDistanceDeg([lon1, lat1]: Position, [lon2, lat2]: Position): number {
  const dPhi = (lat2 - lat1) * DEG
  const dLambda = (lon2 - lon1) * DEG
  const h = Math.sin(dPhi / 2) ** 2 + Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLambda / 2) ** 2
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / DEG
}

/** Punto representativo de un análogo ◆: el punto citado o el centro de su región. */
export function analogCenter(analog: Pick<ReferenceAnalog, 'location'>): Position {
  const { location } = analog
  return location.kind === 'approximate_point' ? [location.lon, location.lat] : bboxCenter(location.bbox)
}

/**
 * Contorno de la «zona aproximada» de un ◆: círculo geodésico del radio citado o la caja de la
 * región. Siempre se dibuja discontinuo: nunca es un deslinde ni un pin exacto.
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
