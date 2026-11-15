/**
 * Stage keyboard controls (docs/UX_REDESIGN.md §3.1): arrow keys rotate 10° (Shift 30°), + / − zoom in
 * or out half a zoom level, and Home returns to the global view. Pure function: the globe
 * translates it into a flight; the 2D map keeps its own per-pixel panning and only takes Home.
 */
import type { Position } from '../../domain/contracts'

export const KEY_STEP_DEG = 10
export const KEY_STEP_SHIFT_DEG = 30
/** Half a zoom level ≈ ×1,4: the same margin that separates the global view from the switch to 2D. */
export const KEY_ZOOM_STEP = 0.5
/** Maximum latitude of the view center (prevents flipping the camera over the poles). */
export const MAX_CENTER_LATITUDE = 80

export type CameraKeyAction =
  | { kind: 'rotate'; dLon: number; dLat: number }
  | { kind: 'zoom'; delta: number }
  | { kind: 'home' }

export function cameraKeyAction(key: string, shiftKey = false): CameraKeyAction | null {
  const step = shiftKey ? KEY_STEP_SHIFT_DEG : KEY_STEP_DEG
  switch (key) {
    case 'ArrowLeft':
      return { kind: 'rotate', dLon: -step, dLat: 0 }
    case 'ArrowRight':
      return { kind: 'rotate', dLon: step, dLat: 0 }
    case 'ArrowUp':
      return { kind: 'rotate', dLon: 0, dLat: step }
    case 'ArrowDown':
      return { kind: 'rotate', dLon: 0, dLat: -step }
    case '+':
    case '=':
    case 'Add':
      return { kind: 'zoom', delta: KEY_ZOOM_STEP }
    case '-':
    case '_':
    case 'Subtract':
      return { kind: 'zoom', delta: -KEY_ZOOM_STEP }
    case 'Home':
      return { kind: 'home' }
    default:
      return null
  }
}

/** New center after rotating: longitude wrapped to [-180, 180) and latitude clamped to ±80°. */
export function rotateCenter([lon, lat]: Position, dLon: number, dLat: number): Position {
  let nextLon = ((((lon + dLon + 180) % 360) + 360) % 360) - 180
  if (Object.is(nextLon, -0)) nextLon = 0
  const nextLat = Math.max(-MAX_CENTER_LATITUDE, Math.min(MAX_CENTER_LATITUDE, lat + dLat))
  return [nextLon, nextLat]
}
