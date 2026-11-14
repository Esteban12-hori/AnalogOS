/**
 * Hitos reales del arranque (snapshot validado, globo listo, textura nítida) y pedidos de órbita
 * sobre el globo (espera de la IA). Los hitos los reporta el armazón; la fase de intro
 * (`ui.introPhase`) la decide BootLayer a partir de ellos.
 */
import { createStore, useStore } from '../../state/store'
import { INITIAL_MILESTONES, type BootMilestone, type Milestones, type MilestoneStatus } from './bootModel'

const milestones = createStore<{ value: Milestones }>({ value: INITIAL_MILESTONES })

export function reportBootMilestone(milestone: BootMilestone, status: Exclude<MilestoneStatus, 'pending'>): void {
  const current = milestones.getState().value
  if (current[milestone] === status) return
  milestones.setState({ value: Object.freeze({ ...current, [milestone]: status }) })
}

export function getBootMilestones(): Milestones {
  return milestones.getState().value
}

export function useBootMilestones(): Milestones {
  return useStore(milestones, (state) => state.value)
}

/** Solo tests. */
export function resetBootMilestones(): void {
  milestones.reset()
  orbit.reset()
}

// ---- Órbita sobre el globo pedida por OrbitLoader (placement 'globe') ----------------------

export interface OrbitRequest {
  id: number
  /** performance.now() al activarse: la órbita del escenario va en fase con el composer. */
  startedAt: number
}

const orbit = createStore<{ requests: readonly OrbitRequest[] }>({ requests: [] })
let nextId = 1

/** Pide la órbita sobre el globo mientras dure la espera; devuelve la función que la libera. */
export function requestStageOrbit(startedAt: number = now()): () => void {
  const request: OrbitRequest = { id: nextId++, startedAt }
  orbit.setState((state) => ({ requests: [...state.requests, request] }))
  return () => orbit.setState((state) => ({ requests: state.requests.filter((item) => item.id !== request.id) }))
}

/** La espera activa más antigua (null si no hay ninguna). */
export function useStageOrbit(): OrbitRequest | null {
  return useStore(orbit, (state) => state.requests[0] ?? null)
}

export function now(): number {
  return typeof performance === 'undefined' ? 0 : performance.now()
}
