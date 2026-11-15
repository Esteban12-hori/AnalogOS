import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { CandidateSite, GeoJsonFeatureCollection, PrecedentCatalog, ReferenceAnalog, SearchResults } from '../../domain/contracts'
import { rankMap, splitByRole } from '../../domain/discovery'
import { shortCandidateName } from '../../domain/formatting'
import { loadBasemaps, type ActiveSource, type Basemap, type BasemapManifest, type ContextPreview } from '../../data/loadBasemaps'
import type { VisualContextState } from '../../data/loadVisualContext'
import { announce, GLYPH } from '../../shell/public'
import { useMission } from '../../state/mission'
import { uiActions, useUi } from '../../state/ui'
import { useReferenceAnalogs } from '../places'
import { CandidateMap } from './CandidateMap'
import type { FlatCommand } from './CandidateFlatMap'
import type { FlatHandoff, FlyRequest, GlobeView, StageSelection } from './CandidateGlobe'
import type { MarkerInput, MarkerModel } from './markers'
import { selectionCamera } from './selectionCamera'
import { publishStageFrame } from './stageBridge'
import './MapStage.css'

import { GLOBE_TEXTURE_KM, hideBootStage, MAPLIBRE_WORKER_URL, prefetchToCache, whenIdle } from '../../data/preload'
import { flatThresholds, type ViewInsets } from '../../domain/mapZoom'
import { SIMILARITY_SCALE } from '../../domain/similarityScale'

// three.js y MapLibre van en chunks aparte, pero se piden de inmediato: el globo al evaluar
// este módulo (en paralelo con el snapshot) y el mapa 2D apenas el navegador queda ocioso.
const globeModule = import('./CandidateGlobe')
let flatModule: ReturnType<typeof importFlat> | null = null
function importFlat() {
  return import('./CandidateFlatMap')
}
const loadFlat = () => (flatModule ??= importFlat())
const CandidateGlobe = lazy(() => globeModule)
const CandidateFlatMap = lazy(loadFlat)

/** Centro con que se monta el mapa 2D invisible antes de usarlo (Atacama central). */
const PREWARM_CENTER = { lon: -68.6, lat: -25 }
/** Paso de los botones + / − (niveles de zoom): el mismo del teclado. */
const ZOOM_STEP = 0.5
const NO_ANALOGS: readonly ReferenceAnalog[] = []

function useViewport() {
  const read = () => ({ width: window.innerWidth, height: window.innerHeight })
  const [size, setSize] = useState(read)
  useEffect(() => {
    const onResize = () => setSize(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

export type StageMilestone = 'globe' | 'texture'

export interface MapStageProps {
  candidates: CandidateSite[]
  /** Contorno de contexto (v3: Chile y Argentina; históricos: Chile). Referencial, no límite oficial. */
  outline: GeoJsonFeatureCollection
  /** Búsqueda y antecedentes del snapshot v3 (solo los usa el mapa SVG sin WebGL). */
  search?: SearchResults | null
  precedents?: PrecedentCatalog | null
  /** null = sin selección (Explorar arranca así). Solo sectores evaluados (● ○). */
  selectedId: string | null
  onSelect: (siteId: string) => void
  /**
   * Márgenes asentados que tapa la UI (riel, dock, hoja, panel). Desplazan el encuadre
   * (globo: setViewOffset x/y; MapLibre: setPadding) sin cambiar la escala.
   */
  insets: ViewInsets
  /** Márgenes base del tramo (shell/stageGeometry.js): encuadre global, umbrales 2D y póster. */
  baseInsets: ViewInsets
  /** Vistas Sentinel-2 por candidato (ADR-005): la mejor imagen sobre cada polígono. */
  visual: VisualContextState
  /** Cambia para pedir «ver el sector seleccionado en el mapa» desde fuera (ficha). */
  focusSignal: number
  /** true en S2 o con la pestaña oculta: el globo no dibuja (frameloop «never»). */
  paused?: boolean
  /** Hitos reales del arranque para la bitácora (features/boot). */
  onMilestone?: (milestone: StageMilestone, status: 'ok' | 'error') => void
  /** Controles extra en la franja de leyenda (p. ej. el interruptor «Líneas»). */
  hudSlot?: ReactNode
  /** Atribución de los datos que producen los % (siempre visible, al pie de la franja). */
  creditSlot?: ReactNode
  /**
   * Selección de un análogo ◆ desde el escenario. Opcional: por defecto escribe
   * `ui.selection` con `kind: 'reference'`.
   */
  onSelectReference?: (analogId: string) => void
}

/** Convierte las vistas Sentinel-2 validadas en capas del mapa 2D. */
export function contextLayers(visual: VisualContextState, previews: ContextPreview[] = []): Basemap[] {
  if (visual.status !== 'ready') return []
  const { index } = visual
  // Las imágenes v3 viven en su propio directorio; los índices históricos, en visual-context/.
  const dir = index.snapshot_version === 'science-screening-v3' ? 'visual-context-v3' : 'visual-context'
  return index.sites.map((site) => {
    // WebP liviano solo si fue derivado de este mismo PNG (mismo SHA-256); si no, el original.
    const preview = previews.find((item) => item.site_id === site.site_id && item.source_sha256 === site.sha256)
    return {
    id: `s2-${site.site_id}`,
    kind: 'context' as const,
    label: `Copernicus Sentinel-2 L2A · ≈${Math.round(site.approx_meters_per_pixel)} m`,
    bounds: site.bbox,
    image: preview?.image ?? `${dir}/${site.image}`,
    layers: [index.source.collection],
    dates: [],
    resolution_m: site.approx_meters_per_pixel,
    gap_fraction: 0,
    source: `${index.product.period_label} · contexto revisado (ADR-005)`,
    }
  })
}

type Mode = 'globe' | 'flat'

const GLOBE_SOURCE: ActiveSource = {
  id: 'globe',
  label: `NASA Blue Marble · ~${GLOBE_TEXTURE_KM} km`,
  detail: 'Textura local del globo · relieve NASA',
}

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

class StageErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

function StageLoading({ text }: { text: string }) {
  return (
    <div className="globe-loading globe-loading-page">
      <span className="loader" aria-hidden="true" />
      {text}
    </div>
  )
}

/** Márgenes como variables CSS: la leyenda, los controles y el foco se ubican en el área libre. */
function insetVars(insets: ViewInsets): CSSProperties {
  return {
    ['--inset-top' as string]: `${insets.top}px`,
    ['--inset-right' as string]: `${insets.right}px`,
    ['--inset-bottom' as string]: `${insets.bottom}px`,
    ['--inset-left' as string]: `${insets.left}px`,
  }
}

/** Nombre corto del lugar para el chip «Centrar en ‹#1›». */
function shortName(name: string): string {
  return shortCandidateName(name).split(' — ')[0] ?? name
}

const selectReference = (analogId: string) => uiActions.select(analogId, 'reference')
const touchCamera = () => uiActions.touchCamera()

/**
 * Escenario de fondo del sitio: globo 3D que, al acercarse, cede automáticamente a un mapa 2D
 * con imágenes oficiales NASA, y vuelve al globo al alejarse. Marcadores ●◆○ con agrupación,
 * vuelo de cámara, teclado y canal por cuadro para las líneas Tesla (incremento 4).
 * Sin WebGL (ADR-001) se usa el mapa SVG local.
 */
export function MapStage({
  candidates,
  outline,
  search = null,
  precedents = null,
  selectedId,
  onSelect,
  insets,
  baseInsets,
  visual,
  focusSignal,
  paused = false,
  onMilestone,
  hudSlot,
  creditSlot,
  onSelectReference = selectReference,
}: MapStageProps) {
  const [webgl] = useState(supportsWebGL)
  const [failed, setFailed] = useState(false)
  const [mode, setMode] = useState<Mode>('globe')
  const [view, setView] = useState<GlobeView>({ kind: 'global', nonce: 0 })
  const [flatCommand, setFlatCommand] = useState<FlatCommand | null>(null)
  const [fly, setFly] = useState<FlyRequest | null>(null)
  const [centerChip, setCenterChip] = useState<string | null>(null)
  const [entry, setEntry] = useState<FlatHandoff | null>(null)
  const [focusRequest, setFocusRequest] = useState(0)
  const [pendingFocus, setPendingFocus] = useState(false)
  const [manifest, setManifest] = useState<BasemapManifest | null>(null)
  const [flatSources, setFlatSources] = useState<ActiveSource[]>([])
  const [prewarm, setPrewarm] = useState(false)
  const viewport = useViewport()
  const thresholds = useMemo(
    () => flatThresholds(viewport.width, viewport.height, baseInsets),
    [viewport.width, viewport.height, baseInsets],
  )
  const narrow = viewport.width < 1100
  const milestone = useRef(onMilestone)
  milestone.current = onMilestone
  const prewarmEntry = useMemo<FlatHandoff>(() => ({ ...PREWARM_CENTER, zoom: thresholds.enter }), [thresholds.enter])

  // ---- Estado compartido que consume el escenario (docs/BUILD_CONTRACTS.md §2.2) --------------
  const storeSelection = useUi((state) => state.selection)
  const hoverId = useUi((state) => state.hoverSiteId)
  const intro = useUi((state) => state.introPhase)
  const uiMode = useUi((state) => state.mode)
  const cameraTouched = useUi((state) => state.cameraTouchedAt !== null)
  const evaluation = useMission((state) => state.evaluation)
  const revision = useMission((state) => state.revision)
  const analogsState = useReferenceAnalogs()
  const analogs = analogsState.status === 'ready' ? analogsState.analogs : NO_ANALOGS
  // En Misión, estados y puestos de la evaluación del equipo; en Explorar, puesto global del snapshot.
  const missionEvaluation = uiMode === 'mision' ? evaluation : null
  const markerInput = useMemo<MarkerInput>(() => ({ candidates, analogs, evaluation: missionEvaluation }), [candidates, analogs, missionEvaluation])

  const referenceId = storeSelection?.kind === 'reference' ? storeSelection.siteId : null
  const selection = useMemo<StageSelection | null>(
    () => (selectedId !== null ? { id: selectedId, kind: 'evaluated' } : referenceId !== null ? { id: referenceId, kind: 'reference' } : null),
    [selectedId, referenceId],
  )
  const preview = storeSelection !== null && selection !== null && storeSelection.siteId === selection.id && storeSelection.preview

  const onActivate = useCallback((model: MarkerModel) => {
    if (model.selectionKind === 'reference') onSelectReference(model.id)
    else onSelect(model.id)
  }, [onSelect, onSelectReference])

  // Precarga en dos tiempos, sin competir con el globo:
  // 1) con el globo listo y el navegador ocioso: código, worker e imágenes a la caché
  //    HTTP, sin ejecutar ni decodificar (index.html ya hizo prefetch del chunk);
  // 2) cuando el usuario empieza a acercarse: se instancia MapLibre oculto, de modo que
  //    al cruzar el umbral el 2D ya está dibujado.
  const [globeReady, setGlobeReady] = useState(false)
  const markGlobeReady = useCallback(() => {
    setGlobeReady(true)
    milestone.current?.('globe', 'ok')
  }, [])
  const markDetailReady = useCallback(() => {
    hideBootStage()
    milestone.current?.('texture', 'ok')
  }, [])
  const markFailed = useCallback(() => {
    setFailed(true)
    milestone.current?.('globe', 'error')
  }, [])
  const mountFlat = useCallback(() => {
    void loadFlat()
    setPrewarm(true)
  }, [])

  useEffect(() => {
    let alive = true
    void loadBasemaps().then((loaded) => {
      if (alive) setManifest(loaded)
    })
    return () => {
      alive = false
    }
  }, [])

  const enterFlat = useCallback((handoff: FlatHandoff) => {
    setEntry(handoff)
    setMode('flat')
  }, [])

  // El encuadre pedido desde el globo se aplica cuando el mapa 2D ya está activo.
  useEffect(() => {
    if (mode === 'flat' && pendingFocus) {
      setPendingFocus(false)
      setFocusRequest((value) => value + 1)
    }
  }, [mode, pendingFocus])

  // El estilo del mapa 2D se arma una vez: se monta cuando ambos índices están resueltos.
  const layers = useMemo(
    () => (manifest === null || visual.status === 'loading' ? null : [...manifest.basemaps, ...contextLayers(visual, manifest.previews)]),
    [manifest, visual],
  )

  useEffect(() => {
    if (!globeReady || !layers) return
    whenIdle(() => {
      prefetchToCache(MAPLIBRE_WORKER_URL)
      for (const layer of layers) prefetchToCache(`${import.meta.env.BASE_URL}${layer.image}`)
    }, 2000)
  }, [globeReady, layers])

  const exitFlat = useCallback((handoff: FlatHandoff) => {
    setView((current) => ({ kind: 'at', nonce: current.nonce + 1, at: handoff }))
    setMode('globe')
  }, [])

  const goGlobal = useCallback(() => {
    setMode('globe')
    setView((current) => ({ kind: 'global', nonce: current.nonce + 1 }))
  }, [])

  const goHome = useCallback(() => {
    touchCamera()
    goGlobal()
  }, [goGlobal])

  const zoomBy = (delta: number) => {
    touchCamera()
    if (mode === 'flat') setFlatCommand((current) => ({ kind: 'zoom', delta, nonce: (current?.nonce ?? 0) + 1 }))
    else setView((current) => ({ kind: 'zoom', delta, nonce: current.nonce + 1 }))
  }

  const goClose = useCallback(() => {
    if (mode === 'flat') {
      setFocusRequest((value) => value + 1)
      return
    }
    mountFlat()
    setPendingFocus(true)
    setView((current) => ({ kind: 'close', nonce: current.nonce + 1 }))
  }, [mode, mountFlat])

  const lastSignal = useRef(focusSignal)
  useEffect(() => {
    if (focusSignal === lastSignal.current) return
    lastSignal.current = focusSignal
    goClose()
  }, [focusSignal, goClose])

  // ---- Selección → vuelo (coreografías B y D) ------------------------------------------------
  // Selección manual: la cámara vuela en paralelo. Vista previa del #1 (resultados): solo si el
  // usuario no tocó la cámara durante la espera; si la tocó, aparece «Centrar en ‹#1›».
  const touchedRef = useRef(cameraTouched)
  touchedRef.current = cameraTouched
  const selectionKey = selection ? `${selection.kind}:${selection.id}:${preview ? 'preview' : 'manual'}` : ''
  useEffect(() => {
    if (!selection) {
      setCenterChip(null)
      return
    }
    if (selectionCamera(preview, touchedRef.current) === 'chip') {
      setCenterChip(selection.id)
      return
    }
    setCenterChip(null)
    setFly((current) => ({ id: selection.id, nonce: (current?.nonce ?? 0) + 1 }))
    // Solo reacciona a cambios de selección (selectionKey resume selection y preview).
  }, [selectionKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const chipSite = centerChip ? candidates.find((candidate) => candidate.site_id === centerChip) ?? null : null
  const centerOnChip = () => {
    if (!centerChip) return
    setFly((current) => ({ id: centerChip, nonce: (current?.nonce ?? 0) + 1 }))
    setCenterChip(null)
  }

  // ---- Paso globo ↔ 2D: un aviso por la región global (sin aria-live propia) -------------------
  const lastMode = useRef(mode)
  useEffect(() => {
    if (lastMode.current === mode) return
    lastMode.current = mode
    announce(mode === 'flat' ? 'Mapa 2D con imágenes oficiales NASA' : 'Globo 3D')
  }, [mode])

  const fixtureMode = candidates.every((candidate) => candidate.status === 'fixture')

  // El póster estático cubre el escenario hasta que el globo nítido está listo; se retira
  // antes si el usuario interactúa, si pasa al 2D o si no hay globo (SVG o error).
  useEffect(() => {
    if (!webgl) milestone.current?.('globe', 'error')
  }, [webgl])

  useEffect(() => {
    if (!webgl || failed || mode === 'flat') {
      hideBootStage()
      return
    }
    const onInteract = () => hideBootStage()
    window.addEventListener('pointerdown', onInteract, { once: true, capture: true })
    window.addEventListener('wheel', onInteract, { once: true, capture: true, passive: true })
    window.addEventListener('keydown', onInteract, { once: true, capture: true })
    const fallback = window.setTimeout(hideBootStage, 8000)
    return () => {
      window.removeEventListener('pointerdown', onInteract, { capture: true })
      window.removeEventListener('wheel', onInteract, { capture: true })
      window.removeEventListener('keydown', onInteract, { capture: true })
      window.clearTimeout(fallback)
    }
  }, [webgl, failed, mode])

  // Sin WebGL no hay proyección para las líneas Tesla.
  useEffect(() => {
    if (!webgl || failed) publishStageFrame({ projection: null, anchor: null })
  }, [webgl, failed])

  if (!webgl || failed) {
    return (
      <div className="map-stage map-stage-fallback">
        <CandidateMap
          candidates={candidates}
          rankOf={rankMap(splitByRole(candidates).ranked)}
          outline={outline}
          search={search}
          precedents={precedents}
          selectedId={selectedId ?? ''}
          onSelect={onSelect}
        />
        <p className="view-note stage-note">Sin WebGL: se muestra el mapa SVG local (sin imágenes satelitales).</p>
      </div>
    )
  }

  const sources = mode === 'flat' ? flatSources : [GLOBE_SOURCE]

  return (
    <div className="map-stage" data-mode={mode} style={insetVars(insets)}>
      <StageErrorBoundary onError={markFailed}>
        <div className="stage-layer stage-globe" hidden={mode !== 'globe'}>
          <Suspense fallback={<StageLoading text="Cargando globo 3D…" />}>
            <CandidateGlobe
              candidates={candidates}
              outline={outline}
              markerInput={markerInput}
              selection={selection}
              hoverId={hoverId}
              onActivate={onActivate}
              view={view}
              fly={fly}
              active={mode === 'globe' && !paused}
              insets={insets}
              baseInsets={baseInsets}
              thresholds={thresholds}
              narrow={narrow}
              intro={intro}
              resultsRevision={revision}
              onReady={markGlobeReady}
              onApproach={mountFlat}
              onDetailReady={markDetailReady}
              onEnterFlat={enterFlat}
              onContextLost={markFailed}
              onCameraInput={touchCamera}
              onHome={goHome}
            />
          </Suspense>
        </div>
        {!layers && mode === 'flat' && <StageLoading text="Cargando imágenes del mapa…" />}
        {(entry || prewarm) && layers && (
          <div className={`stage-layer stage-flat${mode === 'flat' ? '' : ' is-dormant'}`} aria-hidden={mode !== 'flat'}>
            <Suspense fallback={<StageLoading text="Cargando mapa 2D…" />}>
              <CandidateFlatMap
                candidates={candidates}
                outline={outline}
                basemaps={layers}
                markerInput={markerInput}
                selection={selection}
                hoverId={hoverId}
                onActivate={onActivate}
                fly={fly}
                command={flatCommand}
                entry={entry ?? prewarmEntry}
                focusRequest={focusRequest}
                active={mode === 'flat'}
                insets={insets}
                thresholds={thresholds}
                narrow={narrow}
                resultsRevision={revision}
                onExit={exitFlat}
                onSourcesChange={setFlatSources}
                onCameraInput={touchCamera}
                onHome={goHome}
              />
            </Suspense>
          </div>
        )}
      </StageErrorBoundary>

      {chipSite && (
        <button type="button" className="stage-center-chip" onClick={centerOnChip}>
          Centrar en {shortName(chipSite.name)}
        </button>
      )}

      <div className="stage-controls" role="group" aria-label="Cámara del escenario" data-obstacle="">
        <button type="button" aria-label="Acercar" title="Acercar (+)" onClick={() => zoomBy(ZOOM_STEP)}>+</button>
        <button type="button" aria-label="Alejar" title="Alejar (−)" onClick={() => zoomBy(-ZOOM_STEP)}>−</button>
        <button type="button" aria-label="Vista global" title="Vista global (Inicio)" onClick={goHome}>⌂</button>
      </div>

      <div className="stage-dock" role="group" aria-label="Leyenda y fuente del mapa" data-obstacle="">
        <div className="stage-legend">
          {missionEvaluation ? (
            <>
              <span><b aria-hidden="true">{GLYPH.evaluated}</b> #n priorizado</span>
              <span><b className="is-insufficient" aria-hidden="true">{GLYPH.insufficient}</b> evidencia insuficiente</span>
              <span><b className="is-fail" aria-hidden="true">{GLYPH.fail}</b> no cumple</span>
              <span><b className="is-reference" aria-hidden="true">{GLYPH.reference}</b> por calcular</span>
            </>
          ) : (
            <>
              <span><b aria-hidden="true">{GLYPH.evaluated}</b> {fixtureMode ? 'fixture con score' : 'candidato #n · REF referencia'}</span>
              <span><b className="is-reference" aria-hidden="true">{GLYPH.reference}</b> análogo por calcular</span>
              <span><b className="is-insufficient" aria-hidden="true">{GLYPH.insufficient}</b> datos insuficientes</span>
            </>
          )}
          <span className="legend-sim" title="Más parecido a Marte con el perfil activo; no indica aptitud">
            % similitud
            {SIMILARITY_SCALE.map((step, index) => {
              const next = SIMILARITY_SCALE[index + 1]
              return (
                <span key={step.tone} className="legend-sim-step">
                  <i data-sim-tone={step.tone} aria-hidden="true" />
                  {next ? `${step.min}–${next.min - 1}` : `≥${step.min}`}
                </span>
              )
            })}
            <span className="legend-sim-note">no es aptitud</span>
          </span>
          <span className="legend-outline">Contorno referencial, no límite oficial</span>
        </div>
        <div className="stage-source">
          <small>{mode === 'globe' ? 'Globo' : 'Mapa 2D'}</small>
          {sources[0] ? (
            <>
              <span>
                <strong>{sources[0].label}</strong>
                <em>{sources[0].detail}</em>
              </span>
              {sources.length > 1 && (
                <em className="source-rest">
                  Debajo, donde la anterior no cubre: {sources.slice(1).map((source) => source.label).join(' · ')}
                </em>
              )}
            </>
          ) : (
            <span><strong>Sin imagen disponible</strong><em>Fuera de la cobertura local y sin conexión</em></span>
          )}
          <em className="legend-credit">Imágenes = contexto, no entran al score</em>
        </div>
        {hudSlot}
        {creditSlot}
      </div>
    </div>
  )
}
