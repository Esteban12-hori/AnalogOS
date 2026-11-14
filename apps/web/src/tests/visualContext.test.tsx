import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VisualContextView } from '../components/VisualContext'
import {
  loadVisualContext,
  parseVisualContext,
  selectVisualSite,
  visualContextUrl,
  type VisualContextState,
} from '../data/loadVisualContext'
import type { CandidateSite } from '../domain/contracts'

const root = resolve(__dirname, '../../../..')
const readJson = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'))

const realIndex = readJson('artifacts/visual-context/index.json')
const candidates = readJson('artifacts/science-v2/candidate-details.json') as CandidateSite[]
const fixtures = readJson('artifacts/demo/candidate-details.json') as CandidateSite[]
const ready: VisualContextState = { status: 'ready', index: parseVisualContext(realIndex) }

function render(candidate: CandidateSite, state: VisualContextState, options: { baseUrl?: string; imageFailed?: boolean } = {}) {
  return renderToStaticMarkup(
    <VisualContextView
      candidateName={candidate.name}
      selection={selectVisualSite(state, candidate)}
      baseUrl={options.baseUrl ?? './'}
      imageFailed={options.imageFailed ?? false}
      onImageError={() => undefined}
    />,
  )
}

describe('índice de contexto visual real', () => {
  it('es válido y cubre exactamente los candidatos del snapshot v2', () => {
    const index = parseVisualContext(realIndex)
    expect(index.sites.map((site) => site.site_id)).toEqual(candidates.map((candidate) => candidate.site_id))
    expect(index.sites.every((site) => site.image === `${site.site_id}.png`)).toBe(true)
    expect(candidates.every((candidate) => candidate.data_snapshot_version === index.snapshot_version)).toBe(true)
  })

  it('rechaza índices de otro tipo o con rutas de imagen fuera del paquete', () => {
    const index = parseVisualContext(realIndex)
    expect(() => parseVisualContext({ ...index, kind: 'otro' })).toThrow(/tipo o versión/)
    for (const image of ['../science-v2/manifest.json', 'https://example.org/a.png', 'carpeta/a.png']) {
      const sites = [{ ...index.sites[0], image }, ...index.sites.slice(1)]
      expect(() => parseVisualContext({ ...index, sites })).toThrow(/imagen no permitida/)
    }
    expect(() => parseVisualContext(null)).toThrow()
  })

  it('rechaza metadata malformada antes de renderizar y deja el panel en "no disponible"', async () => {
    const index = parseVisualContext(realIndex)
    const withSite = (changes: Record<string, unknown>) => ({
      ...index, sites: [{ ...index.sites[0], ...changes }, ...index.sites.slice(1)],
    })
    const scene = index.sites[0].scenes_used?.[0]
    const malformed: unknown[] = [
      withSite({ scenes_used: [null] }),
      withSite({ scenes_used: ['2025-12-21'] }),
      withSite({ scenes_used: [{ ...scene, date_from: 20251221 }] }),
      withSite({ scenes_used: [{ ...scene, fraction: 1.5 }] }),
      withSite({ scenes_used: [{ ...scene, pixels: -1 }] }),
      withSite({ scenes_used: 'todas' }),
      withSite({ image: index.sites[1].image }), // imagen de otro candidato
      withSite({ site_id: index.sites[1].site_id, image: index.sites[1].image }), // site_id repetido
      withSite({ bbox: [0, 0, 0, 1] }),
      withSite({ bbox: [-70, -24, -69, null] }),
      withSite({ width: 0 }),
      withSite({ height: 12.5 }),
      withSite({ approx_meters_per_pixel: -3 }),
      withSite({ scenes_considered: 1.5 }),
      withSite({ extent_km: { width: 20 } }),
      withSite({ sha256: 'abc' }),
      { ...index, sites: [null, ...index.sites.slice(1)] },
      { ...index, sites: 'ninguno' },
    ]
    for (const data of malformed) {
      expect(() => parseVisualContext(data)).toThrow(/no válido/)
      vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => data })))
      const state = await loadVisualContext('./')
      expect(state.status).toBe('unavailable')
      expect(render(candidates[0], state)).toContain('Imagen satelital no disponible')
    }
    vi.unstubAllGlobals()
  })
})

describe('rutas y selección', () => {
  it('resuelve los archivos locales en raíz, ruta relativa y subcarpeta', () => {
    expect(visualContextUrl('/', 'index.json')).toBe('/visual-context/index.json')
    expect(visualContextUrl('./', 'a.png')).toBe('./visual-context/a.png')
    expect(visualContextUrl('/AnalogOS/', 'a.png')).toBe('/AnalogOS/visual-context/a.png')
  })

  it('entrega la imagen propia de cada candidato real', () => {
    for (const candidate of candidates) {
      const selection = selectVisualSite(ready, candidate)
      expect(selection.status === 'ready' && selection.site.image).toBe(`${candidate.site_id}.png`)
    }
  })

  it('deja sin imagen a fixtures, otros snapshots, candidatos sin entrada y estados no listos', () => {
    expect(selectVisualSite(ready, fixtures[0]).status).toBe('unavailable')
    expect(selectVisualSite(ready, { ...candidates[0], data_snapshot_version: 'otro-snapshot' }).status).toBe('unavailable')
    expect(selectVisualSite(ready, { ...candidates[0], site_id: 'cl-sin-imagen' }).status).toBe('unavailable')
    expect(selectVisualSite({ status: 'loading' }, candidates[0]).status).toBe('loading')
    expect(selectVisualSite({ status: 'unavailable', reason: 'x' }, candidates[0])).toEqual({ status: 'unavailable', reason: 'x' })
  })
})

describe('panel de contexto satelital', () => {
  it('muestra imagen local, periodo, atribución, nota preliminar y procedencia', () => {
    const html = render(candidates[0], ready, { baseUrl: '/AnalogOS/' })
    expect(html).toContain(`src="/AnalogOS/visual-context/${candidates[0].site_id}.png"`)
    expect(html).toContain('href="/AnalogOS/visual-context/index.json"')
    expect(html).toContain('Mosaico de diciembre de 2025')
    expect(html).toContain('Copernicus Sentinel')
    expect(html).toContain('No cambia similitud, confianza ni factibilidad')
    expect(html).toContain('2025-12-01 a 2026-01-01 (UTC)')
    expect(html).toMatch(/alt="Vista Sentinel-2 en color natural del sector [^"]+"/)
    // La web solo enlaza archivos locales: ninguna URL de la API de Copernicus.
    expect(html).not.toContain('dataspace.copernicus.eu')
    expect(html).not.toMatch(/(src|href)="https?:/)
  })

  it('cambia de imagen al cambiar de candidato', () => {
    const sources = candidates.map((candidate) => /src="([^"]+)"/.exec(render(candidate, ready))?.[1])
    expect(new Set(sources).size).toBe(candidates.length)
  })

  it('informa "no disponible" sin imagen en fixtures, índice ausente o archivo de imagen fallido', () => {
    const cases = [
      render(fixtures[0], ready),
      render(candidates[0], { status: 'unavailable', reason: 'Este build no incluye contexto visual (404).' }),
      render(candidates[0], ready, { imageFailed: true }),
    ]
    for (const html of cases) {
      expect(html).toContain('Imagen satelital no disponible')
      expect(html).toContain('El ranking y la ficha no dependen de ella')
      expect(html).not.toContain('<img')
    }
    expect(render(candidates[0], { status: 'loading' })).toContain('Cargando contexto satelital')
  })
})

describe('loadVisualContext', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('pide solo el índice local y nunca lanza', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => realIndex }))
    vi.stubGlobal('fetch', fetchMock)
    expect((await loadVisualContext('/AnalogOS/')).status).toBe('ready')
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/AnalogOS/visual-context/index.json')

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })))
    expect(await loadVisualContext('./')).toMatchObject({ status: 'unavailable' })

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ kind: 'otro' }) })))
    expect(await loadVisualContext('./')).toMatchObject({ status: 'unavailable' })

    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('sin red') }))
    expect(await loadVisualContext('./')).toEqual({ status: 'unavailable', reason: 'sin red' })
  })
})
