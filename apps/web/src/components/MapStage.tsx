import { Component, lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { CandidateSite, GeoJsonFeatureCollection } from '../domain/contracts'
import { loadBasemaps, type ActiveSource, type Basemap } from '../data/loadBasemaps'
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
export function MapStage({ candidates, chileOutline, selectedId, onSelect, rightInset }: MapStageProps) {
  const [webgl] = useState(supportsWebGL)
  const [failed, setFailed] = useState(false)
  const [mode, setMode] = useState<Mode>('globe')
  const [view, setView] = useState<GlobeView>({ kind: 'global', nonce: 0 })
  const [entry, setEntry] = useState<FlatHandoff | null>(null)
  const [focusRequest, setFocusRequest] = useState(0)
  const [pendingFocus, setPendingFocus] = useState(false)
  const [basemaps, setBasemaps] = useState<Basemap[]>([])
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

  const exitFlat = useCallback((handoff: FlatHandoff) => {
    setView((current) => ({ kind: 'at', nonce: current.nonce + 1, at: handoff }))
    setMode('globe')
  }, [])

  const goGlobal = () => {
    setMode('globe')
    setView((current) => ({ kind: 'global', nonce: current.nonce + 1 }))
  }

  const goClose = () => {
    if (mode === 'flat') {
      setFocusRequest((value) => value + 1)
      return
    }
    setPendingFocus(true)
    setView((current) => ({ kind: 'close', nonce: current.nonce + 1 }))
  }

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
        {entry && (
          <div className="stage-layer stage-flat" hidden={mode !== 'flat'}>
            <Suspense fallback={<StageLoading text="Cargando mapa 2D…" />}>
              <CandidateFlatMap
                candidates={candidates}
                chileOutline={chileOutline}
                basemaps={basemaps}
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
          {sources.length ? (
            sources.map((source) => (
              <span key={source.id}>
                <strong>{source.label}</strong>
                <em>{source.detail}</em>
              </span>
            ))
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
