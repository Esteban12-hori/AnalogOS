/**
 * Layout puro de la columna de etiquetas Tesla (incremento 6, docs/UX_REDESIGN.md §3.4). Los
 * trazos SVG y la línea única de móvil están en leaderPaths.ts.
 *
 * Geometría de la columna:
 *   origen único O en el borde del anillo (del lado de la columna) → tronco horizontal hasta
 *   el bus vertical → un tramo horizontal por etiqueta hasta la fila de su título.
 *   Todos los tramos son horizontales o verticales y comparten O, de modo que dos líneas solo
 *   se tocan en el tronco o el bus (nunca se cruzan) y ninguna atraviesa una etiqueta.
 *
 * Degradación: 4 → 3 → 2 → 0 etiquetas (nunca 1); con 0, chip «Métricas en el panel →».
 * Histéresis: el lado anterior se conserva mientras muestre tantas etiquetas como el otro con
 * holgura; crecer de N a N+1 (o salir del chip) exige `hysteresis` px de holgura extra.
 */
import type { LeaderLayout, LeaderLayoutInput, Rect } from './index'

// Congelado: es interfaz estable (index.ts) y nadie debe mutarlo. Además, la llamada en el nivel
// superior mantiene este módulo en el chunk principal junto a index.ts: si quedara solo en el
// chunk diferido, Rolldown sacaría React del principal a chunks compartidos (3 peticiones más).
export const LEADER_GEOMETRY = Object.freeze({
  /** Separación respecto de los bordes del área segura y de los paneles (px). */
  margin: 12,
  /** Separación vertical entre etiquetas. */
  gap: 8,
  /** Separación entre el encabezado y la primera etiqueta. */
  headerGap: 6,
  /** Distancia mínima y preferida entre el borde del anillo y la columna (cabe el bus). */
  reachMin: 40,
  reachPref: 88,
  /** Distancia máxima del bus vertical a la columna. */
  busInset: 16,
  /** Polígono más ancho que esta fracción del área libre → modo acoplado sin líneas. */
  dockFraction: 0.45,
  /** Por debajo de esta visibilidad el lugar no se ve (detrás del globo o fuera): chip. */
  minVisible: 0.5,
  /** Holgura (px) para crecer de N a N+1 etiquetas, salir del chip o cambiar de lado. */
  hysteresis: 16,
  /** Las líneas se enganchan a la fila del título de cada etiqueta (px desde su borde superior). */
  attachDy: 11,
  /** Una línea móvil más corta que esto no se dibuja. */
  mobileMinLength: 24,
  /** Separación entre el anillo y el chip. */
  chipGap: 14,
})

/** Cantidades permitidas, de mayor a menor: nunca una sola etiqueta. */
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

/** Engancha la línea en la fila del título, sin pasar de la mitad de la etiqueta. */
export function attachOffset(height: number): number {
  return Math.min(LEADER_GEOMETRY.attachDy, height / 2)
}

/** Intervalos verticales libres de [top, bottom] para la franja horizontal [left, right]. */
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

/** La posición más cercana a `desired` donde cabe `height` (con `slack` de holgura); null si no hay. */
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

/** Intenta ubicar `count` etiquetas (más el encabezado) del lado `side`; null si no caben. */
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

  // Con líneas, la columna se alinea hacia el anillo; acoplada, hacia el borde.
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
    // El tronco, el bus y los tramos tampoco pueden pasar por debajo de un panel.
    const ys = [origin.y, ...placements.map((placement, index) => placement.y + attachOffset(labels[index]?.height ?? 0))]
    const xs = [origin.x, busX, side === 'right' ? left : right]
    const box = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
    if (input.obstacles.some((obstacle) => finite(obstacle.x, obstacle.y, obstacle.width, obstacle.height) && intersects(box, obstacle))) return null
  }
  return { count, placements, header: headerAt, origin, busX }
}

/** Modo chip: «Métricas en el panel →», junto al anillo del lado del riel o contra el borde derecho. */
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
  // Bajo el anillo, no a su altura: a la derecha del ancla está el rótulo del pin seleccionado
  // («#1 … 94,9 %») y el chip lo tapaba.
  const desired = seen ? anchor.y + anchor.radius + G.chipGap : safe.y + safe.height / 2 - chip.height / 2
  const intervals = freeIntervals(safe.y, safe.y + safe.height, x, x + chip.width, input.obstacles, G.margin)
  const y = nearestTop(intervals, desired, chip.height, 0)
  return y === null ? base : { ...base, chip: { x, y } }
}

/** Columna de etiquetas sin cruces dentro del área segura, degradando 4→3→2→0 con histéresis. */
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
  // Con líneas, el origen tiene que verse dentro del área segura; acoplada no hay líneas.
  if (!docked && !containsPoint(safeArea, anchor.x, anchor.y)) return chipLayout(input, fallbackSide)

  const best = (side: Side, slack: number, cap = Number.POSITIVE_INFINITY): Fit | null => {
    for (const count of counts) {
      if (count > cap) continue
      const fit = fitColumn(input, side, count, slack)
      if (fit) return fit
    }
    return null
  }
  // Con la cantidad anterior, crecer exige holgura (no salta 3↔4 ni chip↔líneas en el borde).
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
    // Cambiar de lado solo si el otro muestra más etiquetas con holgura (o si el actual no cabe).
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
