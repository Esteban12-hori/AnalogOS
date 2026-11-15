/**
 * “Reading” panel (slots `left.reading`, `rail.reading`, `full.reading`).
 * Only this wrapper lives in the main chunk: the view (ReadingView) and its CSS are downloaded
 * on mount. In the meantime, a static skeleton is shown (without a sweep animation: §2.2 rule 2).
 */
import { lazy, Suspense } from 'react'
import type { ReadingPanelProps } from './index'
import './pill.css'

const ReadingView = lazy(() => import('./deferred'))

/** Preloads the view (on hover or focus of the pill). */
export function preloadReading(): void {
  void import('./deferred').catch(() => undefined)
}

export function ReadingSkeleton({ placement, label = 'Preparing the reading…' }: { placement: ReadingPanelProps['placement']; label?: string }) {
  return (
    <section className="analysis-skeleton" data-placement={placement} aria-busy="true" aria-label="Reading">
      <p className="analysis-skeleton-title">Reading</p>
      {/* No ✦: the pending Reading may be the deterministic one from Explore (✦ = AI only). */}
      <p className="analysis-skeleton-label">{label}</p>
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
