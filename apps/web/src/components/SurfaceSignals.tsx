import { useEffect, useState } from 'react'
import type { CandidateSite } from '../domain/contracts'
import { shortCandidateName } from '../domain/formatting'
import { formatIndex, formatMonth, type MonthlySurfacePoint, type SurfaceSeriesBySite } from '../domain/surfaceSeries'
import { useLocale } from '../i18n'
import { tDetailTabs } from '../i18n/messages/detailTabs'
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
  /** Glow tone: darkened blues from the palette, because the ramp lightens them (never orange: this is Mars). */
  accent: string
}

/** Title and description of each index come from the details catalog (`signal.<key>`, `signal.<key>Detail`). */
const METRICS: Metric[] = [
  { key: 'bsi', accent: '#02679A' },
  { key: 'ndvi', accent: '#3E7F9E' },
]

/** The endpoints repeat the first and last month only as the visual entry/exit of the curve. */
function padded(points: readonly MonthlySurfacePoint[], key: Metric['key']): number[] {
  const values = points.map((point) => point[key])
  return [values[0], ...values, values[values.length - 1]]
}

export function SurfaceSignals({ candidates, selectedId, series }: SurfaceSignalsProps) {
  const locale = useLocale()
  const t = tDetailTabs.in(locale)
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
          <span className="section-kicker">{t('signal.kicker')}</span>
          <h2 id="signals-title">{t('signal.title', { name: candidate ? shortCandidateName(candidate.name, locale) : t('signal.selected') })}</h2>
        </div>
        <p>{t('signal.lead')}</p>
      </div>

      {points ? (
        <div className={`signals-grid${revealed ? '' : ' is-swapping'}`}>
          {METRICS.map((metric) => {
            const title = t(`signal.${metric.key}`)
            return (
              <figure className="signal-figure" key={metric.key}>
                <SignalCard
                  key={`${shownId}-${metric.key}`}
                  className="signal-card"
                  data={padded(points, metric.key)}
                  format={(value) => formatIndex(value, locale)}
                  labelAt={(index) => `${title} · ${formatMonth(points[index - 1]?.from ?? '', locale)}`}
                  deltaLabel={t('signal.delta')}
                  firstLabel={t('signal.first')}
                  accent={metric.accent}
                  revealed={revealed}
                  ariaLabel={t('signal.aria', { title })}
                />
                <figcaption>{t(`signal.${metric.key}Detail`)}</figcaption>
              </figure>
            )
          })}
        </div>
      ) : (
        <div className="signals-empty">
          <strong>{t('signal.empty')}</strong>
          <span>{t('signal.emptyDetail')}</span>
        </div>
      )}
    </section>
  )
}
