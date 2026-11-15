// Types of the precompiled validator for the ◆ catalog (scripts/build-validators.mjs). It is loaded
// together with config/reference_analogs.json (deferred chunk), not in the main chunk.
import type { StandaloneValidator } from './validators.generated'

/** contracts/reference-analog.schema.json (catalog of ◆ to be calculated). */
export const validateReferenceAnalogs: StandaloneValidator
