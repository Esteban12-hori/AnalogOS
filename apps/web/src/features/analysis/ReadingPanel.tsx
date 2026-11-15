/**
 * Panel «Lectura» (slots `left.reading`, `rail.reading`, `full.reading`).
 * En el chunk principal solo vive este envoltorio: la vista (ReadingView) y su CSS se descargan
 * al montarse. Mientras tanto se muestra un esqueleto estático (sin barrido: §2.2 regla 2).
 */
import { lazy, Suspense } from 'react'
import { GLYPH } from '../../shell/public'
import type { ReadingPanelProps } from './index'
import './pill.css'

const ReadingView = lazy(() => import('./deferred'))

/** Precarga la vista (al pasar o enfocar la píldora). */
export function preloadReading(): void {
  void import('./deferred').catch(() => undefined)
}

export function ReadingSkeleton({ placement, label = 'Preparando la lectura…' }: { placement: ReadingPanelProps['placement']; label?: string }) {
  return (
    <section className="analysis-skeleton" data-placement={placement} aria-busy="true" aria-label="Lectura">
      <p className="analysis-skeleton-title">Lectura</p>
      <p className="analysis-skeleton-label"><span aria-hidden="true">{GLYPH.ai}</span> {label}</p>
      <span className="analysis-skeleton-bar" aria-hidden="true" />
      <span className="analysis-skeleton-bar is-short" aria-hidden="true" />
    </section>
  )
}

export function ReadingPanel({ data, placement }: ReadingPanelProps) {
  return (
    <Suspense fallback={<ReadingSkeleton placement={placement} />}>
      <ReadingView data={data} placement={placement} />
    </Suspense>
  )
}
