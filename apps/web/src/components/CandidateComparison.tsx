import type { CandidateSite } from '../domain/contracts'
import { countryLabels, isReference } from '../domain/discovery'
import { feasibilityLabels, formatScore, shortCandidateName } from '../domain/formatting'

interface CandidateComparisonProps {
  /** Candidatos ordenados seguidos de las referencias conocidas. */
  ranked: CandidateSite[]
  references: CandidateSite[]
  rankOf: Map<string, number>
  selectedId: string
  onSelect: (siteId: string) => void
}

export function CandidateComparison({ ranked, references, rankOf, selectedId, onSelect }: CandidateComparisonProps) {
  return (
    <section id="comparison" className="comparison-section glass" aria-labelledby="comparison-title">
      <div className="comparison-heading">
        <div>
          <span className="section-kicker">Comparación rápida</span>
          <h2 id="comparison-title">Tres señales, una decisión explicable</h2>
        </div>
        <p>La similitud prioriza. La confianza y la factibilidad impiden confundir prioridad con aprobación.</p>
      </div>
      <div className="comparison-grid">
        {[...ranked, ...references].map((candidate) => {
          const valid = candidate.score_breakdown.filter((item) => item.status === 'valid').length
          const reference = isReference(candidate)
          return (
            <button
              type="button"
              className={`comparison-card${candidate.site_id === selectedId ? ' selected' : ''}${reference ? ' reference' : ''}`}
              key={candidate.site_id}
              onClick={() => onSelect(candidate.site_id)}
            >
              <span className="comparison-rank">{reference ? 'Referencia conocida' : `0${rankOf.get(candidate.site_id) ?? ''}`}</span>
              <strong>{shortCandidateName(candidate.name)}</strong>
              <span>
                {candidate.country ? `${countryLabels[candidate.country]} · ` : ''}{feasibilityLabels[candidate.feasibility]}
              </span>
              <dl>
                <div><dt>Similitud</dt><dd>{formatScore(candidate.similarity)}</dd></div>
                <div><dt>Confianza</dt><dd>{formatScore(candidate.confidence)}</dd></div>
                <div><dt>Estabilidad</dt><dd>{formatScore(candidate.stability)}</dd></div>
                <div><dt>Evidencia</dt><dd>{valid}/{candidate.score_breakdown.length}</dd></div>
              </dl>
            </button>
          )
        })}
      </div>
    </section>
  )
}
