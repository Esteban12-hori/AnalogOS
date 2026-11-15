/**
 * features/globe — stage: 3D globe, transition to 2D map, ●◆○ markers, flight and clustering
 * (increment 4). Slot: `stage` of the shell (background layer, full screen).
 *
 * STABLE INTERFACE: `MapStage` and its props, and the per-frame channel of `stageBridge`.
 *  - MapStage adds the OPTIONAL prop `onSelectReference` (◆); without it, it writes
 *    `ui.selection` with `kind: 'reference'`. It reads from the store: selection (preview), hoverSiteId,
 *    introPhase, cameraTouchedAt and mode; from the mission, scoring and revision; from places, the ◆.
 *  - stageBridge publishes on every globe frame and on every `move` of the 2D map (see stageBridge.ts).
 * The pure functions (geometry.ts, flight.ts, markers.ts, keyboard.ts) are not re-exported here
 * so as not to drag them into the main chunk: they live in the deferred chunks of the globe and the 2D map.
 */
export { MapStage, contextLayers } from './MapStage'
export type { MapStageProps, StageMilestone } from './MapStage'
export {
  getStageAnchor,
  getStageProjection,
  publishStageFrame,
  subscribeStageFrame,
} from './stageBridge'
export type { ScreenPoint, StageAnchor, StageProjection } from './stageBridge'
