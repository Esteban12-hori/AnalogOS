/**
 * Tesla lines layer (slot `stage.overlay`). This file goes in the main chunk and only
 * decides whether there is anything to draw: a selected evaluated sector and the toggle switched on.
 * The drawing (model, layout, controller and CSS) is lazy-loaded (§6.1: lines ≤4 KB) and is
 * preloaded when idle once the snapshot is ready. With a ◆ selected, nothing is drawn.
 */
import { lazy, Suspense, useEffect } from 'react'
import { useUi } from '../../state/ui'
import { getStageAnchor, getStageProjection, subscribeStageFrame } from '../globe'
import type { LeaderLayerProps } from './index'
import { useLeadersEnabled } from './preference'
import type { LeaderStageBridge } from './projector'

const loadCanvas = () => import('./LeaderCanvas')
// If the chunk fails to load (no network, incomplete ZIP), the layer simply isn't drawn.
const LeaderCanvas = lazy(() => loadCanvas().catch(() => ({ default: () => null })))

// Injected here (main chunk, where MapStage and MetricRail already live) so that the lazy
// part does not import indexes from other features: that makes Rolldown pull React out of the
// main chunk into shared chunks with more requests on the critical path.
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
