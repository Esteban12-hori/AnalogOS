// Referencia regional de Marte (Jezero, MOLA MEGDR) leída de analysis-summary.json.
// Solo se usa para mostrar contra qué se comparó cada criterio topográfico; el score lo calcula el pipeline.

export interface MarsReference {
  name: string
  spacingMeter: number
  /** Valor marciano por criterion_id (misma unidad que el raw_value del criterio). */
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
    name: typeof mola.name === 'string' ? mola.name : 'Referencia MOLA',
    spacingMeter: typeof mola.nominal_spacing_meter === 'number' ? mola.nominal_spacing_meter : Number.NaN,
    byCriterion,
  }
}
