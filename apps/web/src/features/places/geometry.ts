/**
 * Minimal geometry for rule §1 #16 of docs/UX_REDESIGN.md: a ◆ cited as a point that falls
 * inside an evaluated sector is shown as a "coincides with" badge; a region only says
 * "contains N sectors" if every vertex of the sector is inside its box. Pure functions, in
 * WGS84 degrees (Chile's sectors do not cross the antimeridian).
 */
import type { CandidateGeometry, Position } from '../../domain/contracts'

/** Even-odd ray casting. A point exactly on the edge may yield either result. */
export function pointInRing(lon: number, lat: number, ring: readonly Position[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as Position
    const [xj, yj] = ring[j] as Position
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Inside the outer ring and outside all holes. */
export function pointInPolygon(lon: number, lat: number, rings: readonly (readonly Position[])[]): boolean {
  const [outer, ...holes] = rings
  return outer !== undefined && pointInRing(lon, lat, outer) && !holes.some((hole) => pointInRing(lon, lat, hole))
}

export function pointInGeometry(lon: number, lat: number, geometry: CandidateGeometry): boolean {
  return geometry.type === 'Polygon'
    ? pointInPolygon(lon, lat, geometry.coordinates)
    : geometry.coordinates.some((polygon) => pointInPolygon(lon, lat, polygon))
}

/** Box [west, south, east, north]. */
export type Bbox = readonly [number, number, number, number]

/** true if ALL of the sector's vertices are inside the box (merely touching it is not enough). */
export function geometryInsideBbox(geometry: CandidateGeometry, [west, south, east, north]: Bbox): boolean {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polygons.every((rings) => rings.every((ring) => ring.every(([lon, lat]) => lon >= west && lon <= east && lat >= south && lat <= north)))
}
