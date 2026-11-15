/**
 * "Method" tab of the full detail sheet: the same-scale comparison and "How they were searched"
 * (ADR-008): the actual scope of the search (the team's `summarizeSearch`), the regions, the SVG
 * map with the 50 windows and the published precedents (only points with coordinates; the rest
 * are toponyms and are never drawn as a pin), and the auditable artifacts.
 */
import { SNAPSHOT_PATH } from '../../data/loadDemoSnapshot'
import { rankMap, splitByRole, summarizeSearch } from '../../domain/discovery'
import { formatScore } from '../../domain/formatting'
import { CandidateMap } from '../../features/globe/CandidateMap'
import { uiActions, useUi } from '../../state/ui'
import { displaySource } from '../../i18n/sourceText'
import type { AppData } from '../appData'

const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function MethodTab({ data }: { data: AppData }) {
  const snapshot = data.snapshot
  const selection = useUi((state) => state.selection)
  const base = `${import.meta.env.BASE_URL}${SNAPSHOT_PATH}`
  const search = snapshot?.search ?? null
  const summary = search ? summarizeSearch(search) : null
  const ranked = snapshot ? splitByRole(snapshot.candidates).ranked : []
  return (
    <div className="method-tab">
      <h3>The comparison happens at the same scale.</h3>
      <p>
        NASADEM is mosaicked and aggregated from ~30 m to ~480 m before it is compared with MOLA. Sentinel-2 contributes twelve monthly
        surface observations and POWER only regional climate context.
      </p>
      <ol className="method-steps">
        <li><b>01</b><strong>MOLA reference</strong><span>Regional Jezero setting · ~451 m nominal</span></li>
        <li><b>02</b><strong>NASADEM terrain</strong><span>Multi-tile mosaic · 16×16 blocks · ~480 m</span></li>
        <li><b>03</b><strong>Sentinel-2 surface</strong><span>12 monthly mosaics · SCL, NDVI and BSI · ~30 m</span></li>
        <li><b>04</b><strong>Separate decision</strong><span>Similarity ≠ confidence ≠ feasibility</span></li>
      </ol>

      {summary && search && snapshot && (
        <section className="method-search" aria-labelledby="method-search-title">
          <h3 id="method-search-title">How they were searched</h3>
          <p>{displaySource(search.scope_note)}</p>
          <dl className="method-figures">
            <div><dt>Test regions</dt><dd>{summary.regions}</dd></div>
            <div><dt>~20 km windows</dt><dd>{summary.evaluated} evaluated of {summary.attempted} attempted</dd></div>
            <div><dt>Explored area</dt><dd>≈ {integer.format(summary.exploredAreaKm2)} km²</dd></div>
            <div><dt>With published coordinates</dt><dd>{summary.excludedByPrecedent} excluded from the ranking</dd></div>
            <div><dt>Preselected</dt><dd>{summary.selected} · up to {summary.maxPerCountry} per country</dd></div>
            <div><dt>Separation</dt><dd>Centers ≥ {formatScore(summary.minDistanceKm)} km apart</dd></div>
          </dl>
          <ul className="region-list">
            {search.regions.map((region) => (
              <li key={region.region_id}>
                <strong>{region.name}</strong>
                <span>bbox {region.bbox.join(', ')} · {region.windows_evaluated} windows · {region.windows_selected} preselected</span>
              </li>
            ))}
          </ul>
          <div className="method-map">
            <CandidateMap
              candidates={snapshot.candidates}
              rankOf={rankMap(ranked)}
              outline={snapshot.outline}
              search={search}
              precedents={snapshot.precedents}
              selectedId={selection?.kind === 'evaluated' ? selection.siteId : ''}
              onSelect={(id) => uiActions.select(id)}
            />
          </div>
          <p className="method-note">Yungay keeps its data as the known reference (REF) and stays out of the ranking.</p>
        </section>
      )}

      <p className="method-links">
        <a href={`${base}/analysis-summary.json`} target="_blank" rel="noreferrer">Open the auditable analysis (JSON source record) ↗</a>
        {search && <a href={`${base}/search-results.json`} target="_blank" rel="noreferrer">Open the 50 windows and their reasons (JSON source record) ↗</a>}
      </p>
    </div>
  )
}
