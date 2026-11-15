// Types of the precompiled v3 snapshot validators (scripts/build-validators.mjs). Deferred
// chunk: only domain/discoveryContracts.ts imports it.
import type { StandaloneValidator } from './validators.generated'

/** contracts/discovery-search.schema.json */
export const validateSearch: StandaloneValidator
/** contracts/precedent-catalog.schema.json */
export const validatePrecedents: StandaloneValidator
