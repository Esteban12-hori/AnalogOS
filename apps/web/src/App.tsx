import { useEffect, useState } from 'react'
import { loadDemoSnapshot } from './data/loadDemoSnapshot'
import { loadVisualContext, type VisualContextState } from './data/loadVisualContext'
import type { AppGeology } from './data/loadAppGeology'
import { LiquidBackdrop } from './liquid/LiquidGlass'
import type { AppData } from './shell/appData'
import { AppShell } from './shell/AppShell'

type SnapshotState = Pick<AppData, 'status' | 'snapshot' | 'error'>

/**
 * Promesa del producto (la misma que el planificador del equipo, ADR-009): prioriza para
 * reconocimiento; no aprueba terreno. El armazón la muestra en el estado inicial de Explorar y
 * en la cabecera de Misión.
 */
const PRODUCT_PROMISE =
  'Prioriza qué sectores merecen reconocimiento para un ensayo de rover, con medidas regionales y verificaciones de campo pendientes. No mide tracción ni aprueba terreno.'

/**
 * Carga los datos en el límite del sistema (snapshot validado contra los contratos y contexto
 * visual opcional) y entrega el armazón. El armazón se dibuja sin esperar los datos.
 */
function App() {
  const [state, setState] = useState<SnapshotState>({ status: 'loading', snapshot: null, error: null })
  const [visual, setVisual] = useState<VisualContextState>({ status: 'loading' })
  const [geology, setGeology] = useState<AppGeology | undefined>(undefined)

  // El contexto visual es opcional: se carga aparte y nunca bloquea ni rompe el snapshot.
  useEffect(() => {
    let active = true
    void loadVisualContext().then((next) => {
      if (active) setVisual(next)
    })
    return () => {
      active = false
    }
  }, [])

  // El contexto geológico oficial (M9) es opcional: se valida contra los candidatos ya cargados y
  // nunca bloquea la ficha ni la misión. Su validador (Ajv en runtime) va en un chunk diferido, que se
  // pide en un momento ocioso para no competir con el arranque del globo.
  const candidatesForGeology = state.status === 'ready' && state.snapshot ? state.snapshot.candidates : null
  useEffect(() => {
    if (!candidatesForGeology) return
    let active = true
    const start = () => {
      void import('./data/loadAppGeology')
        .then((module) => module.loadAppGeology(candidatesForGeology))
        .catch((): AppGeology => ({ state: { status: 'unavailable', reason: 'No se pudo cargar el módulo del contexto geológico.' }, readySites: new Set() }))
        .then((next) => {
          if (active) setGeology(next)
        })
    }
    const idle = typeof window.requestIdleCallback === 'function'
    const handle = idle ? window.requestIdleCallback(start, { timeout: 1500 }) : window.setTimeout(start, 300)
    return () => {
      active = false
      if (idle) window.cancelIdleCallback(handle)
      else window.clearTimeout(handle)
    }
  }, [candidatesForGeology])

  useEffect(() => {
    let active = true
    loadDemoSnapshot()
      .then((snapshot) => {
        if (active) setState({ status: 'ready', snapshot, error: null })
      })
      .catch((error: unknown) => {
        if (!active) return
        const message = error instanceof Error ? error.message : 'Error desconocido al cargar el snapshot.'
        setState({ status: 'error', snapshot: null, error: message })
      })
    return () => {
      active = false
    }
  }, [])

  if (state.status === 'error') {
    return (
      <main className="system-state error-state">
        <LiquidBackdrop />
        <span>✕ Error de datos</span>
        <h1>No pudimos abrir la demostración.</h1>
        <p role="alert">{state.error}</p>
        <button type="button" onClick={() => window.location.reload()}>Reintentar</button>
      </main>
    )
  }

  return <AppShell data={{ ...state, visual, geology }} promise={PRODUCT_PROMISE} />
}

export default App
