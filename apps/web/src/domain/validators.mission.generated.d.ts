// Tipos de los validadores precompilados de UX_REDESIGN §5 (scripts/build-validators.mjs).
// Este módulo pesa: impórtalo solo desde chunks diferidos (motor, misión, análisis).
import type { StandaloneValidator } from './validators.generated'

export const validateMissionInterpretation: StandaloneValidator
export const validateEvidencePacket: StandaloneValidator
export const validateAiAnalysisEvent: StandaloneValidator
