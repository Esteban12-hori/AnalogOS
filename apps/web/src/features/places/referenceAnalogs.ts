/**
 * Catalog of emblematic analogs ◆ (config/reference_analogs.json).
 *
 * - Loaded lazily (its own chunk, ≤3 KB): it adds no weight to the main chunk and does not block the carousel.
 * - Validated at the boundary with `parseReferenceAnalogs` (contracts/reference-analog.schema.json) and
 *   with two checks that the schema does not express: unique ids and correctly oriented boxes. The validator
 *   ships in the same lazy chunk as the catalog (analogCatalog.ts), not in the main one.
 * - If anything fails, the state is `unavailable` with the reason: analogs are never made up.
 */
import { useEffect, useSyncExternalStore } from 'react'
import type { CandidateSite, ReferenceAnalog } from '../../domain/contracts'
import type { ReferenceAnalogsState } from './index'
import { NO_REFERENCES, type ReferenceClassification } from './placeModel'

let state: ReferenceAnalogsState = { status: 'loading' }
let pending: Promise<ReferenceAnalogsState> | null = null
let classify: typeof import('./classify').classifyReferenceAnalogs | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const read = (): ReferenceAnalogsState => state

/**
 * Loads the catalog and its geometric classifier once per session (two lazy chunks,
 * in parallel); subsequent calls return the same result.
 */
export function loadReferenceAnalogs(): Promise<ReferenceAnalogsState> {
  pending ??= Promise.all([import('../../../../../config/reference_analogs.json'), import('./classify'), import('./analogCatalog')])
    .then(([catalog, geometry, contract]): ReferenceAnalogsState => {
      classify = geometry.classifyReferenceAnalogs
      return contract.referenceAnalogsFrom(catalog.default)
    })
    .catch((): ReferenceAnalogsState => ({ status: 'unavailable', reason: 'The analog catalog could not be loaded.' }))
    .then((next) => {
      state = next
      for (const listener of [...listeners]) listener()
      return next
    })
  return pending
}

/**
 * Rule §1 #16 on the snapshot's sectors: badge "matches" or own ◆. Without the
 * classifier loaded, no ◆ is shown (better absent than misplaced).
 */
export function classifyReferences(analogs: readonly ReferenceAnalog[], candidates: readonly CandidateSite[]): ReferenceClassification {
  return classify && analogs.length > 0 ? classify(analogs, candidates) : NO_REFERENCES
}

/** Catalog state; triggers loading on first use. */
export function useReferenceAnalogs(): ReferenceAnalogsState {
  const current = useSyncExternalStore(subscribe, read, read)
  useEffect(() => {
    void loadReferenceAnalogs()
  }, [])
  return current
}
