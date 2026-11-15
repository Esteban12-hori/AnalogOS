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

// FIXTURE: synthetic polygons shaped like the snapshot sectors (0,2° boxes).
const yungay: Position[] = [[-70.05, -24.18], [-69.85, -24.18], [-69.85, -23.98], [-70.05, -23.98], [-70.05, -24.18]]
const hole: Position[] = [[-69.97, -24.1], [-69.93, -24.1], [-69.93, -24.06], [-69.97, -24.06], [-69.97, -24.1]]

describe('point-in-polygon', () => {
  it('distinguishes inside and outside a ring, closed or open', () => {
    expect(pointInRing([-69.95, -24.08], yungay)).toBe(true)
    expect(pointInRing([-69.5, -24.08], yungay)).toBe(false)
    expect(pointInRing([-69.95, -24.3], yungay)).toBe(false)
    expect(pointInRing([-69.95, -24.08], yungay.slice(0, -1))).toBe(true)
  })

  it('respects the holes of a Polygon and any part of a MultiPolygon', () => {
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
  it('bboxContains accepts boxes crossing the antimeridian', () => {
    expect(bboxContains([-69.9, -24], [-71, -25, -68, -20])).toBe(true)
    expect(bboxContains([-67.9, -24], [-71, -25, -68, -20])).toBe(false)
    expect(bboxContains([179.5, 10], [170, 0, -170, 20])).toBe(true)
    expect(bboxContains([-175, 10], [170, 0, -170, 20])).toBe(true)
    expect(bboxContains([0, 10], [170, 0, -170, 20])).toBe(false)
    expect(bboxCenter([170, 0, -170, 20])).toEqual([180, 10])
  })

  it('a region contains a sector only if all its vertices fall inside', () => {
    const sector: CandidateGeometry = { type: 'Polygon', coordinates: [yungay] }
    expect(geometryInsideBbox(sector, [-71, -25, -69, -23])).toBe(true)
    // Cuts the sector in half: "contains" is not asserted.
    expect(geometryInsideBbox(sector, [-71, -25, -69.95, -23])).toBe(false)
    expect(geometryInsideBbox({ type: 'Polygon', coordinates: [] }, [-71, -25, -69, -23])).toBe(false)
  })
})

describe('zona aproximada', () => {
  it('destinationPoint travels the requested distance on the sphere', () => {
    const north = destinationPoint([-70, -24], (Math.PI / 180) * EARTH_RADIUS_KM, 0)
    expect(north[0]).toBeCloseTo(-70, 6)
    expect(north[1]).toBeCloseTo(-23, 6)
    expect(angularDistanceDeg([-70, -24], north)).toBeCloseTo(1, 6)
  })

  it('the ◆ circle is closed and at radio_km from the cited point', () => {
    const analog: Pick<ReferenceAnalog, 'location'> = { location: { kind: 'approximate_point', lon: -110.79, lat: 38.41, radius_km: 25 } }
    const ring = approximateZoneRing(analog, 24)
    expect(ring).toHaveLength(25)
    expect(ring[0]).toEqual(ring.at(-1))
    for (const point of ring) expect((angularDistanceDeg([-110.79, 38.41], point) * Math.PI * EARTH_RADIUS_KM) / 180).toBeCloseTo(25, 3)
    expect(analogCenter(analog)).toEqual([-110.79, 38.41])
  })

  it('a region is drawn as its box and anchored at its center', () => {
    const region: Pick<ReferenceAnalog, 'location'> = { location: { kind: 'region', bbox: [-71, -27, -68, -19] } }
    expect(approximateZoneRing(region)).toEqual([[-71, -27], [-68, -27], [-68, -19], [-71, -19], [-71, -27]])
    expect(analogCenter(region)).toEqual([-69.5, -23])
  })
})
