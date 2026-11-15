/**
 * prefers-reduced-motion in JS, with a listener (§2.2 rule 7): the camera switches to a cut and
 * loops, halos and progressive strokes are turned off. In CSS the tokens already shorten on their own.
 */
import { useSyncExternalStore } from 'react'

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

type MatchMedia = (query: string) => Pick<MediaQueryList, 'matches' | 'addEventListener' | 'removeEventListener'>

function defaultMatchMedia(): MatchMedia | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : null
}

/** One-off read (outside React: camera, imperative animations). */
export function prefersReducedMotion(matchMedia: MatchMedia | null = defaultMatchMedia()): boolean {
  return matchMedia?.(REDUCED_MOTION_QUERY).matches === true
}

/** Subscribes to changes in the preference; returns the function to unsubscribe. */
export function subscribeReducedMotion(listener: () => void, matchMedia: MatchMedia | null = defaultMatchMedia()): () => void {
  const query = matchMedia?.(REDUCED_MOTION_QUERY)
  if (!query) return () => undefined
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

/** true if the user asked to reduce motion; updates live. In SSR, false. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, () => prefersReducedMotion(), () => false)
}
