import type { CandidateSite } from '../domain/contracts'
import { feasibilityLabels, formatScore, shortCandidateName } from '../domain/formatting'
import { rankCandidates } from '../domain/scoring'
import type { ScoredSite } from '../features/engine'

/** Resultados del motor con el perfil de misión activo (mismo perfil que el riel). */
export interface ComparisonMission {
  label: string
  engineVersion: string
  sites: readonly ScoredSite[]
}

export interface ComparisonRow {
  candidate: CandidateSite
  rank: number | null
  similarity: number | null
  confidence: number | null
  stability: number | null
}

export interface ComparisonModel {
  /** «perfil base v2.0.1-preliminary» o «tu misión: … · motor v1.0.0». */
  profileLabel: string
  /** null se lee «por calcular con tu perfil» en Misión y «—» con el perfil base. */
  pendingText: string
  rows: ComparisonRow[]
}

/**
 * Filas de Comparar con el perfil ACTIVO (función pura). En Misión, orden, similitud, confianza
 * y estabilidad salen del motor (`scoring.sites`), nunca del snapshot: así la ficha no muestra
 * dos similitudes distintas para el mismo lugar. La factibilidad y la evidencia no dependen del
 * perfil: son las del snapshot.
 */
export function comparisonModel(candidates: readonly CandidateSite[], baseLabel: string, mission: ComparisonMission | null): ComparisonModel {
  if (mission) {
    const byId = new Map(candidates.map((candidate) => [candidate.site_id, candidate]))
    const rows = mission.sites.flatMap((scored): ComparisonRow[] => {
      const candidate = byId.get(scored.siteId)
      return candidate
        ? [{ candidate, rank: scored.rank, similarity: scored.similarity, confidence: scored.confidence, stability: scored.stability ?? null }]
        : []
    })
    return { profileLabel: `tu misión: ${mission.label} · motor v${mission.engineVersion}`, pendingText: 'por calcular con tu perfil', rows }
  }
  let position = 0
  const rows = rankCandidates([...candidates]).map((candidate) => ({
    candidate,
    rank: candidate.similarity === null ? null : (position += 1),
    similarity: candidate.similarity,
    confidence: candidate.confidence,
    stability: candidate.stability,
  }))
  return { profileLabel: baseLabel, pendingText: '—', rows }
}

interface CandidateComparisonProps {
  candidates: CandidateSite[]
  selectedId: string
  onSelect: (siteId: string) => void
  /** Rótulo del perfil base («perfil base v…»). */
  baseLabel: string
  /** Resultados del motor si Misión está activa con resultados de este perfil; si no, null. */
  mission: ComparisonMission | null
}

export function CandidateComparison({ candidates, selectedId, onSelect, baseLabel, mission }: CandidateComparisonProps) {
  const model = comparisonModel(candidates, baseLabel, mission)
  const figure = (value: number | null) => (value === null ? model.pendingText : formatScore(value))

  return (
    <section id="comparison" className="comparison-section glass" aria-labelledby="comparison-title">
      <div className="comparison-heading">
        <div>
          <span className="section-kicker">Comparación rápida · {model.profileLabel}</span>
          <h2 id="comparison-title">Tres señales, una decisión explicable</h2>
        </div>
        <p>La similitud prioriza. La confianza y la factibilidad impiden confundir prioridad con aprobación.</p>
      </div>
      <div className="comparison-grid">
        {model.rows.map(({ candidate, rank, similarity, confidence, stability }) => {
          const valid = candidate.score_breakdown.filter((item) => item.status === 'valid').length
          return (
            <button
              type="button"
              className={`comparison-card${candidate.site_id === selectedId ? ' selected' : ''}`}
              key={candidate.site_id}
              onClick={() => onSelect(candidate.site_id)}
            >
              <span className="comparison-rank">{rank === null ? '—' : String(rank).padStart(2, '0')}</span>
              <strong>{shortCandidateName(candidate.name)}</strong>
              <span>{feasibilityLabels[candidate.feasibility]}</span>
              <dl>
                <div><dt>Similitud</dt><dd>{figure(similarity)}</dd></div>
                <div><dt>Confianza</dt><dd>{figure(confidence)}</dd></div>
                <div><dt>Estabilidad</dt><dd>{figure(stability)}</dd></div>
                <div><dt>Evidencia</dt><dd>{valid}/{candidate.score_breakdown.length}</dd></div>
              </dl>
            </button>
          )
        })}
      </div>
    </section>
  )
}
