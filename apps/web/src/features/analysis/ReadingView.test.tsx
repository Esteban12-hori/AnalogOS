// The integrated Reading (ADR-013) rendered with react-dom/server: in Explore only deterministic
// facts (no ✦); in Mission, three separate layers — result, highlighted reasons (template or the
// team's AI) and facts — with the explicit AI button and its literal sending notice.
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
  it('Explore: “Deterministic reading” with snapshot facts, no ✦ and no AI button', () => {
    const html = render()
    expect(html).toContain('Deterministic reading')
    expect(html).toContain('Snapshot facts')
    expect(html).not.toContain('✦')
    expect(html).not.toContain('Highlight reasons with AI')
    expect(text(html)).toContain('#1 of 6')
    expect(text(html)).toContain('REF')
  })

  it('Mission not evaluated: notice and facts only; AI is not offered', () => {
    uiStore.setState({ mode: 'mision', missionPhase: 'review' })
    const html = render()
    expect(html).toContain('No evaluation yet')
    expect(html).not.toContain('Highlight reasons with AI')
  })

  it('Mission evaluated: three separate layers, labeled template without ✦ and AI button with its literal notice', () => {
    publish(evaluateExample().state)
    const html = render()
    expect(html).toContain('Reading of your mission')
    expect(html).toContain('Result')
    expect(html).toContain('Deterministic calculation · rules mission-rules-1.0.0 · v3 similarity not recalculated')
    expect(html).toContain('Highlighted reasons')
    expect(html).toContain('Deterministic template without AI')
    expect(html).toContain('Snapshot facts')
    expect(html).toContain('Highlight reasons with AI')
    // Team notice (M10): without the geology channel no mapping is sent either.
    expect(html).toContain('When you press the button, the confirmed requirements and the already calculated results are sent to Anthropic (not the full brief text or geological mapping).')
    // The only ✦ is the button's: no block is presented as written by the AI.
    expect(html.match(/✦/g)).toHaveLength(1)
  })

  it('with the Anthropic selection accepted by the reducer: ✦ and provenance', () => {
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
    expect(html).toContain('Reasons highlighted with AI (Anthropic) · figures come from the deterministic calculation')
    expect(html).toContain('claude-sonnet-5-5 · 2026-11-14 · req_ui')
    expect(html).toContain('Ask the AI for another selection')
    // A single ✦ before the label (it used to show «✦ ✦ Motivos destacados con IA»).
    expect(text(html)).not.toMatch(/✦\s*✦/)
  })

  it('empty AI selection: does not claim everything is met and lists places without reasons', () => {
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
    expect(html).toContain(`The AI did not highlight reasons for ${unmet.length} places; the calculation blockers are in “Result”.`)
    expect(html).toContain('no highlighted reasons from the AI')
  })

  it('after editing, the dimmed Reading keeps the AI provenance', () => {
    const { state } = evaluateExample()
    const started = plannerReducer(state, { type: 'explain_start', requestId: 'exp-s' })
    const accepted = plannerReducer(started, {
      type: 'explain_ok', requestId: 'exp-s', requestFp: started.explain.requestFp!, evaluationFp: started.explain.evaluationFp!,
      selection: deterministicSelection(state.result!),
      provenance: { provider: 'anthropic', model: 'claude-y', request_id: 'req_stale', created_at: '2026-11-14T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' },
    })
    publish(accepted, 'anthropic')
    // The reducer invalidates the result on edit; the controller leaves the view dimmed (stale).
    const edited = plannerReducer(accepted, { type: 'set_brief', brief: 'otra prueba' })
    expect(edited.explain.record).toBeNull()
    missionStore.setState({ planner: edited, stale: true })
    const html = render()
    expect(html).toContain('You edited the test')
    expect(html).toContain('claude-y · 2026-11-14 · req_stale')
  })

  it('response that does not match the current computation: discarded and the template stays', () => {
    const { state } = evaluateExample()
    const started = plannerReducer(state, { type: 'explain_start', requestId: 'exp-2' })
    const discarded = plannerReducer(started, {
      type: 'explain_ok', requestId: 'exp-2', requestFp: 'f'.repeat(64), evaluationFp: started.explain.evaluationFp!, selection: deterministicSelection(state.result!),
      provenance: { provider: 'anthropic', model: 'x', request_id: null, created_at: '2026-11-14T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' },
    })
    expect(discarded.explain.status).toBe('error')
    publish(discarded)
    const html = render()
    expect(html).toContain('The response does not belong to the current calculation: the deterministic template is kept.')
    expect(html).toContain('Deterministic template without AI')
  })

  it('AI unavailable (no key or ZIP): client message and the template is still the Reading', () => {
    const { state } = evaluateExample()
    const started = plannerReducer(state, { type: 'explain_start', requestId: 'exp-3' })
    const unavailable = plannerReducer(started, { type: 'explain_fail', requestId: 'exp-3', message: 'La asistencia de IA no está disponible en este momento o en esta versión.', unavailable: true })
    publish(unavailable)
    const html = render()
    expect(html).toContain('no está disponible')
    expect(html).toContain('The deterministic template is still the Reading')
  })

  it('scope without evidence: AI is not offered and the diagnostic goes in the result', () => {
    publish(evaluateExample({ mode: 'point', siteId: '', lon: '10', lat: '10', west: '', south: '', east: '', north: '', windowSiteId: null }).state)
    const html = render()
    expect(html).not.toContain('Highlight reasons with AI')
    expect(html).toContain('This version does not acquire new data')
  })

  it('no snapshot: neutral wait, no figures', () => {
    expect(render({ status: 'loading', snapshot: null, visual: { status: 'loading' }, error: null })).toContain('Waiting for the validated snapshot')
  })
})

describe('ReadingView · AI geology channel (team M10)', () => {
  const html = () => text(render())
  const available = () => composerStore.setState({ geology: { available: true, unavailableReason: null } })

  it('no geology context: notice without mapping and “unavailable” reason, no checkbox', () => {
    publish(evaluateExample().state)
    composerStore.setState({ geology: { available: false, unavailableReason: 'The geology package for this version was not found.' } })
    const out = html()
    expect(out).toContain(AI_SEND_NOTICE)
    expect(out).not.toContain(AI_SEND_NOTICE_GEOLOGY)
    expect(out).toContain('AI geological guidance not available: The geology package for this version was not found. The requirements explanation works the same without geology.')
    expect(render()).not.toContain('type="checkbox"')
  })

  it('with context: checkbox on by default and ONE notice, the one for sending with purpose and mapping', () => {
    publish(evaluateExample().state)
    available()
    const markup = render()
    expect(markup).toContain('type="checkbox"')
    expect(markup).toMatch(/type="checkbox"[^>]*checked=""/)
    const out = html()
    expect(out).toContain(GEOLOGY_OPT_LABEL)
    expect(out).toContain(AI_SEND_NOTICE_GEOLOGY)
    expect(out).not.toContain('no el texto completo del brief ni cartografía') // single, conditional notice
    expect(out).toContain(GEOLOGY_WHERE)
    // When unticked, the notice without mapping comes back.
    composerStore.setState({ useGeology: false })
    const off = html()
    expect(off).toContain(AI_SEND_NOTICE)
    expect(off).not.toContain(AI_SEND_NOTICE_GEOLOGY)
    expect(off).not.toContain(GEOLOGY_WHERE)
  })

  it('with the request in flight the checkbox does not change what was already sent', () => {
    const { state } = evaluateExample()
    publish(plannerReducer(state, { type: 'explain_start', requestId: 'g-1' }))
    available()
    expect(render()).toMatch(/type="checkbox"[^>]*disabled=""/)
  })

  it('failure of the geology channel only: offers “Retry without geology” and the result does not change', () => {
    const { state } = evaluateExample()
    const started = plannerReducer(state, { type: 'explain_start', requestId: 'g-2' })
    const failed = plannerReducer(started, { type: 'explain_fail', requestId: 'g-2', message: 'El servidor no tiene un contexto geológico válido para esta versión, así que no se pidió orientación geológica.', unavailable: false, geologyFailure: true })
    expect(failed.explain.geologyFailed).toBe(true)
    publish(failed)
    available()
    const out = html()
    expect(out).toContain(GEOLOGY_RETRY_NOTICE)
    expect(out).toContain(GEOLOGY_RETRY_LABEL)
    expect(out).toContain('Deterministic template without AI')
  })

  it('texts are the same as in the team AI panel (ResultView without compact variant)', () => {
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
  it('the Reading wait has no ✦ (it also shows before the deterministic Reading in Explore)', () => {
    const html = renderToStaticMarkup(<ReadingSkeleton placement="panel" />)
    expect(html).toContain('Preparing the reading')
    expect(html).not.toContain('✦')
  })
})

describe('ReadingPill', () => {
  it('it is a “Deterministic reading” disclosure, without ✦', () => {
    const html = renderToStaticMarkup(<ReadingPill data={readyData} />)
    expect(html).toContain('aria-expanded="false"')
    expect(html).toContain('Deterministic reading')
    expect(html).not.toContain('✦')
  })
})
