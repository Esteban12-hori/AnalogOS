/**
 * PRESENTATION texts for when the sector has its validated official geological context (team M9:
 * `ScoreBreakdown` and "Where the analogy fails" from `CandidateDetails`, ported to the integrated interface).
 * The snapshot does not change: the score's geology remains uncalibrated, outside similarity, confidence and
 * feasibility. Pure, lightweight module (no Ajv): used by the entry chunk and the deferred ones.
 */

import { displaySource } from '../i18n/sourceText'

export const GEOLOGY_CRITERION_ID = 'geologic_relevance'

/** Team text for the pending geological criterion when official context is available. */
export const GEOLOGY_PENDING_WITH_CONTEXT =
  'The official geological context is available with its coverage limits. Its compatibility with the objective still needs calibration and expert review; it stays outside the score.'

/** Historical v3 snapshot limitation (exact source wording, matched against the artifact) that the official context partly addresses. */
export const HISTORICAL_GEOLOGY_LIMITATION =
  'Geología, áreas protegidas, urbano, propiedad y acceso permanecen pendientes de evidencia oficial integrada en ambos países.'

/**
 * Team replacement, with the location in the integrated interface: the geological panel lives in the
 * "Geology" tab of the detail sheet (in `CandidateDetails` it was "above" the list).
 */
export const GEOLOGY_LIMITATION_WITH_CONTEXT =
  'Regional geological mapping can be consulted in the “Geology” tab with its gaps and limits. Geological calibration and territorial evidence on protected areas, urban areas, ownership and access are still pending.'

/** Explanation of the pending criterion: the snapshot's or, with official sector context, the team's. */
export function criterionExplanation(criterionId: string, explanation: string, hasGeology: boolean): string {
  return hasGeology && criterionId === GEOLOGY_CRITERION_ID ? GEOLOGY_PENDING_WITH_CONTEXT : displaySource(explanation)
}

/** Snapshot limitation as is or, with official sector context, its updated version. */
export function limitationText(item: string, hasGeology: boolean): string {
  return hasGeology && item === HISTORICAL_GEOLOGY_LIMITATION ? GEOLOGY_LIMITATION_WITH_CONTEXT : displaySource(item)
}
