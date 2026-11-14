import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020'
import requestSchema from '../../../../contracts/mission-request.schema.json'
import evaluationSchema from '../../../../contracts/mission-evaluation.schema.json'
import exportSchema from '../../../../contracts/mission-export.schema.json'
import aiSchema from '../../../../contracts/mission-ai.schema.json'
import { DRAFT_SCHEMA, EXPLAIN_SCHEMA } from './aiSchemas'
import { MAX_BRIEF_CHARS, METRICS, UNMEASURED_TOPIC_IDS } from './catalog'
import { validateBbox, validatePoint } from './geometry'
import type { MeasurableRequirement, MissionRequest } from './types'

const ajv = new Ajv2020({ allErrors: true, strict: false })
ajv.addSchema(requestSchema)
ajv.addSchema(evaluationSchema)
ajv.addSchema(aiSchema)
const validateRequestSchema = ajv.getSchema(requestSchema.$id) as ValidateFunction
const validateEvaluationSchema = ajv.getSchema(evaluationSchema.$id) as ValidateFunction
const validateExportSchema = ajv.compile(exportSchema)
// Salida del proveedor: primero el esquema que se le envió, después el contrato estricto con límites.
const draftWire = ajv.compile(DRAFT_SCHEMA)
const explainWire = ajv.compile(EXPLAIN_SCHEMA)
const draftStrict = ajv.getSchema(`${aiSchema.$id}#/$defs/draftOutput`) as ValidateFunction
const selectionStrict = ajv.getSchema(`${aiSchema.$id}#/$defs/explanationSelection`) as ValidateFunction

// Caracteres de control (salvo tab/salto de línea) no tienen sentido en un brief ni en una etiqueta.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/

function walkStrings(value: unknown, visit: (s: string) => void): void {
  if (typeof value === 'string') visit(value)
  else if (Array.isArray(value)) value.forEach((v) => walkStrings(v, visit))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => walkStrings(v, visit))
}

function schemaIssues(fn: ValidateFunction): string[] {
  return (fn.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? ''}`.trim())
}

function measurableIssues(r: MeasurableRequirement): string[] {
  const spec = METRICS[r.metric_id]
  const tag = `Requisito ${r.requirement_id}`
  const issues: string[] = []
  if (!spec) return [`${tag}: métrica desconocida.`]
  if (!spec.units.includes(r.unit)) issues.push(`${tag}: unidad «${r.unit}» no válida para ${r.metric_id} (${spec.units.join(', ')}).`)
  if (!spec.operators.includes(r.operator)) issues.push(`${tag}: operador «${r.operator}» no válido para ${r.metric_id}.`)
  const nums: number[] = []
  if (r.operator === 'in') {
    if (!Array.isArray(r.value) || !r.value.every((v) => typeof v === 'string')) issues.push(`${tag}: «in» exige una lista de códigos.`)
  } else if (r.operator === 'between') {
    if (!Array.isArray(r.value) || r.value.length !== 2 || !r.value.every((v) => typeof v === 'number' && Number.isFinite(v))) {
      issues.push(`${tag}: «between» exige [mínimo, máximo] finitos.`)
    } else {
      nums.push(...(r.value as number[]))
      if (nums[0] > nums[1]) issues.push(`${tag}: el mínimo supera al máximo.`)
    }
  } else if (typeof r.value !== 'number' || !Number.isFinite(r.value)) {
    issues.push(`${tag}: el valor debe ser un número finito.`)
  } else {
    nums.push(r.value)
  }
  const cap = spec.max_canonical === undefined ? undefined : r.unit === 'percent' ? spec.max_canonical * 100 : spec.max_canonical
  for (const n of nums) {
    if (n < 0) issues.push(`${tag}: valor negativo.`)
    if (cap !== undefined && n > cap) issues.push(`${tag}: valor ${n} supera el máximo plausible (${cap} ${r.unit}).`)
  }
  return issues
}

export type RequestValidation = { ok: true; request: MissionRequest } | { ok: false; issues: string[] }

/** Esquema + reglas semánticas. `requireConfirmed` exige la confirmación explícita del usuario. */
export function validateMissionRequest(input: unknown, opts: { requireConfirmed?: boolean } = {}): RequestValidation {
  if (!validateRequestSchema(input)) return { ok: false, issues: schemaIssues(validateRequestSchema) }
  const request = input as unknown as MissionRequest
  const issues: string[] = []
  if (request.brief.length > MAX_BRIEF_CHARS) issues.push(`El brief supera ${MAX_BRIEF_CHARS} caracteres.`)
  walkStrings(request, (s) => {
    if (CONTROL.test(s)) issues.push('El texto contiene caracteres de control.')
  })
  const ids = new Set<string>()
  for (const r of request.requirements) {
    if (ids.has(r.requirement_id)) issues.push(`Identificador de requisito repetido: ${r.requirement_id}.`)
    ids.add(r.requirement_id)
    if (r.kind === 'measurable') issues.push(...measurableIssues(r))
    else if (!UNMEASURED_TOPIC_IDS.includes(r.topic_id)) issues.push(`Requisito ${r.requirement_id}: tema no medido desconocido.`)
  }
  const s = request.scope
  if (s.mode === 'point') issues.push(...validatePoint(s.lon, s.lat))
  if (s.mode === 'bbox') issues.push(...validateBbox(s.bbox))
  if (opts.requireConfirmed) {
    if (!request.confirmed) issues.push('La solicitud no está confirmada por el usuario.')
    const pending = request.requirements.filter((r) => !r.confirmed)
    if (pending.length) issues.push(`Requisitos sin confirmar: ${pending.map((r) => r.requirement_id).join(', ')}.`)
  }
  return issues.length ? { ok: false, issues: [...new Set(issues)] } : { ok: true, request }
}

export function validateMissionEvaluation(input: unknown): string[] {
  return validateEvaluationSchema(input) ? [] : schemaIssues(validateEvaluationSchema)
}

export function validateMissionExport(input: unknown): string[] {
  return validateExportSchema(input) ? [] : schemaIssues(validateExportSchema)
}

/** Valida la salida cruda del modelo para el borrador. Devuelve problemas; vacío = válida. Sin normalizar tipos. */
export function validateDraftOutput(input: unknown): string[] {
  if (!draftWire(input)) return schemaIssues(draftWire)
  return draftStrict(input) ? [] : schemaIssues(draftStrict)
}

/** Valida la forma de una selección de explicación (cerrada y acotada). */
export function validateSelectionShape(input: unknown): string[] {
  if (!explainWire(input)) return schemaIssues(explainWire)
  return selectionStrict(input) ? [] : schemaIssues(selectionStrict)
}
