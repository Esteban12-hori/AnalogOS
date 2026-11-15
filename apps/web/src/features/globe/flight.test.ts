import { describe, expect, it } from 'vitest'
import type { Vec3 } from '../../domain/globe'
import {
  angleBetweenDeg,
  arcLift,
  ARC_THRESHOLD_DEG,
  easeInOutCubic,
  flightAltitude,
  flightDurationMs,
  FLIGHT_MAX_MS,
  FLIGHT_MIN_MS,
  planFlight,
  sampleFlight,
  slerpDirection,
} from './flight'

const unit = (v: Vec3) => Math.hypot(...v)

describe('flight duration formula', () => {
  it('is clamp(650 + 7·Δθ° + 250·|log2(h1/h0)|, 650, 1800)', () => {
    expect(flightDurationMs(0, 3, 3)).toBe(650)
    expect(flightDurationMs(50, 3, 3)).toBe(650 + 7 * 50)
    expect(flightDurationMs(10, 4, 2)).toBe(650 + 70 + 250)
    expect(flightDurationMs(10, 2, 4)).toBe(650 + 70 + 250)
    expect(flightDurationMs(20, 1, 8)).toBe(650 + 140 + 750)
  })

  it('is bounded to [650, 1800] ms', () => {
    expect(flightDurationMs(180, 3, 3)).toBe(FLIGHT_MAX_MS)
    expect(flightDurationMs(90, 1, 64)).toBe(FLIGHT_MAX_MS)
    expect(flightDurationMs(0, 0, 0)).toBe(FLIGHT_MIN_MS)
    expect(flightDurationMs(-30, 3, 3)).toBe(650 + 210)
  })
})

describe('easeInOutCubic', () => {
  it('fixes ends and midpoint, is symmetric and monotonic', () => {
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(0.5)).toBe(0.5)
    expect(easeInOutCubic(1)).toBe(1)
    let previous = 0
    for (let step = 1; step <= 20; step += 1) {
      const t = step / 20
      expect(easeInOutCubic(t) + easeInOutCubic(1 - t)).toBeCloseTo(1, 12)
      expect(easeInOutCubic(t)).toBeGreaterThanOrEqual(previous)
      previous = easeInOutCubic(t)
    }
    expect(easeInOutCubic(-1)).toBe(0)
    expect(easeInOutCubic(2)).toBe(1)
  })
})

describe('altitude arc', () => {
  it('only rises if Δθ > 25° and saturates', () => {
    expect(arcLift(0)).toBe(0)
    expect(arcLift(ARC_THRESHOLD_DEG)).toBe(0)
    expect(arcLift(26)).toBeGreaterThan(0)
    expect(arcLift(90)).toBeGreaterThan(arcLift(45))
    expect(arcLift(180)).toBe(arcLift(500))
  })

  it('respects the ends and peaks at mid-flight', () => {
    expect(flightAltitude(0, 3, 1.5, 90)).toBeCloseTo(3, 12)
    expect(flightAltitude(1, 3, 1.5, 90)).toBeCloseTo(1.5, 12)
    const geometricMid = Math.sqrt(3 * 1.5)
    expect(flightAltitude(0.5, 3, 1.5, 20)).toBeCloseTo(geometricMid, 12)
    expect(flightAltitude(0.5, 3, 1.5, 90)).toBeCloseTo(geometricMid * (1 + arcLift(90)), 12)
    expect(flightAltitude(0.5, 3, 3, 90)).toBeGreaterThan(flightAltitude(0.25, 3, 3, 90))
  })
})

describe('direction slerp', () => {
  it('keeps the norm, respects the ends and splits the angle', () => {
    const a: Vec3 = [1, 0, 0]
    const b: Vec3 = [0, 0, -1]
    const mid = slerpDirection(a, b, 0.5)
    expect(unit(mid)).toBeCloseTo(1, 12)
    expect(angleBetweenDeg(a, mid)).toBeCloseTo(45, 9)
    expect(slerpDirection(a, b, 0)).toEqual([1, 0, 0])
    const end = slerpDirection(a, b, 1)
    expect(angleBetweenDeg(end, b)).toBeCloseTo(0, 6)
  })

  it('resolves antipodal directions without NaN', () => {
    const a: Vec3 = [0, 0, 1]
    const b: Vec3 = [0, 0, -1]
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const v = slerpDirection(a, b, t)
      expect(v.every(Number.isFinite)).toBe(true)
      expect(unit(v)).toBeCloseTo(1, 9)
    }
    expect(angleBetweenDeg(slerpDirection(a, b, 1), b)).toBeCloseTo(0, 6)
    expect(angleBetweenDeg(slerpDirection(a, b, 0.5), a)).toBeCloseTo(90, 6)
  })
})

describe('flight plan and sampling', () => {
  const from = { direction: [1, 0, 0] as Vec3, altitude: 8 }
  const to = { direction: [0, 0, 1] as Vec3, altitude: 4 }

  it('uses the formula with the real angle between poses', () => {
    const plan = planFlight(from, to)
    expect(plan.deltaDeg).toBeCloseTo(90, 9)
    expect(plan.durationMs).toBe(flightDurationMs(90, 8, 4))
  })

  it('the last frame lands exactly on the destination and marks done', () => {
    const plan = planFlight(from, to)
    const mid = sampleFlight(plan, plan.durationMs / 2)
    expect(mid.done).toBe(false)
    expect(mid.altitude).toBeGreaterThan(Math.sqrt(8 * 4))
    const end = sampleFlight(plan, plan.durationMs)
    expect(end).toEqual({ direction: [0, 0, 1], altitude: 4, done: true })
  })

  it('with reduced motion the camera cuts: duration 0 and immediate destination', () => {
    const plan = planFlight(from, to, true)
    expect(plan.durationMs).toBe(0)
    expect(sampleFlight(plan, 0)).toEqual({ direction: [0, 0, 1], altitude: 4, done: true })
  })
})
