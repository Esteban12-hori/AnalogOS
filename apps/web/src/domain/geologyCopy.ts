/**
 * PRESENTATION texts for when the sector has its validated official geological context (team M9:
 * `ScoreBreakdown` and "Where the analogy fails" from `CandidateDetails`, ported to the integrated interface).
 * The snapshot does not change: the score's geology remains uncalibrated, outside similarity, confidence and
 * feasibility. Pure, lightweight module (no Ajv): used by the entry chunk and the deferred ones.
 *
 * Language (ADR-017): every function takes the interface `locale` last (default: the current one). Team texts come
 * from the science catalog; artifact text goes through i18n/science (original in Spanish, English rendering in English).
 */

import { geologyText, type GeologyAvailabilityKey, type GeologyText } from '../../../../shared/geology/text'
import { getLocale, type Locale } from '../i18n/core'
import { tScience } from '../i18n/messages/science'
import { scienceText } from '../i18n/science'

export const GEOLOGY_CRITERION_ID = 'geologic_relevance'

/** Team text for the pending geological criterion when official context is available (English). */
export const GEOLOGY_PENDING_WITH_CONTEXT = tScience.in('en')('copy.pendingWithContext')

/** Historical v3 snapshot limitation (exact source wording, matched against the artifact) that the official context partly addresses. */
export const HISTORICAL_GEOLOGY_LIMITATION =
  'Geología, áreas protegidas, urbano, propiedad y acceso permanecen pendientes de evidencia oficial integrada en ambos países.'

/**
 * Team replacement (English), with the location in the integrated interface: the geological panel lives in the
 * "Geology" tab of the detail sheet (in `CandidateDetails` it was "above" the list).
 */
export const GEOLOGY_LIMITATION_WITH_CONTEXT = tScience.in('en')('copy.limitationWithContext')

/** Explanation of the pending criterion: the snapshot's or, with official sector context, the team's. */
export function criterionExplanation(criterionId: string, explanation: string, hasGeology: boolean, locale: Locale = getLocale()): string {
  return hasGeology && criterionId === GEOLOGY_CRITERION_ID ? tScience.in(locale)('copy.pendingWithContext') : scienceText(explanation, locale)
}

/** Snapshot limitation as is or, with official sector context, its updated version. */
export function limitationText(item: string, hasGeology: boolean, locale: Locale = getLocale()): string {
  return hasGeology && item === HISTORICAL_GEOLOGY_LIMITATION ? tScience.in(locale)('copy.limitationWithContext') : scienceText(item, locale)
}

/**
 * Geology pack used only to FORMAT interface text (coverage %, scale label, availability label) in a language: the
 * English pack in `en`, the frozen Spanish wording in `es` — the same packs as `displayGeologyPack` of
 * i18n/recordText, without loading the record-text maps into the geology chunk. Records are never built with it.
 */
export function geologyDisplayText(locale: Locale = getLocale()): GeologyText {
  return geologyText(locale === 'es' ? 1 : 2)
}

/** Availability hint of the geology card in a language (English = AVAILABILITY_HINT of shared/geology/context.ts). */
export function availabilityHint(availability: GeologyAvailabilityKey, locale: Locale = getLocale()): string {
  return tScience.in(locale)(`availability.${availability}.hint`)
}

const REASON_KEYS = ['reason.fixture', 'reason.notInPackage', 'reason.notFound', 'reason.tooLarge', 'reason.timeout', 'reason.unverified', 'reason.moduleFailed'] as const

/**
 * Why the geology is not available, in a language. The state keeps the canonical English reason (written by
 * selectGeologySite, the package loader or App); a known reason is shown from the catalog, any other text (a technical
 * validation detail) is shown as it is.
 */
export function geologyReasonText(reason: string, locale: Locale = getLocale()): string {
  const key = REASON_KEYS.find((candidate) => tScience.in('en')(candidate) === reason)
  return key ? tScience.in(locale)(key) : reason
}
