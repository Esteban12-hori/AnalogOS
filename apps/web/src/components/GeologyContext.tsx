import { useState } from 'react'
import type { CandidateSite } from '../domain/contracts'
import {
  AVAILABILITY_HINT,
  AVAILABILITY_LABEL,
  buildGeologyExport,
  formatCoverage,
  formatScaleLabel,
  geologyExportFileName,
  selectGeologySite,
  type GeologyContextState,
  type GeologySelection,
} from '../domain/geologyContext'
import { shortCandidateName } from '../domain/formatting'

interface GeologyContextViewProps {
  candidateName: string
  selection: GeologySelection
  onDownload?: () => void
  downloadError?: string | null
}

const stamp = (value: string) => value.replace('T', ' ').replace('Z', ' UTC')

/** Vista pura de la ficha: recibe el estado ya resuelto, para probarla sin navegador. */
export function GeologyContextView({ candidateName, selection, onDownload, downloadError }: GeologyContextViewProps) {
  const heading = (
    <div className="subheading-row">
      <h3 id="geology-heading">Contexto geológico</h3>
      <span>Cartografía regional · no mide el terreno</span>
    </div>
  )
  if (selection.status !== 'ready') {
    const message = selection.status === 'loading' ? 'Cargando contexto geológico…' : `Contexto geológico no disponible. ${selection.reason}`
    return (
      <section className="details-section geology-context" aria-labelledby="geology-heading">
        {heading}
        <p className="geology-unavailable" role="status">{message} El ranking, la ficha y la evaluación no dependen de él.</p>
      </section>
    )
  }

  const { site, source, context } = selection
  const f = site.area_fractions
  const scale = formatScaleLabel(source.scale_denominator)
  const cited = source.requests.filter((request) => site.request_ids.includes(request.request_id) || request.role === 'chile_catalog_metadata')
  const rejected = site.geometry_diagnostics.filter((item) => item.status === 'rejected')
  const repaired = site.geometry_diagnostics.filter((item) => item.status !== 'rejected')
  const bar = [
    ['unambiguous', f.covered_unambiguous, 'cubierto sin ambigüedad'],
    ['ambiguous', f.covered_ambiguous, 'cubierto con solape entre unidades'],
    ['unusable', f.unusable_upper_bound, 'zona no utilizable (cota superior)'],
    ['unmapped', f.unmapped, 'sin cobertura'],
  ] as const

  return (
    <section className="details-section geology-context" aria-labelledby="geology-heading" data-availability={site.availability}>
      {heading}
      <div className={`geology-summary geology-state-${site.availability}`}>
        <div className="geology-state">
          <strong>{AVAILABILITY_LABEL[site.availability]}</strong>
          <span>Escala {scale}</span>
        </div>
        <p>{AVAILABILITY_HINT[site.availability]}</p>
        <div
          className="geology-bar"
          role="img"
          aria-label={`Reparto del área de ${shortCandidateName(candidateName)}: ${bar.map(([, value, label]) => `${label} ${formatCoverage(value)}`).join('; ')}.`}
        >
          {bar.map(([key, value]) => <span key={key} className={`geology-bar-${key}`} style={{ width: `${value * 100}%` }} />)}
        </div>
        <dl className="geology-figures">
          <div><dt>Cubierto por la capa</dt><dd>{formatCoverage(f.covered_total)}</dd></div>
          <div><dt>Sin cobertura</dt><dd>{formatCoverage(f.unmapped)}</dd></div>
          <div><dt>Solape entre unidades distintas</dt><dd>{formatCoverage(f.covered_ambiguous)}</dd></div>
          <div><dt>Con unidad sin descripción</dt><dd>{formatCoverage(f.covered_by_units_without_description)}</dd></div>
          {f.unusable_upper_bound > 0 && <div><dt>Zona no utilizable (cota superior)</dt><dd>{formatCoverage(f.unusable_upper_bound)}</dd></div>}
        </dl>
        <p className="geology-source-line">
          {source.dataset_name} · Autoridad: {source.authority_original} · Distribuye: {source.distributor}.
        </p>
      </div>
      <p className="geology-note">
        El porcentaje es cobertura del mapa, no precisión, confianza ni aptitud, y no se confirmó en campo. «Sin cobertura»
        significa que esta capa no tiene polígono allí, no que no haya rocas. La geología del puntaje sigue sin calibrar:
        este contexto no implica compatibilidad planetaria calibrada ni cambia similitud, confianza ni factibilidad.
      </p>

      <details className="geology-details">
        <summary>Unidades cartografiadas ({site.units.length})</summary>
        {site.units.length === 0 ? (
          <p className="geology-empty">Esta capa no tiene unidades dentro del sector.</p>
        ) : (
          <ul className="geology-units">
            {site.units.map((unit) => (
              <li key={unit.unit_id}>
                <div className="geology-unit-head">
                  {unit.code && <code>{unit.code}</code>}
                  <strong>{unit.name ?? 'Sin nombre en la fuente'}</strong>
                </div>
                <span className="geology-unit-share">
                  {formatCoverage(unit.fraction_including_overlap)} del sector
                  {unit.fraction_in_ambiguity > 0 && ` (${formatCoverage(unit.fraction_unambiguous)} sin solape)`}
                </span>
                <p>{unit.description ?? 'Sin descripción en la fuente: no se completa ni se infiere.'}</p>
                <small>
                  {unit.sheet ? `Hoja ${unit.sheet} · ` : ''}entidades de origen: {unit.source_features.map((item) => item.feature_id).join(', ')}
                </small>
              </li>
            ))}
          </ul>
        )}
        {site.units.length > 0 && <p className="geology-empty">Los porcentajes de unidades pueden sumar más que la cobertura porque incluyen los solapes.</p>}
      </details>

      <details className="geology-details">
        <summary>Fuente, escala y procedencia</summary>
        <dl className="geology-provenance">
          <div><dt>Autoridad</dt><dd>{source.authority_original}</dd></div>
          <div><dt>Distribuye</dt><dd>{source.distributor}</dd></div>
          <div><dt>Capa</dt><dd>{source.layer}</dd></div>
          <div><dt>Escala</dt><dd>{scale} (denominador cartográfico; no es resolución en metros)</dd></div>
          <div><dt>CRS</dt><dd>{source.crs_declared}</dd></div>
          <div><dt>Licencia</dt><dd>{source.license.name}. {source.license.scope}</dd></div>
          <div><dt>Atribución</dt><dd>{source.attribution}</dd></div>
          <div><dt>Fecha del mapa</dt><dd>No informada por la fuente. {source.map_date_note}</dd></div>
          {source.catalog_modified_at && <div><dt>Registro del catálogo</dt><dd>{source.catalog_modified_at} (no es la fecha del levantamiento)</dd></div>}
          {cited.map((request) => (
            <div key={request.request_id}>
              <dt>Descarga</dt>
              <dd>
                {stamp(request.acquired_at)} · <a href={request.url} target="_blank" rel="noreferrer">petición ↗</a>
                <br /><code>{request.response_sha256}</code>
              </dd>
            </div>
          ))}
          <div><dt>Procesamiento</dt><dd>{source.transformations.join(' ')}</dd></div>
          <div><dt>Límites</dt><dd>{[...source.limitations, ...context.limitations].join(' ')}</dd></div>
          {site.geometry_diagnostics.length > 0 && (
            <div>
              <dt>Geometrías reparadas</dt>
              <dd>
                {repaired.length} aceptada(s) tras contrastar dos métodos de reparación; {rejected.length} rechazada(s). Umbrales de ingeniería
                provisionales, no un estándar científico.
              </dd>
            </div>
          )}
        </dl>
      </details>

      <details className="geology-details">
        <summary>Qué verificar en terreno</summary>
        <ul className="geology-questions">
          {site.verification_questions.map((question) => <li key={question}>{question}</li>)}
        </ul>
        <p className="geology-empty">{context.editorial_note}</p>
      </details>

      {onDownload && (
        <div className="geology-actions">
          <button type="button" onClick={onDownload} aria-label={`Descargar el contexto geológico de ${shortCandidateName(candidateName)} en JSON (${geologyExportFileName(site.site_id)})`}>
            Descargar contexto geológico (JSON)
          </button>
          {downloadError && <p className="geology-error" role="alert">{downloadError}</p>}
        </div>
      )}
    </section>
  )
}

interface GeologyContextProps {
  candidate: CandidateSite
  state: GeologyContextState
}

/** Panel de la ficha. Ante cualquier problema muestra «no disponible» sin afectar al resto de la ficha. */
export function GeologyContext({ candidate, state }: GeologyContextProps) {
  const [error, setError] = useState<string | null>(null)
  const selection = selectGeologySite(state, candidate)
  const download = () => {
    if (selection.status !== 'ready') return
    try {
      const exported = buildGeologyExport(selection.context, candidate.site_id) // valida contrato y semántica antes de entregar
      const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = geologyExportFileName(candidate.site_id)
      anchor.click()
      URL.revokeObjectURL(url)
      setError(null)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudo generar la exportación geológica.')
    }
  }
  return (
    <GeologyContextView
      candidateName={candidate.name}
      selection={selection}
      onDownload={selection.status === 'ready' ? download : undefined}
      downloadError={error}
    />
  )
}
