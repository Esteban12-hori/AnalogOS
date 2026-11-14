import { ScoreBreakdown } from '../breakdown/ScoreBreakdown'
import { rankCandidates } from '../domain/scoring'
import type { CandidateSite, MissionProfile } from '../domain/contracts'
import type { MarsReference } from '../domain/marsReference'
import type { VisualContextState } from '../data/loadVisualContext'
import { VisualContext } from './VisualContext'
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
  /** Si existe, la imagen se ve en el mapa 2D y el panel muestra un botón en vez de repetirla. */
  onShowOnMap?: () => void
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

export function CandidateDetails({ candidate, candidates, onSelect, profile, marsReference, visual, onShowOnMap }: CandidateDetailsProps) {
  const statusLabel = candidate.status === 'fixture' ? 'Fixture' : candidate.status === 'candidate' ? 'Screening' : candidate.status
  const downloadCandidate = () => {
    const blob = new Blob([JSON.stringify(candidate, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${candidate.site_id}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  return (
    <aside className="details-panel glass" aria-label="Ficha del candidato seleccionado">
      <div className="candidate-switch" role="group" aria-label="Elegir candidato por rank">
        {rankCandidates(candidates).map((item, index) => (
          <button
            type="button"
            key={item.site_id}
            aria-pressed={item.site_id === candidate.site_id}
            onClick={() => onSelect(item.site_id)}
            title={item.name}
          >
            <b>{index + 1}</b>
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

      <VisualContext candidate={candidate} state={visual} onShowOnMap={onShowOnMap} />

      <ScoreBreakdown items={candidate.score_breakdown} marsReference={marsReference} />

      <section className="details-section two-column-notes">
        <div>
          <h3>Dónde falla la analogía</h3>
          <ul>{candidate.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
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
