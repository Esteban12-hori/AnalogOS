/**
 * "Lines: yes/no" preference (stage HUD toggle). Per-visitor convenience:
 * it is remembered in localStorage if available, and the app works the same without it.
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
    // No storage (private mode, file://): the preference lasts for the session.
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
