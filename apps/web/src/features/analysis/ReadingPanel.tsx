/**
 * Panel «Lectura de la comparativa» (slots `left.reading`, `rail.reading`, `full.reading`).
 * En el chunk principal solo vive este envoltorio: la vista (ReadingView) y su CSS se descargan
 * al montarse. Mientras tanto se muestra un esqueleto estático (sin barrido: §2.2 regla 2).
 */
import { lazy, Suspense, useEffect } from 'react'
import { GLYPH } from '../../shell/public'
import { registerSnapshot } from './controller'
import type { ReadingPanelProps } from './index'
import './pill.css'

const ReadingView = lazy(() => import('./deferred'))

/** Entrega al controlador el snapshot que ya cargó la app. */
export function useRegisterSnapshot(data: ReadingPanelProps['data']): void {
  useEffect(() => registerSnapshot(data.snapshot), [data.snapshot])
}

export function ReadingSkeleton({ placement, label = 'Preparando la lectura…' }: { placement: ReadingPanelProps['placement']; label?: string }) {
  return (
    <section className="analysis-skeleton" data-placement={placement} aria-busy="true" aria-label="Lectura de la comparativa">
      <p className="analysis-skeleton-title">Lectura de la comparativa</p>
      <p className="analysis-skeleton-label"><span aria-hidden="true">{GLYPH.ai}</span> {label}</p>
      <span className="analysis-skeleton-bar" aria-hidden="true" />
      <span className="analysis-skeleton-bar is-short" aria-hidden="true" />
    </section>
  )
}

export function ReadingPanel({ data, placement }: ReadingPanelProps) {
  useRegisterSnapshot(data)
  return (
    <Suspense fallback={<ReadingSkeleton placement={placement} />}>
      <ReadingView data={data} placement={placement} />
    </Suspense>
  )
}
