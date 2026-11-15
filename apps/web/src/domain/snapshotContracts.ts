/**
 * Snapshot validation at the system boundary (candidates, manifest, and profile), using the
 * precompiled validators from contracts/*.schema.json (scripts/build-validators.mjs): the same
 * validation as shared/domain/contracts.ts, without the Ajv compiler in the main chunk.
 * Messages identical to those of the shared version.
 */
import type { ErrorObject } from 'ajv'
import type { CandidateSite } from '../../../../shared/domain/contracts'
import { validateCandidate, validateManifest, validateProfile } from './validators.generated.js'

export function errorSummary(errors: ErrorObject[] | null | undefined): string {
  if (!errors?.length) return 'unknown contract error'
  return errors.map((error) => `${error.instancePath || '/'} ${error.message ?? ''}`.trim()).join('; ')
}

export function assertSnapshotContracts(
  candidates: unknown,
  manifest: unknown,
  profile: unknown,
): asserts candidates is CandidateSite[] {
  if (!Array.isArray(candidates)) {
    throw new Error('candidate-details.json must contain a list.')
  }
  candidates.forEach((candidate, index) => {
    if (!validateCandidate(candidate)) {
      throw new Error(`Invalid candidate ${index + 1}: ${errorSummary(validateCandidate.errors)}`)
    }
  })
  if (!validateManifest(manifest)) {
    throw new Error(`Invalid manifest: ${errorSummary(validateManifest.errors)}`)
  }
  if (!validateProfile(profile)) {
    throw new Error(`Invalid profile: ${errorSummary(validateProfile.errors)}`)
  }
}
