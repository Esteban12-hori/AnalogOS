/**
 * Textos de PRESENTACIÓN cuando el sector tiene su contexto geológico oficial validado (M9 del equipo:
 * `ScoreBreakdown` y «Dónde falla la analogía» de `CandidateDetails`, portados a la interfaz integrada).
 * El snapshot no cambia: la geología del puntaje sigue sin calibrar, fuera de similitud, confianza y
 * factibilidad. Módulo puro y liviano (sin Ajv): lo usan el chunk de entrada y los diferidos.
 */

export const GEOLOGY_CRITERION_ID = 'geologic_relevance'

/** Texto del equipo para el criterio geológico pendiente cuando hay contexto oficial disponible. */
export const GEOLOGY_PENDING_WITH_CONTEXT =
  'El contexto geológico oficial está disponible con sus límites de cobertura. Falta calibrar su compatibilidad con el objetivo y revisarla con especialistas; permanece fuera del puntaje.'

/** Limitación histórica del snapshot v3 que el contexto oficial deja parcialmente atendida. */
export const HISTORICAL_GEOLOGY_LIMITATION =
  'Geología, áreas protegidas, urbano, propiedad y acceso permanecen pendientes de evidencia oficial integrada en ambos países.'

/**
 * Reemplazo del equipo, con la ubicación de la interfaz integrada: el panel geológico vive en la
 * pestaña «Geología» de la ficha (en `CandidateDetails` estaba «arriba» de la lista).
 */
export const GEOLOGY_LIMITATION_WITH_CONTEXT =
  'La cartografía geológica regional se consulta en la pestaña «Geología» con sus huecos y límites. La calibración geológica y la evidencia territorial de áreas protegidas, urbano, propiedad y acceso siguen pendientes.'

/** Explicación del criterio pendiente: la del snapshot o, con contexto oficial del sector, la del equipo. */
export function criterionExplanation(criterionId: string, explanation: string, hasGeology: boolean): string {
  return hasGeology && criterionId === GEOLOGY_CRITERION_ID ? GEOLOGY_PENDING_WITH_CONTEXT : explanation
}

/** Limitación del snapshot tal cual o, con contexto oficial del sector, su versión actualizada. */
export function limitationText(item: string, hasGeology: boolean): string {
  return hasGeology && item === HISTORICAL_GEOLOGY_LIMITATION ? GEOLOGY_LIMITATION_WITH_CONTEXT : item
}
