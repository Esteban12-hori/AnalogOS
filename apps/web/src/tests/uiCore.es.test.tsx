// Spanish interface of the ui-core area (docs/I18N.md §7, ADR-017): shared labels, places, metrics, Tesla lines, globe
// and map texts, rail/sheet, details and its tabs. The English tests stay as they are; here the same components are
// rendered in Spanish and the order, ranks and figures are checked to be IDENTICAL in both languages (only words and
// number typography change). Rendered with react-dom/server (no jsdom), with the real v3 snapshot.
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { activeSources, sourceIn, type Basemap } from '../data/loadBasemaps'
import { loadDemoSnapshot } from '../data/loadDemoSnapshot'
import { displaySnapshotError, SNAPSHOT_OUTLINE_INVALID, SNAPSHOT_UNKNOWN_ERROR, snapshotLoadFailed } from '../data/snapshotError'
import { literatureLabels, rankMap, splitByRole } from '../domain/discovery'
import { criterionLabels, feasibilityLabels, formatRawValue, formatScore, PROFILE_STATUS_LABEL, shortCandidateName } from '../domain/formatting'
import { MISSION_STATUS_LABEL, preferencesText, REQUIREMENT_STATUS_LABEL } from '../domain/missionView'
import { SIMILARITY_SCALE, similarityToneLabel } from '../domain/similarityScale'
import { formatIndex, formatMonth } from '../domain/surfaceSeries'
import { CandidateComparison, comparisonRows } from '../components/CandidateComparison'
import { SurfaceSignals } from '../components/SurfaceSignals'
import { VisualContextView, visualReason } from '../components/VisualContext'
import { CandidateMap } from '../features/globe/CandidateMap'
import { mapUiStrings } from '../features/globe/mapUiStrings'
import { buildMarkerModels, clusterAriaLabel, markerAriaLabel, markerLabelText } from '../features/globe/markers'
import { MarkerPin } from '../features/globe/MarkerLayer'
import { headerText, leaderLabelModelIn, NO_MARS_TEXT, requirementText } from '../features/leaders/labelModel'
import { LeaderToggle } from '../features/leaders/LeaderToggle'
import { buildMetricViews, GENERIC_RULE_TEXT } from '../features/metrics/buildMetricViews'
import MetricDetails from '../features/metrics/MetricDetails'
import { MetricRail } from '../features/metrics/MetricRail'
import { resolveMetricContext } from '../features/metrics/metricContext'
import { coverageText, siteSimilarityText } from '../features/metrics/summaryText'
import { directionWords, pendingText, ratioText, weightText } from '../features/metrics/metricText'
import { catalogReason } from '../features/places/catalogReason'
import { loadReferenceAnalogs, PlaceRail, ReferenceCard as ReferenceCardSlot } from '../features/places'
import { buildPlaceModel, placeOrder, rangeLabel } from '../features/places/placeModel'
import ReferenceCardView, { formatLatLon } from '../features/places/ReferenceCardView'
import { liveTextIn, setLocale, type Locale } from '../i18n'
import { tCommon } from '../i18n/messages/common'
import { FullDetail } from '../shell/detail/FullDetail'
import { MethodTab } from '../shell/detail/MethodTab'
import { OriginSection } from '../shell/detail/OriginSection'
import { SourcesTab } from '../shell/detail/SourcesTab'
import { GLYPH_MEANING, loadRecordText } from '../shell/public'
import { RightRail } from '../shell/RightRail'
import { Sheet } from '../shell/sheet/Sheet'
import { missionStore } from '../state/mission'
import { uiStore } from '../state/ui'
import { evaluateExample, readyData, REPO_ROOT, v3Snapshot } from './v3Support'

const quiet = { persist: false, updateUrl: false } as const
const es = () => setLocale('es', quiet)
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ')
const { ranked, references } = splitByRole(v3Snapshot.candidates)
const first = ranked[0]!
const yungay = references[0]!

beforeAll(async () => {
  await loadReferenceAnalogs()
  // The Spanish display of record text is loaded on demand in the browser; the server render needs it ready.
  await loadRecordText()
})

afterEach(() => {
  uiStore.reset()
  missionStore.reset()
})

describe('shared vocabulary follows the language (codes never change)', () => {
  it('label records read the current language on every access', () => {
    expect(criterionLabels.slope).toBe('Slope')
    es()
    expect(criterionLabels.slope).toBe('Pendiente')
    expect(criterionLabels.surface_temperature_variability).toBe('Rango térmico')
    expect(feasibilityLabels.unknown).toBe('Sin evaluar')
    expect(PROFILE_STATUS_LABEL.needs_calibration).toBe('Necesita calibración')
    expect(MISSION_STATUS_LABEL.priorizado_para_reconocimiento).toBe('Priorizado para reconocimiento')
    expect(REQUIREMENT_STATUS_LABEL.no_evaluable).toBe('No evaluable')
    expect(literatureLabels.known_reference).toBe('Referencia conocida')
    expect(GLYPH_MEANING.jezero).toBe('Jezero, Marte')
    expect(Object.keys(MISSION_STATUS_LABEL)).toEqual(['priorizado_para_reconocimiento', 'no_cumple_requisitos', 'evidencia_insuficiente', 'objetivo_no_soportado', 'fuera_de_alcance'])
    expect(criterionLabels.not_a_criterion).toBeUndefined()
  })

  it('preferences, similarity bands, numbers and units', () => {
    const option = { preferences: { met: 2, unmet: 0, total: 3, unknown: 1 } }
    expect(preferencesText(option)).toBe('2 of 3 preferences · 1 no data')
    expect(preferencesText(option, 'es')).toBe('2 de 3 preferencias · 1 sin dato')
    expect(preferencesText({ preferences: { met: 1, unmet: 0, total: 1, unknown: 0 } }, 'es')).toBe('1 de 1 preferencia')
    expect(similarityToneLabel(95)).toBe('very high similarity (90–100)')
    expect(similarityToneLabel(95, 1, 'es')).toBe('similitud muy alta (90–100)')
    es()
    expect(SIMILARITY_SCALE.map((step) => step.label)).toEqual(['baja', 'media', 'alta', 'muy alta'])
    expect(formatScore(94.87)).toBe('94,9')
    expect(formatRawValue(12.34, 'millimeter_per_year')).toBe('12,3 mm/año')
    expect(formatRawValue(0.871, 'ratio')).toBe('87,1 %')
    expect(formatRawValue(null, 'meter')).toBe('sin valor bruto')
  })

  it('site names: reviewed English rendering in en, the original wording in es', () => {
    expect(shortCandidateName(first.name, 'en')).toMatch(/° W$/)
    expect(shortCandidateName(first.name, 'es')).toBe(first.name)
    expect(formatIndex(0.14334, 'es')).toBe('0,143')
    expect(formatIndex(0.14334)).toBe('0.143')
    expect(formatMonth('2025-03-01T00:00:00Z', 'es')).toMatch(/^mar\.? ?2025$|^mar 2025$/)
  })
})

describe('places: same order and ranks, Spanish words', () => {
  it('the place model is identical except for its labels', () => {
    const en = buildPlaceModel({ candidates: v3Snapshot.candidates, locale: 'en' })
    const spanish = buildPlaceModel({ candidates: v3Snapshot.candidates, locale: 'es' })
    expect(placeOrder(spanish).map((place) => place.id)).toEqual(placeOrder(en).map((place) => place.id))
    expect(spanish.evaluated.map((place) => place.kind === 'evaluated' && place.rank)).toEqual(en.evaluated.map((place) => place.kind === 'evaluated' && place.rank))
    expect(spanish.groups.map((group) => group.label)).toEqual(['Candidatos de la búsqueda', 'Referencia conocida · fuera de la búsqueda'])
    expect(rangeLabel({ first: 0, last: 3 }, 11, 'es')).toBe('1–4 de 11')
    expect(rangeLabel(null, 11, 'es')).toBe('11 lugares')
  })

  it('carousel in Spanish: title, counts, roles, feasibility and the similarity ring', () => {
    es()
    const html = renderToStaticMarkup(<PlaceRail data={readyData} placement="dock" />)
    const plain = text(html)
    expect(plain).toContain('Lugares · Explorar')
    expect(plain).toContain(`${ranked.length} candidatos · 1 REF`)
    expect(html).toContain('aria-label="Lugares"')
    expect(html).toContain('aria-label="Lugares anteriores"')
    expect(plain).toContain('REF · Referencia conocida')
    expect(plain).toContain('similitud v3')
    expect(plain).toContain('Confianza')
    expect(plain).toContain(`Candidato · #1 de ${ranked.length}`)
    expect(plain).toContain('Emblemáticos · por calcular')
    expect(plain).not.toMatch(/Known reference|Search candidates|Confidence|not yet calculated/)
    // The same order of options as in English.
    const ids = (markup: string) => [...markup.matchAll(/id="[^"]*?-([a-z0-9-]+)" role="option"/g)].map((match) => match[1])
    expect(ids(html).length).toBeGreaterThan(ranked.length)
    setLocale('en', quiet)
    expect(ids(renderToStaticMarkup(<PlaceRail data={readyData} placement="dock" />))).toEqual(ids(html))
  })

  it('states, ◆ card and its loading text', () => {
    es()
    expect(text(renderToStaticMarkup(<PlaceRail data={{ ...readyData, status: 'loading', snapshot: null }} placement="dock" />))).toContain('Cargando snapshot validado…')
    expect(text(renderToStaticMarkup(<PlaceRail data={{ ...readyData, status: 'error', snapshot: null, error: 'x.json (404)' }} placement="dock" />))).toContain('No se pudieron cargar los lugares: x.json (404)')
    expect(text(renderToStaticMarkup(<ReferenceCardSlot data={readyData} analogId="nope" />))).toMatch(/Cargando la referencia…|Este análogo no está/)
    const card = text(renderToStaticMarkup(<ReferenceCardView data={readyData} analogId="mdrs-hanksville" />))
    expect(card).toMatch(/Referencia mundial · por calcular/)
    expect(formatLatLon(-24.08, -69.92, 'es')).toBe('24,08° S, 69,92° W')
    expect(catalogReason('The analog catalog could not be loaded.', 'es')).toBe('No se pudo cargar el catálogo de análogos.')
    expect(catalogReason('repeated analog id: x', 'es')).toBe('repeated analog id: x')
  })
})

describe('metrics: figures from the snapshot, Spanish words and es-CL numbers', () => {
  const site = first
  const context = (locale: Locale) => resolveMetricContext({ site, candidates: v3Snapshot.candidates, profile: v3Snapshot.profile, marsReference: v3Snapshot.marsReference, mode: 'explorar', evaluation: null, request: null, locale })

  it('metric views: same order, figures and flags in both languages; texts in the language', () => {
    const en = buildMetricViews(context('en').input, 'en')
    const spanish = buildMetricViews(context('es').input, 'es')
    const facts = (views: typeof en) => views.map(({ criterionId, weight, similarity, isLimiting, saturates, status, contribution }) => ({ criterionId, weight, similarity, isLimiting, saturates, status, contribution }))
    expect(facts(spanish)).toEqual(facts(en))
    expect(spanish.map((view) => view.label)).toContain('Pendiente')
    expect(spanish.find((view) => view.criterionId === 'slope')?.measure).toBe('Mediana del terreno a ~480 m')
    expect(en.find((view) => view.rule?.text === GENERIC_RULE_TEXT) ?? null).toBeNull()
    expect(context('es').profileLabel).toMatch(/^perfil base v/)
  })

  it('pure texts in Spanish', () => {
    expect(weightText(0.27, 'es')).toBe('27 %')
    expect(ratioText(1.42, 'es')).toBe('1,4× Jezero')
    expect(directionWords({ criterionId: 'slope', vsMars: { direction: 'more_demanding', ratio: 2 } }, 'es')).toBe('más inclinado')
    expect(pendingText({ status: 'missing', weight: 0, baseWeight: 0.2 }, 'es')).toBe('sin dato · fuera de tu perfil')
    expect(siteSimilarityText({ similarity: 75.71, similarityState: 'scored' }, 'es')).toBe('75,7')
    expect(siteSimilarityText({ similarity: null, similarityState: 'insufficient' }, 'es')).toBe('Datos insuficientes')
    expect(coverageText({ validCount: 6, criterionCount: 7, coverage: 0.9 }, 'es')).toBe('6 de 7 criterios con dato · 90 % del peso')
  })

  it('rail and detail in Spanish (Explore)', () => {
    es()
    const rail = text(renderToStaticMarkup(<MetricRail data={readyData} site={site} variant="rail" />))
    expect(rail).toContain('similitud v3')
    expect(rail).toContain('Confianza')
    expect(rail).toContain('Estabilidad')
    expect(rail).toContain('Factibilidad territorial: pendiente')
    expect(rail).toMatch(/Perfil base v\S+ · (necesita calibración · )?similitud v3 del snapshot/)
    expect(rail).toContain(formatScore(site.similarity, 'es'))
    const detail = renderToStaticMarkup(<MetricDetails data={readyData} site={site} variant="full" context={context('es')} onShowOnMap={() => undefined} />)
    const plain = text(detail)
    expect(plain).toContain('Métricas vs Jezero')
    expect(plain).toContain('Todo el sector')
    expect(plain).toContain('criterios válidos · ordenados por peso del perfil')
    expect(plain).toContain('Ver el sector en el mapa')
    expect(plain).not.toMatch(/Whole sector|valid criteria|Show the sector/)
    const sheet = renderToStaticMarkup(<MetricDetails data={readyData} site={site} variant="sheet" context={context('es')} />)
    expect(sheet).toContain('aria-roledescription="carrusel"')
    expect(sheet).toContain('aria-label="Elegir métrica"')
  })

  it('Mission: record text (required, reason) and observed values in Spanish; the record stays English', () => {
    const { evaluation, request } = evaluateExample()
    missionStore.setState({ evaluation, evaluatedRequest: request, revision: 1 })
    uiStore.setState({ mode: 'mision', missionPhase: 'done' })
    const english = text(renderToStaticMarkup(<MetricRail data={readyData} site={first} variant="rail" />))
    es()
    const html = text(renderToStaticMarkup(<MetricRail data={readyData} site={first} variant="rail" />))
    expect(html).toContain(MISSION_STATUS_LABEL[evaluation.options.find((option) => option.site_id === first.site_id)?.status ?? 'fuera_de_alcance'])
    expect(html).toContain('Cálculo determinista · reglas')
    expect(html).toMatch(/Exigido: /)
    expect(english).toMatch(/Required: /)
    expect(html).not.toMatch(/Required: |pending · not measured|must-have/)
    // The evaluation is not touched by the display.
    expect(JSON.stringify(evaluation)).not.toMatch(/Exigido|imprescindible/)
  })
})

describe('Tesla lines and the “Lines” switch', () => {
  it('labels and header in Spanish', () => {
    const views = buildMetricViews(resolveMetricContext({ site: yungay, candidates: v3Snapshot.candidates, profile: v3Snapshot.profile, marsReference: v3Snapshot.marsReference, mode: 'explorar', evaluation: null, request: null }).input, 'es')
    const label = leaderLabelModelIn(views[0]!, 'es')
    expect(label.title).toBe(tCommon.in('es')(`criterion.${views[0]!.criterionId}`))
    if (label.similarity !== null) expect(label.similarityText).toBe(`${label.similarity} %`)
    expect(NO_MARS_TEXT).toBe('Mars: no comparable measurement')
    expect(headerText({ area: '≈ 450 km²', scale: '~480 m', vsMars: true, mission: true }, 'es')).toBe('Todo el sector · ≈ 450 km² · medianas ~480 m · vs ■ Jezero (MOLA) · con tus requisitos')
    const required = { requirement_id: 'r', status: 'cumple', importance: 'critical', required: 'Slope: ≤ 10°' } as unknown as Parameters<typeof requirementText>[0][number]
    expect(requirementText([required], (value) => value.replace('Slope', 'Pendiente'))?.text).toBe('≤ 10°')
    es()
    expect(text(renderToStaticMarkup(<LeaderToggle />))).toMatch(/Líneas\s*:\s*(sí|no)/)
  })
})

describe('globe and maps', () => {
  const input = (locale: Locale) => ({ candidates: v3Snapshot.candidates, analogs: [], evaluation: null, locale })

  it('marker models: identical order, ranks and scores; names and labels in the language', () => {
    const en = buildMarkerModels(input('en'))
    const spanish = buildMarkerModels(input('es'))
    const facts = (models: typeof en) => models.map(({ id, kind, rank, score, order, role }) => ({ id, kind, rank, score, order, role }))
    expect(facts(spanish)).toEqual(facts(en))
    const top = spanish.find((model) => model.rank === 1)!
    expect(top.name).toBe(shortCandidateName(first.name, 'es').split(' — ')[0])
    expect(markerAriaLabel(top, 'es')).toContain('puesto 1, similitud ')
    expect(markerAriaLabel(top, 'es')).toMatch(/\d,\d %/)
    expect(markerLabelText(top, 'es')).toMatch(/\d,\d %/)
    expect(clusterAriaLabel({ evaluated: 2, insufficient: 0, reference: 1 }, 'Chile', false, 'es')).toBe('Grupo de 3 lugares en Chile: 2 evaluados, 1 análogo por calcular. Mostrar lista')
    es()
    const pin = renderToStaticMarkup(<MarkerPin model={top} selected={false} hover={false} onActivate={() => undefined} />)
    expect(pin).toContain('puesto 1')
  })

  it('imagery sources keep their facts and re-render in the language', () => {
    const world: Basemap = { id: 'world', kind: 'world', label: 'Mundo', bounds: [-180, -85, 180, 85], image: 'basemaps/world.webp', layers: [], dates: [], resolution_m: 20000, gap_fraction: 0, source: 'NASA' }
    const [source] = activeSources([10, 10, 20, 20], 3.5, [world], { blueMarble: false, hls: null })
    expect(source?.detail).toBe('Local world copy (offline)')
    expect(sourceIn(source!, 'es').detail).toBe('Copia local mundial (sin conexión)')
  })

  it('SVG map (no WebGL and Method) in Spanish', () => {
    es()
    const html = renderToStaticMarkup(
      <CandidateMap candidates={v3Snapshot.candidates} rankOf={rankMap(ranked)} outline={v3Snapshot.outline} search={v3Snapshot.search} precedents={v3Snapshot.precedents} selectedId="" onSelect={() => undefined} />,
    )
    expect(html).toContain('Área explorada')
    expect(html).toContain('aria-label="Leyenda del mapa"')
    expect(html).toContain('Seleccionar ')
    expect(html).toMatch(/\d+° O</)
    expect(text(html)).toContain('Contorno referencial, no límite oficial')
  })
})

describe('rail, sheet and the full details', () => {
  beforeEach(() => es())

  it('right rail and sheet handle', () => {
    uiStore.setState({ selection: { kind: 'evaluated', siteId: first.site_id, preview: false } })
    const rail = renderToStaticMarkup(<RightRail data={readyData} tramo="medium" selection={uiStore.getState().selection} full={false} onFullChange={() => undefined} onShowOnMap={() => undefined} />)
    expect(rail).toContain('aria-label="Lugar seleccionado"')
    expect(text(rail)).toContain('Ver ficha completa →')
    expect(text(rail)).toContain('Evaluar este sector')
    expect(rail).toContain('aria-label="Contenido del riel"')
    const sheet = renderToStaticMarkup(
      <Sheet detent="S1" onDetentChange={() => undefined} heights={{ S0: 100, S1: 300, S2: 600 }} side={false} label="Lugares" labelledBy="mode-tab-explorar" keyboardOpen={false}>
        <p />
      </Sheet>,
    )
    expect(sheet).toContain('aria-label="Lugares: lugar. Cambiar tamaño de la hoja"')
  })

  it('details header, tabs and Origin in Spanish (artifact text in its original wording)', () => {
    const html = renderToStaticMarkup(<FullDetail data={readyData} site={first} placement="rail" onShowOnMap={() => undefined} />)
    const plain = text(html)
    for (const label of ['Métricas', 'Lectura', 'Origen', 'Geología', 'Señal', 'Comparar', 'Método', 'Fuentes']) expect(plain).toContain(label)
    expect(html).toContain('aria-label="Ficha del lugar"')
    expect(plain).toContain('Candidato #1')
    expect(plain).toContain('Exportar ficha (JSON)')
    const origin = renderToStaticMarkup(<OriginSection candidate={first} precedents={v3Snapshot.precedents} rank={1} />)
    expect(text(origin)).toContain('Factibilidad territorial')
    expect(text(origin)).toContain('Origen y antecedentes')
    expect(origin).not.toContain('(original title, Spanish)')
    expect(origin).not.toContain('lang="es"')
    if (first.warnings[0]) expect(origin).toContain(first.warnings[0].replace(/&/g, '&amp;').replace(/</g, '&lt;').slice(0, 20))
  })

  it('Method, Sources, Compare, Signal and satellite context', () => {
    const method = text(renderToStaticMarkup(<MethodTab data={readyData} />))
    expect(method).toContain('La comparación ocurre a la misma escala.')
    expect(method).toContain('Cómo se buscaron')
    const sources = text(renderToStaticMarkup(<SourcesTab site={first} manifest={v3Snapshot.manifest} search={v3Snapshot.search} visual={{ status: 'loading' }} onShowOnMap={() => undefined} />))
    expect(sources).toContain('Qué verificar en terreno')
    expect(sources).toContain('Descargar ficha (JSON)')
    expect(sources).toContain('Cargando contexto satelital…')
    if (first.field_checks[0]) expect(sources).toContain(first.field_checks[0].slice(0, 16))
    const compare = text(renderToStaticMarkup(<CandidateComparison ranked={ranked} references={references} rankOf={rankMap(ranked)} selectedId={first.site_id} onSelect={() => undefined} />))
    expect(compare).toContain('Tres señales, una decisión explicable')
    expect(comparisonRows(ranked, references, rankMap(ranked)).map((row) => row.candidate.site_id)).toEqual([...ranked, ...references].map((item) => item.site_id))
    const signals = text(renderToStaticMarkup(<SurfaceSignals candidates={v3Snapshot.candidates} selectedId={first.site_id} series={v3Snapshot.surfaceSeries} />))
    expect(signals).toContain('mes a mes')
    const unavailable = text(renderToStaticMarkup(<VisualContextView candidateName={first.name} selection={{ status: 'unavailable', reason: 'Synthetic fixtures have no satellite image.' }} baseUrl="/" imageFailed={false} onImageError={() => undefined} />))
    expect(unavailable).toContain('Imagen satelital no disponible. Los fixtures sintéticos no tienen imagen satelital. El ranking y la ficha no dependen de ella.')
    expect(visualReason('This build does not include visual context (404).', 'es')).toBe('Este build no incluye contexto visual (404).')
    expect(visualReason('Invalid visual context index: x.', 'es')).toBe('Invalid visual context index: x.')
  })
})

describe('review fixes: accessible names, live regions and the error screen follow the language', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('the focusable 2D map canvas is named in the interface language (MapLibre’s own “Map” in English)', () => {
    expect(mapUiStrings('en')).toEqual({ 'Map.Title': 'Map' })
    expect(mapUiStrings('es')).toEqual({ 'Map.Title': 'Mapa' })
  })

  it('a live region shows its text only in the language it was written in (carousel and planner step)', () => {
    const carousel = { text: 'Geology, 6 of 7', locale: 'en' as const }
    expect(liveTextIn(carousel, 'en')).toBe('Geology, 6 of 7')
    expect(liveTextIn(carousel, 'es')).toBe('')
    expect(liveTextIn({ text: 'Geología, 6 de 7', locale: 'es' }, 'es')).toBe('Geología, 6 de 7')
    expect(liveTextIn(null, 'es')).toBe('')
  })

  it('the loader’s own messages are canonical English and shown in Spanish; other details are marked English', () => {
    expect(snapshotLoadFailed('manifest.json', 404)).toBe('manifest.json could not be loaded (404).')
    expect(displaySnapshotError(snapshotLoadFailed('manifest.json', 404), 'en')).toEqual({ text: 'manifest.json could not be loaded (404).' })
    expect(displaySnapshotError(snapshotLoadFailed('manifest.json', 404), 'es')).toEqual({ text: 'No se pudo cargar manifest.json (404).' })
    expect(displaySnapshotError(SNAPSHOT_OUTLINE_INVALID, 'es')).toEqual({ text: 'El contorno de contexto no tiene formato GeoJSON FeatureCollection.' })
    expect(displaySnapshotError(SNAPSHOT_UNKNOWN_ERROR, 'es')).toEqual({ text: 'Error desconocido al cargar el snapshot.' })
    expect(displaySnapshotError('Failed to fetch', 'es')).toEqual({ text: 'Failed to fetch', lang: 'en' })
    expect(displaySnapshotError('Failed to fetch', 'en')).toEqual({ text: 'Failed to fetch' })
    expect(displaySnapshotError('Invalid precedent catalog:\n/ must have required property', 'es').lang).toBe('en')
  })

  it('the real loader writes those canonical messages whatever the language (HTTP error, broken outline)', async () => {
    es()
    const serve = (broken: string | null) => vi.fn(async (url: string) => {
      const file = url.split('/').pop() ?? ''
      const path = resolve(REPO_ROOT, 'artifacts/science-v3', file)
      if (file === broken) return new Response(JSON.stringify({ broken: true }), { status: 200 })
      return existsSync(path) ? new Response(readFileSync(path, 'utf8'), { status: 200 }) : new Response('', { status: 404 })
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })))
    const failed = await loadDemoSnapshot().then(() => '', (error: Error) => error.message)
    expect(failed).toMatch(/^[\w.-]+\.(json|geojson) could not be loaded \(503\)\.$/)
    expect(displaySnapshotError(failed, 'es').text).toMatch(/^No se pudo cargar [\w.-]+\.(json|geojson) \(503\)\.$/)
    vi.stubGlobal('fetch', serve('context-outline.geojson'))
    await expect(loadDemoSnapshot()).rejects.toThrow(SNAPSHOT_OUTLINE_INVALID)
    vi.stubGlobal('fetch', serve(null))
    await expect(loadDemoSnapshot()).resolves.toMatchObject({ candidates: v3Snapshot.candidates })
  })

  it('PlaceRail’s error state shows the loader message in Spanish', () => {
    es()
    const html = renderToStaticMarkup(<PlaceRail data={{ ...readyData, status: 'error', snapshot: null, error: snapshotLoadFailed('manifest.json', 404) }} placement="dock" />)
    expect(text(html)).toContain('No se pudo cargar manifest.json (404).')
  })
})
