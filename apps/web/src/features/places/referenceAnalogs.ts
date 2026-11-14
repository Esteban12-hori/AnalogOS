/**
 * Catálogo de análogos emblemáticos ◆ (config/reference_analogs.json).
 *
 * - Se carga diferido (chunk propio, ≤3 KB): no pesa en el chunk principal ni bloquea el carrusel.
 * - Se valida en el límite con `parseReferenceAnalogs` (contracts/reference-analog.schema.json) y
 *   con dos chequeos que el esquema no expresa: ids únicos y cajas bien orientadas.
 * - Si algo falla, el estado es `unavailable` con el motivo: nunca se inventan análogos.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { parseReferenceAnalogs, type CandidateSite, type ReferenceAnalog } from '../../domain/contracts'
import type { ReferenceAnalogsState } from './index'
import { NO_REFERENCES, type ReferenceClassification } from './placeModel'

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

let state: ReferenceAnalogsState = { status: 'loading' }
let pending: Promise<ReferenceAnalogsState> | null = null
let classify: typeof import('./classify').classifyReferenceAnalogs | null = null
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const read = (): ReferenceAnalogsState => state

/**
 * Carga una sola vez por sesión el catálogo y su clasificador geométrico (dos chunks diferidos,
 * en paralelo); las llamadas siguientes devuelven el mismo resultado.
 */
export function loadReferenceAnalogs(): Promise<ReferenceAnalogsState> {
  pending ??= Promise.all([import('../../../../../config/reference_analogs.json'), import('./classify')])
    .then(([catalog, geometry]): ReferenceAnalogsState => {
      classify = geometry.classifyReferenceAnalogs
      return referenceAnalogsFrom(catalog.default)
    })
    .catch((): ReferenceAnalogsState => ({ status: 'unavailable', reason: 'No se pudo cargar el catálogo de análogos.' }))
    .then((next) => {
      state = next
      for (const listener of [...listeners]) listener()
      return next
    })
  return pending
}

/**
 * Regla §1 #16 sobre los sectores del snapshot: insignia «coincide con» o ◆ propio. Sin el
 * clasificador cargado no se muestra ningún ◆ (mejor ausente que mal ubicado).
 */
export function classifyReferences(analogs: readonly ReferenceAnalog[], candidates: readonly CandidateSite[]): ReferenceClassification {
  return classify && analogs.length > 0 ? classify(analogs, candidates) : NO_REFERENCES
}

/** Estado del catálogo; dispara la carga en el primer uso. */
export function useReferenceAnalogs(): ReferenceAnalogsState {
  const current = useSyncExternalStore(subscribe, read, read)
  useEffect(() => {
    void loadReferenceAnalogs()
  }, [])
  return current
}
