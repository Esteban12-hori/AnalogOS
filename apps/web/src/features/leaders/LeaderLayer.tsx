/**
 * Capa de líneas Tesla (slot `stage.overlay`). Este archivo va en el chunk principal y solo
 * decide si hay algo que dibujar: un sector evaluado seleccionado y el interruptor encendido.
 * El dibujo (modelo, layout, controlador y CSS) se carga en diferido (§6.1: líneas ≤4 KB) y se
 * precarga en reposo cuando el snapshot está listo. Con un ◆ seleccionado no se dibuja nada.
 */
import { lazy, Suspense, useEffect } from 'react'
import { useUi } from '../../state/ui'
import { getStageAnchor, getStageProjection, subscribeStageFrame } from '../globe'
import type { LeaderLayerProps } from './index'
import { useLeadersEnabled } from './preference'
import type { LeaderStageBridge } from './projector'

const loadCanvas = () => import('./LeaderCanvas')
// Si el chunk no carga (sin red, ZIP incompleto) la capa simplemente no se dibuja.
const LeaderCanvas = lazy(() => loadCanvas().catch(() => ({ default: () => null })))

// Inyectados aquí (chunk principal, donde ya viven MapStage y MetricRail) para que la parte
// diferida no importe índices de otras features: eso hace que Rolldown saque React del chunk
// principal a chunks compartidos con más peticiones en la ruta crítica.
const STAGE_BRIDGE: LeaderStageBridge = {
  subscribe: subscribeStageFrame,
  read: () => ({ projection: getStageProjection(), anchor: getStageAnchor() }),
}

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

export function LeaderLayer({ data }: LeaderLayerProps) {
  const selection = useUi((state) => state.selection)
  const enabled = useLeadersEnabled()
  const ready = data.status === 'ready'

  useEffect(() => {
    if (!ready) return
    const win = window as IdleWindow
    const preload = () => void loadCanvas().catch(() => undefined)
    if (win.requestIdleCallback) {
      const handle = win.requestIdleCallback(preload, { timeout: 4000 })
      return () => win.cancelIdleCallback?.(handle)
    }
    const handle = window.setTimeout(preload, 2000)
    return () => window.clearTimeout(handle)
  }, [ready])

  const site = selection?.kind === 'evaluated'
    ? data.snapshot?.candidates.find((candidate) => candidate.site_id === selection.siteId) ?? null
    : null
  if (!enabled || !site) return null
  return (
    <Suspense fallback={null}>
      <LeaderCanvas data={data} site={site} bridge={STAGE_BRIDGE} />
    </Suspense>
  )
}
