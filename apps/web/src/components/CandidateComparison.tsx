import type { CandidateSite } from '../domain/contracts'
import { feasibilityLabels, formatScore, shortCandidateName } from '../domain/formatting'
import { rankCandidates } from '../domain/scoring'

interface CandidateComparisonProps {
  candidates: CandidateSite[]
  selectedId: string
  onSelect: (siteId: string) => void
}

export function CandidateComparison({ candidates, selectedId, onSelect }: CandidateComparisonProps) {
  const sorted = rankCandidates(candidates)

  return (
    <section id="comparison" className="comparison-section" aria-labelledby="comparison-title">
      <div className="comparison-heading">
        <div>
          <span className="section-kicker">Comparación rápida</span>
          <h2 id="comparison-title">Tres señales, una decisión explicable</h2>
        </div>
        <p>La similitud prioriza. La confianza y la factibilidad impiden confundir prioridad con aprobación.</p>
      </div>
      <div className="comparison-grid">
        {sorted.map((candidate, index) => {
          const valid = candidate.score_breakdown.filter((item) => item.status === 'valid').length
          return (
            <button
              type="button"
              className={`comparison-card${candidate.site_id === selectedId ? ' selected' : ''}`}
              key={candidate.site_id}
              onClick={() => onSelect(candidate.site_id)}
            >
              <span className="comparison-rank">0{index + 1}</span>
              <strong>{shortCandidateName(candidate.name)}</strong>
              <span>{feasibilityLabels[candidate.feasibility]}</span>
              <dl>
                <div><dt>Similitud</dt><dd>{formatScore(candidate.similarity)}</dd></div>
                <div><dt>Confianza</dt><dd>{formatScore(candidate.confidence)}</dd></div>
                <div><dt>Estabilidad</dt><dd>{formatScore(candidate.stability)}</dd></div>
                <div><dt>Evidencia</dt><dd>{valid}/7</dd></div>
              </dl>
            </button>
          )
        })}
      </div>
    </section>
  )
}
