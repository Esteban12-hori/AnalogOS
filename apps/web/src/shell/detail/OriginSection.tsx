/**
 * Pestaña «Origen» de la ficha (ADR-008): de dónde sale el sitio y qué antecedentes publicados
 * tiene. Es el bloque «Origen y antecedentes» de la ficha del equipo (CandidateDetails, retirada
 * al integrar; ADR-013) con sus mismos textos: origen en la búsqueda o referencia conocida,
 * prioridad topográfica (que solo ordena la preselección), revisión bibliográfica y coincidencias
 * con su fuente. Un fixture no inventa metadata.
 */
import type { CandidateSite, PrecedentCatalog } from '../../domain/contracts'
import { countryLabels, isReference, literatureLabels, matchDetails, relationLabels } from '../../domain/discovery'
import { formatArea, formatScore } from '../../domain/formatting'

export function statusLabel(candidate: CandidateSite): string {
  if (candidate.status === 'fixture') return 'Fixture'
  if (isReference(candidate)) return 'Referencia conocida'
  if (candidate.role === 'candidate') return 'Candidato de la búsqueda'
  return candidate.status === 'candidate' ? 'Screening' : candidate.status
}

interface OriginSectionProps {
  candidate: CandidateSite
  precedents: PrecedentCatalog | null
  /** Puesto global entre los candidatos de la búsqueda (la REF no tiene). */
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
        {candidate.country && <div><dt>País</dt><dd>{countryLabels[candidate.country]}</dd></div>}
        <div><dt>Área aproximada</dt><dd>{formatArea(candidate.area_km2)}</dd></div>
        <div><dt>Factibilidad territorial</dt><dd>Pendiente: permisos, acceso, áreas protegidas y propiedad no están evaluados.</dd></div>
      </dl>

      {discovery && review && (
        <section className="origin-section" aria-labelledby={`origin-heading-${candidate.site_id}`}>
          <div className="subheading-row">
            <h3 id={`origin-heading-${candidate.site_id}`}>Origen y antecedentes</h3>
            <span>{literatureLabels[review.status]}</span>
          </div>
          <dl className="origin-list">
            <div>
              <dt>Origen</dt>
              <dd>
                {reference
                  ? `Referencia conocida, tomada del snapshot ${discovery.source_snapshot ?? 'anterior'}. No sale de la búsqueda.`
                  : `Búsqueda por rejilla: ventana ${discovery.window_id}, preselección n.º ${discovery.selection_rank}.`}
              </dd>
            </div>
            {discovery.topographic_priority !== null && (
              <div>
                <dt>Prioridad topográfica</dt>
                <dd>{formatScore(discovery.topographic_priority)} / 100 · solo ordena la preselección; no es el score ni la confianza.</dd>
              </div>
            )}
            <div><dt>Nota</dt><dd>{discovery.note}</dd></div>
            <div>
              <dt>Revisión bibliográfica</dt>
              <dd>{review.note} Catálogo {review.catalog_version}, revisado el {review.reviewed_at}.</dd>
            </div>
          </dl>
          {matches.length > 0 && (
            <ul className="precedent-list">
              {matches.map((match) => (
                <li key={match.precedent_id}>
                  <strong>{match.name}</strong>
                  <span>
                    {relationLabels[match.relation]}
                    {match.points ? `: ${match.points.length} punto(s)` : ''}
                    {match.distance_km !== undefined ? `: ${formatScore(match.distance_km)} km al centro (${match.nearest_point})` : ''}.
                  </span>
                  <small>{match.spatialPrecision}</small>
                  <a href={match.sourceUrl} target="_blank" rel="noreferrer">{match.sourceTitle} ↗</a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {candidate.warnings.length > 0 && (
        <details className="origin-warnings">
          <summary>Advertencias del snapshot · {candidate.warnings.length}</summary>
          <ul>{candidate.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </details>
      )}
    </div>
  )
}
