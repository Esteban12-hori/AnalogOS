import type { CandidateSite } from '../domain/contracts'
import { countryLabels, isReference } from '../domain/discovery'
import { feasibilityLabels, formatScore, shortCandidateName } from '../domain/formatting'

export interface ComparisonRow {
  candidate: CandidateSite
  /** Puesto global entre los candidatos de la búsqueda; null para la referencia conocida. */
  rank: number | null
  reference: boolean
  similarity: number | null
  confidence: number
  stability: number | null
}

/**
 * Filas de Comparar (función pura): primero los candidatos de la búsqueda en su orden global,
 * después las referencias conocidas, que nunca reciben puesto (ADR-008). Las cifras son siempre
 * las del snapshot, sin recalcular: Misión no tiene un % propio (ADR-009), así que no hay otra
 * similitud que mostrar.
 */
export function comparisonRows(ranked: readonly CandidateSite[], references: readonly CandidateSite[], rankOf: ReadonlyMap<string, number>): ComparisonRow[] {
  return [...ranked, ...references].map((candidate) => {
    const reference = isReference(candidate)
    return {
      candidate,
      rank: reference ? null : rankOf.get(candidate.site_id) ?? null,
      reference,
      similarity: candidate.similarity,
      confidence: candidate.confidence,
      stability: candidate.stability,
    }
  })
}

interface CandidateComparisonProps {
  /** Candidatos ordenados seguidos de las referencias conocidas. */
  ranked: CandidateSite[]
  references: CandidateSite[]
  rankOf: Map<string, number>
  selectedId: string
  onSelect: (siteId: string) => void
}

export function CandidateComparison({ ranked, references, rankOf, selectedId, onSelect }: CandidateComparisonProps) {
  const rows = comparisonRows(ranked, references, rankOf)
  return (
    <section id="comparison" className="comparison-section glass" aria-labelledby="comparison-title">
      <div className="comparison-heading">
        <div>
          <span className="section-kicker">Comparación rápida · snapshot sin recalcular</span>
          <h2 id="comparison-title">Tres señales, una decisión explicable</h2>
        </div>
        <p>La similitud prioriza. La confianza y la factibilidad impiden confundir prioridad con aprobación.</p>
      </div>
      <div className="comparison-grid">
        {rows.map(({ candidate, rank, reference, similarity, confidence, stability }) => {
          const valid = candidate.score_breakdown.filter((item) => item.status === 'valid').length
          return (
            <button
              type="button"
              className={`comparison-card${candidate.site_id === selectedId ? ' selected' : ''}${reference ? ' reference' : ''}`}
              key={candidate.site_id}
              aria-pressed={candidate.site_id === selectedId}
              onClick={() => onSelect(candidate.site_id)}
            >
              <span className="comparison-rank">{reference ? 'REF · Referencia conocida' : rank === null ? '—' : String(rank).padStart(2, '0')}</span>
              <strong>{shortCandidateName(candidate.name)}</strong>
              <span>
                {candidate.country ? `${countryLabels[candidate.country]} · ` : ''}{feasibilityLabels[candidate.feasibility]}
              </span>
              <dl>
                <div><dt>Similitud</dt><dd>{similarity === null ? 'N/D' : formatScore(similarity)}</dd></div>
                <div><dt>Confianza</dt><dd>{formatScore(confidence)}</dd></div>
                <div><dt>Estabilidad</dt><dd>{stability === null ? '—' : formatScore(stability)}</dd></div>
                <div><dt>Evidencia</dt><dd>{valid}/{candidate.score_breakdown.length}</dd></div>
              </dl>
            </button>
          )
        })}
      </div>
    </section>
  )
}
