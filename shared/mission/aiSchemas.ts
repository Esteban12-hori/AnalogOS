// OUTPUT schemas sent to the provider (a subset of structured outputs: closed objects,
// everything required, no numeric or length limits). The actual limits are in
// contracts/mission-ai.schema.json and are validated with Ajv when the response is received (validate.ts).
import { METRIC_IDS, UNMEASURED_TOPICS } from './catalog'

/**
 * Language of the text the AI WRITES in a draft (activity, label, detail, open_questions and the server's own
 * questions and warnings). Optional field of the `draft` request only (ADR-017): absent means 'en', so a client that
 * does not send it gets exactly the behavior of the English-default server. Any other value is a bad request.
 * It changes only the wording: output schemas, codes, literal figures, quote checks and validation are identical,
 * and `source_quote` stays a literal fragment of the brief in its own language. `explain` and the geology channel only
 * SELECT ids (they write no text), so they never take a language.
 */
export const AI_LANGUAGES = ['en', 'es'] as const
export type AiLanguage = (typeof AI_LANGUAGES)[number]
export const DEFAULT_AI_LANGUAGE: AiLanguage = 'en'
export const isAiLanguage = (value: unknown): value is AiLanguage => typeof value === 'string' && (AI_LANGUAGES as readonly string[]).includes(value)

/** Validated language of a draft request body: absent = default; anything else that is not 'en' | 'es' = null (reject). */
export function draftLanguageOf(value: unknown): AiLanguage | null {
  if (value === undefined) return DEFAULT_AI_LANGUAGE
  return isAiLanguage(value) ? value : null
}

const topicIds = [...UNMEASURED_TOPICS.map((t) => t.id), 'other_unmeasured']

export const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['activity', 'target_kind', 'requirements', 'open_questions'],
  properties: {
    activity: { type: 'string' },
    target_kind: { type: 'string', enum: ['mars_rover_terrain', 'other_or_unclear'] },
    requirements: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['metric_id', 'label', 'operator', 'numbers', 'countries', 'unit', 'importance', 'scale', 'source_quote', 'detail'],
        properties: {
          metric_id: { type: 'string', enum: [...(METRIC_IDS as string[]), ...topicIds] },
          label: { type: 'string' },
          operator: { type: 'string', enum: ['<=', '>=', 'between', 'in', 'none'] },
          numbers: { type: 'array', items: { type: 'number' } },
          countries: { type: 'array', items: { type: 'string' } },
          unit: { type: 'string', enum: ['degree', 'meter', 'ratio', 'percent', 'km2', 'iso_alpha2', 'none'] },
          importance: { type: 'string', enum: ['critical', 'preference'] },
          scale: { type: 'string', enum: ['window', 'point'] },
          source_quote: { type: 'string' },
          detail: { type: 'string' },
        },
      },
    },
    open_questions: { type: 'array', items: { type: 'string' } },
  },
} as const

export const EXPLAIN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['options', 'verification_ids'],
  properties: {
    options: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['site_id', 'key_requirement_ids', 'evidence_ids'],
        properties: {
          site_id: { type: 'string' },
          key_requirement_ids: { type: 'array', items: { type: 'string' } },
          evidence_ids: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    verification_ids: { type: 'array', items: { type: 'string' } },
  },
} as const
