/**
 * Validation of the already-read ◆ catalog (schema + semantic checks). Deferred chunk: it is
 * imported by `loadReferenceAnalogs` together with the catalog, so the validator does not weigh down the main
 * chunk (§6.1). Pure functions.
 */
import type { ReferenceAnalog } from '../../domain/contracts'
import { parseReferenceAnalogs } from '../../domain/referenceAnalogContract'
import type { ReferenceAnalogsState } from './index'

/** Semantic checks performed after the schema; throws with a readable message. */
export function checkReferenceAnalogs(analogs: readonly ReferenceAnalog[]): readonly ReferenceAnalog[] {
  const seen = new Set<string>()
  for (const analog of analogs) {
    if (seen.has(analog.id)) throw new Error(`repeated analog id: ${analog.id}`)
    seen.add(analog.id)
    const { location } = analog
    if (location.kind === 'region' && !(location.bbox[0] < location.bbox[2] && location.bbox[1] < location.bbox[3])) {
      throw new Error(`badly oriented box in ${analog.id}: [west, south, east, north] expected`)
    }
  }
  return Object.freeze([...analogs])
}

/** Validates an already-read document; never throws. */
export function referenceAnalogsFrom(data: unknown): ReferenceAnalogsState {
  try {
    return { status: 'ready', analogs: checkReferenceAnalogs(parseReferenceAnalogs(data)) }
  } catch (error) {
    return { status: 'unavailable', reason: error instanceof Error ? error.message : 'Invalid analog catalog.' }
  }
}
