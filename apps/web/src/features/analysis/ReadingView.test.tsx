// La Lectura integrada (ADR-013) renderizada con react-dom/server: en Explorar solo hechos
// deterministas (sin ✦); en Misión, tres capas separadas — resultado, motivos destacados (plantilla
// o IA del equipo) y hechos —, con el botón explícito de IA y su aviso literal de envío.
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { ResultView } from '../../components/planner/ResultView'
import { composeExplanation, deterministicSelection, plannerReducer } from '../../mission'
import type { AppData } from '../../shell/public'
import { composerStore, initialComposerState } from '../composer/composerStore'
import { INITIAL_MISSION_STATE, missionStore } from '../../state/mission'
import { uiStore } from '../../state/ui'
import { evaluateExample, readyData } from '../../tests/v3Support'
import {
  AI_SEND_NOTICE,
  AI_SEND_NOTICE_GEOLOGY,
  GEOLOGY_OPT_LABEL,
  GEOLOGY_RETRY_LABEL,
  GEOLOGY_RETRY_NOTICE,
  GEOLOGY_WHERE,
  geologyUnavailableNotice,
} from './explanationToReading'
import { ReadingSkeleton } from './ReadingPanel'
import { ReadingPill } from './ReadingPill'
import ReadingView from './ReadingView'

const render = (data: AppData = readyData) => renderToStaticMarkup(<ReadingView data={data} placement="panel" />)
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

afterEach(() => {
  missionStore.reset()
  uiStore.reset()
  composerStore.setState(initialComposerState())
})

function publish(state: ReturnType<typeof evaluateExample>['state'], source: 'deterministic_template' | 'anthropic' = 'deterministic_template') {
  const evaluation = state.result!
  const explanation = composeExplanation(evaluation, source === 'anthropic' ? state.explain.record!.selection : deterministicSelection(evaluation), source)
  const explanationProvenance = source === 'anthropic' ? state.explain.record!.provenance : null
  missionStore.setState({ ...INITIAL_MISSION_STATE, planner: state, evaluation, explanation, explanationProvenance, revision: 1 })
  uiStore.setState({ mode: 'mision', missionPhase: 'done' })
}

describe('ReadingView', () => {
  it('Explorar: «Lectura determinista» con hechos del snapshot, sin ✦ ni botón de IA', () => {
    const html = render()
    expect(html).toContain('Lectura determinista')
    expect(html).toContain('Hechos del snapshot')
    expect(html).not.toContain('✦')
    expect(html).not.toContain('Destacar motivos con IA')
    expect(text(html)).toContain('#1 de 6')
    expect(text(html)).toContain('REF')
  })

  it('Misión sin evaluar: aviso y solo hechos; la IA no se ofrece', () => {
    uiStore.setState({ mode: 'mision', missionPhase: 'review' })
    const html = render()
    expect(html).toContain('Sin evaluación')
    expect(html).not.toContain('Destacar motivos con IA')
  })

  it('Misión evaluada: tres capas separadas, plantilla rotulada sin ✦ y botón de IA con su aviso literal', () => {
    publish(evaluateExample().state)
    const html = render()
    expect(html).toContain('Lectura de tu misión')
    expect(html).toContain('Resultado')
    expect(html).toContain('Cálculo determinista · reglas mission-rules-1.0.0 · similitud v3 sin recalcular')
    expect(html).toContain('Motivos destacados')
    expect(html).toContain('Plantilla determinista sin IA')
    expect(html).toContain('Hechos del snapshot')
    expect(html).toContain('Destacar motivos con IA')
    // Aviso del equipo (M10): sin canal geológico tampoco se envía cartografía.
    expect(html).toContain('Al pulsar el botón se envían a Anthropic los requisitos confirmados y los resultados ya calculados (no el texto completo del brief ni cartografía geológica).')
    // El único ✦ es el del botón: ningún bloque se presenta como redactado por la IA.
    expect(html.match(/✦/g)).toHaveLength(1)
  })

  it('con la selección de Anthropic aceptada por el reductor: ✦ y procedencia', () => {
    const { state } = evaluateExample()
    const started = plannerReducer(state, { type: 'explain_start', requestId: 'exp-1' })
    const accepted = plannerReducer(started, {
      type: 'explain_ok', requestId: 'exp-1', requestFp: started.explain.requestFp!, evaluationFp: started.explain.evaluationFp!,
      selection: deterministicSelection(state.result!),
      provenance: { provider: 'anthropic', model: 'claude-sonnet-5-5', request_id: 'req_ui', created_at: '2026-11-14T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' },
    })
    expect(accepted.explain.status).toBe('done')
    publish(accepted, 'anthropic')
    const html = render()
    expect(html).toContain('Motivos destacados con IA (Anthropic) · las cifras salen del cálculo determinista')
    expect(html).toContain('claude-sonnet-5-5 · 2026-11-14 · req_ui')
    expect(html).toContain('Pedir otra selección a la IA')
    // Un solo ✦ delante del rótulo (antes salía «✦ ✦ Motivos destacados con IA»).
    expect(text(html)).not.toMatch(/✦\s*✦/)
  })

  it('selección de la IA vacía: no dice que todo se cumple y lista los lugares sin motivos', () => {
    const { state } = evaluateExample()
    const started = plannerReducer(state, { type: 'explain_start', requestId: 'exp-e' })
    const accepted = plannerReducer(started, {
      type: 'explain_ok', requestId: 'exp-e', requestFp: started.explain.requestFp!, evaluationFp: started.explain.evaluationFp!,
      selection: { options: [], verification_ids: [] },
      provenance: { provider: 'anthropic', model: 'claude-x', request_id: 'req_ui', created_at: '2026-11-14T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' },
    })
    expect(accepted.explain.status).toBe('done')
    publish(accepted, 'anthropic')
    const html = text(render())
    const unmet = state.result!.options.filter((option) => option.requirement_results.some((result) => result.status !== 'cumple'))
    expect(html).not.toContain('Todos los requisitos se cumplen')
    expect(html).toContain(`La IA no destacó motivos para ${unmet.length} lugares; los bloqueos del cálculo están en «Resultado».`)
    expect(html).toContain('sin motivos destacados por la IA')
  })

  it('tras editar, la Lectura atenuada conserva la procedencia de la IA', () => {
    const { state } = evaluateExample()
    const started = plannerReducer(state, { type: 'explain_start', requestId: 'exp-s' })
    const accepted = plannerReducer(started, {
      type: 'explain_ok', requestId: 'exp-s', requestFp: started.explain.requestFp!, evaluationFp: started.explain.evaluationFp!,
      selection: deterministicSelection(state.result!),
      provenance: { provider: 'anthropic', model: 'claude-y', request_id: 'req_stale', created_at: '2026-11-14T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' },
    })
    publish(accepted, 'anthropic')
    // El reductor invalida el resultado al editar; el controlador deja la vista atenuada (stale).
    const edited = plannerReducer(accepted, { type: 'set_brief', brief: 'otra prueba' })
    expect(edited.explain.record).toBeNull()
    missionStore.setState({ planner: edited, stale: true })
    const html = render()
    expect(html).toContain('Editó la prueba')
    expect(html).toContain('claude-y · 2026-11-14 · req_stale')
  })

  it('respuesta que no corresponde al cálculo vigente: se descarta y queda la plantilla', () => {
    const { state } = evaluateExample()
    const started = plannerReducer(state, { type: 'explain_start', requestId: 'exp-2' })
    const discarded = plannerReducer(started, {
      type: 'explain_ok', requestId: 'exp-2', requestFp: 'f'.repeat(64), evaluationFp: started.explain.evaluationFp!, selection: deterministicSelection(state.result!),
      provenance: { provider: 'anthropic', model: 'x', request_id: null, created_at: '2026-11-14T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' },
    })
    expect(discarded.explain.status).toBe('error')
    publish(discarded)
    const html = render()
    expect(html).toContain('La respuesta no corresponde al cálculo vigente: se mantiene la plantilla determinista.')
    expect(html).toContain('Plantilla determinista sin IA')
  })

  it('IA no disponible (sin clave o ZIP): mensaje del cliente y la plantilla sigue siendo la Lectura', () => {
    const { state } = evaluateExample()
    const started = plannerReducer(state, { type: 'explain_start', requestId: 'exp-3' })
    const unavailable = plannerReducer(started, { type: 'explain_fail', requestId: 'exp-3', message: 'La asistencia de IA no está disponible en este momento o en esta versión.', unavailable: true })
    publish(unavailable)
    const html = render()
    expect(html).toContain('no está disponible')
    expect(html).toContain('La plantilla determinista sigue siendo la Lectura')
  })

  it('alcance sin evidencia: no se ofrece la IA y el diagnóstico va en el resultado', () => {
    publish(evaluateExample({ mode: 'point', siteId: '', lon: '10', lat: '10', west: '', south: '', east: '', north: '', windowSiteId: null }).state)
    const html = render()
    expect(html).not.toContain('Destacar motivos con IA')
    expect(html).toContain('Esta versión no adquiere datos nuevos')
  })

  it('sin snapshot: espera neutra, sin cifras', () => {
    expect(render({ status: 'loading', snapshot: null, visual: { status: 'loading' }, error: null })).toContain('Esperando el snapshot validado')
  })
})

describe('ReadingView · canal geológico de la IA (M10 del equipo)', () => {
  const html = () => text(render())
  const available = () => composerStore.setState({ geology: { available: true, unavailableReason: null } })

  it('sin contexto geológico: aviso sin cartografía y motivo de «no disponible», sin casilla', () => {
    publish(evaluateExample().state)
    composerStore.setState({ geology: { available: false, unavailableReason: 'No se encontró el paquete geológico de esta versión.' } })
    const out = html()
    expect(out).toContain(AI_SEND_NOTICE)
    expect(out).not.toContain(AI_SEND_NOTICE_GEOLOGY)
    expect(out).toContain('Orientación geológica con IA no disponible: No se encontró el paquete geológico de esta versión. La explicación de requisitos funciona igual sin geología.')
    expect(render()).not.toContain('type="checkbox"')
  })

  it('con contexto: casilla activa por defecto y UN solo aviso, el del envío con objetivo y cartografía', () => {
    publish(evaluateExample().state)
    available()
    const markup = render()
    expect(markup).toContain('type="checkbox"')
    expect(markup).toMatch(/type="checkbox"[^>]*checked=""/)
    const out = html()
    expect(out).toContain(GEOLOGY_OPT_LABEL)
    expect(out).toContain(AI_SEND_NOTICE_GEOLOGY)
    expect(out).not.toContain('no el texto completo del brief ni cartografía') // aviso único y condicional
    expect(out).toContain(GEOLOGY_WHERE)
    // Al desmarcarla, vuelve el aviso sin cartografía.
    composerStore.setState({ useGeology: false })
    const off = html()
    expect(off).toContain(AI_SEND_NOTICE)
    expect(off).not.toContain(AI_SEND_NOTICE_GEOLOGY)
    expect(off).not.toContain(GEOLOGY_WHERE)
  })

  it('con la solicitud en curso la casilla no cambia lo que ya se envió', () => {
    const { state } = evaluateExample()
    publish(plannerReducer(state, { type: 'explain_start', requestId: 'g-1' }))
    available()
    expect(render()).toMatch(/type="checkbox"[^>]*disabled=""/)
  })

  it('fallo solo del canal geológico: ofrece «Reintentar sin geología» y el resultado no cambia', () => {
    const { state } = evaluateExample()
    const started = plannerReducer(state, { type: 'explain_start', requestId: 'g-2' })
    const failed = plannerReducer(started, { type: 'explain_fail', requestId: 'g-2', message: 'El servidor no tiene un contexto geológico válido para esta versión, así que no se pidió orientación geológica.', unavailable: false, geologyFailure: true })
    expect(failed.explain.geologyFailed).toBe(true)
    publish(failed)
    available()
    const out = html()
    expect(out).toContain(GEOLOGY_RETRY_NOTICE)
    expect(out).toContain(GEOLOGY_RETRY_LABEL)
    expect(out).toContain('Plantilla determinista sin IA')
  })

  it('los textos son los mismos que los del panel de IA del equipo (ResultView sin variante compacta)', () => {
    const { state, request, evaluation } = evaluateExample()
    const props = { evaluation, request, state, candidates: readyData.snapshot!.candidates, onExplain: () => undefined, onExport: () => undefined, exportError: null, onEdit: () => undefined }
    const team = (geo?: Parameters<typeof ResultView>[0]['geo']) => text(renderToStaticMarkup(<ResultView {...props} geo={geo} />))
    const without = team({ available: false, unavailableReason: 'No se encontró el paquete geológico de esta versión.', useGeology: true, setUseGeology: () => undefined, catalog: null, onExportGeology: () => undefined, exportError: null })
    expect(without).toContain(AI_SEND_NOTICE)
    expect(without).toContain(geologyUnavailableNotice('No se encontró el paquete geológico de esta versión.'))
    const withGeo = team({ available: true, unavailableReason: null, useGeology: true, setUseGeology: () => undefined, catalog: null, onExportGeology: () => undefined, exportError: null })
    expect(withGeo).toContain(AI_SEND_NOTICE_GEOLOGY)
    expect(withGeo).toContain(GEOLOGY_OPT_LABEL)
    const failed = plannerReducer(plannerReducer(state, { type: 'explain_start', requestId: 'g-3' }), { type: 'explain_fail', requestId: 'g-3', message: 'x', unavailable: false, geologyFailure: true })
    const retry = text(renderToStaticMarkup(<ResultView {...props} state={failed} />))
    expect(retry).toContain(GEOLOGY_RETRY_NOTICE)
    expect(retry).toContain(GEOLOGY_RETRY_LABEL)
  })
})

describe('ReadingSkeleton', () => {
  it('la espera de la Lectura no lleva ✦ (también se ve antes de la Lectura determinista de Explorar)', () => {
    const html = renderToStaticMarkup(<ReadingSkeleton placement="panel" />)
    expect(html).toContain('Preparando la lectura')
    expect(html).not.toContain('✦')
  })
})

describe('ReadingPill', () => {
  it('es un disclosure «Lectura determinista», sin ✦', () => {
    const html = renderToStaticMarkup(<ReadingPill data={readyData} />)
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('Lectura determinista')
    expect(html).not.toContain('✦')
  })
})
