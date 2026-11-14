// Perfil activo del riel: base en Explorar, misión solo con resultados del motor del mismo perfil.
// Similitud, confianza, estabilidad y factibilidad se resuelven por separado y nunca se mezclan
// entre perfiles. Los objetos de misión son FIXTURE en memoria (el motor real es otra feature).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CandidateSite, MissionProfile } from '../../domain/contracts'
import { parseMarsReference } from '../../domain/marsReference'
import type { MissionProfileDraft, MissionScoring } from '../engine'
import { resolveMetricContext, type ResolveMetricContextArgs } from './metricContext'
import { coverageText, siteSimilarityText, weightChangeGlyph, vsMarsText } from './metricText'
import { buildMetricViews } from './buildMetricViews'

const root = resolve(__dirname, '../../../../..')
const read = (path: string): unknown => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const candidates = read('artifacts/science-v2/candidate-details.json') as CandidateSite[]
const profile = read('artifacts/science-v2/mission-profile.json') as MissionProfile
const mars = parseMarsReference(read('artifacts/science-v2/analysis-summary.json'))
const yungay = candidates.find((candidate) => candidate.site_id === 'cl-pampa-yungay-screening') as CandidateSite
const mariaElena = candidates.find((candidate) => candidate.site_id === 'cl-pampa-maria-elena-screening') as CandidateSite

/** FIXTURE: perfil de misión (niveles 3/3/2/2/1/0/0). */
const missionProfile: MissionProfileDraft = {
  id: 'mission:abc123',
  origin: 'mission',
  label: 'Perfil personalizado',
  status: 'needs_calibration',
  levels: { slope: 3, terrain_roughness: 3, local_relief: 2, bare_ground_fraction: 2, aridity_context: 1, surface_temperature_variability: 0, geologic_relevance: 0 },
  weights: { slope: 3 / 11, terrain_roughness: 3 / 11, local_relief: 2 / 11, bare_ground_fraction: 2 / 11, aridity_context: 1 / 11, surface_temperature_variability: 0, geologic_relevance: 0 },
  baseProfileId: profile.id,
  baseProfileVersion: profile.version,
}
/** FIXTURE: salida del motor (cifras inventadas para la prueba; no son resultados). */
const scoring: MissionScoring = {
  profileId: 'mission:abc123',
  engineVersion: '1.0.0',
  sites: [
    { siteId: 'cl-domeyko-interior-screening', similarity: 70, rank: 1, status: 'scored', coverage: 1, confidence: 80, contributions: { slope: -0.1 }, limitingCriterionId: 'slope' },
    { siteId: 'cl-pampa-yungay-screening', similarity: 60, rank: 2, status: 'scored', coverage: 1, confidence: null, contributions: { terrain_roughness: -0.2, slope: -0.05 }, limitingCriterionId: 'terrain_roughness' },
  ],
}

function args(patch: Partial<ResolveMetricContextArgs> = {}): ResolveMetricContextArgs {
  return { site: yungay, candidates, profile, marsReference: mars, mode: 'explorar', missionProfile: null, scoring: null, ...patch }
}

describe('resolveMetricContext', () => {
  it('Explorar: perfil base, cifras del snapshot y orden de rankCandidates', () => {
    const context = resolveMetricContext(args())
    expect(context.kind).toBe('base')
    expect(context.input.weights).toBeNull()
    expect(context.input.contributions).toBeNull()
    expect(context.figures).toMatchObject({ similarity: 75.67, confidence: 77.45, stability: 99.03, feasibility: 'requires_review', validCount: 6, criterionCount: 7 })
    expect(context.figures.coverage).toBeCloseTo(0.9, 10)
    expect(context.order).toEqual(['cl-pampa-yungay-screening', 'cl-domeyko-interior-screening', 'cl-pampa-maria-elena-screening'])
    expect(context.rank).toBe(1)
    expect(resolveMetricContext(args({ site: mariaElena })).rank).toBe(3)
    expect(context.profileLabel).toBe('perfil base v2.0.1-preliminary')
  })

  it('Explorar con resultados de misión guardados: sigue el perfil base', () => {
    expect(resolveMetricContext(args({ missionProfile, scoring })).kind).toBe('base')
  })

  it('Misión con resultados del mismo perfil: pesos y contribuciones del motor', () => {
    const context = resolveMetricContext(args({ mode: 'mision', missionProfile, scoring }))
    expect(context.kind).toBe('mission')
    expect(context.engineVersion).toBe('1.0.0')
    expect(context.input.weights?.slope).toBeCloseTo(3 / 11, 12)
    expect(context.input.contributions).toEqual({ terrain_roughness: -0.2, slope: -0.05 })
    expect(context.order).toEqual(['cl-domeyko-interior-screening', 'cl-pampa-yungay-screening'])
    expect(context.rank).toBe(2)
    // Similitud y confianza del motor; estabilidad por calcular; factibilidad del snapshot.
    expect(context.figures).toMatchObject({ similarity: 60, similarityState: 'scored', confidence: null, stability: null, feasibility: 'requires_review', coverage: 1 })
    const views = buildMetricViews(context.input)
    expect(views.find((view) => view.isLimiting)?.criterionId).toBe('terrain_roughness')
    expect(views.find((view) => view.criterionId === 'surface_temperature_variability')?.weight).toBe(0)
  })

  it('Misión con scoring de otro perfil (desfasado): perfil base', () => {
    expect(resolveMetricContext(args({ mode: 'mision', missionProfile, scoring: { ...scoring, profileId: 'mission:otro' } })).kind).toBe('base')
  })

  it('Misión sin el lugar en el scoring: % por calcular y sin contribuciones prestadas del snapshot', () => {
    const context = resolveMetricContext(args({ mode: 'mision', missionProfile, scoring, site: mariaElena }))
    expect(context.kind).toBe('mission')
    expect(context.input.contributions).toEqual({})
    expect(context.figures.similarityState).toBe('pending')
    expect(siteSimilarityText(context.figures)).toBe('por calcular')
    expect(buildMetricViews(context.input).some((view) => view.isLimiting)).toBe(false)
  })
})

describe('textos del riel', () => {
  it('cobertura, % del lugar y dirección frente a Jezero', () => {
    const context = resolveMetricContext(args())
    expect(coverageText(context.figures)).toBe('6 de 7 criterios con dato · 90 % del peso')
    expect(siteSimilarityText(context.figures)).toBe('75,7')
    expect(siteSimilarityText({ similarity: 49.99, similarityState: 'scored' })).toBe('50,0')
    expect(siteSimilarityText({ similarity: null, similarityState: 'insufficient' })).toBe('Datos insuficientes')
    const slope = buildMetricViews(context.input).find((view) => view.criterionId === 'slope')
    expect(slope && vsMarsText(slope)).toBe('↗ 1,4× Jezero · más inclinado')
  })

  it('↑ / ↓ solo cuando el perfil activo cambia el peso base', () => {
    expect(weightChangeGlyph({ weight: 0.27, baseWeight: 0.2 })).toBe('↑')
    expect(weightChangeGlyph({ weight: 0, baseWeight: 0.05 })).toBe('↓')
    expect(weightChangeGlyph({ weight: 0.2, baseWeight: 0.2 })).toBe('')
  })
})
