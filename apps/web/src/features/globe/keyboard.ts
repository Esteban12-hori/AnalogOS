/**
 * Teclado del escenario (docs/UX_REDESIGN.md §3.1): flechas giran 10° (Mayús 30°), + / − acercan
 * o alejan medio nivel de zoom e Inicio vuelve a la vista global. Función pura: el globo la
 * traduce a un vuelo; el mapa 2D conserva su propio paneo por píxeles y solo toma Inicio.
 */
import type { Position } from '../../domain/contracts'

export const KEY_STEP_DEG = 10
export const KEY_STEP_SHIFT_DEG = 30
/** Medio nivel de zoom ≈ ×1,4: el mismo margen que separa la vista global del paso al 2D. */
export const KEY_ZOOM_STEP = 0.5
/** Latitud máxima del centro de la vista (evita voltear la cámara sobre los polos). */
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

/** Nuevo centro tras girar: longitud envuelta en [-180, 180) y latitud acotada a ±80°. */
export function rotateCenter([lon, lat]: Position, dLon: number, dLat: number): Position {
  let nextLon = ((((lon + dLon + 180) % 360) + 360) % 360) - 180
  if (Object.is(nextLon, -0)) nextLon = 0
  const nextLat = Math.max(-MAX_CENTER_LATITUDE, Math.min(MAX_CENTER_LATITUDE, lat + dLat))
  return [nextLon, nextLat]
}
