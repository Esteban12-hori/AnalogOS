// OUTPUT schema with geological channel (opt-in). Extends the M8 one without modifying it: the extra field is separated
// before validating the M8 selection with its contract intact.
import { EXPLAIN_SCHEMA } from '../mission/aiSchemas'

export const EXPLAIN_GEOLOGY_SCHEMA = {
  ...EXPLAIN_SCHEMA,
  required: [...EXPLAIN_SCHEMA.required, 'geology_ref_ids'],
  properties: { ...EXPLAIN_SCHEMA.properties, geology_ref_ids: { type: 'array', items: { type: 'string' } } },
} as const
