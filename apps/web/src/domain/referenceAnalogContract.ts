/**
 * Validation at the boundary of config/reference_analogs.json (contracts/reference-analog.schema.json).
 * Dedicated module: it is downloaded along with the catalog (deferred chunk), not in the main chunk (§6.1).
 */
import type { ReferenceAnalog, ReferenceAnalogCatalog } from './contracts'
import { errorSummary } from './snapshotContracts'
import { validateReferenceAnalogs } from './validators.analogs.generated.js'

/** Validates the catalog; throws with a readable summary. */
export function parseReferenceAnalogs(data: unknown): ReferenceAnalog[] {
  if (!validateReferenceAnalogs(data)) {
    throw new Error(`Invalid analog catalog: ${errorSummary(validateReferenceAnalogs.errors)}`)
  }
  return (data as ReferenceAnalogCatalog).analogs
}
