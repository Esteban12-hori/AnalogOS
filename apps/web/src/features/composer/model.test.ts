import { describe, expect, it } from 'vitest'
import { CRITERION_IDS } from '../../domain/contracts'
import { checkMissionInterpretation } from '../../domain/aiContracts'
import type { MissionScoring } from '../engine'
import { elapsedSeconds, isWaitingPhase, phaseLabel } from './labels'
import {
  activeCount,
  buildInterpretRequest,
  coverageSummary,
  firstRanked,
  formatWeight,
  highlightSegments,
  interpretationLevels,
  placeName,
  resultAnnouncement,
  resultLineText,
  weightRows,
} from './model'
import { MOBILITY, draft, interpretation, levels, realSnapshot } from './testSupport'

const snapshot = realSnapshot()
const base = { id: snapshot.profile.id, version: snapshot.profile.version }

function scoring(order: Array<[string, number | null]>, extra: Partial<MissionScoring> = {}): MissionScoring {
  let rank = 0
  return {
    profileId: 'mission:test',
    engineVersion: 'test-1.0.0',
    sites: order.map(([siteId, similarity]) => ({
      siteId,
      similarity,
      rank: similarity === null ? null : (rank += 1),
      status: similarity === null ? 'insufficient_data' : 'scored',
      coverage: similarity === null ? 0.6 : 1,
      confidence: null,
      contributions: {},
      limitingCriterionId: null,
    })),
    ...extra,
  }
}

describe('composer · niveles desde la interpretación (§5.2)', () => {
  it('los criterios ausentes valen 0 («no mencionado») y se recuerdan los mencionados', () => {
    const result = interpretationLevels(interpretation())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.levels).toEqual(levels({ slope: 3, terrain_roughness: 3, local_relief: 2 }))
    expect(result.mentioned).toEqual(['slope', 'terrain_roughness', 'local_relief'])
  })

  it('un criterio repetido o desconocido invalida la interpretación', () => {
    const repeated = interpretationLevels(interpretation({ criteria: [
      { id: 'slope', level: 3, rationale: 'a' },
      { id: 'slope', level: 1, rationale: 'b' },
    ] }))
    expect(repeated).toMatchObject({ ok: false, error: { code: 'invalid' } })
    const unknown = interpretationLevels({ status: 'ok', criteria: [{ id: 'ice' as never, level: 3, rationale: 'x' }] })
    expect(unknown).toMatchObject({ ok: false, error: { code: 'invalid' } })
  })

  it('sin criterios de terreno (o todo en Excluir) es «insufficient», no un % inventado', () => {
    expect(interpretationLevels(interpretation({ status: 'no_terrain_criteria', criteria: [] }))).toMatchObject({ ok: false, error: { code: 'insufficient' } })
    // Lo pedido que no se mide se lista igual (no queda invisible).
    const asked = interpretationLevels({ status: 'no_terrain_criteria', criteria: [], unsupported: [{ phrase: 'hielo', reason: 'not_measured' }, { phrase: 'minerales', reason: 'not_measured' }] })
    expect(asked).toMatchObject({ ok: false, error: { code: 'insufficient' } })
    expect(asked.ok ? '' : asked.error.message).toMatch(/^Pediste, sin datos aún: hielo · minerales — no se miden en este snapshot\. No reconocimos/)
    expect(interpretationLevels(interpretation({ criteria: [{ id: 'slope', level: 0, rationale: 'Excluido.' }] }))).toMatchObject({
      ok: false,
      error: { code: 'insufficient' },
    })
  })

  it('el doble de interpretación cumple el contrato real mission-interpretation/1', () => {
    expect(checkMissionInterpretation(interpretation()).ok).toBe(true)
  })
})

describe('composer · petición a lktron', () => {
  it('arma el catálogo con los 7 criterios y marca la geología sin datos', () => {
    const request = buildInterpretRequest('probar un rover', snapshot, MOBILITY)
    expect(request.locale).toBe('es-CL')
    expect(request.base_profile_id).toBe(snapshot.profile.id)
    expect(request.catalog.map((item) => item.id)).toEqual([...CRITERION_IDS])
    expect(request.catalog.find((item) => item.id === 'geologic_relevance')?.has_data).toBe(false)
    expect(request.catalog.find((item) => item.id === 'slope')?.has_data).toBe(true)
    expect(request.current_profile).toEqual(MOBILITY)
  })
})

describe('composer · un solo anuncio con el orden del motor', () => {
  it('nombra al #1 del MOTOR (no del snapshot) con su % de 1 decimal', () => {
    const order = scoring([['cl-pampa-maria-elena-screening', 61.04], ['cl-pampa-yungay-screening', 60.0], ['cl-domeyko-interior-screening', 50]])
    expect(resultAnnouncement(order, snapshot.candidates)).toBe('3 lugares ordenados para tu misión. Primero: Pampa María Elena, 61,0 % de similitud.')
    expect(firstRanked(order)).toBe('cl-pampa-maria-elena-screening')
    expect(resultLineText(order, snapshot.candidates)).toBe('3 lugares ordenados por el motor test-1.0.0 · #1 Pampa María Elena 61,0 %')
  })

  it('los datos insuficientes se dicen, no se rellenan', () => {
    const partial = scoring([['cl-pampa-yungay-screening', 70], ['cl-domeyko-interior-screening', null]])
    expect(resultAnnouncement(partial, snapshot.candidates)).toBe(
      '1 lugar ordenado para tu misión. Primero: Pampa Yungay, 70,0 % de similitud. 1 lugar con datos insuficientes.',
    )
    const none = scoring([['cl-pampa-yungay-screening', null]])
    expect(resultAnnouncement(none, snapshot.candidates)).toMatch(/^Datos insuficientes para este perfil/)
    const pending = { ...scoring([]), sites: [{ siteId: 'x', similarity: null, rank: null, status: 'por_calcular' as const, coverage: 0, confidence: null, contributions: {}, limitingCriterionId: null }] }
    expect(resultAnnouncement(pending, snapshot.candidates)).toMatch(/por calcular/)
    expect(firstRanked(pending)).toBeNull()
  })

  it('nombre corto del lugar sin el sufijo del sector', () => {
    expect(placeName('Pampa Yungay — sector de screening')).toBe('Pampa Yungay')
  })
})

describe('composer · filas de «Tu misión»', () => {
  it('pesos = nivel ÷ suma, con dirección frente al perfil base y geología pendiente', () => {
    const profile = draft(MOBILITY, base)
    const rows = weightRows(profile, snapshot.profile, snapshot.candidates, ['slope', 'terrain_roughness'])
    const slope = rows.find((row) => row.id === 'slope')
    expect(slope).toMatchObject({ level: 3, baseWeight: 0.2, direction: 'up', pending: false, mentioned: true })
    expect(formatWeight(slope?.weight ?? 0)).toBe('27 %')
    expect(rows.find((row) => row.id === 'surface_temperature_variability')).toMatchObject({ level: 0, weight: 0, direction: 'down' })
    expect(rows.find((row) => row.id === 'geologic_relevance')).toMatchObject({ pending: true, mentioned: false })
    expect(rows.find((row) => row.id === 'local_relief')?.mentioned).toBe(false)
    expect(activeCount(MOBILITY)).toBe(5)
  })

  it('sin perfil de misión muestra los pesos reales del perfil base', () => {
    const rows = weightRows(null, snapshot.profile, snapshot.candidates, null)
    expect(rows.map((row) => formatWeight(row.weight))).toEqual(['20 %', '20 %', '15 %', '20 %', '10 %', '5 %', '10 %'])
    expect(rows.every((row) => row.level === null && row.direction === null)).toBe(true)
  })

  it('cobertura del motor y sectores con datos insuficientes', () => {
    const summary = coverageSummary(scoring([['a', 70], ['b', null]]), snapshot.profile)
    expect(summary).toEqual({ min: 0.6, max: 1, insufficient: 1, minimumValidWeight: 0.7 })
    expect(coverageSummary(null, snapshot.profile)).toBeNull()
  })
})

describe('composer · resaltados del modo DEMO', () => {
  it('parte el texto por tramos y descarta solapes o tramos fuera de rango', () => {
    const text = 'rover en pendiente rocosa'
    const segments = highlightSegments(text, [
      { start: 9, end: 18, criterionId: 'slope' },
      { start: 12, end: 20, criterionId: 'terrain_roughness' },
      { start: 19, end: 25, criterionId: 'terrain_roughness' },
      { start: 30, end: 40, criterionId: 'local_relief' },
    ])
    expect(segments).toEqual([
      { text: 'rover en ', criterionId: null },
      { text: 'pendiente', criterionId: 'slope' },
      { text: ' ', criterionId: null },
      { text: 'rocosa', criterionId: 'terrain_roughness' },
    ])
    expect(segments.map((segment) => segment.text).join('')).toBe(text)
    expect(highlightSegments(text, null)).toEqual([{ text, criterionId: null }])
  })
})

describe('composer · espera (§2.3 C)', () => {
  it('segundos enteros para el contador', () => {
    expect(elapsedSeconds(1000, 4999)).toBe(3)
    expect(elapsedSeconds(5000, 1000)).toBe(0)
  })

  it('la fase real con su paso; en analysis los datos ya están (no se espera)', () => {
    expect(phaseLabel('interpreting', 'demo')).toBe('Interpretación DEMO · sin IA · paso 1 de 4')
    expect(phaseLabel('interpreting', 'lktron')).toBe('La IA interpreta tu misión · paso 1 de 4')
    expect(phaseLabel('scoring', 'demo')).toBe('Motor determinista · calcula y ordena · paso 3 de 4')
    expect(isWaitingPhase('scoring')).toBe(true)
    expect(isWaitingPhase('analysis')).toBe(false)
  })
})
