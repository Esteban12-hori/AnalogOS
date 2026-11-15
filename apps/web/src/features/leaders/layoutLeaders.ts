/**
 * Pure layout of the Tesla label column (increment 6, docs/UX_REDESIGN.md §3.4). The
 * SVG paths and the single mobile line are in leaderPaths.ts.
 *
 * Column geometry:
 *   a single origin O on the edge of the ring (on the column side) → horizontal trunk to
 *   the vertical bus → one horizontal segment per label to the row of its title.
 *   All segments are horizontal or vertical and share O, so two lines only
 *   touch at the trunk or the bus (they never cross) and none passes through a label.
 *
 * Degradation: 4 → 3 → 2 → 0 labels (never 1); with 0, a chip "Metrics in the panel →".
 * Hysteresis: the previous side is kept as long as it shows as many labels as the other with
 * slack; growing from N to N+1 (or leaving the chip) requires `hysteresis` px of extra slack.
 */
import type { LeaderLayout, LeaderLayoutInput, Rect } from './index'

// Frozen: it is a stable interface (index.ts) and nobody should mutate it. In addition, the top-level
// call keeps this module in the main chunk together with index.ts: if it stayed only in the
// deferred chunk, Rolldown would move React out of the main chunk into shared chunks (3 more requests).
export const LEADER_GEOMETRY = Object.freeze({
  /** Separation from the edges of the safe area and from the panels (px). */
  margin: 12,
  /** Vertical separation between labels. */
  gap: 8,
  /** Separation between the header and the first label. */
  headerGap: 6,
  /** Minimum and preferred distance between the edge of the ring and the column (the bus fits). */
  reachMin: 40,
  reachPref: 88,
  /** Maximum distance from the vertical bus to the column. */
  busInset: 16,
  /** Polygon wider than this fraction of the free area → docked mode without lines. */
  dockFraction: 0.45,
  /** Below this visibility the place is not visible (behind the globe or off-screen): chip. */
  minVisible: 0.5,
  /** Slack (px) to grow from N to N+1 labels, leave the chip or switch sides. */
  hysteresis: 16,
  /** Lines attach to the title row of each label (px from its top edge). */
  attachDy: 11,
  /** A mobile line shorter than this is not drawn. */
  mobileMinLength: 24,
  /** Separation between the ring and the chip. */
  chipGap: 14,
})

/** Allowed counts, from highest to lowest: never a single label. */
const COUNTS = [4, 3, 2] as const

type Side = 'left' | 'right'
type Point = { x: number; y: number }
type Placement = { id: string; x: number; y: number }

interface Fit {
  count: number
  placements: Placement[]
  header?: Point
  origin?: Point
  busX?: number
}

export function finite(...values: number[]): boolean {
  return values.every((value) => Number.isFinite(value))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function shrink(rect: Rect, by: number): Rect {
  return { x: rect.x + by, y: rect.y + by, width: rect.width - 2 * by, height: rect.height - 2 * by }
}

export function containsPoint(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}

function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

/** Attaches the line at the title row, without going past the middle of the label. */
export function attachOffset(height: number): number {
  return Math.min(LEADER_GEOMETRY.attachDy, height / 2)
}

/** Free vertical intervals of [top, bottom] for the horizontal strip [left, right]. */
function freeIntervals(top: number, bottom: number, left: number, right: number, obstacles: readonly Rect[], margin: number): Array<[number, number]> {
  let intervals: Array<[number, number]> = [[top, bottom]]
  for (const obstacle of obstacles) {
    if (!finite(obstacle.x, obstacle.y, obstacle.width, obstacle.height)) continue
    if (!(obstacle.x < right + margin && obstacle.x + obstacle.width > left - margin)) continue
    const blockTop = obstacle.y - margin
    const blockBottom = obstacle.y + obstacle.height + margin
    const next: Array<[number, number]> = []
    for (const [start, end] of intervals) {
      if (blockBottom <= start || blockTop >= end) {
        next.push([start, end])
        continue
      }
      if (blockTop > start) next.push([start, blockTop])
      if (blockBottom < end) next.push([blockBottom, end])
    }
    intervals = next
  }
  return intervals
}

/** The position closest to `desired` where `height` fits (with `slack` of slack); null if there is none. */
function nearestTop(intervals: Array<[number, number]>, desired: number, height: number, slack: number): number | null {
  let best: number | null = null
  for (const [start, end] of intervals) {
    if (end - start < height + slack) continue
    const top = clamp(desired, start, end - height)
    if (best === null || Math.abs(top - desired) < Math.abs(best - desired)) best = top
  }
  return best
}

function isDocked(input: LeaderLayoutInput): boolean {
  return Number.isFinite(input.polygonWidthFraction) && input.polygonWidthFraction > LEADER_GEOMETRY.dockFraction
}

/** Tries to place `count` labels (plus the header) on side `side`; null if they do not fit. */
function fitColumn(input: LeaderLayoutInput, side: Side, count: number, slack: number): Fit | null {
  const G = LEADER_GEOMETRY
  const labels = input.labels.slice(0, count)
  if (labels.length < count) return null
  const header = input.header ?? null
  const safe = shrink(input.safeArea, G.margin)
  if (safe.width <= 0 || safe.height <= 0) return null
  const docked = isDocked(input)
  const { anchor } = input
  const maxWidth = Math.max(header?.width ?? 0, ...labels.map((label) => label.width))
  const stackHeight =
    (header ? header.height + G.headerGap : 0) +
    labels.reduce((sum, label) => sum + label.height, 0) +
    G.gap * (count - 1)

  let left: number
  let right: number
  let origin: Point | undefined
  let busX: number | undefined
  if (docked) {
    if (maxWidth + slack > safe.width) return null
    left = side === 'right' ? safe.x + safe.width - maxWidth : safe.x
    right = left + maxWidth
  } else {
    const ox = side === 'right' ? anchor.x + anchor.radius : anchor.x - anchor.radius
    const available = side === 'right' ? safe.x + safe.width - ox : ox - safe.x
    const reach = Math.min(G.reachPref, available - maxWidth)
    if (reach < G.reachMin + slack) return null
    if (side === 'right') {
      left = ox + reach
      right = left + maxWidth
    } else {
      right = ox - reach
      left = right - maxWidth
    }
    origin = { x: ox, y: anchor.y }
    const bus = Math.min(G.busInset, reach / 2)
    busX = side === 'right' ? left - bus : right + bus
  }

  const intervals = freeIntervals(safe.y, safe.y + safe.height, left, right, input.obstacles, G.margin)
  const top = nearestTop(intervals, anchor.y - stackHeight / 2, stackHeight, slack)
  if (top === null) return null

  // With lines, the column is aligned toward the ring; when docked, toward the edge.
  const alignLeft = docked ? side === 'left' : side === 'right'
  let y = top
  let headerAt: Point | undefined
  if (header) {
    headerAt = { x: alignLeft ? left : right - header.width, y }
    y += header.height + G.headerGap
  }
  const placements = labels.map((label) => {
    const placement = { id: label.id, x: alignLeft ? left : right - label.width, y }
    y += label.height + G.gap
    return placement
  })

  if (origin && busX !== undefined) {
    // The trunk, the bus and the segments also cannot pass beneath a panel.
    const ys = [origin.y, ...placements.map((placement, index) => placement.y + attachOffset(labels[index]?.height ?? 0))]
    const xs = [origin.x, busX, side === 'right' ? left : right]
    const box = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
    if (input.obstacles.some((obstacle) => finite(obstacle.x, obstacle.y, obstacle.width, obstacle.height) && intersects(box, obstacle))) return null
  }
  return { count, placements, header: headerAt, origin, busX }
}

/** Chip mode: "Metrics in the panel →", next to the ring on the rail side or against the right edge. */
function chipLayout(input: LeaderLayoutInput, side: Side): LeaderLayout {
  const base: LeaderLayout = { mode: 'chip', side, placements: [], count: 0 }
  const chip = input.chip
  if (!chip) return base
  const G = LEADER_GEOMETRY
  const safe = shrink(input.safeArea, G.margin)
  if (chip.width > safe.width || chip.height > safe.height) return base
  const { anchor } = input
  const seen = (anchor.visible ?? 1) >= G.minVisible && finite(anchor.x, anchor.y, anchor.radius) && containsPoint(input.safeArea, anchor.x, anchor.y)
  const rightEdge = safe.x + safe.width - chip.width
  const x = seen ? clamp(anchor.x + anchor.radius + G.chipGap, safe.x, rightEdge) : rightEdge
  // Below the ring, not at its height: to the right of the anchor is the label of the selected pin
  // ("#1 … 94,9 %") and the chip covered it.
  const desired = seen ? anchor.y + anchor.radius + G.chipGap : safe.y + safe.height / 2 - chip.height / 2
  const intervals = freeIntervals(safe.y, safe.y + safe.height, x, x + chip.width, input.obstacles, G.margin)
  const y = nearestTop(intervals, desired, chip.height, 0)
  return y === null ? base : { ...base, chip: { x, y } }
}

/** Label column without crossings within the safe area, degrading 4→3→2→0 with hysteresis. */
export function layoutLeaders(input: LeaderLayoutInput): LeaderLayout {
  const G = LEADER_GEOMETRY
  const { anchor, safeArea } = input
  const fallbackSide: Side = input.previousSide ?? 'right'
  const max = Math.min(input.compact ? 3 : 4, input.labels.length)
  const counts = COUNTS.filter((count) => count <= max)
  const visible = anchor.visible ?? 1
  if (counts.length === 0 || !finite(anchor.x, anchor.y, anchor.radius, visible) || visible < G.minVisible) {
    return chipLayout(input, fallbackSide)
  }
  const docked = isDocked(input)
  // With lines, the origin has to be visible within the safe area; when docked there are no lines.
  if (!docked && !containsPoint(safeArea, anchor.x, anchor.y)) return chipLayout(input, fallbackSide)

  const best = (side: Side, slack: number, cap = Number.POSITIVE_INFINITY): Fit | null => {
    for (const count of counts) {
      if (count > cap) continue
      const fit = fitColumn(input, side, count, slack)
      if (fit) return fit
    }
    return null
  }
  // With the previous count, growing requires slack (it does not jump 3↔4 or chip↔lines at the edge).
  const stable = (side: Side): Fit | null => {
    const free = best(side, 0)
    const previous = input.previousCount
    if (!free || previous === undefined || free.count <= previous) return free
    const grown = best(side, G.hysteresis)
    if (grown && grown.count > previous) return grown
    return best(side, 0, previous)
  }
  const freeSpace = (side: Side): number =>
    side === 'right' ? safeArea.x + safeArea.width - (anchor.x + anchor.radius) : anchor.x - anchor.radius - safeArea.x

  let side: Side
  let fit: Fit | null
  if (input.previousSide) {
    const current = stable(input.previousSide)
    const other: Side = input.previousSide === 'right' ? 'left' : 'right'
    // Switch sides only if the other shows more labels with slack (or if the current one does not fit).
    const alternative = current ? best(other, G.hysteresis) : stable(other)
    if (alternative && alternative.count > (current?.count ?? 0)) {
      side = other
      fit = alternative
    } else {
      side = input.previousSide
      fit = current
    }
  } else {
    const right = best('right', 0)
    const left = best('left', 0)
    const rightCount = right?.count ?? 0
    const leftCount = left?.count ?? 0
    if (rightCount !== leftCount) side = rightCount > leftCount ? 'right' : 'left'
    else side = freeSpace('right') >= freeSpace('left') ? 'right' : 'left'
    fit = side === 'right' ? right : left
  }
  if (!fit) return chipLayout(input, side)

  const layout: LeaderLayout = {
    mode: docked ? 'docked' : 'lines',
    side,
    placements: fit.placements,
    count: fit.count,
    ...(fit.origin ? { origin: fit.origin } : {}),
    ...(fit.busX !== undefined ? { busX: fit.busX } : {}),
    ...(fit.header ? { header: fit.header } : {}),
  }
  return layout
}
