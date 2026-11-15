import { tCommon } from '../i18n/messages/common'
import { localizedRecord } from '../domain/localizedLabels'

/**
 * Glyphs with a fixed meaning (docs/UX_REDESIGN.md §2.4). Always use these constants:
 * the same symbol never means two different things on the site.
 */
export const GLYPH = {
  /** evaluated place / sector value */
  evaluated: '●',
  /** emblematic analog, yet to be computed */
  reference: '◆',
  /** insufficient data */
  insufficient: '○',
  /** Jezero (Marte como dato) */
  jezero: '■',
  /** profile rule */
  rule: '┆',
  /** AI only */
  ai: '✦',
  /** on the globe */
  onGlobe: '◉',
  /** sector (area, not a pin) */
  sector: '⬡',
  /** more demanding than Jezero */
  moreDemanding: '↗',
  /** less demanding than Jezero */
  lessDemanding: '↘',
  /** raises the weight */
  weightUp: '↑',
  /** lowers the weight */
  weightDown: '↓',
  /** hito cumplido */
  ok: '✓',
  /** hito fallido / error */
  fail: '✕',
} as const

export type GlyphName = keyof typeof GLYPH

/** Text for screen readers and legends (the glyphs use aria-hidden), in the current language. */
export const GLYPH_MEANING: Readonly<Record<GlyphName, string>> = localizedRecord(Object.keys(GLYPH) as GlyphName[], (name) => tCommon(`glyph.${name}`))
