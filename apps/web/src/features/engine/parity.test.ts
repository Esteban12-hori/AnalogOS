// Paridad del motor TS con pipelines/scoring.py (ADR-009, tolerancia ≤1e-6). Los valores esperados
// los produce Python: tests/test_engine_parity.py --write → tests/fixtures/engine/parity.json.
import { describe, expect, it } from 'vitest'
import { CRITERION_IDS, type CriterionId } from '../../domain/contracts'
import {
  MISSION_PRESETS,
  aggregate,
  buildMissionInputs,
  levelsToWeights,
  profileFromLevels,
  pyRound,
  pySum,
  scoreMission,
  sensitivity,
  type AggregateCriterion,
  type AggregateInput,
  type CriterionLevel,
} from './index'
import { loadSnapshotV2, readRepoJson } from './testSupport'

interface ExpectedAggregate {
  similarity: number | null
  confidence: number
  valid_weight: number
  contributions: Record<string, number | null>
  statuses: Record<string, string>
}

interface ExpectedSensitivity {
  stability: number | null
  max_score_delta: number | null
  scenarios: Array<{ criterion_id: string; direction: 'minus' | 'plus'; score: number | null; delta: number | null }>
}

interface AggregateCase {
  name: string
  criteria: AggregateCriterion[]
  inputs: Record<string, AggregateInput>
  epsilon: number
  minimum_valid_weight: number
  perturbation: number
  expected?: ExpectedAggregate
  expected_error?: string
  expected_sensitivity?: ExpectedSensitivity
  expected_sensitivity_error?: string
}

interface MissionCase {
  name: string
  levels: Record<CriterionId, CriterionLevel>
  weights: Record<CriterionId, number>
  sites: Record<string, ExpectedAggregate & { sensitivity: ExpectedSensitivity }>
  ranking: string[]
}

interface ParityFixture {
  fixture: string
  tolerance: number
  snapshot: { profile_id: string; profile_version: string; epsilon: number; minimum_valid_weight: number }
  round_cases: Array<{ x: number; digits: number; expected: number }>
  sum_cases: Array<{ values: number[]; expected: number }>
  aggregate_cases: AggregateCase[]
  mission_cases: MissionCase[]
}

const fixture = readRepoJson<ParityFixture>('tests/fixtures/engine/parity.json')
const TOLERANCE = fixture.tolerance

function expectClose(actual: number | null | undefined, expected: number | null, label: string): void {
  if (expected === null) {
    expect(actual, label).toBeNull()
    return
  }
  expect(actual, label).not.toBeNull()
  expect(actual, label).not.toBeUndefined()
  expect(Math.abs((actual as number) - expected), `${label}: ${String(actual)} vs ${expected}`).toBeLessThanOrEqual(TOLERANCE)
}

function expectAggregate(actual: ReturnType<typeof aggregate>, expected: ExpectedAggregate, label: string): void {
  expectClose(actual.similarity, expected.similarity, `${label} similarity`)
  expectClose(actual.confidence, expected.confidence, `${label} confidence`)
  expectClose(actual.validWeight, expected.valid_weight, `${label} valid_weight`)
  expect(Object.keys(actual.contributions).sort(), `${label} contributions`).toEqual(Object.keys(expected.contributions).sort())
  for (const [id, value] of Object.entries(expected.contributions)) expectClose(actual.contributions[id], value, `${label} contribution ${id}`)
  expect(actual.statuses, `${label} statuses`).toEqual(expected.statuses)
}

function expectSensitivity(actual: ReturnType<typeof sensitivity>, expected: ExpectedSensitivity, label: string): void {
  expectClose(actual.stability, expected.stability, `${label} stability`)
  expectClose(actual.maxScoreDelta, expected.max_score_delta, `${label} max_score_delta`)
  expect(actual.scenarios.length, `${label} scenarios`).toBe(expected.scenarios.length)
  expected.scenarios.forEach((scenario, index) => {
    const row = actual.scenarios[index]
    expect(row?.criterionId, `${label} scenario ${index}`).toBe(scenario.criterion_id)
    expect(row?.direction, `${label} scenario ${index}`).toBe(scenario.direction)
    expectClose(row?.score, scenario.score, `${label} scenario ${index} score`)
    expectClose(row?.delta, scenario.delta, `${label} scenario ${index} delta`)
  })
}

describe('fixture de paridad', () => {
  it('está rotulado como FIXTURE y exige ≤1e-6', () => {
    expect(fixture.fixture.startsWith('FIXTURE')).toBe(true)
    expect(fixture.tolerance).toBeLessThanOrEqual(1e-6)
    expect(fixture.aggregate_cases.length).toBeGreaterThanOrEqual(60)
  })

  it('describe el mismo perfil base que el snapshot real', () => {
    const { profile } = loadSnapshotV2()
    expect(fixture.snapshot).toMatchObject({
      profile_id: profile.id,
      profile_version: profile.version,
      epsilon: profile.aggregation.epsilon,
      minimum_valid_weight: profile.aggregation.minimum_valid_weight,
    })
  })
})

describe('aritmética de Python', () => {
  it.each(fixture.round_cases)('round($x, $digits) = $expected', ({ x, digits, expected }) => {
    // Object.is: también el signo del cero (round(-1e-7, 4) == -0.0).
    expect(Object.is(pyRound(x, digits), expected) || pyRound(x, digits) === expected).toBe(true)
    expect(Object.is(pyRound(x, digits), -0)).toBe(Object.is(expected, -0))
  })

  it.each(fixture.sum_cases.map((row, index) => ({ ...row, index })))('sum() caso $index', ({ values, expected }) => {
    expect(pySum(values)).toBe(expected)
  })
})

describe('aggregate y sensitivity ≡ pipelines/scoring.py', () => {
  for (const testCase of fixture.aggregate_cases) {
    it(testCase.name, () => {
      const run = () => aggregate(testCase.criteria, testCase.inputs, testCase.epsilon, testCase.minimum_valid_weight)
      if (testCase.expected_error) {
        expect(run).toThrow()
        return
      }
      if (!testCase.expected) throw new Error(`${testCase.name}: caso sin resultado esperado`)
      expectAggregate(run(), testCase.expected, testCase.name)

      const runSensitivity = () =>
        sensitivity(testCase.criteria, testCase.inputs, testCase.epsilon, testCase.minimum_valid_weight, testCase.perturbation)
      if (testCase.expected_sensitivity_error) {
        expect(runSensitivity).toThrow()
        return
      }
      if (!testCase.expected_sensitivity) throw new Error(`${testCase.name}: caso sin sensibilidad esperada`)
      expectSensitivity(runSensitivity(), testCase.expected_sensitivity, testCase.name)
    })
  }
})

describe('perfiles de misión sobre el snapshot real ≡ Python', () => {
  const { candidates, profile: base } = loadSnapshotV2()
  const ref = { id: base.id, version: base.version }

  it('cada predefinido del motor tiene su caso de paridad con los mismos niveles', () => {
    for (const preset of MISSION_PRESETS) {
      const testCase = fixture.mission_cases.find((row) => row.name === preset.id)
      expect(testCase, preset.id).toBeDefined()
      expect(testCase?.levels).toEqual(preset.levels)
    }
  })

  for (const testCase of fixture.mission_cases) {
    it(testCase.name, () => {
      const weights = levelsToWeights(testCase.levels)
      for (const id of CRITERION_IDS) expect(weights[id], `${testCase.name} peso ${id}`).toBe(testCase.weights[id])

      const profile = profileFromLevels(testCase.levels, ref, testCase.name)
      const scoring = scoreMission({ profile, candidates, base })
      expect(scoring.sites.map((site) => site.siteId)).toEqual(testCase.ranking)

      for (const site of scoring.sites) {
        const expected = testCase.sites[site.siteId]
        if (!expected) throw new Error(`${testCase.name}: falta ${site.siteId} en el fixture`)
        const label = `${testCase.name} · ${site.siteId}`
        expectClose(site.similarity, expected.similarity, `${label} similarity`)
        expectClose(site.confidence, expected.confidence, `${label} confidence`)
        expectClose(site.coverage, expected.valid_weight, `${label} coverage`)
        for (const [id, value] of Object.entries(expected.contributions)) {
          expectClose(site.contributions[id as CriterionId], value, `${label} contribution ${id}`)
        }
        expect(site.status).toBe(expected.similarity === null ? 'insufficient_data' : 'scored')

        const candidate = candidates.find((row) => row.site_id === site.siteId)
        if (!candidate) throw new Error(`${label}: sector ausente del snapshot`)
        const inputs = buildMissionInputs({ profile, candidate, base })
        expectAggregate(aggregate(inputs.criteria, inputs.inputs, inputs.epsilon, inputs.minimumValidWeight), expected, label)
        expectSensitivity(
          sensitivity(inputs.criteria, inputs.inputs, inputs.epsilon, inputs.minimumValidWeight),
          expected.sensitivity,
          label,
        )
      }
    })
  }
})
