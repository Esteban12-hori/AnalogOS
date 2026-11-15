import { describe, expect, it } from 'vitest'
import { DETENT_FLICK_VELOCITY, DETENT_HYSTERESIS_PX, DETENT_SLOP_PX, resolveDetent } from '../shell/sheet/resolveDetent'

// S0 tray · S1 place (54dvh of 844) · S2 details
const DETENTS = [248, 456, 770] as const
const S0 = 0
const S1 = 1
const S2 = 2

describe('resolveDetent · umbrales', () => {
  it('a fast upward gesture raises one detent from the current position', () => {
    expect(resolveDetent(270, DETENT_FLICK_VELOCITY, DETENTS, { from: S0 })).toBe(S1)
    expect(resolveDetent(470, 1.2, DETENTS, { from: S1 })).toBe(S2)
    expect(resolveDetent(780, 2, DETENTS, { from: S2 })).toBe(S2)
  })

  it('a fast downward gesture lowers one detent and never moves against the gesture', () => {
    expect(resolveDetent(740, -DETENT_FLICK_VELOCITY, DETENTS, { from: S2 })).toBe(S1)
    expect(resolveDetent(430, -0.9, DETENTS, { from: S1 })).toBe(S0)
    // Dragged from S2 almost to S0 and released with upward momentum: it goes to S1, it does not return to S2.
    expect(resolveDetent(300, 1, DETENTS, { from: S2 })).toBe(S1)
    expect(resolveDetent(200, -3, DETENTS, { from: S0 })).toBe(S0)
  })

  it('without velocity the nearest detent wins', () => {
    expect(resolveDetent(450, 0, DETENTS, { from: S0 })).toBe(S1)
    expect(resolveDetent(700, 0.1, DETENTS, { from: S1 })).toBe(S2)
    expect(resolveDetent(260, -0.1, DETENTS, { from: S2 })).toBe(S0)
  })

  it('a drag beyond the maximum or minimum stays at the end', () => {
    expect(resolveDetent(900, 0, DETENTS, { from: S1 })).toBe(S2)
    expect(resolveDetent(10, 0, DETENTS, { from: S1 })).toBe(S0)
  })
})

describe('resolveDetent · hysteresis', () => {
  it('near the midpoint the sheet stays on its origin detent, in both directions', () => {
    const mid = (DETENTS[S0] + DETENTS[S1]) / 2
    const band = DETENT_HYSTERESIS_PX / 2 - 1
    expect(resolveDetent(mid + band, 0, DETENTS, { from: S0 })).toBe(S0)
    expect(resolveDetent(mid - band, 0, DETENTS, { from: S1 })).toBe(S1)
    // Outside the band, it changes.
    expect(resolveDetent(mid + DETENT_HYSTERESIS_PX, 0, DETENTS, { from: S0 })).toBe(S1)
    expect(resolveDetent(mid - DETENT_HYSTERESIS_PX, 0, DETENTS, { from: S1 })).toBe(S0)
  })
})

describe('resolveDetent · cancellation', () => {
  it('pointercancel returns to the origin even if the gesture was fast', () => {
    expect(resolveDetent(700, 3, DETENTS, { from: S0, cancelled: true })).toBe(S0)
  })

  it('a movement below the drag threshold is a tap and does not move the sheet', () => {
    expect(resolveDetent(DETENTS[S1] + DETENT_SLOP_PX - 1, 0, DETENTS, { from: S1 })).toBe(S1)
  })

  it('non-finite or empty inputs do not break: returns to the origin', () => {
    expect(resolveDetent(Number.NaN, 0, DETENTS, { from: S2 })).toBe(S2)
    expect(resolveDetent(400, Number.POSITIVE_INFINITY, DETENTS, { from: S1 })).toBe(S1)
    expect(resolveDetent(400, 0, [], { from: 3 })).toBe(0)
    expect(resolveDetent(400, 0, DETENTS, { from: 9, cancelled: true })).toBe(S2)
  })
})
