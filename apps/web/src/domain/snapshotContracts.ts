/**
 * Validación del snapshot en el límite del sistema (candidatos, manifiesto y perfil), con los
 * validadores precompilados de contracts/*.schema.json (scripts/build-validators.mjs): misma
 * validación que shared/domain/contracts.ts, sin el compilador de Ajv en el chunk principal.
 * Mensajes idénticos a los de la versión compartida.
 */
import type { ErrorObject } from 'ajv'
import type { CandidateSite } from '../../../../shared/domain/contracts'
import { validateCandidate, validateManifest, validateProfile } from './validators.generated.js'

export function errorSummary(errors: ErrorObject[] | null | undefined): string {
  if (!errors?.length) return 'error de contrato desconocido'
  return errors.map((error) => `${error.instancePath || '/'} ${error.message ?? ''}`.trim()).join('; ')
}

export function assertSnapshotContracts(
  candidates: unknown,
  manifest: unknown,
  profile: unknown,
): asserts candidates is CandidateSite[] {
  if (!Array.isArray(candidates)) {
    throw new Error('candidate-details.json debe contener una lista.')
  }
  candidates.forEach((candidate, index) => {
    if (!validateCandidate(candidate)) {
      throw new Error(`Candidato ${index + 1} inválido: ${errorSummary(validateCandidate.errors)}`)
    }
  })
  if (!validateManifest(manifest)) {
    throw new Error(`Manifest inválido: ${errorSummary(validateManifest.errors)}`)
  }
  if (!validateProfile(profile)) {
    throw new Error(`Perfil inválido: ${errorSummary(validateProfile.errors)}`)
  }
}
