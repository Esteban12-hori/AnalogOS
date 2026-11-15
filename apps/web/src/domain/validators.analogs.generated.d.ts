// Tipos del validador precompilado del catálogo de ◆ (scripts/build-validators.mjs). Se carga
// junto con config/reference_analogs.json (chunk diferido), no en el chunk principal.
import type { StandaloneValidator } from './validators.generated'

/** contracts/reference-analog.schema.json (catálogo de ◆ por calcular). */
export const validateReferenceAnalogs: StandaloneValidator
