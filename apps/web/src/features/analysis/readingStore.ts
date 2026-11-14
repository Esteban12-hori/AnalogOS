/**
 * Estado de la Lectura (propio de features/analysis): una ranura para el perfil base (Explorar)
 * y otra para la misión vigente. Lo escribe solo el controlador; lo leen el panel, la píldora y
 * los fragmentos. Vive en el chunk principal y no trae código del motor ni de los validadores.
 */
import { useSyncExternalStore } from 'react'
import { useMission } from '../../state/mission'
import { useUi } from '../../state/ui'
import type { Reading, ReadingContext, ReadingSlot } from './types'

export interface ReadingStoreState {
  base: ReadingSlot
  mission: ReadingSlot
}

export const EMPTY_SLOT: ReadingSlot = Object.freeze({ status: 'idle', reading: null, error: null })
const INITIAL: ReadingStoreState = Object.freeze({ base: EMPTY_SLOT, mission: EMPTY_SLOT })

let state: ReadingStoreState = INITIAL
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of [...listeners]) listener()
}

export const readingStore = {
  getState: (): ReadingStoreState => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  setSlot(context: ReadingContext, slot: ReadingSlot): void {
    if (state[context] === slot) return
    state = { ...state, [context]: slot }
    emit()
  },
  patchSlot(context: ReadingContext, patch: Partial<ReadingSlot>): void {
    readingStore.setSlot(context, { ...state[context], ...patch })
  },
  /** Solo tests. */
  reset(): void {
    state = INITIAL
    emit()
  },
}

export function useReadingSlot(context: ReadingContext): ReadingSlot {
  const read = () => state[context]
  return useSyncExternalStore(readingStore.subscribe, read, read)
}

/** Contexto que la UI debe mostrar: la misión solo cuando hay resultados del motor en Misión. */
export function useReadingContext(): ReadingContext {
  const mode = useUi((ui) => ui.mode)
  const scored = useMission((mission) => mission.scoring !== null && mission.profile !== null)
  return mode === 'mision' && scored ? 'mission' : 'base'
}

/** Clave que debería tener la lectura vigente del contexto (otra clave = «Desactualizado»). */
export function useExpectedReadingKey(context: ReadingContext): string {
  const profileId = useMission((mission) => mission.profile?.id ?? null)
  const revision = useMission((mission) => mission.revision)
  return context === 'base' ? 'base' : missionReadingKey(profileId, revision)
}

export function missionReadingKey(profileId: string | null, revision: number): string {
  return `mission:${profileId ?? 'ninguno'}:${revision}`
}

/** La lectura activa (contexto actual), o null. */
export function useActiveReading(): Reading | null {
  return useReadingSlot(useReadingContext()).reading
}
