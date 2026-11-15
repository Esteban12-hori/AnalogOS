import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { GeologyContextView } from '../components/GeologyContext'
import { CandidateDetails } from '../components/CandidateDetails'
import { loadGeologyContext } from '../data/loadGeologyContext'
import type { CandidateSite, MissionProfile } from '../domain/contracts'
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
const profile = readJson('artifacts/science-v3/mission-profile.json') as MissionProfile
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

describe('paquete geológico real', () => {
  it('valida contrato y semántica contra los siete candidatos y mantiene los estados honestos', () => {
    expect(real.sites.map((item) => item.site_id)).toEqual(candidates.map((item) => item.site_id))
    const states = Object.fromEntries(real.sites.map((item) => [item.site_id, item.availability]))
    // 99 % nunca es completo; solo cobertura completa sin ambigüedad es available.
    expect(states['cl-win-s2500-w06970']).toBe('partial')
    expect(states['ar-win-s2620-w06750']).toBe('partial')
    expect(states['ar-win-s2640-w06730']).toBe('no_coverage')
    expect(states['ar-win-s2580-w06710']).toBe('available')
  })

  it('la política duplicada en la web coincide con la del paquete', () => {
    expect(geometriesEqual(real.policy, GEOLOGY_POLICY)).toBe(true)
  })
})

type Mutation = [string, (context: GeologyContext) => void, RegExp?]

describe('la web rechaza paquetes con vínculos falsos o fracciones inconsistentes', () => {
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
    ['geometría 1e-9', (c) => { (site(c, cl1).geometry.coordinates as number[][][])[0][0][0] += 1e-9 }, /geometría/],
    ['vértice faltante', (c) => { (site(c, cl1).geometry.coordinates as number[][][])[0].pop() }, /geometría/],
    ['anillo extra', (c) => { (site(c, cl1).geometry.coordinates as number[][][]).push((site(c, cl1).geometry.coordinates as number[][][])[0]) }, /geometría/],
    ['otro snapshot', (c) => { c.snapshot_version = 'otro' }, /snapshot/],
    ['orden', (c) => { c.sites.reverse() }, /mismo orden/],
    ['país', (c) => { site(c, cl1).country = 'AR' }, /país/],
    ['cierre de áreas', (c) => { site(c, cl1).area_fractions.unmapped = 0.3 }, /suman/],
    ['estado subestimado', (c) => { site(c, ar6).availability = 'partial' }, /availability/],
    ['estado inflado', (c) => { site(c, ar4).availability = 'available' }, /availability/],
    ['URL con host ajeno', (c) => { source(c, 'CL').requests[0].url = 'https://example.com/x' }, /URL|no válido/],
    ['URL http', (c) => { source(c, 'AR').dataset_url = 'http://sigam.segemar.gov.ar/sigam/geoservicios/' }, /no válido|URL/],
    ['fecha de mapa inventada', (c) => { (source(c, 'CL') as { map_date: string | null }).map_date = '2020-01-01' }, /map_date|no válido/],
    ['fracción > 1', (c) => { site(c, cl1).area_fractions.covered_total = 1.5 }, /no válido|reconcilia|suman/],
    ['fracción NaN', (c) => { site(c, cl1).area_fractions.unmapped = Number.NaN }, /no válido|finitas/],
    ['suma de unidades', (c) => { const u = site(c, cl1).units[0]; u.fraction_unambiguous = 0; u.fraction_in_ambiguity = u.fraction_including_overlap }, /unidades/],
    ['campo extra', (c) => { (site(c, cl1) as unknown as Record<string, unknown>).score = 1 }, /no válido/],
    ['AR cita a otro sector', (c) => { site(c, ar4).request_ids = site(c, ar6).request_ids }, /no pertenece/],
    ['AR cita dos peticiones', (c) => { site(c, ar4).request_ids = [...site(c, ar4).request_ids, ...site(c, ar6).request_ids] }, /exactamente su petición/],
    ['CL cita solo metadata', (c) => { site(c, cl1).request_ids = [source(c, 'CL').requests.find((r) => r.role === 'chile_catalog_metadata')!.request_id] }, /descarga de la capa/],
    ['request desconocida', (c) => { site(c, cl1).request_ids = ['a'.repeat(64)] }, /request_ids/],
    ['bbox con 1e-12', (c) => { const b = exact(ar4); retarget(c, ar4, `${[b[0] + 1e-12, b[1], b[2], b[3]].join(',')},EPSG:4326`) }, /bbox/],
    ['bbox redondeada a 6 decimales', (c) => { retarget(c, ar4, `${exact(ar4).map((v) => v.toFixed(6)).join(',')},EPSG:4326`) }, /bbox/],
    ['bbox sin CRS', (c) => { retarget(c, ar4, exact(ar4).join(',')) }, /bbox/],
    ['petición con parámetro extra', (c) => { const r = source(c, 'AR').requests.find((x) => x.site_id === ar4)!; r.url += '&resultType=hits' }, /parámetros/],
    ['respuesta truncada', (c) => { source(c, 'AR').requests[0].number_returned = 99 }, /truncada/],
    ['petición faltante', (c) => { source(c, 'AR').requests.pop() }, /por sector/],
    ['metadata CL faltante', (c) => { source(c, 'CL').requests.pop() }, /exactamente metadata/],
    ['política relajada', (c) => { c.policy.repair_total_area_relative_limit = 0.5 }, /policy|no válido/],
    ['reparación fuera de límite', (c) => { site(c, cl1).geometry_diagnostics.push({ feature_id: 'x', validity_reason: 'r', method: 'm', status: 'accepted', total_area_relative_change: 0.5, symmetric_difference_relative_to_entity: 0, symmetric_difference_fraction_of_aoi: 0 }) }, /área total/],
    ['licencia sin id', (c) => { source(c, 'CL').license.declared_id = 'otra' }, /licencia/],
  ]
  it.each(mutations)('%s', (_name, mutate, message) => {
    const broken = clone(real)
    mutate(broken)
    expect(() => parseGeologyContext(broken, candidates)).toThrow(message)
  })

  it('acepta la misma bbox escrita en su forma exacta y un candidato idéntico', () => {
    const copy = clone(real)
    const b = exact(ar4)
    retarget(copy, ar4, `${b.join(',')},EPSG:4326`)
    expect(() => parseGeologyContext(copy, candidates)).not.toThrow()
  })

  it('la bbox de la petición se parsea sin redondeo', () => {
    const request = source(real, 'AR').requests.find((item) => item.site_id === ar4)!
    expect(wfsBbox(request.url)).toEqual(exact(ar4))
  })

  it('un fixture o un snapshot distinto no recibe ficha: no hay herencia entre sectores', () => {
    expect(() => parseGeologyContext(realRaw, fixtures)).toThrow()
    expect(selectGeologySite(ready, fixtures[0]).status).toBe('unavailable')
    const moved = clone(candidates[0])
    moved.geometry = clone(moved.geometry)
    ;(moved.geometry.coordinates as number[][][])[0][0][0] += 1e-9
    expect(selectGeologySite(ready, moved).status).toBe('unavailable')
  })
})

describe('exportación geológica independiente', () => {
  it('cada sector exporta un subconjunto válido con las peticiones necesarias y sin confundir el hash', () => {
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

  it('el subconjunto de Argentina no arrastra peticiones de otros sectores', () => {
    const exported = buildGeologyExport(real, 'ar-win-s2620-w06750')
    expect(exported.source.requests).toHaveLength(1)
    expect(JSON.stringify(exported)).not.toContain('ar-win-s2580-w06710')
  })

  it('coincide con la exportación de referencia generada por Python (paridad entre lenguajes)', () => {
    const golden = readJson('tests/fixtures/geology-export-ar-win-s2640-w06730.json')
    expect(buildGeologyExport(real, 'ar-win-s2640-w06730')).toEqual(golden)
  })

  it('rechaza exportaciones manipuladas', () => {
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

  it('lee solo el archivo local y valida el paquete', async () => {
    const fetcher = vi.fn(async (_url: string, _init?: RequestInit) => ok())
    const state = await loadGeologyContext(candidates, { baseUrl: '/AnalogOS/', fetcher })
    expect(state.status).toBe('ready')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher.mock.calls[0][0]).toBe('/AnalogOS/geology-context-v1/index.json')
  })

  it('ausente, inválido, de otro snapshot o enorme: no disponible, sin lanzar', async () => {
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
    expect(huge).toMatchObject({ status: 'unavailable', reason: expect.stringContaining('tamaño') })
    const failing = await loadGeologyContext(candidates, { fetcher: async () => { throw new TypeError('red caída') } })
    expect(failing.status).toBe('unavailable')
  })

  it('el tiempo máximo cubre la lectura del cuerpo, no solo la cabecera', async () => {
    const hanging = {
      ok: true,
      status: 200,
      headers: new Headers(),
      text: () => new Promise<string>(() => undefined), // cabecera rápida, cuerpo que nunca termina
    } as unknown as Response
    const started = Date.now()
    const state = await loadGeologyContext(candidates, { fetcher: async () => hanging, timeoutMs: 40 })
    expect(state).toMatchObject({ status: 'unavailable', reason: expect.stringContaining('tardó') })
    expect(Date.now() - started).toBeLessThan(2000)
  })
})

describe('formato honesto y ficha', () => {
  it('no redondea a 0 % ni a 100 % cuando no corresponde', () => {
    expect(formatCoverage(0)).toBe('0 %')
    expect(formatCoverage(0.0004)).toBe('<0,1 %')
    expect(formatCoverage(0.5)).toBe('50,0 %')
    expect(formatCoverage(0.9939)).toBe('99,4 %')
    expect(formatCoverage(0.9996)).toBe('>99,9 %')
    expect(formatCoverage(1)).toBe('100 %')
    expect(formatCoverage(1 - 1e-9)).toBe('100 %')
  })

  const byId = (id: string) => candidates.find((candidate) => candidate.site_id === id)!

  it('muestra cobertura, huecos, escala y fuente, sin sugerir aptitud', () => {
    const html = render(byId('cl-win-s2500-w06970'), ready)
    expect(html).toContain('Contexto geológico')
    expect(html).toContain('Cobertura parcial')
    expect(html).toContain('1:1.000.000')
    expect(html).toContain('SERNAGEOMIN')
    expect(html).toContain('99,4 %')
    expect(html).toContain('Solape entre unidades distintas')
    expect(html).toContain('no es resolución en metros')
    expect(html).toContain('No informada por la fuente')
    expect(html).toContain('compatibilidad planetaria calibrada')
    expect(html).not.toMatch(/apto|seguro|tracción conocida|granulometría medida/i)
  })

  it('distingue sin cobertura, parcial al 50 % y cobertura completa', () => {
    const none = render(byId('ar-win-s2640-w06730'), ready)
    expect(none).toContain('Sin cobertura en esta capa')
    expect(none).toContain('No significa que no haya rocas')
    expect(none).toContain('Esta capa no tiene unidades dentro del sector')
    const half = render(byId('ar-win-s2620-w06750'), ready)
    expect(half).toContain('50,0 %')
    expect(half).toContain('1:250.000')
    const full = render(byId('ar-win-s2580-w06710'), ready)
    expect(full).toContain('Cobertura cartográfica completa')
    expect(full).toContain('100 %')
  })

  it('muestra las unidades con su descripción original y nombres largos', () => {
    const long = clone(real)
    const unit = site(long, 'ar-win-s2580-w06710').units[0]
    unit.name = 'N'.repeat(220)
    unit.description = null
    unit.description_present = false
    const html = render(byId('ar-win-s2580-w06710'), { status: 'ready', context: long })
    expect(html).toContain('N'.repeat(220))
    expect(html).toContain('Sin descripción en la fuente')
    const original = render(byId('cl-win-s2500-w06970'), ready)
    expect(original).toContain(site(real, 'cl-win-s2500-w06970').units[0].description!)
  })

  it('«no disponible» no rompe la ficha: ausente, cargando y fixture', () => {
    for (const state of [{ status: 'unavailable', reason: 'Este build no incluye contexto geológico (404).' }, { status: 'loading' }] as GeologyContextState[]) {
      const html = render(byId('cl-win-s2500-w06970'), state)
      expect(html).toContain('El ranking, la ficha y la evaluación no dependen de él')
    }
    expect(render(fixtures[0], ready)).toContain('fixtures sintéticos')
  })

  it('la ficha completa del candidato incluye la sección y funciona sin el paquete', () => {
    for (const geology of [ready, { status: 'unavailable', reason: 'sin paquete' } as GeologyContextState]) {
      const html = renderToStaticMarkup(
        <CandidateDetails candidate={byId('cl-win-s2500-w06970')} candidates={candidates} onSelect={() => undefined} marsReference={null}
          profile={profile} visual={{ status: 'loading' }} geology={geology} search={null} precedents={null} />,
      )
      expect(html).toContain('Contexto geológico')
      expect(html).toContain('Ficha de candidato')
      expect(html).toContain('Geología')
    }
  })

  it('ofrece un botón de descarga accesible con nombre estable', () => {
    const html = render(byId('cl-win-s2500-w06970'), ready)
    expect(html).toContain('Descargar contexto geológico (JSON)')
    expect(html).toContain('cl-win-s2500-w06970-geology-context.json')
    expect(html).toContain('<details')
  })
})


describe('contexto geológico y advertencias históricas', () => {
  it('actualiza solo la presentación cuando hay contexto validado, conservando el snapshot y la falta de calibración', () => {
    const before = JSON.stringify(candidates[0])
    const view = (geology: GeologyContextState) => renderToStaticMarkup(
      <CandidateDetails candidate={candidates[0]} candidates={candidates} onSelect={() => undefined} marsReference={null}
        profile={profile} visual={{ status: 'loading' }} geology={geology} search={null} precedents={null} />,
    )
    const loaded = view(ready)
    expect(loaded).toContain('Falta calibrar su compatibilidad')
    expect(loaded).not.toContain('Requiere cartografía geológica oficial (SERNAGEOMIN)')
    expect(loaded).not.toContain('Geología, áreas protegidas, urbano, propiedad y acceso permanecen pendientes')
    expect(loaded).toContain('Sin calibrar')
    expect(view({ status: 'unavailable', reason: 'sin paquete' })).toContain('Requiere cartografía geológica oficial (SERNAGEOMIN)')
    expect(JSON.stringify(candidates[0])).toBe(before)
  })
})
