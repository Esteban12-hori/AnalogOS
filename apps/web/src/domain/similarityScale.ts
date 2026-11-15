/**
 * Escala de color de la similitud (0–100): rojo · amarillo · azul · verde.
 * Solo colorea la similitud; confianza y factibilidad son métricas aparte y no la usan.
 * El número siempre se muestra: el color nunca es la única señal (WCAG 1.4.1).
 * Verde = más parecido a Marte con el perfil activo; no significa apto ni aprobado.
 */
export type SimilarityTone = 'low' | 'mid' | 'good' | 'high'

export const SIMILARITY_SCALE: ReadonlyArray<{ tone: SimilarityTone; min: number; label: string }> = [
  { tone: 'low', min: 0, label: 'baja' },
  { tone: 'mid', min: 50, label: 'media' },
  { tone: 'good', min: 70, label: 'alta' },
  { tone: 'high', min: 90, label: 'muy alta' },
]

/**
 * Tono para un % de similitud; `null` si no hay cifra (por calcular, sin datos o excluido).
 * Se clasifica el número tal como se muestra (`decimals`): un 69,6 que se ve «70» es azul, como
 * dice la leyenda. Por defecto 1 decimal (formatScore); los anillos enteros pasan 0.
 */
export function similarityTone(value: number | null | undefined, decimals = 1): SimilarityTone | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  const factor = 10 ** decimals
  const shown = Math.round(value * factor) / factor
  let tone: SimilarityTone = 'low'
  for (const step of SIMILARITY_SCALE) if (shown >= step.min) tone = step.tone
  return tone
}

/** Texto accesible del tramo, p. ej. «similitud muy alta (90–100)». */
export function similarityToneLabel(value: number | null | undefined, decimals = 1): string | null {
  const tone = similarityTone(value, decimals)
  if (!tone) return null
  const index = SIMILARITY_SCALE.findIndex((step) => step.tone === tone)
  const step = SIMILARITY_SCALE[index]
  const next = SIMILARITY_SCALE[index + 1]
  if (!step) return null
  return `similitud ${step.label} (${step.min}–${next ? next.min - 1 : 100})`
}
