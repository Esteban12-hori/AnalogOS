// Types of the validators precompiled by scripts/build-validators.mjs.
import type { ErrorObject } from 'ajv'

export interface StandaloneValidator {
  (data: unknown): boolean
  errors?: ErrorObject[] | null
}

export const validateCandidate: StandaloneValidator
export const validateManifest: StandaloneValidator
export const validateProfile: StandaloneValidator
