/**
 * Sensibilidad del orden que escribe el pipeline en analysis-summary.json (`sites[].sensitivity`:
 * ±20 % por peso, renormalizado; pipelines/scoring.py). Se lee en el límite, como
 * `parseMarsReference`: lo que no tiene la forma esperada se ignora, nunca se inventa.
 */
export interface SensitivityScenario {
  criterionId: string
  direction: 'minus' | 'plus'
  /** Similitud del lugar en el escenario; null si el pipeline no la calculó. */
  score: number | null
  delta: number | null
}

/** Sensibilidad de un lugar tal como la escribe el pipeline. */
export interface SensitivityResult {
  stability: number | null
  maxScoreDelta: number | null
  scenarios: SensitivityScenario[]
}

const finite = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)

/**
 * Lee `sites[].sensitivity` de analysis-summary.json (validación en el límite: lo que no tiene
 * la forma esperada se ignora, nunca se inventa). Mapa vacío si el resumen no la trae.
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

