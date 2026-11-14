/**
 * Geometría mínima para la regla §1 #16 de docs/UX_REDESIGN.md: un ◆ citado como punto que cae
 * dentro de un sector evaluado se muestra como insignia «coincide con»; una región solo dice
 * «contiene N sectores» si cada vértice del sector está dentro de su caja. Funciones puras, en
 * grados WGS84 (los sectores de Chile no cruzan el antimeridiano).
 */
import type { CandidateGeometry, Position } from '../../domain/contracts'

/** Ray casting par-impar. Un punto exactamente sobre el borde puede dar cualquiera de los dos. */
export function pointInRing(lon: number, lat: number, ring: readonly Position[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as Position
    const [xj, yj] = ring[j] as Position
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Dentro del anillo exterior y fuera de todos los huecos. */
export function pointInPolygon(lon: number, lat: number, rings: readonly (readonly Position[])[]): boolean {
  const [outer, ...holes] = rings
  return outer !== undefined && pointInRing(lon, lat, outer) && !holes.some((hole) => pointInRing(lon, lat, hole))
}

export function pointInGeometry(lon: number, lat: number, geometry: CandidateGeometry): boolean {
  return geometry.type === 'Polygon'
    ? pointInPolygon(lon, lat, geometry.coordinates)
    : geometry.coordinates.some((polygon) => pointInPolygon(lon, lat, polygon))
}

/** Caja [oeste, sur, este, norte]. */
export type Bbox = readonly [number, number, number, number]

/** true si TODOS los vértices del sector están dentro de la caja (no basta con tocarla). */
export function geometryInsideBbox(geometry: CandidateGeometry, [west, south, east, north]: Bbox): boolean {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.every((rings) => rings.every((ring) => ring.every(([lon, lat]) => lon >= west && lon <= east && lat >= south && lat <= north)))
}
