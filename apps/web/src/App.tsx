import { useEffect, useMemo, useState } from 'react'
import { CandidateDetails } from './components/CandidateDetails'
import { CandidateComparison } from './components/CandidateComparison'
import { CandidateMap } from './components/CandidateMap'
import { CandidateRanking } from './components/CandidateRanking'
import { loadDemoSnapshot, SNAPSHOT_PATH, type DemoSnapshot } from './data/loadDemoSnapshot'
import { loadVisualContext, type VisualContextState } from './data/loadVisualContext'
import {
  availableCountries, filterByCountry, initialSelection, splitByRole, summarizeSearch, type CountryFilter,
} from './domain/discovery'
import { formatScore } from './domain/formatting'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; snapshot: DemoSnapshot }

const integer = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })

function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [selectedId, setSelectedId] = useState('')
  const [country, setCountry] = useState<CountryFilter>('all')
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
        // El primer seleccionado es un candidato de la búsqueda; la referencia solo si no hay ninguno.
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

  const roles = useMemo(
    () => (loadState.status === 'ready' ? splitByRole(loadState.snapshot.candidates) : { ranked: [], references: [] }),
    [loadState],
  )
  const rankOf = useMemo(() => new Map(roles.ranked.map((candidate, index) => [candidate.site_id, index + 1])), [roles])

  if (loadState.status === 'loading') {
    return (
      <main className="system-state">
        <div className="loader" />
        <p>Cargando snapshot validado…</p>
      </main>
    )
  }

  if (loadState.status === 'error') {
    return (
      <main className="system-state error-state">
        <span>Error de datos</span>
        <h1>No pudimos abrir la demostración.</h1>
        <p>{loadState.message}</p>
        <button type="button" onClick={() => window.location.reload()}>Reintentar</button>
      </main>
    )
  }

  const { snapshot } = loadState
  const selected = snapshot.candidates.find((candidate) => candidate.site_id === selectedId) ?? snapshot.candidates[0] ?? null
  if (!selected) {
    return (
      <main className="system-state error-state">
        <span>Snapshot vacío</span>
        <h1>No existen candidatos ni referencias para mostrar.</h1>
        <p>La búsqueda no dejó sitios en este snapshot. Revisa los resultados de la búsqueda y el contrato de salida.</p>
      </main>
    )
  }

  const fixtureMode = snapshot.candidates.every((candidate) => candidate.status === 'fixture')
  const summary = snapshot.search ? summarizeSearch(snapshot.search) : null

  return (
    <div className="app-shell">
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
        <div className="mission-block">
          <span>Perfil activo</span>
          <strong>{snapshot.profile.name}</strong>
        </div>
        <div className="version-block">
          <span className="status-dot" />
          Snapshot {snapshot.manifest.snapshot_version}
        </div>
      </header>

      <section className="intro-strip">
        <div>
          <span className="section-kicker">{fixtureMode ? 'Corte vertical M1' : 'Piloto Chile–Argentina'}</span>
          <h1>No buscamos un lugar que “parezca Marte”.</h1>
          <p>Priorizamos dónde conviene investigar para una prueba concreta, con evidencia, incertidumbre y límites visibles.</p>
        </div>
        <div className="mission-question">
          <small>Pregunta de misión</small>
          <p>¿Qué zona reproduce mejor condiciones relevantes para percepción, tracción, navegación y autonomía de rover?</p>
        </div>
      </section>

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

      <main className="workspace">
        <CandidateRanking
          ranked={filterByCountry(roles.ranked, country)}
          references={roles.references}
          rankOf={rankOf}
          countries={availableCountries(roles.ranked)}
          country={country}
          onCountryChange={setCountry}
          selectedId={selected.site_id}
          onSelect={setSelectedId}
        />
        <CandidateMap
          candidates={snapshot.candidates}
          rankOf={rankOf}
          outline={snapshot.outline}
          search={snapshot.search}
          precedents={snapshot.precedents}
          selectedId={selected.site_id}
          onSelect={setSelectedId}
        />
        <CandidateDetails
          candidate={selected}
          manifest={snapshot.manifest}
          profile={snapshot.profile}
          visual={visual}
          search={snapshot.search}
          precedents={snapshot.precedents}
        />
      </main>

      <CandidateComparison
        ranked={roles.ranked}
        references={roles.references}
        rankOf={rankOf}
        selectedId={selected.site_id}
        onSelect={setSelectedId}
      />

      <section id="method" className="method-section" aria-labelledby="method-title">
        <div className="method-intro">
          <span className="section-kicker">Método reproducible</span>
          <h2 id="method-title">Primero se busca; después se caracteriza.</h2>
          <p>
            Cada ventana de la rejilla se compara con MOLA a la misma escala (~480 m). Solo las preseleccionadas reciben
            doce meses de Sentinel-2 y contexto climático POWER, que describe una celda mayor que la ventana. Yungay se
            recalcula con las mismas reglas y queda fuera del ranking.
          </p>
          <a href={`${import.meta.env.BASE_URL}${SNAPSHOT_PATH}/analysis-summary.json`} target="_blank" rel="noreferrer">Abrir análisis auditable ↗</a>
          {snapshot.search && (
            <a href={`${import.meta.env.BASE_URL}${SNAPSHOT_PATH}/search-results.json`} target="_blank" rel="noreferrer">Abrir las {snapshot.search.windows.length} ventanas y sus motivos ↗</a>
          )}
        </div>
        <ol className="method-steps">
          <li><b>01</b><strong>Rejilla regional</strong><span>Ventanas de 0,2° derivadas de origen y paso · sin elección manual</span></li>
          <li><b>02</b><strong>Prioridad topográfica</strong><span>NASADEM agregado vs MOLA en Jezero · solo ordena</span></li>
          <li><b>03</b><strong>Antecedentes</strong><span>Coordenadas publicadas excluyen; nada se declara nuevo</span></li>
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
