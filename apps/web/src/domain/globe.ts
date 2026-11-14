import type { CandidateGeometry, Position } from './contracts'

/** Vector cartesiano mínimo; evita acoplar el dominio a three.js. */
export type Vec3 = [number, number, number]

const DEG = Math.PI / 180

/**
 * Convierte latitud/longitud (grados) a coordenadas cartesianas sobre una esfera.
 * Coincide con el mapeo UV por defecto de `THREE.SphereGeometry` para texturas
 * equirectangulares cuyo borde izquierdo es la longitud -180°.
 */
export function latLngToVec3(latitude: number, longitude: number, radius: number): Vec3 {
  const phi = (90 - latitude) * DEG
  const theta = (longitude + 180) * DEG
  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ]
}

export function outerRings(geometry: CandidateGeometry): Position[][] {
  if (geometry.type === 'Polygon') return geometry.coordinates.slice(0, 1)
  return geometry.coordinates.map((polygon) => polygon[0]).filter((ring): ring is Position[] => Boolean(ring))
}

/**
 * Centro aproximado (media de vértices del primer anillo exterior) en [lon, lat].
 * Solo se usa para anclar el rótulo; la zona se dibuja siempre como polígono.
 */
export function geometryCenter(geometry: CandidateGeometry): Position | null {
  const ring = outerRings(geometry)[0] ?? []
  const closed = ring.length > 1 && ring[0]?.[0] === ring.at(-1)?.[0] && ring[0]?.[1] === ring.at(-1)?.[1]
  const points = closed ? ring.slice(0, -1) : ring
  if (!points.length) return null
  const sum = points.reduce<Position>((acc, [lon, lat]) => [acc[0] + lon, acc[1] + lat], [0, 0])
  return [sum[0] / points.length, sum[1] / points.length]
}

/**
 * Densifica un anillo para que sus aristas sigan la curvatura de la esfera
 * (interpolación lineal en grados, suficiente para tramos cortos).
 */
export function densifyRing(ring: Position[], maxStepDegrees = 0.5): Position[] {
  if (ring.length < 2) return ring
  const out: Position[] = []
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [lon0, lat0] = ring[index] as Position
    const [lon1, lat1] = ring[index + 1] as Position
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(lon1 - lon0), Math.abs(lat1 - lat0)) / maxStepDegrees - 1e-9))
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps
      out.push([lon0 + (lon1 - lon0) * t, lat0 + (lat1 - lat0) * t])
    }
  }
  out.push(ring.at(-1) as Position)
  return out
}

/** Producto punto de direcciones normalizadas; > 0 significa hemisferio visible. */
export function facingFactor(point: Vec3, camera: Vec3): number {
  const lp = Math.hypot(...point)
  const lc = Math.hypot(...camera)
  if (lp === 0 || lc === 0) return 0
  return (point[0] * camera[0] + point[1] * camera[1] + point[2] * camera[2]) / (lp * lc)
}
