/**
 * Similarity color scale (0–100): red · yellow · blue · green.
 * It only colors similarity; confidence and feasibility are separate metrics and do not use it.
 * The number is always shown: color is never the only signal (WCAG 1.4.1).
 * Green = most similar to Mars with the active profile; it does not mean suitable or approved.
 */
export type SimilarityTone = 'low' | 'mid' | 'good' | 'high'

export const SIMILARITY_SCALE: ReadonlyArray<{ tone: SimilarityTone; min: number; label: string }> = [
  { tone: 'low', min: 0, label: 'low' },
  { tone: 'mid', min: 50, label: 'medium' },
  { tone: 'good', min: 70, label: 'high' },
  { tone: 'high', min: 90, label: 'very high' },
]

/**
 * Tone for a similarity %; `null` if there is no figure (pending calculation, no data, or excluded).
 * The number is classified as displayed (`decimals`): a 69,6 that appears as «70» is blue, as
 * the legend says. By default 1 decimal (formatScore); integer rings pass 0.
 */
export function similarityTone(value: number | null | undefined, decimals = 1): SimilarityTone | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  const factor = 10 ** decimals
  const shown = Math.round(value * factor) / factor
  let tone: SimilarityTone = 'low'
  for (const step of SIMILARITY_SCALE) if (shown >= step.min) tone = step.tone
  return tone
}

/** Accessible band text, e.g. “very high similarity (90–100)”. */
export function similarityToneLabel(value: number | null | undefined, decimals = 1): string | null {
  const tone = similarityTone(value, decimals)
  if (!tone) return null
  const index = SIMILARITY_SCALE.findIndex((step) => step.tone === tone)
  const step = SIMILARITY_SCALE[index]
  const next = SIMILARITY_SCALE[index + 1]
  if (!step) return null
  return `${step.label} similarity (${step.min}–${next ? next.min - 1 : 100})`
}
