/**
 * Official geological context for the integrated interface (M9, team ADR-010). DEFERRED chunk: the
 * package validator (`shared/geology/context`) uses Ajv at runtime and must not enter the entry
 * chunk (docs/PERFORMANCE.md). It wraps the team's `loadGeologyContext` without changing it and uses
 * `selectGeologySite` to compute which sectors have THEIR OWN valid record (same exact geometry, never inherited).
 *
 * Never throws: on any problem it returns "not available", and the record, the ranking and the mission
 * keep working without geology.
 */
import type { CandidateSite } from '../domain/contracts'
import { selectGeologySite, type GeologyContextState } from '../domain/geologyContext'
import { loadGeologyContext } from './loadGeologyContext'

export interface AppGeology {
  /** Package state exactly as returned by `loadGeologyContext` (the same object used by the mission). */
  state: GeologyContextState
  /** Sectors with a valid geological record (`selectGeologySite(...).status === 'ready'`). */
  readySites: ReadonlySet<string>
}

export function appGeologyFrom(state: GeologyContextState, candidates: readonly CandidateSite[]): AppGeology {
  const readySites = new Set(candidates.filter((candidate) => selectGeologySite(state, candidate).status === 'ready').map((candidate) => candidate.site_id))
  return { state, readySites }
}

export async function loadAppGeology(candidates: CandidateSite[]): Promise<AppGeology> {
  const state = await loadGeologyContext(candidates)
  return appGeologyFrom(state, candidates)
}
