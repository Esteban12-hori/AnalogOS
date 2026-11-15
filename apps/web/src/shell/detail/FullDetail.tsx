/**
 * Full place detail sheet (ADR-014): 520 px rail (≥1100) or S2 (<1100), with tabs
 * Metrics · Reading · [Your mission] · Origin · Geology · Signal · Compare · Method · Sources.
 * «Geology» is the team's official geological context (M9, `GeologyContext`) with its coverage,
 * provenance and export; it is downloaded as its own chunk (validator with Ajv).
 * Header with country, role (REF), «Export sheet (JSON)» and «Evaluate this sector» (ADR-013).
 * Metrics, Reading and Your mission are feature slots; the rest is existing content.
 */
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { MissionCard } from '../../features/composer'
import { MetricRail } from '../../features/metrics'
import { ReadingPanel } from '../../features/analysis'
import type { CandidateSite } from '../../domain/contracts'
import { countryLabels, isReference, rankMap, splitByRole } from '../../domain/discovery'
import { useLocale, useT } from '../../i18n'
import { tCommon } from '../../i18n/messages/common'
import { tDetail } from '../../i18n/messages/detail'
import { tShell } from '../../i18n/messages/shell'
import { uiActions, useUi } from '../../state/ui'
import { evaluateSector, exportSiteJson } from '../actions'
import { hasGeologyFor, type AppData } from '../appData'
import { panelId, TabList, type TabItem } from '../Tabs'
import { OriginSection } from './OriginSection'

// Heavy or rarely visited content: its code is downloaded when the tab is opened.
const SurfaceSignals = lazy(() => import('../../components/SurfaceSignals').then((m) => ({ default: m.SurfaceSignals })))
const CandidateComparison = lazy(() => import('../../components/CandidateComparison').then((m) => ({ default: m.CandidateComparison })))
const MethodTab = lazy(() => import('./MethodTab').then((m) => ({ default: m.MethodTab })))
const SourcesTab = lazy(() => import('./SourcesTab').then((m) => ({ default: m.SourcesTab })))
const GeologyTab = lazy(() => import('./GeologyTab').then((m) => ({ default: m.GeologyTab })))

export type DetailTab = 'metricas' | 'lectura' | 'mision' | 'origen' | 'geologia' | 'senal' | 'comparar' | 'metodo' | 'fuentes'

export function detailTabs(placement: 'rail' | 'sheet', mode: 'explorar' | 'mision'): DetailTab[] {
  const tabs: DetailTab[] = ['metricas', 'lectura']
  if (placement === 'sheet' && mode === 'mision') tabs.push('mision')
  tabs.push('origen', 'geologia', 'senal', 'comparar', 'metodo', 'fuentes')
  return tabs
}


interface FullDetailProps {
  data: AppData
  site: CandidateSite
  placement: 'rail' | 'sheet'
  onShowOnMap: () => void
  /** Requests a tab from outside («Go to Reading», M11); each new `nonce` reopens it. */
  tabRequest?: { tab: DetailTab; nonce: number } | null
}

function Pending() {
  const t = useT(tDetail)
  return <p className="tab-loading" aria-busy="true">{t('loading')}</p>
}

export function FullDetail({ data, site, placement, onShowOnMap, tabRequest = null }: FullDetailProps) {
  const locale = useLocale()
  const t = tDetail.in(locale)
  const mode = useUi((state) => state.mode)
  const tabs = detailTabs(placement, mode)
  const [requested, setTab] = useState<DetailTab>(tabRequest?.tab ?? 'metricas')
  useEffect(() => {
    if (tabRequest) setTab(tabRequest.tab)
  }, [tabRequest])
  const tab = tabs.includes(requested) ? requested : 'metricas'
  const snapshot = data.snapshot
  const prefix = `detail-${placement}`
  const items: TabItem<DetailTab>[] = tabs.map((id) => ({ id, label: t(`tab.${id}`) }))
  // Compare: candidates in their global order and the known reference separately (ADR-008).
  const roles = useMemo(() => splitByRole(snapshot?.candidates ?? []), [snapshot])
  const rankOf = useMemo(() => rankMap(roles.ranked), [roles])

  const reference = isReference(site)
  return (
    <div className="full-detail" data-placement={placement}>
      <div className="detail-head">
        <p className="detail-role">
          {reference
            ? <b className="detail-ref">{tCommon.in(locale)('role.refKnownReference')}</b>
            : <span>{rankOf.get(site.site_id) ? t('role.candidateRank', { rank: rankOf.get(site.site_id) ?? '' }) : t('role.candidate')}</span>}
          {site.country && <span> · {countryLabels[site.country]}</span>}
        </p>
        <div className="detail-actions">
          <button type="button" className="detail-action" onClick={() => evaluateSector(site.site_id)}>{tShell.in(locale)('rail.evaluate')}</button>
          <button type="button" className="detail-action" onClick={() => exportSiteJson(site, snapshot?.search ?? null)}>{t('export')}</button>
        </div>
      </div>
      <TabList idPrefix={prefix} label={t('tabs')} items={items} active={tab} onChange={setTab} className="detail-tabs" />
      <div className="detail-panel" role="tabpanel" id={panelId(prefix, tab)} aria-labelledby={`${prefix}-tab-${tab}`} tabIndex={0}>
        {tab === 'metricas' && <div data-slot="full.metrics"><MetricRail data={data} site={site} variant="full" onShowOnMap={onShowOnMap} /></div>}
        {tab === 'lectura' && <div data-slot="full.reading"><ReadingPanel data={data} placement="full" /></div>}
        {tab === 'mision' && <div data-slot="full.mission"><MissionCard data={data} placement="sheet" /></div>}
        {tab === 'origen' && <OriginSection candidate={site} precedents={snapshot?.precedents ?? null} rank={reference ? null : rankOf.get(site.site_id) ?? null} />}
        {tab === 'geologia' && (
          <Suspense fallback={<Pending />}>
            <GeologyTab data={data} site={site} />
          </Suspense>
        )}
        {tab === 'senal' && snapshot && (
          <Suspense fallback={<Pending />}>
            <SurfaceSignals candidates={snapshot.candidates} selectedId={site.site_id} series={snapshot.surfaceSeries} />
          </Suspense>
        )}
        {tab === 'comparar' && snapshot && (
          <Suspense fallback={<Pending />}>
            <CandidateComparison
              ranked={roles.ranked}
              references={roles.references}
              rankOf={rankOf}
              selectedId={site.site_id}
              onSelect={(id) => uiActions.select(id)}
            />
          </Suspense>
        )}
        {tab === 'metodo' && (
          <Suspense fallback={<Pending />}>
            <MethodTab data={data} />
          </Suspense>
        )}
        {tab === 'fuentes' && snapshot && (
          <Suspense fallback={<Pending />}>
            <SourcesTab site={site} manifest={snapshot.manifest} search={snapshot.search ?? null} visual={data.visual} onShowOnMap={onShowOnMap} hasGeology={hasGeologyFor(data, site.site_id)} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
