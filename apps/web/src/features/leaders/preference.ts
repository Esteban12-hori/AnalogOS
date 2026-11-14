/**
 * Preferencia «Líneas: sí/no» (interruptor del HUD del escenario). Comodidad por visitante:
 * se recuerda en localStorage si está disponible y la app funciona igual sin él.
 */
import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'analogos:leaders'

function readStored(): boolean {
  try {
    return typeof window === 'undefined' || window.localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

let enabled = readStored()
const listeners = new Set<() => void>()

export function getLeadersEnabled(): boolean {
  return enabled
}

export function setLeadersEnabled(next: boolean): void {
  if (next === enabled) return
  enabled = next
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
  } catch {
    // Sin almacenamiento (privado, file://): la preferencia dura la sesión.
  }
  for (const listener of [...listeners]) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useLeadersEnabled(): boolean {
  return useSyncExternalStore(subscribe, getLeadersEnabled, getLeadersEnabled)
}
