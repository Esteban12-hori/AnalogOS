// Estado puro del planificador M8. La UI lo usa tal cual con useReducer: aquí viven las reglas de
// invalidación (editar algo borra resultados y cancela IA pendiente) y la protección contra
// respuestas tardías (solo se acepta la respuesta del requestId vigente cuyo contexto no cambió).
import { MAX_BRIEF_CHARS, METRICS, SUPPORTED_PROFILE_ID, UNMEASURED_TOPICS, detectUnmeasuredMentions } from './catalog'
import { checkSelection } from './explanation'
import type { AiDraftRecord, AiExplanationRecord, AiProvenance, DraftProposal } from './exportReport'
import { fingerprint } from './fingerprint'
import { evaluationFingerprint } from './evaluate'
import { IMPORTANCE_LABEL, describeCondition, SCALE_LABEL, describeRequirementLine } from './format'
import type { MeasurableRequirement, MetricId, MissionEvaluation, MissionRequest, MissionScope, Requirement } from './types'
import { validateMissionRequest } from './validate'

export type JourneyId = 'test' | 'sector'
export type ScopeMode = 'catalog' | 'sector' | 'point' | 'bbox'

export interface ScopeInput {
  mode: ScopeMode
  siteId: string
  lon: string
  lat: string
  west: string
  south: string
  east: string
  north: string
  windowSiteId: string | null
}

interface EditableBase {
  requirement_id: string
  label: string
  importance: 'critical' | 'preference'
  origin: 'user' | 'ai'
  source_quote: string | null
}
export interface EditableMeasurable extends EditableBase {
  kind: 'measurable'
  metric_id: MetricId
  operator: MeasurableRequirement['operator']
  valueText: [string, string]
  countries: string[]
  unit: string
  scale: 'window' | 'point'
}
export interface EditableUnmeasured extends EditableBase {
  kind: 'unmeasured'
  topic_id: string
  detail: string
}
export type EditableRequirement = EditableMeasurable | EditableUnmeasured

export type AiCallStatus = 'idle' | 'pending' | 'done' | 'error' | 'unavailable'

export interface PlannerState {
  journey: JourneyId | null
  brief: string
  activity: string
  target: { kind: 'rover' | 'other'; stated: string }
  requirements: EditableRequirement[]
  openQuestions: string[]
  scope: ScopeInput
  confirmed: boolean
  result: MissionEvaluation | null
  draft: { status: AiCallStatus; requestId: string | null; briefFp: string | null; message: string | null; warnings: string[]; record: AiDraftRecord | null }
  explain: { status: AiCallStatus; requestId: string | null; requestFp: string | null; evaluationFp: string | null; message: string | null; record: AiExplanationRecord | null }
  counter: number
  draftCalls: number
}

const IDLE_DRAFT: PlannerState['draft'] = { status: 'idle', requestId: null, briefFp: null, message: null, warnings: [], record: null }
const IDLE_EXPLAIN: PlannerState['explain'] = { status: 'idle', requestId: null, requestFp: null, evaluationFp: null, message: null, record: null }

export const emptyScope = (siteId = ''): ScopeInput => ({ mode: 'catalog', siteId, lon: '', lat: '', west: '', south: '', east: '', north: '', windowSiteId: null })

export function initialPlannerState(): PlannerState {
  return {
    journey: null, brief: '', activity: '', target: { kind: 'rover', stated: '' }, requirements: [], openQuestions: [],
    scope: emptyScope(), confirmed: false, result: null, draft: IDLE_DRAFT, explain: IDLE_EXPLAIN, counter: 0, draftCalls: 0,
  }
}

// ---------- análisis de entradas de texto ----------

/** Número estricto (admite coma decimal; sin exponentes, sin NaN/Infinity). */
export function parseNumber(text: string): number | null {
  const t = text.trim()
  if (!/^-?\d+(?:[.,]\d+)?$/.test(t)) return null
  const n = Number.parseFloat(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function toRequirement(e: EditableRequirement, confirmed: boolean): { ok: true; requirement: Requirement } | { ok: false; issue: string } {
  const base = { requirement_id: e.requirement_id, label: e.label.trim(), importance: e.importance, origin: e.origin, confirmed, source_quote: e.source_quote }
  const tag = `«${e.label.trim() || e.requirement_id}»`
  if (!base.label) return { ok: false, issue: `Un requisito no tiene nombre.` }
  if (e.kind === 'unmeasured') return { ok: true, requirement: { ...base, kind: 'unmeasured', topic_id: e.topic_id, detail: e.detail.trim() } }
  let value: MeasurableRequirement['value']
  if (e.operator === 'in') {
    if (!e.countries.length) return { ok: false, issue: `${tag}: elija al menos un país.` }
    value = [...e.countries]
  } else if (e.operator === 'between') {
    const lo = parseNumber(e.valueText[0])
    const hi = parseNumber(e.valueText[1])
    if (lo === null || hi === null) return { ok: false, issue: `${tag}: escriba mínimo y máximo como números.` }
    value = [lo, hi]
  } else {
    const n = parseNumber(e.valueText[0])
    if (n === null) return { ok: false, issue: `${tag}: escriba el valor como número.` }
    value = n
  }
  return { ok: true, requirement: { ...base, kind: 'measurable', metric_id: e.metric_id, operator: e.operator, value, unit: e.unit, scale: e.scale } }
}

/** Línea de resumen de un requisito en edición, con la condición efectiva (misma redacción que el resultado). */
export function describeEditable(e: EditableRequirement, withImportance = true): string {
  const parsed = toRequirement(e, false)
  if (parsed.ok) return withImportance ? describeRequirementLine(parsed.requirement) : `${parsed.requirement.label}: ${parsed.requirement.kind === 'unmeasured' ? `sin medición${parsed.requirement.detail ? ` — ${parsed.requirement.detail}` : ''}` : `${describeCondition(parsed.requirement)} · ${SCALE_LABEL[parsed.requirement.scale]}`}`
  const typed = e.kind === 'measurable' ? (e.operator === 'in' ? e.countries.join(', ') : e.valueText.filter(Boolean).join(' – ')) : ''
  return `${e.label || 'Requisito'}: incompleto${typed ? ` (escrito: ${typed})` : ''} (${IMPORTANCE_LABEL[e.importance]})`
}

export function toEditable(r: Requirement): EditableRequirement {
  const base = { requirement_id: r.requirement_id, label: r.label, importance: r.importance, origin: r.origin, source_quote: r.source_quote }
  if (r.kind === 'unmeasured') return { ...base, kind: 'unmeasured', topic_id: r.topic_id, detail: r.detail }
  const v = r.value
  return {
    ...base, kind: 'measurable', metric_id: r.metric_id, operator: r.operator, unit: r.unit, scale: r.scale,
    valueText: r.operator === 'between' ? [String((v as number[])[0]), String((v as number[])[1])] : r.operator === 'in' ? ['', ''] : [String(v), ''],
    countries: r.operator === 'in' ? [...(v as string[])] : [],
  }
}

export interface BuiltScope { scope: MissionScope | null; issues: string[] }

export function buildScope(s: ScopeInput): BuiltScope {
  if (s.mode === 'catalog') return { scope: { mode: 'catalog' }, issues: [] }
  if (s.mode === 'sector') return s.siteId ? { scope: { mode: 'sector', site_id: s.siteId }, issues: [] } : { scope: null, issues: ['Elija un sector.'] }
  if (s.mode === 'point') {
    const lon = parseNumber(s.lon)
    const lat = parseNumber(s.lat)
    const issues: string[] = []
    if (lon === null) issues.push('Longitud: escriba un número (p. ej. -69,7).')
    if (lat === null) issues.push('Latitud: escriba un número (p. ej. -25,0).')
    return lon === null || lat === null ? { scope: null, issues } : { scope: { mode: 'point', lon, lat, window_site_id: s.windowSiteId }, issues: [] }
  }
  const parts: Array<[string, string]> = [['Oeste', s.west], ['Sur', s.south], ['Este', s.east], ['Norte', s.north]]
  const nums = parts.map(([, t]) => parseNumber(t))
  const issues = parts.flatMap(([name], i) => (nums[i] === null ? [`${name}: escriba un número.`] : []))
  return issues.length ? { scope: null, issues } : { scope: { mode: 'bbox', bbox: nums as [number, number, number, number], window_site_id: s.windowSiteId }, issues: [] }
}

/** Temas no medidos que el brief menciona y ningún requisito cubre todavía. */
export function uncoveredMentions(state: Pick<PlannerState, 'brief' | 'requirements'>): Array<{ topic_id: string; label: string; matched_text: string }> {
  const covered = new Set(state.requirements.filter((r): r is EditableUnmeasured => r.kind === 'unmeasured').map((r) => r.topic_id))
  if (state.requirements.some((r) => r.kind === 'measurable' && r.metric_id === 'median_slope_degree' && r.scale === 'point')) covered.add('max_point_slope')
  return detectUnmeasuredMentions(state.brief).filter((m) => !covered.has(m.topic_id))
}

/** Preguntas abiertas guardadas más los temas no medidos que el brief menciona y ningún requisito cubre. */
export function pendingQuestions(state: Pick<PlannerState, 'brief' | 'requirements' | 'openQuestions'>): string[] {
  const detected = uncoveredMentions(state).map((m) => `El brief menciona «${m.matched_text}»: «${m.label}» no está medido en el snapshot; añádalo como requisito pendiente si importa.`)
  return [...new Set([...state.openQuestions, ...detected])].slice(0, 20)
}

export function buildRequest(state: PlannerState): { request: MissionRequest | null; issues: string[] } {
  const issues: string[] = []
  const requirements: Requirement[] = []
  for (const e of state.requirements) {
    const r = toRequirement(e, state.confirmed)
    if (r.ok) requirements.push(r.requirement)
    else issues.push(r.issue)
  }
  const scope = buildScope(state.scope)
  issues.push(...scope.issues)
  if (state.brief.length > MAX_BRIEF_CHARS) issues.push(`El brief supera ${MAX_BRIEF_CHARS} caracteres.`)
  if (state.target.kind === 'other' && !state.target.stated.trim()) issues.push('Describa el objetivo no soportado para conservarlo en el informe.')
  if (issues.length || !scope.scope) return { request: null, issues }
  const request: MissionRequest = {
    schema_version: '1.0.0',
    brief: state.brief,
    activity: state.activity.trim(),
    target: state.target.kind === 'rover'
      ? { profile_id: SUPPORTED_PROFILE_ID, stated: state.target.stated.trim() || 'Rover marciano (referencia Jezero)' }
      : { profile_id: 'unsupported', stated: state.target.stated.trim() },
    requirements,
    open_questions: pendingQuestions(state).map((q) => q.slice(0, 300)),
    scope: scope.scope,
    confirmed: state.confirmed,
  }
  const checked = validateMissionRequest(request)
  return checked.ok ? { request, issues: [] } : { request: null, issues: checked.issues }
}

// ---------- reductor ----------

export type PlannerAction =
  | { type: 'set_journey'; journey: JourneyId; siteId?: string }
  | { type: 'set_brief'; brief: string }
  | { type: 'set_activity'; activity: string }
  | { type: 'set_target'; target: PlannerState['target'] }
  | { type: 'add_requirement'; requirement: EditableRequirement }
  | { type: 'update_requirement'; id: string; patch: Partial<EditableMeasurable> | Partial<EditableUnmeasured> }
  | { type: 'remove_requirement'; id: string }
  | { type: 'set_scope'; scope: ScopeInput }
  | { type: 'load_example'; example: { brief: string; activity: string; requirements: Requirement[] } }
  | { type: 'confirm' }
  | { type: 'unconfirm' }
  | { type: 'evaluated'; evaluation: MissionEvaluation }
  | { type: 'draft_start'; requestId: string }
  | { type: 'draft_ok'; requestId: string; proposal: DraftProposal; provenance: AiProvenance }
  | { type: 'draft_fail'; requestId: string; message: string; unavailable: boolean }
  | { type: 'explain_start'; requestId: string }
  | { type: 'explain_ok'; requestId: string; requestFp: string; evaluationFp: string; selection: AiExplanationRecord['selection']; provenance: AiProvenance }
  | { type: 'explain_fail'; requestId: string; message: string; unavailable: boolean }
  | { type: 'reset' }

/** Cualquier cambio de entrada: borra confirmación y resultado, y cancela IA pendiente (respuestas tardías se ignoran). */
function invalidate(s: PlannerState): PlannerState {
  return {
    ...s,
    confirmed: false,
    result: null,
    explain: IDLE_EXPLAIN,
    draft: s.draft.status === 'pending' ? { ...s.draft, status: 'idle', requestId: null, briefFp: null, message: 'Solicitud de IA cancelada porque el contenido cambió.' } : s.draft,
  }
}

export function newRequirementId(s: PlannerState): { id: string; counter: number } {
  return { id: `u${s.counter + 1}`, counter: s.counter + 1 }
}

export function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
  switch (action.type) {
    case 'set_journey': {
      if (state.journey === action.journey && !action.siteId) return state // pulsar el recorrido ya activo no borra nada
      let scope = state.scope
      if (action.siteId) scope = { ...emptyScope(action.siteId), mode: 'sector' }
      else if (action.journey === 'sector' && scope.mode === 'catalog') scope = { ...scope, mode: 'sector' }
      else if (action.journey === 'test' && scope.mode === 'sector') scope = { ...scope, mode: 'catalog' }
      return { ...invalidate(state), journey: action.journey, scope }
    }
    case 'set_brief': {
      if (action.brief === state.brief) return state
      const base = invalidate(state)
      // Editar el brief rompe el vínculo con el borrador de IA: lo que sigue ya no es una propuesta intacta.
      return {
        ...base,
        brief: action.brief,
        draft: { ...IDLE_DRAFT, message: state.draft.record ? 'El texto cambió: los requisitos que propuso la IA pasan a figurar como editados por usted.' : base.draft.message },
        requirements: state.requirements.map((r) => (r.origin === 'ai' ? { ...r, origin: 'user' as const } : r)),
      }
    }
    case 'set_activity':
      return action.activity === state.activity ? state : { ...invalidate(state), activity: action.activity }
    case 'set_target':
      return { ...invalidate(state), target: action.target }
    case 'add_requirement': {
      const { counter } = newRequirementId(state)
      return { ...invalidate(state), counter, requirements: [...state.requirements, action.requirement] }
    }
    case 'update_requirement':
      return {
        ...invalidate(state),
        requirements: state.requirements.map((r) => (r.requirement_id === action.id ? ({ ...r, ...action.patch, origin: 'user' } as EditableRequirement) : r)),
      }
    case 'remove_requirement':
      return { ...invalidate(state), requirements: state.requirements.filter((r) => r.requirement_id !== action.id) }
    case 'set_scope':
      return { ...invalidate(state), scope: action.scope }
    case 'load_example': {
      const base = invalidate(state)
      return {
        ...base, brief: action.example.brief, activity: action.example.activity, target: { kind: 'rover', stated: '' },
        requirements: action.example.requirements.map(toEditable), openQuestions: [],
        draft: IDLE_DRAFT, counter: state.counter + action.example.requirements.length,
      }
    }
    case 'confirm':
      return buildRequest({ ...state, confirmed: false }).request ? { ...state, confirmed: true, result: null, explain: IDLE_EXPLAIN } : state
    case 'unconfirm':
      return { ...state, confirmed: false, result: null, explain: IDLE_EXPLAIN }
    case 'evaluated': {
      // Solo se acepta la evaluación de la solicitud confirmada vigente.
      const built = buildRequest(state)
      if (!state.confirmed || !built.request || fingerprint(built.request) !== action.evaluation.request_fingerprint) return state
      return { ...state, result: action.evaluation, explain: IDLE_EXPLAIN }
    }
    case 'draft_start':
      // El borrador anterior (si hay) sigue en uso hasta que llegue uno nuevo: se conserva su procedencia.
      return { ...state, draft: { ...state.draft, status: 'pending', requestId: action.requestId, briefFp: fingerprint(state.brief), message: null } }
    case 'draft_fail': {
      if (state.draft.status !== 'pending' || state.draft.requestId !== action.requestId) return state
      return { ...state, draft: { ...state.draft, status: action.unavailable ? 'unavailable' : 'error', requestId: null, briefFp: null, message: action.message } }
    }
    case 'draft_ok': {
      const d = state.draft
      if (d.status !== 'pending' || d.requestId !== action.requestId || d.briefFp !== fingerprint(state.brief)) return state // tardía u obsoleta
      const calls = state.draftCalls + 1
      const proposal: DraftProposal = {
        ...action.proposal,
        requirements: action.proposal.requirements.map((r, i) => ({ ...r, requirement_id: `ai${calls}-${i + 1}` })),
      }
      const kept = state.requirements.filter((r) => r.origin !== 'ai')
      const base = invalidate(state)
      const otherTarget = proposal.target_kind === 'other_or_unclear'
      return {
        ...base,
        draftCalls: calls,
        activity: state.activity || proposal.activity,
        target: otherTarget ? { kind: 'other', stated: state.target.stated || proposal.activity } : state.target,
        requirements: [...kept, ...proposal.requirements.map(toEditable)],
        openQuestions: [...new Set([...state.openQuestions, ...proposal.open_questions])].slice(0, 20),
        draft: {
          ...IDLE_DRAFT, status: 'done', warnings: otherTarget ? [...proposal.warnings, 'La IA entendió que el objetivo no es un rover marciano; revise el destino antes de confirmar.'] : proposal.warnings,
          record: { provenance: action.provenance, brief_fingerprint: d.briefFp ?? '', proposal },
        },
      }
    }
    case 'explain_start': {
      if (!state.result) return state
      return { ...state, explain: { ...state.explain, status: 'pending', message: null, requestId: action.requestId, requestFp: state.result.request_fingerprint, evaluationFp: evaluationFingerprint(state.result) } }
    }
    case 'explain_fail': {
      if (state.explain.status !== 'pending' || state.explain.requestId !== action.requestId) return state
      return { ...state, explain: { ...state.explain, status: action.unavailable ? 'unavailable' : 'error', requestId: null, message: action.message } }
    }
    case 'explain_ok': {
      const e = state.explain
      if (e.status !== 'pending' || e.requestId !== action.requestId || !state.result) return state // otra solicitud o ya cancelada: se ignora
      // Es la respuesta de la solicitud vigente: si no corresponde al cálculo, termina en error (nunca queda «pendiente»).
      const discard = (): PlannerState => ({ ...state, explain: { ...state.explain, status: 'error', requestId: null, message: 'La respuesta de la IA no corresponde al cálculo vigente y se descartó.' } })
      if (action.requestFp !== e.requestFp || action.evaluationFp !== e.evaluationFp) return discard()
      if (state.result.request_fingerprint !== e.requestFp || evaluationFingerprint(state.result) !== e.evaluationFp) return discard()
      const checked = checkSelection(action.selection, state.result)
      if (!checked.ok) return discard()
      return { ...state, explain: { ...IDLE_EXPLAIN, status: 'done', record: { provenance: action.provenance, selection: checked.selection, request_fingerprint: e.requestFp!, evaluation_fingerprint: e.evaluationFp! } } }
    }
    case 'reset':
      return initialPlannerState()
  }
}

export function topicLabel(id: string): string {
  return UNMEASURED_TOPICS.find((t) => t.id === id)?.label ?? 'Otro pedido sin medición'
}

export function defaultMetricRequirement(metric: MetricId, id: string): EditableMeasurable {
  const spec = METRICS[metric]
  return {
    kind: 'measurable', requirement_id: id, label: spec.label, importance: 'critical', origin: 'user', source_quote: null,
    metric_id: metric, operator: metric === 'country' ? 'in' : '<=', valueText: ['', ''], countries: metric === 'country' ? ['CL'] : [],
    unit: spec.canonical_unit, scale: 'window',
  }
}

/** Ejemplo EDITABLE con valores de muestra; no es una recomendación. */
export const EXAMPLE_BRIEF =
  'Probar la navegación autónoma de un rover de ruedas en terreno árido y llano. Imprescindible: pendiente mediana regional no mayor de 3 grados. ' +
  'Preferible: al menos 95 % de superficie no vegetada. También importan la tracción y el permiso del propietario, que este sistema no mide.'

export function exampleState(): { brief: string; activity: string; requirements: Requirement[] } {
  const common = { importance: 'critical' as const, origin: 'user' as const, confirmed: false }
  return {
    brief: EXAMPLE_BRIEF,
    activity: 'Ensayo de navegación autónoma de rover',
    requirements: [
      { ...common, requirement_id: 'ex1', label: 'Mediana de pendiente regional', source_quote: 'pendiente mediana regional no mayor de 3 grados', kind: 'measurable', metric_id: 'median_slope_degree', operator: '<=', value: 3, unit: 'degree', scale: 'window' },
      { ...common, importance: 'preference', requirement_id: 'ex2', label: 'Fracción no vegetada', source_quote: 'al menos 95 % de superficie no vegetada', kind: 'measurable', metric_id: 'nonvegetated_fraction', operator: '>=', value: 95, unit: 'percent', scale: 'window' },
      { ...common, importance: 'preference', requirement_id: 'ex3', label: 'Tracción', source_quote: 'la tracción', kind: 'unmeasured', topic_id: 'traction', detail: 'No medido por este sistema.' },
    ],
  }
}
