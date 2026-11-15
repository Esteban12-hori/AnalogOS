// M10 — planner state and client with the opt-in geology channel; guidance UI.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { assertSnapshotContracts, type DataManifest, type MissionProfile } from '../domain/contracts'
import { parseGeologyContext } from '../domain/geologyContext'
import { buildGeologyCatalog, deterministicGeologyRefs } from '../../../../shared/geology/guidance'
import {
  buildRequest, evaluateMission, evaluationFingerprint, exampleState, fingerprint, initialPlannerState, plannerReducer,
  type AiProvenance, type EvidenceBundle, type PlannerAction, type PlannerState,
} from '../mission'
import { requestExplanation } from '../mission/aiClient'
import { GeologyGuidance, guidanceView } from '../components/planner/GeologyGuidance'
import { ResultView } from '../components/planner/ResultView'

const root = resolve(__dirname, '../../../..')
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(root, p), 'utf8'))
const candidates = read('artifacts/science-v3/candidate-details.json')
const manifest = read('artifacts/science-v3/manifest.json')
const profile = read('artifacts/science-v3/mission-profile.json')
assertSnapshotContracts(candidates, manifest, profile)
const bundle: EvidenceBundle = { candidates, manifest: manifest as DataManifest, profile: profile as MissionProfile }
// The SAME validator the web app uses in production, on the real package.
const context = parseGeologyContext(read('artifacts/geology-context-v1/index.json'), bundle.candidates)
const ctxFp = fingerprint(context)

const prov: AiProvenance = { provider: 'anthropic', model: 'm', request_id: 'req_t', created_at: '2026-11-14T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' }
const run = (s: PlannerState, ...a: PlannerAction[]): PlannerState => a.reduce(plannerReducer, s)
function evaluated(): PlannerState {
  const s0 = run(initialPlannerState(), { type: 'set_journey', journey: 'test' }, { type: 'load_example', example: exampleState() }, { type: 'confirm' })
  return run(s0, { type: 'evaluated', evaluation: evaluateMission(buildRequest(s0).request!, bundle) })
}
const cat = (s: PlannerState) => buildGeologyCatalog(s.result!, context, ctxFp)
const m8sel = (s: PlannerState) => ({ options: [{ site_id: s.result!.options[0].site_id, key_requirement_ids: [s.result!.options[0].requirement_results[0].requirement_id], evidence_ids: [] }], verification_ids: [] })
const okAction = (s: PlannerState, geology: { contextFp: string; catalogFp: string; selection: { ref_ids: string[] } } | undefined, over: Partial<Extract<PlannerAction, { type: 'explain_ok' }>> = {}): PlannerAction => ({
  type: 'explain_ok', requestId: 'e1', requestFp: s.result!.request_fingerprint, evaluationFp: evaluationFingerprint(s.result!), selection: m8sel(s), provenance: prov, geology, ...over,
})

describe('reducer: geology channel', () => {
  it('valid response: geology record separate from the mission record, tied to the exact catalog', () => {
    const s = evaluated()
    const c = cat(s)
    const ids = [c.refs[1].ref_id]
    const done = run(s, { type: 'explain_start', requestId: 'e1', geologyCatalog: c }, okAction(s, { contextFp: ctxFp, catalogFp: c.catalog_fingerprint, selection: { ref_ids: ids } }))
    expect(done.explain.status).toBe('done')
    expect(done.explain.geologyRecord).toMatchObject({ context_fingerprint: ctxFp, catalog_fingerprint: c.catalog_fingerprint, selection: { ref_ids: ids } })
    expect(Object.keys(done.explain.record!)).toEqual(['provenance', 'selection', 'request_fingerprint', 'evaluation_fingerprint']) // mission (M8) record without new fields
  })
  it('discards: foreign context/catalog fingerprint, foreign ref, unrequested geology or missing when requested', () => {
    const s = evaluated()
    const c = cat(s)
    const good = { contextFp: ctxFp, catalogFp: c.catalog_fingerprint, selection: { ref_ids: [c.refs[0].ref_id] } }
    const bad = [
      { ...good, contextFp: 'a'.repeat(64) }, { ...good, catalogFp: 'b'.repeat(64) }, { ...good, selection: { ref_ids: ['otro|geo|site|contrastar_escala'] } },
      { ...good, selection: { ref_ids: [c.refs[0].ref_id, c.refs[0].ref_id] } }, undefined,
    ]
    for (const g of bad) {
      const r = run(s, { type: 'explain_start', requestId: 'e1', geologyCatalog: c }, okAction(s, g))
      expect(r.explain.status).toBe('error')
      expect(r.explain.geologyRecord).toBeNull()
    }
    const noOptIn = run(s, { type: 'explain_start', requestId: 'e1' }, okAction(s, good))
    expect(noOptIn.explain.status).toBe('error')
    const m8only = run(s, { type: 'explain_start', requestId: 'e1' }, okAction(s, undefined))
    expect(m8only.explain.status).toBe('done')
    expect(m8only.explain.geologyRecord).toBeNull()
  })
  it('a catalog from another request/evaluation is rejected', () => {
    const s = evaluated()
    const other = buildGeologyCatalog({ ...s.result!, request_fingerprint: 'c'.repeat(64) }, context, ctxFp)
    const r = run(s, { type: 'explain_start', requestId: 'e1', geologyCatalog: other }, okAction(s, { contextFp: ctxFp, catalogFp: other.catalog_fingerprint, selection: { ref_ids: [] } }))
    expect(r.explain.status).toBe('error')
  })
  it('editing after requesting: late response ignored; changing the context discards record and pending', () => {
    const s = evaluated()
    const c = cat(s)
    const pending = run(s, { type: 'explain_start', requestId: 'e1', geologyCatalog: c })
    const edited = run(pending, { type: 'set_activity', activity: 'otra' })
    const late = run(edited, okAction(s, { contextFp: ctxFp, catalogFp: c.catalog_fingerprint, selection: { ref_ids: [] } }))
    expect(late.explain.status).toBe('idle')
    expect(late.explain.geologyRecord).toBeNull()
    const done = run(s, { type: 'explain_start', requestId: 'e1', geologyCatalog: c }, okAction(s, { contextFp: ctxFp, catalogFp: c.catalog_fingerprint, selection: { ref_ids: [] } }))
    expect(run(done, { type: 'geology_context_changed' }).explain.geologyRecord).toBeNull()
    expect(run(pending, { type: 'geology_context_changed' }).explain.status).toBe('idle')
    expect(run(s, { type: 'geology_context_changed' })).toBe(s) // without a geology selection: does nothing
  })
  it('geology channel failure: error with an explicit option to retry without geology; rest of the state intact', () => {
    const s = evaluated()
    const failed = run(s, { type: 'explain_start', requestId: 'e1', geologyCatalog: cat(s) }, { type: 'explain_fail', requestId: 'e1', message: 'x', unavailable: true, geologyFailure: true })
    expect(failed.explain.status).toBe('error')
    expect(failed.explain.geologyFailed).toBe(true)
    expect(failed.result).toBe(s.result)
    const retry = run(failed, { type: 'explain_start', requestId: 'e2' })
    expect(retry.explain.geologyFailed).toBe(false)
    expect(retry.explain.pendingCatalog).toBeNull()
  })
})

describe('/api/ai client with the geology channel', () => {
  const s = evaluated()
  const req = buildRequest(s).request!
  const respond = (body: unknown, sink?: { sent?: Record<string, unknown> }) => (async (_u: unknown, init?: RequestInit) => {
    if (sink) sink.sent = JSON.parse(String(init?.body))
    return new Response(JSON.stringify(body), { status: 200 })
  }) as unknown as typeof fetch
  const base = { ok: true, operation: 'explain', client_request_id: 'req-12345678', request_fingerprint: 'a'.repeat(64), evaluation_fingerprint: 'b'.repeat(64), selection: { options: [], verification_ids: [] }, provenance: prov }
  const call = (fetchImpl: typeof fetch, geologyContextFp?: string) => requestExplanation({ requestId: 'req-12345678', request: req, requestFp: 'a'.repeat(64), url: 'http://x/api/ai', fetchImpl, geologyContextFp })
  it('sends only the fingerprint (never geodata) and requires a well-formed geology block', async () => {
    const sink: { sent?: Record<string, unknown> } = {}
    const g = { context_fingerprint: ctxFp, catalog_fingerprint: 'd'.repeat(64), selection: { ref_ids: ['x'] } }
    const r = await call(respond({ ...base, geology: g }, sink), ctxFp)
    expect(r.ok && r.value.geology).toEqual({ contextFp: ctxFp, catalogFp: 'd'.repeat(64), selection: { ref_ids: ['x'] } })
    expect(Object.keys(sink.sent!).sort()).toEqual(['client_request_id', 'geology_context_fingerprint', 'operation', 'request', 'request_fingerprint'])
    expect((await call(respond(base), ctxFp)).ok).toBe(false) // geology was requested and did not arrive
    expect((await call(respond({ ...base, geology: { ...g, selection: { ref_ids: [1] } } }), ctxFp)).ok).toBe(false)
  })
  it('without opt-in no fingerprint is sent and a response with unrequested geology is discarded', async () => {
    const sink: { sent?: Record<string, unknown> } = {}
    expect((await call(respond(base, sink))).ok).toBe(true)
    expect(sink.sent).not.toHaveProperty('geology_context_fingerprint')
    expect((await call(respond({ ...base, geology: { context_fingerprint: ctxFp, catalog_fingerprint: 'd'.repeat(64), selection: { ref_ids: [] } } }))).ok).toBe(false)
  })
  it('geology channel specific errors carry their own code and message', async () => {
    for (const code of ['geology_context_unavailable', 'geology_context_stale']) {
      const r = await call((async () => new Response(JSON.stringify({ ok: false, error: { code, message: 'x' } }), { status: 409 })) as unknown as typeof fetch, ctxFp)
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.code).toBe(code)
        expect(r.message).toMatch(/geology context/)
        expect(r.unavailable).toBe(false)
      }
    }
  })
})

describe('geological guidance UI', () => {
  const s = evaluated()
  const c = cat(s)
  it('without AI: labeled general guidance, limits always visible and no ranking or suitability', () => {
    const html = renderToStaticMarkup(<GeologyGuidance view={guidanceView(c, s)!} onExport={() => undefined} exportError={null} />)
    expect(html).toContain('General guidance without AI')
    expect(html).toContain('it does not depend on your objective')
    expect(html).toContain('Limits of the geological evidence')
    expect(html).toContain('Regional mapping')
    expect(html).toContain('does not change statuses, order or exclusions')
    expect(html).toContain('Download JSON with geological guidance')
    expect(html).not.toMatch(/\bapto\b|aprobad|autorizad|\bis suitable\b|\bapproved\b|\bauthorized\b/i)
  })
  it('with AI selection: labeled as AI selection, with unit/source per item and limits even if the AI omits sectors', () => {
    const ids = [c.refs.find((r) => r.purpose === 'caracterizar_material_superficial')!.ref_id]
    const withAi = run(s, { type: 'explain_start', requestId: 'e1', geologyCatalog: c }, okAction(s, { contextFp: ctxFp, catalogFp: c.catalog_fingerprint, selection: { ref_ids: ids } }))
    const view = guidanceView(c, withAi)!
    expect(view.source).toBe('anthropic')
    const html = renderToStaticMarkup(<GeologyGuidance view={view} onExport={() => undefined} exportError={null} />)
    expect(html).toContain('AI selection')
    expect(html).toContain('Support: unit Qa')
    expect(html).toContain('Geología Base')
    expect((html.match(/Limits of the geological evidence/g) ?? []).length).toBe(c.sites.length)
    expect(html).toContain('Measure in the field the grain size, compaction and friction')
  })
  it('an AI selection from another catalog (different fingerprint) is not shown: falls back to general guidance', () => {
    const stale = { ...s, explain: { ...s.explain, geologyRecord: { context_fingerprint: ctxFp, catalog_fingerprint: 'e'.repeat(64), request_fingerprint: 'a', evaluation_fingerprint: 'b', selection: { ref_ids: [c.refs[0].ref_id] } } } }
    expect(guidanceView(c, stale)!.source).toBe('deterministic_template')
  })
  it('a sector without coverage is shown without units but with its limit; without a catalog the section does not exist', () => {
    const none = buildGeologyCatalog(evaluateMission({ ...buildRequest(s).request!, requirements: [], scope: { mode: 'catalog' } }, bundle), context, ctxFp)
    const html = renderToStaticMarkup(<GeologyGuidance view={guidanceView(none, s)!} onExport={() => undefined} exportError={null} />)
    expect(html).toContain('No mapped units in this layer')
    expect(guidanceView(null, s)).toBeNull()
  })
  it('clickable official source (https), units with and without overlap and a note that they are not summed', () => {
    const html = renderToStaticMarkup(<GeologyGuidance view={guidanceView(c, s)!} onExport={() => undefined} exportError={null} />)
    expect(html).toContain('href="https://lineasdebasepublicas.mma.gob.cl/datos_abiertos/dataset/geologia-base"')
    expect(html).toContain('rel="noreferrer noopener"')
    expect(html).toContain('including overlaps')
    expect(html).toContain('without overlap')
    expect(html).toContain('do not add up')
    expect(html).toContain('does not locate where each one lies')
  })
  it('ResultView: without geology context the section does not appear and it explains why geology AI is unavailable; with context it does', () => {
    const req = buildRequest(s).request!
    const props = { evaluation: s.result!, request: req, state: s, candidates: bundle.candidates, onExplain: () => undefined, onExport: () => undefined, exportError: null, onEdit: () => undefined }
    const without = renderToStaticMarkup(<ResultView {...props} />)
    expect(without).not.toContain('Geological guidance for this test')
    expect(without).toContain('AI geological guidance not available')
    const geo = { available: true, unavailableReason: null, useGeology: true, setUseGeology: () => undefined, catalog: c, onExportGeology: () => undefined, exportError: null }
    const withGeo = renderToStaticMarkup(<ResultView {...props} geo={geo} />)
    expect(withGeo).toContain('Geological guidance for this test')
    expect(withGeo).toContain('confirmed objective')
    expect(withGeo).toContain('official public geological mapping')
    expect(withGeo).toContain('href="https://lineasdebasepublicas')
    expect(withGeo.indexOf('pl-ai-title')).toBeLessThan(withGeo.indexOf('pl-geo-title')) // AI activation before the long site cards
    // URL printed as text in the report (M11: on each sector's source line, not only in a link).
    expect(withGeo.slice(withGeo.indexOf('pl-print-geo'))).toContain('>https://lineasdebasepublicas.mma.gob.cl/datos_abiertos/dataset/geologia-base</a>')
    expect(without.replace(/<[^>]+>/g, ' ')).not.toMatch(/M8/)
    expect(withGeo.replace(/<[^>]+>/g, ' ')).not.toMatch(/M8/)
    expect(without).toContain('not the full brief text or geological mapping')
    expect(withGeo).not.toContain('not the full brief text or geological mapping') // single, conditional notice
    expect(withGeo).toContain('Download JSON</button>') // mission export (M8) intact
    expect(withGeo).toContain('Geological guidance (general, without AI)') // informe imprimible
    expect(deterministicGeologyRefs(c).ref_ids.length).toBeGreaterThan(0)
  })
})
