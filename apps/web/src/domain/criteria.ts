/**
 * Identifiers of the 7 criteria of the base profile (canonical order of the v2 and v3 snapshots)..
 * Dependency-free module: used by the rail, the lines, and the Reading in the main chunk.
 */
export const CRITERION_IDS = [
  'slope',
  'terrain_roughness',
  'local_relief',
  'bare_ground_fraction',
  'aridity_context',
  'surface_temperature_variability',
  'geologic_relevance',
] as const

export type CriterionId = (typeof CRITERION_IDS)[number]

export function isCriterionId(value: unknown): value is CriterionId {
  return typeof value === 'string' && (CRITERION_IDS as readonly string[]).includes(value)
}
