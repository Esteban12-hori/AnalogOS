/**
 * Store externo mínimo para `useSyncExternalStore` (sin dependencias).
 * Vive fuera del árbol de React Three Fiber: cambiar la UI no re-renderiza el globo.
 */
import { useSyncExternalStore } from 'react'

export type Listener = () => void
export type Patch<S> = Partial<S> | ((state: S) => Partial<S>)

export interface Store<S extends object> {
  getState(): S
  /** Mezcla superficial; no notifica si ningún campo cambió (Object.is por campo). */
  setState(patch: Patch<S>): void
  subscribe(listener: Listener): () => void
  /** Solo para tests: vuelve al estado inicial y notifica. */
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
 * Lee una porción del store. El selector debe devolver un valor estable (primitivo o una
 * referencia ya existente en el estado); no construyas objetos nuevos dentro del selector.
 */
export function useStore<S extends object, T>(store: Store<S>, selector: (state: S) => T): T {
  const read = () => selector(store.getState())
  return useSyncExternalStore(store.subscribe, read, read)
}
