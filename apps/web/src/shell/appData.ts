/**
 * Data that the shell hands to each slot (props `data`). Integrator file.
 * The snapshot arrives already validated against the contracts at the boundary (loadDemoSnapshot).
 */
import type { DemoSnapshot } from '../data/loadDemoSnapshot'
import type { VisualContextState } from '../data/loadVisualContext'
import type { AppGeology } from '../data/loadAppGeology'

export interface AppData {
  /** 'loading' while the snapshot is arriving; 'error' if it did not pass validation or failed to load. */
  status: 'loading' | 'ready' | 'error'
  /** null while loading or if it failed. */
  snapshot: DemoSnapshot | null
  /** Sentinel-2 visual context (optional: never blocks or breaks the snapshot). */
  visual: VisualContextState
  /** Loading error message, if there was one. */
  error: string | null
  /**
   * Official geological context (M9, optional): loaded in a deferred chunk after the snapshot and
   * never blocks anything. Absent = still loading.
   */
  geology?: AppGeology
}

/** Stable "loading" state (always the same reference: does not trigger effects on every render). */
const GEOLOGY_LOADING: AppGeology['state'] = { status: 'loading' }

/** State of the geological context for the features (absent = loading). */
export function geologyStateOf(data: Pick<AppData, 'geology'>): AppGeology['state'] {
  return data.geology?.state ?? GEOLOGY_LOADING
}

/** Does this sector have ITS valid official geological record? (selectGeologySite "ready", computed on load). */
export function hasGeologyFor(data: Pick<AppData, 'geology'>, siteId: string): boolean {
  return data.geology?.readySites.has(siteId) ?? false
}

/** true if all candidates are synthetic fixtures (label "TECHNICAL DEMONSTRATION"). */
export function isFixtureSnapshot(snapshot: DemoSnapshot | null): boolean {
  return snapshot !== null && snapshot.candidates.length > 0 && snapshot.candidates.every((candidate) => candidate.status === 'fixture')
}
