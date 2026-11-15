/** Channel for focusing the composer from outside (the "/" key, the "Refine" button). */
export const COMPOSER_FOCUS_EVENT = 'analogos:focus-composer'

let pending = false

/**
 * Requests focus for the mission field. If the form has not yet mounted (mode change or deferred chunk
 * on its way), it takes focus when it mounts.
 */
export function focusComposer(): void {
  pending = true
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(COMPOSER_FOCUS_EVENT))
}

/** The form consumes the pending request (true = it should be focused). */
export function takeFocusRequest(): boolean {
  const request = pending
  pending = false
  return request
}
