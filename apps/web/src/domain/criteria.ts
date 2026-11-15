/**
 * Identificadores de los 7 criterios del perfil base (orden canónico de los snapshots v2 y v3).
 * Módulo sin dependencias: lo usan el riel, las líneas y la Lectura en el chunk principal.
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
