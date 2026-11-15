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

/** Tiempo de la animación de salida antes de montar la serie de la nueva zona. */
const SWAP_MS = 420

interface Metric {
  key: 'bsi' | 'ndvi'
  title: string
  description: string
  /** Tono del brillo: azules de la paleta oscurecidos, porque la rampa los aclara (nunca naranja: es Marte). */
  accent: string
}

const METRICS: Metric[] = [
  { key: 'bsi', title: 'BSI · suelo expuesto', description: 'Índice de suelo desnudo. Más alto, más superficie mineral expuesta.', accent: '#02679A' },
  { key: 'ndvi', title: 'NDVI · vegetación', description: 'Índice de vegetación. Cerca de 0 indica superficie sin cobertura vegetal.', accent: '#3E7F9E' },
]

/** Los extremos repiten el primer y último mes solo como entrada/salida visual de la curva. */
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
          <span className="section-kicker">Señal de superficie · Sentinel-2 L2A · 2025</span>
          <h2 id="signals-title">{candidate ? shortCandidateName(candidate.name) : 'Sector seleccionado'} mes a mes</h2>
        </div>
        <p>
          Doce mosaicos mensuales del snapshot. Son contexto observacional: la similitud se calcula en el pipeline
          y estas curvas no la modifican. Arrastra o usa las flechas para recorrer los meses.
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
                deltaLabel="respecto del mes anterior."
                firstLabel="Primer mes de la serie: sin mes anterior para comparar."
                accent={metric.accent}
                revealed={revealed}
                ariaLabel={`${metric.title}, serie mensual 2025`}
              />
              <figcaption>{metric.description}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="signals-empty">
          <strong>Sin serie mensual para este sector</strong>
          <span>Este snapshot no incluye observaciones Sentinel-2 por mes (por ejemplo, el fixture demo). No se interpolan valores.</span>
        </div>
      )}
    </section>
  )
}
