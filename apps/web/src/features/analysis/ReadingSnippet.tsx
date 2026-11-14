/**
 * Fragmento ✦ de la Lectura para otras superficies (§5.4): el `summary` de un lugar (línea ✦ de
 * S1) o el primer `insight` de un criterio («✦ Lectura para tu misión» del riel). No dibuja nada
 * si no hay texto validado: nunca ocupa espacio con un relleno.
 */
import { GLYPH } from '../../shell/public'
import type { CriterionId } from '../../domain/contracts'
import { useActiveReading } from './readingStore'
import { TokenText } from './TokenText'
import type { Reading, ReadingBlock } from './types'

export interface ReadingSnippetProps {
  siteId: string
  /** Con criterio: primer insight de ese criterio; sin criterio: el summary del lugar. */
  criterionId?: CriterionId
}

export function pickSnippet(reading: Reading | null, siteId: string, criterionId?: CriterionId): ReadingBlock | null {
  if (!reading || reading.ai.status === 'stale') return null
  const blocks = reading.ai.blocks
  if (criterionId) return blocks.find((block) => block.type === 'insight' && block.siteId === siteId && block.criterionId === criterionId) ?? null
  return blocks.find((block) => block.type === 'summary' && block.siteId === siteId) ?? null
}

export function ReadingSnippet({ siteId, criterionId }: ReadingSnippetProps) {
  const reading = useActiveReading()
  const block = pickSnippet(reading, siteId, criterionId)
  if (!reading || !block) return null
  const label = reading.ai.source === 'pregenerated' ? 'Texto pregenerado · no científico' : 'IA · interpreta, no puntúa'
  return (
    <p className="analysis-snippet">
      <span className="analysis-snippet-label"><span aria-hidden="true">{GLYPH.ai}</span> {label}:</span>{' '}
      <TokenText segments={block.segments} />
    </p>
  )
}
