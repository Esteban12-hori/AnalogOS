import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GeoJSONSource, Map as MapLibreMap, Marker, setWorkerUrl, type GeoJSONFeature, type LngLatBoundsLike } from 'maplibre-gl'
// MapLibre 6 busca su worker junto al módulo; con Vite se sirve como asset propio.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { CandidateSite, GeoJsonFeatureCollection, Position } from '../../domain/contracts'
import { outerRings } from '../../domain/globe'
import type { FlatThresholds, ViewInsets } from '../../domain/mapZoom'
import { activeSources, type ActiveSource, type Basemap, type Bounds } from '../../data/loadBasemaps'
import { prefersReducedMotion } from '../../shell/public'
import type { FlatHandoff, FlyRequest, StageSelection } from './CandidateGlobe'
import { easeInOutCubic, flightDurationMs } from './flight'
import { angularDistanceDeg } from './geometry'
import { ClusterChip, MarkerPin, playHalos, pulsePin, setDataFlag, type PinRef } from './MarkerLayer'
import { buildMarkerModels, labelBudget, placeNearSelection, ringRadius, type MarkerCounts, type MarkerInput, type MarkerModel } from './markers'
import { publishStageFrame, type StageAnchor, type StageProjection } from './stageBridge'

/** Teselas Web Mercator de NASA GIBS: solo mejoran la vista fuera de las imágenes locales. */
const GIBS_BLUE_MARBLE =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'
setWorkerUrl(workerUrl)

/**
 * HLS S30 (~30 m) en línea para cualquier lugar: varias fechas apiladas; cada una es
 * transparente fuera de su pasada, así que las de abajo rellenan los huecos.
 * Octubre: estación seca en Atacama, pocas nubes.
 */
export const ONLINE_HLS_DATES = ['2025-10-01', '2025-10-02', '2025-10-03', '2025-10-04', '2025-10-05', '2025-10-06']
const hlsTiles = (date: string) =>
  `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/HLS_S30_Nadir_BRDF_Adjusted_Reflectance/default/${date}/GoogleMapsCompatible_Level12/{z}/{y}/{x}.png`
const ONLINE_HLS_MIN_ZOOM = 8

/** Agrupación nativa de MapLibre con el mismo radio que el globo (§3.1). */
const CLUSTER_RADIUS = 36
const MAX_ZOOM = 14

/** Botones + / − del escenario en el 2D (el teclado lo maneja MapLibre). */
export type FlatCommand = { kind: 'zoom'; delta: number; nonce: number }

interface CandidateFlatMapProps {
  candidates: CandidateSite[]
  chileOutline: GeoJsonFeatureCollection
  basemaps: Basemap[]
  markerInput: MarkerInput
  selection: StageSelection | null
  hoverId: string | null
  onActivate: (model: MarkerModel) => void
  /** Centrar un marcador (selección o «Centrar en ‹#1›»). */
  fly: FlyRequest | null
  command: FlatCommand | null
  /** Centro y zoom con que se entra desde el globo. */
  entry: FlatHandoff
  /** Pide encuadrar el lugar seleccionado (cambia el número para repetir). */
  focusRequest: number
  active: boolean
  /** Márgenes asentados de la UI: padding de MapLibre (el centro queda en el área libre). */
  insets: ViewInsets
  /** Umbrales globo ↔ 2D según el panel visible. */
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

/** Puntos de los marcadores agrupables; la selección y el hover quedan fuera (nunca se agrupan). */
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
  // Orden de abajo hacia arriba por calidad: regional < mediana HLS por sector < Sentinel-2 por candidato.
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
        // Conteos por tipo y país común: nunca promedios.
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
      // Mundo local de respaldo: queda debajo de las teselas en línea, que lo tapan si hay conexión.
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
      // La fecha más reciente queda arriba; las anteriores rellenan sus huecos.
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
        // Los sectores a 30 m entran gradualmente cuando su detalle supera al regional.
        paint: { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 7.5, 0, 8.5, 1] as unknown as number, 'raster-fade-duration': 0 },
      })),
      {
        id: 'chile-outline',
        type: 'line',
        source: 'chile-outline',
        paint: { 'line-color': '#3FB4EC', 'line-opacity': 0.55, 'line-width': 1 },
      },
      // Sectores: polígonos (nunca pins). Selección = hielo + azul; datos insuficientes, discontinuo.
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
      // Zona aproximada del ◆ seleccionado: siempre discontinua.
      { id: 'zone-line', type: 'line', source: 'zone', paint: { 'line-color': '#94AABA', 'line-width': 1.6, 'line-dasharray': [3, 2] } },
      // Capa invisible: obliga a MapLibre a calcular los grupos; los marcadores son DOM.
      { id: 'marker-probe', type: 'circle', source: 'markers', paint: { 'circle-radius': 1, 'circle-opacity': 0, 'circle-stroke-width': 0 } },
    ],
  }
}

function viewBounds(map: MapLibreMap): Bounds {
  const bounds = map.getBounds()
  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
}

/** Un marcador DOM visible en el 2D: un lugar suelto o un grupo de MapLibre. */
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
      // MapLibre reutiliza ids entre datos distintos: el conteo forma parte de la clave.
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
  chileOutline,
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
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const onlineLoaded = useRef(false)
  const onlineHlsLoaded = useRef(false)
  const exiting = useRef(false)
  const models = useMemo(() => buildMarkerModels(markerInput), [markerInput])
  const byId = useMemo(() => new Map(models.map((model) => [model.id, model])), [models])
  const selectedId = selection?.id ?? null
  const standalone = useMemo(() => new Set([selectedId, hoverId].filter((id): id is string => id !== null)), [selectedId, hoverId])

  // Marcadores DOM: un contenedor por entrada (Marker de MapLibre) donde React monta un portal.
  const [entries, setEntries] = useState<FlatEntry[]>([])
  const entryList = useRef<FlatEntry[]>([])
  const hosts = useRef(new Map<string, { marker: Marker; element: HTMLDivElement }>())
  const pins = useRef(new Map<string, HTMLDivElement>())
  const signature = useRef('')
  const [openCluster, setOpenCluster] = useState<{ key: string; members: MarkerModel[] | null } | null>(null)

  // Las callbacks cambian en cada render del padre; el mapa se crea una sola vez.
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

  /** Publica proyección y ancla del lugar seleccionado; ajusta el anillo al polígono proyectado. */
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
    // Un grupo pegado al seleccionado se corre bajo su anillo y queda compacto (como en el globo).
    for (const item of entryList.current) {
      const host = item.kind === 'cluster' ? hosts.current.get(item.key) : undefined
      if (!host) continue
      const point = map.project(item.at)
      const placed = placeNearSelection(point, selectedRing)
      host.marker.setOffset([placed.x - point.x, placed.y - point.y])
      const root = host.element.firstElementChild
      if (root instanceof HTMLElement) setDataFlag(root, 'compact', placed.compact)
    }
    publishStageFrame({ projection, anchor })
  }, [projection])

  /** Lee los grupos que calculó MapLibre y reconcilia los Marker DOM (solo si cambió el conjunto). */
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
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const map = new MapLibreMap({
      container,
      style: buildStyle(basemaps, chileOutline, candidates),
      center: [entry.lon, entry.lat],
      zoom: entry.zoom,
      minZoom: thresholds.exit - 0.6,
      maxZoom: MAX_ZOOM,
      attributionControl: false,
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
    // Sin conexión, las teselas en línea fallan: se ignora y quedan las imágenes locales.
    map.on('error', () => undefined)
    map.on('load', () => {
      reportSources()
      const source = map.getSource('markers')
      if (source instanceof GeoJSONSource) source.setData(markerCollection(latest.current.models, latest.current.standalone))
    })
    // 'render' cubre los cambios de zoom (los grupos cambian por nivel); solo reconcilia si cambió el conjunto.
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
      // Un clic sobre un marcador DOM ya lo resolvió su botón.
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
    // El mapa se crea una vez; los cambios posteriores se aplican en efectos dedicados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { top, right, bottom, left } = insets
  useEffect(() => {
    mapRef.current?.setPadding({ top, right, bottom, left })
  }, [top, right, bottom, left])

  // Re-entrada desde el globo: salto al mismo centro/escala.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !active) return
    exiting.current = false
    map.resize()
    map.jumpTo({ center: [entry.lon, entry.lat], zoom: Math.max(entry.zoom, map.getMinZoom()) })
  }, [active, entry])

  // Datos de marcadores, selección, hover y zona: solo con el mapa activo (el 2D dormido no redibuja).
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

  // Centrar un marcador: misma fórmula de duración que el globo; con reduced motion, corte.
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

  // «Ver en el mapa»: encuadre del sector (o de la zona aproximada del ◆) seleccionado.
  // `focusRequest` empieza en 0: si al montar ya es mayor, hubo un pedido mientras el chunk cargaba.
  const lastFocus = useRef(0)
  useEffect(() => {
    const map = mapRef.current
    if (lastFocus.current === focusRequest) return
    lastFocus.current = focusRequest
    if (!map || !latest.current.active || !selection) return
    const candidate = candidates.find((item) => item.site_id === selection.id)
    const bounds = candidate ? boundsOf(candidate) : ringBounds(byId.get(selection.id)?.outline ?? [])
    if (!bounds) return
    // El padding del mapa ya descuenta la UI (insets); aquí solo un margen alrededor del sector.
    map.fitBounds(bounds, { padding: { top: 48, bottom: 48, left: 64, right: 64 }, maxZoom: 11.5, duration: prefersReducedMotion() ? 0 : 1400 })
  }, [focusRequest, selection, candidates, byId])

  // Coreografía D: halos en el orden nuevo sobre los lugares sueltos.
  const lastRevision = useRef(resultsRevision)
  useEffect(() => {
    if (resultsRevision === lastRevision.current) return
    lastRevision.current = resultsRevision
    if (!active || prefersReducedMotion()) return
    playHalos(pins.current, models.filter((model) => model.kind === 'evaluated' && model.rank !== null).map((model) => model.id), 120)
  }, [resultsRevision, models, active])

  // Marcadores recién montados: ubicar grupos cercanos a la selección y publicar el ancla.
  useEffect(() => {
    publishFrame()
  }, [entries, publishFrame])

  // Al cambiar el conjunto, la lista abierta de un grupo que ya no existe se cierra.
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

  // Rótulos: presupuesto por prioridad (selección, hover, luego orden), como en el globo.
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
      aria-label="Mapa 2D con imágenes oficiales NASA. Flechas: desplazar. Más y menos: acercar o alejar. Inicio: vista global."
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
