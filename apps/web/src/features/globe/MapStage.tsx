import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { CandidateSite, GeoJsonFeatureCollection } from '../../domain/contracts'
import { loadBasemaps, type ActiveSource, type Basemap, type BasemapManifest, type ContextPreview } from '../../data/loadBasemaps'
import type { VisualContextState } from '../../data/loadVisualContext'
import { CandidateMap } from './CandidateMap'
import type { FlatHandoff, GlobeView } from './CandidateGlobe'
import './CandidateGlobe.css'
import './MapStage.css'

import { GLOBE_TEXTURE_KM, hideBootStage, MAPLIBRE_WORKER_URL, prefetchToCache, whenIdle } from '../../data/preload'
import { flatThresholds, type ViewInsets } from '../../domain/mapZoom'

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
const PREWARM_CENTER = { lon: -69.5, lat: -24 }

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
  chileOutline: GeoJsonFeatureCollection
  /** null = sin selección (Explorar arranca así). */
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
}

/** Convierte las vistas Sentinel-2 validadas en capas del mapa 2D. */
export function contextLayers(visual: VisualContextState, previews: ContextPreview[] = []): Basemap[] {
  if (visual.status !== 'ready') return []
  const { index } = visual
  return index.sites.map((site) => {
    // WebP liviano solo si fue derivado de este mismo PNG (mismo SHA-256); si no, el original.
    const preview = previews.find((item) => item.site_id === site.site_id && item.source_sha256 === site.sha256)
    return {
    id: `s2-${site.site_id}`,
    kind: 'context' as const,
    label: `Copernicus Sentinel-2 L2A · ≈${Math.round(site.approx_meters_per_pixel)} m`,
    bounds: site.bbox,
    image: preview?.image ?? `visual-context/${site.image}`,
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
    <div className="globe-loading globe-loading-page" role="status">
      <span className="loader" />
      {text}
    </div>
  )
}

/** Márgenes como variables CSS: la leyenda y el fondo se ubican en el área libre. */
function insetVars(insets: ViewInsets): CSSProperties {
  return {
    ['--inset-top' as string]: `${insets.top}px`,
    ['--inset-right' as string]: `${insets.right}px`,
    ['--inset-bottom' as string]: `${insets.bottom}px`,
    ['--inset-left' as string]: `${insets.left}px`,
  }
}

/**
 * Escenario de fondo del sitio: globo 3D que, al acercarse, cede automáticamente
 * a un mapa 2D con imágenes oficiales NASA, y vuelve al globo al alejarse.
 * Sin WebGL (ADR-001) se usa el mapa SVG local.
 */
export function MapStage({
  candidates,
  chileOutline,
  selectedId,
  onSelect,
  insets,
  baseInsets,
  visual,
  focusSignal,
  paused = false,
  onMilestone,
  hudSlot,
}: MapStageProps) {
  const selected = selectedId ?? ''
  const [webgl] = useState(supportsWebGL)
  const [failed, setFailed] = useState(false)
  const [mode, setMode] = useState<Mode>('globe')
  const [view, setView] = useState<GlobeView>({ kind: 'global', nonce: 0 })
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
  const milestone = useRef(onMilestone)
  milestone.current = onMilestone
  const prewarmEntry = useMemo<FlatHandoff>(() => ({ ...PREWARM_CENTER, zoom: thresholds.enter }), [thresholds.enter])

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

  const goGlobal = () => {
    setMode('globe')
    setView((current) => ({ kind: 'global', nonce: current.nonce + 1 }))
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

  if (!webgl || failed) {
    return (
      <div className="map-stage map-stage-fallback">
        <CandidateMap candidates={candidates} chileOutline={chileOutline} selectedId={selected} onSelect={onSelect} />
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
              chileOutline={chileOutline}
              selectedId={selected}
              onSelect={onSelect}
              view={view}
              active={mode === 'globe' && !paused}
              insets={insets}
              baseInsets={baseInsets}
              thresholds={thresholds}
              onReady={markGlobeReady}
              onApproach={mountFlat}
              onDetailReady={markDetailReady}
              onEnterFlat={enterFlat}
              onContextLost={markFailed}
            />
          </Suspense>
        </div>
        {!layers && mode === 'flat' && <StageLoading text="Cargando imágenes del mapa…" />}
        {(entry || prewarm) && layers && (
          <div className={`stage-layer stage-flat${mode === 'flat' ? '' : ' is-dormant'}`} aria-hidden={mode !== 'flat'}>
            <Suspense fallback={<StageLoading text="Cargando mapa 2D…" />}>
              <CandidateFlatMap
                candidates={candidates}
                chileOutline={chileOutline}
                basemaps={layers}
                selectedId={selected}
                onSelect={onSelect}
                entry={entry ?? prewarmEntry}
                focusRequest={focusRequest}
                active={mode === 'flat'}
                insets={insets}
                thresholds={thresholds}
                onExit={exitFlat}
                onSourcesChange={setFlatSources}
              />
            </Suspense>
          </div>
        )}
      </StageErrorBoundary>

      <div className="stage-dock glass" aria-label="Leyenda y fuente del mapa">
        <div className="stage-dock-row" role="group" aria-label="Encuadre">
          <button type="button" className="dock-button" aria-pressed={mode === 'globe' && view.kind === 'global'} onClick={goGlobal}>
            Vista global
          </button>
          <button type="button" className="dock-button" onClick={goClose}>
            Acercar a la zona
          </button>
          <span className="dock-mode" aria-live="polite">{mode === 'globe' ? 'Globo 3D' : 'Mapa 2D'}</span>
        </div>
        <div className="stage-source" aria-live="polite">
          <small>Fuente del mapa</small>
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
        </div>
        <div className="stage-legend">
          <span><i className="legend-swatch candidate" /> {fixtureMode ? 'Fixture con score' : 'Polígono candidato'}</span>
          <span><i className="legend-swatch insufficient" /> Datos insuficientes</span>
          <span><i className="legend-swatch outline globe-outline" /> Contorno referencial</span>
          <span className="legend-credit">Imágenes: contexto visual, no entran al score</span>
        </div>
        {hudSlot}
      </div>
    </div>
  )
}
