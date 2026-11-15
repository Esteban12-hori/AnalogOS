/** "Sources" tab: satellite context, evidence, limits, verifications and datasets. */
import { VisualContext } from '../../components/VisualContext'
import type { CandidateSite, DataManifest, SearchResults } from '../../domain/contracts'
import type { VisualContextState } from '../../data/loadVisualContext'
import { limitationText } from '../../domain/geologyCopy'
import { displaySource } from '../../i18n/sourceText'
import { exportSiteJson } from '../actions'

interface SourcesTabProps {
  site: CandidateSite
  manifest: DataManifest
  /** Scope of search v3: the exported record includes it (the team's buildExport). */
  search: SearchResults | null
  visual: VisualContextState
  onShowOnMap: () => void
  /** The sector has its valid official geological context (M9): updates the historical limitation. */
  hasGeology?: boolean
}

export function SourcesTab({ site, manifest, search, visual, onShowOnMap, hasGeology = false }: SourcesTabProps) {
  return (
    <div className="sources-tab">
      <VisualContext candidate={site} state={visual} onShowOnMap={onShowOnMap} />
      <section className="details-section two-column-notes">
        <div>
          <h3>Where the analogy breaks down</h3>
          <ul>{site.limitations.map((item) => <li key={item}>{limitationText(item, hasGeology)}</li>)}</ul>
        </div>
        <div>
          <h3>What to check in the field</h3>
          <ul>{site.field_checks.map((item) => <li key={item}>{displaySource(item)}</li>)}</ul>
        </div>
      </section>
      <section className="details-section evidence-section">
        <div className="subheading-row">
          <h3>Evidence and sources</h3>
          <span>{site.evidence.length} evidence items</span>
        </div>
        {site.evidence.map((evidence) => (
          <a href={evidence.source_url} target="_blank" rel="noreferrer" key={evidence.evidence_id}>
            <span>{displaySource(evidence.claim)}</span>
            <b aria-hidden="true">↗</b>
          </a>
        ))}
      </section>
      <section className="details-section">
        <div className="subheading-row">
          <h3>Datasets of snapshot {manifest.snapshot_version}</h3>
          <span>Pipeline {manifest.pipeline_version}</span>
        </div>
        <ul className="dataset-list">
          {manifest.datasets.map((dataset) => (
            <li key={dataset.dataset_id}>
              <a href={dataset.landing_url} target="_blank" rel="noreferrer">{displaySource(dataset.provider)} · {displaySource(dataset.product)}</a>
              <small>{displaySource(dataset.spatial_resolution)} · {displaySource(dataset.license)}</small>
            </li>
          ))}
        </ul>
      </section>
      <div className="detail-actions">
        {/* Same content as "Export record (JSON)" in the header: notice, site and search scope. */}
        <button type="button" onClick={() => exportSiteJson(site, search)}>Download site record (JSON source record)</button>
      </div>
    </div>
  )
}
