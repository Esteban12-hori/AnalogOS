// Render of the three variants with react-dom/server (no jsdom). Real science-v2 snapshot.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import type { CandidateSite, DataManifest, MissionProfile } from '../../domain/contracts'
import type { DemoSnapshot } from '../../data/loadDemoSnapshot'
import { parseMarsReference } from '../../domain/marsReference'
import type { AppData } from '../../shell/public'
import { missionStore } from '../../state/mission'
import { uiStore } from '../../state/ui'
import { evaluateExample, readyData, v3Snapshot } from '../../tests/v3Support'
import { fadeOffset } from './FadeNumber'
import { MetricRail } from './MetricRail'
import MetricDetails, { defaultCriterion, metricAriaLabel, nextIndex, sourceLine } from './MetricDetails'
import { resolveMetricContext } from './metricContext'
import { buildMetricViews } from './buildMetricViews'

const root = resolve(__dirname, '../../../../..')
const read = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const candidates = read('artifacts/science-v2/candidate-details.json') as CandidateSite[]
const snapshot: DemoSnapshot = {
  candidates,
  manifest: read('artifacts/science-v2/manifest.json') as DataManifest,
  profile: read('artifacts/science-v2/mission-profile.json') as MissionProfile,
  outline: { type: 'FeatureCollection', features: [] },
  search: null,
  precedents: null,
  surfaceSeries: new Map(),
  marsReference: parseMarsReference(read('artifacts/science-v2/analysis-summary.json')),
}
const data: AppData = { status: 'ready', snapshot, visual: { status: 'loading' }, error: null }
const site = (id: string) => candidates.find((candidate) => candidate.site_id === id) as CandidateSite
const yungay = site('cl-pampa-yungay-screening')
const domeyko = site('cl-domeyko-interior-screening')

function context(of: CandidateSite) {
  return resolveMetricContext({ site: of, candidates, profile: snapshot.profile, marsReference: snapshot.marsReference, mode: 'explorar', evaluation: null, request: null })
}
function details(of: CandidateSite, variant: 'rail' | 'full' | 'sheet'): string {
  return renderToStaticMarkup(<MetricDetails data={data} site={of} variant={variant} context={context(of)} onShowOnMap={() => undefined} />)
}
/** HTML chunk of a criterion's row/card/slide. */
function chunk(html: string, criterion: string): string {
  const at = html.indexOf(`data-criterion="${criterion}"`)
  expect(at).toBeGreaterThan(-1)
  const start = html.lastIndexOf('<', at)
  const following = html.indexOf('data-criterion="', at + 10)
  return html.slice(start, following === -1 ? undefined : html.lastIndexOf('<', following))
}

afterEach(() => {
  uiStore.reset()
  missionStore.reset()
})

describe('MetricRail (chunk principal)', () => {
  it('instantly paints similarity, confidence, stability and feasibility separately', () => {
    const html = renderToStaticMarkup(<MetricRail data={data} site={yungay} variant="rail" />)
    expect(html).toContain('75.7')
    expect(html).toContain('#1 of 3')
    for (const label of ['Confidence', 'Stability', 'Feasibility']) expect(html).toContain(`<dt>${label}</dt>`)
    expect(html).toContain('77.5')
    expect(html).toContain('99.0')
    expect(html).toContain('Requires review')
    expect(html).toContain('6 of 7 criteria with data · 90% of the weight')
    expect(html).toContain('needs calibration')
    // The per-criterion detail arrives deferred, with a static loading state.
    expect(html).toContain('Loading the per-criterion detail')
  })

  it('S1: “‹ #1 of 3 · % ›” with previous disabled on #1', () => {
    const html = renderToStaticMarkup(<MetricRail data={data} site={yungay} variant="sheet" />)
    expect(html).toContain('aria-label="Change place"')
    expect(html).toContain('aria-disabled="true" aria-label="No previous place"')
    expect(html).toContain('aria-label="Next place: Cordón de Domeyko"')
    expect(html).toContain('#1 of 3 · ')
    expect(html).toContain('75.7')
  })

  it('v3: country, role and “Territorial feasibility: pending”; the REF without rank', () => {
    const ref = v3Snapshot.candidates.find((candidate) => candidate.role === 'reference')!
    const html = renderToStaticMarkup(<MetricRail data={readyData} site={ref} variant="rail" />)
    expect(html).toContain('REF · Known reference')
    expect(html).toContain('Chile')
    expect(html).toContain('Territorial feasibility: pending')
    expect(html).not.toMatch(/#\d de 6/)
    const first = renderToStaticMarkup(<MetricRail data={readyData} site={v3Snapshot.candidates[0]!} variant="rail" />)
    expect(first).toContain('#1 of 6')
    expect(first).toContain('Search candidate')
  })

  it('Mission with evaluation: status, requirements without measurement and the rules version; never a mission %', () => {
    const { evaluation, request } = evaluateExample()
    missionStore.setState({ evaluation, evaluatedRequest: request, revision: 1 })
    uiStore.setState({ mode: 'mision', missionPhase: 'done' })
    const site = v3Snapshot.candidates[0]!
    const html = renderToStaticMarkup(<MetricRail data={readyData} site={site} variant="rail" />)
    expect(html).toContain('Prioritized for reconnaissance')
    expect(html).toContain('Traction')
    expect(html).toContain('mission-rules-1.0.0')
    expect(html).toContain('not recalculated')
    expect(html).not.toMatch(/motor determinista v|tu perfil/)
  })

  it('after editing the test, the Mission layer stays aria-busy (without inert) until re-evaluation', () => {
    const { evaluation, request } = evaluateExample()
    missionStore.setState({ evaluation, evaluatedRequest: request, stale: true, revision: 1 })
    uiStore.setState({ mode: 'mision', missionPhase: 'review' })
    const html = renderToStaticMarkup(<MetricRail data={readyData} site={v3Snapshot.candidates[0]!} variant="rail" />)
    expect(html).toContain('data-busy=""')
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('inert')
  })
})

describe('MetricDetails · rail (accordion)', () => {
  it('opens the limiting factor (Roughness) by default and marks it', () => {
    const html = details(yungay, 'rail')
    const roughness = chunk(html, 'terrain_roughness')
    expect(roughness).toContain('data-open=""')
    expect(roughness).toContain('data-limiting=""')
    expect(roughness).toContain('aria-expanded="true"')
    expect(roughness).toContain('Limiting')
    expect(roughness).toContain('contribution −0.091')
    expect(chunk(html, 'local_relief')).toContain('aria-expanded="false"')
    expect(html.match(/data-limiting=""/g)).toHaveLength(1)
  })

  it('■ Jezero only on the topographic rows; the rest carry a rule or nothing', () => {
    const html = details(yungay, 'rail')
    for (const id of ['slope', 'terrain_roughness', 'local_relief']) expect(chunk(html, id)).toContain('■')
    for (const id of ['bare_ground_fraction', 'aridity_context', 'surface_temperature_variability', 'geologic_relevance']) {
      expect(chunk(html, id)).not.toContain('■')
      expect(chunk(html, id)).not.toContain('Jezero')
    }
    expect(chunk(html, 'surface_temperature_variability')).toContain('┆')
    expect(chunk(html, 'geologic_relevance')).toContain('not yet calculated')
  })

  it('the active metric in the store wins over the limiting factor', () => {
    uiStore.setState({ activeCriterionId: 'aridity_context' })
    const html = details(yungay, 'rail')
    expect(chunk(html, 'aridity_context')).toContain('aria-expanded="true"')
    expect(chunk(html, 'terrain_roughness')).toContain('aria-expanded="false"')
    expect(html).toContain('Less rain, more analog')
  })

  it('neutral warnings and the “See the sector on the map” action', () => {
    const html = details(yungay, 'rail')
    expect(html).toContain('aria-label="Place warnings"')
    expect(html).toContain('Show the sector on the map')
  })
})

describe('MetricDetails · ficha completa', () => {
  it('seven cards in weight order, with visualization and “saturates”', () => {
    const html = details(yungay, 'full')
    const order = [...html.matchAll(/data-criterion="([a-z_]+)"/g)].map((match) => match[1])
    expect(order).toEqual(buildMetricViews(context(yungay).input).map((view) => view.criterionId))
    expect(chunk(html, 'slope')).toContain('role="img"')
    expect(chunk(html, 'surface_temperature_variability')).toContain('satura')
    expect(chunk(html, 'surface_temperature_variability')).toContain('meets the rule · does not mean equal to Mars')
    expect(chunk(html, 'bare_ground_fraction')).toContain('satura')
    expect(html).toContain('NASA POWER · nearest regional climate cell')
  })

  it('shared regional value: Domeyko and María Elena on aridity', () => {
    const html = details(domeyko, 'full')
    expect(chunk(html, 'aridity_context')).toContain('Same value and same source as Pampa María Elena')
    expect(chunk(html, 'slope')).not.toContain('Mismo valor')
    expect(details(yungay, 'full')).not.toContain('Mismo valor')
  })
})

describe('MetricDetails · S1 (carrusel APG)', () => {
  it('tabs with roving tabindex, inert inactive slides and their own aria-live region', () => {
    const html = details(yungay, 'sheet')
    expect(html).toContain('role="tablist"')
    expect(html.match(/role="tab"/g)).toHaveLength(7)
    expect(html.match(/role="tabpanel"/g)).toHaveLength(7)
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1)
    expect(html.match(/tabindex="0"/g)).toHaveLength(1)
    expect(html).toContain('aria-roledescription="carousel"')
    expect(html).toContain('aria-live="polite"')
    expect(html.match(/inert=""/g)).toHaveLength(6)
    const active = html.slice(html.indexOf('data-active=""') - 400, html.indexOf('data-active=""'))
    expect(active).toContain('terrain_roughness-slide')
  })
})

describe('detail utilities', () => {
  it('keyboard: arrows, Home and End without wrapping', () => {
    expect(nextIndex('ArrowDown', 0, 7, 'vertical')).toBe(1)
    expect(nextIndex('ArrowDown', 6, 7, 'vertical')).toBe(6)
    expect(nextIndex('ArrowUp', 0, 7, 'vertical')).toBe(0)
    expect(nextIndex('ArrowRight', 2, 7, 'horizontal')).toBe(3)
    expect(nextIndex('ArrowRight', 2, 7, 'vertical')).toBeNull()
    expect(nextIndex('Home', 4, 7, 'horizontal')).toBe(0)
    expect(nextIndex('End', 0, 7, 'vertical')).toBe(6)
  })

  it('default metric, accessible name and source', () => {
    const views = buildMetricViews(context(yungay).input)
    expect(defaultCriterion(views)).toBe('terrain_roughness')
    const roughness = views.find((view) => view.criterionId === 'terrain_roughness')
    expect(roughness && metricAriaLabel(roughness)).toBe('Roughness, similarity 66, sector 16.6 m, Jezero 11 m, limiting factor')
    expect(sourceLine('none', snapshot.manifest)).toBeNull()
    expect(sourceLine('desconocido', snapshot.manifest)).toBe('desconocido')
  })

  it('the fade indicates whether the figure went up or down, without interpolating', () => {
    expect(fadeOffset(70, 75.7)).toBe(4)
    expect(fadeOffset(75.7, 70)).toBe(-4)
    expect(fadeOffset(null, 70)).toBe(0)
    expect(fadeOffset('a', 'b')).toBe(0)
  })
})
