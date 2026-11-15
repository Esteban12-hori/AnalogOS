import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020'
import requestSchema from '../../contracts/mission-request.schema.json'
import evaluationSchema from '../../contracts/mission-evaluation.schema.json'
import exportSchema from '../../contracts/mission-export.schema.json'
import aiSchema from '../../contracts/mission-ai.schema.json'
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
// Provider output: first the schema that was sent to it, then the strict contract with limits.
const draftWire = ajv.compile(DRAFT_SCHEMA)
const explainWire = ajv.compile(EXPLAIN_SCHEMA)
const draftStrict = ajv.getSchema(`${aiSchema.$id}#/$defs/draftOutput`) as ValidateFunction
const selectionStrict = ajv.getSchema(`${aiSchema.$id}#/$defs/explanationSelection`) as ValidateFunction

// Control characters (except tab/newline) make no sense in a brief or a label.
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
  const tag = `Requirement ${r.requirement_id}`
  const issues: string[] = []
  if (!spec) return [`${tag}: unknown metric.`]
  if (!spec.units.includes(r.unit)) issues.push(`${tag}: unit “${r.unit}” is not valid for ${r.metric_id} (${spec.units.join(', ')}).`)
  if (!spec.operators.includes(r.operator)) issues.push(`${tag}: operator “${r.operator}” is not valid for ${r.metric_id}.`)
  const nums: number[] = []
  if (r.operator === 'in') {
    if (!Array.isArray(r.value) || !r.value.every((v) => typeof v === 'string')) issues.push(`${tag}: “in” requires a list of codes.`)
  } else if (r.operator === 'between') {
    if (!Array.isArray(r.value) || r.value.length !== 2 || !r.value.every((v) => typeof v === 'number' && Number.isFinite(v))) {
      issues.push(`${tag}: “between” requires finite [minimum, maximum].`)
    } else {
      nums.push(...(r.value as number[]))
      if (nums[0] > nums[1]) issues.push(`${tag}: the minimum exceeds the maximum.`)
    }
  } else if (typeof r.value !== 'number' || !Number.isFinite(r.value)) {
    issues.push(`${tag}: the value must be a finite number.`)
  } else {
    nums.push(r.value)
  }
  const cap = spec.max_canonical === undefined ? undefined : r.unit === 'percent' ? spec.max_canonical * 100 : spec.max_canonical
  for (const n of nums) {
    if (n < 0) issues.push(`${tag}: negative value.`)
    if (cap !== undefined && n > cap) issues.push(`${tag}: value ${n} exceeds the plausible maximum (${cap} ${r.unit}).`)
  }
  return issues
}

export type RequestValidation = { ok: true; request: MissionRequest } | { ok: false; issues: string[] }

/** Schema + semantic rules. `requireConfirmed` requires explicit user confirmation. */
export function validateMissionRequest(input: unknown, opts: { requireConfirmed?: boolean } = {}): RequestValidation {
  if (!validateRequestSchema(input)) return { ok: false, issues: schemaIssues(validateRequestSchema) }
  const request = input as unknown as MissionRequest
  const issues: string[] = []
  if (request.brief.length > MAX_BRIEF_CHARS) issues.push(`The brief exceeds ${MAX_BRIEF_CHARS} characters.`)
  walkStrings(request, (s) => {
    if (CONTROL.test(s)) issues.push('The text contains control characters.')
  })
  const ids = new Set<string>()
  for (const r of request.requirements) {
    if (ids.has(r.requirement_id)) issues.push(`Repeated requirement identifier: ${r.requirement_id}.`)
    ids.add(r.requirement_id)
    if (r.kind === 'measurable') issues.push(...measurableIssues(r))
    else if (!UNMEASURED_TOPIC_IDS.includes(r.topic_id)) issues.push(`Requirement ${r.requirement_id}: unknown unmeasured topic.`)
  }
  const s = request.scope
  if (s.mode === 'point') issues.push(...validatePoint(s.lon, s.lat))
  if (s.mode === 'bbox') issues.push(...validateBbox(s.bbox))
  if (opts.requireConfirmed) {
    if (!request.confirmed) issues.push('The request is not confirmed by the user.')
    const pending = request.requirements.filter((r) => !r.confirmed)
    if (pending.length) issues.push(`Unconfirmed requirements: ${pending.map((r) => r.requirement_id).join(', ')}.`)
  }
  return issues.length ? { ok: false, issues: [...new Set(issues)] } : { ok: true, request }
}

export function validateMissionEvaluation(input: unknown): string[] {
  return validateEvaluationSchema(input) ? [] : schemaIssues(validateEvaluationSchema)
}

export function validateMissionExport(input: unknown): string[] {
  return validateExportSchema(input) ? [] : schemaIssues(validateExportSchema)
}

/** Validates the model's raw output for the draft. Returns problems; empty = valid. Does not normalize types. */
export function validateDraftOutput(input: unknown): string[] {
  if (!draftWire(input)) return schemaIssues(draftWire)
  return draftStrict(input) ? [] : schemaIssues(draftStrict)
}

/** Validates the shape of an explanation selection (closed and bounded). */
export function validateSelectionShape(input: unknown): string[] {
  if (!explainWire(input)) return schemaIssues(explainWire)
  return selectionStrict(input) ? [] : schemaIssues(selectionStrict)
}
