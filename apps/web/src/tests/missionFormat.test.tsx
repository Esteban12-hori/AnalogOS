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

describe('formateo humano y determinista', () => {
  it('números es-CL sin añadir precisión ni redondear destructivamente', () => {
    expect(fmtNumber(2.3)).toBe('2,3')
    expect(fmtNumber(3.563)).toBe('3,563')
    expect(fmtNumber(1234)).toBe('1234')
    expect(fmtNumber(12345.5)).toBe('12.345,5')
    expect(fmtNumber(-69.7)).toBe('-69,7')
    expect(fmtNumber(0.1 + 0.2)).toBe('0,30000000000000004') // representación más corta: no se inventa ni se oculta precisión
    expect(fmtNumber(Number.NaN)).toBe('—')
    expect(fmtNumber(1e-13)).toBe('1e-13')
    expect(fmtNumber(1.2e-13)).toBe('1,2e-13')
    expect(fmtNumber(1e21)).toBe('1e+21')
  })
  it('unidades humanas: °, m, %, km², fracción', () => {
    expect(fmtQuantity(2.3, 'degree')).toBe('2,3°')
    expect(fmtQuantity(11.291, 'meter')).toBe('11,291 m')
    expect(fmtQuantity(95, 'percent')).toBe('95 %')
    expect(fmtQuantity(447.3, 'km2')).toBe('447,3 km²')
    expect(fmtObserved(1, 'ratio')).toBe('1 (fracción 0–1; 100 %)')
    expect(fmtObserved(0.9876, 'ratio')).toBe('0,9876 (fracción 0–1; 98,76 %)')
    expect(fmtObserved('CL', 'iso_alpha2')).toBe('CL')
    expect(describeCondition({ operator: 'between', value: [1, 5], unit: 'meter' })).toBe('entre 1 y 5 m')
    expect(describeCondition({ operator: 'in', value: ['CL', 'AR'], unit: 'iso_alpha2' })).toBe('uno de CL, AR')
  })
  it('las razones del motor usan unidades humanas y explican umbral y valor observado; el JSON conserva la unidad canónica', () => {
    const s = evaluate(base({ type: 'update_requirement', id: 'ex1', patch: { valueText: ['2,3', ''] } }))
    const r = s.result!.options.find((o) => o.site_id === 'cl-win-s2500-w06970')!.requirement_results[0]
    expect(r.reason).toBe('Valor observado 2,169° cumple la condición ≤ 2,3°.')
    expect(r.observed_unit).toBe('degree')
    expect(r.observed_value).toBe(2.169)
    const no = s.result!.options.find((o) => o.status === 'no_cumple_requisitos')!
    expect(no.requirement_results[0].reason).toMatch(/^Valor observado [\d.,]+° no cumple la condición ≤ 2,3°\.$/)
    expect(no.what_would_change[0]).toMatch(/observado [\d.,]+°\./)
    for (const o of s.result!.options) for (const q of o.requirement_results) expect(q.reason + q.required).not.toMatch(/\b(degree|meter|ratio|percent|km2)\b/)
    const doc = buildMissionExport(buildRequest(s).request!, s.result!, bundle) as { request: { requirements: Array<{ value: unknown; unit: string }> } }
    expect(doc.request.requirements[0]).toMatchObject({ value: 2.3, unit: 'degree' })
  })
  it('porcentaje: umbral en % y observado en fracción con la equivalencia visible', () => {
    const s = evaluate(base())
    const q = s.result!.options[0].requirement_results.find((x) => x.requirement_id === 'ex2')!
    expect(q.required).toContain('≥ 95 %')
    expect(q.required).toContain('Ventana completa (~20 km)')
    expect(q.reason).toMatch(/fracción 0–1; [\d.,]+ %\)/)
  })
  it('la nota de la solicitud de datos dice «Esta versión», no M8', () => {
    const s = evaluate(base({ type: 'set_scope', scope: { ...emptyScope(), mode: 'point', lon: '10', lat: '10' } }))
    expect(s.result!.data_request!.note).toContain('Esta versión no adquiere datos nuevos')
    expect(JSON.stringify(s.result!.data_request!.note)).not.toContain('M8')
  })
})

describe('confirmación: condiciones efectivas', () => {
  it('muestra umbral, unidad, escala e importancia aunque el brief conserve el valor antiguo', () => {
    const s = base({ type: 'update_requirement', id: 'ex1', patch: { valueText: ['2,3', ''] } })
    expect(s.brief).toContain('3 grados') // el brief sigue mostrando el valor antiguo
    const html = renderToStaticMarkup(<ConfirmSummary state={s} candidates={candidates as CandidateSite[]} />)
    expect(html).toContain('Mediana de pendiente regional: ≤ 2,3° · Ventana completa (~20 km) (imprescindible)')
    expect(html).toContain('Fracción no vegetada: ≥ 95 % · Ventana completa (~20 km) (preferencia)')
    expect(html).toContain('Tracción: sin medición')
    expect(html).toContain('usa exactamente estas condiciones, no los números que aparezcan en el texto del brief')
    expect(html).toContain('Las siete ventanas con evidencia')
  })
  it('geometría pedida explícita y valores incompletos señalados sin NaN', () => {
    const s = base({ type: 'set_scope', scope: { ...emptyScope(), mode: 'point', lon: '-69,7', lat: '-25' } }, { type: 'update_requirement', id: 'ex1', patch: { valueText: ['abc', ''] } })
    const html = renderToStaticMarkup(<ConfirmSummary state={s} candidates={candidates as CandidateSite[]} />)
    expect(html).toContain('Punto: longitud -69,7, latitud -25')
    expect(html).toContain('incompleto (escrito: abc)')
    expect(html).not.toContain('NaN')
    expect(describeEditable(s.requirements[0])).toContain('incompleto')
  })
})

describe('informe impreso autosuficiente', () => {
  const printOf = (s: PlannerState) => { const h = view(s); return h.slice(h.indexOf('pl-print-only')) }
  it('sin opciones (fuera de cobertura) conserva umbrales, unidades, escala y geometría pedida', () => {
    const s = evaluate(base({ type: 'update_requirement', id: 'ex1', patch: { valueText: ['2,3', ''] } }, { type: 'set_scope', scope: { ...emptyScope(), mode: 'bbox', west: '10', south: '10', east: '11', north: '11' } }))
    expect(s.result!.options).toEqual([])
    const p = printOf(s)
    expect(p).toContain('Condición efectiva')
    expect(p).toContain('≤ 2,3° · Ventana completa (~20 km)')
    expect(p).toContain('≥ 95 % · Ventana completa (~20 km)')
    expect(p).toContain('Sin medición')
    expect(p).toContain('Rectángulo: oeste 10, sur 10, este 11, norte 11')
    expect(p).toContain('Sin geometría medida')
    expect(p).toContain('Esta versión no adquiere datos nuevos')
    expect(p).toContain(s.brief)
  })
  it('con ventana elegida: geometría pedida y medida explícitas con bbox y área', () => {
    const s = evaluate(base({ type: 'set_scope', scope: { ...emptyScope(), mode: 'bbox', west: '-69,75', south: '-25,05', east: '-69,65', north: '-24,95', windowSiteId: 'cl-win-s2500-w06970' } }))
    const p = printOf(s)
    expect(p).toContain('Rectángulo: oeste -69,75, sur -25,05, este -69,65, norte -24,95')
    expect(p).toMatch(/área aproximada [\d.,]+ km²/)
    expect(p).toContain('oeste -69,8, sur -25,1, este -69,6, norte -24,9')
    expect(p).toMatch(/extensión del polígono ≈ 447,3 km² \(no es superficie libre\)/)
    expect(p).toContain('contiene su rectángulo')
  })
  it('la tabla de resultados también usa unidades humanas', () => {
    const s = evaluate(base())
    const html = view(s)
    expect(html).toContain('2,169°')
    expect(html).not.toMatch(/>\s*[\d.,]+ degree\s*</)
    expect(html).not.toMatch(/\b\d+(,\d+)? meter\b/)
  })
})

describe('microcopia de producto', () => {
  it('ninguna superficie de usuario dice «M8»', () => {
    const s = evaluate(base({ type: 'set_scope', scope: { ...emptyScope(), mode: 'point', lon: '10', lat: '10' } }))
    const htmls = [
      view(s),
      renderToStaticMarkup(<ScopePicker journey="test" scope={{ ...emptyScope(), mode: 'point', lon: '10', lat: '10' }} candidates={candidates as CandidateSite[]} dispatch={noop} />),
      renderToStaticMarkup(<RequirementEditor state={base()} dispatch={noop} />),
    ]
    for (const h of htmls) expect(h).not.toMatch(/\bM8\b/)
    expect(htmls[1]).toContain('Esta versión no descarga datos nuevos')
  })
  it('selector de escala: «Ventana completa (~20 km)» y sin decir «mediana» en la etiqueta genérica', () => {
    const html = renderToStaticMarkup(<RequirementEditor state={base()} dispatch={noop} />)
    expect(html).toContain('>Ventana completa (~20 km)</option>')
    expect(html).not.toContain('Mediana de la ventana completa (~20 km)')
    // país y área no hablan de mediana en su nota de escala
    const withCountry = run(base(), { type: 'add_requirement', requirement: { kind: 'measurable', requirement_id: 'c1', label: 'País', importance: 'critical', origin: 'user', source_quote: null, metric_id: 'country', operator: 'in', valueText: ['', ''], countries: ['CL'], unit: 'iso_alpha2', scale: 'window' } })
    expect(renderToStaticMarkup(<RequirementEditor state={withCountry} dispatch={noop} />)).toContain('Atributo del polígono en el snapshot.')
  })
  it('el hero prioriza reconocimiento y no promete tracción medida', () => {
    const app = readFileSync(resolve(root, 'apps/web/src/App.tsx'), 'utf8')
    expect(app).toContain('Prioriza qué sectores merecen reconocimiento para un ensayo de rover')
    expect(app).toContain('No mide tracción ni aprueba terreno')
    expect(app).not.toContain('reproduce mejor condiciones')
  })
  it('describeScope ofrece texto autosuficiente para sector y catálogo', () => {
    const res = resolveScope({ mode: 'sector', site_id: 'cl-win-s2500-w06970' }, candidates as CandidateSite[])
    const lines = describeScope(res, (id) => id)
    expect(lines.requested).toMatch(/^Rectángulo: oeste -69,8, sur -25,1, este -69,6, norte -24,9/)
    expect(lines.measured[0]).toContain('447,3 km²')
  })
})
