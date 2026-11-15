/**
 * Decides the target detent when the sheet is released (ADR-014). Pure function.
 *
 * - Cancellation: pointercancel, non-finite input, or movement smaller than the drag threshold
 *   (DETENT_SLOP_PX without velocity) → returns to the origin detent.
 * - Velocity threshold: with |vy| ≥ DETENT_FLICK_VELOCITY it moves to the next detent in the
 *   direction of the gesture, counted from the current position (a fast gesture never moves backward).
 * - Hysteresis: without velocity, the nearest detent wins, but the origin detent is considered
 *   DETENT_HYSTERESIS_PX closer. Near the midpoint the sheet stays where it was, in
 *   both directions, and does not jump when an undecided drag is released.
 */

/** px/ms; ~450 px/s. */
export const DETENT_FLICK_VELOCITY = 0.45
/** Advantage of the origin detent when resolving by distance. */
export const DETENT_HYSTERESIS_PX = 48
/** Below this, releasing without velocity is a tap and does not move the sheet. */
export const DETENT_SLOP_PX = 8

export interface ResolveDetentOptions {
  /** Index of the detent where the drag started. */
  from: number
  /** pointercancel or aborted gesture. */
  cancelled?: boolean
}

/**
 * @param y visible sheet height on release (px from the bottom edge)
 * @param vy velocity in px/ms; positive = the sheet grows (finger moving up)
 * @param detents visible heights of each detent, in ascending order
 * @returns index of the target detent
 */
export function resolveDetent(y: number, vy: number, detents: readonly number[], { from, cancelled = false }: ResolveDetentOptions): number {
  const last = detents.length - 1
  if (last < 0) return 0
  const origin = Math.min(Math.max(Math.round(from), 0), last)
  const start = detents[origin] ?? 0
  if (cancelled || !Number.isFinite(y) || !Number.isFinite(vy)) return origin
  if (Math.abs(vy) < DETENT_FLICK_VELOCITY && Math.abs(y - start) < DETENT_SLOP_PX) return origin

  if (vy >= DETENT_FLICK_VELOCITY) {
    const above = detents.findIndex((height) => height > y + DETENT_SLOP_PX)
    return above === -1 ? last : above
  }
  if (vy <= -DETENT_FLICK_VELOCITY) {
    for (let index = last; index >= 0; index -= 1) {
      if ((detents[index] ?? 0) < y - DETENT_SLOP_PX) return index
    }
    return 0
  }

  let best = origin
  let bestDistance = Number.POSITIVE_INFINITY
  detents.forEach((height, index) => {
    const distance = Math.abs(y - height) - (index === origin ? DETENT_HYSTERESIS_PX : 0)
    if (distance < bestDistance) {
      best = index
      bestDistance = distance
    }
  })
  return best
}
