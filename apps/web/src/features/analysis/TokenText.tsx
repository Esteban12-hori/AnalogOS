/**
 * Texto validado de la IA: el texto tal cual y, en lugar de cada `{{id}}`, una ficha con la cifra
 * que formateó el motor. Solo recibe tramos que ya pasaron la compuerta (eventGate).
 */
import type { ReactNode } from 'react'
import { parseFactId } from './factIds'
import type { ResolvedSegment } from './types'

export interface TokenTextProps {
  segments: readonly ResolvedSegment[]
  /** Dibuja una ficha (la vista completa la hace interactiva). */
  renderFact?: (segment: Extract<ResolvedSegment, { kind: 'fact' }>, index: number) => ReactNode
}

export function TokenText({ segments, renderFact }: TokenTextProps) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.kind === 'text' ? (
          <span key={index}>{segment.text}</span>
        ) : renderFact ? (
          <span key={index}>{renderFact(segment, index)}</span>
        ) : (
          <span key={index} className="analysis-chip is-static" data-fact={segment.id} data-criterion={parseFactId(segment.id).criterionId ?? undefined}>{segment.text}</span>
        ),
      )}
    </>
  )
}
