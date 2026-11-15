import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { GeologyContextView } from '../components/GeologyContext'
import { loadGeologyContext } from '../data/loadGeologyContext'
import type { CandidateSite } from '../domain/contracts'
import {
  GEOLOGY_POLICY,
  buildGeologyExport,
  formatCoverage,
  geologyExportFileName,
  geometriesEqual,
  parseGeologyContext,
  selectGeologySite,
  validateGeologyExport,
  wfsBbox,
  aoiBounds,
  type GeologyContext,
  type GeologyContextState,
} from '../domain/geologyContext'

const root = resolve(__dirname, '../../../..')
const readJson = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const candidates = readJson('artifacts/science-v3/candidate-details.json') as CandidateSite[]
const fixtures = readJson('artifacts/demo/candidate-details.json') as CandidateSite[]
const realRaw = readJson('artifacts/geology-context-v1/index.json')
const real = parseGeologyContext(realRaw, candidates)
const ready: GeologyContextState = { status: 'ready', context: real }
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const site = (context: GeologyContext, id: string) => context.sites.find((item) => item.site_id === id)!
const source = (context: GeologyContext, country: 'CL' | 'AR') => context.sources.find((item) => item.country === country)!

function render(candidate: CandidateSite, state: GeologyContextState): string {
  return renderToStaticMarkup(
    <GeologyContextView candidateName={candidate.name} selection={selectGeologySite(state, candidate)} onDownload={() => undefined} />,
  )
}

describe('real geology package', () => {
  it('validates contract and semantics against the seven candidates and keeps honest states', () => {
    expect(real.sites.map((item) => item.site_id)).toEqual(candidates.map((item) => item.site_id))
    const states = Object.fromEntries(real.sites.map((item) => [item.site_id, item.availability]))
    // 99% is never complete; only complete coverage without ambiguity is available.
    expect(states['cl-win-s2500-w06970']).toBe('partial')
    expect(states['ar-win-s2620-w06750']).toBe('partial')
    expect(states['ar-win-s2640-w06730']).toBe('no_coverage')
    expect(states['ar-win-s2580-w06710']).toBe('available')
  })

  it('the policy duplicated in the web app matches the package one', () => {
    expect(geometriesEqual(real.policy, GEOLOGY_POLICY)).toBe(true)
  })
})

type Mutation = [string, (context: GeologyContext) => void, RegExp?]

describe('the web app rejects packages with false links or inconsistent fractions', () => {
  const ar4 = 'ar-win-s2620-w06750'
  const ar6 = 'ar-win-s2580-w06710'
  const cl1 = 'cl-win-s2500-w06970'
  const retarget = (context: GeologyContext, id: string, bbox: string) => {
    const request = source(context, 'AR').requests.find((item) => item.site_id === id)!
    const url = new URL(request.url)
    url.searchParams.set('bbox', bbox)
    request.url = url.toString()
  }
  const exact = (id: string) => aoiBounds(real.sites.find((item) => item.site_id === id)!.geometry)
  const mutations: Mutation[] = [
    ['geometría 1e-9', (c) => { (site(c, cl1).geometry.coordinates as number[][][])[0][0][0] += 1e-9 }, /geometry/],
    ['vértice faltante', (c) => { (site(c, cl1).geometry.coordinates as number[][][])[0].pop() }, /geometry/],
    ['anillo extra', (c) => { (site(c, cl1).geometry.coordinates as number[][][]).push((site(c, cl1).geometry.coordinates as number[][][])[0]) }, /geometry/],
    ['otro snapshot', (c) => { c.snapshot_version = 'otro' }, /snapshot/],
    ['orden', (c) => { c.sites.reverse() }, /same order/],
    ['país', (c) => { site(c, cl1).country = 'AR' }, /country/],
    ['cierre de áreas', (c) => { site(c, cl1).area_fractions.unmapped = 0.3 }, /add up/],
    ['estado subestimado', (c) => { site(c, ar6).availability = 'partial' }, /availability/],
    ['estado inflado', (c) => { site(c, ar4).availability = 'available' }, /availability/],
    ['URL con host ajeno', (c) => { source(c, 'CL').requests[0].url = 'https://example.com/x' }, /URL|Invalid/],
    ['URL http', (c) => { source(c, 'AR').dataset_url = 'http://sigam.segemar.gov.ar/sigam/geoservicios/' }, /Invalid|URL/],
    ['fecha de mapa inventada', (c) => { (source(c, 'CL') as { map_date: string | null }).map_date = '2020-01-01' }, /map_date|Invalid/],
    ['fracción > 1', (c) => { site(c, cl1).area_fractions.covered_total = 1.5 }, /Invalid|reconcile|add up/],
    ['fracción NaN', (c) => { site(c, cl1).area_fractions.unmapped = Number.NaN }, /Invalid|finite/],
    ['suma de unidades', (c) => { const u = site(c, cl1).units[0]; u.fraction_unambiguous = 0; u.fraction_in_ambiguity = u.fraction_including_overlap }, /units/],
    ['campo extra', (c) => { (site(c, cl1) as unknown as Record<string, unknown>).score = 1 }, /Invalid/],
    ['AR cita a otro sector', (c) => { site(c, ar4).request_ids = site(c, ar6).request_ids }, /does not belong/],
    ['AR cita dos peticiones', (c) => { site(c, ar4).request_ids = [...site(c, ar4).request_ids, ...site(c, ar6).request_ids] }, /exactly its own WFS request/],
    ['CL cita solo metadata', (c) => { site(c, cl1).request_ids = [source(c, 'CL').requests.find((r) => r.role === 'chile_catalog_metadata')!.request_id] }, /layer download/],
    ['request desconocida', (c) => { site(c, cl1).request_ids = ['a'.repeat(64)] }, /request_ids/],
    ['bbox con 1e-12', (c) => { const b = exact(ar4); retarget(c, ar4, `${[b[0] + 1e-12, b[1], b[2], b[3]].join(',')},EPSG:4326`) }, /bbox/],
    ['bbox redondeada a 6 decimales', (c) => { retarget(c, ar4, `${exact(ar4).map((v) => v.toFixed(6)).join(',')},EPSG:4326`) }, /bbox/],
    ['bbox sin CRS', (c) => { retarget(c, ar4, exact(ar4).join(',')) }, /bbox/],
    ['petición con parámetro extra', (c) => { const r = source(c, 'AR').requests.find((x) => x.site_id === ar4)!; r.url += '&resultType=hits' }, /parameters/],
    ['respuesta truncada', (c) => { source(c, 'AR').requests[0].number_returned = 99 }, /truncated/],
    ['petición faltante', (c) => { source(c, 'AR').requests.pop() }, /per sector/],
    ['metadata CL faltante', (c) => { source(c, 'CL').requests.pop() }, /exactly the CKAN metadata/],
    ['política relajada', (c) => { c.policy.repair_total_area_relative_limit = 0.5 }, /policy|Invalid/],
    ['reparación fuera de límite', (c) => { site(c, cl1).geometry_diagnostics.push({ feature_id: 'x', validity_reason: 'r', method: 'm', status: 'accepted', total_area_relative_change: 0.5, symmetric_difference_relative_to_entity: 0, symmetric_difference_fraction_of_aoi: 0 }) }, /total-area/],
    ['licencia sin id', (c) => { source(c, 'CL').license.declared_id = 'otra' }, /license/],
  ]
  it.each(mutations)('%s', (_name, mutate, message) => {
    const broken = clone(real)
    mutate(broken)
    expect(() => parseGeologyContext(broken, candidates)).toThrow(message)
  })

  it('accepts the same bbox written in its exact form and an identical candidate', () => {
    const copy = clone(real)
    const b = exact(ar4)
    retarget(copy, ar4, `${b.join(',')},EPSG:4326`)
    expect(() => parseGeologyContext(copy, candidates)).not.toThrow()
  })

  it('the request bbox is parsed without rounding', () => {
    const request = source(real, 'AR').requests.find((item) => item.site_id === ar4)!
    expect(wfsBbox(request.url)).toEqual(exact(ar4))
  })

  it('a fixture or a different snapshot gets no sheet: no inheritance between sectors', () => {
    expect(() => parseGeologyContext(realRaw, fixtures)).toThrow()
    expect(selectGeologySite(ready, fixtures[0]).status).toBe('unavailable')
    const moved = clone(candidates[0])
    moved.geometry = clone(moved.geometry)
    ;(moved.geometry.coordinates as number[][][])[0][0][0] += 1e-9
    expect(selectGeologySite(ready, moved).status).toBe('unavailable')
  })
})

describe('standalone geology export', () => {
  it('each sector exports a valid subset with the necessary requests and without confusing the hash', () => {
    for (const item of real.sites) {
      const exported = buildGeologyExport(real, item.site_id)
      expect(() => validateGeologyExport(clone(exported))).not.toThrow()
      expect(exported.site).toEqual(item)
      expect(exported.export_info.subset).toBe(true)
      expect(exported.export_info.full_candidates_file_sha256).toBe(real.candidates_sha256)
      expect('candidates_sha256' in exported).toBe(false)
      const roles = exported.source.requests.map((request) => request.role).sort()
      expect(roles).toEqual(item.country === 'AR' ? ['argentina_wfs'] : ['chile_catalog_metadata', 'chile_layer'])
      expect(exported.source.requests.every((request) => request.role !== 'argentina_wfs' || request.site_id === item.site_id)).toBe(true)
      expect(geologyExportFileName(item.site_id)).toBe(`${item.site_id}-geology-context.json`)
    }
  })

  it('the Argentina subset does not drag requests from other sectors', () => {
    const exported = buildGeologyExport(real, 'ar-win-s2620-w06750')
    expect(exported.source.requests).toHaveLength(1)
    expect(JSON.stringify(exported)).not.toContain('ar-win-s2580-w06710')
  })

  it('matches the reference export generated by Python (cross-language parity)', () => {
    // Historical v1 (frozen Spanish export_info) and English v2 goldens, both generated by pipelines/geology_contract.py.
    const golden = readJson('tests/fixtures/geology-export-ar-win-s2640-w06730.json')
    expect(buildGeologyExport(real, 'ar-win-s2640-w06730', 1)).toEqual(golden)
    const goldenV2 = readJson('tests/fixtures/geology-export-v2-ar-win-s2640-w06730.json')
    expect(buildGeologyExport(real, 'ar-win-s2640-w06730', 2)).toEqual(goldenV2)
    expect(buildGeologyExport(real, 'ar-win-s2640-w06730')).toEqual(goldenV2) // new reports default to English v2
  })

  it('v1 and v2 have the same content; only schema_version and the export_info text change, which must match their version', () => {
    for (const site of real.sites) {
      const v1 = buildGeologyExport(real, site.site_id, 1)
      const v2 = buildGeologyExport(real, site.site_id, 2)
      const strip = (e: typeof v1) => ({ ...e, schema_version: null, export_info: { ...e.export_info, description: null, how_to_read: null } })
      expect(strip(v2)).toEqual(strip(v1))
      expect(v2.export_info.how_to_read.join(' ')).toMatch(/keep their original wording, mostly Spanish/)
    }
    const v2 = buildGeologyExport(real, 'ar-win-s2620-w06750', 2)
    const v1 = buildGeologyExport(real, 'ar-win-s2620-w06750', 1)
    expect(() => validateGeologyExport({ ...v2, export_info: v1.export_info })).toThrow(/export_info/)
    expect(() => validateGeologyExport({ ...v1, schema_version: 2 })).toThrow(/export_info/)
    expect(() => validateGeologyExport({ ...v1, schema_version: 3 })).toThrow()
    expect(() => buildGeologyExport(real, 'ar-win-s2620-w06750', 3 as never)).toThrow()
  })

  it('rejects tampered exports', () => {
    const base = buildGeologyExport(real, 'ar-win-s2620-w06750')
    const cases: [string, (e: ReturnType<typeof clone<typeof base>>) => void][] = [
      ['peticiones de otro sector', (e) => { e.site.request_ids = ['b'.repeat(64)] }],
      ['bbox movida', (e) => { e.source.requests[0].url = e.source.requests[0].url.replace('bbox=', 'bbox=1') }],
      ['cierre', (e) => { e.site.area_fractions.unmapped = 0 }],
      ['estado', (e) => { e.site.availability = 'available' }],
      ['subset falso', (e) => { (e.export_info as { subset: boolean }).subset = false }],
      ['host', (e) => { e.source.dataset_url = 'https://evil.example/x' }],
      ['hash', (e) => { e.export_info.full_candidates_file_sha256 = 'zz' }],
      ['fuente ajena', (e) => { e.source.source_id = 'cl-sernageomin-mma-geologia-base' }],
    ]
    for (const [name, mutate] of cases) {
      const broken = clone(base)
      mutate(broken)
      expect(() => validateGeologyExport(broken), name).toThrow()
    }
  })
})

describe('carga opcional tolerante', () => {
  const ok = () => new Response(JSON.stringify(realRaw), { status: 200 })

  it('reads only the local file and validates the package', async () => {
    const fetcher = vi.fn(async (_url: string, _init?: RequestInit) => ok())
    const state = await loadGeologyContext(candidates, { baseUrl: '/AnalogOS/', fetcher })
    expect(state.status).toBe('ready')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0][0]).toBe('/AnalogOS/geology-context-v1/index.json')
  })

  it('absent, invalid, from another snapshot or huge: unavailable, without throwing', async () => {
    const missing = await loadGeologyContext(candidates, { fetcher: async () => new Response('', { status: 404 }) })
    expect(missing).toMatchObject({ status: 'unavailable' })
    const garbage = await loadGeologyContext(candidates, { fetcher: async () => new Response('{no json', { status: 200 }) })
    expect(garbage.status).toBe('unavailable')
    const broken = clone(real)
    broken.sites[0].area_fractions.unmapped = 0.5
    const invalid = await loadGeologyContext(candidates, { fetcher: async () => new Response(JSON.stringify(broken)) })
    expect(invalid.status).toBe('unavailable')
    const other = await loadGeologyContext(fixtures, { fetcher: async () => ok() })
    expect(other.status).toBe('unavailable')
    const huge = await loadGeologyContext(candidates, { fetcher: async () => new Response('x'.repeat(2.5 * 1024 * 1024)) })
    expect(huge).toMatchObject({ status: 'unavailable', reason: expect.stringContaining('size') })
    const failing = await loadGeologyContext(candidates, { fetcher: async () => { throw new TypeError('red caída') } })
    expect(failing.status).toBe('unavailable')
  })

  it('the timeout covers reading the body, not only the headers', async () => {
    const hanging = {
      ok: true,
      status: 200,
      headers: new Headers(),
      text: () => new Promise<string>(() => undefined), // fast headers, body that never finishes
    } as unknown as Response
    const started = Date.now()
    const state = await loadGeologyContext(candidates, { fetcher: async () => hanging, timeoutMs: 40 })
    expect(state).toMatchObject({ status: 'unavailable', reason: expect.stringContaining('too long') })
    expect(Date.now() - started).toBeLessThan(2000)
  })
})

describe('honest format and site sheet', () => {
  it('does not round to 0% or 100% when it does not apply', () => {
    expect(formatCoverage(0)).toBe('0%')
    expect(formatCoverage(0.0004)).toBe('<0.1%')
    expect(formatCoverage(0.5)).toBe('50.0%')
    expect(formatCoverage(0.9939)).toBe('99.4%')
    expect(formatCoverage(0.9996)).toBe('>99.9%')
    expect(formatCoverage(1)).toBe('100%')
    expect(formatCoverage(1 - 1e-9)).toBe('100%')
  })

  const byId = (id: string) => candidates.find((candidate) => candidate.site_id === id)!

  it('shows coverage, gaps, scale and source, without suggesting suitability', () => {
    const html = render(byId('cl-win-s2500-w06970'), ready)
    expect(html).toContain('Geological context')
    expect(html).toContain('Partial coverage')
    expect(html).toContain('1:1,000,000')
    expect(html).toContain('SERNAGEOMIN')
    expect(html).toContain('99.4%')
    expect(html).toContain('Overlap between different units')
    expect(html).toContain('not a resolution in meters')
    expect(html).toContain('Not reported by the source')
    expect(html).toContain('calibrated planetary compatibility')
    expect(html).not.toMatch(/apto|seguro|tracción conocida|granulometría medida|\bis suitable\b|\bsafe\b|known traction|measured grain size/i)
  })

  it('distinguishes no coverage, partial at 50% and full coverage', () => {
    const none = render(byId('ar-win-s2640-w06730'), ready)
    expect(none).toContain('No coverage in this layer')
    expect(none).toContain('It does not mean there is no rock')
    expect(none).toContain('This layer has no units inside the sector')
    const half = render(byId('ar-win-s2620-w06750'), ready)
    expect(half).toContain('50.0%')
    expect(half).toContain('1:250.000')
    const full = render(byId('ar-win-s2580-w06710'), ready)
    expect(full).toContain('Complete map coverage')
    expect(full).toContain('100%')
  })

  it('shows the units with their original description and long names', () => {
    const long = clone(real)
    const unit = site(long, 'ar-win-s2580-w06710').units[0]
    unit.name = 'N'.repeat(220)
    unit.description = null
    unit.description_present = false
    const html = render(byId('ar-win-s2580-w06710'), { status: 'ready', context: long })
    expect(html).toContain('N'.repeat(220))
    expect(html).toContain('No description in the source')
    const original = render(byId('cl-win-s2500-w06970'), ready)
    expect(original).toContain(site(real, 'cl-win-s2500-w06970').units[0].description!)
  })

  it('“unavailable” does not break the sheet: absent, loading and fixture', () => {
    for (const state of [{ status: 'unavailable', reason: 'Este build no incluye contexto geológico (404).' }, { status: 'loading' }] as GeologyContextState[]) {
      const html = render(byId('cl-win-s2500-w06970'), state)
      expect(html).toContain('The ranking, the site sheet and the evaluation do not depend on it')
    }
    expect(render(fixtures[0], ready)).toContain('Synthetic fixtures')
  })

  // “The full candidate sheet includes the section and works without the package” was ported with the
  // same expectations to shell/detail/GeologyTab.test.tsx (“Geology” tab of the integrated sheet),
  // because CandidateDetails is not part of the integrated UI (ADR-013).

  it('offers an accessible download button with a stable name', () => {
    const html = render(byId('cl-win-s2500-w06970'), ready)
    expect(html).toContain('Download geological context (JSON source record)')
    expect(html).toContain('cl-win-s2500-w06970-geology-context.json')
    expect(html).toContain('<details')
  })
})


// The “geological context and historical warnings” block was ported with the same expectations to
// shell/detail/GeologyTab.test.tsx: the pending geology criterion (Metrics) and “Where the analogy
// breaks down” (Sources) of the integrated sheet, because CandidateDetails and ScoreBreakdown are not
// part of the integrated UI (ADR-013).
