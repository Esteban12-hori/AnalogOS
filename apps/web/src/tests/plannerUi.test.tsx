import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PlannerPanel } from '../components/planner/PlannerPanel'
import { RequirementEditor } from '../components/planner/RequirementEditor'
import { ResultView } from '../components/planner/ResultView'
import { ScopePicker } from '../components/planner/ScopePicker'
import { GeometryFigure } from '../components/planner/GeometryFigure'
import type { DemoSnapshot } from '../data/loadDemoSnapshot'
import { assertSnapshotContracts, type CandidateSite, type DataManifest, type MissionProfile } from '../domain/contracts'
import {
  buildRequest, emptyScope, evaluateMission, exampleState, initialPlannerState, plannerReducer, resolveScope,
  type AiProvenance, type EvidenceBundle, type PlannerAction, type PlannerState,
} from '../mission'

const root = resolve(__dirname, '../../../..')
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(root, p), 'utf8'))
const candidates = read('artifacts/science-v3/candidate-details.json')
const manifest = read('artifacts/science-v3/manifest.json')
const profile = read('artifacts/science-v3/mission-profile.json')
assertSnapshotContracts(candidates, manifest, profile)
const bundle: EvidenceBundle = { candidates, manifest: manifest as DataManifest, profile: profile as MissionProfile }
const snapshot = { candidates: candidates as CandidateSite[], manifest, profile } as unknown as DemoSnapshot
const noop = () => undefined
const run = (s: PlannerState, ...a: PlannerAction[]) => a.reduce(plannerReducer, s)
const prov: AiProvenance = { provider: 'anthropic', model: 'claude-sonnet-5-5', request_id: 'req_ui', created_at: '2026-11-14T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' }

function evaluatedState(extra: PlannerAction[] = [], scope = emptyScope()): PlannerState {
  const s = run(initialPlannerState(), { type: 'set_journey', journey: 'test' }, { type: 'load_example', example: exampleState() }, { type: 'set_scope', scope }, ...extra, { type: 'confirm' })
  return run(s, { type: 'evaluated', evaluation: evaluateMission(buildRequest(s).request === null ? buildRequest({ ...s, confirmed: true }).request! : buildRequest(s).request!, bundle) })
}
const view = (s: PlannerState, onExplain = noop) =>
  renderToStaticMarkup(<ResultView evaluation={s.result!} request={buildRequest(s).request!} state={s} candidates={snapshot.candidates} onExplain={onExplain} onExport={noop} exportError={null} onEdit={noop} />)

describe('planner entry', () => {
  it('shows the two main entries on the first screen and auto-evaluates nothing', () => {
    const html = renderToStaticMarkup(<PlannerPanel snapshot={snapshot} intent={null} />)
    expect(html).toContain('Define a test')
    expect(html).toContain('Evaluate a sector')
    expect(html).toContain('First supported profile: Mars rover')
    expect(html).not.toContain('pl-result')
    expect(html).not.toContain('Texto de su prueba') // with no path chosen, there are no long forms
  })
})

describe('requirement editor', () => {
  const s = run(initialPlannerState(), { type: 'set_journey', journey: 'test' }, { type: 'load_example', example: exampleState() })
  it('example: few requirements, unmeasured ones labeled, distinguishable origins and quotes', () => {
    const html = renderToStaticMarkup(<RequirementEditor state={s} dispatch={noop} />)
    expect(html).toContain('Regional median slope')
    expect(html).toContain('Must-have')
    expect(html).toContain('Preference')
    expect(html).toContain('not measured')
    expect(html).toContain('never counts as met')
    expect(html).toContain('You')
    expect(html).toContain('Quote from the brief: “regional median slope no greater than 3 degrees”')
    expect(html).toContain('The calculation uses only the requirements in this list')
    expect(html).toContain('More options') // detalle progresivo
  })
  it('AI requirement: origin label and CL/AR country', () => {
    const ai = run(s, { type: 'add_requirement', requirement: { kind: 'measurable', requirement_id: 'c1', label: 'País', importance: 'critical', origin: 'ai', source_quote: 'solo Chile', metric_id: 'country', operator: 'in', valueText: ['', ''], countries: ['CL'], unit: 'iso_alpha2', scale: 'window' } })
    const html = renderToStaticMarkup(<RequirementEditor state={ai} dispatch={noop} />)
    expect(html).toContain('Proposed by AI')
    expect(html).toContain('Chile (CL)')
    expect(html).toContain('Argentina (AR)')
  })
})

describe('sector and coordinate selector', () => {
  it('lists the seven areas with country and REF, and shows polygons in local SVG', () => {
    const html = renderToStaticMarkup(<ScopePicker journey="sector" scope={{ ...emptyScope(), mode: 'sector', siteId: 'cl-win-s2500-w06970' }} candidates={snapshot.candidates} dispatch={noop} />)
    expect((html.match(/name="scope-sector"/g) ?? []).length).toBe(7)
    expect(html).toContain('Argentina')
    expect(html).toContain('REF')
    expect(html).toContain('<svg')
    expect(html).not.toContain('canvas')
  })
  it('empty or wrong coordinates: accessible warnings and no NaN', () => {
    const html = renderToStaticMarkup(<ScopePicker journey="sector" scope={{ ...emptyScope(), mode: 'point', lon: 'abc', lat: '' }} candidates={snapshot.candidates} dispatch={noop} />)
    expect(html).toContain('role="alert"')
    expect(html).toContain('Longitude: enter a number')
    expect(html).not.toContain('NaN')
  })
  it('point inside: suggests the window with an explicit button; partial bbox offers evaluating the whole window', () => {
    const point = renderToStaticMarkup(<ScopePicker journey="sector" scope={{ ...emptyScope(), mode: 'point', lon: '-69,7', lat: '-25' }} candidates={snapshot.candidates} dispatch={noop} />)
    expect(point).toContain('There is evidence for a window, not for the point')
    expect(point).toContain('Evaluate the full window')
    const bbox = renderToStaticMarkup(<ScopePicker journey="test" scope={{ ...emptyScope(), mode: 'bbox', west: '-69,75', south: '-25,05', east: '-69,65', north: '-24,95' }} candidates={snapshot.candidates} dispatch={noop} />)
    expect(bbox).toContain('Partial coverage')
    expect(bbox).toContain('Evaluate the full window')
    const out = renderToStaticMarkup(<ScopePicker journey="test" scope={{ ...emptyScope(), mode: 'point', lon: '10', lat: '10' }} candidates={snapshot.candidates} dispatch={noop} />)
    expect(out).toContain('No evidence for this geometry')
    expect(out).toContain('Outside the windows with evidence')
  })
  it('the figure distinguishes requested vs measured', () => {
    const res = resolveScope({ mode: 'bbox', bbox: [-69.75, -25.05, -69.65, -24.95], window_site_id: 'cl-win-s2500-w06970' }, snapshot.candidates)
    const html = renderToStaticMarkup(<GeometryFigure candidates={snapshot.candidates} resolution={res} />)
    expect(html).toContain('pl-req')
    expect(html).toContain('measured')
  })
})

describe('resultado', () => {
  it('shows verdict, visible blockers, partial comparability, Yungay REF, original scores and rules', () => {
    const s = evaluatedState()
    const html = view(s)
    expect(html).toContain('areas are prioritized for reconnaissance')
    expect(html).toContain('Partial comparison')
    expect(html).toContain('REF · known reference')
    expect(html).toContain('Original v3 snapshot values, not recalculated')
    expect(html).toContain('Similarity is not a probability of success')
    expect(html).toContain('Territorial feasibility')
    expect(html).toContain('How options are ordered')
    expect(html).toContain('Not assessable')
    expect(html).toContain('Field checks')
    expect(html).not.toMatch(/\bapto\b|sector aprobado|aprobado el sector|seguro para|autorizado para|\bsuitable site\b|approved sector|sector (is )?approved|safe for|authorized for/i)
  })
  it('zero recommended is a valid result and the reasons stay visible without opening details', () => {
    const s = evaluatedState([{ type: 'update_requirement', id: 'ex1', patch: { valueText: ['0,001', ''] } }])
    expect(s.result?.recommended_site_ids).toEqual([])
    const html = view(s)
    expect(html).toContain('No area is prioritized')
    expect(html).toContain('Does not meet requirements')
    expect(html).toContain('pl-blockers')
    expect(html).toMatch(/Not met<\/b> Regional median slope: Observed value/)
  })
  it('out-of-coverage diagnostic: exportable report, no neighbor or recommendation', () => {
    const s = evaluatedState([], { ...emptyScope(), mode: 'point', lon: '10', lat: '10' })
    expect(s.result?.outcome).toBe('insufficient_coverage')
    const html = view(s)
    expect(html).toContain('Insufficient-evidence report')
    expect(html).toContain('Planned sources')
    expect(html).toContain('Nothing was estimated from neighboring windows')
    expect(html).not.toContain('pl-rank')
  })
  it('unsupported objective: no computation or recommendation', () => {
    const s = evaluatedState([{ type: 'set_target', target: { kind: 'other', stated: 'Hábitat lunar' } }])
    const html = view(s)
    expect(html).toContain('This objective has no supported profile')
    expect(html).toContain('Hábitat lunar')
    expect(html).toContain('Unsupported objective')
  })
  it('the printable report keeps the whole brief, requirements, origin/quote, limits and provenance', () => {
    const s = evaluatedState()
    const html = view(s)
    const print = html.slice(html.indexOf('pl-print-only'))
    expect(print).toContain('Full brief text')
    expect(print).toContain(s.brief)
    expect(print).toContain('regional median slope no greater than 3 degrees')
    expect(print).toContain('AI draft: no')
    expect(print).toContain('AI interpretation: no')
    expect(print).toContain('Limits')
  })
})

describe('AI in the result: separate from the metrics and without false attributions', () => {
  const base = () => evaluatedState()
  const withExplain = (s: PlannerState, selection: Parameters<typeof plannerReducer>[1] extends infer A ? A extends { type: 'explain_ok'; selection: infer S } ? S : never : never): PlannerState => {
    const started = run(s, { type: 'explain_start', requestId: 'exp-ui-1' })
    return run(started, { type: 'explain_ok', requestId: 'exp-ui-1', requestFp: s.result!.request_fingerprint, evaluationFp: started.explain.evaluationFp!, selection, provenance: prov })
  }
  it('warns about sending to Anthropic next to the button and blocks during the call', () => {
    const s = base()
    expect(view(s)).toContain('are sent to Anthropic')
    const pending = view(run(s, { type: 'explain_start', requestId: 'exp-ui-2' }))
    expect(pending).toContain('Asking the AI')
    expect(pending).toMatch(/<button[^>]*disabled[^>]*aria-busy="true"/)
  })
  it('a selection that omits the blockers does not hide them; the engine still rules', () => {
    const s0 = evaluatedState([{ type: 'update_requirement', id: 'ex1', patch: { valueText: ['2,2', ''] } }])
    const blocked = s0.result!.options.find((o) => o.status === 'no_cumple_requisitos')!
    const best = s0.result!.options.find((o) => o.status === 'priorizado_para_reconocimiento')!
    const s = withExplain(s0, { options: [{ site_id: best.site_id, key_requirement_ids: ['ex1'], evidence_ids: [] }], verification_ids: [] })
    expect(s.explain.status).toBe('done')
    const html = view(s)
    expect(html).toContain('AI-assisted interpretation')
    expect(html).toContain('claude-sonnet-5-5')
    // the blocked sector stays visible with its status and reason even if the AI did not select it
    expect(html).toContain(blocked.name.split(' · ')[0])
    expect(html).toMatch(/pl-opt no_cumple_requisitos/)
    expect(html).toContain('pl-blockers')
  })
  it('an AI failure shows a friendly message and leaves the result intact', () => {
    const s0 = base()
    const s = run(run(s0, { type: 'explain_start', requestId: 'exp-ui-3' }), { type: 'explain_fail', requestId: 'exp-ui-3', message: 'La IA no está disponible. Puede continuar manualmente.', unavailable: true })
    const html = view(s)
    expect(html).toContain('La IA no está disponible. Puede continuar manualmente.')
    expect(html).toContain('The calculated result did not change')
    expect(html).not.toContain('Interpretación asistida por IA')
    expect(html).not.toContain('Plantilla')
  })
  it('the printable report labels the AI draft and explanation only if they exist and are still current', () => {
    const s0 = base()
    const s = withExplain(s0, { options: [], verification_ids: [] })
    const html = view(s)
    expect(html.slice(html.indexOf('pl-print-only'))).toContain('AI interpretation: yes (claude-sonnet-5-5')
  })
})
