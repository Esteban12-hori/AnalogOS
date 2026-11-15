/**
 * features/leaders — Tesla-style metric lines in screen space (increment 6,
 * docs/UX_REDESIGN.md §3.4). Slots: `stage.overlay` (layer over the stage, beneath the panels;
 * pointer-events: none) and `stage.hud` («Lines» toggle in the stage legend strip).
 *
 * Consumes: the per-frame channel from features/globe (getStageAnchor/getStageProjection/
 * subscribeStageFrame), buildMetricViews from features/metrics and from the `ui` store: selection,
 * activeCriterionId, stageInsets and obstacles. Never calls setState per frame: on each
 * camera frame it applies `createLeaderController` by writing directly to the DOM (transform and `d`).
 *
 * STABLE INTERFACE: types and signatures in this file. The fields added relative to the stub of the
 * increment 2 are all OPTIONAL (docs/BUILD_CONTRACTS.md §1.2).
 */
import type { MetricView } from '../metrics'
import type { AppData } from '../../shell/public'

export interface LeaderLayerProps {
  data: AppData
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface LeaderLayoutInput {
  /**
   * Center and radius of the place's ring on screen: all lines start from its edge.
   * `visible` (0–1, optional; 1 by default): below 0,5 the place is not visible → chip.
   */
  anchor: { x: number; y: number; radius: number; visible?: number }
  /** Labels to place (measured width/height), in priority order. */
  labels: ReadonlyArray<{ id: string; width: number; height: number }>
  /** Safe area: viewport minus stageInsets. */
  safeArea: Rect
  /** Paneles a evitar (ui.obstacles). */
  obstacles: readonly Rect[]
  /** Side chosen in the previous frame (hysteresis). */
  previousSide: 'left' | 'right' | null
  /** Polygon width / free area width: >0,45 → docked mode without lines. */
  polygonWidthFraction: number
  /** Height < 860 px: maximum 3 labels. */
  compact: boolean
  /** Labels shown in the previous frame (0 = chip): growing requires extra clearance (hysteresis). */
  previousCount?: number
  /** «Whole sector · …» heading above the column (measured). If it doesn't fit, the column is not drawn. */
  header?: { width: number; height: number } | null
  /** Size of the «Metrics in the panel →» chip (measured) to position it in 'chip' mode. */
  chip?: { width: number; height: number } | null
}

export interface LeaderLayout {
  /** 'lines' = labels with lines; 'docked' = docked without lines; 'chip' = 0 labels («Metrics in the panel →»). */
  mode: 'lines' | 'docked' | 'chip'
  side: 'left' | 'right'
  /** Top-left corner of each label (viewport CSS px), in priority order. */
  placements: ReadonlyArray<{ id: string; x: number; y: number }>
  /** Placed labels: 4, 3, 2 or 0 (never 1). */
  count?: number
  /** Single point on the ring's edge from which all lines start (only 'lines'). */
  origin?: { x: number; y: number }
  /** x of the vertical bus that gathers the lines before the origin (only 'lines'). */
  busX?: number
  /** Top-left corner of the heading (if requested and it fit). */
  header?: { x: number; y: number }
  /** Top-left corner of the chip (only 'chip', if requested and it fit). */
  chip?: { x: number; y: number }
}

export { LeaderLayer } from './LeaderLayer'
export { LeaderToggle } from './LeaderToggle'
// `layoutLeaders`, `LEADER_GEOMETRY` and `pickPrincipalMetrics` live in the deferred chunk of the
// lines: they are imported directly from './layoutLeaders' and './principal' (§6.1). Only types here.
export type { LeaderPath, MobileLeader, MobileLeaderInput } from './leaderPaths'
export { getLeadersEnabled, setLeadersEnabled, useLeadersEnabled } from './preference'
export type { MetricView }
