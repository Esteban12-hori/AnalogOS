// Tipos de los validadores precompilados del snapshot v3 (scripts/build-validators.mjs). Chunk
// diferido: solo lo importa domain/discoveryContracts.ts.
import type { StandaloneValidator } from './validators.generated'

/** contracts/discovery-search.schema.json */
export const validateSearch: StandaloneValidator
/** contracts/precedent-catalog.schema.json */
export const validatePrecedents: StandaloneValidator
