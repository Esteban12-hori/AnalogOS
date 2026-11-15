import { useEffect, useState } from 'react'
import type { CandidateSite } from '../domain/contracts'
import { shortCandidateName } from '../domain/formatting'
import { formatIndex, formatMonth, type MonthlySurfacePoint, type SurfaceSeriesBySite } from '../domain/surfaceSeries'
import { SignalCard } from './SignalCard'

interface SurfaceSignalsProps {
  candidates: CandidateSite[]
  selectedId: string
  series: SurfaceSeriesBySite
}

/** Duration of the exit animation before mounting the new zone's series. */
const SWAP_MS = 420

interface Metric {
  key: 'bsi' | 'ndvi'
  title: string
  description: string
  /** Glow tone: darkened blues from the palette, because the ramp lightens them (never orange: this is Mars). */
  accent: string
}

const METRICS: Metric[] = [
  { key: 'bsi', title: 'BSI · bare soil', description: 'Bare soil index. Higher means more exposed mineral surface.', accent: '#02679A' },
  { key: 'ndvi', title: 'NDVI · vegetation', description: 'Vegetation index. Near 0 indicates a surface without plant cover.', accent: '#3E7F9E' },
]

/** The endpoints repeat the first and last month only as the visual entry/exit of the curve. */
function padded(points: readonly MonthlySurfacePoint[], key: Metric['key']): number[] {
  const values = points.map((point) => point[key])
  return [values[0], ...values, values[values.length - 1]]
}

export function SurfaceSignals({ candidates, selectedId, series }: SurfaceSignalsProps) {
  const [shownId, setShownId] = useState(selectedId)
  const [revealed, setRevealed] = useState(true)

  useEffect(() => {
    if (selectedId === shownId) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    if (reduced) {
      setShownId(selectedId)
      return
    }
    setRevealed(false)
    const timer = window.setTimeout(() => {
      setShownId(selectedId)
      setRevealed(true)
    }, SWAP_MS)
    return () => window.clearTimeout(timer)
  }, [selectedId, shownId])

  const candidate = candidates.find((item) => item.site_id === shownId)
  const points = series.get(shownId)

  return (
    <section id="signals" className="signals-section glass" aria-labelledby="signals-title">
      <div className="signals-heading">
        <div>
          <span className="section-kicker">Surface signal · Sentinel-2 L2A · 2025</span>
          <h2 id="signals-title">{candidate ? shortCandidateName(candidate.name) : 'Selected sector'} month by month</h2>
        </div>
        <p>
          Twelve monthly mosaics from the snapshot. They are observational context: similarity is calculated in the pipeline
          and these curves do not change it. Drag or use the arrow keys to move through the months.
        </p>
      </div>

      {points ? (
        <div className={`signals-grid${revealed ? '' : ' is-swapping'}`}>
          {METRICS.map((metric) => (
            <figure className="signal-figure" key={metric.key}>
              <SignalCard
                key={`${shownId}-${metric.key}`}
                className="signal-card"
                data={padded(points, metric.key)}
                format={formatIndex}
                labelAt={(index) => `${metric.title} · ${formatMonth(points[index - 1]?.from ?? '')}`}
                deltaLabel="compared with the previous month."
                firstLabel="First month of the series: no previous month to compare with."
                accent={metric.accent}
                revealed={revealed}
                ariaLabel={`${metric.title}, monthly series 2025`}
              />
              <figcaption>{metric.description}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="signals-empty">
          <strong>No monthly series for this sector</strong>
          <span>This snapshot does not include monthly Sentinel-2 observations (for example, the demo fixture). Values are not interpolated.</span>
        </div>
      )}
    </section>
  )
}
