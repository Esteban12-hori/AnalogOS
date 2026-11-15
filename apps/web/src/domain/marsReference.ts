// Regional Mars reference (Jezero, MOLA MEGDR) read from analysis-summary.json.
// Used only to show what each topographic criterion was compared against; the score is computed by the pipeline.

export interface MarsReference {
  name: string
  spacingMeter: number
  /** Martian value per criterion_id (same unit as the criterion's raw_value). */
  byCriterion: Readonly<Record<string, number>>
}

const MOLA_KEYS: Readonly<Record<string, string>> = {
  slope: 'median_slope_degree',
  terrain_roughness: 'median_neighbor_difference_meter',
  local_relief: 'median_3x3_relief_meter',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseMarsReference(summary: unknown): MarsReference | null {
  if (!isRecord(summary) || !isRecord(summary.mola_reference)) return null
  const mola = summary.mola_reference
  const byCriterion: Record<string, number> = {}
  for (const [criterion, key] of Object.entries(MOLA_KEYS)) {
    const value = mola[key]
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) byCriterion[criterion] = value
  }
  if (Object.keys(byCriterion).length === 0) return null
  return {
    name: typeof mola.name === 'string' ? mola.name : 'MOLA reference',
    spacingMeter: typeof mola.nominal_spacing_meter === 'number' ? mola.nominal_spacing_meter : Number.NaN,
    byCriterion,
  }
}
