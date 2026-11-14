/**
 * «Tu misión» (incremento 9): niveles por criterio, Deshacer e historial. Slots `left.mission`
 * (panel ≥1440 en Misión) y `full.mission` (pestaña de S2). La tarjeta completa se descarga
 * con el chunk de misión; mientras tanto se ve un encabezado estático, sin cifras.
 */
import { Suspense } from 'react'
import { GLYPH } from '../../shell/public'
import type { MissionCardProps } from './index'
import { LazyMissionPanel } from './panel'

export function MissionCard({ data, placement }: MissionCardProps) {
  return (
    <Suspense
      fallback={
        <section className="composer-card" data-placement={placement} aria-busy="true" aria-label="Tu misión">
          <h2 className="composer-card-title">Tu misión</h2>
          <p className="composer-card-note"><span aria-hidden="true">{GLYPH.ai}</span> Cargando la tarjeta de misión…</p>
        </section>
      }
    >
      <LazyMissionPanel data={data} placement={placement} />
    </Suspense>
  )
}
