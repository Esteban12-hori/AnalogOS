import { useEffect, useMemo, useState } from 'react'
import { CandidateDetails } from './components/CandidateDetails'
import { CandidateComparison } from './components/CandidateComparison'
import { CandidateMap } from './components/CandidateMap'
import { CandidateRanking } from './components/CandidateRanking'
import { loadDemoSnapshot, type DemoSnapshot } from './data/loadDemoSnapshot'
import { rankCandidates } from './domain/scoring'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; snapshot: DemoSnapshot }

function App() {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [selectedId, setSelectedId] = useState('')

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
  if (!selected) {
    return (
      <main className="system-state error-state">
        <span>Snapshot vacío</span>
        <h1>No existen candidatos para mostrar.</h1>
        <p>Ejecuta el pipeline demo y verifica el contrato de salida.</p>
      </main>
    )
  }

  const fixtureMode = snapshot.candidates.every((candidate) => candidate.status === 'fixture')

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
            <strong>AnalogOS Chile</strong>
            <small>Earth analog decision system</small>
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
          <span className="section-kicker">{fixtureMode ? 'Corte vertical M1' : 'Snapshot científico v2'}</span>
          <h1>No buscamos un lugar que “parezca Marte”.</h1>
          <p>Priorizamos dónde conviene investigar para una prueba concreta, con evidencia, incertidumbre y límites visibles.</p>
        </div>
        <div className="mission-question">
          <small>Pregunta de misión</small>
          <p>¿Qué zona reproduce mejor condiciones relevantes para percepción, tracción, navegación y autonomía de rover?</p>
        </div>
      </section>

      <main className="workspace">
        <CandidateRanking
          candidates={snapshot.candidates}
          selectedId={selected.site_id}
          onSelect={setSelectedId}
        />
        <CandidateMap
          candidates={snapshot.candidates}
          chileOutline={snapshot.chileOutline}
          selectedId={selected.site_id}
          onSelect={setSelectedId}
        />
        <CandidateDetails candidate={selected} manifest={snapshot.manifest} profile={snapshot.profile} />
      </main>

      <CandidateComparison
        candidates={snapshot.candidates}
        selectedId={selected.site_id}
        onSelect={setSelectedId}
      />

      <section id="method" className="method-section" aria-labelledby="method-title">
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
