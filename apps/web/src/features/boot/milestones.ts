/**
 * Real boot milestones (validated snapshot, globe ready, sharp texture) and orbit requests
 * over the globe (waiting for the AI). The milestones are reported by the shell; the intro phase
 * (`ui.introPhase`) is decided by BootLayer based on them.
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

/** Tests only. */
export function resetBootMilestones(): void {
  milestones.reset()
  orbit.reset()
}

// ---- Orbit over the globe requested by OrbitLoader (placement 'globe') ----------------------

export interface OrbitRequest {
  id: number
  /** performance.now() upon activation: the stage orbit stays in phase with the composer. */
  startedAt: number
}

const orbit = createStore<{ requests: readonly OrbitRequest[] }>({ requests: [] })
let nextId = 1

/** Requests the orbit over the globe for as long as the wait lasts; returns the function that releases it. */
export function requestStageOrbit(startedAt: number = now()): () => void {
  const request: OrbitRequest = { id: nextId++, startedAt }
  orbit.setState((state) => ({ requests: [...state.requests, request] }))
  return () => orbit.setState((state) => ({ requests: state.requests.filter((item) => item.id !== request.id) }))
}

/** The oldest active wait (null if there is none). */
export function useStageOrbit(): OrbitRequest | null {
  return useStore(orbit, (state) => state.requests[0] ?? null)
}

export function now(): number {
  return typeof performance === 'undefined' ? 0 : performance.now()
}
