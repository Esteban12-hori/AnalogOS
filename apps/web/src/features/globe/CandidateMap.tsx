import type { KeyboardEvent } from 'react'
import type {
  CandidateGeometry, CandidateSite, GeoJsonFeatureCollection, Position, PrecedentCatalog, SearchDecision, SearchResults,
} from '../../domain/contracts'
import { countryLabels, isReference } from '../../domain/discovery'
import { formatScore, shortCandidateName } from '../../domain/formatting'
import { displaySource } from '../../i18n/sourceText'

interface CandidateMapProps {
  candidates: CandidateSite[]
  /** Global position in the candidate ranking; references have none. */
  rankOf: Map<string, number>
  outline: GeoJsonFeatureCollection
  search: SearchResults | null
  precedents: PrecedentCatalog | null
  selectedId: string
  onSelect: (siteId: string) => void
}

export interface MapFrame { west: number; south: number; east: number; north: number; width: number; height: number }

const WIDTH = 680
// Extent of the location bounding box: both countries in full (without oceanic islands).
const INSET = { west: -77, south: -56.5, east: -52.5, north: -16.5, width: 96, height: 152 }

function ringsForGeometry(geometry: CandidateGeometry): Position[][] {
  return geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat()
}

function geometryBbox(geometry: CandidateGeometry): [number, number, number, number] {
  const points = ringsForGeometry(geometry).flat()
  return [
    Math.min(...points.map((point) => point[0])), Math.min(...points.map((point) => point[1])),
    Math.max(...points.map((point) => point[0])), Math.max(...points.map((point) => point[1])),
  ]
}

/** Adaptive framing: search regions and sites, with margin and a legible aspect ratio. */
export function mapFrame(candidates: readonly CandidateSite[], search: SearchResults | null): MapFrame {
  const boxes = [...(search?.regions.map((region) => region.bbox) ?? []), ...candidates.map((item) => geometryBbox(item.geometry))]
  if (!boxes.length) boxes.push([INSET.west, INSET.south, INSET.east, INSET.north])
  let west = Math.min(...boxes.map((box) => box[0]))
  let south = Math.min(...boxes.map((box) => box[1]))
  let east = Math.max(...boxes.map((box) => box[2]))
  let north = Math.max(...boxes.map((box) => box[3]))
  const pad = Math.max(0.45, 0.14 * Math.max(east - west, north - south))
  west -= pad; east += pad; south -= pad; north += pad
  const cosine = Math.cos((((south + north) / 2) * Math.PI) / 180)
  // Height/width on the ground; the short side is widened so the map is neither too tall nor too flat.
  const ratio = (north - south) / ((east - west) * cosine)
  if (ratio > 1.25) {
    const extra = ((north - south) / (1.25 * cosine) - (east - west)) / 2
    west -= extra; east += extra
  } else if (ratio < 0.7) {
    const extra = (0.7 * (east - west) * cosine - (north - south)) / 2
    south -= extra; north += extra
  }
  return { west, south, east, north, width: WIDTH, height: Math.round((WIDTH * (north - south)) / ((east - west) * cosine)) }
}

export function projector(frame: MapFrame) {
  return ([longitude, latitude]: Position): [number, number] => [
    ((longitude - frame.west) / (frame.east - frame.west)) * frame.width,
    ((frame.north - latitude) / (frame.north - frame.south)) * frame.height,
  ]
}

function pathFor(rings: Position[][], project: (position: Position) => [number, number]): string {
  return rings
    .map((ring) => ring.map((position, index) => {
      const [x, y] = project(position)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ') + ' Z')
    .join(' ')
}

const bboxRing = ([west, south, east, north]: [number, number, number, number]): Position[] =>
  [[west, south], [east, south], [east, north], [west, north]]

const windowClass: Record<SearchDecision, string> = {
  selected: 'selected', eligible: 'evaluated', not_selected_proximity: 'evaluated', not_selected_quota: 'evaluated',
  rejected_precedent_overlap: 'precedent', rejected_coverage: 'rejected', rejected_water: 'rejected', evaluation_failed: 'rejected',
}

function activate(event: KeyboardEvent<SVGGElement>, action: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    action()
  }
}

export function CandidateMap({ candidates, rankOf, outline, search, precedents, selectedId, onSelect }: CandidateMapProps) {
  const frame = mapFrame(candidates, search)
  const project = projector(frame)
  const inset = projector(INSET)
  const outlineRings = outline.features.map((feature) => ringsForGeometry(feature.geometry))
  const inFrame = ([longitude, latitude]: Position) =>
    longitude >= frame.west && longitude <= frame.east && latitude >= frame.south && latitude <= frame.north
  const publishedPoints = (precedents?.precedents ?? [])
    .flatMap((precedent) => precedent.points.map((point) => [point.longitude, point.latitude] as Position))
    .filter(inFrame)
  const parallels = Array.from({ length: Math.floor(frame.north) - Math.ceil(frame.south) + 1 }, (_, i) => Math.ceil(frame.south) + i)
  const meridians = Array.from({ length: Math.floor(frame.east) - Math.ceil(frame.west) + 1 }, (_, i) => Math.ceil(frame.west) + i)
  const references = candidates.filter(isReference).length
  const [insetX0, insetY0] = inset([frame.west, frame.north])
  const [insetX1, insetY1] = inset([frame.east, frame.south])

  return (
    <div className="map-frame">
      <div className="map-heading">
        <div>
          <span className="section-kicker">{search ? 'Chile–Argentina pilot' : 'Explorer'}</span>
          <h2>{search ? 'Explored area' : 'Demo zones'}</h2>
        </div>
        <span className="offline-chip">Local SVG · works offline</span>
      </div>

      <svg
        className="map-canvas"
        viewBox={`0 0 ${frame.width} ${frame.height}`}
        role="img"
        aria-label={search
          ? `Pilot map with ${search.counts.evaluated ?? 0} windows evaluated of ${search.counts.attempted ?? search.windows.length}, ${candidates.length - references} candidates and ${references} known reference`
          : `Map with ${candidates.length} selectable zones`}
        preserveAspectRatio="xMidYMin meet"
      >
        <rect className="map-ocean" width={frame.width} height={frame.height} />
        <g className="country-shape" aria-hidden="true">
          {outlineRings.map((rings, index) => <path d={pathFor(rings, project)} key={index} />)}
        </g>
        <g className="graticule" aria-hidden="true">
          {parallels.map((latitude) => {
            const [, y] = project([frame.west, latitude])
            return <g key={`lat${latitude}`}><line x1="0" x2={frame.width} y1={y} y2={y} /><text x="6" y={y - 4}>{Math.abs(latitude)}° S</text></g>
          })}
          {meridians.map((longitude) => {
            const [x] = project([longitude, frame.north])
            return <g key={`lon${longitude}`}><line x1={x} x2={x} y1="0" y2={frame.height} /><text x={x + 4} y={frame.height - 6}>{Math.abs(longitude)}° O</text></g>
          })}
        </g>

        {search && (
          <g className="search-layer" aria-hidden="true">
            {search.windows.map((item) => (
              <path className={`window ${windowClass[item.decision]}`} d={pathFor([bboxRing(item.bbox)], project)} key={item.window_id}>
                <title>{`${displaySource(item.name)}: ${displaySource(item.decision_reason)}`}</title>
              </path>
            ))}
            {search.regions.map((region) => {
              const [x, y] = project([region.bbox[0], region.bbox[3]])
              return (
                <g key={region.region_id}>
                  <path className="search-region" d={pathFor([bboxRing(region.bbox)], project)} />
                  <text className="region-label" x={x} y={y - 8}>{countryLabels[region.country].toUpperCase()} · {region.name}</text>
                </g>
              )
            })}
            {publishedPoints.map((point, index) => {
              const [x, y] = project(point)
              return <circle className="published-point" cx={x} cy={y} r="2.2" key={index} />
            })}
          </g>
        )}

        <g className="site-layer">
          {candidates.map((candidate) => {
            const rings = ringsForGeometry(candidate.geometry)
            const [west, south, east, north] = geometryBbox(candidate.geometry)
            const [x, y] = project([(west + east) / 2, (south + north) / 2])
            const selected = candidate.site_id === selectedId
            const reference = isReference(candidate)
            const label = reference ? 'REF' : String(rankOf.get(candidate.site_id) ?? '')
            return (
              <g
                key={candidate.site_id}
                className={`site-shape${reference ? ' reference' : ''}${selected ? ' selected' : ''}${candidate.similarity === null ? ' insufficient' : ''}`}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={`Select ${shortCandidateName(candidate.name)}${reference ? ', known reference' : `, candidate ${label}`}, similarity ${formatScore(candidate.similarity)}`}
                onClick={() => onSelect(candidate.site_id)}
                onKeyDown={(event) => activate(event, () => onSelect(candidate.site_id))}
              >
                <path d={pathFor(rings, project)} />
                <text x={x} y={y} textAnchor="middle" dy=".35em">{label}</text>
              </g>
            )
          })}
        </g>

        <g className="map-inset" transform={`translate(12 ${frame.height - INSET.height - 12})`} aria-hidden="true">
          <clipPath id="inset-clip"><rect width={INSET.width} height={INSET.height} rx="8" /></clipPath>
          <rect className="inset-background" width={INSET.width} height={INSET.height} rx="8" />
          <g clipPath="url(#inset-clip)">
            {outlineRings.map((rings, index) => <path className="inset-land" d={pathFor(rings, inset)} key={index} />)}
          </g>
          <rect className="inset-frame" x={insetX0} y={insetY0} width={Math.max(insetX1 - insetX0, 4)} height={Math.max(insetY1 - insetY0, 4)} />
        </g>
      </svg>

      <div className="map-legend" aria-label="Map legend">
        {search ? (
          <>
            <span><i className="legend-swatch candidate" /> Preselected candidate</span>
            <span><i className="legend-swatch reference" /> Known reference</span>
            <span><i className="legend-swatch evaluated" /> Evaluated window</span>
            <span><i className="legend-swatch precedent" /> Contains a published coordinate</span>
            <span><i className="legend-swatch point" /> Published sampling coordinate</span>
          </>
        ) : (
          <span><i className="legend-swatch candidate" /> Demo zone</span>
        )}
        <span><i className="legend-swatch outline" /> Reference outline, not an official boundary</span>
      </div>
    </div>
  )
}
