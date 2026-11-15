// Pure state of the M8 planner. The UI uses it as is with useReducer: this is where the rules of
// invalidation (editing something clears results and cancels pending AI) and the protection against
// late responses (only the response for the current requestId whose context has not changed is accepted) live.
import { MAX_BRIEF_CHARS, METRICS, SUPPORTED_PROFILE_ID, UNMEASURED_TOPICS, detectUnmeasuredMentions } from './catalog'
import { checkGeologySelection, type GeologyAiRecord, type GeologyCatalog } from '../../../../shared/geology/guidance'
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
  explain: {
    status: AiCallStatus; requestId: string | null; requestFp: string | null; evaluationFp: string | null; message: string | null; record: AiExplanationRecord | null
    /** Opt-in geological channel (M10): its own record and catalog, from the same call as `record`. The M8 record does not change. */
    geologyRecord: GeologyAiRecord | null
    geologyCatalog: GeologyCatalog | null
    pendingCatalog: GeologyCatalog | null
    /** The last attempt failed only because of the geological channel: the UI offers to retry without geology (explicit). */
    geologyFailed: boolean
  }
  counter: number
  draftCalls: number
}

const IDLE_DRAFT: PlannerState['draft'] = { status: 'idle', requestId: null, briefFp: null, message: null, warnings: [], record: null }
const IDLE_EXPLAIN: PlannerState['explain'] = {
  status: 'idle', requestId: null, requestFp: null, evaluationFp: null, message: null, record: null,
  geologyRecord: null, geologyCatalog: null, pendingCatalog: null, geologyFailed: false,
}

export const emptyScope = (siteId = ''): ScopeInput => ({ mode: 'catalog', siteId, lon: '', lat: '', west: '', south: '', east: '', north: '', windowSiteId: null })

export function initialPlannerState(): PlannerState {
  return {
    journey: null, brief: '', activity: '', target: { kind: 'rover', stated: '' }, requirements: [], openQuestions: [],
    scope: emptyScope(), confirmed: false, result: null, draft: IDLE_DRAFT, explain: IDLE_EXPLAIN, counter: 0, draftCalls: 0,
  }
}

// ---------- text input parsing ----------

/** Strict number (accepts decimal comma; no exponents, no NaN/Infinity). */
export function parseNumber(text: string): number | null {
  const t = text.trim()
  if (!/^-?\d+(?:[.,]\d+)?$/.test(t)) return null
  const n = Number.parseFloat(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function toRequirement(e: EditableRequirement, confirmed: boolean): { ok: true; requirement: Requirement } | { ok: false; issue: string } {
  const base = { requirement_id: e.requirement_id, label: e.label.trim(), importance: e.importance, origin: e.origin, confirmed, source_quote: e.source_quote }
  const tag = `“${e.label.trim() || e.requirement_id}”`
  if (!base.label) return { ok: false, issue: `A requirement has no name.` }
  if (e.kind === 'unmeasured') return { ok: true, requirement: { ...base, kind: 'unmeasured', topic_id: e.topic_id, detail: e.detail.trim() } }
  let value: MeasurableRequirement['value']
  if (e.operator === 'in') {
    if (!e.countries.length) return { ok: false, issue: `${tag}: choose at least one country.` }
    value = [...e.countries]
  } else if (e.operator === 'between') {
    const lo = parseNumber(e.valueText[0])
    const hi = parseNumber(e.valueText[1])
    if (lo === null || hi === null) return { ok: false, issue: `${tag}: enter the minimum and maximum as numbers.` }
    value = [lo, hi]
  } else {
    const n = parseNumber(e.valueText[0])
    if (n === null) return { ok: false, issue: `${tag}: enter the value as a number.` }
    value = n
  }
  return { ok: true, requirement: { ...base, kind: 'measurable', metric_id: e.metric_id, operator: e.operator, value, unit: e.unit, scale: e.scale } }
}

/** Summary line of a requirement being edited, with the effective condition (same wording as the result). */
export function describeEditable(e: EditableRequirement, withImportance = true): string {
  const parsed = toRequirement(e, false)
  if (parsed.ok) return withImportance ? describeRequirementLine(parsed.requirement) : `${parsed.requirement.label}: ${parsed.requirement.kind === 'unmeasured' ? `not measured${parsed.requirement.detail ? ` — ${parsed.requirement.detail}` : ''}` : `${describeCondition(parsed.requirement)} · ${SCALE_LABEL[parsed.requirement.scale]}`}`
  const typed = e.kind === 'measurable' ? (e.operator === 'in' ? e.countries.join(', ') : e.valueText.filter(Boolean).join(' – ')) : ''
  return `${e.label || 'Requirement'}: incomplete${typed ? ` (typed: ${typed})` : ''} (${IMPORTANCE_LABEL[e.importance]})`
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
  if (s.mode === 'sector') return s.siteId ? { scope: { mode: 'sector', site_id: s.siteId }, issues: [] } : { scope: null, issues: ['Choose a sector.'] }
  if (s.mode === 'point') {
    const lon = parseNumber(s.lon)
    const lat = parseNumber(s.lat)
    const issues: string[] = []
    if (lon === null) issues.push('Longitude: enter a number (e.g. -69.7).')
    if (lat === null) issues.push('Latitude: enter a number (e.g. -25.0).')
    return lon === null || lat === null ? { scope: null, issues } : { scope: { mode: 'point', lon, lat, window_site_id: s.windowSiteId }, issues: [] }
  }
  const parts: Array<[string, string]> = [['West', s.west], ['South', s.south], ['East', s.east], ['North', s.north]]
  const nums = parts.map(([, t]) => parseNumber(t))
  const issues = parts.flatMap(([name], i) => (nums[i] === null ? [`${name}: enter a number.`] : []))
  return issues.length ? { scope: null, issues } : { scope: { mode: 'bbox', bbox: nums as [number, number, number, number], window_site_id: s.windowSiteId }, issues: [] }
}

/** Unmeasured topics that the brief mentions and no requirement covers yet. */
export function uncoveredMentions(state: Pick<PlannerState, 'brief' | 'requirements'>): Array<{ topic_id: string; label: string; matched_text: string }> {
  const covered = new Set(state.requirements.filter((r): r is EditableUnmeasured => r.kind === 'unmeasured').map((r) => r.topic_id))
  if (state.requirements.some((r) => r.kind === 'measurable' && r.metric_id === 'median_slope_degree' && r.scale === 'point')) covered.add('max_point_slope')
  return detectUnmeasuredMentions(state.brief).filter((m) => !covered.has(m.topic_id))
}

/** Saved open questions plus the unmeasured topics that the brief mentions and no requirement covers. */
export function pendingQuestions(state: Pick<PlannerState, 'brief' | 'requirements' | 'openQuestions'>): string[] {
  const detected = uncoveredMentions(state).map((m) => `The brief mentions “${m.matched_text}”: “${m.label}” is not measured in the snapshot; add it as a pending requirement if it matters.`)
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
  if (state.brief.length > MAX_BRIEF_CHARS) issues.push(`The brief exceeds ${MAX_BRIEF_CHARS} characters.`)
  if (state.target.kind === 'other' && !state.target.stated.trim()) issues.push('Describe the unsupported objective so it is kept in the report.')
  if (issues.length || !scope.scope) return { request: null, issues }
  const request: MissionRequest = {
    schema_version: '1.0.0',
    brief: state.brief,
    activity: state.activity.trim(),
    target: state.target.kind === 'rover'
      ? { profile_id: SUPPORTED_PROFILE_ID, stated: state.target.stated.trim() || 'Mars rover (Jezero reference)' }
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
  | { type: 'explain_start'; requestId: string; geologyCatalog?: GeologyCatalog }
  | { type: 'explain_ok'; requestId: string; requestFp: string; evaluationFp: string; selection: AiExplanationRecord['selection']; provenance: AiProvenance; geology?: { contextFp: string; catalogFp: string; selection: { ref_ids: string[] } } }
  | { type: 'explain_fail'; requestId: string; message: string; unavailable: boolean; geologyFailure?: boolean }
  | { type: 'geology_context_changed' }
  | { type: 'reset' }

/** Any input change: clears confirmation and result, and cancels pending AI (late responses are ignored). */
function invalidate(s: PlannerState): PlannerState {
  return {
    ...s,
    confirmed: false,
    result: null,
    explain: IDLE_EXPLAIN,
    draft: s.draft.status === 'pending' ? { ...s.draft, status: 'idle', requestId: null, briefFp: null, message: 'AI request canceled because the content changed.' } : s.draft,
  }
}

export function newRequirementId(s: PlannerState): { id: string; counter: number } {
  return { id: `u${s.counter + 1}`, counter: s.counter + 1 }
}

export function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
  switch (action.type) {
    case 'set_journey': {
      if (state.journey === action.journey && !action.siteId) return state // clicking the already active route does not clear anything
      let scope = state.scope
      if (action.siteId) scope = { ...emptyScope(action.siteId), mode: 'sector' }
      else if (action.journey === 'sector' && scope.mode === 'catalog') scope = { ...scope, mode: 'sector' }
      else if (action.journey === 'test' && scope.mode === 'sector') scope = { ...scope, mode: 'catalog' }
      return { ...invalidate(state), journey: action.journey, scope }
    }
    case 'set_brief': {
      if (action.brief === state.brief) return state
      const base = invalidate(state)
      // Editing the brief breaks the link with the AI draft: what follows is no longer an intact proposal.
      return {
        ...base,
        brief: action.brief,
        draft: { ...IDLE_DRAFT, message: state.draft.record ? 'The text changed: the requirements the AI proposed are now shown as edited by you.' : base.draft.message },
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
      // Only the evaluation of the current confirmed request is accepted.
      const built = buildRequest(state)
      if (!state.confirmed || !built.request || fingerprint(built.request) !== action.evaluation.request_fingerprint) return state
      return { ...state, result: action.evaluation, explain: IDLE_EXPLAIN }
    }
    case 'draft_start':
      // The previous draft (if any) remains in use until a new one arrives: its provenance is preserved.
      return { ...state, draft: { ...state.draft, status: 'pending', requestId: action.requestId, briefFp: fingerprint(state.brief), message: null } }
    case 'draft_fail': {
      if (state.draft.status !== 'pending' || state.draft.requestId !== action.requestId) return state
      return { ...state, draft: { ...state.draft, status: action.unavailable ? 'unavailable' : 'error', requestId: null, briefFp: null, message: action.message } }
    }
    case 'draft_ok': {
      const d = state.draft
      if (d.status !== 'pending' || d.requestId !== action.requestId || d.briefFp !== fingerprint(state.brief)) return state // late or stale
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
          ...IDLE_DRAFT, status: 'done', warnings: otherTarget ? [...proposal.warnings, 'The AI understood that the objective is not a Mars rover; check the target before confirming.'] : proposal.warnings,
          record: { provenance: action.provenance, brief_fingerprint: d.briefFp ?? '', proposal },
        },
      }
    }
    case 'explain_start': {
      if (!state.result) return state
      return { ...state, explain: { ...state.explain, status: 'pending', message: null, geologyFailed: false, pendingCatalog: action.geologyCatalog ?? null, requestId: action.requestId, requestFp: state.result.request_fingerprint, evaluationFp: evaluationFingerprint(state.result) } }
    }
    case 'explain_fail': {
      if (state.explain.status !== 'pending' || state.explain.requestId !== action.requestId) return state
      return { ...state, explain: { ...state.explain, status: action.unavailable && !action.geologyFailure ? 'unavailable' : 'error', requestId: null, pendingCatalog: null, geologyFailed: !!action.geologyFailure, message: action.message } }
    }
    case 'explain_ok': {
      const e = state.explain
      if (e.status !== 'pending' || e.requestId !== action.requestId || !state.result) return state // another request or already canceled: ignored
      // It is the response to the current request: if it does not match the calculation, it ends in error (it never stays "pending").
      const discard = (): PlannerState => ({ ...state, explain: { ...state.explain, status: 'error', requestId: null, pendingCatalog: null, message: 'The AI response does not belong to the current calculation and was discarded.' } })
      if (action.requestFp !== e.requestFp || action.evaluationFp !== e.evaluationFp) return discard()
      if (state.result.request_fingerprint !== e.requestFp || evaluationFingerprint(state.result) !== e.evaluationFp) return discard()
      const checked = checkSelection(action.selection, state.result)
      if (!checked.ok) return discard()
      // Geological channel: the response must correspond EXACTLY to the catalog (context, request, evaluation and references) sent.
      let geologyRecord: GeologyAiRecord | null = null
      const catalog = e.pendingCatalog
      if (catalog) {
        const g = action.geology
        if (!g || g.contextFp !== catalog.context_fingerprint || g.catalogFp !== catalog.catalog_fingerprint
          || catalog.request_fingerprint !== e.requestFp || catalog.evaluation_fingerprint !== e.evaluationFp) return discard()
        const picked = checkGeologySelection(g.selection, catalog)
        if (!picked.ok) return discard()
        geologyRecord = {
          context_fingerprint: catalog.context_fingerprint, catalog_fingerprint: catalog.catalog_fingerprint,
          request_fingerprint: catalog.request_fingerprint, evaluation_fingerprint: catalog.evaluation_fingerprint, selection: picked.selection,
        }
      } else if (action.geology) return discard()
      return {
        ...state,
        explain: {
          ...IDLE_EXPLAIN, status: 'done', geologyRecord, geologyCatalog: geologyRecord ? catalog : null,
          record: { provenance: action.provenance, selection: checked.selection, request_fingerprint: e.requestFp!, evaluation_fingerprint: e.evaluationFp! },
        },
      }
    }
    case 'geology_context_changed':
      // The loaded geological context is no longer that of the selection: it is discarded (and the pending request is cancelled by requestId).
      return state.explain.geologyCatalog || state.explain.pendingCatalog ? { ...state, explain: IDLE_EXPLAIN } : state
    case 'reset':
      return initialPlannerState()
  }
}

export function topicLabel(id: string): string {
  return UNMEASURED_TOPICS.find((t) => t.id === id)?.label ?? 'Other unmeasured request'
}

export function defaultMetricRequirement(metric: MetricId, id: string): EditableMeasurable {
  const spec = METRICS[metric]
  return {
    kind: 'measurable', requirement_id: id, label: spec.label, importance: 'critical', origin: 'user', source_quote: null,
    metric_id: metric, operator: metric === 'country' ? 'in' : '<=', valueText: ['', ''], countries: metric === 'country' ? ['CL'] : [],
    unit: spec.canonical_unit, scale: 'window',
  }
}

/** EDITABLE example with sample values; it is not a recommendation. */
export const EXAMPLE_BRIEF =
  'Test autonomous navigation of a wheeled rover on arid, flat terrain. Must-have: regional median slope no greater than 3 degrees. ' +
  'Preferred: at least 95% non-vegetated surface. Traction and permission from the landowner also matter, but this system does not measure them.'

export function exampleState(): { brief: string; activity: string; requirements: Requirement[] } {
  const common = { importance: 'critical' as const, origin: 'user' as const, confirmed: false }
  return {
    brief: EXAMPLE_BRIEF,
    activity: 'Rover autonomous navigation test',
    requirements: [
      { ...common, requirement_id: 'ex1', label: 'Regional median slope', source_quote: 'regional median slope no greater than 3 degrees', kind: 'measurable', metric_id: 'median_slope_degree', operator: '<=', value: 3, unit: 'degree', scale: 'window' },
      { ...common, importance: 'preference', requirement_id: 'ex2', label: 'Non-vegetated fraction', source_quote: 'at least 95% non-vegetated surface', kind: 'measurable', metric_id: 'nonvegetated_fraction', operator: '>=', value: 95, unit: 'percent', scale: 'window' },
      { ...common, importance: 'preference', requirement_id: 'ex3', label: 'Traction', source_quote: 'Traction', kind: 'unmeasured', topic_id: 'traction', detail: 'Not measured by this system.' },
    ],
  }
}
