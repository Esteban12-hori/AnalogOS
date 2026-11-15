import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CandidateSite, DataManifest, MissionProfile } from '../domain/contracts'
import { evaluateMission, resolveScope, validateBbox, validateMissionRequest, validatePoint, type EvidenceBundle, type MissionRequest } from '../mission'

const root = resolve(__dirname, '../../../..')
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(root, p), 'utf8'))
const candidates = read('artifacts/science-v3/candidate-details.json') as CandidateSite[]
const bundle: EvidenceBundle = {
  candidates, manifest: read('artifacts/science-v3/manifest.json') as DataManifest, profile: read('artifacts/science-v3/mission-profile.json') as MissionProfile,
}
const A = 'cl-win-s2500-w06970' // [-69.8,-25.1,-69.6,-24.9]
const request = (scope: MissionRequest['scope']): MissionRequest => ({
  schema_version: '1.0.0', brief: '', activity: 'prueba', target: { profile_id: 'mars-rover-screening-v3', stated: 'rover' },
  requirements: [], open_questions: [], scope, confirmed: true,
})

describe('geometry and coverage', () => {
  it('existing sector: requested geometry = measured', () => {
    const r = resolveScope({ mode: 'sector', site_id: A }, candidates)
    expect(r.state).toBe('covered')
    expect(r.evaluated_site_ids).toEqual([A])
  })
  it('a nonexistent sector is rejected on evaluation', () => {
    expect(() => evaluateMission(request({ mode: 'sector', site_id: 'cl-no-existe' }), bundle)).toThrow(/does not exist/)
  })
  it('point inside: requires choosing a window and clarifies it is not the exact point', () => {
    const r = resolveScope({ mode: 'point', lon: -69.7, lat: -25.0, window_site_id: null }, candidates)
    expect(r.state).toBe('needs_window_selection')
    expect(r.evaluated_site_ids).toEqual([])
    expect(r.notes.join(' ')).toMatch(/not for the exact point/)
    const ev = evaluateMission(request({ mode: 'point', lon: -69.7, lat: -25.0, window_site_id: null }), bundle)
    expect(ev.outcome).toBe('needs_window_selection')
    expect(ev.options).toEqual([])
    expect(ev.data_request?.acquisition_status).toBe('no_adquirido_en_M8')
    const chosen = evaluateMission(request({ mode: 'point', lon: -69.7, lat: -25.0, window_site_id: A }), bundle)
    expect(chosen.resolution.state).toBe('window_selected')
    expect(chosen.options.map((o) => o.site_id)).toEqual([A])
  })
  it('a point on a shared edge returns several matches and does not choose by itself', () => {
    // lon -69.6 is the east edge of A and the west edge of cl-win-s2480-w06950; lat -24.9 is the north edge of A and the south edge of its neighbor.
    const r = resolveScope({ mode: 'point', lon: -69.6, lat: -24.9, window_site_id: null }, candidates)
    expect(r.matches.length).toBeGreaterThan(1)
    expect(r.state).toBe('needs_window_selection')
  })
  it('a chosen window must match geometrically', () => {
    expect(() => evaluateMission(request({ mode: 'point', lon: -69.7, lat: -25.0, window_site_id: 'ar-win-s2620-w06750' }), bundle)).toThrow(/does not geometrically match/)
  })
  it('point outside: no nearest neighbor, exportable insufficient report', () => {
    const ev = evaluateMission(request({ mode: 'point', lon: 10, lat: 10, window_site_id: null }), bundle)
    expect(ev.outcome).toBe('insufficient_coverage')
    expect(ev.options).toEqual([])
    expect(ev.recommended_site_ids).toEqual([])
    expect(ev.data_request!.planned_sources.length).toBeGreaterThan(0)
    expect(ev.data_request!.planned_sources.every((s) => s.landing_url.length > 0)).toBe(true)
  })
  it('bbox identical to the window (same decimal, with floating-point noise) is full coverage', () => {
    const r = resolveScope({ mode: 'bbox', bbox: [-69.8, -25.1, -69.6, -24.9], window_site_id: null }, candidates)
    expect(r.state).toBe('covered')
    expect(r.evaluated_site_ids).toEqual([A])
    const noisy = resolveScope({ mode: 'bbox', bbox: [-69.8 + 1e-12, -25.1, -69.6 - 1e-12, -24.9], window_site_id: null }, candidates)
    expect(noisy.state).toBe('covered')
  })
  it('a nearly equal bbox does NOT inherit metrics: numeric epsilon only, no scientific tolerance', () => {
    for (const d of [0.0005, 0.0015, 0.002, 0.00001]) {
      const near = resolveScope({ mode: 'bbox', bbox: [-69.8 + d, -25.1 + d, -69.6 - d, -24.9 - d], window_site_id: null }, candidates)
      expect(near.state, `margen ${d}`).toBe('partial_coverage')
      expect(near.evaluated_site_ids).toEqual([])
      expect(near.matches[0].relation).toBe('contains_bbox')
    }
    const wider = resolveScope({ mode: 'bbox', bbox: [-69.8005, -25.1005, -69.5995, -24.8995], window_site_id: null }, candidates)
    expect(wider.state).toBe('partial_coverage')
    const ev = evaluateMission(request({ mode: 'bbox', bbox: [-69.7985, -25.0985, -69.6015, -24.9015], window_site_id: null }), bundle)
    expect(ev.outcome).toBe('insufficient_coverage')
    expect(ev.options).toEqual([])
  })
  it('sub-bbox and partial bbox do not inherit metrics; the window only enters by explicit action', () => {
    const sub = resolveScope({ mode: 'bbox', bbox: [-69.75, -25.05, -69.65, -24.95], window_site_id: null }, candidates)
    expect(sub.state).toBe('partial_coverage')
    expect(sub.matches[0].relation).toBe('contains_bbox')
    expect(sub.evaluated_site_ids).toEqual([])
    const ev = evaluateMission(request({ mode: 'bbox', bbox: [-69.75, -25.05, -69.65, -24.95], window_site_id: null }), bundle)
    expect(ev.outcome).toBe('insufficient_coverage')
    expect(ev.options).toEqual([])
    const partial = resolveScope({ mode: 'bbox', bbox: [-69.9, -25.2, -69.7, -25.0], window_site_id: null }, candidates)
    expect(partial.state).toBe('partial_coverage')
    expect(partial.matches[0].request_covered_fraction).toBeLessThan(1)
    const explicit = evaluateMission(request({ mode: 'bbox', bbox: [-69.75, -25.05, -69.65, -24.95], window_site_id: A }), bundle)
    expect(explicit.outcome).toBe('evaluated')
    expect(explicit.resolution.state).toBe('window_selected')
    expect(explicit.resolution.requested.approx_area_km2).toBeLessThan(explicit.resolution.measured[0].area_km2)
  })
  it('bbox larger than the window: partial coverage', () => {
    const r = resolveScope({ mode: 'bbox', bbox: [-70, -25.3, -69.5, -24.7], window_site_id: null }, candidates)
    expect(r.state).toBe('partial_coverage')
    expect(r.matches.some((m) => m.relation === 'inside_bbox')).toBe(true)
  })
  it('bbox outside the pilot: no coverage', () => {
    expect(resolveScope({ mode: 'bbox', bbox: [10, 10, 11, 11], window_site_id: null }, candidates).state).toBe('no_coverage')
  })
  it('validates ranges, order, finiteness and size', () => {
    expect(validatePoint(Number.NaN, 0)).not.toEqual([])
    expect(validatePoint(181, 0)).not.toEqual([])
    expect(validatePoint(0, -91)).not.toEqual([])
    expect(validatePoint(-69.7, -25)).toEqual([])
    expect(validateBbox([-69, -25, -70, -24]).join()).toMatch(/longitude order/)
    expect(validateBbox([-70, -24, -69, -25]).join()).toMatch(/latitude order/)
    expect(validateBbox([-70, -25, Infinity, -24])).not.toEqual([])
    expect(validateBbox([-70, -25, -69.9999, -24])).not.toEqual([])
    expect(validateBbox([-80, -40, -60, -20]).join()).toMatch(/exceeds/)
    expect(validateBbox([-70, -25, -69, -24])).toEqual([])
    expect(validateMissionRequest(request({ mode: 'bbox', bbox: [-69, -25, -70, -24], window_site_id: null })).ok).toBe(false)
    expect(validateMissionRequest(request({ mode: 'point', lon: 200, lat: 0, window_site_id: null })).ok).toBe(false)
  })
})
