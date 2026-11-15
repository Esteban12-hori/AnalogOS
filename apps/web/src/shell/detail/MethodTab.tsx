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
import { formatInteger, useLocale } from '../../i18n'
import { tDetailTabs } from '../../i18n/messages/detailTabs'
import { scienceText } from '../../i18n/science'
import type { AppData } from '../appData'

export function MethodTab({ data }: { data: AppData }) {
  const locale = useLocale()
  const t = tDetailTabs.in(locale)
  const snapshot = data.snapshot
  const selection = useUi((state) => state.selection)
  const base = `${import.meta.env.BASE_URL}${SNAPSHOT_PATH}`
  const search = snapshot?.search ?? null
  const summary = search ? summarizeSearch(search) : null
  const ranked = snapshot ? splitByRole(snapshot.candidates).ranked : []
  return (
    <div className="method-tab">
      <h3>{t('method.title')}</h3>
      <p>{t('method.lead')}</p>
      <ol className="method-steps">
        <li><b>01</b><strong>{t('method.step1')}</strong><span>{t('method.step1Detail')}</span></li>
        <li><b>02</b><strong>{t('method.step2')}</strong><span>{t('method.step2Detail')}</span></li>
        <li><b>03</b><strong>{t('method.step3')}</strong><span>{t('method.step3Detail')}</span></li>
        <li><b>04</b><strong>{t('method.step4')}</strong><span>{t('method.step4Detail')}</span></li>
      </ol>

      {summary && search && snapshot && (
        <section className="method-search" aria-labelledby="method-search-title">
          <h3 id="method-search-title">{t('method.search')}</h3>
          <p>{scienceText(search.scope_note, locale)}</p>
          <dl className="method-figures">
            <div><dt>{t('method.regions')}</dt><dd>{summary.regions}</dd></div>
            <div><dt>{t('method.windows')}</dt><dd>{t('method.windowsValue', { evaluated: summary.evaluated, attempted: summary.attempted })}</dd></div>
            <div><dt>{t('method.area')}</dt><dd>≈ {formatInteger(summary.exploredAreaKm2, locale)} km²</dd></div>
            <div><dt>{t('method.published')}</dt><dd>{t('method.publishedValue', { count: summary.excludedByPrecedent })}</dd></div>
            <div><dt>{t('method.preselected')}</dt><dd>{t('method.preselectedValue', { selected: summary.selected, max: summary.maxPerCountry })}</dd></div>
            <div><dt>{t('method.separation')}</dt><dd>{t('method.separationValue', { km: formatScore(summary.minDistanceKm, locale) })}</dd></div>
          </dl>
          <ul className="region-list">
            {search.regions.map((region) => (
              <li key={region.region_id}>
                <strong>{region.name}</strong>
                <span>{t('method.region', { bbox: region.bbox.join(', '), evaluated: region.windows_evaluated, selected: region.windows_selected })}</span>
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
          <p className="method-note">{t('method.referenceNote')}</p>
        </section>
      )}

      <p className="method-links">
        <a href={`${base}/analysis-summary.json`} target="_blank" rel="noreferrer">{t('method.analysis')}</a>
        {search && <a href={`${base}/search-results.json`} target="_blank" rel="noreferrer">{t('method.windowsLink')}</a>}
      </p>
    </div>
  )
}
