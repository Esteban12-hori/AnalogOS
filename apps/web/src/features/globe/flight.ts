/**
 * Vuelo de cámara del globo (docs/UX_REDESIGN.md §2.2 regla 4). Funciones puras, sin three.js:
 *
 *   duración = clamp(650 + 7·Δθ° + 250·|log2(h1/h0)|, 650, 1800) ms
 *   curva    = easeInOutCubic ≡ cubic-bezier(.65, 0, .35, 1)
 *   arco de altitud solo si Δθ > 25°
 *
 * La dirección se interpola por slerp y la altitud en escala logarítmica (los cambios de zoom se
 * perciben uniformes). Con reduced motion la cámara corta: duración 0.
 */
import type { Vec3 } from '../../domain/globe'

export const FLIGHT_MIN_MS = 650
export const FLIGHT_MAX_MS = 1800
/** Por encima de este ángulo el vuelo sube en arco para que se lea el desplazamiento. */
export const ARC_THRESHOLD_DEG = 25
/** Subida máxima del arco sobre la altitud interpolada (fracción). */
export const ARC_MAX_LIFT = 0.8

const DEG = Math.PI / 180

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Duración del vuelo en ms según el ángulo recorrido (grados) y las altitudes inicial y final. */
export function flightDurationMs(deltaDeg: number, fromAltitude: number, toAltitude: number): number {
  const zoomTerm = fromAltitude > 0 && toAltitude > 0 ? Math.abs(Math.log2(toAltitude / fromAltitude)) : 0
  return clamp(FLIGHT_MIN_MS + 7 * Math.abs(deltaDeg) + 250 * zoomTerm, FLIGHT_MIN_MS, FLIGHT_MAX_MS)
}

/** easeInOutCubic: 0→0, 0,5→0,5, 1→1, simétrica. */
export function easeInOutCubic(t: number): number {
  const x = clamp(t, 0, 1)
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2
}

/** Subida relativa del arco: 0 hasta 25°, crece con el ángulo y se satura en ARC_MAX_LIFT. */
export function arcLift(deltaDeg: number): number {
  if (deltaDeg <= ARC_THRESHOLD_DEG) return 0
  return Math.min(ARC_MAX_LIFT, (deltaDeg - ARC_THRESHOLD_DEG) / 100)
}

/**
 * Altitud en el progreso `eased` (0–1): interpolación geométrica h0→h1 más el arco
 * (1 + lift·sin(π·e)), que vale 0 en ambos extremos y es máximo a mitad del vuelo.
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

/** Ángulo entre dos direcciones, en grados. */
export function angleBetweenDeg(a: Vec3, b: Vec3): number {
  const na = normalize(a)
  const nb = normalize(b)
  const dot = clamp(na[0] * nb[0] + na[1] * nb[1] + na[2] * nb[2], -1, 1)
  return Math.acos(dot) / DEG
}

/** Slerp entre direcciones unitarias; resuelve los casos paralelo y antipodal. */
export function slerpDirection(from: Vec3, to: Vec3, t: number): Vec3 {
  const a = normalize(from)
  const b = normalize(to)
  const dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1)
  const omega = Math.acos(dot)
  if (omega < 1e-6) return b
  if (Math.PI - omega < 1e-6) {
    // Antípodas: cualquier gran círculo sirve; se elige uno estable perpendicular a `a`
    // y se recorre en dos cuartos de vuelta.
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
  /** Dirección unitaria desde el centro del globo hacia la cámara. */
  direction: Vec3
  /** Altitud sobre la superficie (unidades de escena). */
  altitude: number
}

export interface FlightPlan {
  from: CameraPose
  to: CameraPose
  deltaDeg: number
  /** 0 = corte (reduced motion o vuelo nulo). */
  durationMs: number
}

/** Plan de vuelo entre dos poses. `reducedMotion` lo convierte en corte. */
export function planFlight(from: CameraPose, to: CameraPose, reducedMotion = false): FlightPlan {
  const deltaDeg = angleBetweenDeg(from.direction, to.direction)
  return {
    from: { direction: normalize(from.direction), altitude: from.altitude },
    to: { direction: normalize(to.direction), altitude: to.altitude },
    deltaDeg,
    durationMs: reducedMotion ? 0 : flightDurationMs(deltaDeg, from.altitude, to.altitude),
  }
}

/** Pose del vuelo a los `elapsedMs` y si ya terminó (el último cuadro cae exacto en el destino). */
export function sampleFlight(plan: FlightPlan, elapsedMs: number): CameraPose & { done: boolean } {
  if (plan.durationMs <= 0 || elapsedMs >= plan.durationMs) return { ...plan.to, done: true }
  const eased = easeInOutCubic(Math.max(0, elapsedMs) / plan.durationMs)
  return {
    direction: slerpDirection(plan.from.direction, plan.to.direction, eased),
    altitude: flightAltitude(eased, plan.from.altitude, plan.to.altitude, plan.deltaDeg),
    done: false,
  }
}
