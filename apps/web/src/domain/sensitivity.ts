/**
 * Sensitivity of the ranking that the pipeline writes to analysis-summary.json (`sites[].sensitivity`:
 * ±20 % per weight, renormalized; pipelines/scoring.py). It is read at the boundary, like
 * `parseMarsReference`: anything that does not have the expected shape is ignored, never invented.
 */
export interface SensitivityScenario {
  criterionId: string
  direction: 'minus' | 'plus'
  /** Similarity of the place in the scenario; null if the pipeline did not compute it. */
  score: number | null
  delta: number | null
}

/** Sensitivity of a place as written by the pipeline. */
export interface SensitivityResult {
  stability: number | null
  maxScoreDelta: number | null
  scenarios: SensitivityScenario[]
}

const finite = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)

/**
 * Reads `sites[].sensitivity` from analysis-summary.json (validation at the boundary: anything that does not have
 * the expected shape is ignored, never invented). Empty map if the summary does not include it.
 */
export function parseSensitivity(summary: unknown): Map<string, SensitivityResult> {
  const out = new Map<string, SensitivityResult>()
  const sites = (summary as { sites?: unknown } | null)?.sites
  if (!Array.isArray(sites)) return out
  for (const site of sites) {
    const record = site as { site_id?: unknown; sensitivity?: unknown }
    const data = record.sensitivity as { stability?: unknown; max_score_delta?: unknown; scenarios?: unknown } | undefined
    if (typeof record.site_id !== 'string' || !data || !Array.isArray(data.scenarios)) continue
    const scenarios: SensitivityScenario[] = []
    for (const raw of data.scenarios) {
      const item = raw as { criterion_id?: unknown; direction?: unknown; score?: unknown; delta?: unknown }
      if (typeof item.criterion_id !== 'string' || (item.direction !== 'minus' && item.direction !== 'plus')) continue
      scenarios.push({ criterionId: item.criterion_id, direction: item.direction, score: finite(item.score), delta: finite(item.delta) })
    }
    out.set(record.site_id, { stability: finite(data.stability), maxScoreDelta: finite(data.max_score_delta), scenarios })
  }
  return out
}

