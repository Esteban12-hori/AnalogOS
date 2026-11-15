/**
 * Catálogo de análogos emblemáticos ◆ (config/reference_analogs.json).
 *
 * - Se carga diferido (chunk propio, ≤3 KB): no pesa en el chunk principal ni bloquea el carrusel.
 * - Se valida en el límite con `parseReferenceAnalogs` (contracts/reference-analog.schema.json) y
 *   con dos chequeos que el esquema no expresa: ids únicos y cajas bien orientadas. El validador
 *   viaja en el mismo chunk diferido que el catálogo (analogCatalog.ts), no en el principal.
 * - Si algo falla, el estado es `unavailable` con el motivo: nunca se inventan análogos.
 */
import { useEffect, useSyncExternalStore } from 'react'
import type { CandidateSite, ReferenceAnalog } from '../../domain/contracts'
import type { ReferenceAnalogsState } from './index'
import { NO_REFERENCES, type ReferenceClassification } from './placeModel'

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
  pending ??= Promise.all([import('../../../../../config/reference_analogs.json'), import('./classify'), import('./analogCatalog')])
    .then(([catalog, geometry, contract]): ReferenceAnalogsState => {
      classify = geometry.classifyReferenceAnalogs
      return contract.referenceAnalogsFrom(catalog.default)
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
