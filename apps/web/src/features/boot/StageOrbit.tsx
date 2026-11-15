/**
 * Órbita de la espera de la IA alrededor del globo (§2.3 C, §4.4): la pide OrbitLoader con
 * `placement="globe"`. Chunk diferido: se descarga la primera vez que se pide. Va en fase con el
 * composer (ambos parten al activarse la espera, +300 ms), solo se ve con la vista global en
 * pantalla y se cierra con un fundido al llegar los resultados. El canal por cuadro del globo llega
 * por props (así este chunk no arrastra módulos del principal).
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { globeScreenCenter } from '../../domain/mapZoom'
import { useViewportLayout } from '../../shell/public'
import { useUi } from '../../state/ui'
import type { StageProjection } from '../globe'
import { ORBIT_DELAY_MS, orbitGeometry, orbitVars } from './bootModel'
import { now, useStageOrbit, type OrbitRequest } from './milestones'

/**
 * La órbita solo acompaña a la vista global. Sin canal por cuadro (el globo aún no publica) se
 * asume la vista global. Con canal: modo globo, el piloto Chile–Argentina (punto de vista inicial) cerca del centro
 * y una escala parecida a la de la vista global (40° de arco ≈ r·sen 40°; al acercarse crece).
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
  // Última espera: se mantiene 280 ms al cerrarse (o sale de inmediato si nunca llegó a verse).
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
    // Por cuadro y sin setState: solo se alterna un atributo.
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
