import type { CandidateSite, MissionProfile, PrecedentCatalog, SearchResults } from '../domain/contracts'
import { ScoreBreakdown } from '../breakdown/ScoreBreakdown'
import type { MarsReference } from '../domain/marsReference'
import type { VisualContextState } from '../data/loadVisualContext'
import { buildExport, splitByRole, countryLabels, isReference, literatureLabels, matchDetails, relationLabels } from '../domain/discovery'
import { VisualContext } from './VisualContext'
import { GeologyContext } from './GeologyContext'
import { selectGeologySite, type GeologyContextState } from '../domain/geologyContext'
import {
  feasibilityLabels,
  formatArea,
  formatScore,
  shortCandidateName,
} from '../domain/formatting'

interface CandidateDetailsProps {
  candidate: CandidateSite
  /** Todos los candidatos: el selector compacto reemplaza a la antigua columna de ranking. */
  candidates: CandidateSite[]
  onSelect: (siteId: string) => void
  profile: MissionProfile
  marsReference: MarsReference | null
  visual: VisualContextState
  /** Contexto geológico opcional; si falta o es inválido la ficha muestra «no disponible». */
  geology: GeologyContextState
  search: SearchResults | null
  precedents: PrecedentCatalog | null
  /** Si existe, la imagen se ve en el mapa 2D y el panel muestra un botón en vez de repetirla. */
  onShowOnMap?: () => void
  /** Abre el planificador con este sector preseleccionado. */
  onEvaluate?: (siteId: string) => void
}

function Metric({ label, value, hint, muted = false }: { label: string; value: string; hint: string; muted?: boolean }) {
  return (
    <div className={`metric${muted ? ' muted' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  )
}

export function CandidateDetails({ candidate, candidates, onSelect, profile, marsReference, visual, geology, search, precedents, onShowOnMap, onEvaluate }: CandidateDetailsProps) {
  const { ranked, references } = splitByRole(candidates)
  const hasGeologyContext = selectGeologySite(geology, candidate).status === 'ready'
  const reference = isReference(candidate)
  const statusLabel = candidate.status === 'fixture' ? 'Fixture'
    : reference ? 'Referencia conocida'
    : candidate.role === 'candidate' ? 'Candidato de la búsqueda'
    : candidate.status === 'candidate' ? 'Screening' : candidate.status
  const discovery = candidate.discovery
  const review = candidate.literature_review
  const matches = matchDetails(candidate, precedents)
  const downloadCandidate = () => {
    // La exportación conserva rol, origen y revisión bibliográfica, y añade el alcance de la búsqueda.
    const blob = new Blob([JSON.stringify(buildExport(candidate, search), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${candidate.site_id}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  return (
    <aside className="details-panel glass" aria-label="Ficha del candidato seleccionado">
      <div className="candidate-switch" role="group" aria-label="Elegir candidato o referencia">
        {[...ranked, ...references].map((item, index) => (
          <button
            type="button"
            key={item.site_id}
            aria-pressed={item.site_id === candidate.site_id}
            onClick={() => onSelect(item.site_id)}
            title={item.name}
          >
            <b>{isReference(item) ? 'REF' : index + 1}</b>
            <span>{shortCandidateName(item.name).split(' — ')[0]}</span>
          </button>
        ))}
      </div>
      <div className="details-header" aria-live="polite">
        <div>
          <span className="section-kicker">Ficha de candidato</span>
          <h2>{shortCandidateName(candidate.name)}</h2>
        </div>
        <div className="detail-actions">
          <span className="fixture-pill">{statusLabel}</span>
          {onEvaluate && <button type="button" onClick={() => onEvaluate(candidate.site_id)}>Evaluar este sector</button>}
          <button type="button" onClick={downloadCandidate}>Descargar ficha</button>
        </div>
      </div>

      <div className="metrics-grid">
        <Metric
          label="Similitud"
          value={candidate.similarity === null ? 'Sin score' : formatScore(candidate.similarity)}
          hint={candidate.similarity === null ? 'Peso válido insuficiente' : 'Ajuste al perfil · 0–100'}
          muted={candidate.similarity === null}
        />
        <Metric label="Confianza" value={formatScore(candidate.confidence)} hint="Calidad asignada por fuente · 0–100" />
        <Metric label="Factibilidad" value={feasibilityLabels[candidate.feasibility]} hint="Preliminar · no es permiso" />
        <Metric
          label="Estabilidad"
          value={candidate.stability === null ? 'Sin calcular' : formatScore(candidate.stability)}
          hint="Pesos perturbados ±20 % · 0–100"
          muted={candidate.stability === null}
        />
      </div>

      <div className="detail-meta">
        {candidate.country && <span><small>País</small><strong>{countryLabels[candidate.country]}</strong></span>}
        <span><small>Área aproximada</small><strong>{formatArea(candidate.area_km2)}</strong></span>
        <span><small>Perfil</small><strong>{profile.version}</strong></span>
      </div>

      {candidate.warnings.length > 0 && (
        <div className="warning-box">
          <strong>Advertencia activa</strong>
          <p>{candidate.warnings[0]}</p>
          {candidate.warnings.length > 1 && (
            <details className="warning-details">
              <summary>{candidate.warnings.length - 1} verificaciones pendientes</summary>
              <ul>{candidate.warnings.slice(1).map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </details>
          )}
        </div>
      )}

      {discovery && review && (
        <section className="details-section origin-section" aria-labelledby="origin-heading">
          <div className="subheading-row">
            <h3 id="origin-heading">Origen y antecedentes</h3>
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

      <VisualContext candidate={candidate} state={visual} onShowOnMap={onShowOnMap} />

      <GeologyContext key={candidate.site_id} candidate={candidate} state={geology} />

      <ScoreBreakdown items={candidate.score_breakdown} marsReference={marsReference} geologyContextAvailable={hasGeologyContext} />

      <section className="details-section two-column-notes">
        <div>
          <h3>Dónde falla la analogía</h3>
          <ul>{candidate.limitations.map((item) => <li key={item}>{hasGeologyContext && item === 'Geología, áreas protegidas, urbano, propiedad y acceso permanecen pendientes de evidencia oficial integrada en ambos países.'
            ? 'La cartografía geológica regional se consulta arriba con sus huecos y límites. La calibración geológica y la evidencia territorial de áreas protegidas, urbano, propiedad y acceso siguen pendientes.'
            : item}</li>)}</ul>
        </div>
        <div>
          <h3>Qué verificar en terreno</h3>
          <ul>{candidate.field_checks.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </section>

      <section className="details-section evidence-section">
        <div className="subheading-row">
          <h3>Evidencia y fuentes</h3>
          <span>{candidate.evidence.length} evidencias</span>
        </div>
        {candidate.evidence.map((evidence) => (
          <a href={evidence.source_url} target="_blank" rel="noreferrer" key={evidence.evidence_id}>
            <span>{evidence.claim}</span>
            <b aria-hidden="true">↗</b>
          </a>
        ))}
      </section>
    </aside>
  )
}
