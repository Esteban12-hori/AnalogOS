/**
 * Lazy loading of the mission controller (mission chunk: planner, evaluation, runtime Ajv,
 * AI client and team export; docs/INTEGRATION_PLAN.md §3.8). The main chunk
 * carries only this link. The bundle is the validated snapshot exactly as the app loaded it.
 */
import type { DemoSnapshot } from '../../data/loadDemoSnapshot'
import type { GeologyContextState } from '../../domain/geologyContext'
import type { EvidenceBundle } from '../../mission/types'
import type { MissionController } from './missionController'
import { composerStore } from './composerStore'

let bundle: EvidenceBundle | null = null
let pending: Promise<MissionController> | null = null
let geology: GeologyContextState = { status: 'loading' }
const geologyListeners = new Set<(state: GeologyContextState) => void>()

/** The shell registers the validated snapshot as soon as it arrives (without copying or transforming it). */
export function registerMissionSnapshot(snapshot: DemoSnapshot | null): void {
  if (snapshot && !bundle) bundle = { candidates: snapshot.candidates, manifest: snapshot.manifest, profile: snapshot.profile }
}

/**
 * The shell registers the official geological context (M9/M10) when it finishes loading (or its absence).
 * Only the type travels here: the validator lives in a deferred chunk. The controller receives it upon creation
 * and on every subsequent change.
 */
export function registerMissionGeology(state: GeologyContextState): void {
  if (state === geology) return
  geology = state
  for (const listener of [...geologyListeners]) listener(state)
}

export function registeredMissionGeology(): GeologyContextState {
  return geology
}

/** Controller subscription: receives the current state immediately and then every change. */
export function subscribeMissionGeology(listener: (state: GeologyContextState) => void): () => void {
  geologyListeners.add(listener)
  listener(geology)
  return () => {
    geologyListeners.delete(listener)
  }
}

export function loadController(): Promise<MissionController> {
  const current = bundle
  if (!current) return Promise.reject(new Error('The snapshot is not validated yet.'))
  pending ??= import('./missionController')
    .then((module) => module.missionController(current))
    .catch((error: unknown) => {
      pending = null
      throw error
    })
  return pending
}

/** Runs `fn` with the controller; if the chunk fails to load (no network and no cache), it notifies without breaking. */
export function withController(fn: (controller: MissionController) => unknown): void {
  loadController()
    .then(fn)
    .catch(() => {
      composerStore.setState({ notice: 'The planner could not be loaded. Reload the page to try again.' })
    })
}
