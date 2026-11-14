import { useEffect, useMemo, useRef, useState } from 'react'
import { CandidateDetails } from './components/CandidateDetails'
import { CandidateComparison } from './components/CandidateComparison'
import { MapStage } from './components/MapStage'
import { LiquidNav, liquidIcons, type LiquidNavItem } from './components/LiquidNav'
import { SurfaceSignals } from './components/SurfaceSignals'
import { LiquidBackdrop, useLiquidPointer } from './liquid/LiquidGlass'
import { loadDemoSnapshot, type DemoSnapshot } from './data/loadDemoSnapshot'
import { loadVisualContext, type VisualContextState } from './data/loadVisualContext'
import { rankCandidates } from './domain/scoring'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; snapshot: DemoSnapshot }

const NAV_ITEMS: LiquidNavItem[] = [
  { id: 'workspace', label: 'Explorar', icon: liquidIcons.globe, fx: 'spin' },
  { id: 'signals', label: 'Señal', icon: liquidIcons.signal, fx: 'wave' },
  { id: 'comparison', label: 'Comparar', icon: liquidIcons.compare, fx: 'pop' },
  { id: 'method', label: 'Método', icon: liquidIcons.method, fx: 'drop' },
]

/** Sección visible para la navbar; se pausa mientras dura un desplazamiento pedido por clic. */
function useScrollSpy(ids: readonly string[], enabled: boolean) {
  const [active, setActive] = useState(0)
  const lockUntil = useRef(0)
  useEffect(() => {
    if (!enabled) return
    const onScroll = () => {
      if (performance.now() < lockUntil.current) return
      const line = window.innerHeight * 0.35
      let current = 0
      ids.forEach((id, index) => {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= line) current = index
      })
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [ids, enabled])
  const goTo = (index: number) => {
    setActive(index)
    lockUntil.current = performance.now() + 900
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    document.getElementById(ids[index] ?? '')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }
  return { active, goTo }
}

const NAV_IDS = NAV_ITEMS.map((item) => item.id)

/** Ancho que la ficha flotante tapa a la derecha (0 cuando la ficha baja bajo el globo). */
const DETAILS_INSET = 520
const FLOATING_DETAILS_QUERY = '(min-width: 1100px)'

function useRightInset(): number {
  const query = () => (window.matchMedia?.(FLOATING_DETAILS_QUERY).matches ? DETAILS_INSET : 0)
  const [inset, setInset] = useState(query)
  useEffect(() => {
    const media = window.matchMedia?.(FLOATING_DETAILS_QUERY)
    if (!media) return
    const update = () => setInset(media.matches ? DETAILS_INSET : 0)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return inset
}

/** Al bajar del primer pantallazo, el globo se oscurece y deja de capturar la rueda del mouse. */
function useStagePassive(enabled: boolean): boolean {
  const [passive, setPassive] = useState(false)
  useEffect(() => {
    if (!enabled) return
    const onScroll = () => setPassive(window.scrollY > window.innerHeight * 0.45)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [enabled])
  return passive
}

function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [selectedId, setSelectedId] = useState('')
  const [visual, setVisual] = useState<VisualContextState>({ status: 'loading' })

  // El contexto visual es opcional: se carga aparte y nunca bloquea ni rompe el snapshot.
  useEffect(() => {
    let active = true
    void loadVisualContext().then((state) => {
      if (active) setVisual(state)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    loadDemoSnapshot()
      .then((snapshot) => {
        if (!active) return
        const first = rankCandidates(snapshot.candidates)[0]
        setSelectedId(first?.site_id ?? '')
        setLoadState({ status: 'ready', snapshot })
      })
      .catch((error: unknown) => {
        if (!active) return
        const message = error instanceof Error ? error.message : 'Error desconocido al cargar el snapshot.'
        setLoadState({ status: 'error', message })
      })
    return () => {
      active = false
    }
  }, [])

  const selected = useMemo(() => {
    if (loadState.status !== 'ready') return null
    return loadState.snapshot.candidates.find((candidate) => candidate.site_id === selectedId)
      ?? loadState.snapshot.candidates[0]
      ?? null
  }, [loadState, selectedId])

  const { active, goTo } = useScrollSpy(NAV_IDS, loadState.status === 'ready')
  const rightInset = useRightInset()
  const [mapFocus, setMapFocus] = useState(0)
  const stagePassive = useStagePassive(loadState.status === 'ready')
  useLiquidPointer()

  if (loadState.status === 'loading') {
    return (
      <main className="system-state">
        <LiquidBackdrop />
        <div className="loader" />
        <p>Cargando snapshot validado…</p>
      </main>
    )
  }

  if (loadState.status === 'error') {
    return (
      <main className="system-state error-state">
        <LiquidBackdrop />
        <span>Error de datos</span>
        <h1>No pudimos abrir la demostración.</h1>
        <p>{loadState.message}</p>
        <button type="button" onClick={() => window.location.reload()}>Reintentar</button>
      </main>
    )
  }

  const { snapshot } = loadState
  if (!selected) {
    return (
      <main className="system-state error-state">
        <LiquidBackdrop />
        <span>Snapshot vacío</span>
        <h1>No existen candidatos para mostrar.</h1>
        <p>Ejecuta el pipeline demo y verifica el contrato de salida.</p>
      </main>
    )
  }

  const fixtureMode = snapshot.candidates.every((candidate) => candidate.status === 'fixture')

  return (
    <div className={`app-shell${stagePassive ? ' stage-passive' : ''}`}>
      <MapStage
        candidates={snapshot.candidates}
        chileOutline={snapshot.chileOutline}
        selectedId={selected.site_id}
        onSelect={setSelectedId}
        rightInset={rightInset}
        visual={visual}
        focusSignal={mapFocus}
      />
      <div className="stage-scrim" aria-hidden="true" />
      <div className={`fixture-banner${fixtureMode ? '' : ' science-banner'}`} role="status">
        <span />
        {fixtureMode
          ? 'DEMOSTRACIÓN TÉCNICA · DATOS SINTÉTICOS · NO ES UN RESULTADO CIENTÍFICO'
          : 'SCREENING CIENTÍFICO PRELIMINAR · DATOS REALES · NO ES AUTORIZACIÓN DE TERRENO'}
      </div>
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true" />
          <div>
            <strong>AnalogOS Chile</strong>
            <small>Earth analog decision system</small>
          </div>
        </div>
        <LiquidNav items={NAV_ITEMS} active={active} onSelect={goTo} />
        <div className="version-block">
          <span className="status-dot" />
          Snapshot {snapshot.manifest.snapshot_version}
        </div>
      </header>

      <main id="workspace" className="hero">
        <section className="hero-intro glass" aria-labelledby="hero-title">
          <span className="section-kicker">{fixtureMode ? 'Corte vertical M1' : 'Snapshot científico v2'} · {snapshot.profile.name}</span>
          <h1 id="hero-title">No buscamos un lugar que “parezca Marte”.</h1>
          <p>¿Qué zona reproduce mejor condiciones relevantes para percepción, tracción, navegación y autonomía de rover? Elige un sector en el mapa.</p>
        </section>
        <CandidateDetails
          key={selected.site_id}
          candidate={selected}
          candidates={snapshot.candidates}
          onSelect={setSelectedId}
          profile={snapshot.profile}
          marsReference={snapshot.marsReference}
          visual={visual}
          onShowOnMap={() => {
            setMapFocus((value) => value + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      </main>

      <SurfaceSignals candidates={snapshot.candidates} selectedId={selected.site_id} series={snapshot.surfaceSeries} />

      <CandidateComparison
        candidates={snapshot.candidates}
        selectedId={selected.site_id}
        onSelect={setSelectedId}
      />

      <section id="method" className="method-section glass" aria-labelledby="method-title">
        <div className="method-intro">
          <span className="section-kicker">Método reproducible</span>
          <h2 id="method-title">La comparación ocurre a la misma escala.</h2>
          <p>NASADEM se mosaica y agrega desde ~30 m a ~480 m antes de compararlo con MOLA. Sentinel-2 aporta doce observaciones mensuales de superficie y POWER solo contexto climático regional.</p>
          <a href={`${import.meta.env.BASE_URL}${import.meta.env.VITE_SNAPSHOT_PATH ?? 'science-v2'}/analysis-summary.json`} target="_blank" rel="noreferrer">Abrir análisis auditable ↗</a>
        </div>
        <ol className="method-steps">
          <li><b>01</b><strong>Referencia MOLA</strong><span>Entorno regional de Jezero · ~451 m nominal</span></li>
          <li><b>02</b><strong>Terreno NASADEM</strong><span>Mosaico multitesela · bloques 16×16 · ~480 m</span></li>
          <li><b>03</b><strong>Superficie Sentinel-2</strong><span>12 mosaicos mensuales · SCL, NDVI y BSI · ~30 m</span></li>
          <li><b>04</b><strong>Decisión separada</strong><span>Similitud ≠ confianza ≠ factibilidad</span></li>
        </ol>
      </section>

      <footer className="app-footer">
        <span>NASA Space Apps Challenge 2026</span>
        <span>Static-first · contratos validados · snapshot reproducible</span>
        <span>Pipeline {snapshot.manifest.pipeline_version}</span>
      </footer>
    </div>
  )
}

export default App
