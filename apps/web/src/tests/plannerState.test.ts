import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertSnapshotContracts, type CandidateSite, type DataManifest, type MissionProfile } from '../domain/contracts'
import {
  buildMissionExport, buildRequest, buildScope, defaultMetricRequirement, evaluateMission, evaluationFingerprint, exampleState,
  fingerprint, initialPlannerState, parseNumber, pendingQuestions, plannerReducer, siteMeasures,
  type DraftProposal, type EvidenceBundle, type PlannerAction, type PlannerState, type AiProvenance,
} from '../mission'
import { requestDraft, requestExplanation } from '../mission/aiClient'

const root = resolve(__dirname, '../../../..')
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(root, p), 'utf8'))
const candidates = read('artifacts/science-v3/candidate-details.json')
const manifest = read('artifacts/science-v3/manifest.json')
const profile = read('artifacts/science-v3/mission-profile.json')
assertSnapshotContracts(candidates, manifest, profile)
const bundle: EvidenceBundle = { candidates, manifest: manifest as DataManifest, profile: profile as MissionProfile }

const prov: AiProvenance = { provider: 'anthropic', model: 'claude-sonnet-5-5', request_id: 'req_t', created_at: '2026-11-14T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' }
const run = (s: PlannerState, ...actions: PlannerAction[]): PlannerState => actions.reduce(plannerReducer, s)
const withExample = (): PlannerState => run(initialPlannerState(), { type: 'set_journey', journey: 'test' }, { type: 'load_example', example: exampleState() })
function evaluated(s: PlannerState): PlannerState {
  const confirmed = run(s, { type: 'confirm' })
  const req = buildRequest(confirmed).request!
  return run(confirmed, { type: 'evaluated', evaluation: evaluateMission(req, bundle) })
}
const proposal = (over: Partial<DraftProposal> = {}): DraftProposal => ({
  activity: 'Actividad IA', target_kind: 'mars_rover_terrain', target_profile_id: 'mars-rover-screening-v3', open_questions: ['¿Escala?'], warnings: [],
  requirements: [{ kind: 'measurable', requirement_id: 'ai-1', label: 'Pendiente', importance: 'critical', origin: 'ai', confirmed: false, source_quote: 'pendiente mediana regional no mayor de 3 grados', metric_id: 'median_slope_degree', operator: '<=', value: 3, unit: 'degree', scale: 'window' }],
  ...over,
})

describe('text inputs without NaN', () => {
  it('parses strict numbers and rejects empty, text and exponents', () => {
    expect(parseNumber('-69,7')).toBe(-69.7)
    expect(parseNumber(' 3 ')).toBe(3)
    for (const bad of ['', ' ', 'abc', '1e3', 'Infinity', 'NaN', '1,2,3', '--1']) expect(parseNumber(bad), bad).toBeNull()
  })
  it('empty or wrong coordinates give readable problems and no request', () => {
    const s = run(initialPlannerState(), { type: 'set_scope', scope: { ...initialPlannerState().scope, mode: 'point', lon: 'x', lat: '' } })
    const built = buildRequest(s)
    expect(built.request).toBeNull()
    expect(built.issues.join(' ')).toMatch(/Longitud/)
    expect(built.issues.join(' ')).toMatch(/Latitud/)
    const bbox = buildScope({ ...s.scope, mode: 'bbox', west: '-70', south: '', east: '-69', north: 'z' })
    expect(bbox.scope).toBeNull()
    expect(bbox.issues).toHaveLength(2)
    // Out of range or out of order: it passes parsing but semantic validation rejects it before evaluation.
    const bad = run(s, { type: 'set_scope', scope: { ...s.scope, mode: 'bbox', west: '-69', south: '-25', east: '-70', north: '-24' } })
    expect(buildRequest(bad).request).toBeNull()
    expect(buildRequest(bad).issues.join(' ')).toMatch(/longitude order/)
  })
  it('a non-numeric requirement value blocks confirmation', () => {
    const base = run(initialPlannerState(), { type: 'add_requirement', requirement: defaultMetricRequirement('median_slope_degree', 'u1') })
    expect(buildRequest(base).issues.join(' ')).toMatch(/value as a number/)
    expect(run(base, { type: 'confirm' }).confirmed).toBe(false)
  })
  it('“other objective” requires describing it and is kept as unsupported', () => {
    let s = run(initialPlannerState(), { type: 'set_target', target: { kind: 'other', stated: '' } })
    expect(buildRequest(s).issues.join(' ')).toMatch(/Describe the unsupported objective/)
    s = run(s, { type: 'set_target', target: { kind: 'other', stated: 'Hábitat lunar' } })
    expect(buildRequest(s).request!.target).toEqual({ profile_id: 'unsupported', stated: 'Hábitat lunar' })
    const ev = evaluated(s)
    expect(ev.result?.outcome).toBe('unsupported_target')
  })
})

describe('example → confirm → evaluate and export flow', () => {
  it('does not evaluate without confirming; confirming and evaluating produces a result; editing invalidates it', () => {
    const s = withExample()
    const req = buildRequest(s).request!
    expect(run(s, { type: 'evaluated', evaluation: evaluateMission({ ...req, confirmed: true, requirements: req.requirements.map((r) => ({ ...r, confirmed: true })) }, bundle) }).result).toBeNull()
    const ev = evaluated(s)
    expect(ev.confirmed).toBe(true)
    expect(ev.result?.outcome).toBe('evaluated')
    expect(ev.result?.pending_requirements).toHaveLength(1)
    expect(ev.result!.options.length).toBe(7)
    const edited = run(ev, { type: 'set_brief', brief: ev.brief + ' ' })
    expect(edited.confirmed).toBe(false)
    expect(edited.result).toBeNull()
    for (const a of [
      { type: 'set_activity', activity: 'otra' }, { type: 'set_target', target: { kind: 'other', stated: 'x' } },
      { type: 'remove_requirement', id: 'ex1' }, { type: 'update_requirement', id: 'ex1', patch: { label: 'Cambiado' } },
      { type: 'set_scope', scope: { ...ev.scope, mode: 'sector', siteId: 'cl-win-s2500-w06970' } }, { type: 'set_journey', journey: 'sector' },
    ] as PlannerAction[]) {
      const after = run(ev, a)
      expect(after.result, a.type).toBeNull()
      expect(after.confirmed, a.type).toBe(false)
    }
  })
  it('the example exports validated JSON; without requirements and without a brief there is no automatic recommendation', () => {
    const ev = evaluated(withExample())
    const doc = buildMissionExport(buildRequest(ev).request!, ev.result!, bundle) as { evaluation: { outcome: string } }
    expect(doc.evaluation.outcome).toBe('evaluated')
    const blank = initialPlannerState()
    expect(blank.result).toBeNull()
    expect(run(blank, { type: 'evaluated', evaluation: ev.result! }).result).toBeNull()
  })
  it('loading the example keeps the chosen sector and pressing the active path does not clear the result', () => {
    let s = run(initialPlannerState(), { type: 'set_journey', journey: 'sector', siteId: 'cl-win-s2500-w06970' })
    s = run(s, { type: 'load_example', example: exampleState() })
    expect(s.scope).toMatchObject({ mode: 'sector', siteId: 'cl-win-s2500-w06970' })
    const ev = evaluated(s)
    expect(ev.result).not.toBeNull()
    expect(run(ev, { type: 'set_journey', journey: 'sector' })).toBe(ev)
    expect(run(ev, { type: 'set_journey', journey: 'sector', siteId: 'ar-win-s2620-w06750' }).result).toBeNull()
  })
  it('pending items detected in the brief are kept in the request even if they are not requirements', () => {
    let s = run(initialPlannerState(), { type: 'set_brief', brief: 'Necesito buena tracción y cobertura móvil.' })
    expect(pendingQuestions(s).join(' ')).toMatch(/Traction/)
    s = run(s, { type: 'confirm' })
    expect(buildRequest(s).request!.open_questions.join(' ')).toMatch(/Mobile coverage/)
    expect(buildRequest(s).request!.requirements).toEqual([])
  })
  it('measures without requirements: each sector shows its snapshot measurements', () => {
    const m = siteMeasures(candidates[0])
    expect(m.map((x) => x.metric_id)).toHaveLength(6)
    expect(m.find((x) => x.metric_id === 'median_slope_degree')?.value).toBe(2.169)
    expect(m.find((x) => x.metric_id === 'country')?.value).toBe('CL')
  })
})

describe('AI draft: late responses and attribution', () => {
  const started = (s = run(withExample(), { type: 'set_brief', brief: 'Pendiente mediana regional no mayor de 3 grados.' })) => run(s, { type: 'draft_start', requestId: 'req-A' })

  it('accepts the current response, renumbers ids and records the original draft', () => {
    const s = run(started(), { type: 'draft_ok', requestId: 'req-A', proposal: proposal(), provenance: prov })
    expect(s.draft.status).toBe('done')
    const ai = s.requirements.filter((r) => r.origin === 'ai')
    expect(ai.map((r) => r.requirement_id)).toEqual(['ai1-1'])
    expect(s.draft.record!.proposal.requirements[0].requirement_id).toBe('ai1-1')
    expect(s.draft.record!.brief_fingerprint).toBe(fingerprint(s.brief))
    expect(s.confirmed).toBe(false)
  })
  it('a late response after editing the brief is ignored and the request is canceled', () => {
    const s = run(started(), { type: 'set_brief', brief: 'Otro texto distinto.' })
    expect(s.draft.requestId).toBeNull()
    const after = run(s, { type: 'draft_ok', requestId: 'req-A', proposal: proposal(), provenance: prov })
    expect(after).toBe(s)
    expect(after.requirements.every((r) => r.origin !== 'ai')).toBe(true)
  })
  it('editing a requirement, the sector or the destination also cancels the pending request', () => {
    for (const a of [{ type: 'update_requirement', id: 'ex1', patch: { label: 'x' } }, { type: 'set_scope', scope: { ...initialPlannerState().scope, mode: 'sector', siteId: 'cl-win-s2500-w06970' } }, { type: 'set_target', target: { kind: 'other', stated: 'x' } }] as PlannerAction[]) {
      const s = run(started(), a)
      expect(run(s, { type: 'draft_ok', requestId: 'req-A', proposal: proposal(), provenance: prov })).toBe(s)
    }
  })
  it('a new request replaces the previous one: only the last one counts', () => {
    const s = run(started(), { type: 'draft_start', requestId: 'req-B' })
    expect(run(s, { type: 'draft_ok', requestId: 'req-A', proposal: proposal(), provenance: prov })).toBe(s)
    expect(run(s, { type: 'draft_fail', requestId: 'req-A', message: 'x', unavailable: false })).toBe(s)
    expect(run(s, { type: 'draft_ok', requestId: 'req-B', proposal: proposal(), provenance: prov }).draft.status).toBe('done')
  })
  it('a failure keeps the manual work and is labeled; marks nothing as AI', () => {
    const s = run(started(), { type: 'draft_fail', requestId: 'req-A', message: 'IA no disponible', unavailable: true })
    expect(s.draft.status).toBe('unavailable')
    expect(s.requirements).toHaveLength(3)
    expect(s.draft.record).toBeNull()
    expect(s.requirements.every((r) => r.origin === 'user')).toBe(true)
  })
  it('a failed retry keeps the provenance of the draft still in use', () => {
    const done = run(started(), { type: 'draft_ok', requestId: 'req-A', proposal: proposal(), provenance: prov })
    const retry = run(done, { type: 'draft_start', requestId: 'req-R' })
    expect(retry.draft.record).toBe(done.draft.record)
    const failed = run(retry, { type: 'draft_fail', requestId: 'req-R', message: 'Sin conexión', unavailable: true })
    expect(failed.draft.record).toBe(done.draft.record)
    expect(failed.draft.status).toBe('unavailable')
    expect(failed.requirements.filter((r) => r.origin === 'ai')).toHaveLength(1)
    // canceling due to an edit of a requirement also does not delete the provenance (the edit only changes the origin of that requirement)
    expect(run(retry, { type: 'update_requirement', id: 'ai1-1', patch: { label: 'x' } }).draft.record).toBe(done.draft.record)
  })
  it('editing the brief or a requirement afterwards is NOT attributed to the AI', () => {
    const done = run(started(), { type: 'draft_ok', requestId: 'req-A', proposal: proposal(), provenance: prov })
    const edited = run(done, { type: 'update_requirement', id: 'ai1-1', patch: { valueText: ['2', ''] } })
    expect(edited.requirements.find((r) => r.requirement_id === 'ai1-1')!.origin).toBe('user')
    const rebrief = run(done, { type: 'set_brief', brief: done.brief + ' más' })
    expect(rebrief.draft.record).toBeNull()
    expect(rebrief.requirements.every((r) => r.origin === 'user')).toBe(true)
    // and the subsequent export does not include a draft attributed to the AI
    const ev = evaluated(rebrief)
    const doc = buildMissionExport(buildRequest(ev).request!, ev.result!, bundle, { draft: ev.draft.record }) as { ai: { draft: unknown } }
    expect(doc.ai.draft).toBeNull()
  })
  it('a non-Martian objective proposed by the AI changes the destination and warns', () => {
    const s = run(started(), { type: 'draft_ok', requestId: 'req-A', proposal: proposal({ target_kind: 'other_or_unclear', target_profile_id: 'unsupported' }), provenance: prov })
    expect(s.target.kind).toBe('other')
    expect(s.draft.warnings.join(' ')).toMatch(/objective is not a Mars rover/)
  })
})

describe('AI explanation: late responses and consistency', () => {
  const ready = () => run(evaluated(withExample()), { type: 'explain_start', requestId: 'exp-A' })
  const selection = (s: PlannerState) => ({ options: [{ site_id: s.result!.options[0].site_id, key_requirement_ids: [s.result!.options[0].requirement_results[0].requirement_id], evidence_ids: [] }], verification_ids: [] })
  const ok = (s: PlannerState, over: Partial<Extract<PlannerAction, { type: 'explain_ok' }>> = {}): PlannerAction => ({
    type: 'explain_ok', requestId: 'exp-A', requestFp: s.result!.request_fingerprint, evaluationFp: evaluationFingerprint(s.result!), selection: selection(s), provenance: prov, ...over,
  })

  it('accepts the current response with matching fingerprints', () => {
    const s = ready()
    const done = run(s, ok(s))
    expect(done.explain.status).toBe('done')
    expect(done.explain.record!.request_fingerprint).toBe(s.result!.request_fingerprint)
  })
  it('ignored if the content changed or the id differs; with foreign fingerprints it ends in error', () => {
    const s = ready()
    expect(run(run(s, { type: 'set_brief', brief: s.brief + 'x' }), ok(s)).explain.record).toBeNull()
    expect(run(s, ok(s, { requestId: 'exp-OLD' }))).toBe(s)
    // Same requestId but foreign fingerprints: it is discarded as an error (it does not remain pending).
    expect(run(s, ok(s, { requestFp: 'a'.repeat(64) })).explain.status).toBe('error')
    expect(run(s, ok(s, { evaluationFp: 'b'.repeat(64) })).explain.status).toBe('error')
    const reEval = run(s, { type: 'unconfirm' })
    expect(run(reEval, ok(s)).explain.record).toBeNull()
  })
  it('a selection with foreign IDs is discarded as an error and not shown', () => {
    const s = ready()
    const bad = run(s, ok(s, { selection: { options: [{ site_id: 'cl-inventado', key_requirement_ids: [], evidence_ids: [] }], verification_ids: [] } }))
    expect(bad.explain.status).toBe('error')
    expect(bad.explain.record).toBeNull()
  })
  it('a response for the current requestId with wrong fingerprints ends in error, not left pending', () => {
    const s = ready()
    const bad = run(s, ok(s, { requestFp: 'a'.repeat(64), evaluationFp: 'b'.repeat(64) }))
    expect(bad.explain.status).toBe('error')
    expect(bad.explain.requestId).toBeNull()
    expect(bad.explain.record).toBeNull()
    expect(bad.result).toBe(s.result)
  })
  it('a failed retry keeps the previous explanation that is still current', () => {
    const s = ready()
    const done = run(s, ok(s))
    const retry = run(done, { type: 'explain_start', requestId: 'exp-B' })
    expect(retry.explain.record).not.toBeNull()
    const failed = run(retry, { type: 'explain_fail', requestId: 'exp-B', message: 'x', unavailable: true })
    expect(failed.explain.record).toBe(done.explain.record)
    expect(failed.explain.status).toBe('unavailable')
  })
  it('an explanation failure does not touch the computed result', () => {
    const s = ready()
    const failed = run(s, { type: 'explain_fail', requestId: 'exp-A', message: 'no', unavailable: true })
    expect(failed.result).toBe(s.result)
    expect(failed.explain.status).toBe('unavailable')
  })
})

describe('AI client: never hangs and validates what it receives', () => {
  afterEach(() => vi.useRealTimers())
  const url = 'http://127.0.0.1/api/ai'
  const respond = (status: number, body: unknown, text?: string) => (async () => new Response(text ?? JSON.stringify(body), { status })) as unknown as typeof fetch

  it('static ZIP (404/HTML): unavailable, clear message', async () => {
    const r = await requestDraft({ requestId: 'req-12345678', brief: 'x', url, fetchImpl: respond(404, null, '<html>404</html>') })
    expect(r).toMatchObject({ ok: false, unavailable: true })
    expect((r as { message: string }).message).toMatch(/manually/)
  })
  it('server errors are translated without technical text', async () => {
    const r = await requestDraft({ requestId: 'req-12345678', brief: 'x', url, fetchImpl: respond(503, { ok: false, error: { code: 'ai_unavailable', message: 'x' } }) })
    expect(r).toMatchObject({ ok: false, unavailable: true })
  })
  it('validates the received draft: foreign id or broken format is discarded', async () => {
    const good = { ok: true, operation: 'draft', client_request_id: 'req-12345678', draft: proposal(), provenance: prov }
    expect((await requestDraft({ requestId: 'req-12345678', brief: 'x', url, fetchImpl: respond(200, good) })).ok).toBe(true)
    expect((await requestDraft({ requestId: 'req-12345678', brief: 'x', url, fetchImpl: respond(200, { ...good, client_request_id: 'otro-12345678' }) })).ok).toBe(false)
    expect((await requestDraft({ requestId: 'req-12345678', brief: 'x', url, fetchImpl: respond(200, { ...good, draft: { ...proposal(), extra: 1 } }) })).ok).toBe(false)
  })
  it('validates the explanation: a selection outside the contract is discarded', async () => {
    const ev = evaluated(withExample())
    const req = buildRequest(ev).request!
    const sel = { options: [], verification_ids: [] }
    const good = { ok: true, operation: 'explain', client_request_id: 'req-12345678', request_fingerprint: 'a'.repeat(64), evaluation_fingerprint: 'b'.repeat(64), selection: sel, provenance: prov }
    const call = (body: unknown) => requestExplanation({ requestId: 'req-12345678', request: req, requestFp: 'a'.repeat(64), url, fetchImpl: respond(200, body) })
    expect((await call(good)).ok).toBe(true)
    expect((await call({ ...good, selection: { ...sel, extra: 1 } })).ok).toBe(false)
    expect((await call({ ...good, evaluation_fingerprint: 'zz' })).ok).toBe(false)
  })
  it('client timeout: ends with a message, does not stay loading', async () => {
    vi.useFakeTimers()
    const hang = (() => new Promise(() => undefined)) as unknown as typeof fetch
    const pending = requestDraft({ requestId: 'req-12345678', brief: 'x', url, fetchImpl: hang })
    await vi.advanceTimersByTimeAsync(46_000)
    expect(await pending).toMatchObject({ ok: false, unavailable: true })
  })
  it('explicit cancellation (signal) ends immediately', async () => {
    const ctl = new AbortController()
    const hang = (() => new Promise(() => undefined)) as unknown as typeof fetch
    const pending = requestDraft({ requestId: 'req-12345678', brief: 'x', url, fetchImpl: hang, signal: ctl.signal })
    ctl.abort()
    expect(await pending).toMatchObject({ ok: false, message: 'Request canceled.' })
  })
})
