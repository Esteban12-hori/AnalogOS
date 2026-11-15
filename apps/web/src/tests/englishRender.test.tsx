// ENGLISH-DEFAULT Phase B: English render checks with the REAL v3 snapshot and the official geology package.
// Every main surface (mission result, printed report with/without geology, geology tab and guidance, metrics,
// places, Reading facts, origin/sources/method tabs, requirement editor) is rendered, official names and
// original-wording spans (lang="es") are removed, and what remains must contain no Spanish prose.
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { buildGeologyCatalog, deterministicGeologyRefs } from '../../../../shared/geology/guidance'
import { GeologyContextView } from '../components/GeologyContext'
import { ConfirmSummary } from '../components/planner/ConfirmSummary'
import { GeologyGuidance, PrintGeology, guidanceView } from '../components/planner/GeologyGuidance'
import { RequirementEditor } from '../components/planner/RequirementEditor'
import { MissionPrintReport, ResultView } from '../components/planner/ResultView'
import { parseGeologyContext, selectGeologySite } from '../domain/geologyContext'
import ReadingView from '../features/analysis/ReadingView'
import { MetricRail } from '../features/metrics/MetricRail'
import MetricDetails from '../features/metrics/MetricDetails'
import { resolveMetricContext } from '../features/metrics/metricContext'
import { ReadingSkeleton } from '../features/analysis/ReadingPanel'
import { explanationToReading } from '../features/analysis/explanationToReading'
import { PlaceRail } from '../features/places/PlaceRail'
import { GEOLOGY_UNIT_NAME_EN } from '../i18n/geologyGloss'
import { KEEP_ORIGINAL, ORIGINAL_WORDING_MARK } from '../i18n/sourceText'
import { composeExplanation, deterministicSelection, emptyScope, evaluationFingerprint, fingerprint, type PlannerState } from '../mission'
import { MethodTab } from '../shell/detail/MethodTab'
import { OriginSection } from '../shell/detail/OriginSection'
import { SourcesTab } from '../shell/detail/SourcesTab'
import { uiStore } from '../state/ui'
import { evaluateExample, readJson, readyData, v3Bundle, v3Snapshot } from './v3Support'

const context = parseGeologyContext(readJson('artifacts/geology-context-v1/index.json'), v3Bundle.candidates)
const ctxFp = fingerprint(context)
const noop = () => undefined

// Official place/authority/unit names and bibliographic proper nouns, shown as in the source on purpose.
const OFFICIAL = [
  ...KEEP_ORIGINAL, ...Object.keys(GEOLOGY_UNIT_NAME_EN),
  'Interior de Antofagasta', 'Puna de Catamarca y Salta', 'Pampa Yungay', 'Pampa María Elena', 'María Elena', 'Cordón de Domeyko',
  'Antofagasta de la Sierra', 'Campo de Piedra Pómez', 'Navarro-González', 'Ministerio del Medio Ambiente', 'Río Tinto',
  'Puna catamarqueña', 'Galán', 'Falda Ciénaga', 'Patquía - De la Cuesta', 'Sistema de Información Geológica Ambiental Minera',
].sort((a, b) => b.length - a.length)
const SPANISH = /[áéíóúñ¿¡«»]|\b(del|los|las|para|una|por|que|con|sin|está|son|desde|hasta|sobre|también|cada|según|ventana|requisitos?|sectores|evidencia|cumple|fuente)\b/i

/** Visible text with original-wording spans and official names removed. */
function authoredText(html: string): string {
  let out = html.replace(/<(\w+)[^>]*\blang="es"[^>]*>[\s\S]*?<\/\1>/g, ' ')
  out = out.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
  for (const name of OFFICIAL) out = out.split(name).join(' ')
  return out.replace(/\s+/g, ' ')
}

function spanishFragments(html: string): string[] {
  const text = authoredText(html)
  const hits: string[] = []
  const re = new RegExp(SPANISH.source, 'gi')
  for (let m = re.exec(text); m; m = re.exec(text)) hits.push(text.slice(Math.max(0, m.index - 60), m.index + 60))
  return hits
}

const expectEnglish = (label: string, html: string) => {
  expect(spanishFragments(html), label).toEqual([])
  expect(html, label).not.toContain(ORIGINAL_WORDING_MARK) // every exposed source string had a translation
}

afterEach(() => uiStore.setState({ mode: 'explorar', selection: null }))

describe('English render with real data', () => {
  const example = evaluateExample()
  const catalog = buildGeologyCatalog(example.evaluation, context, ctxFp)
  const geo = { available: true, unavailableReason: null, useGeology: true, setUseGeology: noop, catalog, onExportGeology: noop, exportError: null }
  const props = { onExplain: noop, onExport: noop, exportError: null, onEdit: noop, candidates: v3Bundle.candidates }

  it('mission result (screen and embedded print) with geological guidance is English, with translated source evidence', () => {
    const html = renderToStaticMarkup(<ResultView evaluation={example.evaluation} request={example.request} state={example.state} geo={geo} {...props} />)
    expectEnglish('ResultView', html)
    expect(html).toContain('Survey obstacles, slope and roughness at centimeter/decimeter scale.') // field check (source, translated)
    expect(html).toContain('Snapshot explanation (English translation of the Spanish source)') // mixed scale note
    expect(html).toContain('Terrestrial topography: NASADEM_HGT.001 mosaic') // evidence claim
    expect(html).toContain('Language: this report is in English.')
  })
  it('printed report with and without geology: English, source records disclosed, official unit wording kept next to the gloss', () => {
    const withGeo = renderToStaticMarkup(<MissionPrintReport evaluation={example.evaluation} request={example.request} state={example.state} candidates={v3Bundle.candidates} geologyCatalog={catalog} />)
    const without = renderToStaticMarkup(<MissionPrintReport evaluation={example.evaluation} request={example.request} state={example.state} candidates={v3Bundle.candidates} />)
    expectEnglish('print with geology', withGeo)
    expectEnglish('print without geology', without)
    expect(withGeo).toMatch(/English editorial translation: [^<]+\. Original official wording \(Spanish\): <span lang="es">“[^”]+”<\/span>/)
    expect(without).not.toContain('Geological guidance')
  })
  it('diagnostics: out-of-coverage point and unsupported objective', () => {
    for (const ev of [
      evaluateExample({ ...emptyScope(), mode: 'point', lon: '10', lat: '10' }),
      evaluateExample(undefined, [{ type: 'set_target', target: { kind: 'other', stated: 'lunar habitat' } }]),
    ]) {
      expectEnglish(ev.evaluation.outcome, renderToStaticMarkup(<ResultView evaluation={ev.evaluation} request={ev.request} state={ev.state} {...props} />))
    }
  })
  it('geology tab of every sector: labeled English glosses with the original description available separately', () => {
    for (const candidate of v3Bundle.candidates) {
      const selection = selectGeologySite({ status: 'ready', context }, candidate)
      const html = renderToStaticMarkup(<GeologyContextView candidateName={candidate.name} selection={selection} onDownload={noop} />)
      expectEnglish(candidate.site_id, html)
      const site = context.sites.find((s) => s.site_id === candidate.site_id)!
      for (const unit of site.units.filter((u) => u.description)) {
        expect(html, unit.unit_id).toContain(`<details class="geology-original"><summary>Original official wording (Spanish)</summary><p lang="es">${unit.description}</p></details>`)
      }
    }
  })
  it('geological guidance (screen and print) is English for every catalog site', () => {
    const view = guidanceView(catalog, example.state)!
    expect(deterministicGeologyRefs(catalog).ref_ids.length).toBeGreaterThan(0)
    expectEnglish('GeologyGuidance', renderToStaticMarkup(<GeologyGuidance view={view} onExport={noop} exportError={null} />))
    expectEnglish('PrintGeology', renderToStaticMarkup(<PrintGeology view={view} />))
  })
  it('metrics rail, places rail and the deterministic Reading are English', () => {
    for (const site of v3Snapshot.candidates) {
      expectEnglish(`metrics full ${site.site_id}`, renderToStaticMarkup(<MetricRail data={readyData} site={site} variant="full" />))
      expectEnglish(`metrics rail ${site.site_id}`, renderToStaticMarkup(<MetricRail data={readyData} site={site} variant="rail" />))
    }
    expectEnglish('PlaceRail', renderToStaticMarkup(<PlaceRail data={readyData} placement="dock" />))
    for (const site of v3Snapshot.candidates) {
      uiStore.setState({ selection: { kind: 'evaluated', siteId: site.site_id } as never })
      const html = renderToStaticMarkup(<ReadingView data={readyData} placement="panel" />)
      expectEnglish(`Reading ${site.site_id}`, html)
    }
  })
  it('origin, sources and method tabs translate every source field shown', () => {
    for (const site of v3Snapshot.candidates) {
      expectEnglish(`origin ${site.site_id}`, renderToStaticMarkup(<OriginSection candidate={site} precedents={v3Snapshot.precedents ?? null} rank={1} />))
      expectEnglish(`sources ${site.site_id}`, renderToStaticMarkup(<SourcesTab site={site} manifest={v3Snapshot.manifest} search={v3Snapshot.search ?? null} visual={{ status: 'loading' }} onShowOnMap={noop} />))
    }
    expectEnglish('method', renderToStaticMarkup(<MethodTab data={readyData} />))
  })
  it('manual flow (no AI): requirement editor and confirmation summary are English; user text stays as written', () => {
    const state: PlannerState = { ...example.state, openQuestions: ['¿Hay acceso en invierno?'] }
    const editor = renderToStaticMarkup(<RequirementEditor state={state} dispatch={noop} />)
    expect(editor).toContain('¿Hay acceso en invierno?') // user-entered open question, not translated
    expectEnglish('RequirementEditor', editor.replace('¿Hay acceso en invierno?', ''))
    expectEnglish('ConfirmSummary', renderToStaticMarkup(<ConfirmSummary state={example.state} candidates={v3Bundle.candidates} />))
  })
})

describe('review regressions: lazy metric detail, loading surfaces and verification provenance', () => {
  it('per-criterion metric detail (lazy chunk) renders English in full, rail and sheet variants for every site', () => {
    for (const site of v3Snapshot.candidates) {
      const context = resolveMetricContext({ site, candidates: v3Snapshot.candidates, profile: v3Snapshot.profile, marsReference: v3Snapshot.marsReference, mode: 'explorar', evaluation: null, request: null, stale: false })
      for (const variant of ['full', 'rail', 'sheet'] as const) {
        const html = renderToStaticMarkup(<MetricDetails data={readyData} site={site} variant={variant} context={context} onShowOnMap={noop} />)
        expectEnglish(`MetricDetails ${variant} ${site.site_id}`, html)
        if (variant === 'full') expect(html).toContain('Data quality is assigned by the pipeline per source type (ADR-003)')
      }
    }
    const bare = renderToStaticMarkup(<MetricDetails data={readyData} site={v3Snapshot.candidates[0]!} variant="full" context={resolveMetricContext({ site: v3Snapshot.candidates[0]!, candidates: v3Snapshot.candidates, profile: v3Snapshot.profile, marsReference: v3Snapshot.marsReference, mode: 'explorar', evaluation: null, request: null, stale: false })} onShowOnMap={noop} />)
    expect(bare).not.toContain('0,0003°')
    expect(bare).toContain('0.0003° nominal (~30 m)')
  })
  it('Metrics and Reading loading surfaces are English, including accessibility labels', () => {
    // The lazy detail is already resolved in this file; the loading placeholder itself is asserted in MetricRail.test.
    expectEnglish('metrics rail', renderToStaticMarkup(<MetricRail data={readyData} site={v3Snapshot.candidates[0]!} variant="full" />))
    const skeleton = renderToStaticMarkup(<ReadingSkeleton placement="panel" />)
    expect(skeleton).toContain('aria-label="Reading"')
    expect(skeleton).toContain('Preparing the reading…')
    expectEnglish('reading skeleton', skeleton)
  })
  it('generated verification instructions keep a Spanish user label exactly; field checks from the snapshot are translated', () => {
    const ev = evaluateExample(undefined, [{ type: 'update_requirement', id: 'ex3', patch: { label: 'Tracción del suelo' } }])
    const selection = deterministicSelection(ev.evaluation)
    const generated = 'Obtain a measurement of “Tracción del suelo” at the required scale.'
    const view = composeExplanation(ev.evaluation, selection, 'deterministic_template')
    expect(view.verifications.some((v) => v.text === generated)).toBe(true)
    const reading = explanationToReading(view, ev.evaluation, 0)
    expect(reading.highlights.verifications.map((v) => v.text)).toContain(generated)
    expect(reading.highlights.verifications.map((v) => v.text)).toContain('Survey obstacles, slope and roughness at centimeter/decimeter scale.')
    const provenance = { provider: 'anthropic' as const, model: 'claude-sonnet-5-5', request_id: 'req_t', created_at: '2026-11-15T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' }
    const state: PlannerState = { ...ev.state, explain: { ...ev.state.explain, status: 'done', record: { provenance, selection, request_fingerprint: ev.evaluation.request_fingerprint, evaluation_fingerprint: evaluationFingerprint(ev.evaluation) } } }
    const html = renderToStaticMarkup(<ResultView evaluation={ev.evaluation} request={ev.request} state={state} onExplain={noop} onExport={noop} exportError={null} onEdit={noop} candidates={v3Bundle.candidates} />)
    expect(html).toContain('Obtain a measurement of “Tracción del suelo” at the required scale.')
    expect(html).not.toContain('[original Spanish wording]')
    expect(html).toContain('Survey obstacles, slope and roughness at centimeter/decimeter scale.')
  })
})
