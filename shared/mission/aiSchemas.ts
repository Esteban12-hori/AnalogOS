// OUTPUT schemas sent to the provider (a subset of structured outputs: closed objects,
// everything required, no numeric or length limits). The actual limits are in
// contracts/mission-ai.schema.json and are validated with Ajv when the response is received (validate.ts).
import { METRIC_IDS, UNMEASURED_TOPICS } from './catalog'

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
