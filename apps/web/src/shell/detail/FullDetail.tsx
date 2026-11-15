/**
 * Ficha completa del lugar (ADR-014): riel de 520 px (≥1100) o S2 (<1100), con pestañas
 * Métricas · Lectura · [Tu misión] · Origen · Geología · Señal · Comparar · Método · Fuentes.
 * «Geología» es el contexto geológico oficial del equipo (M9, `GeologyContext`) con su cobertura,
 * procedencia y exportación; se descarga con su propio chunk (validador con Ajv).
 * Cabecera con país, rol (REF), «Exportar ficha (JSON)» y «Evaluar este sector» (ADR-013).
 * Métricas, Lectura y Tu misión son slots de features; el resto, contenido existente.
 */
import { lazy, Suspense, useMemo, useState } from 'react'
import { MissionCard } from '../../features/composer'
import { MetricRail } from '../../features/metrics'
import { ReadingPanel } from '../../features/analysis'
import type { CandidateSite } from '../../domain/contracts'
import { countryLabels, isReference, rankMap, splitByRole } from '../../domain/discovery'
import { uiActions, useUi } from '../../state/ui'
import { evaluateSector, exportSiteJson } from '../actions'
import { hasGeologyFor, type AppData } from '../appData'
import { panelId, TabList, type TabItem } from '../Tabs'
import { OriginSection } from './OriginSection'

// Contenido pesado o poco visitado: su código se descarga al abrir la pestaña.
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

const LABELS: Record<DetailTab, string> = {
  metricas: 'Métricas',
  lectura: 'Lectura',
  mision: 'Tu misión',
  origen: 'Origen',
  geologia: 'Geología',
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
  // Comparar: candidatos en su orden global y la referencia conocida aparte (ADR-008).
  const roles = useMemo(() => splitByRole(snapshot?.candidates ?? []), [snapshot])
  const rankOf = useMemo(() => rankMap(roles.ranked), [roles])

  const reference = isReference(site)
  return (
    <div className="full-detail" data-placement={placement}>
      <div className="detail-head">
        <p className="detail-role">
          {reference ? <b className="detail-ref">REF · Referencia conocida</b> : <span>Candidato{rankOf.get(site.site_id) ? ` #${rankOf.get(site.site_id)}` : ''}</span>}
          {site.country && <span> · {countryLabels[site.country]}</span>}
        </p>
        <div className="detail-actions">
          <button type="button" className="detail-action" onClick={() => evaluateSector(site.site_id)}>Evaluar este sector</button>
          <button type="button" className="detail-action" onClick={() => exportSiteJson(site, snapshot?.search ?? null)}>Exportar ficha (JSON)</button>
        </div>
      </div>
      <TabList idPrefix={prefix} label="Ficha del lugar" items={items} active={tab} onChange={setTab} className="detail-tabs" />
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
