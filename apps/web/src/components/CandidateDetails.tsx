import type { CandidateSite, DataManifest, MissionProfile } from '../domain/contracts'
import {
  criterionLabels,
  criterionStatusLabels,
  feasibilityLabels,
  formatArea,
  formatRawValue,
  formatScore,
  shortCandidateName,
} from '../domain/formatting'

interface CandidateDetailsProps {
  candidate: CandidateSite
  manifest: DataManifest
  profile: MissionProfile
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

export function CandidateDetails({ candidate, manifest, profile }: CandidateDetailsProps) {
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
    <aside className="details-panel" aria-live="polite">
      <div className="details-header">
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
        <span><small>Snapshot</small><strong>{manifest.snapshot_version}</strong></span>
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

      <section className="details-section" aria-labelledby="breakdown-heading">
        <div className="subheading-row">
          <h3 id="breakdown-heading">Desglose del score</h3>
          <span>{candidate.score_breakdown.filter((item) => item.status === 'valid').length}/{candidate.score_breakdown.length} criterios válidos</span>
        </div>
        <div className="criteria-list">
          {candidate.score_breakdown.map((item) => {
            const percentage = item.normalized_similarity === null ? 0 : item.normalized_similarity * 100
            return (
              <div className={`criterion-row status-${item.status}`} key={item.criterion_id}>
                <div className="criterion-topline">
                  <strong>{criterionLabels[item.criterion_id] ?? item.criterion_id}</strong>
                  <span>{item.normalized_similarity === null ? criterionStatusLabels[item.status] : `${formatScore(percentage)} %`}</span>
                </div>
                <div className="criterion-track" aria-hidden="true"><i style={{ width: `${percentage}%` }} /></div>
                <div className="criterion-caption">
                  <span>{formatRawValue(item.raw_value, item.unit)}</span>
                  <span>Peso {formatScore(item.weight * 100)} %</span>
                  <span>Calidad {formatScore(item.quality * 100)} %</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

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
