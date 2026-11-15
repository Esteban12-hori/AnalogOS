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

const realIndex = readJson('artifacts/visual-context-v3/index.json')
const candidates = readJson('artifacts/science-v3/candidate-details.json') as CandidateSite[]
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

describe('real visual context index', () => {
  it('is valid and covers exactly the v3 snapshot sites', () => {
    const index = parseVisualContext(realIndex)
    expect(index.sites.map((site) => site.site_id)).toEqual(candidates.map((candidate) => candidate.site_id))
    expect(index.sites.every((site) => site.image === `${site.site_id}.png`)).toBe(true)
    expect(candidates.every((candidate) => candidate.data_snapshot_version === index.snapshot_version)).toBe(true)
  })

  it('rejects indexes of another kind or with image paths outside the package', () => {
    const index = parseVisualContext(realIndex)
    expect(() => parseVisualContext({ ...index, kind: 'otro' })).toThrow(/unknown kind or version/)
    for (const image of ['../science-v2/manifest.json', 'https://example.org/a.png', 'carpeta/a.png']) {
      const sites = [{ ...index.sites[0], image }, ...index.sites.slice(1)]
      expect(() => parseVisualContext({ ...index, sites })).toThrow(/image not allowed/)
    }
    expect(() => parseVisualContext(null)).toThrow()
  })

  it('rejects malformed metadata before rendering and leaves the panel “unavailable”', async () => {
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
      withSite({ image: index.sites[1].image }), // image of another candidate
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
      expect(() => parseVisualContext(data)).toThrow(/Invalid visual context/)
      vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => data })))
      const state = await loadVisualContext('./')
      expect(state.status).toBe('unavailable')
      expect(render(candidates[0], state)).toContain('Satellite image not available')
    }
    vi.unstubAllGlobals()
  })
})

describe('paths and selection', () => {
  it('resolves local files at the root, relative path and subfolder', () => {
    expect(visualContextUrl('/', 'index.json')).toBe('/visual-context-v3/index.json')
    expect(visualContextUrl('./', 'a.png')).toBe('./visual-context-v3/a.png')
    expect(visualContextUrl('/AnalogOS/', 'a.png')).toBe('/AnalogOS/visual-context-v3/a.png')
  })

  it('delivers each real candidate its own image', () => {
    for (const candidate of candidates) {
      const selection = selectVisualSite(ready, candidate)
      expect(selection.status === 'ready' && selection.site.image).toBe(`${candidate.site_id}.png`)
    }
  })

  it('leaves fixtures, other snapshots, candidates without an entry and non-ready states without an image', () => {
    expect(selectVisualSite(ready, fixtures[0]).status).toBe('unavailable')
    expect(selectVisualSite(ready, { ...candidates[0], data_snapshot_version: 'otro-snapshot' }).status).toBe('unavailable')
    expect(selectVisualSite(ready, { ...candidates[0], site_id: 'cl-sin-imagen' }).status).toBe('unavailable')
    expect(selectVisualSite({ status: 'loading' }, candidates[0]).status).toBe('loading')
    expect(selectVisualSite({ status: 'unavailable', reason: 'x' }, candidates[0])).toEqual({ status: 'unavailable', reason: 'x' })
  })
})

describe('satellite context panel', () => {
  it('shows local image, period, attribution, preliminary note and provenance', () => {
    const html = render(candidates[0], ready, { baseUrl: '/AnalogOS/' })
    expect(html).toContain(`src="/AnalogOS/visual-context-v3/${candidates[0].site_id}.png"`)
    expect(html).toContain('href="/AnalogOS/visual-context-v3/index.json"')
    expect(html).toContain('December 2025 mosaic')
    expect(html).toContain('Copernicus Sentinel')
    expect(html).toContain('It does not change similarity, confidence or feasibility')
    expect(html).toContain('2025-12-01 to 2026-01-01 (UTC)')
    expect(html).toMatch(/alt="Natural-color Sentinel-2 view of sector [^"]+"/)
    // The web app only links local files: no Copernicus API URL.
    expect(html).not.toContain('dataspace.copernicus.eu')
    expect(html).not.toMatch(/(src|href)="https?:/)
  })

  it('changes image when the candidate changes', () => {
    const sources = candidates.map((candidate) => /src="([^"]+)"/.exec(render(candidate, ready))?.[1])
    expect(new Set(sources).size).toBe(candidates.length)
  })

  it('reports “unavailable” without an image for fixtures, missing index or failed image file', () => {
    const cases = [
      render(fixtures[0], ready),
      render(candidates[0], { status: 'unavailable', reason: 'Este build no incluye contexto visual (404).' }),
      render(candidates[0], ready, { imageFailed: true }),
    ]
    for (const html of cases) {
      expect(html).toContain('Satellite image not available')
      expect(html).toContain('The ranking and the site sheet do not depend on it')
      expect(html).not.toContain('<img')
    }
    expect(render(candidates[0], { status: 'loading' })).toContain('Loading satellite context')
  })
})

describe('loadVisualContext', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('requests only the local index and never throws', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => realIndex }))
    vi.stubGlobal('fetch', fetchMock)
    expect((await loadVisualContext('/AnalogOS/')).status).toBe('ready')
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/AnalogOS/visual-context-v3/index.json')

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })))
    expect(await loadVisualContext('./')).toMatchObject({ status: 'unavailable' })

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ kind: 'otro' }) })))
    expect(await loadVisualContext('./')).toMatchObject({ status: 'unavailable' })

    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('no network') }))
    expect(await loadVisualContext('./')).toEqual({ status: 'unavailable', reason: 'no network' })
  })
})
