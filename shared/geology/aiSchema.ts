// Esquema de SALIDA con canal geológico (opt-in). Extiende el de M8 sin modificarlo: el campo extra se separa
// antes de validar la selección M8 con su contrato intacto.
import { EXPLAIN_SCHEMA } from '../mission/aiSchemas'

export const EXPLAIN_GEOLOGY_SCHEMA = {
  ...EXPLAIN_SCHEMA,
  required: [...EXPLAIN_SCHEMA.required, 'geology_ref_ids'],
  properties: { ...EXPLAIN_SCHEMA.properties, geology_ref_ids: { type: 'array', items: { type: 'string' } } },
} as const
