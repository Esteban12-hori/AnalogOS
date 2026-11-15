import { useEffect, useMemo, useRef, useState } from 'react'
import { CandidateDetails } from './components/CandidateDetails'
import { CandidateComparison } from './components/CandidateComparison'
import { MapStage } from './components/MapStage'
import { LiquidNav, liquidIcons, type LiquidNavItem } from './components/LiquidNav'
import { SurfaceSignals } from './components/SurfaceSignals'
import { LiquidBackdrop, useLiquidPointer } from './liquid/LiquidGlass'
import { loadDemoSnapshot, SNAPSHOT_PATH, type DemoSnapshot } from './data/loadDemoSnapshot'
import { loadVisualContext, type VisualContextState } from './data/loadVisualContext'
import { loadGeologyContext } from './data/loadGeologyContext'
import type { GeologyContextState } from './domain/geologyContext'
import { availableCountries, filterByCountry, initialSelection, splitByRole, summarizeSearch, type CountryFilter } from './domain/discovery'
import { formatScore } from './domain/formatting'
import { CandidateRanking } from './components/CandidateRanking'
import { CandidateMap } from './components/CandidateMap'
import { PlannerPanel, type PlannerIntent } from './components/planner/PlannerPanel'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; snapshot: DemoSnapshot }

const NAV_ITEMS: LiquidNavItem[] = [
  { id: 'workspace', label: 'Explorar', icon: liquidIcons.globe, fx: 'spin' },
  { id: 'planner', label: 'Planificar', icon: liquidIcons.planner, fx: 'glow' },
  { id: 'discovery', label: 'Búsqueda', icon: liquidIcons.ranking, fx: 'pop' },
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

const integer = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })

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
  const [country, setCountry] = useState<CountryFilter>('all')
  const [visual, setVisual] = useState<VisualContextState>({ status: 'loading' })
  const [geology, setGeology] = useState<GeologyContextState>({ status: 'loading' })
  const [intent, setIntent] = useState<PlannerIntent | null>(null)

  const openPlanner = (journey: PlannerIntent['journey'], siteId?: string) => {
    setIntent({ journey, siteId, nonce: Date.now() })
    requestAnimationFrame(() => document.getElementById('planner')?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }))
  }

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

  // El contexto geológico es opcional: se valida contra los candidatos ya cargados y nunca bloquea la ficha ni M8.
  const candidatesForGeology = loadState.status === 'ready' ? loadState.snapshot.candidates : null
  useEffect(() => {
    if (!candidatesForGeology) return
    let active = true
    void loadGeologyContext(candidatesForGeology).then((state) => {
      if (active) setGeology(state)
    })
    return () => {
      active = false
    }
  }, [candidatesForGeology])

  useEffect(() => {
    let active = true
    loadDemoSnapshot()
      .then((snapshot) => {
        if (!active) return
        setSelectedId(initialSelection(snapshot.candidates))
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

  const roles = useMemo(() => loadState.status === 'ready' ? splitByRole(loadState.snapshot.candidates) : { ranked: [], references: [] }, [loadState])
  const rankOf = useMemo(() => new Map(roles.ranked.map((candidate, index) => [candidate.site_id, index + 1])), [roles])

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
        <h1>No existen candidatos ni referencias para mostrar.</h1>
        <p>La búsqueda no dejó sitios en este snapshot. Revisa los resultados y el contrato de salida.</p>
      </main>
    )
  }

  const fixtureMode = snapshot.candidates.every((candidate) => candidate.status === 'fixture')
  const summary = snapshot.search ? summarizeSearch(snapshot.search) : null

  return (
    <div className={`app-shell${stagePassive ? ' stage-passive' : ''}`}>
      <MapStage
        candidates={snapshot.candidates}
        chileOutline={snapshot.outline}
        search={snapshot.search}
        precedents={snapshot.precedents}
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
            <strong>AnalogOS</strong>
            <small>Exploración de análogos planetarios · Piloto Chile–Argentina</small>
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
          <span className="section-kicker">{fixtureMode ? 'Corte vertical M1' : 'Piloto Chile–Argentina'} · {snapshot.profile.name}</span>
          <h1 id="hero-title">No buscamos un lugar que “parezca Marte”.</h1>
          <p>Prioriza qué sectores merecen reconocimiento para un ensayo de rover, con medidas regionales y verificaciones de campo pendientes. No mide tracción ni aprueba terreno. Elige un sector en el mapa o parte de tu prueba.</p>
          <div className="hero-cta" role="group" aria-label="Empezar">
            <button type="button" className="hero-cta-main" onClick={() => openPlanner('test')}>Definir una prueba</button>
            <button type="button" className="hero-cta-alt" onClick={() => openPlanner('sector')}>Evaluar un sector</button>
          </div>
        </section>
        <CandidateDetails
          key={selected.site_id}
          candidate={selected}
          candidates={snapshot.candidates}
          onSelect={setSelectedId}
          profile={snapshot.profile}
          search={snapshot.search}
          precedents={snapshot.precedents}
          marsReference={snapshot.marsReference}
          visual={visual}
          geology={geology}
          onEvaluate={(siteId) => openPlanner('sector', siteId)}
          onShowOnMap={() => {
            setMapFocus((value) => value + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      </main>

      <PlannerPanel snapshot={snapshot} intent={intent} geology={geology} />

      <section id="discovery" className="discovery-section" aria-label="Búsqueda regional y referencia">
      {summary && snapshot.search && (
        <section className="search-strip" aria-labelledby="search-title">
          <div>
            <span className="section-kicker">Alcance de la búsqueda</span>
            <h2 id="search-title">Un piloto acotado, no una búsqueda global</h2>
            <p>{snapshot.search.scope_note}</p>
          </div>
          <dl>
            <div><dt>Regiones de prueba</dt><dd>{summary.regions}</dd></div>
            <div><dt>Ventanas de ~20 km</dt><dd>{summary.evaluated} evaluadas de {summary.attempted}</dd></div>
            <div><dt>Área explorada</dt><dd>≈ {integer.format(summary.exploredAreaKm2)} km²</dd></div>
            <div><dt>Con coordenadas publicadas</dt><dd>{summary.excludedByPrecedent} excluidas del ranking</dd></div>
            <div><dt>Preseleccionadas</dt><dd>{summary.selected} · hasta {summary.maxPerCountry} por país</dd></div>
            <div><dt>Criterio</dt><dd>Prioridad topográfica y centros a ≥ {formatScore(summary.minDistanceKm)} km</dd></div>
          </dl>
          <ul className="region-list">
            {snapshot.search.regions.map((region) => (
              <li key={region.region_id}>
                <strong>{region.name}</strong>
                <span>bbox {region.bbox.join(', ')} · {region.windows_evaluated} ventanas · {region.windows_selected} preseleccionadas</span>
              </li>
            ))}
          </ul>
        </section>
      )}
        <div className="discovery-workspace glass">
          <CandidateRanking ranked={filterByCountry(roles.ranked, country)} references={roles.references}
            rankOf={rankOf} countries={availableCountries(roles.ranked)} country={country}
            onCountryChange={setCountry} selectedId={selected.site_id} onSelect={setSelectedId} />
          <CandidateMap candidates={snapshot.candidates} rankOf={rankOf} outline={snapshot.outline}
            search={snapshot.search} precedents={snapshot.precedents} selectedId={selected.site_id} onSelect={setSelectedId} />
        </div>
      </section>

      <SurfaceSignals candidates={snapshot.candidates} selectedId={selected.site_id} series={snapshot.surfaceSeries} />

      <CandidateComparison
        ranked={roles.ranked}
        references={roles.references}
        rankOf={rankOf}
        selectedId={selected.site_id}
        onSelect={setSelectedId}
      />

      <section id="method" className="method-section glass" aria-labelledby="method-title">
        <div className="method-intro">
          <span className="section-kicker">Método reproducible</span>
          <h2 id="method-title">Primero se busca; después se caracteriza.</h2>
          <p>La rejilla de 50 ventanas se compara con MOLA a ~480 m. Solo las preseleccionadas reciben Sentinel-2 mensual y contexto regional POWER. Yungay conserva sus datos y queda fuera del ranking.</p>
          <a href={`${import.meta.env.BASE_URL}${SNAPSHOT_PATH}/analysis-summary.json`} target="_blank" rel="noreferrer">Abrir análisis auditable ↗</a>
          {snapshot.search && <a href={`${import.meta.env.BASE_URL}${SNAPSHOT_PATH}/search-results.json`} target="_blank" rel="noreferrer">Abrir las 50 ventanas y sus motivos ↗</a>}
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
