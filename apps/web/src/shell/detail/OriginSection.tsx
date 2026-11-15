/**
 * “Origin” tab of the site sheet (ADR-008): where the site comes from and which published precedents
 * it has. It is the “Origin and precedents” block of the team's sheet (CandidateDetails, removed when
 * integrating; ADR-013) with the same content: origin in the search or known reference, topographic
 * priority (which only orders the preselection), literature review and matches with their source.
 * A fixture does not invent metadata.
 */
import type { CandidateSite, PrecedentCatalog } from '../../domain/contracts'
import { countryLabels, isReference, literatureLabels, matchDetails, relationLabels } from '../../domain/discovery'
import { formatArea, formatScore } from '../../domain/formatting'
import { SPANISH_SOURCE_TITLES, displaySource } from '../../i18n/sourceText'

export function statusLabel(candidate: CandidateSite): string {
  if (candidate.status === 'fixture') return 'Fixture'
  if (isReference(candidate)) return 'Known reference'
  if (candidate.role === 'candidate') return 'Search candidate'
  return candidate.status === 'candidate' ? 'Screening' : candidate.status
}

interface OriginSectionProps {
  candidate: CandidateSite
  precedents: PrecedentCatalog | null
  /** Global rank among the search candidates (the REF has none). */
  rank: number | null
}

export function OriginSection({ candidate, precedents, rank }: OriginSectionProps) {
  const reference = isReference(candidate)
  const discovery = candidate.discovery
  const review = candidate.literature_review
  const matches = matchDetails(candidate, precedents)
  return (
    <div className="origin-tab">
      <p className="origin-badge">
        <b>{reference ? 'REF' : rank ?? '—'}</b> <span>{statusLabel(candidate)}</span>
      </p>
      <dl className="origin-list">
        {candidate.country && <div><dt>Country</dt><dd>{countryLabels[candidate.country]}</dd></div>}
        <div><dt>Approximate area</dt><dd>{formatArea(candidate.area_km2)}</dd></div>
        <div><dt>Territorial feasibility</dt><dd>Pending: permits, access, protected areas and ownership are not evaluated.</dd></div>
      </dl>

      {discovery && review && (
        <section className="origin-section" aria-labelledby={`origin-heading-${candidate.site_id}`}>
          <div className="subheading-row">
            <h3 id={`origin-heading-${candidate.site_id}`}>Origin and precedents</h3>
            <span>{literatureLabels[review.status]}</span>
          </div>
          <dl className="origin-list">
            <div>
              <dt>Origin</dt>
              <dd>
                {reference
                  ? `Known reference, taken from snapshot ${discovery.source_snapshot ?? 'previous'}. It does not come from the search.`
                  : `Grid search: window ${discovery.window_id}, preselection no. ${discovery.selection_rank}.`}
              </dd>
            </div>
            {discovery.topographic_priority !== null && (
              <div>
                <dt>Topographic priority</dt>
                <dd>{formatScore(discovery.topographic_priority)} / 100 · it only orders the preselection; it is not the score or the confidence.</dd>
              </div>
            )}
            <div><dt>Note</dt><dd>{displaySource(discovery.note)}</dd></div>
            <div>
              <dt>Literature review</dt>
              <dd>{displaySource(review.note)} Catalog {review.catalog_version}, reviewed on {review.reviewed_at}.</dd>
            </div>
          </dl>
          {matches.length > 0 && (
            <ul className="precedent-list">
              {matches.map((match) => (
                <li key={match.precedent_id}>
                  <strong>{displaySource(match.name)}</strong>
                  <span>
                    {relationLabels[match.relation]}
                    {match.points ? `: ${match.points.length} point(s)` : ''}
                    {match.distance_km !== undefined ? `: ${formatScore(match.distance_km)} km from the center (${match.nearest_point})` : ''}.
                  </span>
                  <small>{displaySource(match.spatialPrecision)}</small>
                  <a href={match.sourceUrl} target="_blank" rel="noreferrer" lang={SPANISH_SOURCE_TITLES.has(match.sourceTitle) ? 'es' : undefined}>{displaySource(match.sourceTitle)} ↗</a>
                  {SPANISH_SOURCE_TITLES.has(match.sourceTitle) && <small> (original title, Spanish)</small>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {candidate.warnings.length > 0 && (
        <details className="origin-warnings">
          <summary>Snapshot warnings · {candidate.warnings.length}</summary>
          <ul>{candidate.warnings.map((warning) => <li key={warning}>{displaySource(warning)}</li>)}</ul>
        </details>
      )}
    </div>
  )
}
