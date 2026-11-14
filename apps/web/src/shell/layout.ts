/**
 * Layout del escenario fijo (ADR-008, docs/UX_REDESIGN.md §2.1). Funciones puras: tramo,
 * anchos de paneles, alturas de la hoja y márgenes del escenario según el estado.
 */
import type { StageInsets, UiMode } from '../state/ui'
import {
  STAGE_GEOMETRY,
  baseStageInsets,
  chromeTop,
  sheetS0Height,
  stageTramo,
  usesSideSheet,
  type StageTramo,
} from './stageGeometry.js'

export { STAGE_GEOMETRY, baseStageInsets, chromeTop, stageTramo, usesSideSheet }
export type { StageTramo }

export type DetentId = 'S0' | 'S1' | 'S2'
export const DETENTS: readonly DetentId[] = ['S0', 'S1', 'S2']

export interface ViewportLayout {
  width: number
  height: number
  tramo: StageTramo
  /** Alto < 860 px: tarjetas de 112 px, filas de 44 px y 3 etiquetas Tesla. */
  compact: boolean
  /** <1100 px, horizontal y alto ≤500 px: hoja lateral de 360 px. */
  sideSheet: boolean
}

export function viewportLayout(width: number, height: number): ViewportLayout {
  return {
    width,
    height,
    tramo: stageTramo(width),
    compact: height < STAGE_GEOMETRY.compactHeight,
    sideSheet: usesSideSheet(width, height),
  }
}

/** Riel derecho: clamp(340px, 26vw, 380px). */
export function railWidth(width: number): number {
  const g = STAGE_GEOMETRY
  return Math.round(Math.min(g.railMax, Math.max(g.railMin, width * g.railVw)))
}

/** Alturas visibles de la hoja por detent (px desde el borde inferior). */
export function sheetDetentHeights(width: number, height: number): Record<DetentId, number> {
  const s0 = sheetS0Height(height)
  const s2 = Math.max(s0, height - chromeTop(width))
  const s1 = Math.min(s2, Math.max(s0 + 1, Math.round(height * STAGE_GEOMETRY.sheetS1Fraction)))
  return { S0: s0, S1: s1, S2: s2 }
}

export interface StageLayoutState {
  width: number
  height: number
  mode: UiMode
  /** Riel derecho abierto (≥1100 con un lugar seleccionado). */
  railOpen: boolean
  /** «Ver ficha completa»: riel de 520 px. */
  railFull: boolean
  detent: DetentId
}

/**
 * Márgenes que tapa la UI sobre el escenario en este estado. El globo los aplica como
 * desplazamiento (setViewOffset) y MapLibre como padding; no cambian la escala.
 */
export function stageInsetsFor(state: StageLayoutState): StageInsets {
  const g = STAGE_GEOMETRY
  const { width, height } = state
  const base = baseStageInsets(width, height)
  const tramo = stageTramo(width)
  if (tramo !== 'narrow') {
    const right = state.railOpen ? (state.railFull ? g.railFull : railWidth(width)) + 2 * g.gap : 0
    const left = tramo === 'wide' && state.mode === 'mision' ? g.leftPanel + 2 * g.gap : 0
    return { ...base, right, left }
  }
  if (usesSideSheet(width, height)) return base
  const heights = sheetDetentHeights(width, height)
  // En S2 el escenario queda inert y en pausa: se conserva el encuadre de S1.
  return { ...base, bottom: state.detent === 'S0' ? heights.S0 : heights.S1 }
}

/** Variables CSS que el armazón publica en su raíz (las features las leen, no las escriben). */
export function layoutCssVars(width: number, height: number): Record<string, string> {
  const heights = sheetDetentHeights(width, height)
  return {
    '--rail-w': `${railWidth(width)}px`,
    '--sheet-s0': `${heights.S0}px`,
    '--sheet-s1': `${heights.S1}px`,
    '--sheet-s2': `${heights.S2}px`,
  }
}
