/**
 * Trazos de las líneas Tesla (escritorio) y la línea única de móvil. Puro. Va en el chunk
 * diferido: index.ts no lo reexporta (solo sus tipos).
 */
import type { LeaderLayout, LeaderLayoutInput, Rect } from './index'
import { attachOffset, containsPoint, finite, LEADER_GEOMETRY } from './layoutLeaders'

type Point = { x: number; y: number }

function r1(value: number): string {
  return String(Math.round(value * 10) / 10)
}

export interface LeaderPath {
  id: string
  /** Trazo SVG del origen O a la etiqueta: O → bus → fila del título (solo tramos rectos). */
  d: string
  attach: Point
}

/** Trazos de cada etiqueta en modo 'lines'; vacío en 'docked' y 'chip'. */
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
// Móvil (<1100): una sola línea del anillo al borde superior de la hoja (§1 #5, §4.5 S1).
// ---------------------------------------------------------------------------------------------

export interface MobileLeaderInput {
  anchor: { x: number; y: number; radius: number; visible?: number }
  /** Área segura (viewport menos stageInsets): el anillo tiene que verse dentro. */
  safeArea: Rect
  /** Fin de la línea: borde superior de la hoja, alineado con el slot activo (centrado). */
  end: Point
  /** Paneles: la línea se corta antes del primero que cruce (salvo la hoja, donde termina). */
  obstacles: readonly Rect[]
}

export interface MobileLeader {
  from: Point
  to: Point
  d: string
}

/** Parámetro t∈[0,1] en que el segmento p→q entra al rectángulo (Liang–Barsky); null si no lo toca. */
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
 * Una sola línea del borde del anillo al borde superior de la hoja. null si el lugar no se ve,
 * si la hoja queda por encima del anillo (S2) o si la línea sería demasiado corta.
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
  // La línea solo baja (o va de lado, con hoja lateral): nunca sube hacia una hoja en S2.
  if (dy < 0 || distance <= anchor.radius + G.mobileMinLength) return null
  const from = { x: anchor.x + (dx / distance) * anchor.radius, y: anchor.y + (dy / distance) * anchor.radius }
  let t = 1
  for (const obstacle of input.obstacles) {
    if (!finite(obstacle.x, obstacle.y, obstacle.width, obstacle.height)) continue
    // La hoja contiene el punto justo después del final: es el destino, no un obstáculo.
    if (containsPoint(obstacle, end.x + Math.sign(dx) * 0.5, end.y + Math.sign(dy) * 0.5)) continue
    const entry = segmentEntry(from, end, obstacle)
    if (entry !== null && entry < t) t = entry
  }
  const span = Math.hypot(end.x - from.x, end.y - from.y)
  const length = span * t
  // Recortada por un panel: termina 4 px antes, sin tocarlo.
  const reach = t < 1 ? length - Math.min(4, length) : length
  if (reach < G.mobileMinLength) return null
  const to = { x: from.x + ((end.x - from.x) / span) * reach, y: from.y + ((end.y - from.y) / span) * reach }
  return { from, to, d: `M${r1(from.x)} ${r1(from.y)}L${r1(to.x)} ${r1(to.y)}` }
}
