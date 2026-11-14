/**
 * Proyector globo/2D de las líneas Tesla. Puro: recibe la proyección que publica el escenario
 * (features/globe, `StageProjection` en modo 'globe' o 'flat') y devuelve en px CSS del
 * viewport la extensión del sector, el ancla del anillo, el área segura y el borde de la hoja.
 *
 * El sector es un polígono (zona, no pin): las líneas salen del borde de su anillo y el ancho
 * proyectado decide el modo acoplado (>45 % del área libre).
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
  /** Visibilidad media 0–1 de los vértices muestreados (0 los que no se proyectan). */
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
 * Canal por cuadro de features/globe, inyectado desde LeaderLayer (chunk principal). La parte
 * diferida no importa `../globe` ni `../metrics`: Rolldown sacaría React del chunk principal a
 * chunks compartidos (más peticiones en la ruta crítica).
 */
export interface LeaderStageBridge {
  subscribe(listener: () => void): () => void
  read(): StageFrameInput
}

/** Radio mínimo del anillo derivado de la proyección (un sector a escala global mide pocos px). */
export const MIN_DERIVED_RADIUS = 10
/** Vértices máximos proyectados por cuadro. */
export const MAX_PROJECTED_POINTS = 64

function outerRings(geometry: CandidateGeometry): Position[][] {
  if (geometry.type === 'Polygon') return geometry.coordinates[0] ? [geometry.coordinates[0]] : []
  return geometry.coordinates.flatMap((polygon) => (polygon[0] ? [polygon[0]] : []))
}

/** Proyecta los anillos exteriores del sector (muestreados) y devuelve su caja en pantalla. */
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

/** Ancla derivada de la caja proyectada: centro y radio que la circunscribe (mínimo 10 px). */
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
 * Ancla del sector seleccionado en este cuadro. Usa el anillo que publica el escenario si es
 * de este sector; si no, lo deriva de la proyección del polígono. null si no hay ni lo uno ni
 * lo otro (el escenario no publica o el sector no se ve).
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

/** Ancho del sector en pantalla / ancho del área libre (decide el modo acoplado). */
export function polygonWidthFraction(bounds: SectorBounds | null, anchor: LeaderAnchor | null, safeArea: Rect): number {
  if (safeArea.width <= 0) return 0
  if (bounds) return Math.max(0, bounds.maxX - bounds.minX) / safeArea.width
  return anchor ? (2 * anchor.radius) / safeArea.width : 0
}

/** Área segura: viewport menos los márgenes asentados del escenario (ui.stageInsets). */
export function safeAreaFor(viewport: { width: number; height: number }, insets: StageInsets): Rect {
  return {
    x: insets.left,
    y: insets.top,
    width: Math.max(0, viewport.width - insets.left - insets.right),
    height: Math.max(0, viewport.height - insets.top - insets.bottom),
  }
}

/** Copia plana de rects (DOMRectReadOnly → Rect) descartando los vacíos o no finitos. */
export function toRects(list: ReadonlyArray<{ x: number; y: number; width: number; height: number }>): Rect[] {
  return list
    .filter((rect) => [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0)
    .map((rect) => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }))
}

/**
 * Fin de la línea móvil: borde superior de la hoja, alineado con el slot activo, que está
 * centrado. Con hoja lateral (horizontal bajo), su borde izquierdo a la altura del anillo.
 * Si un panel pegado al borde inferior (la hoja medida al asentarse) está más arriba que el
 * margen, manda el panel: en S2 la hoja queda sobre el anillo y no se dibuja nada.
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
