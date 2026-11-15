import { useEffect, useState } from 'react'
import { loadDemoSnapshot } from './data/loadDemoSnapshot'
import { loadVisualContext, type VisualContextState } from './data/loadVisualContext'
import type { AppGeology } from './data/loadAppGeology'
import { LiquidBackdrop } from './liquid/LiquidGlass'
import type { AppData } from './shell/appData'
import { AppShell } from './shell/AppShell'

type SnapshotState = Pick<AppData, 'status' | 'snapshot' | 'error'>

/**
 * Product promise (the same as the team planner, ADR-009): it prioritizes for
 * reconnaissance; it does not approve terrain. The shell shows it in the initial Explore state and
 * in the Mission header.
 */
const PRODUCT_PROMISE =
  'Prioritizes which sectors deserve reconnaissance for a rover test, with regional measurements and pending field checks. It does not measure traction or approve terrain.'

/**
 * Loads the data at the system boundary (snapshot validated against the contracts and optional
 * visual context) and delivers the shell. The shell is drawn without waiting for the data.
 */
function App() {
  const [state, setState] = useState<SnapshotState>({ status: 'loading', snapshot: null, error: null })
  const [visual, setVisual] = useState<VisualContextState>({ status: 'loading' })
  const [geology, setGeology] = useState<AppGeology | undefined>(undefined)

  // The visual context is optional: it is loaded separately and never blocks or breaks the snapshot.
  useEffect(() => {
    let active = true
    void loadVisualContext().then((next) => {
      if (active) setVisual(next)
    })
    return () => {
      active = false
    }
  }, [])

  // The official geological context (M9) is optional: it is validated against the already loaded candidates and
  // never blocks the detail sheet or the mission. Its validator (Ajv at runtime) goes in a deferred chunk, which is
  // requested at an idle moment so as not to compete with the globe startup.
  const candidatesForGeology = state.status === 'ready' && state.snapshot ? state.snapshot.candidates : null
  useEffect(() => {
    if (!candidatesForGeology) return
    let active = true
    const start = () => {
      void import('./data/loadAppGeology')
        .then((module) => module.loadAppGeology(candidatesForGeology))
        .catch((): AppGeology => ({ state: { status: 'unavailable', reason: 'The geological context module could not be loaded.' }, readySites: new Set() }))
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
        const message = error instanceof Error ? error.message : 'Unknown error while loading the snapshot.'
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
        <span>✕ Data error</span>
        <h1>We could not open the demo.</h1>
        <p role="alert">{state.error}</p>
        <button type="button" onClick={() => window.location.reload()}>Retry</button>
      </main>
    )
  }

  return <AppShell data={{ ...state, visual, geology }} promise={PRODUCT_PROMISE} />
}

export default App
