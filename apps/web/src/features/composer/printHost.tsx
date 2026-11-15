/**
 * Informe imprimible de la misión (ADR-013): UNO por página, montado en la raíz del armazón
 * mientras haya una evaluación vigente, para que «Imprimir informe» funcione desde el panel, el
 * popover o la hoja móvil aunque se cierren. El contenido es el `PrintReport` del equipo.
 * M11: sin informe vigente (carga inicial, datos sin validar, prueba editada o informe aún en
 * camino) la impresión del navegador muestra un aviso claro, nunca una página vacía ni un informe viejo.
 */
import { lazy, Suspense } from 'react'
import type { AppData } from '../../shell/public'
import { useMission } from '../../state/mission'

const PrintContent = lazy(() => import('./PrintContent'))

export type PrintNoticeReason = 'loading_data' | 'no_result' | 'stale' | 'preparing'

export const PRINT_NOTICE: Readonly<Record<PrintNoticeReason, string>> = {
  loading_data: 'No hay un informe para imprimir: los datos validados todavía se están cargando.',
  no_result: 'No hay un informe vigente. Defina la prueba en «Tu misión», confirme los requisitos y evalúe; después use «Imprimir informe».',
  stale: 'Editó la prueba: el informe anterior ya no corresponde a lo que está escribiendo. Confirme y evalúe de nuevo en «Tu misión» para imprimir el informe vigente.',
  preparing: 'El informe vigente se está preparando. Cierre esta vista de impresión y use «Imprimir informe» cuando el botón esté disponible.',
}

/** Puro: por qué no hay informe que imprimir (null = hay evaluación vigente y datos listos). */
export function printNoticeReason(dataReady: boolean, hasResult: boolean, stale: boolean): PrintNoticeReason | null {
  if (!dataReady) return 'loading_data'
  if (hasResult) return null
  return stale ? 'stale' : 'no_result'
}

export function PrintNotice({ reason }: { reason: PrintNoticeReason }) {
  return (
    <article className="pl-print-only mission-print-notice">
      <h1>AnalogOS · Informe de recomendación para una prueba</h1>
      <p>{PRINT_NOTICE[reason]}</p>
    </article>
  )
}

export function MissionPrintHost({ data }: { data: AppData }) {
  const current = useMission((state) => state.planner?.result ?? null)
  const stale = useMission((state) => state.stale)
  const snapshot = data.status === 'ready' ? data.snapshot : null
  const reason = printNoticeReason(snapshot !== null, current !== null, stale)
  return (
    <div className="mission-print" aria-hidden="true">
      {reason !== null || !snapshot ? (
        <PrintNotice reason={reason ?? 'loading_data'} />
      ) : (
        <Suspense fallback={<PrintNotice reason="preparing" />}>
          <PrintContent candidates={snapshot.candidates} />
        </Suspense>
      )}
    </div>
  )
}
