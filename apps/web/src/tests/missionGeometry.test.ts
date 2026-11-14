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

describe('geometría y cobertura', () => {
  it('sector existente: geometría pedida = medida', () => {
    const r = resolveScope({ mode: 'sector', site_id: A }, candidates)
    expect(r.state).toBe('covered')
    expect(r.evaluated_site_ids).toEqual([A])
  })
  it('sector inexistente se rechaza al evaluar', () => {
    expect(() => evaluateMission(request({ mode: 'sector', site_id: 'cl-no-existe' }), bundle)).toThrow(/no existe/)
  })
  it('punto dentro: exige elegir ventana y aclara que no es el punto exacto', () => {
    const r = resolveScope({ mode: 'point', lon: -69.7, lat: -25.0, window_site_id: null }, candidates)
    expect(r.state).toBe('needs_window_selection')
    expect(r.evaluated_site_ids).toEqual([])
    expect(r.notes.join(' ')).toMatch(/no del punto exacto/)
    const ev = evaluateMission(request({ mode: 'point', lon: -69.7, lat: -25.0, window_site_id: null }), bundle)
    expect(ev.outcome).toBe('needs_window_selection')
    expect(ev.options).toEqual([])
    expect(ev.data_request?.acquisition_status).toBe('no_adquirido_en_M8')
    const chosen = evaluateMission(request({ mode: 'point', lon: -69.7, lat: -25.0, window_site_id: A }), bundle)
    expect(chosen.resolution.state).toBe('window_selected')
    expect(chosen.options.map((o) => o.site_id)).toEqual([A])
  })
  it('punto en borde compartido devuelve varias coincidencias y no elige solo', () => {
    // lon -69.6 es borde este de A y oeste de cl-win-s2480-w06950; lat -24.9 borde norte de A y sur de la vecina.
    const r = resolveScope({ mode: 'point', lon: -69.6, lat: -24.9, window_site_id: null }, candidates)
    expect(r.matches.length).toBeGreaterThan(1)
    expect(r.state).toBe('needs_window_selection')
  })
  it('ventana elegida debe coincidir geométricamente', () => {
    expect(() => evaluateMission(request({ mode: 'point', lon: -69.7, lat: -25.0, window_site_id: 'ar-win-s2620-w06750' }), bundle)).toThrow(/no coincide/)
  })
  it('punto fuera: sin vecino más cercano, informe insuficiente exportable', () => {
    const ev = evaluateMission(request({ mode: 'point', lon: 10, lat: 10, window_site_id: null }), bundle)
    expect(ev.outcome).toBe('insufficient_coverage')
    expect(ev.options).toEqual([])
    expect(ev.recommended_site_ids).toEqual([])
    expect(ev.data_request!.planned_sources.length).toBeGreaterThan(0)
    expect(ev.data_request!.planned_sources.every((s) => s.landing_url.length > 0)).toBe(true)
  })
  it('bbox idéntico a la ventana (mismo decimal, con ruido de coma flotante) es cobertura completa', () => {
    const r = resolveScope({ mode: 'bbox', bbox: [-69.8, -25.1, -69.6, -24.9], window_site_id: null }, candidates)
    expect(r.state).toBe('covered')
    expect(r.evaluated_site_ids).toEqual([A])
    const noisy = resolveScope({ mode: 'bbox', bbox: [-69.8 + 1e-12, -25.1, -69.6 - 1e-12, -24.9], window_site_id: null }, candidates)
    expect(noisy.state).toBe('covered')
  })
  it('un bbox casi igual NO hereda métricas: solo épsilon numérica, sin tolerancia científica', () => {
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
  it('subbbox y bbox parcial no heredan métricas; la ventana solo entra por acción explícita', () => {
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
  it('bbox mayor que la ventana: cobertura parcial', () => {
    const r = resolveScope({ mode: 'bbox', bbox: [-70, -25.3, -69.5, -24.7], window_site_id: null }, candidates)
    expect(r.state).toBe('partial_coverage')
    expect(r.matches.some((m) => m.relation === 'inside_bbox')).toBe(true)
  })
  it('bbox fuera de piloto: sin cobertura', () => {
    expect(resolveScope({ mode: 'bbox', bbox: [10, 10, 11, 11], window_site_id: null }, candidates).state).toBe('no_coverage')
  })
  it('valida rangos, orden, finitud y tamaño', () => {
    expect(validatePoint(Number.NaN, 0)).not.toEqual([])
    expect(validatePoint(181, 0)).not.toEqual([])
    expect(validatePoint(0, -91)).not.toEqual([])
    expect(validatePoint(-69.7, -25)).toEqual([])
    expect(validateBbox([-69, -25, -70, -24]).join()).toMatch(/Orden de longitud/)
    expect(validateBbox([-70, -24, -69, -25]).join()).toMatch(/Orden de latitud/)
    expect(validateBbox([-70, -25, Infinity, -24])).not.toEqual([])
    expect(validateBbox([-70, -25, -69.9999, -24])).not.toEqual([])
    expect(validateBbox([-80, -40, -60, -20]).join()).toMatch(/supera/)
    expect(validateBbox([-70, -25, -69, -24])).toEqual([])
    expect(validateMissionRequest(request({ mode: 'bbox', bbox: [-69, -25, -70, -24], window_site_id: null })).ok).toBe(false)
    expect(validateMissionRequest(request({ mode: 'point', lon: 200, lat: 0, window_site_id: null })).ok).toBe(false)
  })
})
