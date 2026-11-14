/**
 * Catálogo de análogos de referencia ◆ (config/reference_analogs.json, validado con
 * parseReferenceAnalogs). STUB: el catálogo aún no existe (incremento 3); se informa como no
 * disponible y nunca se inventan análogos.
 */
import type { ReferenceAnalogsState } from './index'

const UNAVAILABLE: ReferenceAnalogsState = {
  status: 'unavailable',
  reason: 'Catálogo de análogos por publicar (config/reference_analogs.json, incremento 3).',
}

export function loadReferenceAnalogs(): Promise<ReferenceAnalogsState> {
  return Promise.resolve(UNAVAILABLE)
}

export function useReferenceAnalogs(): ReferenceAnalogsState {
  return UNAVAILABLE
}
