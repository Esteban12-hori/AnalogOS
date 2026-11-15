/**
 * One frame of the Tesla lines: from the scene (measured content + settled layout) and from the stage's frame
 * (projection + anchor) to screen positions. Pure; the controller calls it on
 * every camera frame without going through React.
 */
import type { CandidateGeometry } from '../../domain/contracts'
import type { StageInsets } from '../../state/ui'
import type { Rect } from './index'
import { layoutLeaders } from './layoutLeaders'
import { layoutMobileLeader, leaderPaths, type MobileLeader } from './leaderPaths'
import { polygonWidthFraction, resolveAnchor, safeAreaFor, sheetEdge, type StageFrameInput } from './projector'

export type Size = { width: number; height: number }

/** What changes with the content or the settled layout (never per frame). */
export interface LeaderScene {
  siteId: string
  geometry: CandidateGeometry
  /** <1100 px: a single line up to the top edge of the sheet. */
  narrow: boolean
  /** Short landscape: 360 px side sheet. */
  sideSheet: boolean
  compact: boolean
  viewport: Size
  insets: StageInsets
  obstacles: readonly Rect[]
  /** Measured labels, in priority order (empty on mobile). */
  labels: ReadonlyArray<{ id: string; width: number; height: number }>
  header: Size | null
  chip: Size | null
}

/** Hysteresis memory between frames. */
export interface LeaderMemory {
  side: 'left' | 'right' | null
  count: number | undefined
}

export const FRESH_MEMORY: LeaderMemory = Object.freeze({ side: null, count: undefined })

/** 'off' = the stage does not publish or there is nothing to draw. */
export type LeaderFrameMode = 'off' | 'lines' | 'docked' | 'chip' | 'mobile'

export interface LeaderFrame {
  mode: LeaderFrameMode
  side: 'left' | 'right'
  count: number
  placements: ReadonlyArray<{ id: string; x: number; y: number }>
  paths: ReadonlyArray<{ id: string; d: string }>
  origin: { x: number; y: number } | null
  header: { x: number; y: number } | null
  chip: { x: number; y: number } | null
  mobile: MobileLeader | null
}

function off(side: 'left' | 'right'): LeaderFrame {
  return { mode: 'off', side, count: 0, placements: [], paths: [], origin: null, header: null, chip: null, mobile: null }
}

export function computeLeaderFrame(scene: LeaderScene, stage: StageFrameInput, memory: LeaderMemory): LeaderFrame {
  const side = memory.side ?? 'right'
  // Without a projection or an anchor the stage does not know where the sector is: nothing is drawn.
  if (!stage.projection && !stage.anchor) return off(side)
  const { anchor, bounds } = resolveAnchor(scene.siteId, scene.geometry, stage)
  const safeArea = safeAreaFor(scene.viewport, scene.insets)

  if (scene.narrow) {
    if (!anchor) return off(side)
    const end = sheetEdge(scene.viewport, scene.insets, scene.obstacles, scene.sideSheet, anchor.y)
    const mobile = layoutMobileLeader({ anchor, safeArea, end, obstacles: scene.obstacles })
    return mobile ? { ...off(side), mode: 'mobile', mobile } : off(side)
  }

  if (scene.labels.length === 0) return off(side)
  const layout = layoutLeaders({
    // Without an anchor (the sector ended up behind the globe or outside the framing): visible 0 → chip.
    anchor: anchor ?? { x: safeArea.x + safeArea.width / 2, y: safeArea.y + safeArea.height / 2, radius: 0, visible: 0 },
    labels: scene.labels,
    safeArea,
    obstacles: scene.obstacles,
    previousSide: memory.side,
    previousCount: memory.count,
    polygonWidthFraction: polygonWidthFraction(bounds, anchor, safeArea),
    compact: scene.compact,
    header: scene.header,
    chip: scene.chip,
  })
  return {
    mode: layout.mode,
    side: layout.side,
    count: layout.count ?? layout.placements.length,
    placements: layout.placements,
    paths: leaderPaths(layout, scene.labels),
    origin: layout.origin ?? null,
    header: layout.header ?? null,
    chip: layout.chip ?? null,
    mobile: null,
  }
}

/** Memory for the next frame: the side and the count shown (an 'off' does not erase it). */
export function nextMemory(previous: LeaderMemory, frame: LeaderFrame): LeaderMemory {
  if (frame.mode === 'off' || frame.mode === 'mobile') return previous
  return { side: frame.side, count: frame.count }
}
