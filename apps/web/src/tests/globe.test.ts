import { describe, expect, it } from 'vitest'
import type { CandidateGeometry, Position } from '../domain/contracts'
import { densifyRing, facingFactor, geometryCenter, latLngToVec3, outerRings } from '../domain/globe'

const square: Position[] = [[-70, -24], [-69.8, -24], [-69.8, -23.8], [-70, -23.8], [-70, -24]]

describe('latLngToVec3', () => {
  it('places poles and equator on the requested radius', () => {
    const north = latLngToVec3(90, 0, 2)
    expect(north[1]).toBeCloseTo(2)
    const equator = latLngToVec3(0, -70, 2)
    expect(Math.hypot(...equator)).toBeCloseTo(2)
    expect(equator[1]).toBeCloseTo(0)
  })

  it('puts meridian 0 at +x and 90° E at -z (SphereGeometry UV mapping)', () => {
    const [x0, , z0] = latLngToVec3(0, 0, 1)
    expect(x0).toBeCloseTo(1)
    expect(z0).toBeCloseTo(0)
    const [x90, , z90] = latLngToVec3(0, 90, 1)
    expect(x90).toBeCloseTo(0)
    expect(z90).toBeCloseTo(-1)
  })
})

describe('geometryCenter and outerRings', () => {
  it('averages vertices without duplicating the ring closure', () => {
    const geometry: CandidateGeometry = { type: 'Polygon', coordinates: [square] }
    const [lon, lat] = geometryCenter(geometry) ?? [0, 0]
    expect(lon).toBeCloseTo(-69.9)
    expect(lat).toBeCloseTo(-23.9)
  })

  it('uses only outer rings in MultiPolygon and returns null if there are no vertices', () => {
    const multi: CandidateGeometry = { type: 'MultiPolygon', coordinates: [[square, square], [square]] }
    expect(outerRings(multi)).toHaveLength(2)
    expect(geometryCenter({ type: 'Polygon', coordinates: [] })).toBeNull()
  })
})

describe('densifyRing', () => {
  it('adds intermediate points and keeps the ends', () => {
    const dense = densifyRing(square, 0.05)
    expect(dense.length).toBe(17)
    expect(dense[0]).toEqual(square[0])
    expect(dense.at(-1)).toEqual(square.at(-1))
  })
})

describe('facingFactor', () => {
  it('is positive for the visible hemisphere and negative for the hidden one', () => {
    const chile = latLngToVec3(-24, -69.5, 2)
    expect(facingFactor(chile, latLngToVec3(-24, -69.5, 6))).toBeCloseTo(1)
    expect(facingFactor(chile, latLngToVec3(24, 110.5, 6))).toBeLessThan(0)
    expect(facingFactor([0, 0, 0], [1, 0, 0])).toBe(0)
  })
})
