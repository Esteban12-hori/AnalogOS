import { Component, lazy, Suspense, useState, type ReactNode } from 'react'
import type { CandidateSite, GeoJsonFeatureCollection } from '../domain/contracts'
import { CandidateMap } from './CandidateMap'
import type { GlobeView } from './CandidateGlobe'
import './CandidateGlobe.css'

// three.js se carga en un chunk aparte: el mapa SVG y el resto de la app no lo pagan.
const CandidateGlobe = lazy(() => import('./CandidateGlobe'))

interface CandidateMapViewProps {
  candidates: CandidateSite[]
  chileOutline: GeoJsonFeatureCollection
  selectedId: string
  onSelect: (siteId: string) => void
}

type Mode = 'globe' | 'svg'

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

class GlobeErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
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

export function CandidateMapView({ candidates, chileOutline, selectedId, onSelect }: CandidateMapViewProps) {
  const [webgl] = useState(supportsWebGL)
  const [mode, setMode] = useState<Mode>(webgl ? 'globe' : 'svg')
  const [globeFailed, setGlobeFailed] = useState(false)
  const [view, setView] = useState<GlobeView>({ kind: 'global', nonce: 0 })
  const fixtureMode = candidates.every((candidate) => candidate.status === 'fixture')
  const globeAvailable = webgl && !globeFailed
  const showGlobe = mode === 'globe' && globeAvailable

  const fallBackToSvg = () => {
    setGlobeFailed(true)
    setMode('svg')
  }

  const switcher = (
    <div className="view-switch" role="group" aria-label="Tipo de vista">
      <button type="button" aria-pressed={showGlobe} disabled={!globeAvailable} onClick={() => setMode('globe')}>
        Globo 3D
      </button>
      <button type="button" aria-pressed={!showGlobe} onClick={() => setMode('svg')}>
        Mapa 2D
      </button>
    </div>
  )

  // El globo se mantiene montado (pausado y oculto) al pasar a 2D: evita recargar
  // texturas y el desmontaje de los rótulos DOM de drei, que falla con React 19.
  return (
    <div className="map-view">
      {!showGlobe && (
        <>
          <CandidateMap candidates={candidates} chileOutline={chileOutline} selectedId={selectedId} onSelect={onSelect} />
          <div className="map-view-tools">
            {switcher}
            {!globeAvailable && <span className="view-note">Sin WebGL: se usa el mapa SVG local.</span>}
          </div>
        </>
      )}
      {globeAvailable && (
        <div className="map-frame globe-frame" hidden={!showGlobe}>
          <div className="map-heading">
            <div>
              <span className="section-kicker">Explorador planetario</span>
              <h2>{fixtureMode ? 'Zonas de demostración' : 'Sectores priorizados'}</h2>
            </div>
            <span className="offline-chip">WebGL · texturas locales</span>
          </div>

          <GlobeErrorBoundary onError={fallBackToSvg}>
            <Suspense fallback={<div className="globe-loading globe-loading-page" role="status"><span className="loader" />Cargando globo 3D…</div>}>
              <CandidateGlobe
                candidates={candidates}
                chileOutline={chileOutline}
                selectedId={selectedId}
                onSelect={onSelect}
                view={view}
                active={showGlobe}
                onContextLost={fallBackToSvg}
              />
            </Suspense>
          </GlobeErrorBoundary>

          <div className="map-legend" aria-label="Leyenda del globo">
            <span><i className="legend-swatch candidate" /> {fixtureMode ? 'Fixture con score' : 'Polígono candidato'}</span>
            <span><i className="legend-swatch insufficient" /> Datos insuficientes</span>
            <span><i className="legend-swatch outline globe-outline" /> Contorno referencial</span>
            <span className="legend-credit">Textura: NASA Blue Marble · relieve NASA (dominio público)</span>
          </div>
          <div className="map-view-tools">
            {switcher}
            <div className="view-switch" role="group" aria-label="Encuadre del globo">
              <button type="button" aria-pressed={view.kind === 'global'} onClick={() => setView((current) => ({ kind: 'global', nonce: current.nonce + 1 }))}>
                Vista global
              </button>
              <button type="button" aria-pressed={view.kind === 'close'} onClick={() => setView((current) => ({ kind: 'close', nonce: current.nonce + 1 }))}>
                Acercar a la zona
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
