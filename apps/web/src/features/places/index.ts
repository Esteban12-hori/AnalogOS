/**
 * features/places — places carousel (PlaceRail) and analog catalog ◆ (increment 3).
 * Slots: `dock.places` (≥1100), `sheet.tray.places` and `sheet.list` (<1100), `rail.reference` and
 * `sheet.reference` (one selected ◆).
 *
 * STABLE INTERFACE: types and signatures of this file (docs/BUILD_CONTRACTS.md §2.1).
 * Added in increment 3 (new exports only; no signature changed):
 * - `buildPlaceModel` and its types: place ordering (candidates in their global position, REF separate,
 *   ◆ alphabetical; in Mission, groups by team evaluation status).
 * - `classifyReferences(analogs, candidates)`: rule §1 #16 (point-in-polygon → badge
 *   “coincides with” or own ◆), reusable by the globe. It uses the geometric classifier that
 *   `loadReferenceAnalogs` brings in a deferred chunk; before it loads it returns “no ◆”.
 * - `referenceAnalogsFrom` (in ./analogCatalog, deferred): validates an already-read catalog (tests and tools).
 * The geometry (classify.ts, geometry.ts) is deliberately not re-exported here: this way it does not enter the
 * main chunk.
 */
import type { ReferenceAnalog } from '../../domain/contracts'
import type { AppData } from '../../shell/public'

export interface PlaceRailProps {
  data: AppData
  /** 'dock' = top row of the dock (≥1100). 'sheet' = S0 tray or sheet list (<1100). */
  placement: 'dock' | 'sheet'
  /** Only in 'sheet': “View list” replaces the tray with the full list (S1/S2 with no selection). */
  listView?: boolean
  /**
   * Asks the shell to open or close the list view (the shell decides the detent). Without it, in the
   * dock “View list” toggles the view within the dock itself and in the sheet the button does not appear.
   */
  onListViewChange?: (open: boolean) => void
  /** Product promise (App.tsx): note on the initial state of Explore. */
  promise?: string
}

export interface ReferenceCardProps {
  data: AppData
  /** id of the selected analog ◆ (ui.selection.kind === 'reference'). */
  analogId: string
}

export type ReferenceAnalogsState =
  | { status: 'loading' }
  | { status: 'ready'; analogs: readonly ReferenceAnalog[] }
  | { status: 'unavailable'; reason: string }

export { PlaceRail } from './PlaceRail'
export { ReferenceCard } from './ReferenceCard'
export { classifyReferences, loadReferenceAnalogs, useReferenceAnalogs } from './referenceAnalogs'
export { buildPlaceModel } from './placeModel'
export type { EvaluatedPlace, Place, PlaceGroup, PlaceModel, PlaceModelInput, ReferenceClassification, ReferencePlace } from './placeModel'
