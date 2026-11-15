import { useEffect, useState } from 'react'
import { loadDemoSnapshot } from './data/loadDemoSnapshot'
import { loadVisualContext, type VisualContextState } from './data/loadVisualContext'
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

  return <AppShell data={{ ...state, visual }} promise={PRODUCT_PROMISE} />
}

export default App
