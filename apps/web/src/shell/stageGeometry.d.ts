// Tipos de shell/stageGeometry.js (JavaScript plano para incrustarlo en index.html).
export interface StageGeometry {
  medium: number
  wide: number
  compactHeight: number
  sideSheetMaxHeight: number
  sideSheetWidth: number
  topbarWide: number
  topbarNarrow: number
  banner: number
  gap: number
  dockTall: number
  dockCompact: number
  sheetS0Tall: number
  sheetS0Compact: number
  sheetCompactHeight: number
  sheetS1Fraction: number
  railMin: number
  railMax: number
  railVw: number
  railFull: number
  leftPanel: number
}

export type StageTramo = 'wide' | 'medium' | 'narrow'

export interface BaseInsets {
  top: number
  right: number
  bottom: number
  left: number
}

export const STAGE_GEOMETRY: Readonly<StageGeometry>
export function stageTramo(width: number): StageTramo
export function chromeTop(width: number): number
export function dockHeight(height: number): number
export function sheetS0Height(height: number): number
export function usesSideSheet(width: number, height: number): boolean
export function baseStageInsets(width: number, height: number): BaseInsets
