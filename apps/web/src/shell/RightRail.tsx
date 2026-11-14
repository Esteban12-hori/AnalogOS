/**
 * Riel derecho (≥1100): el lugar seleccionado. Ancho clamp(340, 26vw, 380) px; «Ver ficha
 * completa» lo amplía a 520 px con pestañas. Entre 1100 y 1439 px lleva «Métricas | Lectura IA»
 * (la Lectura vive en el panel izquierdo desde 1440).
 */
import { useState } from 'react'
import { ReadingPanel } from '../features/analysis'
import { MetricRail } from '../features/metrics'
import { ReferenceCard } from '../features/places'
import { uiActions, type UiSelection } from '../state/ui'
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
  const [tab, setTab] = useState<RailTab>('metricas')
  const site = selection?.kind === 'evaluated' ? data.snapshot?.candidates.find((item) => item.site_id === selection.siteId) ?? null : null
  const open = selection !== null
  const title = site ? placeLabel(site.name) : selection?.kind === 'reference' ? 'Referencia mundial' : ''

  return (
    <aside
      className="rail"
      data-open={open ? '' : undefined}
      data-full={full && site ? '' : undefined}
      data-obstacle={open ? '' : undefined}
      aria-label="Lugar seleccionado"
      aria-hidden={!open}
      inert={!open}
    >
      {open && (
        <>
          <header className="rail-head">
            <h2>
              <span aria-hidden="true">{site ? GLYPH.evaluated : GLYPH.reference}</span> {title}
              {selection?.preview && <small> · vista previa</small>}
            </h2>
            {site && (
              <button type="button" className="rail-action" aria-expanded={full} onClick={() => onFullChange(!full)}>
                {full ? 'Volver al riel' : 'Ver ficha completa →'}
              </button>
            )}
            <button type="button" className="rail-close" aria-label="Cerrar el lugar" onClick={() => uiActions.clearSelection()}>
              {GLYPH.fail}
            </button>
          </header>
          <div className="rail-body">
            {selection?.kind === 'reference' && <div data-slot="rail.reference"><ReferenceCard data={data} analogId={selection.siteId} /></div>}
            {site && full && <FullDetail data={data} site={site} placement="rail" onShowOnMap={onShowOnMap} />}
            {site && !full && tramo === 'wide' && <div data-slot="rail.metrics"><MetricRail data={data} site={site} variant="rail" onShowOnMap={onShowOnMap} /></div>}
            {site && !full && tramo === 'medium' && (
              <>
                <TabList
                  idPrefix="rail"
                  label="Contenido del riel"
                  className="detail-tabs"
                  items={[{ id: 'metricas', label: 'Métricas' }, { id: 'lectura', label: 'Lectura IA' }]}
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
              <p className="rail-empty">Este lugar no está en el snapshot cargado.</p>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
