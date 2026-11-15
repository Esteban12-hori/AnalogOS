/**
 * Informe imprimible de la misión (ADR-013): UNO por página, montado en la raíz del armazón
 * mientras haya una evaluación vigente, para que «Imprimir informe» funcione desde el panel, el
 * popover o la hoja móvil aunque se cierren. El contenido es el `PrintReport` del equipo.
 */
import { lazy, Suspense } from 'react'
import type { AppData } from '../../shell/public'
import { useMission } from '../../state/mission'

const PrintContent = lazy(() => import('./PrintContent'))

export function MissionPrintHost({ data }: { data: AppData }) {
  const current = useMission((state) => state.planner?.result ?? null)
  if (!current || data.status !== 'ready' || !data.snapshot) return null
  return (
    <div className="mission-print" aria-hidden="true">
      <Suspense fallback={null}>
        <PrintContent candidates={data.snapshot.candidates} />
      </Suspense>
    </div>
  )
}
