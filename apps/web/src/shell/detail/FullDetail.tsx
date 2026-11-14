/**
 * Ficha completa del lugar (ADR-008): riel de 520 px (≥1100) o S2 (<1100), con pestañas
 * Métricas · Lectura IA · [Tu misión] · Señal · Comparar · Método · Fuentes.
 * Métricas, Lectura y Tu misión son slots de features; el resto, contenido existente.
 */
import { lazy, Suspense, useState } from 'react'
import { MissionCard } from '../../features/composer'
import { MetricRail } from '../../features/metrics'
import { ReadingPanel } from '../../features/analysis'
import type { CandidateSite } from '../../domain/contracts'
import { uiActions, useUi } from '../../state/ui'
import type { AppData } from '../appData'
import { panelId, TabList, type TabItem } from '../Tabs'
import { MethodTab } from './MethodTab'
import { SourcesTab } from './SourcesTab'

// Contenido pesado o poco visitado: su código se descarga al abrir la pestaña.
const SurfaceSignals = lazy(() => import('../../components/SurfaceSignals').then((m) => ({ default: m.SurfaceSignals })))
const CandidateComparison = lazy(() => import('../../components/CandidateComparison').then((m) => ({ default: m.CandidateComparison })))

export type DetailTab = 'metricas' | 'lectura' | 'mision' | 'senal' | 'comparar' | 'metodo' | 'fuentes'

export function detailTabs(placement: 'rail' | 'sheet', mode: 'explorar' | 'mision'): DetailTab[] {
  const tabs: DetailTab[] = ['metricas', 'lectura']
  if (placement === 'sheet' && mode === 'mision') tabs.push('mision')
  tabs.push('senal', 'comparar', 'metodo', 'fuentes')
  return tabs
}

const LABELS: Record<DetailTab, string> = {
  metricas: 'Métricas',
  lectura: 'Lectura IA',
  mision: 'Tu misión',
  senal: 'Señal',
  comparar: 'Comparar',
  metodo: 'Método',
  fuentes: 'Fuentes',
}

interface FullDetailProps {
  data: AppData
  site: CandidateSite
  placement: 'rail' | 'sheet'
  onShowOnMap: () => void
}

function Pending() {
  return <p className="tab-loading" aria-busy="true">Cargando…</p>
}

export function FullDetail({ data, site, placement, onShowOnMap }: FullDetailProps) {
  const mode = useUi((state) => state.mode)
  const tabs = detailTabs(placement, mode)
  const [requested, setTab] = useState<DetailTab>('metricas')
  const tab = tabs.includes(requested) ? requested : 'metricas'
  const snapshot = data.snapshot
  const prefix = `detail-${placement}`
  const items: TabItem<DetailTab>[] = tabs.map((id) => ({ id, label: LABELS[id] }))

  return (
    <div className="full-detail" data-placement={placement}>
      <TabList idPrefix={prefix} label="Ficha del lugar" items={items} active={tab} onChange={setTab} className="detail-tabs" />
      <div className="detail-panel" role="tabpanel" id={panelId(prefix, tab)} aria-labelledby={`${prefix}-tab-${tab}`} tabIndex={0}>
        {tab === 'metricas' && <div data-slot="full.metrics"><MetricRail data={data} site={site} variant="full" onShowOnMap={onShowOnMap} /></div>}
        {tab === 'lectura' && <div data-slot="full.reading"><ReadingPanel data={data} placement="full" /></div>}
        {tab === 'mision' && <div data-slot="full.mission"><MissionCard data={data} placement="sheet" /></div>}
        {tab === 'senal' && snapshot && (
          <Suspense fallback={<Pending />}>
            <SurfaceSignals candidates={snapshot.candidates} selectedId={site.site_id} series={snapshot.surfaceSeries} />
          </Suspense>
        )}
        {tab === 'comparar' && snapshot && (
          <Suspense fallback={<Pending />}>
            <CandidateComparison candidates={snapshot.candidates} selectedId={site.site_id} onSelect={(id) => uiActions.select(id)} />
          </Suspense>
        )}
        {tab === 'metodo' && <MethodTab />}
        {tab === 'fuentes' && snapshot && <SourcesTab site={site} manifest={snapshot.manifest} visual={data.visual} onShowOnMap={onShowOnMap} />}
      </div>
    </div>
  )
}
