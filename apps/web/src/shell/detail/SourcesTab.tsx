/** "Sources" tab: satellite context, evidence, limits, verifications and datasets. */
import { VisualContext } from '../../components/VisualContext'
import type { CandidateSite, DataManifest, SearchResults } from '../../domain/contracts'
import type { VisualContextState } from '../../data/loadVisualContext'
import { limitationText } from '../../domain/geologyCopy'
import { getLocale } from '../../i18n'
import { tDetailTabs } from '../../i18n/messages/detailTabs'
import { scienceText } from '../../i18n/science'
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
  // Hook-free (tests call it as a function): FullDetail, subscribed to the language, renders it again on a change.
  const locale = getLocale()
  const t = tDetailTabs.in(locale)
  return (
    <div className="sources-tab">
      <VisualContext candidate={site} state={visual} onShowOnMap={onShowOnMap} />
      <section className="details-section two-column-notes">
        <div>
          <h3>{t('sources.limits')}</h3>
          <ul>{site.limitations.map((item) => <li key={item}>{limitationText(item, hasGeology)}</li>)}</ul>
        </div>
        <div>
          <h3>{t('sources.checks')}</h3>
          <ul>{site.field_checks.map((item) => <li key={item}>{scienceText(item, locale)}</li>)}</ul>
        </div>
      </section>
      <section className="details-section evidence-section">
        <div className="subheading-row">
          <h3>{t('sources.evidence')}</h3>
          <span>{t('sources.evidenceCount', { count: site.evidence.length })}</span>
        </div>
        {site.evidence.map((evidence) => (
          <a href={evidence.source_url} target="_blank" rel="noreferrer" key={evidence.evidence_id}>
            <span>{scienceText(evidence.claim, locale)}</span>
            <b aria-hidden="true">↗</b>
          </a>
        ))}
      </section>
      <section className="details-section">
        <div className="subheading-row">
          <h3>{t('sources.datasets', { version: manifest.snapshot_version })}</h3>
          <span>Pipeline {manifest.pipeline_version}</span>
        </div>
        <ul className="dataset-list">
          {manifest.datasets.map((dataset) => (
            <li key={dataset.dataset_id}>
              <a href={dataset.landing_url} target="_blank" rel="noreferrer">{scienceText(dataset.provider, locale)} · {scienceText(dataset.product, locale)}</a>
              <small>{scienceText(dataset.spatial_resolution, locale)} · {scienceText(dataset.license, locale)}</small>
            </li>
          ))}
        </ul>
      </section>
      <div className="detail-actions">
        {/* Same content as "Export record (JSON)" in the header: notice, site and search scope. */}
        <button type="button" onClick={() => exportSiteJson(site, search)}>{t('sources.download')}</button>
      </div>
    </div>
  )
}
