/**
 * Minimal external store for `useSyncExternalStore` (no dependencies).
 * It lives outside the React Three Fiber tree: changing the UI does not re-render the globe.
 */
import { useSyncExternalStore } from 'react'

export type Listener = () => void
export type Patch<S> = Partial<S> | ((state: S) => Partial<S>)

export interface Store<S extends object> {
  getState(): S
  /** Shallow merge; does not notify if no field changed (Object.is per field). */
  setState(patch: Patch<S>): void
  subscribe(listener: Listener): () => void
  /** For tests only: returns to the initial state and notifies. */
  reset(): void
}

export function createStore<S extends object>(initial: S): Store<S> {
  let state = initial
  const listeners = new Set<Listener>()
  return {
    getState: () => state,
    setState(patch) {
      const partial = typeof patch === 'function' ? patch(state) : patch
      let changed = false
      for (const key of Object.keys(partial) as Array<keyof S>) {
        if (!Object.is(partial[key], state[key])) {
          changed = true
          break
        }
      }
      if (!changed) return
      state = { ...state, ...partial }
      for (const listener of [...listeners]) listener()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    reset() {
      state = initial
      for (const listener of [...listeners]) listener()
    },
  }
}

/**
 * Reads a slice of the store. The selector must return a stable value (a primitive or a
 * reference that already exists in the state); do not construct new objects inside the selector.
 */
export function useStore<S extends object, T>(store: Store<S>, selector: (state: S) => T): T {
  const read = () => selector(store.getState())
  return useSyncExternalStore(store.subscribe, read, read)
}
