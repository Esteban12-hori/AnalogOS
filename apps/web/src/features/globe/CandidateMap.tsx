import type { KeyboardEvent } from 'react'
import type { CandidateGeometry, CandidateSite, GeoJsonFeatureCollection, Position } from '../../domain/contracts'
import { formatScore } from '../../domain/formatting'
import { rankCandidates } from '../../domain/scoring'

interface CandidateMapProps {
  candidates: CandidateSite[]
  chileOutline: GeoJsonFeatureCollection
  selectedId: string
  onSelect: (siteId: string) => void
}

const WIDTH = 680
const HEIGHT = 720
const LON_MIN = -79
const LON_MAX = -66
const LAT_NORTH = -17
const LAT_SOUTH = -56
const PAD_X = 72
const PAD_Y = 38

function project([longitude, latitude]: Position): [number, number] {
  const x = PAD_X + ((longitude - LON_MIN) / (LON_MAX - LON_MIN)) * (WIDTH - PAD_X * 2)
  const y = PAD_Y + ((LAT_NORTH - latitude) / (LAT_NORTH - LAT_SOUTH)) * (HEIGHT - PAD_Y * 2)
  return [x, y]
}

function ringsForGeometry(geometry: CandidateGeometry): Position[][] {
  if (geometry.type === 'Polygon') return geometry.coordinates
  return geometry.coordinates.flat()
}

function ringPath(ring: Position[]): string {
  return ring
    .map((position, index) => {
      const [x, y] = project(position)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ') + ' Z'
}

function centroid(geometry: CandidateGeometry): [number, number] {
  const ring = ringsForGeometry(geometry)[0] ?? []
  const points = ring.length > 1 ? ring.slice(0, -1) : ring
  if (!points.length) return [WIDTH / 2, HEIGHT / 2]
  const mean = points.reduce(
    (acc, [longitude, latitude]) => [acc[0] + longitude, acc[1] + latitude] as Position,
    [0, 0] as Position,
  )
  return project([mean[0] / points.length, mean[1] / points.length])
}

function handleMarkerKey(event: KeyboardEvent<SVGGElement>, onActivate: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onActivate()
  }
}

export function CandidateMap({ candidates, chileOutline, selectedId, onSelect }: CandidateMapProps) {
  const fixtureMode = candidates.every((candidate) => candidate.status === 'fixture')
  const ranks = new Map(
    rankCandidates(candidates).map((candidate, index) => [candidate.site_id, index + 1]),
  )
  const projectedCandidates = candidates.map((candidate) => ({
    candidate,
    rank: ranks.get(candidate.site_id) ?? 0,
    source: centroid(candidate.geometry),
  }))
  const calloutPositions = new Map(
    [...projectedCandidates]
      .sort((a, b) => a.source[1] - b.source[1])
      .map((row, slot) => [row.candidate.site_id, [500, 142 + slot * 78] as [number, number]]),
  )
  const outlinePaths = chileOutline.features.flatMap((feature) =>
    ringsForGeometry(feature.geometry)
      .filter((ring) => ring.some(([longitude]) => longitude >= LON_MIN && longitude <= LON_MAX))
      .map(ringPath),
  )

  return (
    <div className="map-frame">
      <div className="map-heading">
        <div>
          <span className="section-kicker">Explorador nacional</span>
          <h2>{fixtureMode ? 'Zonas de demostración' : 'Sectores priorizados'}</h2>
        </div>
        <span className="offline-chip">SVG local · funciona offline</span>
      </div>

      <svg
        className="map-canvas"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Mapa vectorial de Chile con ${candidates.length} zonas seleccionables`}
        preserveAspectRatio="xMidYMin meet"
      >
        <defs>
          <linearGradient id="ocean-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#02070A" />
            <stop offset="1" stopColor="#04111B" />
          </linearGradient>
          <linearGradient id="land-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0B2333" />
            <stop offset="1" stopColor="#071725" />
          </linearGradient>
          <filter id="marker-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="map-grid" width="46" height="46" patternUnits="userSpaceOnUse">
            <path d="M 46 0 L 0 0 0 46" fill="none" stroke="rgba(2,151,222,.06)" strokeWidth="1" />
          </pattern>
        </defs>

        <rect width={WIDTH} height={HEIGHT} fill="url(#ocean-gradient)" />
        <rect width={WIDTH} height={HEIGHT} fill="url(#map-grid)" />
        <g className="latitude-guides" aria-hidden="true">
          {[-20, -30, -40, -50].map((latitude) => {
            const [, y] = project([-72, latitude])
            return (
              <g key={latitude}>
                <line x1="36" x2={WIDTH - 36} y1={y} y2={y} />
                <text x="40" y={y - 7}>{Math.abs(latitude)}° S</text>
              </g>
            )
          })}
        </g>
        <g className="chile-shape" aria-hidden="true">
          {outlinePaths.map((path, index) => <path d={path} key={index} />)}
        </g>

        <g className="map-regions" aria-hidden="true">
          <text x="122" y="142">NORTE</text>
          <text x="118" y="329">CENTRO</text>
          <text x="112" y="554">AUSTRAL</text>
        </g>

        <g className="candidate-markers">
          {projectedCandidates.map(({ candidate, rank, source }) => {
            const [x, y] = calloutPositions.get(candidate.site_id) ?? source
            const selected = candidate.site_id === selectedId
            const insufficient = candidate.similarity === null
            return (
              <g key={candidate.site_id}>
                <line className="marker-connector" x1={source[0]} y1={source[1]} x2={x} y2={y} />
                <circle className="source-dot" cx={source[0]} cy={source[1]} r="4" />
                <g
                  className={`map-marker${selected ? ' selected' : ''}${insufficient ? ' insufficient' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Seleccionar ${candidate.name}`}
                  aria-pressed={selected}
                  onClick={() => onSelect(candidate.site_id)}
                  onKeyDown={(event) => handleMarkerKey(event, () => onSelect(candidate.site_id))}
                  transform={`translate(${x} ${y})`}
                >
                  <circle className="marker-pulse" r={selected ? 24 : 20} />
                  <circle className="marker-core" r={selected ? 14 : 12} />
                  <text textAnchor="middle" dy=".35em">{rank}</text>
                  <g className="marker-label" transform="translate(22 -15)">
                    <rect width="102" height="31" rx="8" />
                    <text x="10" y="13">RANK {rank}</text>
                    <text className="marker-score" x="10" y="24">
                      {candidate.similarity === null ? 'SIN SCORE' : `${formatScore(candidate.similarity)} / 100`}
                    </text>
                  </g>
                </g>
              </g>
            )
          })}
        </g>
      </svg>

      <div className="map-legend" aria-label="Leyenda del mapa">
        <span><i className="legend-swatch candidate" /> {fixtureMode ? 'Fixture con score' : 'Candidato preliminar'}</span>
        <span><i className="legend-swatch insufficient" /> Datos insuficientes</span>
        <span><i className="legend-swatch outline" /> Contorno referencial</span>
      </div>
    </div>
  )
}
