/**
 * Right rail (≥1100): the selected place. Width clamp(340, 26vw, 380) px; «View full profile»
 * expands it to 520 px with tabs. Between 1100 and 1439 px it carries «Metrics | Reading»
 * (the Reading lives in the left panel since 1440). «Evaluate this sector» opens the «sector» flow
 * of the team planner (ADR-013).
 */
import { useState } from 'react'
import { ReadingPanel } from '../features/analysis'
import { MetricRail } from '../features/metrics'
import { ReferenceCard } from '../features/places'
import { useT } from '../i18n'
import { tShell } from '../i18n/messages/shell'
import { uiActions, type UiSelection } from '../state/ui'
import { evaluateSector } from './actions'
import type { AppData } from './appData'
import { FullDetail } from './detail/FullDetail'
import { GLYPH } from './glyphs'
import { placeLabel } from './placeLabel'
import type { StageTramo } from './layout'
import { panelId, TabList } from './Tabs'

interface RightRailProps {
  data: AppData
  tramo: Exclude<StageTramo, 'narrow'>
  selection: UiSelection | null
  full: boolean
  onFullChange: (full: boolean) => void
  onShowOnMap: () => void
}

type RailTab = 'metricas' | 'lectura'

export function RightRail({ data, tramo, selection, full, onFullChange, onShowOnMap }: RightRailProps) {
  const t = useT(tShell)
  const [tab, setTab] = useState<RailTab>('metricas')
  const site = selection?.kind === 'evaluated' ? data.snapshot?.candidates.find((item) => item.site_id === selection.siteId) ?? null : null
  const open = selection !== null
  const title = site ? placeLabel(site.name) : selection?.kind === 'reference' ? t('sheet.worldReference') : ''

  return (
    <aside
      className="rail"
      data-open={open ? '' : undefined}
      data-full={full && site ? '' : undefined}
      data-obstacle={open ? '' : undefined}
      aria-label={t('rail.aria')}
      aria-hidden={!open}
      inert={!open}
    >
      {open && (
        <>
          <header className="rail-head">
            <h2>
              <span aria-hidden="true">{site ? GLYPH.evaluated : GLYPH.reference}</span> {title}
              {selection?.preview && <small>{t('rail.preview')}</small>}
            </h2>
            {site && (
              <button type="button" className="rail-action" aria-expanded={full} onClick={() => onFullChange(!full)}>
                {full ? t('rail.back') : t('rail.full')}
              </button>
            )}
            <button type="button" className="rail-close" aria-label={t('sheet.closePlace')} onClick={() => uiActions.clearSelection()}>
              {GLYPH.fail}
            </button>
          </header>
          <div className="rail-body">
            {site && !full && (
              <div className="rail-subactions">
                <button type="button" className="rail-action" onClick={() => evaluateSector(site.site_id)}>{t('rail.evaluate')}</button>
              </div>
            )}
            {selection?.kind === 'reference' && <div data-slot="rail.reference"><ReferenceCard data={data} analogId={selection.siteId} /></div>}
            {site && full && <FullDetail data={data} site={site} placement="rail" onShowOnMap={onShowOnMap} />}
            {site && !full && tramo === 'wide' && <div data-slot="rail.metrics"><MetricRail data={data} site={site} variant="rail" onShowOnMap={onShowOnMap} /></div>}
            {site && !full && tramo === 'medium' && (
              <>
                <TabList
                  idPrefix="rail"
                  label={t('rail.tabs')}
                  className="detail-tabs"
                  items={[{ id: 'metricas', label: t('rail.metrics') }, { id: 'lectura', label: t('sheet.reading') }]}
                  active={tab}
                  onChange={setTab}
                />
                <div className="detail-panel" role="tabpanel" id={panelId('rail', tab)} aria-labelledby={`rail-tab-${tab}`} tabIndex={0}>
                  {tab === 'metricas'
                    ? <div data-slot="rail.metrics"><MetricRail data={data} site={site} variant="rail" onShowOnMap={onShowOnMap} /></div>
                    : <div data-slot="rail.reading"><ReadingPanel data={data} placement="rail" /></div>}
                </div>
              </>
            )}
            {selection?.kind === 'evaluated' && !site && (
              <p className="rail-empty">{t('rail.missing')}</p>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
