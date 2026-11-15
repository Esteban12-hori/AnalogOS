// La Lectura integrada (ADR-013) renderizada con react-dom/server: en Explorar solo hechos
// deterministas (sin ✦); en Misión, tres capas separadas — resultado, motivos destacados (plantilla
// o IA del equipo) y hechos —, con el botón explícito de IA y su aviso literal de envío.
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { composeExplanation, deterministicSelection, plannerReducer } from '../../mission'
import type { AppData } from '../../shell/public'
import { INITIAL_MISSION_STATE, missionStore } from '../../state/mission'
import { uiStore } from '../../state/ui'
import { evaluateExample, readyData } from '../../tests/v3Support'
import { ReadingPill } from './ReadingPill'
import ReadingView from './ReadingView'

const render = (data: AppData = readyData) => renderToStaticMarkup(<ReadingView data={data} placement="panel" />)
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

afterEach(() => {
  missionStore.reset()
  uiStore.reset()
})

function publish(state: ReturnType<typeof evaluateExample>['state'], source: 'deterministic_template' | 'anthropic' = 'deterministic_template') {
  const evaluation = state.result!
  const explanation = composeExplanation(evaluation, source === 'anthropic' ? state.explain.record!.selection : deterministicSelection(evaluation), source)
  missionStore.setState({ ...INITIAL_MISSION_STATE, planner: state, evaluation, explanation, revision: 1 })
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
    expect(html).toContain('Al pulsar el botón se envían a Anthropic los requisitos confirmados y los resultados ya calculados (no el texto completo del brief).')
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

describe('ReadingPill', () => {
  it('es un disclosure «Lectura determinista», sin ✦', () => {
    const html = renderToStaticMarkup(<ReadingPill data={readyData} />)
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('Lectura determinista')
    expect(html).not.toContain('✦')
  })
})
