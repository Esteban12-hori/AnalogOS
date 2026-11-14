/**
 * Desglose del score: cada criterio se dibuja con la magnitud física que mide, en su unidad,
 * y, cuando existe, frente a la referencia de Marte (Jezero, MOLA) contra la que se comparó.
 * La similitud mostrada es siempre la del pipeline (normalized_similarity); aquí no se recalcula.
 * Los textos explican cómo ese número sale del valor medido según el perfil v2.
 */
import type { CSSProperties, ReactNode } from 'react'
import type { ScoreBreakdownItem } from '../domain/contracts'
import { criterionStatusLabels, formatScore } from '../domain/formatting'
import type { MarsReference } from '../domain/marsReference'
import './score-breakdown.css'

interface ScoreBreakdownProps {
  items: readonly ScoreBreakdownItem[]
  marsReference: MarsReference | null
}

const n1 = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 })
const n0 = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const fmt1 = (v: number) => n1.format(v)

interface CriterionMeta {
  label: string
  /** Qué mide, en una línea. */
  measure: string
  /** Unidad esperada; si el snapshot trae otra, se usa la vista genérica. */
  unit: string
  suffix: (v: number) => string
}

const META: Record<string, CriterionMeta> = {
  slope: { label: 'Pendiente', measure: 'Mediana del terreno a ~480 m', unit: 'degree', suffix: (v) => `${fmt1(v)}°` },
  terrain_roughness: { label: 'Rugosidad', measure: 'Desnivel mediano entre celdas vecinas', unit: 'meter', suffix: (v) => `${fmt1(v)} m` },
  local_relief: { label: 'Relieve local', measure: 'Desnivel mediano en ventanas 3×3', unit: 'meter', suffix: (v) => `${fmt1(v)} m` },
  bare_ground_fraction: { label: 'Suelo expuesto', measure: 'Píxeles sin vegetación · Sentinel-2 2025', unit: 'ratio', suffix: (v) => `${fmt1(v * 100)} %` },
  aridity_context: { label: 'Aridez', measure: 'Precipitación climatológica · NASA POWER', unit: 'millimeter_per_year', suffix: (v) => `${fmt1(v)} mm/año` },
  surface_temperature_variability: { label: 'Rango térmico', measure: 'Amplitud climatológica de la superficie', unit: 'kelvin', suffix: (v) => `${fmt1(v)} K` },
  geologic_relevance: { label: 'Geología', measure: 'Compatibilidad litológica con el objetivo', unit: 'category', suffix: (v) => fmt1(v) },
}

const TOPO_WORDS: Record<string, [more: string, less: string]> = {
  slope: ['más inclinado', 'más suave'],
  terrain_roughness: ['más rugoso', 'más liso'],
  local_relief: ['con más relieve', 'con menos relieve'],
}

/** Perfil pseudoaleatorio fijo: la forma es ilustrativa, la amplitud es la medida. */
const PROFILE = [0, .55, -.35, .8, -.6, .25, -.9, .45, .1, -.5, .95, -.2, .4, -.75, .6, -.1, .3, -.85, .7, -.3, .15, -.65, .5, -.4, .85, -.15, 0]

function Ring({ value }: { value: number | null }) {
  const v = value === null ? 0 : Math.max(0, Math.min(1, value))
  return (
    <div className="sb-ring" aria-hidden="true">
      <svg viewBox="0 0 44 44">
        <circle className="sb-ring-track" cx="22" cy="22" r="18" pathLength={1} />
        {value !== null && <circle className="sb-ring-fill" cx="22" cy="22" r="18" pathLength={1} style={{ strokeDashoffset: 1 - v }} />}
      </svg>
      <span>{value === null ? '—' : formatScore(v * 100)}</span>
    </div>
  )
}

function Lane({ who, value }: { who: 'chile' | 'mars'; value: string }) {
  return (
    <span className={`sb-reading sb-${who}`}>
      <small><i />{who === 'chile' ? 'Sector' : 'Jezero'}</small>
      <strong>{value}</strong>
    </span>
  )
}

/* ---------- Visualizaciones por criterio ---------------------------------------------------- */

const W = 260
const H = 84

function SlopeViz({ chile, mars }: { chile: number; mars?: number }) {
  const E = 5 // exageración vertical
  const L = 226
  const ox = 14, oy = 74
  const end = (deg: number) => {
    const a = Math.atan(Math.tan((deg * Math.PI) / 180) * E)
    return [ox + L * Math.cos(a), oy - L * Math.sin(a), a] as const
  }
  const [cx, cy, ca] = end(chile)
  const m = mars === undefined ? null : end(mars)
  const arc = (a: number, r: number) => `M ${ox + r} ${oy} A ${r} ${r} 0 0 0 ${ox + r * Math.cos(a)} ${oy - r * Math.sin(a)}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="sb-viz" role="img" aria-label={`Rampa de ${fmt1(chile)} grados${mars ? ` frente a ${fmt1(mars)} en Marte` : ''}`}>
      <line x1={ox} y1={oy} x2={W - 4} y2={oy} className="sb-ground" />
      <path d={`M ${ox} ${oy} L ${cx} ${cy} L ${cx} ${oy} Z`} className="sb-wedge" />
      {m && <line x1={ox} y1={oy} x2={m[0]} y2={m[1]} className="sb-line sb-mars-stroke sb-dashed" pathLength={1} />}
      <line x1={ox} y1={oy} x2={cx} y2={cy} className="sb-line sb-chile-stroke" pathLength={1} />
      <path d={arc(ca, 52)} className="sb-arc" />
      <text x={W - 6} y={H - 1} className="sb-note" textAnchor="end">exageración vertical ×{E}</text>
    </svg>
  )
}

function profilePath(baseY: number, amp: number) {
  return PROFILE.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * (W - 8)) / (PROFILE.length - 1) + 4} ${(baseY - p * amp).toFixed(1)}`).join(' ')
}

function RoughnessViz({ chile, mars }: { chile: number; mars?: number }) {
  const max = Math.max(chile, mars ?? 0)
  const amp = (v: number) => (v / max) * 15
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="sb-viz" role="img" aria-label={`Perfil con desnivel de ${fmt1(chile)} m${mars ? ` frente a ${fmt1(mars)} m en Marte` : ''}`}>
      <path d={profilePath(mars === undefined ? 42 : 24, amp(chile))} className="sb-line sb-chile-stroke" pathLength={1} />
      {mars !== undefined && <path d={profilePath(62, amp(mars))} className="sb-line sb-mars-stroke" pathLength={1} />}
      <text x={W - 6} y={H - 1} className="sb-note" textAnchor="end">forma ilustrativa · amplitud a escala</text>
    </svg>
  )
}

function mountain(x0: number, width: number, height: number, base: number) {
  const peak = x0 + width * 0.48
  return `M ${x0} ${base} C ${x0 + width * 0.22} ${base}, ${peak - width * 0.16} ${base - height}, ${peak} ${base - height} S ${x0 + width * 0.8} ${base}, ${x0 + width} ${base} Z`
}

function ReliefViz({ chile, mars }: { chile: number; mars?: number }) {
  const max = Math.max(chile, mars ?? 0)
  const base = 76
  const h = (v: number) => (v / max) * 58
  const hc = h(chile)
  const hm = mars === undefined ? 0 : h(mars)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="sb-viz" role="img" aria-label={`Relieve de ${fmt1(chile)} m${mars ? ` frente a ${fmt1(mars)} m en Marte` : ''}`}>
      <line x1={4} y1={base} x2={W - 4} y2={base} className="sb-ground" />
      <path d={mountain(18, 108, hc, base)} className="sb-mountain sb-chile-fill" />
      <line x1={18 + 108 * 0.48} y1={base} x2={18 + 108 * 0.48} y2={base - hc} className="sb-dim" />
      {mars !== undefined && (
        <>
          <path d={mountain(140, 108, hm, base)} className="sb-mountain sb-mars-fill" />
          <line x1={140 + 108 * 0.48} y1={base} x2={140 + 108 * 0.48} y2={base - hm} className="sb-dim" />
        </>
      )}
    </svg>
  )
}

function BareGroundViz({ fraction }: { fraction: number }) {
  const bare = Math.round(Math.max(0, Math.min(1, fraction)) * 100)
  return (
    <div className="sb-pixels" role="img" aria-label={`${bare} de cada 100 píxeles sin vegetación`}>
      {Array.from({ length: 100 }, (_, i) => (
        <i key={i} className={i < bare ? 'is-bare' : 'is-green'} style={{ '--i': i } as CSSProperties} />
      ))}
    </div>
  )
}

function ScaleViz({ value, max, marker, markerLabel, kind, ticks }: {
  value: number
  max: number
  marker: number
  markerLabel: string
  kind: 'rain' | 'heat'
  ticks: number[]
}) {
  const SH = 58
  const x0 = 30, x1 = W - 10, y = 24
  const sx = (v: number) => x0 + (Math.min(v, max) / max) * (x1 - x0)
  return (
    <svg viewBox={`0 0 ${W} ${SH}`} className={`sb-viz sb-scale sb-${kind}`} role="img" aria-label={`${fmt1(value)} sobre una escala de 0 a ${max}`}>
      {kind === 'heat' ? <circle cx={x0 - 14} cy={y} r={9} className="sb-bulb" /> : <path d={`M ${x0 - 14} ${y - 10} c -7 9 -7 15 0 15 c 7 0 7 -6 0 -15 Z`} className="sb-drop" />}
      <rect x={x0} y={y - 7} width={x1 - x0} height={14} rx={7} className="sb-tube" />
      <rect x={x0} y={y - 7} width={sx(value) - x0} height={14} rx={7} className="sb-tube-fill" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={sx(t)} x2={sx(t)} y1={y + 10} y2={y + 14} className="sb-tick" />
          <text x={sx(t)} y={y + 25} className="sb-note" textAnchor="middle">{n0.format(t)}</text>
        </g>
      ))}
      <line x1={sx(marker)} x2={sx(marker)} y1={y - 14} y2={y + 14} className="sb-marker" />
      <text x={sx(marker)} y={y - 18} className="sb-note sb-marker-label" textAnchor="middle">{markerLabel}</text>
    </svg>
  )
}

/* ---------- Tarjeta ------------------------------------------------------------------------- */

function explain(item: ScoreBreakdownItem, mars?: number): string {
  const v = item.raw_value
  if (typeof v !== 'number') return item.explanation
  const words = TOPO_WORDS[item.criterion_id]
  if (words && mars) {
    const ratio = v / mars
    const phrase = ratio >= 1 ? `${fmt1(ratio)}× ${words[0]}` : `${fmt1(1 / ratio)}× ${words[1]}`
    return `El sector es ${phrase} que Jezero. La similitud es la razón entre ambas medianas: 100 sería idéntico.`
  }
  switch (item.criterion_id) {
    case 'bare_ground_fraction':
      return `${fmt1(v * 100)} de cada 100 píxeles válidos son suelo sin vegetación (SCL clase 5). La similitud es esa misma fracción.`
    case 'aridity_context':
      return `Menos lluvia, más análogo: a 25 mm/año la similitud cae a 50; con ${fmt1(v)} mm/año queda en ${formatScore((item.normalized_similarity ?? 0) * 100)}.`
    case 'surface_temperature_variability':
      return v >= 45
        ? `La amplitud supera los 45 K en que el perfil satura, así que este criterio alcanza su máximo.`
        : `La similitud crece con la amplitud térmica hasta saturar en 45 K.`
    default:
      return item.explanation
  }
}

function visualFor(item: ScoreBreakdownItem, mars?: number): ReactNode {
  const v = item.raw_value
  const meta = META[item.criterion_id]
  if (typeof v !== 'number' || !meta || item.unit !== meta.unit) return null
  switch (item.criterion_id) {
    case 'slope': return <SlopeViz chile={v} mars={mars} />
    case 'terrain_roughness': return <RoughnessViz chile={v} mars={mars} />
    case 'local_relief': return <ReliefViz chile={v} mars={mars} />
    case 'bare_ground_fraction': return <BareGroundViz fraction={v} />
    case 'aridity_context': return <ScaleViz kind="rain" value={v} max={50} marker={25} markerLabel="similitud 50" ticks={[0, 10, 20, 30, 40, 50]} />
    case 'surface_temperature_variability': return <ScaleViz kind="heat" value={v} max={60} marker={45} markerLabel="saturación" ticks={[0, 15, 30, 45, 60]} />
    default: return null
  }
}

function CriterionCard({ item, index, mars }: { item: ScoreBreakdownItem; index: number; mars?: number }) {
  const meta = META[item.criterion_id]
  const valid = item.status === 'valid'
  const visual = valid ? visualFor(item, mars) : null
  const v = item.raw_value
  const reading = typeof v === 'number' && meta && item.unit === meta.unit ? meta.suffix(v) : v === null ? 'sin valor' : String(v)
  const showMars = mars !== undefined && meta !== undefined && item.unit === meta.unit
  return (
    <article className={`sb-card sb-${item.criterion_id} status-${item.status}`} style={{ '--sb-delay': `${index * 70}ms` } as CSSProperties}>
      <header className="sb-head">
        <div>
          <h4>{meta?.label ?? item.criterion_id}</h4>
          <p>{meta?.measure ?? item.unit}</p>
        </div>
        <Ring value={valid ? item.normalized_similarity : null} />
      </header>

      {valid ? (
        <>
          <div className="sb-readings">
            <Lane who="chile" value={reading} />
            {showMars && meta && <Lane who="mars" value={meta.suffix(mars)} />}
          </div>
          {visual ?? (
            <div className="sb-generic" aria-hidden="true"><i style={{ width: `${(item.normalized_similarity ?? 0) * 100}%` }} /></div>
          )}
          <p className="sb-why">{explain(item, showMars ? mars : undefined)}</p>
        </>
      ) : (
        <div className="sb-pending">
          <strong>{criterionStatusLabels[item.status]}</strong>
          <span>{item.explanation}</span>
        </div>
      )}

      <footer className="sb-foot">
        <span>Peso <b>{formatScore(item.weight * 100)} %</b><i><em style={{ width: `${item.weight * 100}%` }} /></i></span>
        <span>Calidad del dato <b>{formatScore(item.quality * 100)} %</b><i><em style={{ width: `${item.quality * 100}%` }} /></i></span>
      </footer>
    </article>
  )
}

export function ScoreBreakdown({ items, marsReference }: ScoreBreakdownProps) {
  const validCount = items.filter((item) => item.status === 'valid').length
  return (
    <section className="details-section sb-section" aria-labelledby="breakdown-heading">
      <div className="subheading-row">
        <h3 id="breakdown-heading">Desglose del score</h3>
        <span>{validCount}/{items.length} criterios válidos</span>
      </div>
      <div className="sb-legend">
        <span className="sb-chile"><i />Sector chileno</span>
        {marsReference && <span className="sb-mars"><i />Marte · {marsReference.name.replace('Entorno regional de ', '').replace(', Marte', '')} (MOLA)</span>}
        <span className="sb-ring-legend">◔ similitud 0–100</span>
      </div>
      <div className="sb-list">
        {items.map((item, index) => (
          <CriterionCard key={item.criterion_id} item={item} index={index} mars={marsReference?.byCriterion[item.criterion_id]} />
        ))}
      </div>
    </section>
  )
}
