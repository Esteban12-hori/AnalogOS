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

describe('entradas de texto sin NaN', () => {
  it('parsea números estrictos y rechaza vacío, texto y exponentes', () => {
    expect(parseNumber('-69,7')).toBe(-69.7)
    expect(parseNumber(' 3 ')).toBe(3)
    for (const bad of ['', ' ', 'abc', '1e3', 'Infinity', 'NaN', '1,2,3', '--1']) expect(parseNumber(bad), bad).toBeNull()
  })
  it('coordenadas vacías o erróneas dan problemas legibles y ninguna solicitud', () => {
    const s = run(initialPlannerState(), { type: 'set_scope', scope: { ...initialPlannerState().scope, mode: 'point', lon: 'x', lat: '' } })
    const built = buildRequest(s)
    expect(built.request).toBeNull()
    expect(built.issues.join(' ')).toMatch(/Longitud/)
    expect(built.issues.join(' ')).toMatch(/Latitud/)
    const bbox = buildScope({ ...s.scope, mode: 'bbox', west: '-70', south: '', east: '-69', north: 'z' })
    expect(bbox.scope).toBeNull()
    expect(bbox.issues).toHaveLength(2)
    // Fuera de rango o desordenado: pasa el parseo pero la validación semántica lo rechaza antes de evaluar.
    const bad = run(s, { type: 'set_scope', scope: { ...s.scope, mode: 'bbox', west: '-69', south: '-25', east: '-70', north: '-24' } })
    expect(buildRequest(bad).request).toBeNull()
    expect(buildRequest(bad).issues.join(' ')).toMatch(/Orden de longitud/)
  })
  it('un valor de requisito no numérico bloquea la confirmación', () => {
    const base = run(initialPlannerState(), { type: 'add_requirement', requirement: defaultMetricRequirement('median_slope_degree', 'u1') })
    expect(buildRequest(base).issues.join(' ')).toMatch(/valor como número/)
    expect(run(base, { type: 'confirm' }).confirmed).toBe(false)
  })
  it('«otro objetivo» exige describirlo y se conserva como no soportado', () => {
    let s = run(initialPlannerState(), { type: 'set_target', target: { kind: 'other', stated: '' } })
    expect(buildRequest(s).issues.join(' ')).toMatch(/Describa el objetivo/)
    s = run(s, { type: 'set_target', target: { kind: 'other', stated: 'Hábitat lunar' } })
    expect(buildRequest(s).request!.target).toEqual({ profile_id: 'unsupported', stated: 'Hábitat lunar' })
    const ev = evaluated(s)
    expect(ev.result?.outcome).toBe('unsupported_target')
  })
})

describe('flujo ejemplo → confirmar → evaluar y export', () => {
  it('no evalúa sin confirmar; confirmar y evaluar produce resultado; editar lo invalida', () => {
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
  it('el ejemplo exporta JSON validado; sin requisitos y sin brief no hay recomendación automática', () => {
    const ev = evaluated(withExample())
    const doc = buildMissionExport(buildRequest(ev).request!, ev.result!, bundle) as { evaluation: { outcome: string } }
    expect(doc.evaluation.outcome).toBe('evaluated')
    const blank = initialPlannerState()
    expect(blank.result).toBeNull()
    expect(run(blank, { type: 'evaluated', evaluation: ev.result! }).result).toBeNull()
  })
  it('cargar el ejemplo conserva el sector elegido y pulsar el recorrido activo no borra el resultado', () => {
    let s = run(initialPlannerState(), { type: 'set_journey', journey: 'sector', siteId: 'cl-win-s2500-w06970' })
    s = run(s, { type: 'load_example', example: exampleState() })
    expect(s.scope).toMatchObject({ mode: 'sector', siteId: 'cl-win-s2500-w06970' })
    const ev = evaluated(s)
    expect(ev.result).not.toBeNull()
    expect(run(ev, { type: 'set_journey', journey: 'sector' })).toBe(ev)
    expect(run(ev, { type: 'set_journey', journey: 'sector', siteId: 'ar-win-s2620-w06750' }).result).toBeNull()
  })
  it('pendientes detectados del brief se conservan en la solicitud aunque no sean requisitos', () => {
    let s = run(initialPlannerState(), { type: 'set_brief', brief: 'Necesito buena tracción y cobertura móvil.' })
    expect(pendingQuestions(s).join(' ')).toMatch(/Tracción/)
    s = run(s, { type: 'confirm' })
    expect(buildRequest(s).request!.open_questions.join(' ')).toMatch(/Cobertura móvil/)
    expect(buildRequest(s).request!.requirements).toEqual([])
  })
  it('mide sin requisitos: cada sector muestra sus medidas del snapshot', () => {
    const m = siteMeasures(candidates[0])
    expect(m.map((x) => x.metric_id)).toHaveLength(6)
    expect(m.find((x) => x.metric_id === 'median_slope_degree')?.value).toBe(2.169)
    expect(m.find((x) => x.metric_id === 'country')?.value).toBe('CL')
  })
})

describe('borrador de IA: respuestas tardías y atribución', () => {
  const started = (s = run(withExample(), { type: 'set_brief', brief: 'Pendiente mediana regional no mayor de 3 grados.' })) => run(s, { type: 'draft_start', requestId: 'req-A' })

  it('acepta la respuesta vigente, renumera ids y registra el borrador original', () => {
    const s = run(started(), { type: 'draft_ok', requestId: 'req-A', proposal: proposal(), provenance: prov })
    expect(s.draft.status).toBe('done')
    const ai = s.requirements.filter((r) => r.origin === 'ai')
    expect(ai.map((r) => r.requirement_id)).toEqual(['ai1-1'])
    expect(s.draft.record!.proposal.requirements[0].requirement_id).toBe('ai1-1')
    expect(s.draft.record!.brief_fingerprint).toBe(fingerprint(s.brief))
    expect(s.confirmed).toBe(false)
  })
  it('una respuesta tardía tras editar el brief se ignora y la solicitud queda cancelada', () => {
    const s = run(started(), { type: 'set_brief', brief: 'Otro texto distinto.' })
    expect(s.draft.requestId).toBeNull()
    const after = run(s, { type: 'draft_ok', requestId: 'req-A', proposal: proposal(), provenance: prov })
    expect(after).toBe(s)
    expect(after.requirements.every((r) => r.origin !== 'ai')).toBe(true)
  })
  it('editar un requisito, el sector o el destino también cancela la solicitud pendiente', () => {
    for (const a of [{ type: 'update_requirement', id: 'ex1', patch: { label: 'x' } }, { type: 'set_scope', scope: { ...initialPlannerState().scope, mode: 'sector', siteId: 'cl-win-s2500-w06970' } }, { type: 'set_target', target: { kind: 'other', stated: 'x' } }] as PlannerAction[]) {
      const s = run(started(), a)
      expect(run(s, { type: 'draft_ok', requestId: 'req-A', proposal: proposal(), provenance: prov })).toBe(s)
    }
  })
  it('una solicitud nueva sustituye a la anterior: solo vale la última', () => {
    const s = run(started(), { type: 'draft_start', requestId: 'req-B' })
    expect(run(s, { type: 'draft_ok', requestId: 'req-A', proposal: proposal(), provenance: prov })).toBe(s)
    expect(run(s, { type: 'draft_fail', requestId: 'req-A', message: 'x', unavailable: false })).toBe(s)
    expect(run(s, { type: 'draft_ok', requestId: 'req-B', proposal: proposal(), provenance: prov }).draft.status).toBe('done')
  })
  it('un fallo conserva el trabajo manual y se rotula; no marca nada como IA', () => {
    const s = run(started(), { type: 'draft_fail', requestId: 'req-A', message: 'IA no disponible', unavailable: true })
    expect(s.draft.status).toBe('unavailable')
    expect(s.requirements).toHaveLength(3)
    expect(s.draft.record).toBeNull()
    expect(s.requirements.every((r) => r.origin === 'user')).toBe(true)
  })
  it('un reintento fallido conserva la procedencia del borrador que sigue en uso', () => {
    const done = run(started(), { type: 'draft_ok', requestId: 'req-A', proposal: proposal(), provenance: prov })
    const retry = run(done, { type: 'draft_start', requestId: 'req-R' })
    expect(retry.draft.record).toBe(done.draft.record)
    const failed = run(retry, { type: 'draft_fail', requestId: 'req-R', message: 'Sin conexión', unavailable: true })
    expect(failed.draft.record).toBe(done.draft.record)
    expect(failed.draft.status).toBe('unavailable')
    expect(failed.requirements.filter((r) => r.origin === 'ai')).toHaveLength(1)
    // cancelar por edición de un requisito tampoco borra la procedencia (la edición solo cambia el origen de ese requisito)
    expect(run(retry, { type: 'update_requirement', id: 'ai1-1', patch: { label: 'x' } }).draft.record).toBe(done.draft.record)
  })
  it('editar el brief o un requisito después NO se atribuye a la IA', () => {
    const done = run(started(), { type: 'draft_ok', requestId: 'req-A', proposal: proposal(), provenance: prov })
    const edited = run(done, { type: 'update_requirement', id: 'ai1-1', patch: { valueText: ['2', ''] } })
    expect(edited.requirements.find((r) => r.requirement_id === 'ai1-1')!.origin).toBe('user')
    const rebrief = run(done, { type: 'set_brief', brief: done.brief + ' más' })
    expect(rebrief.draft.record).toBeNull()
    expect(rebrief.requirements.every((r) => r.origin === 'user')).toBe(true)
    // y la exportación posterior no incluye un borrador atribuido a la IA
    const ev = evaluated(rebrief)
    const doc = buildMissionExport(buildRequest(ev).request!, ev.result!, bundle, { draft: ev.draft.record }) as { ai: { draft: unknown } }
    expect(doc.ai.draft).toBeNull()
  })
  it('un objetivo no marciano propuesto por la IA cambia el destino y avisa', () => {
    const s = run(started(), { type: 'draft_ok', requestId: 'req-A', proposal: proposal({ target_kind: 'other_or_unclear', target_profile_id: 'unsupported' }), provenance: prov })
    expect(s.target.kind).toBe('other')
    expect(s.draft.warnings.join(' ')).toMatch(/objetivo no es un rover marciano/)
  })
})

describe('explicación de IA: respuestas tardías y coherencia', () => {
  const ready = () => run(evaluated(withExample()), { type: 'explain_start', requestId: 'exp-A' })
  const selection = (s: PlannerState) => ({ options: [{ site_id: s.result!.options[0].site_id, key_requirement_ids: [s.result!.options[0].requirement_results[0].requirement_id], evidence_ids: [] }], verification_ids: [] })
  const ok = (s: PlannerState, over: Partial<Extract<PlannerAction, { type: 'explain_ok' }>> = {}): PlannerAction => ({
    type: 'explain_ok', requestId: 'exp-A', requestFp: s.result!.request_fingerprint, evaluationFp: evaluationFingerprint(s.result!), selection: selection(s), provenance: prov, ...over,
  })

  it('acepta la respuesta vigente con huellas coincidentes', () => {
    const s = ready()
    const done = run(s, ok(s))
    expect(done.explain.status).toBe('done')
    expect(done.explain.record!.request_fingerprint).toBe(s.result!.request_fingerprint)
  })
  it('se ignora si el contenido cambió o el id es otro; con huellas ajenas termina en error', () => {
    const s = ready()
    expect(run(run(s, { type: 'set_brief', brief: s.brief + 'x' }), ok(s)).explain.record).toBeNull()
    expect(run(s, ok(s, { requestId: 'exp-OLD' }))).toBe(s)
    // Mismo requestId pero huellas ajenas: se descarta como error (no queda pendiente).
    expect(run(s, ok(s, { requestFp: 'a'.repeat(64) })).explain.status).toBe('error')
    expect(run(s, ok(s, { evaluationFp: 'b'.repeat(64) })).explain.status).toBe('error')
    const reEval = run(s, { type: 'unconfirm' })
    expect(run(reEval, ok(s)).explain.record).toBeNull()
  })
  it('una selección con IDs ajenos se descarta como error y no se muestra', () => {
    const s = ready()
    const bad = run(s, ok(s, { selection: { options: [{ site_id: 'cl-inventado', key_requirement_ids: [], evidence_ids: [] }], verification_ids: [] } }))
    expect(bad.explain.status).toBe('error')
    expect(bad.explain.record).toBeNull()
  })
  it('una respuesta del requestId vigente con huellas equivocadas termina en error, no queda pendiente', () => {
    const s = ready()
    const bad = run(s, ok(s, { requestFp: 'a'.repeat(64), evaluationFp: 'b'.repeat(64) }))
    expect(bad.explain.status).toBe('error')
    expect(bad.explain.requestId).toBeNull()
    expect(bad.explain.record).toBeNull()
    expect(bad.result).toBe(s.result)
  })
  it('un reintento fallido conserva la explicación previa que sigue vigente', () => {
    const s = ready()
    const done = run(s, ok(s))
    const retry = run(done, { type: 'explain_start', requestId: 'exp-B' })
    expect(retry.explain.record).not.toBeNull()
    const failed = run(retry, { type: 'explain_fail', requestId: 'exp-B', message: 'x', unavailable: true })
    expect(failed.explain.record).toBe(done.explain.record)
    expect(failed.explain.status).toBe('unavailable')
  })
  it('un fallo de explicación no toca el resultado calculado', () => {
    const s = ready()
    const failed = run(s, { type: 'explain_fail', requestId: 'exp-A', message: 'no', unavailable: true })
    expect(failed.result).toBe(s.result)
    expect(failed.explain.status).toBe('unavailable')
  })
})

describe('cliente de IA: nunca queda colgado y valida lo recibido', () => {
  afterEach(() => vi.useRealTimers())
  const url = 'http://127.0.0.1/api/ai'
  const respond = (status: number, body: unknown, text?: string) => (async () => new Response(text ?? JSON.stringify(body), { status })) as unknown as typeof fetch

  it('ZIP estático (404/HTML): no disponible, mensaje claro', async () => {
    const r = await requestDraft({ requestId: 'req-12345678', brief: 'x', url, fetchImpl: respond(404, null, '<html>404</html>') })
    expect(r).toMatchObject({ ok: false, unavailable: true })
    expect((r as { message: string }).message).toMatch(/manualmente/)
  })
  it('errores del servidor se traducen sin texto técnico', async () => {
    const r = await requestDraft({ requestId: 'req-12345678', brief: 'x', url, fetchImpl: respond(503, { ok: false, error: { code: 'ai_unavailable', message: 'x' } }) })
    expect(r).toMatchObject({ ok: false, unavailable: true })
  })
  it('valida el borrador recibido: id ajeno o formato roto se descarta', async () => {
    const good = { ok: true, operation: 'draft', client_request_id: 'req-12345678', draft: proposal(), provenance: prov }
    expect((await requestDraft({ requestId: 'req-12345678', brief: 'x', url, fetchImpl: respond(200, good) })).ok).toBe(true)
    expect((await requestDraft({ requestId: 'req-12345678', brief: 'x', url, fetchImpl: respond(200, { ...good, client_request_id: 'otro-12345678' }) })).ok).toBe(false)
    expect((await requestDraft({ requestId: 'req-12345678', brief: 'x', url, fetchImpl: respond(200, { ...good, draft: { ...proposal(), extra: 1 } }) })).ok).toBe(false)
  })
  it('valida la explicación: selección fuera de contrato se descarta', async () => {
    const ev = evaluated(withExample())
    const req = buildRequest(ev).request!
    const sel = { options: [], verification_ids: [] }
    const good = { ok: true, operation: 'explain', client_request_id: 'req-12345678', request_fingerprint: 'a'.repeat(64), evaluation_fingerprint: 'b'.repeat(64), selection: sel, provenance: prov }
    const call = (body: unknown) => requestExplanation({ requestId: 'req-12345678', request: req, requestFp: 'a'.repeat(64), url, fetchImpl: respond(200, body) })
    expect((await call(good)).ok).toBe(true)
    expect((await call({ ...good, selection: { ...sel, extra: 1 } })).ok).toBe(false)
    expect((await call({ ...good, evaluation_fingerprint: 'zz' })).ok).toBe(false)
  })
  it('timeout del cliente: termina con mensaje, no queda cargando', async () => {
    vi.useFakeTimers()
    const hang = (() => new Promise(() => undefined)) as unknown as typeof fetch
    const pending = requestDraft({ requestId: 'req-12345678', brief: 'x', url, fetchImpl: hang })
    await vi.advanceTimersByTimeAsync(46_000)
    expect(await pending).toMatchObject({ ok: false, unavailable: true })
  })
  it('cancelación explícita (señal) termina de inmediato', async () => {
    const ctl = new AbortController()
    const hang = (() => new Promise(() => undefined)) as unknown as typeof fetch
    const pending = requestDraft({ requestId: 'req-12345678', brief: 'x', url, fetchImpl: hang, signal: ctl.signal })
    ctl.abort()
    expect(await pending).toMatchObject({ ok: false, message: 'Solicitud cancelada.' })
  })
})
