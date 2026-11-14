/**
 * Port TypeScript de `pipelines/scoring.py` (ADR-009), línea a línea y con la misma semántica
 * numérica (redondeo y suma de Python, ver pyMath.ts). La paridad ≤1e-6 la verifica
 * parity.test.ts contra tests/fixtures/engine/parity.json, que genera tests/test_engine_parity.py.
 *
 * Similitud:  S = 100 × exp(Σ w'_i × ln(max(s_i, ε)))  sobre criterios válidos,
 *             con w'_i = w_i / (peso válido total).
 * Confianza:  C = 100 × Σ w_i × q_i  con los pesos originales; un criterio no válido aporta 0.
 * Son dos números independientes: nunca se combinan. La factibilidad no se toca.
 */
import type { CriterionStatus } from '../../domain/contracts'
import { pyRound, pySum } from './pyMath'
import type { AggregateCriterion, AggregateInput, AggregateResult, SensitivityResult, SensitivityScenario } from './types'

const TOLERANCE = 1e-9

interface Row {
  criterion: AggregateCriterion
  similarity: number | null
  status: CriterionStatus
  quality: number
}

function inputFor(inputs: Readonly<Record<string, AggregateInput>>, id: string): AggregateInput | undefined {
  return Object.prototype.hasOwnProperty.call(inputs, id) ? inputs[id] : undefined
}

function rowsOf(criteria: readonly AggregateCriterion[], inputs: Readonly<Record<string, AggregateInput>>): Row[] {
  return criteria.map((criterion) => {
    const given = inputFor(inputs, criterion.id)
    const similarity = given?.similarity ?? null
    let status: CriterionStatus = given?.status ?? (similarity !== null ? 'valid' : 'missing')
    if (status === 'valid' && similarity === null) status = 'missing'
    if (similarity !== null && !(similarity >= 0 && similarity <= 1)) {
      throw new RangeError(`${criterion.id}: similarity fuera de [0, 1]: ${similarity}`)
    }
    const quality = status === 'valid' ? (given?.quality ?? 0) : 0
    if (!(quality >= 0 && quality <= 1)) {
      throw new RangeError(`${criterion.id}: quality fuera de [0, 1]: ${quality}`)
    }
    return { criterion, similarity, status, quality }
  })
}

/** Función pura. Lanza (como Python) ante similitud o calidad fuera de [0, 1]. */
export function aggregate(
  criteria: readonly AggregateCriterion[],
  inputs: Readonly<Record<string, AggregateInput>>,
  epsilon: number,
  minimumValidWeight: number,
): AggregateResult {
  const rows = rowsOf(criteria, inputs)
  const validWeight = pySum(rows.filter((row) => row.status === 'valid').map((row) => row.criterion.weight))
  const sufficient = validWeight >= minimumValidWeight - TOLERANCE

  const contributions: Record<string, number | null> = {}
  const statuses: Record<string, CriterionStatus> = {}
  let logSum = 0
  for (const row of rows) {
    let contribution: number | null = null
    if (row.status === 'valid' && sufficient && row.similarity !== null) {
      // Python: ZeroDivisionError y ValueError (math domain error) en estos dos casos.
      if (validWeight === 0) throw new RangeError(`${row.criterion.id}: peso válido nulo`)
      const clamped = Math.max(row.similarity, epsilon)
      if (!(clamped > 0)) throw new RangeError(`${row.criterion.id}: logaritmo de ${clamped}`)
      contribution = (row.criterion.weight / validWeight) * Math.log(clamped)
      logSum += contribution
    }
    contributions[row.criterion.id] = contribution === null ? null : pyRound(contribution, 4)
    statuses[row.criterion.id] = row.status
  }

  return {
    similarity: sufficient ? pyRound(100 * Math.exp(logSum), 2) : null,
    confidence: pyRound(100 * pySum(rows.map((row) => row.criterion.weight * row.quality)), 2),
    validWeight: pyRound(validWeight, 6),
    contributions,
    statuses,
  }
}

/**
 * Perturba cada peso ±`perturbation` (renormalizando) y devuelve la estabilidad 0–100: 100 − el
 * peor cambio absoluto del score. null si la base no tiene similitud (datos insuficientes).
 */
export function sensitivity(
  criteria: readonly AggregateCriterion[],
  inputs: Readonly<Record<string, AggregateInput>>,
  epsilon: number,
  minimumValidWeight: number,
  perturbation = 0.2,
): SensitivityResult {
  if (!(perturbation > 0 && perturbation < 1)) throw new RangeError('perturbation debe estar entre 0 y 1')
  const base = aggregate(criteria, inputs, epsilon, minimumValidWeight).similarity
  if (base === null) return { stability: null, maxScoreDelta: null, scenarios: [] }

  const scenarios: SensitivityScenario[] = []
  for (const criterion of criteria) {
    for (const [direction, factor] of [['minus', 1 - perturbation], ['plus', 1 + perturbation]] as const) {
      const varied = criteria.map((item) => ({ ...item, weight: item.id === criterion.id ? item.weight * factor : item.weight }))
      const total = pySum(varied.map((item) => item.weight))
      if (total === 0) throw new RangeError('suma de pesos nula al perturbar')
      const normalized = varied.map((item) => ({ ...item, weight: item.weight / total }))
      // La suficiencia ya se aprobó para la base: la perturbación no la vuelve a exigir.
      const score = aggregate(normalized, inputs, epsilon, 0).similarity
      scenarios.push({ criterionId: criterion.id, direction, score, delta: score === null ? null : pyRound(score - base, 2) })
    }
  }

  const deltas = scenarios.flatMap((row) => (row.delta === null ? [] : [Math.abs(row.delta)]))
  const maxDelta = deltas.length ? Math.max(...deltas) : 0
  return {
    stability: pyRound(Math.max(0, 100 - maxDelta), 2),
    maxScoreDelta: pyRound(maxDelta, 2),
    scenarios,
  }
}
