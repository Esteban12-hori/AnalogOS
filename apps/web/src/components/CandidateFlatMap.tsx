import { useEffect, useRef } from 'react'
import { GeoJSONSource, Map as MapLibreMap, Marker, setWorkerUrl, type LngLatBoundsLike } from 'maplibre-gl'
// MapLibre 6 busca su worker junto al módulo; con Vite se sirve como asset propio.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec'
import type { FeatureCollection, Geometry } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { CandidateSite, GeoJsonFeatureCollection, Position } from '../domain/contracts'
import { formatScore } from '../domain/formatting'
import { geometryCenter, outerRings } from '../domain/globe'
import { ZOOM_EXIT_FLAT } from '../domain/mapZoom'
import { splitByRole, isReference } from '../domain/discovery'
import { activeSources, type ActiveSource, type Basemap, type Bounds } from '../data/loadBasemaps'
import type { FlatHandoff } from './CandidateGlobe'

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

const CALLOUT_DX = 74
const CALLOUT_GAP = 46

interface CandidateFlatMapProps {
  candidates: CandidateSite[]
  chileOutline: GeoJsonFeatureCollection
  basemaps: Basemap[]
  selectedId: string
  onSelect: (siteId: string) => void
  /** Centro y zoom con que se entra desde el globo. */
  entry: FlatHandoff
  /** Pide encuadrar el sector seleccionado (cambia el número para repetir). */
  focusRequest: number
  active: boolean
  /** Píxeles tapados a la derecha por la ficha flotante. */
  rightInset: number
  onExit: (handoff: FlatHandoff) => void
  onSourcesChange: (sources: ActiveSource[]) => void
}

function candidateCollection(candidates: CandidateSite[], selectedId: string): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: candidates.map((candidate) => ({
      type: 'Feature',
      id: candidate.site_id,
      properties: { site_id: candidate.site_id, selected: candidate.site_id === selectedId },
      geometry: candidate.geometry as Geometry,
    })),
  }
}

function boundsOf(candidate: CandidateSite): LngLatBoundsLike | null {
  const points = outerRings(candidate.geometry).flat()
  if (!points.length) return null
  const lons = points.map(([lon]) => lon)
  const lats = points.map(([, lat]) => lat)
  return [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]]
}

function buildStyle(basemaps: Basemap[], outline: GeoJsonFeatureCollection, candidates: CandidateSite[], selectedId: string): StyleSpecification {
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
  const rank = { regional: 0, sector: 1, context: 2 } as const
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
      candidates: { type: 'geojson', data: candidateCollection(candidates, selectedId) },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#02070A' } },
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
      ...ordered.filter((basemap) => basemap.kind !== 'regional').map((basemap) => ({
        id: `basemap-${basemap.id}`,
        type: 'raster' as const,
        source: `basemap-${basemap.id}`,
        // Los sectores a 30 m entran gradualmente cuando su detalle supera al regional.
        paint: basemap.kind !== 'regional'
          ? { 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 7.5, 0, 8.5, 1] as unknown as number, 'raster-fade-duration': 0 }
          : { 'raster-fade-duration': 0 },
      })),
      {
        id: 'chile-outline',
        type: 'line',
        source: 'chile-outline',
        paint: { 'line-color': '#3FB4EC', 'line-opacity': 0.55, 'line-width': 1 },
      },
      {
        id: 'candidate-fill',
        type: 'fill',
        source: 'candidates',
        paint: { 'fill-color': '#FC734D', 'fill-opacity': ['case', ['get', 'selected'], 0.12, 0.05] },
      },
      {
        id: 'candidate-line',
        type: 'line',
        source: 'candidates',
        paint: {
          'line-color': ['case', ['get', 'selected'], '#FFF3DF', '#FF9A7C'],
          'line-width': ['case', ['get', 'selected'], 2.6, 1.6],
        },
      },
    ],
  }
}

/** Rótulo DOM (botón accesible) anclado al centro aproximado del polígono, como en el globo. */
function createCallout(candidate: CandidateSite, rank: number, offsetY: number, onSelect: (siteId: string) => void) {
  const root = document.createElement('div')
  root.className = `globe-callout${candidate.similarity === null ? ' insufficient' : ''}`
  const anchor = document.createElement('span')
  anchor.className = 'globe-anchor'
  anchor.setAttribute('aria-hidden', 'true')
  const leader = document.createElement('span')
  leader.className = 'globe-leader'
  leader.setAttribute('aria-hidden', 'true')
  leader.style.width = `${Math.hypot(CALLOUT_DX, offsetY)}px`
  leader.style.transform = `rotate(${Math.atan2(offsetY, CALLOUT_DX)}rad)`
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'globe-label'
  button.style.transform = `translate(${CALLOUT_DX}px, ${offsetY}px) translateY(-50%)`
  button.setAttribute('aria-label', `Seleccionar ${candidate.name}`)
  const badge = document.createElement('b')
  badge.textContent = isReference(candidate) ? 'REF' : String(rank)
  const text = document.createElement('span')
  const small = document.createElement('small')
  small.textContent = isReference(candidate) ? 'REFERENCIA' : `RANK ${rank}`
  text.append(small, candidate.similarity === null ? 'SIN SCORE' : `${formatScore(candidate.similarity)} / 100`)
  button.append(badge, text)
  button.addEventListener('click', (event) => {
    event.stopPropagation()
    onSelect(candidate.site_id)
  })
  root.append(anchor, leader, button)
  return { root, button }
}

function viewBounds(map: MapLibreMap): Bounds {
  const bounds = map.getBounds()
  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
}

export default function CandidateFlatMap({
  candidates,
  chileOutline,
  basemaps,
  selectedId,
  onSelect,
  entry,
  focusRequest,
  active,
  rightInset,
  onExit,
  onSourcesChange,
}: CandidateFlatMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const calloutsRef = useRef<Map<string, { root: HTMLDivElement; button: HTMLButtonElement }>>(new Map())
  const onlineLoaded = useRef(false)
  const onlineHlsLoaded = useRef(false)
  const exiting = useRef(false)
  // Las callbacks cambian en cada render del padre; el mapa se crea una sola vez.
  const latest = useRef({ onSelect, onExit, onSourcesChange, basemaps, active })
  latest.current = { onSelect, onExit, onSourcesChange, basemaps, active }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const map = new MapLibreMap({
      container,
      style: buildStyle(basemaps, chileOutline, candidates, selectedId),
      center: [entry.lon, entry.lat],
      zoom: entry.zoom,
      minZoom: ZOOM_EXIT_FLAT - 0.6,
      maxZoom: 14,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      renderWorldCopies: false,
    })
    map.touchZoomRotate.disableRotation()
    map.setPadding({ top: 0, bottom: 0, left: 0, right: rightInset })
    mapRef.current = map

    const reportSources = () => {
      const { basemaps: current, onSourcesChange: report } = latest.current
      report(activeSources(viewBounds(map), map.getZoom(), current, {
        blueMarble: onlineLoaded.current,
        hls: onlineHlsLoaded.current ? ONLINE_HLS_DATES : null,
      }))
    }
    map.on('sourcedata', (event) => {
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
    map.on('load', reportSources)
    map.on('moveend', () => {
      reportSources()
      if (!latest.current.active || exiting.current) return
      if (map.getZoom() < ZOOM_EXIT_FLAT) {
        exiting.current = true
        const center = map.getCenter()
        latest.current.onExit({ lon: center.lng, lat: center.lat, zoom: map.getZoom() })
      }
    })

    const ranks = new Map(splitByRole(candidates).ranked.map((candidate, index) => [candidate.site_id, index + 1]))
    const rows = candidates
      .map((candidate) => ({ candidate, anchor: geometryCenter(candidate.geometry) }))
      .filter((row): row is { candidate: CandidateSite; anchor: Position } => row.anchor !== null)
      .sort((a, b) => b.anchor[1] - a.anchor[1])
    const markers = rows.map((row, slot) => {
      const offsetY = (slot - (rows.length - 1) / 2) * CALLOUT_GAP
      const callout = createCallout(row.candidate, ranks.get(row.candidate.site_id) ?? 0, offsetY, (id) => latest.current.onSelect(id))
      calloutsRef.current.set(row.candidate.site_id, callout)
      return new Marker({ element: callout.root, anchor: 'center' }).setLngLat(row.anchor).addTo(map)
    })

    map.on('click', 'candidate-fill', (event) => {
      const id = event.features?.[0]?.properties?.site_id
      if (typeof id === 'string') latest.current.onSelect(id)
    })

    return () => {
      markers.forEach((marker) => marker.remove())
      calloutsRef.current.clear()
      map.remove()
      mapRef.current = null
    }
    // El mapa se crea una vez; los cambios posteriores se aplican en efectos dedicados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mapRef.current?.setPadding({ top: 0, bottom: 0, left: 0, right: rightInset })
  }, [rightInset])

  // Re-entrada desde el globo: salto al mismo centro/escala.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !active) return
    exiting.current = false
    map.resize()
    map.jumpTo({ center: [entry.lon, entry.lat], zoom: Math.max(entry.zoom, map.getMinZoom()) })
  }, [active, entry])

  // Selección: estilo del polígono y del rótulo.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      const source = map.getSource('candidates')
      if (source instanceof GeoJSONSource) source.setData(candidateCollection(candidates, selectedId))
    }
    if (map.isStyleLoaded()) apply()
    else map.once('load', apply)
    calloutsRef.current.forEach(({ root, button }, id) => {
      root.classList.toggle('selected', id === selectedId)
      button.setAttribute('aria-pressed', String(id === selectedId))
    })
  }, [candidates, selectedId])

  // Encuadre del sector seleccionado al pedirlo o al cambiar la selección con el mapa activo.
  // No se ejecuta al activarse: entrar con la rueda respeta el lugar al que llegó el usuario.
  // `focusRequest` empieza en 0: si al montar ya es mayor, hubo un pedido mientras el chunk cargaba.
  const lastFocus = useRef({ focusRequest: 0, selectedId })
  useEffect(() => {
    const map = mapRef.current
    const changed = lastFocus.current.focusRequest !== focusRequest || lastFocus.current.selectedId !== selectedId
    lastFocus.current = { focusRequest, selectedId }
    const candidate = candidates.find((item) => item.site_id === selectedId)
    if (!map || !changed || !latest.current.active || !candidate) return
    const bounds = boundsOf(candidate)
    if (!bounds) return
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    map.fitBounds(bounds, { padding: { top: 140, bottom: 160, left: 80, right: 220 }, maxZoom: 11.5, duration: reduced ? 0 : 1400 })
  }, [focusRequest, selectedId, candidates])

  return <div ref={containerRef} className="flat-map" role="region" aria-label="Mapa 2D con imágenes oficiales NASA" />
}
