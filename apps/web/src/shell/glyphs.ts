/**
 * Glifos con significado fijo (docs/UX_REDESIGN.md §2.4). Usa siempre estas constantes:
 * un mismo símbolo nunca significa dos cosas en el sitio.
 */
export const GLYPH = {
  /** lugar evaluado / valor del sector */
  evaluated: '●',
  /** análogo emblemático, por calcular */
  reference: '◆',
  /** datos insuficientes */
  insufficient: '○',
  /** Jezero (Marte como dato) */
  jezero: '■',
  /** regla del perfil */
  rule: '┆',
  /** solo IA */
  ai: '✦',
  /** en el globo */
  onGlobe: '◉',
  /** sector (área, no pin) */
  sector: '⬡',
  /** más exigente que Jezero */
  moreDemanding: '↗',
  /** menos exigente que Jezero */
  lessDemanding: '↘',
  /** sube el peso */
  weightUp: '↑',
  /** baja el peso */
  weightDown: '↓',
  /** hito cumplido */
  ok: '✓',
  /** hito fallido / error */
  fail: '✕',
} as const

export type GlyphName = keyof typeof GLYPH

/** Texto para lectores de pantalla y leyendas (los glifos van con aria-hidden). */
export const GLYPH_MEANING: Readonly<Record<GlyphName, string>> = {
  evaluated: 'lugar evaluado',
  reference: 'análogo emblemático, por calcular',
  insufficient: 'datos insuficientes',
  jezero: 'Jezero, Marte',
  rule: 'regla del perfil',
  ai: 'interpretación de IA',
  onGlobe: 'en el globo',
  sector: 'sector (área aproximada)',
  moreDemanding: 'más exigente que Jezero',
  lessDemanding: 'menos exigente que Jezero',
  weightUp: 'sube el peso',
  weightDown: 'baja el peso',
  ok: 'cumplido',
  fail: 'fallido',
}
