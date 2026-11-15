// Explicit text versioning for deterministic mission records (ENGLISH-DEFAULT, Phase A).
// - 1.0.0: frozen Spanish pack. Only used to audit/rebuild historical records; never chosen implicitly.
// - 1.1.0: English pack. Default for new evaluations and exports.
// The version travels inside the record (evaluation_version / export_version), so request fingerprints do not
// change. An unknown version is an error everywhere: it is never reinterpreted as another one.
import type { EvaluationVersion } from '../types'
import { EN_TEXT } from './en'
import { ES_TEXT } from './es'
import type { MissionText } from './types'

export type { MissionText, ScopeNotes } from './types'

export const LEGACY_EVALUATION_VERSION = '1.0.0' as const
export const DEFAULT_EVALUATION_VERSION = '1.1.0' as const
export const EVALUATION_VERSIONS: readonly EvaluationVersion[] = [LEGACY_EVALUATION_VERSION, DEFAULT_EVALUATION_VERSION]

const PACKS: Record<EvaluationVersion, MissionText> = { '1.0.0': ES_TEXT, '1.1.0': EN_TEXT }

export class UnsupportedVersionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsupportedVersionError'
  }
}

export function isEvaluationVersion(value: unknown): value is EvaluationVersion {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PACKS, value)
}

/** Text pack of a record version. Throws UnsupportedVersionError for anything that is not a known version. */
export function missionText(version: unknown): MissionText {
  if (!isEvaluationVersion(version)) throw new UnsupportedVersionError(`Unsupported mission record version: ${String(version).slice(0, 40)}.`)
  return PACKS[version]
}

/** Label of an unmeasured topic in a pack (own keys only), or the pack's fallback. */
export function topicLabelOf(text: MissionText, topicId: string): string {
  return Object.prototype.hasOwnProperty.call(text.topicLabel, topicId) ? text.topicLabel[topicId] : text.unknownTopic
}

/**
 * Language disclosure carried by every 1.1.0 mission export (absent from 1.0.0). Constant: the audit requires
 * this exact block, so it cannot be edited to hide that copied source evidence keeps its original language.
 */
export const EXPORT_LANGUAGE_1_1 = {
  authored_text: 'en',
  source_evidence_note:
    'Authored text (rules, status definitions, reasons, scale notes, limits and notes) is English. Values copied verbatim from the '
    + 'snapshot artifacts (site and profile names, field_checks, limitations, evidence claims, criterion explanations and dataset product '
    + 'names) and user-entered text (brief, activity, requirement labels and details, source quotes and open questions) keep their original '
    + 'wording; snapshot evidence is mostly Spanish and is not translated. Identifiers and enum values (for example cumple, no_evaluable, '
    + 'priorizado_para_reconocimiento or no_adquirido_en_M8) are stable codes, not prose.',
} as const
