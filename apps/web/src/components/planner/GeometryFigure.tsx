import { siteRectangle, type Bbox, type ScopeResolution } from '../../mission'
import type { CandidateSite } from '../../domain/contracts'
import { useT } from '../../i18n'
import { tPlanner } from '../../i18n/messages/planner'

interface Props {
  candidates: CandidateSite[]
  resolution: ScopeResolution | null
  /** Sector highlighted when there is no resolution yet (selection in the list). */
  highlightIds?: string[]
}

const W = 340
const H = 230
const PAD = 22

/**
 * Local SVG diagram (no WebGL or network): windows with evidence (blue; REF in orange), requested geometry
 * (dashed orange stroke) and measured geometry (blue fill). Equirectangular with cosine correction.
 */
export function GeometryFigure({ candidates, resolution, highlightIds = [] }: Props) {
  const t = useT(tPlanner)
  const rects = candidates.flatMap((c) => {
    const box = siteRectangle(c)
    return box ? [{ id: c.site_id, box, ref: c.role === 'reference', name: c.name }] : []
  })
  const req = resolution?.requested
  const measured = new Set(resolution?.measured.map((m) => m.site_id) ?? [])
  const matched = new Set(resolution?.matches.map((m) => m.site_id) ?? [])
  const hl = new Set(highlightIds)
  const farAway = !!resolution && resolution.mode !== 'catalog' && !matched.size && !measured.size
  const shown = farAway ? [] : rects
  const boxes: Bbox[] = shown.map((r) => r.box)
  if (req?.bbox) boxes.push(req.bbox)
  if (req?.point) boxes.push([req.point[0] - 0.02, req.point[1] - 0.02, req.point[0] + 0.02, req.point[1] + 0.02])
  if (!boxes.length) return null
  let [w, s, e, n] = [Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[1])), Math.max(...boxes.map((b) => b[2])), Math.max(...boxes.map((b) => b[3]))]
  const mx = (e - w) * 0.08 || 0.05
  const my = (n - s) * 0.08 || 0.05
  w -= mx; e += mx; s -= my; n += my
  const k = Math.cos(((s + n) / 2) * (Math.PI / 180))
  const scale = Math.min((W - 2 * PAD) / ((e - w) * k), (H - 2 * PAD) / (n - s))
  const ox = (W - (e - w) * k * scale) / 2
  const oy = (H - (n - s) * scale) / 2
  const X = (lon: number) => ox + (lon - w) * k * scale
  const Y = (lat: number) => oy + (n - lat) * scale
  const rectProps = (b: Bbox) => ({ x: X(b[0]), y: Y(b[3]), width: Math.max(1, X(b[2]) - X(b[0])), height: Math.max(1, Y(b[1]) - Y(b[3])) })
  const desc = [
    resolution?.requested.bbox ? t('figure.requestedBbox') : resolution?.requested.point ? t('figure.requestedPoint') : '',
    measured.size ? t('figure.measured', { count: measured.size }) : t('figure.noMeasured'),
  ].filter(Boolean).join('; ')

  return (
    <figure className="pl-figure">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('figure.aria', { desc })}>
        <title>{t('figure.title')}</title>
        <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="12" className="pl-fig-bg" />
        {shown.map((r) => (
          <g key={r.id}>
            <rect {...rectProps(r.box)} className={`pl-win${r.ref ? ' ref' : ''}${measured.has(r.id) ? ' measured' : ''}${hl.has(r.id) ? ' hl' : ''}`} />
            <text x={X(r.box[0]) + 3} y={Y(r.box[3]) + 10} className="pl-fig-label">{r.ref ? 'REF' : r.id.startsWith('ar-') ? 'AR' : 'CL'}</text>
          </g>
        ))}
        {req?.bbox && <rect {...rectProps(req.bbox)} className="pl-req" />}
        {req?.point && <circle cx={X(req.point[0])} cy={Y(req.point[1])} r="4.5" className="pl-pt" />}
        <text x={W - 14} y="16" className="pl-fig-label" textAnchor="end">N ↑</text>
      </svg>
      <figcaption>
        <span><i className="pl-key win" /> {t('figure.keyWindow')}</span>
        <span><i className="pl-key ref" /> {t('figure.keyReference')}</span>
        <span><i className="pl-key measured" /> {t('figure.keyMeasured')}</span>
        <span><i className="pl-key req" /> {t('figure.keyRequested')}</span>
        {farAway && <strong>{t('figure.farAway')}</strong>}
      </figcaption>
    </figure>
  )
}
