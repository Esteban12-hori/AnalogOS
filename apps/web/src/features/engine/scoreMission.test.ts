// scoreMission sobre el snapshot real (artifacts/science-v2) y casos límite honestos.
import { describe, expect, it } from 'vitest'
import { CRITERION_IDS, type CandidateSite, type CriterionId } from '../../domain/contracts'
import { rankCandidates } from '../../domain/scoring'
import {
  ENGINE_VERSION,
  MISSION_PRESETS,
  aggregate,
  buildMissionInputs,
  limitingCriterion,
  profileFromLevels,
  profileFromPreset,
  scoreMission,
  sensitivity,
  type CriterionLevel,
  type MissionProfileDraft,
} from './index'
import { loadSnapshotV2 } from './testSupport'

const { candidates, profile: base } = loadSnapshotV2()
const REF = { id: base.id, version: base.version }

/** El perfil del snapshot expresado como borrador: mismos pesos que el pipeline. */
function snapshotDraft(): MissionProfileDraft {
  const weights = Object.fromEntries(CRITERION_IDS.map((id) => [id, base.criteria.find((c) => c.id === id)?.weight ?? 0])) as Record<
    CriterionId,
    number
  >
  const levels = Object.fromEntries(CRITERION_IDS.map((id) => [id, 1])) as Record<CriterionId, CriterionLevel>
  return {
    id: base.id,
    origin: 'snapshot',
    label: base.name,
    status: 'needs_calibration',
    levels,
    weights,
    baseProfileId: base.id,
    baseProfileVersion: base.version,
  }
}

function levels(partial: Partial<Record<CriterionId, CriterionLevel>>): Record<CriterionId, CriterionLevel> {
  return Object.fromEntries(CRITERION_IDS.map((id) => [id, partial[id] ?? 0])) as Record<CriterionId, CriterionLevel>
}

describe('motor sobre el snapshot real', () => {
  it('con los pesos del perfil base reproduce exactamente lo publicado por el pipeline', () => {
    const scoring = scoreMission({ profile: snapshotDraft(), candidates, base })
    for (const candidate of candidates) {
      const site = scoring.sites.find((row) => row.siteId === candidate.site_id)
      expect(site?.similarity).toBe(candidate.similarity)
      expect(site?.confidence).toBe(candidate.confidence)
      for (const item of candidate.score_breakdown) {
        expect(site?.contributions[item.criterion_id as CriterionId]).toBe(item.contribution)
      }
      const inputs = buildMissionInputs({ profile: snapshotDraft(), candidate, base })
      expect(sensitivity(inputs.criteria, inputs.inputs, inputs.epsilon, inputs.minimumValidWeight).stability).toBe(candidate.stability)
    }
    // Mismo orden que Explorar.
    expect(scoring.sites.map((site) => site.siteId)).toEqual(rankCandidates(candidates).map((candidate) => candidate.site_id))
  })

  it('el limitante con el perfil base coincide con la contribución más negativa del snapshot', () => {
    const scoring = scoreMission({ profile: snapshotDraft(), candidates, base })
    const yungay = scoring.sites.find((site) => site.siteId === 'cl-pampa-yungay-screening')
    // UX_REDESIGN §1.11: en Yungay el limitante por contribución es Rugosidad (−0,091).
    expect(yungay?.limitingCriterionId).toBe('terrain_roughness')
  })

  it('cada predefinido puntúa los 3 sectores con rango 1..3, versión del motor y cobertura completa', () => {
    for (const preset of MISSION_PRESETS) {
      const scoring = scoreMission({ profile: profileFromPreset(preset, REF), candidates, base })
      expect(scoring.profileId).toBe(preset.id)
      expect(scoring.engineVersion).toBe(ENGINE_VERSION)
      expect(scoring.engineVersion).not.toMatch(/stub/)
      expect(scoring.minimumValidWeight).toBe(0.7)
      expect(scoring.sites.map((site) => site.rank)).toEqual([1, 2, 3])
      for (const site of scoring.sites) {
        expect(site.status).toBe('scored')
        expect(site.coverage).toBe(1)
        expect(site.similarity).not.toBeNull()
        // Excluir 0 no aporta: contribución nula, nunca limitante.
        for (const id of CRITERION_IDS) if (preset.levels[id] === 0) expect(site.contributions[id] ?? null).toBeNull()
      }
    }
  })

  it('pedir la geología (por calcular) resta cobertura; bajo 0,70 queda «Datos insuficientes»', () => {
    const partial = scoreMission({ profile: profileFromLevels(levels({ slope: 3, terrain_roughness: 3, geologic_relevance: 3 }), REF), candidates, base })
    // geología 3 de 9 → cobertura 6/9 < 0,70
    for (const site of partial.sites) {
      expect(site.similarity).toBeNull()
      expect(site.status).toBe('insufficient_data')
      expect(site.rank).toBeNull()
      expect(site.coverage).toBeCloseTo(6 / 9, 6)
      expect(site.limitingCriterionId).toBeNull()
    }
    // Insuficientes: orden estable por site_id.
    expect(partial.sites.map((site) => site.siteId)).toEqual([...candidates.map((c) => c.site_id)].sort())

    const covered = scoreMission({ profile: profileFromLevels(levels({ slope: 3, terrain_roughness: 3, geologic_relevance: 1 }), REF), candidates, base })
    for (const site of covered.sites) {
      expect(site.status).toBe('scored')
      expect(site.coverage).toBeCloseTo(6 / 7, 6)
    }
  })

  it('la confianza se recalcula aparte y nunca altera la similitud', () => {
    const profile = profileFromPreset(MISSION_PRESETS[0] ?? (undefined as never), REF)
    const scoring = scoreMission({ profile, candidates, base })
    const lowQuality = candidates.map((candidate) => ({
      ...candidate,
      score_breakdown: candidate.score_breakdown.map((item) => ({ ...item, quality: item.quality / 2 })),
    }))
    const halved = scoreMission({ profile, candidates: lowQuality, base })
    for (const site of scoring.sites) {
      const other = halved.sites.find((row) => row.siteId === site.siteId)
      expect(other?.similarity).toBe(site.similarity)
      expect(other?.confidence).toBeLessThan(site.confidence ?? 0)
    }
  })
})

describe('orden estable y casos honestos', () => {
  const clone = (siteId: string): CandidateSite => ({ ...(candidates[0] as CandidateSite), site_id: siteId })

  it('empates de similitud se ordenan por site_id, sin depender del orden de entrada', () => {
    const profile = profileFromPreset(MISSION_PRESETS[0] ?? (undefined as never), REF)
    const forward = scoreMission({ profile, candidates: [clone('cl-b'), clone('cl-a'), clone('cl-c')], base })
    const backward = scoreMission({ profile, candidates: [clone('cl-c'), clone('cl-a'), clone('cl-b')], base })
    expect(forward.sites.map((site) => site.siteId)).toEqual(['cl-a', 'cl-b', 'cl-c'])
    expect(backward.sites).toEqual(forward.sites)
    expect(forward.sites.map((site) => site.rank)).toEqual([1, 2, 3])
  })

  it('todo en Excluir: cada sector «por calcular», sin cifras', () => {
    const scoring = scoreMission({ profile: profileFromLevels(levels({}), REF), candidates, base })
    expect(scoring.reason).toBe('empty_profile')
    for (const site of scoring.sites) {
      expect(site).toMatchObject({ similarity: null, rank: null, status: 'por_calcular', confidence: null, coverage: 0 })
    }
  })

  it('perfil de otro perfil base: «por calcular»', () => {
    const profile = profileFromLevels(levels({ slope: 3 }), { id: 'otro-perfil', version: '1' })
    const scoring = scoreMission({ profile, candidates, base })
    expect(scoring.reason).toBe('base_mismatch')
    expect(scoring.sites.every((site) => site.similarity === null && site.status === 'por_calcular')).toBe(true)
  })

  it('perfil base inutilizable o sector sin desglose: nunca lanza ni inventa', () => {
    const profile = profileFromLevels(levels({ slope: 3 }), REF)
    const unusable = scoreMission({ profile, candidates: [{ site_id: 'cl-b' }, { site_id: 'cl-a' }] as never, base: {} as never })
    expect(unusable.reason).toBe('base_unavailable')
    expect(unusable.sites.map((site) => [site.siteId, site.similarity, site.status])).toEqual([
      ['cl-a', null, 'por_calcular'],
      ['cl-b', null, 'por_calcular'],
    ])
    const noBreakdown = scoreMission({ profile, candidates: [{ ...clone('cl-x'), score_breakdown: [] }], base })
    expect(noBreakdown.sites[0]).toMatchObject({ similarity: null, status: 'insufficient_data', coverage: 0 })
  })

  it('no muta los candidatos ni el perfil base', () => {
    const before = JSON.stringify([candidates, base])
    scoreMission({ profile: profileFromPreset(MISSION_PRESETS[1] ?? (undefined as never), REF), candidates, base })
    expect(JSON.stringify([candidates, base])).toBe(before)
  })
})

describe('limitingCriterion', () => {
  it('elige la contribución más negativa; empate → primero en el orden del perfil; sin negativas → null', () => {
    const order = ['slope', 'terrain_roughness', 'local_relief']
    expect(limitingCriterion({ slope: -0.08, terrain_roughness: -0.09, local_relief: -0.07 }, order)).toBe('terrain_roughness')
    expect(limitingCriterion({ slope: -0.09, terrain_roughness: -0.09 }, order)).toBe('slope')
    expect(limitingCriterion({ slope: 0, terrain_roughness: null }, order)).toBeNull()
    expect(limitingCriterion({ unknown: -1 }, ['unknown'])).toBeNull()
  })

  it('coincide con aggregate sobre los insumos de misión', () => {
    const profile = profileFromPreset(MISSION_PRESETS[0] ?? (undefined as never), REF)
    const candidate = candidates[0] as CandidateSite
    const inputs = buildMissionInputs({ profile, candidate, base })
    const result = aggregate(inputs.criteria, inputs.inputs, inputs.epsilon, inputs.minimumValidWeight)
    const site = scoreMission({ profile, candidates: [candidate], base }).sites[0]
    expect(site?.limitingCriterionId).toBe(limitingCriterion(result.contributions, base.criteria.map((c) => c.id)))
  })
})
