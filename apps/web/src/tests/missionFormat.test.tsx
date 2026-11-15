import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ConfirmSummary } from '../components/planner/ConfirmSummary'
import { RequirementEditor } from '../components/planner/RequirementEditor'
import { ResultView } from '../components/planner/ResultView'
import { ScopePicker } from '../components/planner/ScopePicker'
import { assertSnapshotContracts, type CandidateSite, type DataManifest, type MissionProfile } from '../domain/contracts'
import {
  buildMissionExport, buildRequest, describeCondition, describeEditable, describeScope, emptyScope, evaluateMission, exampleState,
  fmtNumber, fmtObserved, fmtQuantity, initialPlannerState, plannerReducer, resolveScope, type EvidenceBundle, type PlannerAction, type PlannerState,
} from '../mission'

const root = resolve(__dirname, '../../../..')
const read = (p: string): unknown => JSON.parse(readFileSync(resolve(root, p), 'utf8'))
const candidates = read('artifacts/science-v3/candidate-details.json')
const manifest = read('artifacts/science-v3/manifest.json')
const profile = read('artifacts/science-v3/mission-profile.json')
assertSnapshotContracts(candidates, manifest, profile)
const bundle: EvidenceBundle = { candidates, manifest: manifest as DataManifest, profile: profile as MissionProfile }
const noop = () => undefined
const run = (s: PlannerState, ...a: PlannerAction[]) => a.reduce(plannerReducer, s)
const base = (...extra: PlannerAction[]) => run(initialPlannerState(), { type: 'set_journey', journey: 'test' }, { type: 'load_example', example: exampleState() }, ...extra)
const evaluate = (s: PlannerState) => {
  const c = run(s, { type: 'confirm' })
  return run(c, { type: 'evaluated', evaluation: evaluateMission(buildRequest(c).request!, bundle) })
}
const view = (s: PlannerState) =>
  renderToStaticMarkup(<ResultView evaluation={s.result!} request={buildRequest(s).request!} state={s} candidates={candidates as CandidateSite[]} onExplain={noop} onExport={noop} exportError={null} onEdit={noop} />)

describe('human, deterministic formatting', () => {
  it('en-US numbers without adding precision or rounding destructively', () => {
    expect(fmtNumber(2.3)).toBe('2.3')
    expect(fmtNumber(3.563)).toBe('3.563')
    expect(fmtNumber(1234)).toBe('1,234')
    expect(fmtNumber(12345.5)).toBe('12,345.5')
    expect(fmtNumber(-69.7)).toBe('-69.7')
    expect(fmtNumber(0.1 + 0.2)).toBe('0.30000000000000004') // shorter representation: precision is neither invented nor hidden
    expect(fmtNumber(Number.NaN)).toBe('—')
    expect(fmtNumber(1e-13)).toBe('1e-13')
    expect(fmtNumber(1.2e-13)).toBe('1.2e-13')
    expect(fmtNumber(1e21)).toBe('1e+21')
  })
  it('human units: °, m, %, km², fraction', () => {
    expect(fmtQuantity(2.3, 'degree')).toBe('2.3°')
    expect(fmtQuantity(11.291, 'meter')).toBe('11.291 m')
    expect(fmtQuantity(95, 'percent')).toBe('95%')
    expect(fmtQuantity(447.3, 'km2')).toBe('447.3 km²')
    expect(fmtObserved(1, 'ratio')).toBe('1 (fraction 0–1; 100%)')
    expect(fmtObserved(0.9876, 'ratio')).toBe('0.9876 (fraction 0–1; 98.76%)')
    expect(fmtObserved('CL', 'iso_alpha2')).toBe('CL')
    expect(describeCondition({ operator: 'between', value: [1, 5], unit: 'meter' })).toBe('between 1 and 5 m')
    expect(describeCondition({ operator: 'in', value: ['CL', 'AR'], unit: 'iso_alpha2' })).toBe('one of CL, AR')
  })
  it('engine reasons use human units and explain threshold and observed value; the JSON keeps the canonical unit', () => {
    const s = evaluate(base({ type: 'update_requirement', id: 'ex1', patch: { valueText: ['2,3', ''] } }))
    const r = s.result!.options.find((o) => o.site_id === 'cl-win-s2500-w06970')!.requirement_results[0]
    expect(r.reason).toBe('Observed value 2.169° meets the condition ≤ 2.3°.')
    expect(r.observed_unit).toBe('degree')
    expect(r.observed_value).toBe(2.169)
    const no = s.result!.options.find((o) => o.status === 'no_cumple_requisitos')!
    expect(no.requirement_results[0].reason).toMatch(/^Observed value [\d.,]+° does not meet the condition ≤ 2\.3°\.$/)
    expect(no.what_would_change[0]).toMatch(/observed [\d.,]+°\./)
    for (const o of s.result!.options) for (const q of o.requirement_results) expect(q.reason + q.required).not.toMatch(/\b(degree|meter|ratio|percent|km2)\b/)
    const doc = buildMissionExport(buildRequest(s).request!, s.result!, bundle) as { request: { requirements: Array<{ value: unknown; unit: string }> } }
    expect(doc.request.requirements[0]).toMatchObject({ value: 2.3, unit: 'degree' })
  })
  it('percentage: threshold in % and observed as a fraction with the visible equivalence', () => {
    const s = evaluate(base())
    const q = s.result!.options[0].requirement_results.find((x) => x.requirement_id === 'ex2')!
    expect(q.required).toContain('≥ 95%')
    expect(q.required).toContain('Full window (~20 km)')
    expect(q.reason).toMatch(/fraction 0–1; [\d.,]+%\)/)
  })
  it('the data request note says “This version”, not M8', () => {
    const s = evaluate(base({ type: 'set_scope', scope: { ...emptyScope(), mode: 'point', lon: '10', lat: '10' } }))
    expect(s.result!.data_request!.note).toContain('This version does not acquire new data')
    expect(JSON.stringify(s.result!.data_request!.note)).not.toContain('M8')
  })
})

describe('confirmation: effective conditions', () => {
  it('shows threshold, unit, scale and importance even if the brief keeps the old value', () => {
    const s = base({ type: 'update_requirement', id: 'ex1', patch: { valueText: ['2,3', ''] } })
    expect(s.brief).toContain('3 degrees') // the brief still shows the old value
    const html = renderToStaticMarkup(<ConfirmSummary state={s} candidates={candidates as CandidateSite[]} />)
    expect(html).toContain('Regional median slope: ≤ 2.3° · Full window (~20 km) (must-have)')
    expect(html).toContain('Non-vegetated fraction: ≥ 95% · Full window (~20 km) (preference)')
    expect(html).toContain('Traction: not measured')
    expect(html).toContain('uses exactly these conditions, not the numbers that appear in the brief text')
    expect(html).toContain('The seven snapshot windows with evidence')
  })
  it('explicit requested geometry and incomplete values flagged without NaN', () => {
    const s = base({ type: 'set_scope', scope: { ...emptyScope(), mode: 'point', lon: '-69,7', lat: '-25' } }, { type: 'update_requirement', id: 'ex1', patch: { valueText: ['abc', ''] } })
    const html = renderToStaticMarkup(<ConfirmSummary state={s} candidates={candidates as CandidateSite[]} />)
    expect(html).toContain('Point: longitude -69.7, latitude -25')
    expect(html).toContain('incomplete (typed: abc)')
    expect(html).not.toContain('NaN')
    expect(describeEditable(s.requirements[0])).toContain('incomplete')
  })
})

describe('informe impreso autosuficiente', () => {
  const printOf = (s: PlannerState) => { const h = view(s); return h.slice(h.indexOf('pl-print-only')) }
  it('without options (out of coverage) keeps thresholds, units, scale and requested geometry', () => {
    const s = evaluate(base({ type: 'update_requirement', id: 'ex1', patch: { valueText: ['2,3', ''] } }, { type: 'set_scope', scope: { ...emptyScope(), mode: 'bbox', west: '10', south: '10', east: '11', north: '11' } }))
    expect(s.result!.options).toEqual([])
    const p = printOf(s)
    expect(p).toContain('Effective condition')
    expect(p).toContain('≤ 2.3° · Full window (~20 km)')
    expect(p).toContain('≥ 95% · Full window (~20 km)')
    expect(p).toContain('Not measured')
    expect(p).toContain('Rectangle: west 10, south 10, east 11, north 11')
    expect(p).toContain('No measured geometry')
    expect(p).toContain('This version does not acquire new data')
    expect(p).toContain(s.brief)
  })
  it('with a chosen window: explicit requested and measured geometry with bbox and area', () => {
    const s = evaluate(base({ type: 'set_scope', scope: { ...emptyScope(), mode: 'bbox', west: '-69,75', south: '-25,05', east: '-69,65', north: '-24,95', windowSiteId: 'cl-win-s2500-w06970' } }))
    const p = printOf(s)
    expect(p).toContain('Rectangle: west -69.75, south -25.05, east -69.65, north -24.95')
    expect(p).toMatch(/approximate area [\d.,]+ km²/)
    expect(p).toContain('west -69.8, south -25.1, east -69.6, north -24.9')
    expect(p).toMatch(/polygon extent ≈ 447\.3 km² \(not free surface\)/)
    expect(p).toContain('contains your rectangle')
  })
  it('the results table also uses human units', () => {
    const s = evaluate(base())
    const html = view(s)
    expect(html).toContain('2.169°')
    expect(html).not.toMatch(/>\s*[\d.,]+ degree\s*</)
    expect(html).not.toMatch(/\b\d+(\.\d+)? meter\b/)
  })
})

describe('product microcopy', () => {
  it('no user surface says “M8”', () => {
    const s = evaluate(base({ type: 'set_scope', scope: { ...emptyScope(), mode: 'point', lon: '10', lat: '10' } }))
    const htmls = [
      view(s),
      renderToStaticMarkup(<ScopePicker journey="test" scope={{ ...emptyScope(), mode: 'point', lon: '10', lat: '10' }} candidates={candidates as CandidateSite[]} dispatch={noop} />),
      renderToStaticMarkup(<RequirementEditor state={base()} dispatch={noop} />),
    ]
    for (const h of htmls) expect(h).not.toMatch(/\bM8\b/)
    expect(htmls[1]).toContain('This version does not download new data')
  })
  it('scale selector: “Whole window (~20 km)” and no “median” in the generic label', () => {
    const html = renderToStaticMarkup(<RequirementEditor state={base()} dispatch={noop} />)
    expect(html).toContain('>Full window (~20 km)</option>')
    expect(html).not.toContain('Median over the full window (~20 km)')
    // country and area do not mention the median in their scale note
    const withCountry = run(base(), { type: 'add_requirement', requirement: { kind: 'measurable', requirement_id: 'c1', label: 'País', importance: 'critical', origin: 'user', source_quote: null, metric_id: 'country', operator: 'in', valueText: ['', ''], countries: ['CL'], unit: 'iso_alpha2', scale: 'window' } })
    expect(renderToStaticMarkup(<RequirementEditor state={withCountry} dispatch={noop} />)).toContain('Polygon attribute in the snapshot.')
  })
  it('the hero prioritizes reconnaissance and does not promise measured traction', () => {
    const app = readFileSync(resolve(root, 'apps/web/src/App.tsx'), 'utf8')
    expect(app).toContain('Prioritizes which sectors deserve reconnaissance for a rover test')
    expect(app).toContain('It does not measure traction or approve terrain')
    expect(app).not.toContain('best reproduces conditions')
  })
  it('describeScope offers self-sufficient text for sector and catalog', () => {
    const res = resolveScope({ mode: 'sector', site_id: 'cl-win-s2500-w06970' }, candidates as CandidateSite[])
    const lines = describeScope(res, (id) => id)
    expect(lines.requested).toMatch(/^Rectangle: west -69\.8, south -25\.1, east -69\.6, north -24\.9/)
    expect(lines.measured[0]).toContain('447.3 km²')
  })
})
