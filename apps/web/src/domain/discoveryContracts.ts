/**
 * Validación de la búsqueda y del catálogo de antecedentes del snapshot v3 (ADR-008), con
 * validadores precompilados. Módulo propio: el cargador lo importa de forma diferida solo cuando
 * el snapshot activo es v3, así sus ~14 KB gz no entran al chunk principal (ADR-013).
 */
import type { SearchResults } from '../../../../shared/domain/contracts'
import { errorSummary } from './snapshotContracts'
import { validatePrecedents, validateSearch } from './validators.discovery.generated.js'

/** Valida los resultados de búsqueda y el catálogo de antecedentes de un snapshot v3. */
export function assertDiscoveryContracts(
  search: unknown,
  precedents: unknown,
): asserts search is SearchResults {
  if (!validateSearch(search)) {
    throw new Error(`Resultados de búsqueda inválidos: ${errorSummary(validateSearch.errors)}`)
  }
  if (!validatePrecedents(precedents)) {
    throw new Error(`Catálogo de antecedentes inválido: ${errorSummary(validatePrecedents.errors)}`)
  }
}
