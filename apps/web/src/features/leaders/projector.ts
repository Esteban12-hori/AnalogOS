/**
 * Globe/2D projector for the Tesla lines. Pure: it receives the projection published by the stage
 * (features/globe, `StageProjection` in 'globe' or 'flat' mode) and returns, in viewport CSS px,
 * the sector's extent, the ring anchor, the safe area and the sheet edge.
 *
 * The sector is a polygon (a zone, not a pin): the lines leave from the edge of its ring and the projected
 * width decides the docked mode (>45 % of the free area).
 */
import type { CandidateGeometry, Position } from '../../domain/contracts'
import type { StageAnchor, StageProjection } from '../globe'
import type { StageInsets } from '../../state/ui'
import type { Rect } from './index'

export interface SectorBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  /** Mean visibility 0–1 of the sampled vertices (0 those that are not projected). */
  visible: number
}

export interface LeaderAnchor {
  x: number
  y: number
  radius: number
  visible: number
}

export interface StageFrameInput {
  projection: StageProjection | null
  anchor: StageAnchor | null
}

/**
 * Per-frame channel from features/globe, injected from LeaderLayer (main chunk). The deferred
 * part does not import `../globe` or `../metrics`: Rolldown would move React out of the main chunk into
 * shared chunks (more requests on the critical path).
 */
export interface LeaderStageBridge {
  subscribe(listener: () => void): () => void
  read(): StageFrameInput
}

/** Minimum ring radius derived from the projection (a global-scale sector measures only a few px). */
export const MIN_DERIVED_RADIUS = 10
/** Maximum vertices projected per frame. */
export const MAX_PROJECTED_POINTS = 64

function outerRings(geometry: CandidateGeometry): Position[][] {
  if (geometry.type === 'Polygon') return geometry.coordinates[0] ? [geometry.coordinates[0]] : []
  return geometry.coordinates.flatMap((polygon) => (polygon[0] ? [polygon[0]] : []))
}

/** Projects the sector's outer rings (sampled) and returns their on-screen box. */
export function projectSector(projection: StageProjection, geometry: CandidateGeometry, maxPoints = MAX_PROJECTED_POINTS): SectorBounds | null {
  const points = outerRings(geometry).flat()
  if (points.length === 0) return null
  const step = Math.max(1, Math.ceil(points.length / Math.max(1, maxPoints)))
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  let sampled = 0
  let visibleSum = 0
  let hits = 0
  for (let index = 0; index < points.length; index += step) {
    const point = points[index]
    if (!point) continue
    sampled += 1
    const screen = projection.project(point[0], point[1])
    if (!screen || !Number.isFinite(screen.x) || !Number.isFinite(screen.y) || !(screen.visible > 0)) continue
    hits += 1
    visibleSum += Math.min(1, screen.visible)
    if (screen.x < minX) minX = screen.x
    if (screen.x > maxX) maxX = screen.x
    if (screen.y < minY) minY = screen.y
    if (screen.y > maxY) maxY = screen.y
  }
  if (hits === 0) return null
  return { minX, minY, maxX, maxY, visible: visibleSum / sampled }
}

/** Anchor derived from the projected box: center and the radius that circumscribes it (minimum 10 px). */
export function anchorFromBounds(bounds: SectorBounds): LeaderAnchor {
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    radius: Math.max(MIN_DERIVED_RADIUS, Math.hypot(width, height) / 2),
    visible: bounds.visible,
  }
}

/**
 * Anchor of the sector selected in this frame. It uses the ring published by the stage if it belongs
 * to this sector; otherwise, it derives it from the polygon's projection. null if neither one nor
 * the other is available (the stage does not publish or the sector is not visible).
 */
export function resolveAnchor(siteId: string, geometry: CandidateGeometry, stage: StageFrameInput): { anchor: LeaderAnchor | null; bounds: SectorBounds | null } {
  const bounds = stage.projection ? projectSector(stage.projection, geometry) : null
  const published = stage.anchor
  if (published && published.siteId === siteId && Number.isFinite(published.x) && Number.isFinite(published.y)) {
    return {
      anchor: { x: published.x, y: published.y, radius: Math.max(0, published.radius), visible: published.visible },
      bounds,
    }
  }
  return { anchor: bounds ? anchorFromBounds(bounds) : null, bounds }
}

/** Sector width on screen / free area width (decides the docked mode). */
export function polygonWidthFraction(bounds: SectorBounds | null, anchor: LeaderAnchor | null, safeArea: Rect): number {
  if (safeArea.width <= 0) return 0
  if (bounds) return Math.max(0, bounds.maxX - bounds.minX) / safeArea.width
  return anchor ? (2 * anchor.radius) / safeArea.width : 0
}

/** Safe area: viewport minus the stage's settled margins (ui.stageInsets). */
export function safeAreaFor(viewport: { width: number; height: number }, insets: StageInsets): Rect {
  return {
    x: insets.left,
    y: insets.top,
    width: Math.max(0, viewport.width - insets.left - insets.right),
    height: Math.max(0, viewport.height - insets.top - insets.bottom),
  }
}

/** Flat copy of rects (DOMRectReadOnly → Rect), discarding empty or non-finite ones. */
export function toRects(list: ReadonlyArray<{ x: number; y: number; width: number; height: number }>): Rect[] {
  return list
    .filter((rect) => [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0)
    .map((rect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }))
}

/**
 * End of the moving line: top edge of the sheet, aligned with the active slot, which is
 * centered. With a side sheet (horizontal bottom), its left edge at the height of the ring.
 * If a panel attached to the bottom edge (the sheet measured once settled) is higher than the
 * margin, the panel governs: in S2 the sheet sits above the ring and nothing is drawn.
 */
export function sheetEdge(
  viewport: { width: number; height: number },
  insets: StageInsets,
  obstacles: readonly Rect[],
  sideSheet: boolean,
  anchorY: number,
): { x: number; y: number } {
  if (sideSheet) {
    const top = insets.top + 12
    const bottom = viewport.height - insets.bottom - 12
    return { x: viewport.width - insets.right, y: Math.min(bottom, Math.max(top, anchorY)) }
  }
  let top = viewport.height - insets.bottom
  for (const rect of obstacles) {
    const touchesBottom = rect.y + rect.height >= viewport.height - 2
    if (touchesBottom && rect.width >= viewport.width * 0.5 && rect.y < top) top = rect.y
  }
  return { x: viewport.width / 2, y: top }
}
