/**
 * Validación en el límite de mission-interpretation/1 (docs/UX_REDESIGN.md §5.2). Módulo propio
 * para que el chunk de misión cargue solo este validador (§6.1), no los del paquete de evidencia
 * ni los eventos de análisis.
 */
import type { ContractCheck, MissionInterpretation } from './aiContracts'
import { errorSummary } from './contracts'
import { validateMissionInterpretation } from './validators.interpretation.generated.js'

export function checkMissionInterpretation(data: unknown): ContractCheck<MissionInterpretation> {
  if (validateMissionInterpretation(data)) return { ok: true, value: data as MissionInterpretation }
  return { ok: false, error: `mission-interpretation/1: ${errorSummary(validateMissionInterpretation.errors)}` }
}
