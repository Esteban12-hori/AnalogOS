/**
 * Globe camera flight (docs/UX_REDESIGN.md §2.2 rule 4). Pure functions, no three.js:
 *
 *   duration = clamp(650 + 7·Δθ° + 250·|log2(h1/h0)|, 650, 1800) ms
 *   curve    = easeInOutCubic ≡ cubic-bezier(.65, 0, .35, 1)
 *   altitude arc only if Δθ > 25°
 *
 * The direction is interpolated by slerp and the altitude on a logarithmic scale (zoom changes are
 * perceived as uniform). With reduced motion the camera cuts: duration 0.
 */
import type { Vec3 } from '../../domain/globe'

export const FLIGHT_MIN_MS = 650
export const FLIGHT_MAX_MS = 1800
/** Above this angle the flight rises in an arc so that the movement is readable. */
export const ARC_THRESHOLD_DEG = 25
/** Maximum rise of the arc over the interpolated altitude (fraction). */
export const ARC_MAX_LIFT = 0.8

const DEG = Math.PI / 180

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Flight duration in ms according to the angle traveled (degrees) and the initial and final altitudes. */
export function flightDurationMs(deltaDeg: number, fromAltitude: number, toAltitude: number): number {
  const zoomTerm = fromAltitude > 0 && toAltitude > 0 ? Math.abs(Math.log2(toAltitude / fromAltitude)) : 0
  return clamp(FLIGHT_MIN_MS + 7 * Math.abs(deltaDeg) + 250 * zoomTerm, FLIGHT_MIN_MS, FLIGHT_MAX_MS)
}

/** easeInOutCubic: 0→0, 0.5→0.5, 1→1, symmetric. */
export function easeInOutCubic(t: number): number {
  const x = clamp(t, 0, 1)
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

/** Relative rise of the arc: 0 up to 25°, grows with the angle and saturates at ARC_MAX_LIFT. */
export function arcLift(deltaDeg: number): number {
  if (deltaDeg <= ARC_THRESHOLD_DEG) return 0
  return Math.min(ARC_MAX_LIFT, (deltaDeg - ARC_THRESHOLD_DEG) / 100)
}

/**
 * Altitude at progress `eased` (0–1): geometric interpolation h0→h1 plus the arc
 * (1 + lift·sin(π·e)), which equals 0 at both ends and is maximal at mid-flight.
 */
export function flightAltitude(eased: number, fromAltitude: number, toAltitude: number, deltaDeg: number): number {
  const e = clamp(eased, 0, 1)
  const base = fromAltitude > 0 && toAltitude > 0
    ? fromAltitude ** (1 - e) * toAltitude ** e
    : fromAltitude + (toAltitude - fromAltitude) * e
  return base * (1 + arcLift(deltaDeg) * Math.sin(Math.PI * e))
}

function length(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2])
}

export function normalize(v: Vec3): Vec3 {
  const l = length(v) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

/** Angle between two directions, in degrees. */
export function angleBetweenDeg(a: Vec3, b: Vec3): number {
  const na = normalize(a)
  const nb = normalize(b)
  const dot = clamp(na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2], -1, 1)
  return Math.acos(dot) / DEG
}

/** Slerp between unit directions; handles the parallel and antipodal cases. */
export function slerpDirection(from: Vec3, to: Vec3, t: number): Vec3 {
  const a = normalize(from)
  const b = normalize(to)
  const dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1)
  const omega = Math.acos(dot)
  if (omega < 1e-6) return b
  if (Math.PI - omega < 1e-6) {
    // Antipodes: any great circle works; a stable one perpendicular to `a` is chosen
    // and it is traveled in two quarter turns.
    const helper: Vec3 = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]
    const perpendicular = normalize([
      a[1] * helper[2] - a[2] * helper[1],
      a[2] * helper[0] - a[0] * helper[2],
      a[0] * helper[1] - a[1] * helper[0],
    ])
    return t <= 0.5 ? slerpDirection(a, perpendicular, t * 2) : slerpDirection(perpendicular, b, (t - 0.5) * 2)
  }
  const sin = Math.sin(omega)
  const wa = Math.sin((1 - t) * omega) / sin
  const wb = Math.sin(t * omega) / sin
  return normalize([a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb])
}

export interface CameraPose {
  /** Unit direction from the center of the globe toward the camera. */
  direction: Vec3
  /** Altitude above the surface (scene units). */
  altitude: number
}

export interface FlightPlan {
  from: CameraPose
  to: CameraPose
  deltaDeg: number
  /** 0 = cut (reduced motion or zero-length flight). */
  durationMs: number
}

/** Flight plan between two poses. `reducedMotion` turns it into a cut. */
export function planFlight(from: CameraPose, to: CameraPose, reducedMotion = false): FlightPlan {
  const deltaDeg = angleBetweenDeg(from.direction, to.direction)
  return {
    from: { direction: normalize(from.direction), altitude: from.altitude },
    to: { direction: normalize(to.direction), altitude: to.altitude },
    deltaDeg,
    durationMs: reducedMotion ? 0 : flightDurationMs(deltaDeg, from.altitude, to.altitude),
  }
}

/** Flight pose at `elapsedMs` and whether it has already finished (the last frame lands exactly on the destination). */
export function sampleFlight(plan: FlightPlan, elapsedMs: number): CameraPose & { done: boolean } {
  if (plan.durationMs <= 0 || elapsedMs >= plan.durationMs) return { ...plan.to, done: true }
  const eased = easeInOutCubic(Math.max(0, elapsedMs) / plan.durationMs)
  return {
    direction: slerpDirection(plan.from.direction, plan.to.direction, eased),
    altitude: flightAltitude(eased, plan.from.altitude, plan.to.altitude, plan.deltaDeg),
    done: false,
  }
}
