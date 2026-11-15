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

describe('entrada del planificador', () => {
  it('muestra las dos entradas principales desde el primer pantallazo y no autoevalúa nada', () => {
    const html = renderToStaticMarkup(<PlannerPanel snapshot={snapshot} intent={null} />)
    expect(html).toContain('Definir una prueba')
    expect(html).toContain('Evaluar un sector')
    expect(html).toContain('Primer perfil soportado: rover marciano')
    expect(html).not.toContain('pl-result')
    expect(html).not.toContain('Texto de su prueba') // sin recorrido elegido, no hay formularios largos
  })
})

describe('editor de requisitos', () => {
  const s = run(initialPlannerState(), { type: 'set_journey', journey: 'test' }, { type: 'load_example', example: exampleState() })
  it('ejemplo: pocos requisitos, sin medición rotulado, orígenes y citas distinguibles', () => {
    const html = renderToStaticMarkup(<RequirementEditor state={s} dispatch={noop} />)
    expect(html).toContain('Mediana de pendiente regional')
    expect(html).toContain('Imprescindible')
    expect(html).toContain('Preferencia')
    expect(html).toContain('sin medición')
    expect(html).toContain('nunca cuenta como cumplido')
    expect(html).toContain('Usted')
    expect(html).toContain('Cita del brief: «pendiente mediana regional no mayor de 3 grados»')
    expect(html).toContain('El cálculo usa solo los requisitos de esta lista')
    expect(html).toContain('Más opciones') // detalle progresivo
  })
  it('requisito de IA: etiqueta de origen y país CL/AR', () => {
    const ai = run(s, { type: 'add_requirement', requirement: { kind: 'measurable', requirement_id: 'c1', label: 'País', importance: 'critical', origin: 'ai', source_quote: 'solo Chile', metric_id: 'country', operator: 'in', valueText: ['', ''], countries: ['CL'], unit: 'iso_alpha2', scale: 'window' } })
    const html = renderToStaticMarkup(<RequirementEditor state={ai} dispatch={noop} />)
    expect(html).toContain('Propuesto por IA')
    expect(html).toContain('Chile (CL)')
    expect(html).toContain('Argentina (AR)')
  })
})

describe('selector de sector y coordenadas', () => {
  it('lista las siete áreas con país y REF, y muestra polígonos en SVG local', () => {
    const html = renderToStaticMarkup(<ScopePicker journey="sector" scope={{ ...emptyScope(), mode: 'sector', siteId: 'cl-win-s2500-w06970' }} candidates={snapshot.candidates} dispatch={noop} />)
    expect((html.match(/name="scope-sector"/g) ?? []).length).toBe(7)
    expect(html).toContain('Argentina')
    expect(html).toContain('REF')
    expect(html).toContain('<svg')
    expect(html).not.toContain('canvas')
  })
  it('coordenadas vacías o erróneas: avisos accesibles y sin NaN', () => {
    const html = renderToStaticMarkup(<ScopePicker journey="sector" scope={{ ...emptyScope(), mode: 'point', lon: 'abc', lat: '' }} candidates={snapshot.candidates} dispatch={noop} />)
    expect(html).toContain('role="alert"')
    expect(html).toContain('Longitud: escriba un número')
    expect(html).not.toContain('NaN')
  })
  it('punto dentro: sugiere la ventana con botón explícito; bbox parcial ofrece evaluar la ventana completa', () => {
    const point = renderToStaticMarkup(<ScopePicker journey="sector" scope={{ ...emptyScope(), mode: 'point', lon: '-69,7', lat: '-25' }} candidates={snapshot.candidates} dispatch={noop} />)
    expect(point).toContain('Hay evidencia de una ventana, no del punto')
    expect(point).toContain('Evaluar la ventana completa')
    const bbox = renderToStaticMarkup(<ScopePicker journey="test" scope={{ ...emptyScope(), mode: 'bbox', west: '-69,75', south: '-25,05', east: '-69,65', north: '-24,95' }} candidates={snapshot.candidates} dispatch={noop} />)
    expect(bbox).toContain('Cobertura parcial')
    expect(bbox).toContain('Evaluar la ventana completa')
    const out = renderToStaticMarkup(<ScopePicker journey="test" scope={{ ...emptyScope(), mode: 'point', lon: '10', lat: '10' }} candidates={snapshot.candidates} dispatch={noop} />)
    expect(out).toContain('Sin evidencia para esta geometría')
    expect(out).toContain('Fuera de las ventanas con evidencia')
  })
  it('la figura distingue pedida vs medida', () => {
    const res = resolveScope({ mode: 'bbox', bbox: [-69.75, -25.05, -69.65, -24.95], window_site_id: 'cl-win-s2500-w06970' }, snapshot.candidates)
    const html = renderToStaticMarkup(<GeometryFigure candidates={snapshot.candidates} resolution={res} />)
    expect(html).toContain('pl-req')
    expect(html).toContain('measured')
  })
})

describe('resultado', () => {
  it('muestra veredicto, bloqueos visibles, comparabilidad parcial, Yungay REF, puntajes originales y reglas', () => {
    const s = evaluatedState()
    const html = view(s)
    expect(html).toContain('áreas quedan priorizadas para reconocimiento')
    expect(html).toContain('Comparación parcial')
    expect(html).toContain('REF · referencia conocida')
    expect(html).toContain('Valores originales del snapshot v3, sin recalcular')
    expect(html).toContain('La similitud no es probabilidad de éxito')
    expect(html).toContain('Factibilidad territorial')
    expect(html).toContain('Cómo se ordena')
    expect(html).toContain('No evaluable')
    expect(html).toContain('Verificaciones de campo')
    expect(html).not.toMatch(/\bapto\b|sector aprobado|aprobado el sector|seguro para|autorizado para/i)
  })
  it('cero recomendados es un resultado válido y los motivos quedan visibles sin abrir detalles', () => {
    const s = evaluatedState([{ type: 'update_requirement', id: 'ex1', patch: { valueText: ['0,001', ''] } }])
    expect(s.result?.recommended_site_ids).toEqual([])
    const html = view(s)
    expect(html).toContain('Ninguna área queda priorizada')
    expect(html).toContain('No cumple requisitos')
    expect(html).toContain('pl-blockers')
    expect(html).toMatch(/No cumple<\/b> Mediana de pendiente regional: Valor observado/)
  })
  it('diagnóstico fuera de cobertura: informe exportable, sin vecino ni recomendación', () => {
    const s = evaluatedState([], { ...emptyScope(), mode: 'point', lon: '10', lat: '10' })
    expect(s.result?.outcome).toBe('insufficient_coverage')
    const html = view(s)
    expect(html).toContain('Informe de evidencia insuficiente')
    expect(html).toContain('Fuentes previstas')
    expect(html).toContain('No se estimó nada con ventanas vecinas')
    expect(html).not.toContain('pl-rank')
  })
  it('objetivo no soportado: sin cálculo ni recomendación', () => {
    const s = evaluatedState([{ type: 'set_target', target: { kind: 'other', stated: 'Hábitat lunar' } }])
    const html = view(s)
    expect(html).toContain('Este objetivo no tiene un perfil soportado')
    expect(html).toContain('Hábitat lunar')
    expect(html).toContain('Objetivo no soportado')
  })
  it('informe imprimible conserva el brief entero, requisitos, origen/cita, límites y procedencia', () => {
    const s = evaluatedState()
    const html = view(s)
    const print = html.slice(html.indexOf('pl-print-only'))
    expect(print).toContain('Texto completo del brief')
    expect(print).toContain(s.brief)
    expect(print).toContain('pendiente mediana regional no mayor de 3 grados')
    expect(print).toContain('Borrador con IA: no')
    expect(print).toContain('Interpretación con IA: no')
    expect(print).toContain('Límites')
  })
})

describe('IA en el resultado: separada de las métricas y sin falsas atribuciones', () => {
  const base = () => evaluatedState()
  const withExplain = (s: PlannerState, selection: Parameters<typeof plannerReducer>[1] extends infer A ? A extends { type: 'explain_ok'; selection: infer S } ? S : never : never): PlannerState => {
    const started = run(s, { type: 'explain_start', requestId: 'exp-ui-1' })
    return run(started, { type: 'explain_ok', requestId: 'exp-ui-1', requestFp: s.result!.request_fingerprint, evaluationFp: started.explain.evaluationFp!, selection, provenance: prov })
  }
  it('avisa del envío a Anthropic junto al botón y bloquea durante la llamada', () => {
    const s = base()
    expect(view(s)).toContain('se envían a Anthropic')
    const pending = view(run(s, { type: 'explain_start', requestId: 'exp-ui-2' }))
    expect(pending).toContain('Consultando a la IA')
    expect(pending).toMatch(/<button[^>]*disabled[^>]*aria-busy="true"/)
  })
  it('una selección que omite los bloqueos no los oculta; el motor sigue mandando', () => {
    const s0 = evaluatedState([{ type: 'update_requirement', id: 'ex1', patch: { valueText: ['2,2', ''] } }])
    const blocked = s0.result!.options.find((o) => o.status === 'no_cumple_requisitos')!
    const best = s0.result!.options.find((o) => o.status === 'priorizado_para_reconocimiento')!
    const s = withExplain(s0, { options: [{ site_id: best.site_id, key_requirement_ids: ['ex1'], evidence_ids: [] }], verification_ids: [] })
    expect(s.explain.status).toBe('done')
    const html = view(s)
    expect(html).toContain('Interpretación asistida por IA')
    expect(html).toContain('claude-sonnet-5-5')
    // el sector bloqueado sigue visible con su estado y razón aunque la IA no lo haya seleccionado
    expect(html).toContain(blocked.name.split(' · ')[0])
    expect(html).toMatch(/pl-opt no_cumple_requisitos/)
    expect(html).toContain('pl-blockers')
  })
  it('un fallo de IA muestra mensaje amable y deja el resultado intacto', () => {
    const s0 = base()
    const s = run(run(s0, { type: 'explain_start', requestId: 'exp-ui-3' }), { type: 'explain_fail', requestId: 'exp-ui-3', message: 'La IA no está disponible. Puede continuar manualmente.', unavailable: true })
    const html = view(s)
    expect(html).toContain('La IA no está disponible. Puede continuar manualmente.')
    expect(html).toContain('El resultado calculado no cambió')
    expect(html).not.toContain('Interpretación asistida por IA')
    expect(html).not.toContain('Plantilla')
  })
  it('el informe imprimible rotula el borrador y la explicación de IA solo si existen y siguen vigentes', () => {
    const s0 = base()
    const s = withExplain(s0, { options: [], verification_ids: [] })
    const html = view(s)
    expect(html.slice(html.indexOf('pl-print-only'))).toContain('Interpretación con IA: sí (claude-sonnet-5-5')
  })
})
