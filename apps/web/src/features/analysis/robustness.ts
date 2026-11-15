/**
 * Order robustness (docs/UX_REDESIGN.md §3.7 and §5.6): scenarios that change the order and the most sensitive
 * criterion. Every figure comes from `sites[].sensitivity` of analysis-summary.json,
 * which the pipeline writes (pipelines/scoring.py, ±20 % per weight, renormalized); here we only
 * read those figures and compare orders. No engine of its own (ADR-015, superseded by ADR-009).
 * Pure functions: no stores or network.
 */
import type { CriterionId } from '../../domain/contracts'
import { CRITERION_IDS, isCriterionId } from '../../domain/criteria'
import type { SensitivityResult } from '../../domain/sensitivity'

/** Perturbation used by the pipeline (scoring.py). */
export const PERTURBATION = 0.2

export type { SensitivityResult, SensitivityScenario } from '../../domain/sensitivity'

export interface SiteSensitivity {
  siteId: string
  /** Similarity of the place in the snapshot; null = insufficient data. */
  baseScore: number | null
  result: SensitivityResult | null
}

export interface RobustnessSummary {
  status: 'ready' | 'insufficient'
  /** Escenarios evaluados (criterio × ±). */
  scenarios: number
  /** Scenarios in which the order of places with % changes. */
  flips: number
  /** Scenarios in which #1. changes */
  topFlips: number
  /** Criterion whose ±20 % moves some % the most; null if none moves any. */
  mostSensitive: CriterionId | null
  sites: ReadonlyArray<{ siteId: string; stability: number | null; maxScoreDelta: number | null }>
}

interface Ranked {
  siteId: string
  score: number
}

/** Same criterion as rankCandidates: % descending; ties broken by site_id. */
function order(rows: readonly Ranked[]): string[] {
  return [...rows]
    .sort((a, b) => (a.score !== b.score ? b.score - a.score : a.siteId < b.siteId ? -1 : a.siteId > b.siteId ? 1 : 0))
    .map((row) => row.siteId)
}

const CANONICAL: ReadonlyMap<string, number> = new Map(CRITERION_IDS.map((id, index) => [id, index]))

/**
 * Compares the base order with that of each scenario. `rows` arrives in the current ranking order
 * (those without % are ignored for the order). With fewer than two places with %, there is no order to change.
 */
export function summarizeRobustness(rows: readonly SiteSensitivity[]): RobustnessSummary {
  const sites = rows.map((row) => ({
    siteId: row.siteId,
    stability: row.result?.stability ?? null,
    maxScoreDelta: row.result?.maxScoreDelta ?? null,
  }))
  const ranked = rows.filter((row): row is SiteSensitivity & { baseScore: number; result: SensitivityResult } => row.baseScore !== null && row.result !== null)

  // Most sensitive criterion: greatest |delta| in any place; tie → canonical order.
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
    // Only scenarios that exist for all places with %.
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
