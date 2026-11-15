/**
 * Fixed stage layout (ADR-014, docs/UX_REDESIGN.md §2.1). Pure functions: breakpoint,
 * panel widths, sheet heights and stage margins depending on the state.
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
  /** Height < 860 px: 112 px cards, 44 px rows and 3 Tesla labels. */
  compact: boolean
  /** <1100 px, landscape and height ≤500 px: 360 px side sheet. */
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

/** Visible sheet heights per detent (px from the bottom edge). */
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
  /** Right rail open (≥1100 with a selected place). */
  railOpen: boolean
  /** “See full details”: 520 px rail. */
  railFull: boolean
  detent: DetentId
}

/**
 * Margins that the UI covers over the stage in this state. The globe applies them as an
 * offset (setViewOffset) and MapLibre as padding; they do not change the scale.
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
  // In S2 the stage is left inert and paused: the S1 framing is preserved.
  return { ...base, bottom: state.detent === 'S0' ? heights.S0 : heights.S1 }
}

/** CSS variables that the shell publishes on its root (features read them, they do not write them). */
export function layoutCssVars(width: number, height: number): Record<string, string> {
  const heights = sheetDetentHeights(width, height)
  return {
    '--rail-w': `${railWidth(width)}px`,
    '--sheet-s0': `${heights.S0}px`,
    '--sheet-s1': `${heights.S1}px`,
    '--sheet-s2': `${heights.S2}px`,
  }
}
