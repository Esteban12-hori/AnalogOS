// Blocks of the team's tests/geologyContext.test.tsx that used CandidateDetails, ported with the SAME
// expected texts (now English) to the integrated site sheet (ADR-013): “Geology” tab (team panel),
// pending geology criterion in “Metrics” and “Where the analogy breaks down” in “Sources”.
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

describe('integrated site sheet · “Geology” tab', () => {
  it('the full candidate sheet includes the section and works without the package', () => {
    for (const geology of [ready, { status: 'unavailable', reason: 'sin paquete' } as GeologyContextState]) {
      const data = withGeology(geology)
      const tab = renderToStaticMarkup(<GeologyTab data={data} site={byId('cl-win-s2500-w06970')} />)
      expect(tab).toContain('Geological context')
      const full = renderToStaticMarkup(<FullDetail data={data} site={byId('cl-win-s2500-w06970')} placement="rail" onShowOnMap={() => undefined} />)
      expect(full).toContain('Candidate #')
      expect(full).toContain('Geology')
    }
    // Without the package yet (deferred load): “Loading geological context…”, never an error.
    expect(renderToStaticMarkup(<GeologyTab data={readyData} site={byId('cl-win-s2500-w06970')} />)).toContain('Loading geological context')
  })

  it('the tab comes after “Origin” in the rail and in the sheet, in both modes', () => {
    for (const placement of ['rail', 'sheet'] as const) {
      for (const mode of ['explorar', 'mision'] as const) {
        const tabs = detailTabs(placement, mode)
        expect(tabs.indexOf('geologia')).toBe(tabs.indexOf('origen') + 1)
      }
    }
  })

  it('with the real package: coverage, scale, source and per-sector export; a fixture does not inherit a sheet', () => {
    const data = withGeology(ready)
    const html = renderToStaticMarkup(<GeologyTab data={data} site={byId('cl-win-s2500-w06970')} />)
    expect(html).toContain('Partial coverage')
    expect(html).toContain('1:1,000,000')
    expect(html).toContain('SERNAGEOMIN')
    expect(html).toContain('Download geological context (JSON source record)')
    expect(html).toContain('cl-win-s2500-w06970-geology-context.json')
    expect(renderToStaticMarkup(<GeologyTab data={data} site={byId('ar-win-s2640-w06730')} />)).toContain('No coverage in this layer')
    expect(renderToStaticMarkup(<GeologyTab data={data} site={fixtures[0]!} />)).toContain('Synthetic fixtures')
    expect(hasGeologyFor(data, fixtures[0]!.site_id)).toBe(false)
    expect(candidates.every((candidate) => hasGeologyFor(data, candidate.site_id))).toBe(true)
  })

  it('the sheet state and the mission state are the same object (a single validated load)', () => {
    const data = withGeology(ready)
    expect(geologyStateOf(data)).toBe(ready)
    expect(geologyStateOf(readyData)).toBe(geologyStateOf({}))
    expect(geologyStateOf(readyData)).toEqual({ status: 'loading' })
  })
})

describe('geological context and historical warnings (integrated sheet)', () => {
  const site = candidates[0]!
  const metrics = (data: AppData) => {
    const context = resolveMetricContext({ site, candidates, profile: v3Snapshot.profile, marsReference: v3Snapshot.marsReference, mode: 'explorar', evaluation: null, request: null })
    return renderToStaticMarkup(<MetricDetails data={data} site={site} variant="full" context={context} onShowOnMap={() => undefined} />)
  }
  const sources = (data: AppData) => renderToStaticMarkup(
    <SourcesTab site={site} manifest={v3Snapshot.manifest} search={null} visual={{ status: 'loading' }} onShowOnMap={() => undefined} hasGeology={hasGeologyFor(data, site.site_id)} />,
  )

  it('only updates the presentation when there is validated context, keeping the snapshot and the lack of calibration', () => {
    const before = JSON.stringify(site)
    const loaded = withGeology(ready)
    const loadedMetrics = metrics(loaded)
    expect(loadedMetrics).toContain('still needs calibration and expert review')
    expect(loadedMetrics).toContain(GEOLOGY_PENDING_WITH_CONTEXT)
    expect(loadedMetrics).not.toContain('Requires official geological mapping (SERNAGEOMIN)')
    const loadedSources = sources(loaded)
    expect(loadedSources).not.toContain('Geología, áreas protegidas, urbano, propiedad y acceso permanecen pendientes')
    expect(loadedSources).toContain(GEOLOGY_LIMITATION_WITH_CONTEXT)
    // Without a package (or while loading): the snapshot texts, in their English display rendering.
    for (const data of [withGeology({ status: 'unavailable', reason: 'sin paquete' }), readyData]) {
      expect(metrics(data)).toContain('Requires official geological mapping (SERNAGEOMIN)')
      expect(sources(data)).toContain('Geology, protected areas, urban areas, ownership and access remain pending integrated official evidence in both countries.') // English display of HISTORICAL_GEOLOGY_LIMITATION
    }
    expect(JSON.stringify(site)).toBe(before)
  })

  it('the geology criterion stays pending (“to be calculated”): the context gives it no value or suitability', () => {
    const html = metrics(withGeology(ready))
    const at = html.indexOf('data-criterion="geologic_relevance"')
    expect(at).toBeGreaterThan(-1)
    const chunk = html.slice(at, html.indexOf('data-criterion="', at + 10) === -1 ? undefined : html.indexOf('data-criterion="', at + 10))
    expect(chunk).toContain('metrics-pending-box')
    expect(chunk).toContain('not yet calculated')
    expect(chunk).toContain('is-empty')
    expect(chunk).not.toMatch(/\bapto\b|aprobad|autorizad|\bis suitable\b|\bapproved\b|\bauthorized\b/i)
  })
})
