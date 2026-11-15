/**
 * Per-frame channel from the stage (globe or 2D map) to screen-space layers
 * (Tesla lines). It does NOT go through the store or React: it changes on every camera frame.
 *
 * Published only by features/globe:
 *  - the globe, from its single useFrame (MarkerProjector), on every frame it draws: with
 *    frameloop «demand» that happens only during flights, gestures, intro or data changes;
 *  - the 2D map, on every MapLibre `move`/`resize` event and when the selection changes;
 *  - without WebGL (SVG map) or when the globe is unmounted: { projection: null, anchor: null }.
 * The anchor exists only for a selected, visible evaluated sector (never for a ◆).
 * Coordinates are in viewport CSS pixels (the stage is fixed and fills the whole viewport).
 */

export interface ScreenPoint {
  /** Viewport CSS pixels. */
  x: number
  y: number
  /** 0–1: continuous visibility based on orientation (smoothstep(.05, .25) on the globe). */
  visible: number
}

export interface StageProjection {
  mode: 'globe' | 'flat'
  /** Projects lon/lat to screen; null if it falls outside the frame or behind the globe. */
  project(lon: number, lat: number): ScreenPoint | null
}

/** Anchor of the selected place: center of the ring and its radius on screen. */
export interface StageAnchor {
  siteId: string
  x: number
  y: number
  radius: number
  visible: number
  mode: 'globe' | 'flat'
}

type FrameListener = () => void

let projection: StageProjection | null = null
let anchor: StageAnchor | null = null
const listeners = new Set<FrameListener>()

/** Current projection (null if the stage is not publishing). */
export function getStageProjection(): StageProjection | null {
  return projection
}

/** Current anchor of the selected place (null if there is no selection or it is not visible). */
export function getStageAnchor(): StageAnchor | null {
  return anchor
}

/** Receives a notification for every frame in which the camera or the anchor changes. */
export function subscribeStageFrame(listener: FrameListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Only features/globe: publishes the projection and anchor of the current frame. */
export function publishStageFrame(next: { projection: StageProjection | null; anchor: StageAnchor | null }): void {
  projection = next.projection
  anchor = next.anchor
  for (const listener of [...listeners]) listener()
}
