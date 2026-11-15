/**
 * Paths for the Tesla lines (desktop) and the single mobile line. Pure. Lives in the
 * deferred chunk: index.ts does not re-export it (only its types).
 */
import type { LeaderLayout, LeaderLayoutInput, Rect } from './index'
import { attachOffset, containsPoint, finite, LEADER_GEOMETRY } from './layoutLeaders'

type Point = { x: number; y: number }

function r1(value: number): string {
  return String(Math.round(value * 10) / 10)
}

export interface LeaderPath {
  id: string
  /** SVG path from origin O to the label: O → bus → title row (straight segments only). */
  d: string
  attach: Point
}

/** Paths for each label in 'lines' mode; empty in 'docked' and 'chip'. */
export function leaderPaths(layout: LeaderLayout, labels: LeaderLayoutInput['labels']): LeaderPath[] {
  const { origin, busX } = layout
  if (layout.mode !== 'lines' || !origin || busX === undefined) return []
  const sizes = new Map(labels.map((label) => [label.id, label]))
  const paths: LeaderPath[] = []
  for (const placement of layout.placements) {
    const size = sizes.get(placement.id)
    if (!size) continue
    const attach = { x: layout.side === 'right' ? placement.x : placement.x + size.width, y: placement.y + attachOffset(size.height) }
    paths.push({ id: placement.id, d: `M${r1(origin.x)} ${r1(origin.y)}H${r1(busX)}V${r1(attach.y)}H${r1(attach.x)}`, attach })
  }
  return paths
}

// ---------------------------------------------------------------------------------------------
// Mobile (<1100): a single line from the ring to the top edge of the sheet (§1 #5, §4.5 S1).
// ---------------------------------------------------------------------------------------------

export interface MobileLeaderInput {
  anchor: { x: number; y: number; radius: number; visible?: number }
  /** Safe area (viewport minus stageInsets): the ring must be visible inside it. */
  safeArea: Rect
  /** End of the line: top edge of the sheet, aligned with the active slot (centered). */
  end: Point
  /** Panels: the line is cut off before the first one it crosses (except the sheet, where it ends). */
  obstacles: readonly Rect[]
}

export interface MobileLeader {
  from: Point
  to: Point
  d: string
}

/** Parameter t∈[0,1] at which segment p→q enters the rectangle (Liang–Barsky); null if it does not touch it. */
function segmentEntry(p: Point, q: Point, rect: Rect): number | null {
  let t0 = 0
  let t1 = 1
  const dx = q.x - p.x
  const dy = q.y - p.y
  const edges: Array<[number, number]> = [
    [-dx, p.x - rect.x],
    [dx, rect.x + rect.width - p.x],
    [-dy, p.y - rect.y],
    [dy, rect.y + rect.height - p.y],
  ]
  for (const [step, distance] of edges) {
    if (step === 0) {
      if (distance < 0) return null
      continue
    }
    const t = distance / step
    if (step < 0) {
      if (t > t1) return null
      if (t > t0) t0 = t
    } else {
      if (t < t0) return null
      if (t < t1) t1 = t
    }
  }
  return t0
}

/**
 * A single line from the edge of the ring to the top edge of the sheet. null if the place is not visible,
 * if the sheet sits above the ring (S2), or if the line would be too short.
 */
export function layoutMobileLeader(input: MobileLeaderInput): MobileLeader | null {
  const G = LEADER_GEOMETRY
  const { anchor, end } = input
  const visible = anchor.visible ?? 1
  if (!finite(anchor.x, anchor.y, anchor.radius, end.x, end.y, visible) || visible < G.minVisible) return null
  if (!containsPoint(input.safeArea, anchor.x, anchor.y)) return null
  const dx = end.x - anchor.x
  const dy = end.y - anchor.y
  const distance = Math.hypot(dx, dy)
  // The line only goes down (or sideways, with a side sheet): it never goes up toward a sheet in S2.
  if (dy < 0 || distance <= anchor.radius + G.mobileMinLength) return null
  const from = { x: anchor.x + (dx / distance) * anchor.radius, y: anchor.y + (dy / distance) * anchor.radius }
  let t = 1
  for (const obstacle of input.obstacles) {
    if (!finite(obstacle.x, obstacle.y, obstacle.width, obstacle.height)) continue
    // The sheet contains the point just after the end: it is the destination, not an obstacle.
    if (containsPoint(obstacle, end.x + Math.sign(dx) * 0.5, end.y + Math.sign(dy) * 0.5)) continue
    const entry = segmentEntry(from, end, obstacle)
    if (entry !== null && entry < t) t = entry
  }
  const span = Math.hypot(end.x - from.x, end.y - from.y)
  const length = span * t
  // Clipped by a panel: it ends 4 px before it, without touching it.
  const reach = t < 1 ? length - Math.min(4, length) : length
  if (reach < G.mobileMinLength) return null
  const to = { x: from.x + ((end.x - from.x) / span) * reach, y: from.y + ((end.y - from.y) / span) * reach }
  return { from, to, d: `M${r1(from.x)} ${r1(from.y)}L${r1(to.x)} ${r1(to.y)}` }
}
