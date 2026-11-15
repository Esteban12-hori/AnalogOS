// ADR-017 · area mission-ui: the composer, “Your mission”, the planner, the result, the geological guidance, the
// printed report and the Reading in SPANISH. English stays the source: records, exports, fingerprints and the
// messages kept in the planner state are English and byte-identical in both languages; Spanish only changes what is
// SHOWN (catalogs, record text through the frozen Spanish packs, artifact text in its original wording).
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildGeologyCatalog } from '../../../../shared/geology/guidance'
import { ES_TEXT } from '../../../../shared/mission/text/es'
import { EN_TEXT } from '../../../../shared/mission/text/en'
import { ConfirmSummary } from '../components/planner/ConfirmSummary'
import { GeologyGuidance, PrintGeology, guidanceView } from '../components/planner/GeologyGuidance'
import { PlannerView } from '../components/planner/PlannerView'
import { RequirementEditor } from '../components/planner/RequirementEditor'
import { MissionPrintReport, ResultView, resultHeadline } from '../components/planner/ResultView'
import { ScopePicker } from '../components/planner/ScopePicker'
import type { PlannerApi } from '../components/planner/usePlanner'
import { parseGeologyContext } from '../domain/geologyContext'
import { ReadingPill } from '../features/analysis'
import { ReadingSkeleton } from '../features/analysis/ReadingPanel'
import ReadingView from '../features/analysis/ReadingView'
import { explanationToReading } from '../features/analysis/explanationToReading'
import { buildFactsLayer } from '../features/analysis/facts'
import { Composer } from '../features/composer/Composer'
import { composerStore, GEOLOGY_LOADING_REASON, initialComposerState, type ComposerState } from '../features/composer/composerStore'
import { entryFrom, entryLabel, formatWhen } from '../features/composer/history'
import { phaseLabel } from '../features/composer/labels'
import { CANCELLED_DRAFT, createMissionController, resetMissionControllerForTests, type ControllerDeps } from '../features/composer/missionController'
import { MissionComposer } from '../features/composer/MissionComposer'
import { MissionPanel, sourceLabel } from '../features/composer/MissionPanel'
import { resultAnnouncement, resultLineText } from '../features/composer/model'
import { PrintNotice } from '../features/composer/printHost'
import { setLocale } from '../i18n/locale'
import { liveTextIn } from '../i18n/react'
import { tComposer } from '../i18n/messages/composer'
import { tMission } from '../i18n/messages/mission'
import { tPlanner } from '../i18n/messages/planner'
import { tReading } from '../i18n/messages/reading'
import { tShell } from '../i18n/messages/shell'
import { displayRecordText } from '../i18n/recordText'
import { displaySource } from '../i18n/sourceText'
import {
  buildRequest, buildScope, composeExplanation, deterministicSelection, describeEditable, describeScope, emptyScope, evaluateMission, evaluationFingerprint, exampleState,
  fingerprint, initialPlannerState, METRICS, plannerReducer, resolveScope, toRequirement, topicLabel, UNMEASURED_TOPICS, validateBbox, validatePoint,
  type PlannerAction, type PlannerState,
} from '../mission'
import { requestDraft } from '../mission/aiClient'
import { composerNotice } from '../mission/messageDisplay'
import { displayMissionMessage, translateMissionMessage } from '../mission/messages'
import { createStore } from '../state/store'
import { INITIAL_MISSION_STATE, missionStore, type MissionState } from '../state/mission'
import { uiStore } from '../state/ui'
import { evaluateExample, readJson, readyData, v3Bundle, v3Snapshot } from './v3Support'

const quiet = { persist: false, updateUrl: false } as const
const es = () => setLocale('es', quiet)
const noop = () => undefined
const text = (html: string) => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ')
const run = (state: PlannerState, actions: readonly PlannerAction[]) => actions.reduce(plannerReducer, state)

afterEach(() => {
  uiStore.reset()
  missionStore.reset()
  composerStore.setState(initialComposerState())
  resetMissionControllerForTests()
  vi.restoreAllMocks()
})

/**
 * English prose left in a Spanish render. Removed first: URLs, codes and IDs, the user's own text (passed by the test)
 * and official names in English (dataset/product names), which stay as in the source.
 */
// Word boundaries that understand accented letters (“limitó” is not “limit”).
const ENGLISH = /(?<!\p{L})(the|and|with|for|of|is|are|not|this|that|from|without|which|your|you|must-have|requirements?|evidence|window|measured|report|reasons?|checks?|guidance|highlight|similarity|confidence|stability|feasibility|pending|prioritized|met|unknown|calculation|geology|layer|source|limits?)(?!\p{L})/iu
function englishFragments(html: string, keep: readonly string[] = []): string[] {
  let out = text(html).replace(/https?:\/\/\S+/g, ' ')
  for (const item of [...keep].sort((a, b) => b.length - a.length)) out = out.split(item).join(' ')
  const hits: string[] = []
  const re = new RegExp(ENGLISH.source, 'giu')
  for (let m = re.exec(out); m; m = re.exec(out)) hits.push(out.slice(Math.max(0, m.index - 50), m.index + 50))
  return hits
}
const expectSpanish = (label: string, html: string, keep: readonly string[] = []) => {
  expect(englishFragments(html, keep), label).toEqual([])
  expect(html, label).not.toContain('[original Spanish wording]')
  expect(html, label).not.toContain('English editorial translation')
  expect(html, label).not.toMatch(/\blang="es"/)
}

const context = parseGeologyContext(readJson('artifacts/geology-context-v1/index.json'), v3Bundle.candidates)
const ctxFp = fingerprint(context)

// ---- Catalogs ---------------------------------------------------------------------------------------------------------

describe('mission-ui catalogs', () => {
  it('topic and metric vocabulary repeat the mission packs and the metric catalog exactly', () => {
    for (const topic of UNMEASURED_TOPICS) {
      expect(topicLabel(topic.id, 'en')).toBe(EN_TEXT.topicLabel[topic.id])
      expect(topicLabel(topic.id, 'es')).toBe(ES_TEXT.topicLabel[topic.id])
      expect(topicLabel(topic.id, 'en')).toBe(topic.label)
    }
    expect(tMission.in('en')('topic.unknown')).toBe(EN_TEXT.unknownTopic)
    expect(tMission.in('es')('topic.unknown')).toBe(ES_TEXT.unknownTopic)
    for (const id of Object.keys(METRICS) as Array<keyof typeof METRICS>) expect(tMission.in('en')(`metric.${id}`)).toBe(METRICS[id].label)
  })

  it('the Reading and “Your mission” say exactly the same thing about what is sent to Anthropic, in both languages', () => {
    for (const locale of ['en', 'es'] as const) {
      const r = tReading.in(locale)
      const p = tPlanner.in(locale)
      expect(r('ai.sendNotice')).toBe(p('ai.sendsBasic'))
      expect(r('ai.sendNoticeGeology')).toBe(p('ai.sendsGeology'))
      expect(r('ai.geologyOption')).toBe(p('ai.includeGeology'))
      expect(r('ai.geologyRetryNotice')).toBe(p('ai.geologyFailed'))
      expect(r('ai.geologyRetry')).toBe(p('ai.retryWithoutGeology'))
      expect(r('ai.geologyUnavailable', { reason: 'x' })).toBe(p('ai.geologyUnavailable', { reason: 'x' }))
    }
  })
})

// ---- Canonical messages ------------------------------------------------------------------------------------------------

describe('messages kept in the planner state stay canonical English and are SHOWN in Spanish', () => {
  const editable = run(initialPlannerState(), [{ type: 'load_example', example: exampleState('en') }]).requirements[0]!
  if (editable.kind !== 'measurable') throw new Error('the example starts with a measurable requirement')
  const unnamed = { ...editable, label: '' }

  it('producers write English whatever the interface language (state, history and records do not depend on it)', () => {
    es()
    expect(buildScope({ ...emptyScope(), mode: 'sector' }).issues).toEqual(['Choose a sector.'])
    expect(buildScope({ ...emptyScope(), mode: 'point' }).issues).toEqual(['Longitude: enter a number (e.g. -69.7).', 'Latitude: enter a number (e.g. -25.0).'])
    expect(buildScope({ ...emptyScope(), mode: 'bbox' }).issues).toEqual(['West: enter a number.', 'South: enter a number.', 'East: enter a number.', 'North: enter a number.'])
    expect(CANCELLED_DRAFT).toMatch(/^Request canceled/)
    const state = run(initialPlannerState(), [{ type: 'set_journey', journey: 'test' }, { type: 'set_brief', brief: 'Necesito tracción y permisos del propietario.' }])
    const request = buildRequest(state).request!
    expect(request.open_questions).toEqual([
      'The brief mentions “tracción”: “Traction” is not measured in the snapshot; add it as a pending requirement if it matters.',
      'The brief mentions “permiso”: “Permits” is not measured in the snapshot; add it as a pending requirement if it matters.',
    ])
    expect(request.target.stated).toBe('Mars rover (Jezero reference)')
    const entry = entryFrom({ journey: 'test', brief: 'x', scope: emptyScope(), requirements: [] }, 1)
    expect(entry.label).toBe('0 requirements · the seven areas')
  })

  it('every planner, controller and validator message has its Spanish rendering', () => {
    const produced = [
      ...buildScope({ ...emptyScope(), mode: 'sector' }).issues,
      ...buildScope({ ...emptyScope(), mode: 'point' }).issues,
      ...buildScope({ ...emptyScope(), mode: 'bbox' }).issues,
      ...validatePoint(Number.NaN, 0), ...validatePoint(200, 100),
      ...validateBbox('x'), ...validateBbox([-190, -95, 190, 95]), ...validateBbox([1, 1, 0, 0]), ...validateBbox([0, 0, 0.0001, 0.0001]), ...validateBbox([0, 0, 20, 20]),
      ...[unnamed, { ...unnamed, label: 'Pendiente', valueText: ['', ''] as [string, string] }, { ...unnamed, label: 'Pendiente', operator: 'between' as const }, { ...unnamed, label: 'País', operator: 'in' as const, countries: [] }]
        .flatMap((e) => { const r = toRequirement(e, false); return r.ok ? [] : [r.issue] }),
      ...buildRequest({ ...initialPlannerState(), brief: 'x'.repeat(3001), target: { kind: 'other', stated: '' } }).issues,
      ...run(initialPlannerState(), [{ type: 'set_brief', brief: 'tracción' }]).openQuestions,
      ...(buildRequest(run(initialPlannerState(), [{ type: 'set_brief', brief: 'tracción, rocas y lluvia' }])).request?.open_questions ?? []),
      ...Object.values({
        a: 'msg.aiCanceledContent', b: 'msg.briefChanged', c: 'msg.otherTargetWarning', d: 'msg.aiStale', e: 'msg.cancelledDraft', f: 'msg.cancelledExplain',
        g: 'msg.restored', h: 'msg.undone', j: 'msg.evaluateFailed', k: 'msg.exportFailed', l: 'msg.exportGeologyFailed', n: 'msg.noGeology',
      } as const).map((key) => tMission.in('en')(key)),
      composerNotice('notice.loadFailed'), GEOLOGY_LOADING_REASON,
    ]
    expect(produced.length).toBeGreaterThan(25)
    for (const message of produced) {
      const shown = displayMissionMessage(message, 'es')
      expect(translateMissionMessage(message), message).not.toBeNull()
      expect(englishFragments(shown, ['bbox']), `${message} → ${shown}`).toEqual([])
      expect(displayMissionMessage(message, 'en')).toBe(message)
    }
    expect(displayMissionMessage('“Pendiente”: enter the value as a number.', 'es')).toBe('«Pendiente»: escriba el valor como número.')
    expect(displayMissionMessage('The bbox is smaller than 0.001° per side.', 'es')).toBe('El bbox es menor que 0,001° por lado.')
    expect(displayMissionMessage('The brief mentions “rocas”: “Rock size” is not measured in the snapshot; add it as a pending requirement if it matters.', 'es'))
      .toBe('El brief menciona «rocas»: «Tamaño de roca» no está medido en el snapshot; añádalo como requisito pendiente si importa.')
    expect(displayMissionMessage('Choose a sector. · Longitude outside [-180, 180].', 'es')).toBe('Elija un sector. · Longitud fuera de [-180, 180].')
  })

  it('user text, AI-drafted text and unknown technical details are never translated on the fly', () => {
    for (const other of ['¿Hay acceso en invierno?', 'Is there winter access?', 'Requirement p1: unknown metric.', '']) expect(displayMissionMessage(other, 'es')).toBe(other)
  })

  it('AI client messages (static ZIP, offline, server codes) are shown in Spanish', async () => {
    const offline = await requestDraft({ requestId: 'r', brief: 'x', url: 'http://x/api/ai', fetchImpl: (async () => new Response('<html>', { status: 404 })) as typeof fetch })
    const codes = ['ai_unavailable', 'ai_timeout', 'ai_rate_limited', 'ai_refused', 'ai_truncated', 'ai_invalid_output', 'ai_upstream_error', 'rate_limited', 'origin_not_allowed', 'stale_request', 'invalid_request', 'nothing_to_explain', 'geology_context_unavailable', 'geology_context_stale', 'unknown_code']
    const results = [offline, ...await Promise.all(codes.map((code) => requestDraft({
      requestId: 'r', brief: 'x', url: 'http://x/api/ai',
      fetchImpl: (async () => new Response(JSON.stringify({ ok: false, error: { code } }), { status: 400, headers: { 'content-type': 'application/json' } })) as typeof fetch,
    })))]
    for (const result of results) {
      expect(result.ok).toBe(false)
      if (result.ok) continue
      const shown = displayMissionMessage(result.message, 'es')
      expect(englishFragments(shown), `${result.message} → ${shown}`).toEqual([])
      expect(shown).toContain('No se pudo usar la IA. Puede continuar manualmente')
    }
  })
})

// ---- Records and exports -----------------------------------------------------------------------------------------------

describe('records and downloads do not depend on the interface language', () => {
  function controllerHarness() {
    const downloads: Array<[string, string]> = []
    const announcements: string[] = []
    const deps: ControllerDeps = {
      bundle: v3Bundle,
      geology: { status: 'ready', context, sizeBytes: 0 } as never,
      requestDraft: vi.fn(() => new Promise(() => undefined)) as unknown as ControllerDeps['requestDraft'],
      requestExplanation: vi.fn(() => new Promise(() => undefined)) as unknown as ControllerDeps['requestExplanation'],
      apiUrl: () => 'http://127.0.0.1/api/ai',
      mission: createStore<MissionState>(INITIAL_MISSION_STATE),
      composer: createStore<ComposerState>(initialComposerState()),
      ui: { getState: () => ({ selection: null }), setMissionPhase: noop, select: noop, resetCameraTouch: noop },
      announce: (message) => announcements.push(message),
      persistHistory: noop,
      download: (name, content) => downloads.push([name, content]),
      now: () => 1_700_000_000_000,
      setTimer: () => 0,
      clearTimer: noop,
    }
    return { controller: createMissionController(deps), downloads, announcements }
  }

  it('the same mission downloads byte-identical JSON (with and without geology) and the same filenames in EN and ES', () => {
    const { controller, downloads, announcements } = controllerHarness()
    controller.dispatch({ type: 'set_journey', journey: 'test' })
    controller.dispatch({ type: 'load_example', example: exampleState('en') })
    controller.dispatch({ type: 'confirm' })
    expect(controller.evaluate()).toBe(true)
    controller.exportJson()
    controller.exportGeologyJson()
    const before = controller.getState()
    es()
    expect(controller.getState()).toBe(before) // switching language changes nothing in the state
    controller.exportJson()
    controller.exportGeologyJson()
    expect(downloads).toHaveLength(4)
    expect(downloads[2]).toEqual(downloads[0])
    expect(downloads[3]).toEqual(downloads[1])
    expect(downloads[0]![0]).toMatch(/^analogos-recommendation-[0-9a-f]{8}\.json$/)
    expect(JSON.parse(downloads[0]![1]).export_version).toBe('1.1.0')
    expect(announcements[0]).toMatch(/^Evaluation ready\./) // announced in the language of that moment (English)
  })

  it('the Spanish example is the same test: identical statuses, ranks, order and fingerprint-free results; only its text differs', () => {
    const evaluate = (locale: 'en' | 'es') => {
      const state = run(initialPlannerState(), [{ type: 'set_journey', journey: 'test' }, { type: 'load_example', example: exampleState(locale) }, { type: 'confirm' }])
      const request = buildRequest(state).request!
      for (const r of request.requirements) if (r.source_quote) expect(request.brief).toContain(r.source_quote)
      return evaluateMission(request, v3Bundle)
    }
    const en = evaluate('en')
    const spanish = evaluate('es')
    const shape = (ev: typeof en) => ev.options.map((o) => [o.site_id, o.status, o.rank, o.requirement_results.map((r) => [r.requirement_id, r.status])])
    expect(shape(spanish)).toEqual(shape(en))
    expect(spanish.recommended_site_ids).toEqual(en.recommended_site_ids)
    expect(spanish.evaluation_version).toBe('1.1.0')
    expect(exampleState('es').brief).toMatch(/^Probar la navegación autónoma/)
  })
})

// ---- Rendering in Spanish ------------------------------------------------------------------------------------------------

describe('Spanish rendering with real data', () => {
  const example = evaluateExample()
  const catalog = buildGeologyCatalog(example.evaluation, context, ctxFp)
  const geo = { available: true, unavailableReason: null, useGeology: true, setUseGeology: noop, catalog, onExportGeology: noop, exportError: null }
  const props = { onExplain: noop, onExport: noop, exportError: null, onEdit: noop, candidates: v3Bundle.candidates }
  /** The example is English user text (labels, brief, quotes): kept as written. */
  const USER = [
    example.request.brief, example.request.brief.slice(0, 160), example.request.activity, 'Mars rover (Jezero reference)',
    ...example.request.requirements.flatMap((r) => [r.label, r.source_quote ?? '', r.kind === 'unmeasured' ? r.detail : '']),
  ].filter(Boolean)
  const OFFICIAL = ['NASADEM_HGT.001', 'Sentinel-2', 'NASA POWER', 'mission-rules-1.0.0', 'needs_calibration']

  it('full result: Spanish interface, Spanish record text (frozen pack wording), original source evidence', () => {
    es()
    const html = renderToStaticMarkup(<ResultView evaluation={example.evaluation} request={example.request} state={example.state} geo={geo} {...props} />)
    expectSpanish('ResultView', html.replace(/<article class="pl-print-only">[\s\S]*<\/article>/, ''), [...USER, ...OFFICIAL])
    const t = text(html)
    expect(t).toContain('Priorizado para reconocimiento')
    expect(t).toContain('Descargar JSON')
    expect(t).toContain('Imprimir informe')
    expect(t).toContain(ES_TEXT.orderingRule)
    for (const limit of ES_TEXT.limits) expect(t).toContain(limit)
    const check = v3Bundle.candidates.flatMap((c) => c.field_checks)[0]!
    expect(t).toContain(check) // original Spanish field check, not its English rendering
    expect(t).not.toContain(displaySource(check))
    expect(t).toContain('Idioma: este informe está en español')
    expect(t).not.toMatch(/\d\.\d\s*·\s*confianza/) // es-CL decimals
  })

  it('compact result in “Your mission”, diagnostics and the printed report (with and without geology) are Spanish', () => {
    es()
    expectSpanish('compact', renderToStaticMarkup(<ResultView evaluation={example.evaluation} request={example.request} state={example.state} geo={geo} compact onOpenReading={noop} {...props} />), [...USER, ...OFFICIAL])
    for (const ev of [
      evaluateExample({ ...emptyScope(), mode: 'point', lon: '10', lat: '10' }),
      evaluateExample(undefined, [{ type: 'set_target', target: { kind: 'other', stated: 'hábitat lunar' } }]),
    ]) {
      const html = renderToStaticMarkup(<ResultView evaluation={ev.evaluation} request={ev.request} state={ev.state} {...props} />)
      expectSpanish(ev.evaluation.outcome, html, [...USER, ...OFFICIAL])
      expect(text(html)).toContain(resultHeadline(ev.evaluation, 'es'))
    }
    const withGeo = renderToStaticMarkup(<MissionPrintReport evaluation={example.evaluation} request={example.request} state={example.state} candidates={v3Bundle.candidates} geologyCatalog={catalog} />)
    const without = renderToStaticMarkup(<MissionPrintReport evaluation={example.evaluation} request={example.request} state={example.state} candidates={v3Bundle.candidates} />)
    expectSpanish('print with geology', withGeo, [...USER, ...OFFICIAL])
    expectSpanish('print without geology', without, [...USER, ...OFFICIAL])
    expect(text(withGeo)).toContain('AnalogOS · Informe de recomendación para una prueba')
    expect(text(withGeo)).toContain('Orientación geológica')
    expect(text(withGeo)).toContain('versión del registro 1.1.0')
    expect(text(without)).not.toContain('Orientación geológica')
  })

  it('geological guidance (screen and print): Spanish, official unit wording without glosses', () => {
    es()
    const view = guidanceView(catalog, example.state)!
    const screen = renderToStaticMarkup(<GeologyGuidance view={view} onExport={noop} exportError={null} />)
    expectSpanish('GeologyGuidance', screen, OFFICIAL)
    expectSpanish('PrintGeology', renderToStaticMarkup(<PrintGeology view={view} />), OFFICIAL)
    expect(text(screen)).toContain(displayRecordText(view.notice, 'es'))
    expect(text(screen)).toContain('Descargar JSON con orientación geológica')
    const unit = view.sites.flatMap((s) => s.brief.units).find((u) => u.description)!
    expect(text(screen)).toContain(unit.description!)
  })

  it('manual flow: planner steps, requirement editor, scope picker and confirmation summary are Spanish', () => {
    es()
    const state: PlannerState = { ...example.state, openQuestions: ['¿Hay acceso en invierno?'] }
    expectSpanish('RequirementEditor', renderToStaticMarkup(<RequirementEditor state={state} dispatch={noop} />), USER)
    expectSpanish('ConfirmSummary', renderToStaticMarkup(<ConfirmSummary state={example.state} candidates={v3Bundle.candidates} />), USER)
    for (const scope of [emptyScope(), { ...emptyScope(), mode: 'sector' as const, siteId: v3Bundle.candidates[0]!.site_id }, { ...emptyScope(), mode: 'point' as const, lon: '-69.7', lat: '-25.0' }, { ...emptyScope(), mode: 'bbox' as const, west: '-69.8', south: '-25.1', east: '-69.6', north: '-24.9' }, { ...emptyScope(), mode: 'bbox' as const, west: '1', south: '1', east: '0', north: '0' }]) {
      const html = renderToStaticMarkup(<ScopePicker journey="test" scope={scope} candidates={v3Bundle.candidates} dispatch={noop} />)
      expectSpanish(`ScopePicker ${scope.mode}`, html, ['bbox', 'lon/lat'])
    }
    const api: PlannerApi = {
      state: { ...example.state, result: null, confirmed: false }, dispatch: noop, built: buildRequest(example.state), evaluate: () => false, evaluationError: null,
      runDraft: noop, runExplain: noop, geologyUi: geo, exportJson: noop, exportError: null,
    }
    for (const step of ['describe', 'scope', 'confirm'] as const) {
      const html = renderToStaticMarkup(<PlannerView snapshot={v3Bundle} api={api} intent={null} stepRequest={{ step, nonce: 1 }} />)
      expectSpanish(`PlannerView ${step}`, html, [...USER, 'bbox', 'lon/lat'])
    }
    expect(describeEditable(example.state.requirements[0]!, true, 'es')).toBe(`${example.state.requirements[0]!.label}: ≤ 3° · Ventana completa (~20 km) (imprescindible)`)
    const lines = describeScope(resolveScope({ mode: 'sector', site_id: 'cl-win-s2500-w06970' }, v3Bundle.candidates), (id) => id, ES_TEXT)
    expect(lines.requested).toMatch(/^Rectángulo: oeste -69,8, sur -25,1, este -69,6, norte -24,9/)
  })

  it('Reading (mission and Explore), its skeleton and pill are Spanish; numbers es-CL', () => {
    es()
    const view = composeExplanation(example.evaluation, deterministicSelection(example.evaluation), 'deterministic_template')
    missionStore.setState({ evaluation: example.evaluation, explanation: view, planner: example.state, request: example.request, revision: 1 })
    uiStore.setState({ mode: 'mision' })
    const keep = [...USER, ...OFFICIAL, 'analysis-summary.json', 'needs_calibration']
    expectSpanish('Reading mission', renderToStaticMarkup(<ReadingView data={readyData} placement="panel" />), keep)
    uiStore.setState({ mode: 'explorar' })
    const explore = renderToStaticMarkup(<ReadingView data={readyData} placement="panel" />)
    expect(text(explore)).toContain('Lectura determinista')
    expect(text(explore)).toMatch(/\d,\d %/)
    const model = explanationToReading(view, example.evaluation, 1, null, 'es')
    expect(model.result.orderingRule).toBe(ES_TEXT.orderingRule)
    expect(model.highlights.label).toBe('Plantilla determinista sin IA')
    const facts = buildFactsLayer({ base: v3Snapshot.profile, candidates: v3Snapshot.candidates, views: new Map(), robustness: null, locale: 'es' })
    expect(facts.robustness.reason).toBe('Robustez del orden no disponible: el snapshot no trae la sensibilidad del pipeline.')
    const skeleton = renderToStaticMarkup(<ReadingSkeleton placement="panel" />)
    expect(skeleton).toContain('aria-label="Lectura"')
    expect(skeleton).toContain('Preparando la lectura…')
    expect(renderToStaticMarkup(<ReadingPill data={readyData} />)).toContain('Lectura determinista')
  })

  it('composer, “Your mission”, print notices, phases, result line and announcement are Spanish', () => {
    es()
    expect(renderToStaticMarkup(<Composer data={readyData} placement="dock" />)).toContain(tShell.in('es')('composerPrompt'))
    uiStore.setState({ mode: 'mision' })
    const composer = text(renderToStaticMarkup(<MissionComposer data={readyData} placement="dock" />))
    expect(composer).toContain('Enviar')
    expect(composer).toContain('la IA es opcional')
    composerStore.setState({ notice: CANCELLED_DRAFT })
    expect(text(renderToStaticMarkup(<MissionComposer data={readyData} placement="dock" />))).toContain('Solicitud cancelada: los requisitos no cambiaron')
    const panel = renderToStaticMarkup(<MissionPanel data={readyData} placement="panel" />)
    expect(text(panel)).toContain('Tu misión')
    expect(text(panel)).toContain('Definir una prueba')
    expect(sourceLabel('anthropic', true, 'es')).toBe('Requisitos propuestos con IA · confirmados por usted')
    for (const reason of ['loading_data', 'no_result', 'stale', 'preparing'] as const) expectSpanish(reason, renderToStaticMarkup(<PrintNotice reason={reason} />))
    expect(phaseLabel('review', 'es')).toBe('Revise los requisitos y confirme en «Tu misión»')
    const line = resultLineText(example.evaluation, v3Bundle.candidates, 'es')
    expect(line).toMatch(/de \d candidatos? priorizados?/)
    expect(line).toMatch(/similitud v3 \d+,\d \(sin recalcular\)/)
    expect(resultAnnouncement(example.evaluation, v3Bundle.candidates, 'es')).toMatch(/^Evaluación lista\. .*Factibilidad territorial pendiente\.$/)
  })

  it('AI selection (validated record): Spanish notice and instructions, the user label kept exactly, figures from the calculation', () => {
    const ev = evaluateExample(undefined, [{ type: 'update_requirement', id: 'ex3', patch: { label: 'Tracción del suelo' } }])
    const selection = deterministicSelection(ev.evaluation)
    const provenance = { provider: 'anthropic' as const, model: 'claude-sonnet-5-5', request_id: 'req_t', created_at: '2026-11-15T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' }
    const state: PlannerState = { ...ev.state, explain: { ...ev.state.explain, status: 'done', record: { provenance, selection, request_fingerprint: ev.evaluation.request_fingerprint, evaluation_fingerprint: evaluationFingerprint(ev.evaluation) } } }
    es()
    const html = renderToStaticMarkup(<ResultView evaluation={ev.evaluation} request={ev.request} state={state} onExplain={noop} onExport={noop} exportError={null} onEdit={noop} candidates={v3Bundle.candidates} />)
    const t = text(html)
    expect(t).toContain('Obtener una medición de «Tracción del suelo» a la escala requerida.')
    expect(t).toContain(ES_TEXT.explanationNotice.anthropic)
    expect(t).toContain('Modelo claude-sonnet-5-5 · 2026-11-15 · req_t.')
    expect(t).toContain('Pedir otra selección a la IA')
    const view = composeExplanation(ev.evaluation, selection, 'anthropic')
    const reading = explanationToReading(view, ev.evaluation, 1, provenance, 'es')
    expect(reading.highlights.label).toBe('Motivos destacados con IA (Anthropic) · las cifras salen del cálculo determinista')
    expect(reading.highlights.notice).toBe(ES_TEXT.explanationNotice.anthropic)
    expect(reading.highlights.verifications.map((v) => v.text)).toContain('Obtener una medición de «Tracción del suelo» a la escala requerida.')
    expect(reading.highlights.verifications.map((v) => v.text)).toContain('Levantar obstáculos, pendiente y rugosidad a escala centimétrica/decimétrica.')
  })

  it('history: stored in English, shown in the interface language', () => {
    const scope = emptyScope()
    const entry = entryFrom({ journey: 'test', brief: 'b', scope, requirements: exampleState('en').requirements.map((r) => ({ ...r, origin: 'user' as const })).map((r) => ({ requirement_id: r.requirement_id, label: r.label, importance: r.importance, origin: 'user' as const, source_quote: r.source_quote, kind: 'unmeasured' as const, topic_id: 'traction', detail: '' })) }, 0)
    expect(entry.label).toBe('3 requirements · the seven areas')
    expect(entryLabel(entry.requirements, entry.scope, 'es')).toBe('3 requisitos · las siete áreas')
    const at = Date.UTC(2026, 10, 13, 17, 32)
    expect(formatWhen(at, at, 'es')).toMatch(/^\d{2}:\d{2}$/)
    expect(formatWhen(at, at + 3 * 86_400_000, 'es')).toMatch(/nov/)
  })
})

describe('review fixes: nothing stays in the previous language, nothing loses its last word', () => {
  const example = evaluateExample()
  const catalog = buildGeologyCatalog(example.evaluation, context, ctxFp)
  const geo = { available: true, unavailableReason: null, useGeology: true, setUseGeology: noop, catalog, onExportGeology: noop, exportError: null }

  it('the planner step announcement is not kept across a language change', () => {
    const announced = { text: tPlanner.in('en')('step.announce', { n: 4, total: 4, label: tPlanner.in('en')('step.result') }), locale: 'en' as const }
    expect(announced.text).toBe('Step 4 of 4: Result')
    expect(liveTextIn(announced, 'es')).toBe('')
    expect(liveTextIn(announced, 'en')).toBe('Step 4 of 4: Result')
    es()
    const api: PlannerApi = {
      state: { ...example.state, result: null, confirmed: false }, dispatch: noop, built: buildRequest(example.state), evaluate: () => false, evaluationError: null,
      runDraft: noop, runExplain: noop, geologyUi: geo, exportJson: noop, exportError: null,
    }
    const html = renderToStaticMarkup(<PlannerView snapshot={v3Bundle} api={api} intent={null} stepRequest={{ step: 'confirm', nonce: 1 }} />)
    expect(html).toContain('<div class="pl-sr" role="status" aria-live="polite"></div>')
  })

  it('the Spanish dock prompt keeps «Marte» and is no longer than the English one (360 px dock)', () => {
    const spanish = tShell.in('es')('composerPrompt')
    expect(spanish).toBe('Describe tu prueba para Marte…')
    expect(spanish.length).toBeLessThanOrEqual(tShell.in('en')('composerPrompt').length)
    expect(spanish.startsWith(tComposer.in('es')('form.promptShort').replace('…', ''))).toBe(true)
  })
})
