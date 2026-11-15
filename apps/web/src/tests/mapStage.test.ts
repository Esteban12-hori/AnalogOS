import { describe, expect, it } from 'vitest'
import { contextLayers } from '../features/globe/MapStage'
import type { VisualContextState } from '../data/loadVisualContext'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('contextLayers', () => {
  it('links the seven v3 sites to their real images without going back to the historical directory', () => {
    const root = resolve(__dirname, '../../../..')
    const index = JSON.parse(readFileSync(resolve(root, 'artifacts/visual-context-v3/index.json'), 'utf8'))
    const layers = contextLayers({ status: 'ready', index })
    expect(layers).toHaveLength(7)
    expect(layers.filter(layer => layer.id.startsWith('s2-ar-'))).toHaveLength(3)
    for (const layer of layers) {
      expect(layer.image).toMatch(/^visual-context-v3\//)
      expect(readFileSync(resolve(root, 'artifacts', layer.image)).byteLength).toBeGreaterThan(0)
    }
  })
  it('produces no layers while loading or if unavailable', () => {
    expect(contextLayers({ status: 'loading' })).toEqual([])
    expect(contextLayers({ status: 'unavailable', reason: 'x' })).toEqual([])
  })

  it('uses the validated bbox and file from the index', () => {
    const state = {
      status: 'ready',
      index: {
        kind: 'analogos-visual-context', schema_version: 1, snapshot_version: 'v2',
        source: { collection: 'sentinel-2-l2a', attribution: 'Copernicus' },
        product: { period_label: 'Mosaico de diciembre de 2025', time_range: { from: 'a', to: 'b' }, mosaicking: 'ORBIT', max_cloud_coverage_percent: 40, transformation: 'x2' },
        sites: [{ site_id: 'cl-a', name: 'A', image: 'cl-a.png', sha256: 'h', bytes: 1, width: 705, height: 768, bbox: [-70.05, -24.18, -69.85, -23.98], extent_km: { width: 20, height: 22 }, approx_meters_per_pixel: 28.8, queried_at: 't', scenes_considered: 3, scenes_used: null }],
      },
    } as unknown as VisualContextState
    const [layer] = contextLayers(state)
    expect(layer).toMatchObject({ id: 's2-cl-a', kind: 'context', image: 'visual-context/cl-a.png', bounds: [-70.05, -24.18, -69.85, -23.98] })
    expect(layer?.label).toContain('≈29 m')
  })

  it('uses the WebP preview only if the SHA-256 matches the index PNG', () => {
    const state = {
      status: 'ready',
      index: {
        source: { collection: 'sentinel-2-l2a', attribution: 'Copernicus' },
        product: { period_label: 'Mosaico', time_range: { from: 'a', to: 'b' }, mosaicking: 'ORBIT', max_cloud_coverage_percent: 40, transformation: 'x2' },
        sites: [{ site_id: 'cl-a', image: 'cl-a.png', sha256: 'b'.repeat(64), bbox: [0, 0, 1, 1], approx_meters_per_pixel: 29 }],
      },
    } as unknown as VisualContextState
    const good = [{ site_id: 'cl-a', image: 'basemaps/s2-cl-a.webp', source_sha256: 'b'.repeat(64) }]
    const stale = [{ site_id: 'cl-a', image: 'basemaps/s2-cl-a.webp', source_sha256: 'c'.repeat(64) }]
    expect(contextLayers(state, good)[0]?.image).toBe('basemaps/s2-cl-a.webp')
    expect(contextLayers(state, stale)[0]?.image).toBe('visual-context/cl-a.png')
  })
})
