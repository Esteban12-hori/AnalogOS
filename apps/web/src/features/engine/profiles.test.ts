// Niveles → pesos, ids de perfil y perfiles predefinidos (ADR-009, UX_REDESIGN §3.2).
import { describe, expect, it } from 'vitest'
import { CRITERION_IDS } from '../../domain/contracts'
import {
  MISSION_PRESETS,
  fnv1a32,
  levelsFromInterpretation,
  levelsToWeights,
  profileFromLevels,
  profileFromPreset,
  type CriterionLevel,
  type CriterionId,
} from './index'

const MOBILITY: Record<CriterionId, CriterionLevel> = {
  slope: 3,
  terrain_roughness: 3,
  local_relief: 2,
  bare_ground_fraction: 2,
  aridity_context: 1,
  surface_temperature_variability: 0,
  geologic_relevance: 0,
}
const BASE = { id: 'mars-rover-screening-v2', version: '2.0.1-preliminary' }
// Patrón de contracts/evidence-packet.schema.json → profile.id
const PROFILE_ID = /^(mission:[0-9a-f]{8,16}|[a-z0-9-]+)$/

describe('levelsToWeights', () => {
  it('peso = nivel ÷ suma de niveles (Clave 3 / Importante 2 / Menor 1 / Excluir 0)', () => {
    const weights = levelsToWeights(MOBILITY)
    expect(weights.slope).toBe(3 / 11)
    expect(weights.local_relief).toBe(2 / 11)
    expect(weights.aridity_context).toBe(1 / 11)
    expect(weights.surface_temperature_variability).toBe(0)
    // Los porcentajes del boceto de §4.4: 27 · 27 · 18 · 18 · 9 · —
    expect(CRITERION_IDS.map((id) => Math.round(weights[id] * 100))).toEqual([27, 27, 18, 18, 9, 0, 0])
    expect(CRITERION_IDS.reduce((sum, id) => sum + weights[id], 0)).toBeCloseTo(1, 12)
  })

  it('todo en Excluir da todos los pesos en 0 (sin dividir por cero)', () => {
    const zero = Object.fromEntries(CRITERION_IDS.map((id) => [id, 0])) as Record<CriterionId, CriterionLevel>
    expect(Object.values(levelsToWeights(zero))).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it('un criterio ausente vale 0 («no mencionado»)', () => {
    const partial = { slope: 3 } as unknown as Record<CriterionId, CriterionLevel>
    const weights = levelsToWeights(partial)
    expect(weights.slope).toBe(1)
    expect(weights.terrain_roughness).toBe(0)
  })

  it('rechaza niveles fuera de 0–3', () => {
    for (const bad of [4, -1, 1.5, Number.NaN]) {
      expect(() => levelsToWeights({ ...MOBILITY, slope: bad as CriterionLevel })).toThrow(RangeError)
    }
  })
})

describe('profileFromLevels', () => {
  it('produce un perfil de misión needs_calibration con id mission:<fnv> válido para el contrato', () => {
    const profile = profileFromLevels(MOBILITY, BASE, 'Rover en terreno rocoso')
    expect(profile.id).toMatch(/^mission:[0-9a-f]{8}$/)
    expect(profile.id).toMatch(PROFILE_ID)
    expect(profile).toMatchObject({
      origin: 'mission',
      status: 'needs_calibration',
      label: 'Rover en terreno rocoso',
      baseProfileId: BASE.id,
      baseProfileVersion: BASE.version,
    })
    expect(profile.weights).toEqual(levelsToWeights(MOBILITY))
  })

  it('el id es estable y depende solo de los niveles y del perfil base', () => {
    const a = profileFromLevels(MOBILITY, BASE, 'uno')
    expect(profileFromLevels({ ...MOBILITY }, BASE, 'otro rótulo').id).toBe(a.id)
    expect(profileFromLevels({ ...MOBILITY, aridity_context: 2 }, BASE).id).not.toBe(a.id)
    expect(profileFromLevels(MOBILITY, { ...BASE, version: '9.9.9' }).id).not.toBe(a.id)
  })

  it('rótulo por defecto cuando no se da uno', () => {
    expect(profileFromLevels(MOBILITY, BASE).label).toBe('Perfil de misión')
  })

  it('fnv1a32 coincide con los vectores de referencia', () => {
    expect(fnv1a32('')).toBe('811c9dc5')
    expect(fnv1a32('a')).toBe('e40c292c')
    expect(fnv1a32('foobar')).toBe('bf9cf968')
  })
})

describe('MISSION_PRESETS', () => {
  it('trae Movilidad y al menos dos parciales, todos needs_calibration', () => {
    expect(MISSION_PRESETS[0]?.id).toBe('preset-movilidad')
    expect(MISSION_PRESETS[0]?.levels).toEqual(MOBILITY)
    expect(MISSION_PRESETS[0]?.partial).toBe(false)
    expect(MISSION_PRESETS.filter((preset) => preset.partial).length).toBeGreaterThanOrEqual(2)
    for (const preset of MISSION_PRESETS) expect(preset.status).toBe('needs_calibration')
  })

  it('ids únicos, válidos para el contrato y niveles completos 0–3', () => {
    expect(new Set(MISSION_PRESETS.map((preset) => preset.id)).size).toBe(MISSION_PRESETS.length)
    for (const preset of MISSION_PRESETS) {
      expect(preset.id).toMatch(PROFILE_ID)
      expect(Object.keys(preset.levels).sort()).toEqual([...CRITERION_IDS].sort())
      expect(CRITERION_IDS.some((id) => preset.levels[id] > 0)).toBe(true)
    }
  })

  it('ninguno usa la geología, que sigue por calcular, y ningún texto trae cifras', () => {
    for (const preset of MISSION_PRESETS) {
      expect(preset.levels.geologic_relevance).toBe(0)
      expect(`${preset.label} ${preset.description}`).not.toMatch(/[0-9%]/)
    }
  })

  it('profileFromPreset conserva el id del preset y queda needs_calibration', () => {
    const preset = MISSION_PRESETS[1]
    if (!preset) throw new Error('falta un preset parcial')
    expect(profileFromPreset(preset, BASE)).toMatchObject({ id: preset.id, origin: 'preset', status: 'needs_calibration', label: preset.label })
  })
})

describe('levelsFromInterpretation', () => {
  it('los criterios ausentes valen 0', () => {
    const levels = levelsFromInterpretation({ criteria: [{ id: 'slope', level: 3, rationale: 'x' }] })
    expect(levels.slope).toBe(3)
    expect(levels.geologic_relevance).toBe(0)
  })

  it('rechaza ids repetidos o desconocidos', () => {
    expect(() =>
      levelsFromInterpretation({
        criteria: [
          { id: 'slope', level: 3, rationale: 'x' },
          { id: 'slope', level: 1, rationale: 'y' },
        ],
      }),
    ).toThrow(RangeError)
    expect(() => levelsFromInterpretation({ criteria: [{ id: 'ice' as CriterionId, level: 3, rationale: 'x' }] })).toThrow(RangeError)
  })
})
