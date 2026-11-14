import type { CandidateSite } from '../domain/contracts'
import { feasibilityLabels, formatScore, shortCandidateName } from '../domain/formatting'
import { rankCandidates } from '../domain/scoring'

interface CandidateRankingProps {
  candidates: CandidateSite[]
  selectedId: string
  onSelect: (siteId: string) => void
}

export function CandidateRanking({ candidates, selectedId, onSelect }: CandidateRankingProps) {
  const sorted = rankCandidates(candidates)

  return (
    <aside className="ranking-panel" aria-labelledby="ranking-title">
      <div className="panel-heading">
        <span className="section-kicker">Ranking P0</span>
        <h2 id="ranking-title">Candidatos</h2>
        <p>Ordenados por similitud. La confianza se muestra por separado.</p>
      </div>
      <div className="ranking-list">
        {sorted.map((candidate, index) => {
          const selected = candidate.site_id === selectedId
          return (
            <button
              key={candidate.site_id}
              type="button"
              className={`candidate-card${selected ? ' selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onSelect(candidate.site_id)}
            >
              <span className="rank-number">{index + 1}</span>
              <span className="candidate-card-main">
                <strong>{shortCandidateName(candidate.name)}</strong>
                <small>{feasibilityLabels[candidate.feasibility]}</small>
              </span>
              <span className="candidate-score">
                <strong>{candidate.similarity === null ? 'N/D' : formatScore(candidate.similarity)}</strong>
                <small>similitud</small>
              </span>
              <span className="confidence-line" aria-label={`Confianza ${formatScore(candidate.confidence)} de 100`}>
                <i style={{ width: `${candidate.confidence}%` }} />
              </span>
            </button>
          )
        })}
      </div>
      <div className="ranking-note">
        <strong>Interpretación correcta</strong>
        <span>Más alto no significa aprobado. Solo indica ajuste al perfil con este snapshot.</span>
      </div>
    </aside>
  )
}
