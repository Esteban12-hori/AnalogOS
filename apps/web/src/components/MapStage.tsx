import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { CandidateSite, GeoJsonFeatureCollection } from '../domain/contracts'
import { loadBasemaps, type ActiveSource, type Basemap } from '../data/loadBasemaps'
import type { VisualContextState } from '../data/loadVisualContext'
import { CandidateMap } from './CandidateMap'
import type { FlatHandoff, GlobeView } from './CandidateGlobe'
import './CandidateGlobe.css'
import './MapStage.css'

// three.js y MapLibre van en chunks diferidos: el resto de la app no los paga.
const CandidateGlobe = lazy(() => import('./CandidateGlobe'))
const CandidateFlatMap = lazy(() => import('./CandidateFlatMap'))

interface MapStageProps {
  candidates: CandidateSite[]
  chileOutline: GeoJsonFeatureCollection
  selectedId: string
  onSelect: (siteId: string) => void
  /** Píxeles que la ficha flotante tapa a la derecha; el globo y el mapa se centran en el resto. */
  rightInset: number
  /** Vistas Sentinel-2 por candidato (ADR-005): la mejor imagen sobre cada polígono. */
  visual: VisualContextState
  /** Cambia para pedir «ver el sector seleccionado en el mapa» desde fuera (ficha). */
  focusSignal: number
}

/** Convierte las vistas Sentinel-2 validadas en capas del mapa 2D. */
export function contextLayers(visual: VisualContextState): Basemap[] {
  if (visual.status !== 'ready') return []
  const { index } = visual
  return index.sites.map((site) => ({
    id: `s2-${site.site_id}`,
    kind: 'context' as const,
    label: `Copernicus Sentinel-2 L2A · ≈${Math.round(site.approx_meters_per_pixel)} m`,
    bounds: site.bbox,
    image: `visual-context/${site.image}`,
    layers: [index.source.collection],
    dates: [],
    resolution_m: site.approx_meters_per_pixel,
    gap_fraction: 0,
    source: `${index.product.period_label} · contexto revisado (ADR-005)`,
  }))
}

type Mode = 'globe' | 'flat'

const GLOBE_SOURCE: ActiveSource = {
  id: 'globe',
  label: 'NASA Blue Marble · ~10 km',
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

/**
 * Escenario de fondo del sitio: globo 3D que, al acercarse, cede automáticamente
 * a un mapa 2D con imágenes oficiales NASA, y vuelve al globo al alejarse.
 * Sin WebGL (ADR-001) se usa el mapa SVG local.
 */
export function MapStage({ candidates, chileOutline, selectedId, onSelect, rightInset, visual, focusSignal }: MapStageProps) {
  const [webgl] = useState(supportsWebGL)
  const [failed, setFailed] = useState(false)
  const [mode, setMode] = useState<Mode>('globe')
  const [view, setView] = useState<GlobeView>({ kind: 'global', nonce: 0 })
  const [entry, setEntry] = useState<FlatHandoff | null>(null)
  const [focusRequest, setFocusRequest] = useState(0)
  const [pendingFocus, setPendingFocus] = useState(false)
  const [basemaps, setBasemaps] = useState<Basemap[] | null>(null)
  const [flatSources, setFlatSources] = useState<ActiveSource[]>([])

  useEffect(() => {
    let alive = true
    void loadBasemaps().then((items) => {
      if (alive) setBasemaps(items)
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
    () => (basemaps === null || visual.status === 'loading' ? null : [...basemaps, ...contextLayers(visual)]),
    [basemaps, visual],
  )

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
    setPendingFocus(true)
    setView((current) => ({ kind: 'close', nonce: current.nonce + 1 }))
  }, [mode])

  const lastSignal = useRef(focusSignal)
  useEffect(() => {
    if (focusSignal === lastSignal.current) return
    lastSignal.current = focusSignal
    goClose()
  }, [focusSignal, goClose])

  const fixtureMode = candidates.every((candidate) => candidate.status === 'fixture')

  if (!webgl || failed) {
    return (
      <div className="map-stage map-stage-fallback">
        <CandidateMap candidates={candidates} chileOutline={chileOutline} selectedId={selectedId} onSelect={onSelect} />
        <p className="view-note stage-note">Sin WebGL: se muestra el mapa SVG local (sin imágenes satelitales).</p>
      </div>
    )
  }

  const sources = mode === 'flat' ? flatSources : [GLOBE_SOURCE]

  return (
    <div className="map-stage" data-mode={mode} style={{ ['--stage-inset' as string]: `${rightInset}px` }}>
      <StageErrorBoundary onError={() => setFailed(true)}>
        <div className="stage-layer stage-globe" hidden={mode !== 'globe'}>
          <Suspense fallback={<StageLoading text="Cargando globo 3D…" />}>
            <CandidateGlobe
              candidates={candidates}
              chileOutline={chileOutline}
              selectedId={selectedId}
              onSelect={onSelect}
              view={view}
              active={mode === 'globe'}
              rightInset={rightInset}
              onEnterFlat={enterFlat}
              onContextLost={() => setFailed(true)}
            />
          </Suspense>
        </div>
        {entry && !layers && mode === 'flat' && <StageLoading text="Cargando imágenes del mapa…" />}
        {entry && layers && (
          <div className="stage-layer stage-flat" hidden={mode !== 'flat'}>
            <Suspense fallback={<StageLoading text="Cargando mapa 2D…" />}>
              <CandidateFlatMap
                candidates={candidates}
                chileOutline={chileOutline}
                basemaps={layers}
                selectedId={selectedId}
                onSelect={onSelect}
                entry={entry}
                focusRequest={focusRequest}
                active={mode === 'flat'}
                rightInset={rightInset}
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
      </div>
    </div>
  )
}
