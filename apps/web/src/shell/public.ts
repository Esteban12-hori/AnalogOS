/**
 * API del armazón que las features PUEDEN importar (solo lectura). Cualquier otra cosa de
 * `shell/` es interna del integrador. Ver docs/BUILD_CONTRACTS.md.
 */
export type { AppData } from './appData'
export { geologyStateOf, hasGeologyFor, isFixtureSnapshot } from './appData'
export { announce, type AnnouncementKind } from './announce'
export { GLYPH, GLYPH_MEANING, type GlyphName } from './glyphs'
export { prefersReducedMotion, useReducedMotion } from './useReducedMotion'
export { railWidth, sheetDetentHeights, stageTramo, viewportLayout, type DetentId, type StageTramo, type ViewportLayout } from './layout'
export { useViewportLayout } from './useViewportLayout'
