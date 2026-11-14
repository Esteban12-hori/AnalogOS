/**
 * prefers-reduced-motion en JS, con listener (§2.2 regla 7): la cámara pasa a corte y se
 * apagan bucles, halos y trazos progresivos. En CSS los tokens ya se acortan solos.
 */
import { useSyncExternalStore } from 'react'

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

type MatchMedia = (query: string) => Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>

function defaultMatchMedia(): MatchMedia | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : null
}

/** Lectura puntual (fuera de React: cámara, animaciones imperativas). */
export function prefersReducedMotion(matchMedia: MatchMedia | null = defaultMatchMedia()): boolean {
  return matchMedia?.(REDUCED_MOTION_QUERY).matches === true
}

/** Se suscribe a los cambios de la preferencia; devuelve la función para desuscribirse. */
export function subscribeReducedMotion(listener: () => void, matchMedia: MatchMedia | null = defaultMatchMedia()): () => void {
  const query = matchMedia?.(REDUCED_MOTION_QUERY)
  if (!query) return () => undefined
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

/** true si el usuario pidió reducir el movimiento; se actualiza en vivo. En SSR, false. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, () => prefersReducedMotion(), () => false)
}
