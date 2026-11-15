/**
 * Mini-visualizations per criterion (inherited from breakdown/ScoreBreakdown.tsx). Each one draws
 * the physical quantity the criterion measures, in its unit, and ■ Jezero only when it exists (MOLA).
 * The shapes are illustrative; the amplitudes are to scale. No figure is animated: the strokes are.
 */
import type { CSSProperties, ReactNode } from 'react'
import type { CriterionId } from '../../domain/contracts'
import { formatWhole } from '../../domain/formatting'
import type { MetricView } from './index'
import { similarityTone } from '../../domain/similarityScale'

const n1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })
const n0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const fmt1 = (value: number) => n1.format(value)

/** Unit that each visualization expects: if the snapshot provides a different one, it is not drawn. */
const VIZ_UNIT: Readonly<Partial<Record<CriterionId, string>>> = {
  slope: 'degree',
  terrain_roughness: 'meter',
  local_relief: 'meter',
  bare_ground_fraction: 'ratio',
  aridity_context: 'millimeter_per_year',
  surface_temperature_variability: 'kelvin',
}

/** Fixed pseudorandom profile: the shape is illustrative, the amplitude is the measurement. */
const PROFILE = [0, .55, -.35, .8, -.6, .25, -.9, .45, .1, -.5, .95, -.2, .4, -.75, .6, -.1, .3, -.85, .7, -.3, .15, -.65, .5, -.4, .85, -.15, 0]

const W = 260
const H = 84

/**
 * Similarity ring 0–100 (decorative: the figure is also given in text). A criterion that the active
 * profile excludes (weight 0) does not show its similarity as if it counted: dashed ring and "excl".
 */
export function Ring({ value, size = 'md', excluded = false }: { value: number | null; size?: 'sm' | 'md'; excluded?: boolean }) {
  const shown = excluded ? null : value
  const fraction = shown === null ? 0 : Math.max(0, Math.min(1, shown / 100))
  return (
    <span className={`metrics-ring metrics-ring-${size}${shown === null ? ' is-empty' : ''}${excluded ? ' is-excluded' : ''}`} data-sim-tone={similarityTone(shown, 0) ?? undefined} aria-hidden="true">
      <svg viewBox="0 0 44 44">
        <circle className="metrics-ring-track" cx="22" cy="22" r="18" pathLength={1} />
        {shown !== null && <circle className="metrics-ring-fill" cx="22" cy="22" r="18" pathLength={1} style={{ strokeDashoffset: 1 - fraction }} />}
      </svg>
      <span>{excluded ? 'excl' : shown === null ? '—' : formatWhole(shown)}</span>
    </span>
  )
}

function SlopeViz({ site, mars }: { site: number; mars: number | null }) {
  const E = 5 // vertical exaggeration
  const L = 226
  const ox = 14
  const oy = 74
  const end = (deg: number) => {
    const a = Math.atan(Math.tan((deg * Math.PI) / 180) * E)
    return [ox + L * Math.cos(a), oy - L * Math.sin(a), a] as const
  }
  const [cx, cy, ca] = end(site)
  const m = mars === null ? null : end(mars)
  const arc = (a: number, r: number) => `M ${ox + r} ${oy} A ${r} ${r} 0 0 0 ${ox + r * Math.cos(a)} ${oy - r * Math.sin(a)}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="metrics-viz" role="img" aria-label={`Ramp of ${fmt1(site)} degrees${m ? ` versus ${fmt1(mars ?? 0)} degrees at Jezero` : ''}, vertical exaggeration ×${E}`}>
      <line x1={ox} y1={oy} x2={W - 4} y2={oy} className="metrics-ground" />
      <path d={`M ${ox} ${oy} L ${cx} ${cy} L ${cx} ${oy} Z`} className="metrics-wedge" />
      {m && <line x1={ox} y1={oy} x2={m[0]} y2={m[1]} className="metrics-line metrics-mars-stroke" pathLength={1} />}
      <line x1={ox} y1={oy} x2={cx} y2={cy} className="metrics-line metrics-site-stroke" pathLength={1} />
      <path d={arc(ca, 52)} className="metrics-arc" />
    </svg>
  )
}

function profilePath(baseY: number, amp: number): string {
  return PROFILE.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * (W - 8)) / (PROFILE.length - 1) + 4} ${(baseY - p * amp).toFixed(1)}`).join(' ')
}

function RoughnessViz({ site, mars }: { site: number; mars: number | null }) {
  const max = Math.max(site, mars ?? 0) || 1
  const amp = (value: number) => (value / max) * 15
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="metrics-viz" role="img" aria-label={`Profile with a height difference of ${fmt1(site)} m${mars !== null ? ` versus ${fmt1(mars)} m at Jezero` : ''}; illustrative shape, amplitude to scale`}>
      <path d={profilePath(mars === null ? 42 : 24, amp(site))} className="metrics-line metrics-site-stroke" pathLength={1} />
      {mars !== null && <path d={profilePath(62, amp(mars))} className="metrics-line metrics-mars-stroke" pathLength={1} />}
    </svg>
  )
}

function mountain(x0: number, width: number, height: number, base: number): string {
  const peak = x0 + width * 0.48
  return `M ${x0} ${base} C ${x0 + width * 0.22} ${base}, ${peak - width * 0.16} ${base - height}, ${peak} ${base - height} S ${x0 + width * 0.8} ${base}, ${x0 + width} ${base} Z`
}

function ReliefViz({ site, mars }: { site: number; mars: number | null }) {
  const max = Math.max(site, mars ?? 0) || 1
  const base = 76
  const h = (value: number) => (value / max) * 58
  const hs = h(site)
  const hm = mars === null ? 0 : h(mars)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="metrics-viz" role="img" aria-label={`Relief of ${fmt1(site)} m${mars !== null ? ` versus ${fmt1(mars)} m at Jezero` : ''}; heights to scale`}>
      <line x1={4} y1={base} x2={W - 4} y2={base} className="metrics-ground" />
      <path d={mountain(18, 108, hs, base)} className="metrics-mountain metrics-site-fill" />
      <line x1={18 + 108 * 0.48} y1={base} x2={18 + 108 * 0.48} y2={base - hs} className="metrics-dim" />
      {mars !== null && (
        <>
          <path d={mountain(140, 108, hm, base)} className="metrics-mountain metrics-mars-fill" />
          <line x1={140 + 108 * 0.48} y1={base} x2={140 + 108 * 0.48} y2={base - hm} className="metrics-dim" />
        </>
      )}
    </svg>
  )
}

function BareGroundViz({ fraction }: { fraction: number }) {
  const bare = Math.round(Math.max(0, Math.min(1, fraction)) * 100)
  return (
    <div className="metrics-pixels" role="img" aria-label={`${bare} of every 100 pixels without vegetation`}>
      {Array.from({ length: 100 }, (_, i) => (
        <i key={i} className={i < bare ? 'is-bare' : 'is-green'} style={{ '--i': i } as CSSProperties} />
      ))}
    </div>
  )
}

function ScaleViz({ value, max, marker, markerLabel, kind, ticks, unit }: {
  value: number
  max: number
  marker: number
  markerLabel: string
  kind: 'rain' | 'heat'
  ticks: readonly number[]
  unit: string
}) {
  const SH = 60
  const x0 = 30
  const x1 = W - 10
  const y = 26
  const sx = (v: number) => x0 + (Math.max(0, Math.min(v, max)) / max) * (x1 - x0)
  return (
    <svg viewBox={`0 0 ${W} ${SH}`} className={`metrics-viz metrics-scale metrics-${kind}`} role="img" aria-label={`${fmt1(value)} ${unit} on a scale from 0 to ${max}; ${markerLabel} at ${marker}`}>
      {kind === 'heat'
        ? <circle cx={x0 - 14} cy={y} r={9} className="metrics-bulb" />
        : <path d={`M ${x0 - 14} ${y - 10} c -7 9 -7 15 0 15 c 7 0 7 -6 0 -15 Z`} className="metrics-drop" />}
      <rect x={x0} y={y - 7} width={x1 - x0} height={14} rx={7} className="metrics-tube" />
      <rect x={x0} y={y - 7} width={sx(value) - x0} height={14} rx={7} className="metrics-tube-fill" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={sx(t)} x2={sx(t)} y1={y + 10} y2={y + 14} className="metrics-tick" />
          <text x={sx(t)} y={y + 27} className="metrics-svg-note" textAnchor="middle">{n0.format(t)}</text>
        </g>
      ))}
      <line x1={sx(marker)} x2={sx(marker)} y1={y - 14} y2={y + 14} className="metrics-rule-mark" />
      <text x={sx(marker)} y={y - 17} className="metrics-svg-note" textAnchor="middle">┆ {markerLabel}</text>
    </svg>
  )
}

function SimilarityBar({ value }: { value: number }) {
  return <div className="metrics-generic" aria-hidden="true"><i style={{ transform: `scaleX(${Math.max(0, Math.min(1, value / 100))})` }} /></div>
}

/** Visualization and note for a metric; null if there is no valid data to draw. */
export function MetricVisual({ view }: { view: MetricView }): ReactNode {
  const raw = view.siteValue.raw
  if (view.status !== 'valid' || typeof raw !== 'number' || !Number.isFinite(raw)) return null
  const expected = VIZ_UNIT[view.criterionId]
  const mars = view.marsValue?.raw ?? null
  const fallback = view.similarity === null ? null : <SimilarityBar value={view.similarity} />
  if (expected === undefined || view.siteValue.unit !== expected) return fallback
  // The rule's scales are only drawn if the rule reproduces the snapshot's similarity.
  const ruleVerified = view.rule?.consistent === true
  let figure: ReactNode = fallback
  let note: string | null = null
  switch (view.criterionId) {
    case 'slope':
      figure = <SlopeViz site={raw} mars={mars} />
      note = 'vertical exaggeration ×5'
      break
    case 'terrain_roughness':
      figure = <RoughnessViz site={raw} mars={mars} />
      note = 'illustrative shape · amplitude to scale'
      break
    case 'local_relief':
      figure = <ReliefViz site={raw} mars={mars} />
      note = 'illustrative shape · heights to scale'
      break
    case 'bare_ground_fraction':
      figure = <BareGroundViz fraction={raw} />
      note = '1 square = 1% of the valid pixels'
      break
    case 'aridity_context':
      if (ruleVerified) figure = <ScaleViz kind="rain" unit="mm/year" value={raw} max={50} marker={25} markerLabel="similarity 50" ticks={[0, 10, 20, 30, 40, 50]} />
      break
    case 'surface_temperature_variability':
      if (ruleVerified) figure = <ScaleViz kind="heat" unit="K" value={raw} max={60} marker={45} markerLabel="saturates" ticks={[0, 15, 30, 45, 60]} />
      break
    default:
      break
  }
  if (figure === null) return null
  return (
    <figure className="metrics-figure">
      {figure}
      {note && <figcaption className="metrics-viz-note">{note}</figcaption>}
    </figure>
  )
}
