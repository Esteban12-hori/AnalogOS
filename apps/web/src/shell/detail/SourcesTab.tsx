/** Pestaña «Fuentes»: contexto satelital, evidencias, límites, verificaciones y datasets. */
import { VisualContext } from '../../components/VisualContext'
import type { CandidateSite, DataManifest, SearchResults } from '../../domain/contracts'
import type { VisualContextState } from '../../data/loadVisualContext'
import { exportSiteJson } from '../actions'

interface SourcesTabProps {
  site: CandidateSite
  manifest: DataManifest
  /** Alcance de la búsqueda v3: la ficha exportada lo incluye (buildExport del equipo). */
  search: SearchResults | null
  visual: VisualContextState
  onShowOnMap: () => void
}

export function SourcesTab({ site, manifest, search, visual, onShowOnMap }: SourcesTabProps) {
  return (
    <div className="sources-tab">
      <VisualContext candidate={site} state={visual} onShowOnMap={onShowOnMap} />
      <section className="details-section two-column-notes">
        <div>
          <h3>Dónde falla la analogía</h3>
          <ul>{site.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <h3>Qué verificar en terreno</h3>
          <ul>{site.field_checks.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </section>
      <section className="details-section evidence-section">
        <div className="subheading-row">
          <h3>Evidencia y fuentes</h3>
          <span>{site.evidence.length} evidencias</span>
        </div>
        {site.evidence.map((evidence) => (
          <a href={evidence.source_url} target="_blank" rel="noreferrer" key={evidence.evidence_id}>
            <span>{evidence.claim}</span>
            <b aria-hidden="true">↗</b>
          </a>
        ))}
      </section>
      <section className="details-section">
        <div className="subheading-row">
          <h3>Datasets del snapshot {manifest.snapshot_version}</h3>
          <span>Pipeline {manifest.pipeline_version}</span>
        </div>
        <ul className="dataset-list">
          {manifest.datasets.map((dataset) => (
            <li key={dataset.dataset_id}>
              <a href={dataset.landing_url} target="_blank" rel="noreferrer">{dataset.provider} · {dataset.product}</a>
              <small>{dataset.spatial_resolution} · {dataset.license}</small>
            </li>
          ))}
        </ul>
      </section>
      <div className="detail-actions">
        {/* Mismo contenido que «Exportar ficha (JSON)» de la cabecera: aviso, sitio y alcance de la búsqueda. */}
        <button type="button" onClick={() => exportSiteJson(site, search)}>Descargar ficha (JSON)</button>
      </div>
    </div>
  )
}
