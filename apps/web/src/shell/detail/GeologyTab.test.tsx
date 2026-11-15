// Bloques de tests/geologyContext.test.tsx del equipo que usaban CandidateDetails, portados con los
// MISMOS textos esperados a la ficha integrada (ADR-013): pestaña «Geología» (panel del equipo),
// criterio geológico pendiente en «Métricas» y «Dónde falla la analogía» en «Fuentes».
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { appGeologyFrom } from '../../data/loadAppGeology'
import type { CandidateSite } from '../../domain/contracts'
import { parseGeologyContext, type GeologyContextState } from '../../domain/geologyContext'
import { GEOLOGY_LIMITATION_WITH_CONTEXT, GEOLOGY_PENDING_WITH_CONTEXT, HISTORICAL_GEOLOGY_LIMITATION } from '../../domain/geologyCopy'
import MetricDetails from '../../features/metrics/MetricDetails'
import { resolveMetricContext } from '../../features/metrics/metricContext'
import { readJson, readyData, v3Snapshot } from '../../tests/v3Support'
import { geologyStateOf, hasGeologyFor, type AppData } from '../appData'
import { detailTabs, FullDetail } from './FullDetail'
import { GeologyTab } from './GeologyTab'
import { SourcesTab } from './SourcesTab'

const candidates = v3Snapshot.candidates
const fixtures = readJson('artifacts/demo/candidate-details.json') as CandidateSite[]
const real = parseGeologyContext(readJson('artifacts/geology-context-v1/index.json'), candidates)
const ready: GeologyContextState = { status: 'ready', context: real }
const byId = (id: string) => candidates.find((candidate) => candidate.site_id === id)!
const withGeology = (state: GeologyContextState): AppData => ({ ...readyData, geology: appGeologyFrom(state, candidates) })

describe('ficha integrada · pestaña «Geología»', () => {
  it('la ficha completa del candidato incluye la sección y funciona sin el paquete', () => {
    for (const geology of [ready, { status: 'unavailable', reason: 'sin paquete' } as GeologyContextState]) {
      const data = withGeology(geology)
      const tab = renderToStaticMarkup(<GeologyTab data={data} site={byId('cl-win-s2500-w06970')} />)
      expect(tab).toContain('Contexto geológico')
      const full = renderToStaticMarkup(<FullDetail data={data} site={byId('cl-win-s2500-w06970')} placement="rail" onShowOnMap={() => undefined} />)
      expect(full).toContain('Candidato #')
      expect(full).toContain('Geología')
    }
    // Sin el paquete todavía (carga diferida): «Cargando contexto geológico…», nunca un error.
    expect(renderToStaticMarkup(<GeologyTab data={readyData} site={byId('cl-win-s2500-w06970')} />)).toContain('Cargando contexto geológico')
  })

  it('la pestaña va después de «Origen» en el riel y en la hoja, en ambos modos', () => {
    for (const placement of ['rail', 'sheet'] as const) {
      for (const mode of ['explorar', 'mision'] as const) {
        const tabs = detailTabs(placement, mode)
        expect(tabs.indexOf('geologia')).toBe(tabs.indexOf('origen') + 1)
      }
    }
  })

  it('con el paquete real: cobertura, escala, fuente y exportación por sector; un fixture no hereda ficha', () => {
    const data = withGeology(ready)
    const html = renderToStaticMarkup(<GeologyTab data={data} site={byId('cl-win-s2500-w06970')} />)
    expect(html).toContain('Cobertura parcial')
    expect(html).toContain('1:1.000.000')
    expect(html).toContain('SERNAGEOMIN')
    expect(html).toContain('Descargar contexto geológico (JSON)')
    expect(html).toContain('cl-win-s2500-w06970-geology-context.json')
    expect(renderToStaticMarkup(<GeologyTab data={data} site={byId('ar-win-s2640-w06730')} />)).toContain('Sin cobertura en esta capa')
    expect(renderToStaticMarkup(<GeologyTab data={data} site={fixtures[0]!} />)).toContain('fixtures sintéticos')
    expect(hasGeologyFor(data, fixtures[0]!.site_id)).toBe(false)
    expect(candidates.every((candidate) => hasGeologyFor(data, candidate.site_id))).toBe(true)
  })

  it('el estado de la ficha y el de la misión son el mismo objeto (una sola carga validada)', () => {
    const data = withGeology(ready)
    expect(geologyStateOf(data)).toBe(ready)
    expect(geologyStateOf(readyData)).toBe(geologyStateOf({}))
    expect(geologyStateOf(readyData)).toEqual({ status: 'loading' })
  })
})

describe('contexto geológico y advertencias históricas (ficha integrada)', () => {
  const site = candidates[0]!
  const metrics = (data: AppData) => {
    const context = resolveMetricContext({ site, candidates, profile: v3Snapshot.profile, marsReference: v3Snapshot.marsReference, mode: 'explorar', evaluation: null, request: null })
    return renderToStaticMarkup(<MetricDetails data={data} site={site} variant="full" context={context} onShowOnMap={() => undefined} />)
  }
  const sources = (data: AppData) => renderToStaticMarkup(
    <SourcesTab site={site} manifest={v3Snapshot.manifest} search={null} visual={{ status: 'loading' }} onShowOnMap={() => undefined} hasGeology={hasGeologyFor(data, site.site_id)} />,
  )

  it('actualiza solo la presentación cuando hay contexto validado, conservando el snapshot y la falta de calibración', () => {
    const before = JSON.stringify(site)
    const loaded = withGeology(ready)
    const loadedMetrics = metrics(loaded)
    expect(loadedMetrics).toContain('Falta calibrar su compatibilidad')
    expect(loadedMetrics).toContain(GEOLOGY_PENDING_WITH_CONTEXT)
    expect(loadedMetrics).not.toContain('Requiere cartografía geológica oficial (SERNAGEOMIN)')
    const loadedSources = sources(loaded)
    expect(loadedSources).not.toContain('Geología, áreas protegidas, urbano, propiedad y acceso permanecen pendientes')
    expect(loadedSources).toContain(GEOLOGY_LIMITATION_WITH_CONTEXT)
    // Sin paquete (o mientras carga): los textos del snapshot, tal cual.
    for (const data of [withGeology({ status: 'unavailable', reason: 'sin paquete' }), readyData]) {
      expect(metrics(data)).toContain('Requiere cartografía geológica oficial (SERNAGEOMIN)')
      expect(sources(data)).toContain(HISTORICAL_GEOLOGY_LIMITATION)
    }
    expect(JSON.stringify(site)).toBe(before)
  })

  it('el criterio geológico sigue pendiente («por calcular»): el contexto no le da valor ni aptitud', () => {
    const html = metrics(withGeology(ready))
    const at = html.indexOf('data-criterion="geologic_relevance"')
    expect(at).toBeGreaterThan(-1)
    const chunk = html.slice(at, html.indexOf('data-criterion="', at + 10) === -1 ? undefined : html.indexOf('data-criterion="', at + 10))
    expect(chunk).toContain('metrics-pending-box')
    expect(chunk).toContain('por calcular')
    expect(chunk).toContain('is-empty')
    expect(chunk).not.toMatch(/\bapto\b|aprobad|autorizad/i)
  })
})
