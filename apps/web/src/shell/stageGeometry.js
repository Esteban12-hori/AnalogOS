// Geometría base del escenario (ADR-008). JavaScript plano y sin imports: el plugin
// loadingHints lo incrusta en index.html para ubicar el póster del globo antes de React.
// Fuente única de las alturas reservadas: shell/shell.css debe usar los mismos valores
// (lo verifica tests/shell.test.ts). Archivo del integrador.
export var STAGE_GEOMETRY = {
  /** Tramos: <medium = hoja; medium–wide = sin panel izquierdo; ≥wide = panel izquierdo. */
  medium: 1100,
  wide: 1440,
  /** Con alto menor: variantes compactas (tarjetas de 112 px, filas de 44 px). */
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
  /** Bandeja S0 de la hoja; compacta con alto < sheetCompactHeight. */
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

/** Alto de la barra superior + aviso científico. */
export function chromeTop(width) {
  var g = STAGE_GEOMETRY
  return (width >= g.medium ? g.topbarWide : g.topbarNarrow) + g.banner
}

/** Alto reservado del dock (≥1100). */
export function dockHeight(height) {
  var g = STAGE_GEOMETRY
  return height < g.compactHeight ? g.dockCompact : g.dockTall
}

/** Alto de la bandeja S0 (<1100). */
export function sheetS0Height(height) {
  var g = STAGE_GEOMETRY
  return height < g.sheetCompactHeight ? g.sheetS0Compact : g.sheetS0Tall
}

/** Hoja lateral: <1100 px de ancho, horizontal y alto ≤500 px. */
export function usesSideSheet(width, height) {
  var g = STAGE_GEOMETRY
  return width < g.medium && height <= g.sideSheetMaxHeight && width > height
}

/**
 * Márgenes base del escenario: Explorar, sin selección, hoja en S0. Fijan el encuadre
 * global del globo, los umbrales globo↔2D y el póster; no cambian al abrir riel u hoja.
 */
export function baseStageInsets(width, height) {
  var g = STAGE_GEOMETRY
  var top = chromeTop(width)
  if (width >= g.medium) return { top: top, right: 0, bottom: dockHeight(height) + 2 * g.gap, left: 0 }
  if (usesSideSheet(width, height)) return { top: top, right: g.sideSheetWidth, bottom: 0, left: 0 }
  return { top: top, right: 0, bottom: sheetS0Height(height), left: 0 }
}
