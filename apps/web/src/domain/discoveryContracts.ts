/**
 * Validation of the search and background catalog of the v3 snapshot (ADR-008), with
 * precompiled validators. Dedicated module: the loader imports it lazily only when
 * the active snapshot is v3, so its ~14 KB gz do not enter the main chunk (ADR-013).
 */
import type { SearchResults } from '../../../../shared/domain/contracts'
import { errorSummary } from './snapshotContracts'
import { validatePrecedents, validateSearch } from './validators.discovery.generated.js'

/** Validates the search results and the background catalog of a v3 snapshot. */
export function assertDiscoveryContracts(
  search: unknown,
  precedents: unknown,
): asserts search is SearchResults {
  if (!validateSearch(search)) {
    throw new Error(`Invalid search results: ${errorSummary(validateSearch.errors)}`)
  }
  if (!validatePrecedents(precedents)) {
    throw new Error(`Invalid precedent catalog: ${errorSummary(validatePrecedents.errors)}`)
  }
}
