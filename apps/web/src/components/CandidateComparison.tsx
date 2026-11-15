import type { CandidateSite } from '../domain/contracts'
import { countryLabels, isReference } from '../domain/discovery'
import { feasibilityLabels, formatScore, shortCandidateName } from '../domain/formatting'

export interface ComparisonRow {
  candidate: CandidateSite
  /** Global rank among the search candidates; null for the known reference. */
  rank: number | null
  reference: boolean
  similarity: number | null
  confidence: number
  stability: number | null
}

/**
 * Compare rows (pure function): first the search candidates in their global order,
 * then the known references, which never receive a rank (ADR-008). The figures are always
 * those from the snapshot, without recalculation: Mission has no percentage of its own (ADR-009), so there is no other
 * similarity to display.
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
  /** Sorted candidates followed by the known references. */
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
          <span className="section-kicker">Quick comparison · snapshot not recalculated</span>
          <h2 id="comparison-title">Three signals, one explainable decision</h2>
        </div>
        <p>Similarity prioritizes. Confidence and feasibility keep priority from being mistaken for approval.</p>
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
              <span className="comparison-rank">{reference ? 'REF · Known reference' : rank === null ? '—' : String(rank).padStart(2, '0')}</span>
              <strong>{shortCandidateName(candidate.name)}</strong>
              <span>
                {candidate.country ? `${countryLabels[candidate.country]} · ` : ''}{feasibilityLabels[candidate.feasibility]}
              </span>
              <dl>
                <div><dt>Similarity</dt><dd>{similarity === null ? 'N/A' : formatScore(similarity)}</dd></div>
                <div><dt>Confidence</dt><dd>{formatScore(confidence)}</dd></div>
                <div><dt>Stability</dt><dd>{stability === null ? '—' : formatScore(stability)}</dd></div>
                <div><dt>Evidence</dt><dd>{valid}/{candidate.score_breakdown.length}</dd></div>
              </dl>
            </button>
          )
        })}
      </div>
    </section>
  )
}
