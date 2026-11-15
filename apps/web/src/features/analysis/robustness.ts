/**
 * Robustez del orden (docs/UX_REDESIGN.md §3.7 y §5.6): brecha #1–#2, escenarios que cambian el
 * orden y criterio más sensible. Toda cifra sale de `sensitivity` del motor (port de
 * pipelines/scoring.py, ±20 % por peso, renormalizado); aquí solo se comparan órdenes.
 * Funciones puras: sin stores ni red.
 */
import type { CandidateSite, CriterionId, MissionProfile } from '../../domain/contracts'
import { CRITERION_IDS, isCriterionId } from '../../domain/criteria'
import type { AggregateCriterion, AggregateInput, SensitivityResult } from '../engine'

/** Perturbación que usa el pipeline (scoring.py) y el motor TS por defecto. */
export const PERTURBATION = 0.2

export interface SensitivityInputs {
  criteria: AggregateCriterion[]
  inputs: Record<string, AggregateInput>
  epsilon: number
  minimumValidWeight: number
}

/**
 * Insumos de `sensitivity` para un sector, con la MISMA regla que `scoreMission` del motor
 * (`buildMissionInputs`): peso del perfil activo y, con un perfil de misión, Excluir (peso 0)
 * entra como `excluded`. `weights` null = perfil base del snapshot (pesos y estados tal cual).
 */
export function sensitivityInputs(
  base: MissionProfile,
  weights: Readonly<Partial<Record<CriterionId, number>>> | null,
  candidate: CandidateSite,
): SensitivityInputs {
  const weightOf = (id: string, fallback: number): number => (weights === null ? fallback : isCriterionId(id) ? (weights[id] ?? 0) : 0)
  const criteria = base.criteria.map((criterion) => ({ id: criterion.id, weight: weightOf(criterion.id, criterion.weight), unit: criterion.unit }))
  const inputs: Record<string, AggregateInput> = {}
  for (const item of candidate.score_breakdown) {
    const excluded = weights !== null && weightOf(item.criterion_id, 0) === 0
    inputs[item.criterion_id] = {
      similarity: item.normalized_similarity,
      quality: item.quality,
      status: excluded ? 'excluded' : item.status,
    }
  }
  return {
    criteria,
    inputs,
    epsilon: base.aggregation.epsilon,
    minimumValidWeight: base.aggregation.minimum_valid_weight,
  }
}

export interface SiteSensitivity {
  siteId: string
  /** Similitud del lugar con el perfil activo (snapshot o motor); null = datos insuficientes. */
  baseScore: number | null
  result: SensitivityResult | null
}

export interface RobustnessSummary {
  status: 'ready' | 'insufficient'
  /** Escenarios evaluados (criterio × ±). */
  scenarios: number
  /** Escenarios en los que cambia el orden de los lugares con %. */
  flips: number
  /** Escenarios en los que cambia el #1. */
  topFlips: number
  /** Criterio cuyo ±20 % mueve más algún %; null si ninguno lo mueve. */
  mostSensitive: CriterionId | null
  sites: ReadonlyArray<{ siteId: string; stability: number | null; maxScoreDelta: number | null }>
}

interface Ranked {
  siteId: string
  score: number
}

/** Mismo criterio que rankCandidates: % descendente; empate por site_id. */
function order(rows: readonly Ranked[]): string[] {
  return [...rows]
    .sort((a, b) => (a.score !== b.score ? b.score - a.score : a.siteId < b.siteId ? -1 : a.siteId > b.siteId ? 1 : 0))
    .map((row) => row.siteId)
}

const CANONICAL: ReadonlyMap<string, number> = new Map(CRITERION_IDS.map((id, index) => [id, index]))

/**
 * Compara el orden base con el de cada escenario. `rows` llega en el orden del ranking actual
 * (los sin % se ignoran para el orden). Con menos de dos lugares con %, no hay orden que cambiar.
 */
export function summarizeRobustness(rows: readonly SiteSensitivity[]): RobustnessSummary {
  const sites = rows.map((row) => ({
    siteId: row.siteId,
    stability: row.result?.stability ?? null,
    maxScoreDelta: row.result?.maxScoreDelta ?? null,
  }))
  const ranked = rows.filter((row): row is SiteSensitivity & { baseScore: number; result: SensitivityResult } => row.baseScore !== null && row.result !== null)

  // Criterio más sensible: mayor |delta| en cualquier lugar; empate → orden canónico.
  let mostSensitive: CriterionId | null = null
  let worst = 0
  for (const row of ranked) {
    for (const scenario of row.result.scenarios) {
      if (scenario.delta === null || !isCriterionId(scenario.criterionId)) continue
      const size = Math.abs(scenario.delta)
      const better =
        size > worst ||
        (size === worst && size > 0 && mostSensitive !== null && (CANONICAL.get(scenario.criterionId) ?? 99) < (CANONICAL.get(mostSensitive) ?? 99))
      if (better) {
        worst = size
        mostSensitive = scenario.criterionId
      }
    }
  }

  if (ranked.length < 2) return { status: 'insufficient', scenarios: 0, flips: 0, topFlips: 0, mostSensitive, sites }

  const baseOrder = order(ranked.map((row) => ({ siteId: row.siteId, score: row.baseScore })))
  const keys = new Map<string, number>()
  ranked.forEach((row) => {
    for (const scenario of row.result.scenarios) {
      const key = `${scenario.criterionId}:${scenario.direction}`
      keys.set(key, (keys.get(key) ?? 0) + 1)
    }
  })

  let scenarios = 0
  let flips = 0
  let topFlips = 0
  for (const [key, count] of keys) {
    // Solo escenarios que existen para todos los lugares con %.
    if (count !== ranked.length) continue
    const scored: Ranked[] = []
    for (const row of ranked) {
      const scenario = row.result.scenarios.find((item) => `${item.criterionId}:${item.direction}` === key)
      if (!scenario || scenario.score === null) break
      scored.push({ siteId: row.siteId, score: scenario.score })
    }
    if (scored.length !== ranked.length) continue
    scenarios += 1
    const next = order(scored)
    if (next.some((siteId, index) => siteId !== baseOrder[index])) flips += 1
    if (next[0] !== baseOrder[0]) topFlips += 1
  }

  return { status: 'ready', scenarios, flips, topFlips, mostSensitive, sites }
}
