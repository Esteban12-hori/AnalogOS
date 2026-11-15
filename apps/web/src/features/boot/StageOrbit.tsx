/**
 * AI wait orbit around the globe (§2.3 C, §4.4): requested by OrbitLoader with
 * `placement="globe"`. Deferred chunk: it is downloaded the first time it is requested. It is in phase with the
 * composer (both start when the wait is activated, +300 ms), is only visible while the global view is on
 * screen, and closes with a fade when the results arrive. The globe's per-frame channel arrives
 * via props (so this chunk does not drag in modules from the main one).
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { globeScreenCenter } from '../../domain/mapZoom'
import { useViewportLayout } from '../../shell/public'
import { useUi } from '../../state/ui'
import type { StageProjection } from '../globe'
import { ORBIT_DELAY_MS, orbitGeometry, orbitVars } from './bootModel'
import { now, useStageOrbit, type OrbitRequest } from './milestones'

/**
 * The orbit only accompanies the global view. Without a per-frame channel (the globe is not publishing yet), the
 * global view is assumed. With a channel: globe mode, the Chile–Argentina pilot (initial point of view) near the center
 * and a scale similar to that of the global view (40° of arc ≈ r·sin 40°; it grows as you zoom in).
 */
export function globalViewOnScreen(projection: Pick<StageProjection, 'mode' | 'project'> | null, center: { x: number; y: number }, radius: number): boolean {
  if (!projection) return true
  const home = projection.project(-68.6, -25)
  const east = projection.project(-28.6, -25)
  if (projection.mode !== 'globe' || !home || !east || home.visible < 0.5 || east.visible < 0.5) return false
  const arc = Math.hypot(east.x - home.x, east.y - home.y)
  return Math.hypot(home.x - center.x, home.y - center.y) <= radius * 0.6 && arc > radius * 0.4 && arc < radius * 0.9
}

export interface StageFrameBridge {
  getProjection(): Pick<StageProjection, 'mode' | 'project'> | null
  subscribe(listener: () => void): () => void
}

export default function StageOrbit({ bridge }: { bridge: StageFrameBridge }) {
  const request = useStageOrbit()
  // Last wait: it is kept for 280 ms when closing (or exits immediately if it was never seen).
  const [last, setLast] = useState<OrbitRequest | null>(request)
  useEffect(() => {
    if (request) return setLast(request)
    if (!last) return
    const timer = window.setTimeout(() => setLast(null), now() - last.startedAt < ORBIT_DELAY_MS ? 0 : 280)
    return () => window.clearTimeout(timer)
  }, [request]) // eslint-disable-line react-hooks/exhaustive-deps
  return last ? <WaitOrbit key={last.id} request={last} closing={!request} bridge={bridge} /> : null
}

function WaitOrbit({ request, closing, bridge }: { request: OrbitRequest; closing: boolean; bridge: StageFrameBridge }) {
  const { width, height } = useViewportLayout()
  const insets = useUi((state) => state.stageInsets)
  const geometry = orbitGeometry(width, height, globeScreenCenter(width, height, insets))
  const [shift] = useState(() => Math.min(0, request.startedAt - now()))
  const root = useRef<HTMLDivElement>(null)
  const { x, y, radius } = geometry
  useEffect(() => {
    // Per frame and without setState: only an attribute is toggled.
    const check = () => root.current?.toggleAttribute('data-offview', !globalViewOnScreen(bridge.getProjection(), { x, y }, radius))
    check()
    return bridge.subscribe(check)
  }, [x, y, radius, bridge])
  const style = { ...orbitVars(geometry), '--boot-delay': `${ORBIT_DELAY_MS}ms`, '--boot-shift': `${shift}ms` } as CSSProperties
  return (
    <div ref={root} className="boot boot-wait" data-closing={closing ? '' : undefined} aria-hidden="true" style={style}>
      <span className="boot-orbit"><span className="boot-wave"><span className="boot-ring"><span className="boot-sat" /></span></span></span>
    </div>
  )
}
