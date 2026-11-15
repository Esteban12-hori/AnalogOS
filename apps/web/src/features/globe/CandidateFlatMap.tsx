import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GeoJSONSource, Map as MapLibreMap, Marker, setWorkerUrl, type GeoJSONFeature, type LngLatBoundsLike } from 'maplibre-gl'
// MapLibre 6 looks for its worker next to the module; with Vite it is served as its own asset.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { CandidateSite, GeoJsonFeatureCollection, Position } from '../../domain/contracts'
import { outerRings } from '../../domain/globe'
import type { FlatThresholds, ViewInsets } from '../../domain/mapZoom'
import { activeSources, type ActiveSource, type Basemap, type Bounds } from '../../data/loadBasemaps'
import { prefersReducedMotion } from '../../shell/public'
import { useLocale, useT } from '../../i18n'
import { tGlobeMarkers } from '../../i18n/messages/globeMarkers'
import type { FlatHandoff, FlyRequest, StageSelection } from './CandidateGlobe'
import { easeInOutCubic, flightDurationMs } from './flight'
import { mapUiStrings } from './mapUiStrings'
import { angularDistanceDeg } from './geometry'
import { ClusterChip, MarkerPin, playHalos, pulsePin, setDataFlag, type PinRef } from './MarkerLayer'
import { buildMarkerModels, labelBudget, placeNearSelection, ringRadius, type MarkerCounts, type MarkerInput, type MarkerModel } from './markers'
import { publishStageFrame, type StageAnchor, type StageProjection } from './stageBridge'

/** NASA GIBS Web Mercator tiles: they only improve the view outside the local images. */
const GIBS_BLUE_MARBLE =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'
setWorkerUrl(workerUrl)

/**
 * HLS S30 (~30 m) online for any location: several dates stacked; each one is
 * transparent outside its pass, so the ones below fill in the gaps.
 * October: dry season in Atacama, few clouds.
 */
export const ONLINE_HLS_DATES = ['2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06']
const hlsTiles = (date: string) =>
  `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/HLS_S30_Nadir_BRDF_Adjusted_Reflectance/default/${date}/GoogleMapsCompatible_Level12/{z}/{y}/{x}.png`
const ONLINE_HLS_MIN_ZOOM = 8

/** Native MapLibre clustering with the same radius as the globe (§3.1). */
const CLUSTER_RADIUS = 36
const MAX_ZOOM = 14

/** Stage + / − buttons in 2D (the keyboard is handled by MapLibre). */
export type FlatCommand = { kind: 'zoom'; delta: number; nonce: number }

interface CandidateFlatMapProps {
  candidates: CandidateSite[]
  outline: GeoJsonFeatureCollection
  basemaps: Basemap[]
  markerInput: MarkerInput
  selection: StageSelection | null
  hoverId: string | null
  onActivate: (model: MarkerModel) => void
  /** Center a marker (selection or "Center on ‹#1›"). */
  fly: FlyRequest | null
  command: FlatCommand | null
  /** Center and zoom used when entering from the globe. */
  entry: FlatHandoff
  /** Requests framing the selected place (change the number to repeat). */
  focusRequest: number
  active: boolean
  /** Settled UI margins: MapLibre padding (the center stays in the free area). */
  insets: ViewInsets
  /** Globe ↔ 2D thresholds depending on the visible panel. */
  thresholds: FlatThresholds
  narrow: boolean
  resultsRevision: number
  onExit: (handoff: FlatHandoff) => void
  onSourcesChange: (sources: ActiveSource[]) => void
  onCameraInput: () => void
  onHome: () => void
}

function candidateCollection(candidates: CandidateSite[], selectedId: string | null): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: candidates.map((candidate) => ({
      type: 'Feature',
      id: candidate.site_id,
      properties: { site_id: candidate.site_id, selected: candidate.site_id === selectedId, pending: candidate.similarity === null },
      geometry: candidate.geometry as Geometry,
    })),
  }
}

/** Points of the clusterable markers; the selection and hover are left out (they are never clustered). */
function markerCollection(models: readonly MarkerModel[], standalone: ReadonlySet<string>): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: models
      .filter((model) => !standalone.has(model.id))
      .map((model) => ({
        type: 'Feature',
        properties: { id: model.id, kind: model.kind, group: model.group, order: model.order },
        geometry: { type: 'Point', coordinates: model.center },
      })),
  }
}

function zoneCollection(ring: Position[] | null): FeatureCollection {
  const features: Feature[] = ring ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ring } }] : []
  return { type: 'FeatureCollection', features }
}

function ringBounds(ring: readonly Position[]): LngLatBoundsLike | null {
  if (!ring.length) return null
  const lons = ring.map(([lon]) => lon)
  const lats = ring.map(([, lat]) => lat)
  return [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]]
}

function boundsOf(candidate: CandidateSite): LngLatBoundsLike | null {
  return ringBounds(outerRings(candidate.geometry).flat())
}

function buildStyle(basemaps: Basemap[], outline: GeoJsonFeatureCollection, candidates: CandidateSite[]): StyleSpecification {
  const base = import.meta.env.BASE_URL
  const imageSources = Object.fromEntries(
    basemaps.map((basemap) => {
      const [west, south, east, north] = basemap.bounds
      return [
        `basemap-${basemap.id}`,
        {
          type: 'image' as const,
          url: `${base}${basemap.image}`,
          coordinates: [[west, north], [east, north], [east, south], [west, south]] as [[number, number], [number, number], [number, number], [number, number]],
        },
      ]
    }),
  )
  // Bottom-to-top order by quality: regional < per-sector HLS median < per-candidate Sentinel-2.
  const rank = { world: 0, regional: 1, sector: 2, context: 3 } as const
  const detailed = (basemap: Basemap) => basemap.kind === 'sector' || basemap.kind === 'context'
  const ordered = [...basemaps].sort((a, b) => rank[a.kind] - rank[b.kind])
  return {
    version: 8,
    sources: {
      'gibs-blue-marble': {
        type: 'raster',
        tiles: [GIBS_BLUE_MARBLE],
        tileSize: 256,
        maxzoom: 8,
        attribution: 'NASA GIBS',
      },
      ...Object.fromEntries(
        ONLINE_HLS_DATES.map((date) => [
          `gibs-hls-${date}`,
          { type: 'raster' as const, tiles: [hlsTiles(date)], tileSize: 256, minzoom: ONLINE_HLS_MIN_ZOOM, maxzoom: 12, attribution: 'NASA GIBS · HLS' },
        ]),
      ),
      ...imageSources,
      'chile-outline': { type: 'geojson', data: outline as unknown as FeatureCollection },
      candidates: { type: 'geojson', data: candidateCollection(candidates, null) },
      zone: { type: 'geojson', data: zoneCollection(null) },
      markers: {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: CLUSTER_RADIUS,
        clusterMaxZoom: MAX_ZOOM,
        // Counts by type and common country: never averages.
        clusterProperties: {
          evaluated: ['+', ['case', ['==', ['get', 'kind'], 'evaluated'], 1, 0]],
          insufficient: ['+', ['case', ['==', ['get', 'kind'], 'insufficient'], 1, 0]],
          reference: ['+', ['case', ['==', ['get', 'kind'], 'reference'], 1, 0]],
          group: [['case', ['==', ['accumulated'], ['get', 'group']], ['accumulated'], ''], ['get', 'group']],
        },
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#02070A' } },
      // Local fallback world: it sits beneath the online tiles, which cover it if there is a connection.
      ...ordered.filter((basemap) => basemap.kind === 'world').map((basemap) => ({
        id: `basemap-${basemap.id}`,
        type: 'raster' as const,
        source: `basemap-${basemap.id}`,
        paint: { 'raster-fade-duration': 0 },
      })),
      { id: 'gibs-blue-marble', type: 'raster', source: 'gibs-blue-marble', paint: { 'raster-fade-duration': 150 } },
      ...ordered.filter((basemap) => basemap.kind === 'regional').map((basemap) => ({
        id: `basemap-${basemap.id}`,
        type: 'raster' as const,
        source: `basemap-${basemap.id}`,
        paint: { 'raster-fade-duration': 0 },
      })),
      // The most recent date stays on top; the earlier ones fill in its gaps.
      ...ONLINE_HLS_DATES.map((date) => ({
        id: `gibs-hls-${date}`,
        type: 'raster' as const,
        source: `gibs-hls-${date}`,
        minzoom: ONLINE_HLS_MIN_ZOOM,
        paint: { 'raster-fade-duration': 150 },
      })),
      ...ordered.filter(detailed).map((basemap) => ({
        id: `basemap-${basemap.id}`,
        type: 'raster' as const,
        source: `basemap-${basemap.id}`,
        // The 30 m sectors fade in gradually when their detail surpasses the regional one.
        paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 7.5, 0, 8.5, 1] as unknown as number, 'raster-fade-duration': 0 },
      })),
      {
        id: 'chile-outline',
        type: 'line',
        source: 'chile-outline',
        paint: { 'line-color': '#3FB4EC', 'line-opacity': 0.55, 'line-width': 1 },
      },
      // Sectors: polygons (never pins). Selection = ice + blue; insufficient data, dashed.
      {
        id: 'candidate-fill',
        type: 'fill',
        source: 'candidates',
        paint: { 'fill-color': '#0297DE', 'fill-opacity': ['case', ['get', 'selected'], 0.14, 0.06] },
      },
      {
        id: 'candidate-line',
        type: 'line',
        source: 'candidates',
        filter: ['!', ['get', 'pending']],
        paint: {
          'line-color': ['case', ['get', 'selected'], '#EAF4FA', '#3FB4EC'],
          'line-width': ['case', ['get', 'selected'], 2.6, 1.6],
        },
      },
      {
        id: 'candidate-line-pending',
        type: 'line',
        source: 'candidates',
        filter: ['get', 'pending'],
        paint: { 'line-color': ['case', ['get', 'selected'], '#EAF4FA', '#6F889A'], 'line-width': 1.6, 'line-dasharray': [2, 2] },
      },
      // Approximate area of the selected ◆: always dashed.
      { id: 'zone-line', type: 'line', source: 'zone', paint: { 'line-color': '#94AABA', 'line-width': 1.6, 'line-dasharray': [3, 2] } },
      // Invisible layer: forces MapLibre to compute the clusters; the markers are DOM.
      { id: 'marker-probe', type: 'circle', source: 'markers', paint: { 'circle-radius': 1, 'circle-opacity': 0, 'circle-stroke-width': 0 } },
    ],
  }
}

function viewBounds(map: MapLibreMap): Bounds {
  const bounds = map.getBounds()
  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
}

/** A visible DOM marker in 2D: a single place or a MapLibre cluster. */
type FlatEntry =
  | { key: string; kind: 'pin'; id: string; at: Position }
  | { key: string; kind: 'cluster'; clusterId: number; count: number; counts: MarkerCounts; group: string; at: Position }

function numberProperty(feature: GeoJSONFeature, name: string): number {
  const value: unknown = feature.properties[name]
  return typeof value === 'number' ? value : 0
}

function readEntries(features: GeoJSONFeature[]): FlatEntry[] {
  const entries = new Map<string, FlatEntry>()
  for (const feature of features) {
    if (feature.geometry.type !== 'Point') continue
    const at = feature.geometry.coordinates as Position
    const properties = feature.properties
    if (properties.cluster) {
      const clusterId = numberProperty(feature, 'cluster_id')
      // MapLibre reuses ids across different data: the count is part of the key.
      const key = `c:${clusterId}:${numberProperty(feature, 'point_count')}`
      if (entries.has(key)) continue
      const group = typeof properties.group === 'string' ? properties.group : ''
      entries.set(key, {
        key,
        kind: 'cluster',
        clusterId,
        count: numberProperty(feature, 'point_count'),
        counts: { evaluated: numberProperty(feature, 'evaluated'), insufficient: numberProperty(feature, 'insufficient'), reference: numberProperty(feature, 'reference') },
        group,
        at,
      })
    } else if (typeof properties.id === 'string') {
      const key = `m:${properties.id}`
      if (!entries.has(key)) entries.set(key, { key, kind: 'pin', id: properties.id, at })
    }
  }
  return [...entries.values()]
}

export default function CandidateFlatMap({
  candidates,
  outline,
  basemaps,
  markerInput,
  selection,
  hoverId,
  onActivate,
  fly,
  command,
  entry,
  focusRequest,
  active,
  insets,
  thresholds,
  narrow,
  resultsRevision,
  onExit,
  onSourcesChange,
  onCameraInput,
  onHome,
}: CandidateFlatMapProps) {
  const locale = useLocale()
  const t = useT(tGlobeMarkers)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const onlineLoaded = useRef(false)
  const onlineHlsLoaded = useRef(false)
  const exiting = useRef(false)
  const models = useMemo(() => buildMarkerModels(markerInput), [markerInput])
  const byId = useMemo(() => new Map(models.map((model) => [model.id, model])), [models])
  const selectedId = selection?.id ?? null
  const standalone = useMemo(() => new Set([selectedId, hoverId].filter((id): id is string => id !== null)), [selectedId, hoverId])

  // DOM markers: one container per entry (MapLibre Marker) where React mounts a portal.
  const [entries, setEntries] = useState<FlatEntry[]>([])
  const entryList = useRef<FlatEntry[]>([])
  const hosts = useRef(new Map<string, { marker: Marker; element: HTMLDivElement }>())
  const pins = useRef(new Map<string, HTMLDivElement>())
  const signature = useRef('')
  const [openCluster, setOpenCluster] = useState<{ key: string; members: MarkerModel[] | null } | null>(null)

  // The callbacks change on every render of the parent; the map is created only once.
  const latest = useRef({ onExit, onSourcesChange, onCameraInput, onHome, onActivate, basemaps, active, thresholds, byId, selection, standalone, models })
  latest.current = { onExit, onSourcesChange, onCameraInput, onHome, onActivate, basemaps, active, thresholds, byId, selection, standalone, models }
  const flying = useRef<string | null>(null)

  const projection = useMemo<StageProjection>(() => ({
    mode: 'flat',
    project(lon, lat) {
      const map = mapRef.current
      if (!map) return null
      const point = map.project([lon, lat])
      const container = map.getContainer()
      if (point.x < 0 || point.y < 0 || point.x > container.clientWidth || point.y > container.clientHeight) return null
      return { x: point.x, y: point.y, visible: 1 }
    },
  }), [])

  /** Publishes the projection and anchor of the selected place; fits the ring to the projected polygon. */
  const publishFrame = useCallback(() => {
    const map = mapRef.current
    const { active, selection, byId } = latest.current
    if (!map || !active) return
    let anchor: StageAnchor | null = null
    let selectedRing: { x: number; y: number; radius: number } | null = null
    const model = selection ? byId.get(selection.id) : undefined
    if (model) {
      const center = map.project(model.center)
      const radius = ringRadius(center, (model.outline ?? []).map((position) => map.project(position)))
      selectedRing = { x: center.x, y: center.y, radius }
      pins.current.get(model.id)?.style.setProperty('--ring-r', `${radius.toFixed(1)}px`)
      const container = map.getContainer()
      const onScreen = center.x >= 0 && center.y >= 0 && center.x <= container.clientWidth && center.y <= container.clientHeight
      if (selection?.kind === 'evaluated' && onScreen) anchor = { siteId: model.id, x: center.x, y: center.y, radius, visible: 1, mode: 'flat' }
    }
    for (const item of entryList.current) {
      const host = hosts.current.get(item.key)
      if (!host) continue
      const point = map.project(item.at)
      let x = point.x
      if (item.kind === 'cluster') {
        // A cluster adjacent to the selected one is shifted beneath its ring and stays compact (as on the globe).
        const placed = placeNearSelection(point, selectedRing)
        host.marker.setOffset([placed.x - point.x, placed.y - point.y])
        const root = host.element.firstElementChild
        if (root instanceof HTMLElement) setDataFlag(root, 'compact', placed.compact)
        x = placed.x
      }
      // Like applyPinFrame on the globe: the label is shortened before the rail or the edge (markers.css).
      const pinX = `${Math.round(x)}px`
      if (host.element.style.getPropertyValue('--pin-x') !== pinX) host.element.style.setProperty('--pin-x', pinX)
    }
    publishStageFrame({ projection, anchor })
  }, [projection])

  /** Reads the clusters computed by MapLibre and reconciles the DOM Markers (only if the set changed). */
  const syncMarkers = useCallback(() => {
    const map = mapRef.current
    if (!map || !map.getSource('markers') || !map.isSourceLoaded('markers')) return
    const { byId, standalone } = latest.current
    const next = readEntries(map.querySourceFeatures('markers'))
    for (const id of standalone) {
      const model = byId.get(id)
      if (model) next.push({ key: `m:${id}`, kind: 'pin', id, at: model.center })
    }
    const describe = (item: FlatEntry) =>
      item.kind === 'cluster' ? `${item.key}:${item.counts.evaluated}/${item.counts.insufficient}/${item.counts.reference}:${item.group}:${item.at.join(',')}` : `${item.key}:${item.at.join(',')}`
    const nextSignature = next.map(describe).sort().join(';')
    if (nextSignature === signature.current) return
    signature.current = nextSignature
    const keep = new Set(next.map((item) => item.key))
    for (const [key, host] of hosts.current) {
      if (keep.has(key)) continue
      host.marker.remove()
      hosts.current.delete(key)
    }
    for (const item of next) {
      const existing = hosts.current.get(item.key)
      if (existing) {
        existing.marker.setLngLat(item.at)
        continue
      }
      const element = document.createElement('div')
      element.className = 'globe-flat-host'
      hosts.current.set(item.key, { element, marker: new Marker({ element, anchor: 'center' }).setLngLat(item.at).addTo(map) })
    }
    entryList.current = next
    setEntries(next)
    // New Markers receive their --pin-x without waiting for the next movement.
    publishFrame()
  }, [publishFrame])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const map = new MapLibreMap({
      container,
      style: buildStyle(basemaps, outline, candidates),
      center: [entry.lon, entry.lat],
      zoom: entry.zoom,
      minZoom: thresholds.exit - 0.6,
      maxZoom: MAX_ZOOM,
      attributionControl: false,
      locale: mapUiStrings(locale),
      dragRotate: false,
      pitchWithRotate: false,
      renderWorldCopies: false,
    })
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()
    map.setPadding({ ...insets })
    mapRef.current = map

    const reportSources = () => {
      const { basemaps: current, onSourcesChange: report } = latest.current
      report(activeSources(viewBounds(map), map.getZoom(), current, {
        blueMarble: onlineLoaded.current,
        hls: onlineHlsLoaded.current ? ONLINE_HLS_DATES : null,
      }))
    }
    map.on('sourcedata', (event) => {
      if (event.sourceId === 'markers' && event.isSourceLoaded) syncMarkers()
      if (!event.isSourceLoaded || !event.tile) return
      if (event.sourceId === 'gibs-blue-marble' && !onlineLoaded.current) {
        onlineLoaded.current = true
        reportSources()
      }
      if (event.sourceId.startsWith('gibs-hls-') && !onlineHlsLoaded.current) {
        onlineHlsLoaded.current = true
        reportSources()
      }
    })
    // Offline, the online tiles fail: this is ignored and the local images remain.
    map.on('error', () => undefined)
    map.on('load', () => {
      reportSources()
      const source = map.getSource('markers')
      if (source instanceof GeoJSONSource) source.setData(markerCollection(latest.current.models, latest.current.standalone))
    })
    // 'render' covers zoom changes (clusters change per level); it only reconciles if the set changed.
    map.on('render', syncMarkers)
    map.on('move', publishFrame)
    map.on('resize', publishFrame)
    map.on('movestart', (event) => {
      if (!event.originalEvent) return
      flying.current = null
      latest.current.onCameraInput()
    })
    map.on('moveend', () => {
      reportSources()
      const arrived = flying.current
      flying.current = null
      if (arrived && !prefersReducedMotion()) {
        const element = pins.current.get(arrived)
        if (element) pulsePin(element)
      }
      if (!latest.current.active || exiting.current) return
      if (map.getZoom() < latest.current.thresholds.exit) {
        exiting.current = true
        const center = map.getCenter()
        latest.current.onExit({ lon: center.lng, lat: center.lat, zoom: map.getZoom() })
      }
    })
    map.on('click', 'candidate-fill', (event) => {
      // A click on a DOM marker has already been resolved by its button.
      const target = event.originalEvent.target
      if (target instanceof Element && target.closest('.globe-pin, .globe-cluster')) return
      const id = event.features?.[0]?.properties?.site_id
      const model = typeof id === 'string' ? latest.current.byId.get(id) : undefined
      if (model) latest.current.onActivate(model)
    })
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Home' || event.altKey || event.ctrlKey || event.metaKey) return
      event.preventDefault()
      latest.current.onHome()
    }
    container.addEventListener('keydown', onKey)

    const ownHosts = hosts.current
    return () => {
      container.removeEventListener('keydown', onKey)
      for (const host of ownHosts.values()) host.marker.remove()
      ownHosts.clear()
      map.remove()
      mapRef.current = null
    }
    // The map is created once; later changes are applied in dedicated effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { top, right, bottom, left } = insets
  useEffect(() => {
    mapRef.current?.setPadding({ top, right, bottom, left })
  }, [top, right, bottom, left])

  // MapLibre names its canvas only on construction: a language change renames it here.
  useEffect(() => {
    mapRef.current?.getCanvas().setAttribute('aria-label', mapUiStrings(locale)['Map.Title'])
  }, [locale])

  // Re-entry from the globe: jump to the same center/scale.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !active) return
    exiting.current = false
    map.resize()
    map.jumpTo({ center: [entry.lon, entry.lat], zoom: Math.max(entry.zoom, map.getMinZoom()) })
  }, [active, entry])

  // Marker data, selection, hover and area: only with the map active (the dormant 2D does not redraw).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !active) return
    const apply = () => {
      const candidatesSource = map.getSource('candidates')
      if (candidatesSource instanceof GeoJSONSource) candidatesSource.setData(candidateCollection(candidates, selection?.kind === 'evaluated' ? selection.id : null))
      const markersSource = map.getSource('markers')
      if (markersSource instanceof GeoJSONSource) markersSource.setData(markerCollection(models, standalone))
      const zoneSource = map.getSource('zone')
      const zone = selection?.kind === 'reference' ? byId.get(selection.id)?.outline ?? null : null
      if (zoneSource instanceof GeoJSONSource) zoneSource.setData(zoneCollection(zone))
      publishFrame()
    }
    if (map.isStyleLoaded()) apply()
    else map.once('load', apply)
  }, [active, candidates, models, byId, standalone, selection, publishFrame])

  // Centering a marker: same duration formula as the globe; with reduced motion, a cut.
  const lastFly = useRef(fly?.nonce ?? 0)
  useEffect(() => {
    if (!fly || fly.nonce === lastFly.current) return
    lastFly.current = fly.nonce
    const map = mapRef.current
    const model = byId.get(fly.id)
    if (!map || !active || !model) return
    const center = map.getCenter()
    const duration = prefersReducedMotion() ? 0 : flightDurationMs(angularDistanceDeg([center.lng, center.lat], model.center), 1, 1)
    flying.current = model.id
    map.easeTo({ center: model.center, duration, easing: easeInOutCubic })
  }, [fly, active, byId])

  // Botones + / −.
  const lastCommand = useRef(command?.nonce ?? 0)
  useEffect(() => {
    if (!command || command.nonce === lastCommand.current) return
    lastCommand.current = command.nonce
    const map = mapRef.current
    if (!map || !active) return
    const duration = prefersReducedMotion() ? 0 : flightDurationMs(0, 1, 2 ** -command.delta)
    map.easeTo({ zoom: map.getZoom() + command.delta, duration, easing: easeInOutCubic })
  }, [command, active])

  // "View on the map": framing of the selected sector (or of the approximate area of the ◆).
  // `focusRequest` starts at 0: if on mount it is already greater, there was a request while the chunk was loading.
  const lastFocus = useRef(0)
  useEffect(() => {
    const map = mapRef.current
    if (lastFocus.current === focusRequest) return
    lastFocus.current = focusRequest
    if (!map || !latest.current.active || !selection) return
    const candidate = candidates.find((item) => item.site_id === selection.id)
    const bounds = candidate ? boundsOf(candidate) : ringBounds(byId.get(selection.id)?.outline ?? [])
    if (!bounds) return
    // The map padding already accounts for the UI (insets); here only a margin around the sector.
    map.fitBounds(bounds, { padding: { top: 48, bottom: 48, left: 64, right: 64 }, maxZoom: 11.5, duration: prefersReducedMotion() ? 0 : 1400 })
  }, [focusRequest, selection, candidates, byId])

  // Choreography D: halos in the new order over the individual places.
  const lastRevision = useRef(resultsRevision)
  useEffect(() => {
    if (resultsRevision === lastRevision.current) return
    lastRevision.current = resultsRevision
    if (!active || prefersReducedMotion()) return
    playHalos(pins.current, models.filter((model) => model.kind === 'evaluated' && model.rank !== null).map((model) => model.id), 120)
  }, [resultsRevision, models, active])

  // Newly mounted markers: locate clusters near the selection and publish the anchor.
  useEffect(() => {
    publishFrame()
  }, [entries, publishFrame])

  // When the set changes, the open list of a cluster that no longer exists is closed.
  useEffect(() => {
    if (openCluster && !entries.some((item) => item.key === openCluster.key)) setOpenCluster(null)
  }, [entries, openCluster])

  const toggleCluster = (item: Extract<FlatEntry, { kind: 'cluster' }>, open: boolean) => {
    if (!open) {
      setOpenCluster(null)
      return
    }
    setOpenCluster({ key: item.key, members: null })
    const source = mapRef.current?.getSource('markers')
    if (!(source instanceof GeoJSONSource)) return
    void source.getClusterLeaves(item.clusterId, item.count, 0).then((leaves) => {
      const members = leaves
        .flatMap((leaf) => {
          const id: unknown = leaf.properties?.id
          const model = typeof id === 'string' ? latest.current.byId.get(id) : undefined
          return model ? [model] : []
        })
        .sort((a, b) => a.order - b.order)
      setOpenCluster((current) => (current?.key === item.key ? { key: item.key, members } : current))
    }, () => setOpenCluster((current) => (current?.key === item.key ? { key: item.key, members: [] } : current)))
  }

  // Labels: budget by priority (selection, hover, then order), as on the globe.
  const labeled = useMemo(() => {
    const singles = entries.flatMap((item) => (item.kind === 'pin' ? byId.get(item.id) ?? [] : []))
    const priority = (model: MarkerModel) => (model.id === selectedId ? -2 : model.id === hoverId ? -1 : model.order)
    return new Set(singles.sort((a, b) => priority(a) - priority(b)).slice(0, labelBudget(narrow)).map((model) => model.id))
  }, [entries, byId, selectedId, hoverId, narrow])

  const pinRefs = useRef(new Map<string, PinRef>())
  const pinRef = (id: string): PinRef => {
    let ref = pinRefs.current.get(id)
    if (!ref) {
      ref = (element) => {
        if (element) pins.current.set(id, element)
        else pins.current.delete(id)
      }
      pinRefs.current.set(id, ref)
    }
    return ref
  }

  return (
    <div
      ref={containerRef}
      className="flat-map"
      role="region"
      aria-label={t('flat.aria')}
      data-selection={selectedId ? '' : undefined}
    >
      {entries.map((item) => {
        const host = hosts.current.get(item.key)?.element
        if (!host) return null
        if (item.kind === 'cluster') {
          const open = openCluster?.key === item.key
          return createPortal(
            <ClusterChip
              clusterKey={item.key}
              counts={item.counts}
              group={item.group}
              members={open ? openCluster.members : null}
              open={open}
              hover={false}
              onToggle={(next) => toggleCluster(item, next)}
              onActivate={(model) => {
                setOpenCluster(null)
                onActivate(model)
              }}
            />,
            host,
            item.key,
          )
        }
        const model = byId.get(item.id)
        if (!model) return null
        return createPortal(
          <MarkerPin
            model={model}
            selected={model.id === selectedId}
            hover={model.id === hoverId}
            labeled={labeled.has(model.id)}
            onActivate={onActivate}
            rootRef={pinRef(model.id)}
          />,
          host,
          item.key,
        )
      })}
    </div>
  )
}
