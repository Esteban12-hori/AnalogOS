/**
 * Validación del catálogo de ◆ ya leído (esquema + chequeos semánticos). Chunk diferido: lo
 * importa `loadReferenceAnalogs` junto con el catálogo, así el validador no pesa en el chunk
 * principal (§6.1). Funciones puras.
 */
import type { ReferenceAnalog } from '../../domain/contracts'
import { parseReferenceAnalogs } from '../../domain/referenceAnalogContract'
import type { ReferenceAnalogsState } from './index'

/** Chequeos semánticos posteriores al esquema; lanza con un texto legible. */
export function checkReferenceAnalogs(analogs: readonly ReferenceAnalog[]): readonly ReferenceAnalog[] {
  const seen = new Set<string>()
  for (const analog of analogs) {
    if (seen.has(analog.id)) throw new Error(`id de análogo repetido: ${analog.id}`)
    seen.add(analog.id)
    const { location } = analog
    if (location.kind === 'region' && !(location.bbox[0] < location.bbox[2] && location.bbox[1] < location.bbox[3])) {
      throw new Error(`caja mal orientada en ${analog.id}: se espera [oeste, sur, este, norte]`)
    }
  }
  return Object.freeze([...analogs])
}

/** Valida un documento ya leído; nunca lanza. */
export function referenceAnalogsFrom(data: unknown): ReferenceAnalogsState {
  try {
    return { status: 'ready', analogs: checkReferenceAnalogs(parseReferenceAnalogs(data)) }
  } catch (error) {
    return { status: 'unavailable', reason: error instanceof Error ? error.message : 'Catálogo de análogos inválido.' }
  }
}
