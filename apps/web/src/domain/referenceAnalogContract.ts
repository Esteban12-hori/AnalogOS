/**
 * Validación en el límite de config/reference_analogs.json (contracts/reference-analog.schema.json).
 * Módulo propio: se descarga con el catálogo (chunk diferido), no en el chunk principal (§6.1).
 */
import { errorSummary, type ReferenceAnalog, type ReferenceAnalogCatalog } from './contracts'
import { validateReferenceAnalogs } from './validators.analogs.generated.js'

/** Valida el catálogo; lanza con un resumen legible. */
export function parseReferenceAnalogs(data: unknown): ReferenceAnalog[] {
  if (!validateReferenceAnalogs(data)) {
    throw new Error(`Catálogo de análogos inválido: ${errorSummary(validateReferenceAnalogs.errors)}`)
  }
  return (data as ReferenceAnalogCatalog).analogs
}
