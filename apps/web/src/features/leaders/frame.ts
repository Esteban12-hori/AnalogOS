/**
 * Un cuadro de las líneas Tesla: de la escena (contenido medido + layout asentado) y del cuadro
 * del escenario (proyección + ancla) a posiciones en pantalla. Puro; lo llama el controlador en
 * cada cuadro de cámara sin pasar por React.
 */
import type { CandidateGeometry } from '../../domain/contracts'
import type { StageInsets } from '../../state/ui'
import type { Rect } from './index'
import { layoutLeaders } from './layoutLeaders'
import { layoutMobileLeader, leaderPaths, type MobileLeader } from './leaderPaths'
import { polygonWidthFraction, resolveAnchor, safeAreaFor, sheetEdge, type StageFrameInput } from './projector'

export type Size = { width: number; height: number }

/** Lo que cambia con el contenido o el layout asentado (nunca por cuadro). */
export interface LeaderScene {
  siteId: string
  geometry: CandidateGeometry
  /** <1100 px: una sola línea hasta el borde superior de la hoja. */
  narrow: boolean
  /** Horizontal bajo: hoja lateral de 360 px. */
  sideSheet: boolean
  compact: boolean
  viewport: Size
  insets: StageInsets
  obstacles: readonly Rect[]
  /** Etiquetas medidas, en orden de prioridad (vacío en móvil). */
  labels: ReadonlyArray<{ id: string; width: number; height: number }>
  header: Size | null
  chip: Size | null
}

/** Memoria de histéresis entre cuadros. */
export interface LeaderMemory {
  side: 'left' | 'right' | null
  count: number | undefined
}

export const FRESH_MEMORY: LeaderMemory = Object.freeze({ side: null, count: undefined })

/** 'off' = el escenario no publica o no hay nada que dibujar. */
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
  // Sin proyección ni ancla el escenario no sabe dónde está el sector: no se dibuja nada.
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
    // Sin ancla (el sector quedó detrás del globo o fuera del encuadre): visible 0 → chip.
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

/** Memoria para el cuadro siguiente: el lado y la cantidad mostrados (un 'off' no la borra). */
export function nextMemory(previous: LeaderMemory, frame: LeaderFrame): LeaderMemory {
  if (frame.mode === 'off' || frame.mode === 'mobile') return previous
  return { side: frame.side, count: frame.count }
}
