// Base stage geometry (ADR-014). Plain JavaScript with no imports: the loadingHints plugin
// embeds it in index.html to position the globe poster before React.
// Single source for the reserved heights: shell/shell.css must use the same values
// (verified by tests/shell.test.ts). Integrator's file.
export var STAGE_GEOMETRY = {
  /** Ranges: <medium = sheet; medium–wide = no left panel; ≥wide = left panel. */
  medium: 1100,
  wide: 1440,
  /** With smaller height: compact variants (112 px cards, 44 px rows). */
  compactHeight: 860,
  /** Horizontal bajo: hoja lateral. */
  sideSheetMaxHeight: 500,
  sideSheetWidth: 360,
  topbarWide: 56,
  topbarNarrow: 52,
  banner: 22,
  gap: 12,
  dockTall: 256,
  dockCompact: 218,
  /** S0 tray of the sheet; compact when height < sheetCompactHeight. */
  sheetS0Tall: 248,
  sheetS0Compact: 216,
  sheetCompactHeight: 700,
  /** S1 = 54dvh. */
  sheetS1Fraction: 0.54,
  railMin: 340,
  railMax: 380,
  railVw: 0.26,
  railFull: 520,
  leftPanel: 360
}

/** 'wide' (≥1440) · 'medium' (1100–1439) · 'narrow' (<1100). */
export function stageTramo(width) {
  var g = STAGE_GEOMETRY
  return width >= g.wide ? 'wide' : width >= g.medium ? 'medium' : 'narrow'
}

/** Height of the top bar + scientific notice. */
export function chromeTop(width) {
  var g = STAGE_GEOMETRY
  return (width >= g.medium ? g.topbarWide : g.topbarNarrow) + g.banner
}

/** Reserved height of the dock (≥1100). */
export function dockHeight(height) {
  var g = STAGE_GEOMETRY
  return height < g.compactHeight ? g.dockCompact : g.dockTall
}

/** Height of the S0 tray (<1100). */
export function sheetS0Height(height) {
  var g = STAGE_GEOMETRY
  return height < g.sheetCompactHeight ? g.sheetS0Compact : g.sheetS0Tall
}

/** Side sheet: <1100 px wide, landscape and height ≤500 px. */
export function usesSideSheet(width, height) {
  var g = STAGE_GEOMETRY
  return width < g.medium && height <= g.sideSheetMaxHeight && width > height
}

/**
 * Base stage margins: Explore, no selection, sheet in S0. They set the overall
 * framing of the globe, the globe↔2D thresholds and the poster; they do not change when opening the rail or the sheet.
 */
export function baseStageInsets(width, height) {
  var g = STAGE_GEOMETRY
  var top = chromeTop(width)
  if (width >= g.medium) return { top: top, right: 0, bottom: dockHeight(height) + 2 * g.gap, left: 0 }
  if (usesSideSheet(width, height)) return { top: top, right: g.sideSheetWidth, bottom: 0, left: 0 }
  return { top: top, right: 0, bottom: sheetS0Height(height), left: 0 }
}
