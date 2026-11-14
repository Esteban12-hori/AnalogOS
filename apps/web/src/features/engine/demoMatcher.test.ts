// Matcher «DEMO · sin IA»: interpretación por palabras clave, sin red, que siempre cumple el
// contrato mission-interpretation/1 y nunca produce cifras.
import { describe, expect, it } from 'vitest'
import { checkMissionInterpretation } from '../../domain/aiContracts'
import { CRITERION_IDS, type CriterionId } from '../../domain/contracts'
import { criterionLabels } from '../../domain/formatting'
import {
  DEFAULT_BASE_PROFILE,
  DEMO_LABEL,
  MISSION_PRESETS,
  levelsFromInterpretation,
  matchMissionDemo,
  profileFromLevels,
  scoreMission,
  type CriterionLevel,
  type DemoMatch,
} from './index'
import { loadSnapshotV2 } from './testSupport'

function match(text: string): DemoMatch {
  const result = matchMissionDemo(text)
  if (!result) throw new Error(`sin resultado para «${text}»`)
  const checked = checkMissionInterpretation(result.interpretation)
  if (!checked.ok) throw new Error(checked.error)
  return result
}

function levelsOf(result: DemoMatch): Record<CriterionId, CriterionLevel> {
  return levelsFromInterpretation(result.interpretation)
}

function highlighted(text: string, result: DemoMatch): Array<[string, CriterionId]> {
  return result.highlights.map((span) => [text.slice(span.start, span.end), span.criterionId])
}

describe('matchMissionDemo', () => {
  it('el ejemplo de la especificación da el perfil Movilidad (27 · 27 · 18 · 18 · 9 %)', () => {
    const text = 'Probar navegación autónoma de un rover en terreno rocoso'
    const result = match(text)
    expect(result.label).toBe(DEMO_LABEL)
    expect(result.interpretation).toMatchObject({
      schema: 'mission-interpretation/1',
      engine: 'demo',
      status: 'ok',
      base_profile: DEFAULT_BASE_PROFILE,
    })
    expect(levelsOf(result)).toEqual(MISSION_PRESETS[0]?.levels)
    expect(highlighted(text, result)).toEqual([['rocoso', 'terrain_roughness']])
    expect(result.contextHighlights?.map((span) => text.slice(span.start, span.end))).toEqual(['navegación', 'autónoma', 'rover'])
    // Los no mencionados no se inventan: quedan fuera («no mencionado», nivel 0).
    expect(result.interpretation.criteria.map((criterion) => criterion.id)).toEqual([
      'slope',
      'terrain_roughness',
      'local_relief',
      'bare_ground_fraction',
      'aridity_context',
    ])
  })

  it('sin contexto de rover solo activa lo mencionado, sin tildes ni mayúsculas que importen', () => {
    const text = 'PENDIENTES fuertes y suelo arenoso, en el DESIERTO'
    const result = match(text)
    const levels = levelsOf(result)
    expect(levels).toMatchObject({ slope: 3, bare_ground_fraction: 3, aridity_context: 3, terrain_roughness: 0, local_relief: 0 })
    expect(highlighted(text, result)).toEqual([
      ['PENDIENTES', 'slope'],
      ['suelo', 'bare_ground_fraction'],
      ['arenoso', 'bare_ground_fraction'],
      ['DESIERTO', 'aridity_context'],
    ])
    expect(result.contextHighlights).toEqual([])
  })

  it('tildes en forma descompuesta (NFD) también coinciden y los tramos apuntan al texto original', () => {
    const text = 'cañón con inclinación'.normalize('NFD')
    const result = match(text)
    expect(levelsOf(result)).toMatchObject({ local_relief: 3, slope: 3 })
    expect(highlighted(text, result).map(([slice]) => slice.normalize('NFC'))).toEqual(['cañón', 'inclinación'])
  })

  it('una exclusión explícita en la misma cláusula deja el criterio en Excluir (0)', () => {
    for (const text of [
      'rover en pendientes; excluir la temperatura',
      'rover en pendientes, la temperatura no importa',
      'rover en pendientes, ignora temperatura y geología',
    ]) {
      const result = match(text)
      const levels = levelsOf(result)
      expect(levels.slope, text).toBe(3)
      expect(levels.surface_temperature_variability, text).toBe(0)
      const temperature = result.interpretation.criteria.find((criterion) => criterion.id === 'surface_temperature_variability')
      expect(temperature?.rationale, text).toMatch(/^Excluido en el texto/)
    }
    expect(levelsOf(match('rover en pendientes, ignora temperatura y geología')).geologic_relevance).toBe(0)
  })

  it('la exclusión no salta a otra cláusula ni a una mención anterior', () => {
    const levels = levelsOf(match('la temperatura no importa, pero la pendiente sí'))
    expect(levels).toMatchObject({ surface_temperature_variability: 0, slope: 3 })
    expect(levelsOf(match('pendiente clave. Excluir aridez')).slope).toBe(3)
  })

  it('«secundario» cerca de un criterio lo deja en Menor (1); una mención positiva gana a una exclusión', () => {
    expect(levelsOf(match('pendiente clave y la aridez es secundaria')).aridity_context).toBe(1)
    expect(levelsOf(match('excluir la temperatura. La temperatura nocturna sí importa')).surface_temperature_variability).toBe(3)
  })

  it('lo que el snapshot no mide va a unsupported y no cuenta como criterio', () => {
    const text = 'Buscar hielo y medir radiación y química del regolito'
    const result = match(text)
    expect(result.interpretation.status).toBe('no_terrain_criteria')
    expect(result.interpretation.criteria).toEqual([])
    expect(result.interpretation.mission_summary).toBe('Texto sin criterios de terreno reconocibles')
    expect(result.interpretation.unsupported.map((row) => [row.phrase, row.reason])).toEqual([
      ['hielo', 'not_measured'],
      ['radiación', 'not_measured'],
      ['química', 'not_measured'],
      ['regolito', 'not_measured'],
    ])
    expect(result.unsupportedHighlights?.map((span) => text.slice(span.start, span.end))).toEqual(['hielo', 'radiación', 'química', 'regolito'])
  })

  it('la frase más larga gana: «obstáculos a escala de rueda» no se mide; «obstáculos» solo, sí (rugosidad)', () => {
    const wheel = match('rover entre obstáculos a escala de rueda')
    expect(wheel.interpretation.unsupported).toEqual([{ phrase: 'obstáculos a escala de rueda', reason: 'not_measured' }])
    expect(wheel.highlights).toEqual([])
    expect(levelsOf(match('esquivar obstáculos grandes')).terrain_roughness).toBe(3)
  })

  it('pedir geología avisa que sigue por calcular', () => {
    const result = match('rover en un antiguo delta lacustre')
    expect(levelsOf(result).geologic_relevance).toBe(3)
    expect(result.interpretation.assumptions.some((text) => /geológica sigue por calcular/.test(text))).toBe(true)
  })

  it('ningún texto generado lleva cifras aunque el usuario escriba números', () => {
    const result = match('Rover a 5 km/h en pendientes de 10° y 30 % de rocas, 2 noches de −40 °C')
    const { interpretation } = result
    const generated = [
      interpretation.mission_summary,
      ...interpretation.criteria.map((criterion) => criterion.rationale),
      ...interpretation.assumptions,
      ...interpretation.unsupported.map((row) => row.phrase),
    ]
    for (const text of generated) expect(text).not.toMatch(/[0-9%]/)
    expect(levelsOf(result)).toMatchObject({ slope: 3, terrain_roughness: 3 })
  })

  it('texto vacío → null; texto sin nada reconocible → no_terrain_criteria', () => {
    expect(matchMissionDemo('')).toBeNull()
    expect(matchMissionDemo('   \n ')).toBeNull()
    const nothing = match('hola, ¿qué tal?')
    expect(nothing.interpretation.status).toBe('no_terrain_criteria')
    expect(nothing.highlights).toEqual([])
  })

  it('el resumen nombra cada criterio con el mismo rótulo que domain/formatting', () => {
    const samples: Record<CriterionId, string> = {
      slope: 'pendiente',
      terrain_roughness: 'rugosidad',
      local_relief: 'relieve',
      bare_ground_fraction: 'suelo desnudo',
      aridity_context: 'aridez',
      surface_temperature_variability: 'temperatura',
      geologic_relevance: 'geología',
    }
    for (const id of CRITERION_IDS) {
      const summary = match(samples[id]).interpretation.mission_summary
      expect(summary, id).toBe(`Misión DEMO por palabras clave: clave ${criterionLabels[id]?.toLowerCase()}.`)
    }
  })

  it('usa el perfil base que se le pasa', () => {
    expect(matchMissionDemo('pendiente', { id: 'otro-perfil', version: '1.0.0' })?.interpretation.base_profile).toEqual({
      id: 'otro-perfil',
      version: '1.0.0',
    })
  })

  it('es determinista y siempre cumple el contrato con textos arbitrarios', () => {
    const words = [
      'rover', 'pendiente', 'excluir', 'no', 'importa', 'rocoso', 'hielo', 'aridez', 'secundaria', 'delta', '42', '%', ',', '.',
      'temperatura', 'da', 'igual', 'suelo', 'sin', 'vegetación', 'luna', 'cráter', 'ÁRIDO', 'obstáculos', 'a', 'escala', 'de', 'rueda',
    ]
    let seed = 20261114
    const next = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 2 ** 32
    }
    for (let round = 0; round < 300; round += 1) {
      const length = 1 + Math.floor(next() * 14)
      const text = Array.from({ length }, () => words[Math.floor(next() * words.length)] ?? '').join(' ')
      const first = matchMissionDemo(text)
      expect(first, text).not.toBeNull()
      expect(matchMissionDemo(text), text).toEqual(first)
      const checked = checkMissionInterpretation(first?.interpretation)
      expect(checked.ok, `${text} → ${checked.ok ? '' : checked.error}`).toBe(true)
      const ids = first?.interpretation.criteria.map((criterion) => criterion.id) ?? []
      expect(new Set(ids).size, text).toBe(ids.length)
      expect(ids.every((id) => (CRITERION_IDS as readonly string[]).includes(id))).toBe(true)
    }
  })
})

describe('flujo sin red: DEMO → niveles → motor', () => {
  it('ordena los sectores reales con el motor (el matcher no produce ninguna cifra)', () => {
    const { candidates, profile: base } = loadSnapshotV2()
    const demo = match('probar tracción de un rover en pendientes rocosas')
    const profile = profileFromLevels(levelsOf(demo), { id: base.id, version: base.version }, demo.interpretation.mission_summary)
    const scoring = scoreMission({ profile, candidates, base })
    expect(scoring.sites.map((site) => site.rank)).toEqual([1, 2, 3])
    expect(scoring.sites.every((site) => site.status === 'scored')).toBe(true)
    expect(JSON.stringify(demo)).not.toMatch(/similarity|confidence|rank/)
  })
})
