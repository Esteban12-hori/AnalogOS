/** Pestaña «Fuentes»: contexto satelital, evidencias, límites, verificaciones y datasets. */
import { VisualContext } from '../../components/VisualContext'
import type { CandidateSite, DataManifest } from '../../domain/contracts'
import type { VisualContextState } from '../../data/loadVisualContext'

interface SourcesTabProps {
  site: CandidateSite
  manifest: DataManifest
  visual: VisualContextState
  onShowOnMap: () => void
}

function downloadJson(site: CandidateSite) {
  const blob = new Blob([JSON.stringify(site, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${site.site_id}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function SourcesTab({ site, manifest, visual, onShowOnMap }: SourcesTabProps) {
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
        <button type="button" onClick={() => downloadJson(site)}>Descargar ficha (JSON)</button>
      </div>
    </div>
  )
}
