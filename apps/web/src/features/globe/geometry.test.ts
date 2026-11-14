import { describe, expect, it } from 'vitest'
import type { CandidateGeometry, Position, ReferenceAnalog } from '../../domain/contracts'
import {
  analogCenter,
  angularDistanceDeg,
  approximateZoneRing,
  bboxCenter,
  bboxContains,
  destinationPoint,
  EARTH_RADIUS_KM,
  geometryInsideBbox,
  pointInGeometry,
  pointInRing,
} from './geometry'

// FIXTURE: polígonos sintéticos con la forma de los sectores del snapshot (cajas de 0,2°).
const yungay: Position[] = [[-70.05, -24.18], [-69.85, -24.18], [-69.85, -23.98], [-70.05, -23.98], [-70.05, -24.18]]
const hole: Position[] = [[-69.97, -24.1], [-69.93, -24.1], [-69.93, -24.06], [-69.97, -24.06], [-69.97, -24.1]]

describe('punto-en-polígono', () => {
  it('distingue dentro y fuera de un anillo, cerrado o abierto', () => {
    expect(pointInRing([-69.95, -24.08], yungay)).toBe(true)
    expect(pointInRing([-69.5, -24.08], yungay)).toBe(false)
    expect(pointInRing([-69.95, -24.3], yungay)).toBe(false)
    expect(pointInRing([-69.95, -24.08], yungay.slice(0, -1))).toBe(true)
  })

  it('respeta los huecos de un Polygon y cualquier parte de un MultiPolygon', () => {
    const withHole: CandidateGeometry = { type: 'Polygon', coordinates: [yungay, hole] }
    expect(pointInGeometry([-69.95, -24.08], withHole)).toBe(false)
    expect(pointInGeometry([-69.88, -24.0], withHole)).toBe(true)
    const shifted = yungay.map(([lon, lat]) => [lon + 1, lat] as Position)
    const multi: CandidateGeometry = { type: 'MultiPolygon', coordinates: [[yungay], [shifted]] }
    expect(pointInGeometry([-68.95, -24.08], multi)).toBe(true)
    expect(pointInGeometry([-69.4, -24.08], multi)).toBe(false)
  })
})

describe('regiones', () => {
  it('bboxContains admite cajas que cruzan el antimeridiano', () => {
    expect(bboxContains([-69.9, -24], [-71, -25, -68, -20])).toBe(true)
    expect(bboxContains([-67.9, -24], [-71, -25, -68, -20])).toBe(false)
    expect(bboxContains([179.5, 10], [170, 0, -170, 20])).toBe(true)
    expect(bboxContains([-175, 10], [170, 0, -170, 20])).toBe(true)
    expect(bboxContains([0, 10], [170, 0, -170, 20])).toBe(false)
    expect(bboxCenter([170, 0, -170, 20])).toEqual([180, 10])
  })

  it('una región contiene un sector solo si todos sus vértices caen dentro', () => {
    const sector: CandidateGeometry = { type: 'Polygon', coordinates: [yungay] }
    expect(geometryInsideBbox(sector, [-71, -25, -69, -23])).toBe(true)
    // Corta el sector por la mitad: no se afirma «contiene».
    expect(geometryInsideBbox(sector, [-71, -25, -69.95, -23])).toBe(false)
    expect(geometryInsideBbox({ type: 'Polygon', coordinates: [] }, [-71, -25, -69, -23])).toBe(false)
  })
})

describe('zona aproximada', () => {
  it('destinationPoint recorre la distancia pedida sobre la esfera', () => {
    const north = destinationPoint([-70, -24], (Math.PI / 180) * EARTH_RADIUS_KM, 0)
    expect(north[0]).toBeCloseTo(-70, 6)
    expect(north[1]).toBeCloseTo(-23, 6)
    expect(angularDistanceDeg([-70, -24], north)).toBeCloseTo(1, 6)
  })

  it('el círculo del ◆ queda cerrado y a radio_km del punto citado', () => {
    const analog: Pick<ReferenceAnalog, 'location'> = { location: { kind: 'approximate_point', lon: -110.79, lat: 38.41, radius_km: 25 } }
    const ring = approximateZoneRing(analog, 24)
    expect(ring).toHaveLength(25)
    expect(ring[0]).toEqual(ring.at(-1))
    for (const point of ring) expect((angularDistanceDeg([-110.79, 38.41], point) * Math.PI * EARTH_RADIUS_KM) / 180).toBeCloseTo(25, 3)
    expect(analogCenter(analog)).toEqual([-110.79, 38.41])
  })

  it('una región se dibuja como su caja y se ancla en su centro', () => {
    const region: Pick<ReferenceAnalog, 'location'> = { location: { kind: 'region', bbox: [-71, -27, -68, -19] } }
    expect(approximateZoneRing(region)).toEqual([[-71, -27], [-68, -27], [-68, -19], [-71, -19], [-71, -27]])
    expect(analogCenter(region)).toEqual([-69.5, -23])
  })
})
