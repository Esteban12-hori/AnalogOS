import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type KeyboardEvent, type MouseEvent, type MutableRefObject, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, OrbitControls, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { CandidateSite, GeoJsonFeatureCollection, Position } from '../../domain/contracts'
import { densifyRing, latLngToVec3, outerRings, type Vec3 } from '../../domain/globe'
import { altitudeForZoom, fitDistanceRatioForInsets, type FlatThresholds, lonLatFromDirection, type ViewInsets, zoomForAltitude } from '../../domain/mapZoom'
import { GLOBE_TEXTURES } from '../../data/preload'
import { prefersReducedMotion } from '../../shell/public'
import { planFlight, sampleFlight, type FlightPlan } from './flight'
import { cameraKeyAction, rotateCenter } from './keyboard'
import {
  applyPinFrame,
  createGlobeMarkerRuntime,
  GlobeMarkerOverlay,
  playHalos,
  pulsePin,
  setDataFlag,
  type GlobeMarkerRuntime,
  type IntroState,
} from './MarkerLayer'
import {
  assignLabels,
  buildMarkerModels,
  clusterMarkers,
  clusterSignature,
  estimateLabelWidth,
  HIDDEN_BELOW,
  horizonFacing,
  labelBudget,
  markerLabelText,
  markerVisibility,
  pinUnfocusable,
  placeNearSelection,
  ringRadius,
  RING_MIN_PX,
  type MarkerInput,
  type MarkerModel,
  type ScreenMarker,
} from './markers'
import { publishStageFrame, type StageAnchor, type StageProjection } from './stageBridge'
import { uiStore } from '../../state/ui'
import './CandidateGlobe.css'

// ============================================================================
// Visual configuration (palette with fixed meaning: selection = ice + blue)
// ============================================================================

const RADIUS = 2
const MIN_DISTANCE = RADIUS * 1.06
const MAX_DISTANCE = RADIUS * 7
/** Center of the Chile–Argentina pilot (Antofagasta and the Puna): initial viewpoint and the "Global view" viewpoint. */
const HOME: Position = [-68.6, -25]
const ATMOSPHERE_COLOR = '#3FB4EC'
const ATMOSPHERE_REST = 0.6
const FOOTPRINT_COLOR = '#3FB4EC'
const FOOTPRINT_SELECTED_COLOR = '#EAF4FA'
const FOOTPRINT_PENDING_COLOR = '#6F889A'
const ZONE_COLOR = '#94AABA'
const OUTLINE_COLOR = '#9FD9F6'
/** Margin above the 2D entry threshold so that an approach flight crosses it. */
const ENTER_MARGIN = 0.05

type ControlsRef = ComponentRef<typeof OrbitControls>
type LineObject = ComponentRef<typeof Line>

/** Framings requested by the stage. `nonce` allows the same view to be repeated. */
export type GlobeView =
  | { kind: 'global'; nonce: number }
  /** Zoom in on the selected place until handing over to the 2D map. */
  | { kind: 'close'; nonce: number }
  /** Return from the 2D map to the same center and scale (cut). */
  | { kind: 'at'; nonce: number; at: FlatHandoff }
  /** + / − buttons: half a zoom level at the current center. */
  | { kind: 'zoom'; nonce: number; delta: number }

export interface FlatHandoff {
  lon: number
  lat: number
  zoom: number
}

/** Request to center a marker (selection or "Center on ‹#1›"); `nonce` repeats it. */
export interface FlyRequest {
  id: string
  nonce: number
}

export interface StageSelection {
  id: string
  kind: 'evaluated' | 'reference'
}

interface CandidateGlobeProps {
  candidates: CandidateSite[]
  outline: GeoJsonFeatureCollection
  markerInput: MarkerInput
  selection: StageSelection | null
  hoverId: string | null
  onActivate: (model: MarkerModel) => void
  view: GlobeView
  fly: FlyRequest | null
  /** If it is `false` rendering is paused (2D view active, S2, or hidden tab). */
  active: boolean
  /** Settled UI margins: the globe is centered in the free area (setViewOffset x/y). */
  insets: ViewInsets
  /** Base margins of the section: they fix the global framing (they do not change when the rail or sheet opens). */
  baseInsets: ViewInsets
  /** Globe ↔ 2D thresholds depending on the visible panel. */
  thresholds: FlatThresholds
  /** <1100 px: smaller label budget. */
  narrow: boolean
  /** Choreography A (written by features/boot). */
  intro: IntroState
  /** Increases with each mission result: halos in the new order (choreography D). */
  resultsRevision: number
  onReady?: () => void
  onApproach?: () => void
  onDetailReady?: () => void
  onEnterFlat: (handoff: FlatHandoff) => void
  onContextLost: () => void
  /** Any user input on the camera (ui.touchCamera). */
  onCameraInput: () => void
  /** Tecla Inicio: vista global. */
  onHome: () => void
}

const toVector = ([x, y, z]: Vec3) => new THREE.Vector3(x, y, z)
const surfacePoint = ([lon, lat]: Position, scale = 1) => toVector(latLngToVec3(lat, lon, RADIUS * scale))

// ============================================================================
// Globo texturizado
// ============================================================================

/**
 * Progressive loading: the 1K texture (~60 KB) paints the globe immediately and the 2K/4K one
 * replaces it when it arrives.
 */
function Earth({ onReady, onDetailReady }: { onReady: () => void; onDetailReady?: () => void }) {
  const [previewMap, bumpMap] = useTexture([GLOBE_TEXTURES.preview, GLOBE_TEXTURES.bump])
  const material = useRef<THREE.MeshStandardMaterial>(null)
  const onDetailRef = useRef(onDetailReady)
  onDetailRef.current = onDetailReady
  const { invalidate, gl } = useThree()
  useEffect(onReady, [onReady])
  useMemo(() => {
    previewMap.colorSpace = THREE.SRGBColorSpace
    bumpMap.anisotropy = 4
  }, [previewMap, bumpMap])

  useEffect(() => {
    let disposed = false
    let full: THREE.Texture | null = null
    new THREE.TextureLoader().load(GLOBE_TEXTURES.color, (texture) => {
      if (disposed) {
        texture.dispose()
        return
      }
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
      full = texture
      if (material.current) {
        material.current.map = texture
        material.current.needsUpdate = true
        invalidate()
        requestAnimationFrame(() => onDetailRef.current?.())
      }
    })
    return () => {
      disposed = true
      full?.dispose()
    }
  }, [gl, invalidate])

  return (
    <mesh>
      <sphereGeometry args={[RADIUS, 96, 96]} />
      <meshStandardMaterial ref={material} map={previewMap} bumpMap={bumpMap} bumpScale={0.6} roughness={0.85} metalness={0} />
    </mesh>
  )
}

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const atmosphereFragment = /* glsl */ `
  uniform vec3 atmosphereColor;
  uniform float intensity;
  uniform float fresnelPower;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    float fresnel = pow(1.0 - abs(dot(vNormal, normalize(-vPosition))), fresnelPower);
    gl_FragColor = vec4(atmosphereColor, fresnel * intensity);
  }
`

function createAtmosphereMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      atmosphereColor: { value: new THREE.Color(ATMOSPHERE_COLOR) },
      intensity: { value: ATMOSPHERE_REST },
      fresnelPower: { value: 3.2 },
    },
    vertexShader: atmosphereVertex,
    fragmentShader: atmosphereFragment,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  })
}

function Atmosphere({ material }: { material: THREE.ShaderMaterial }) {
  return (
    <mesh scale={1.07}>
      <sphereGeometry args={[RADIUS, 64, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

// ============================================================================
// Outline of Chile (drawn in choreography A) and zone outlines
// ============================================================================

interface OutlineTrace {
  /** 0–1: fraction of visible segments. */
  progress: number
  lines: Map<number, { object: LineObject; segments: number }>
}

function applyTrace(trace: OutlineTrace): void {
  for (const { object, segments } of trace.lines.values()) {
    // Always `visible`: this way the outline buffers are uploaded in the first frame, together with the
    // globe (a single long task), and the stroke only limits how many segments are drawn.
    object.geometry.instanceCount = trace.progress >= 1 ? Infinity : Math.ceil(segments * trace.progress)
  }
}

function ChileOutline({ outline, trace }: { outline: GeoJsonFeatureCollection; trace: MutableRefObject<OutlineTrace> }) {
  const rings = useMemo(
    () =>
      outline.features.flatMap((feature) =>
        outerRings(feature.geometry)
          .filter((ring) => ring.length > 3)
          .map((ring) => densifyRing(ring, 0.5).map((position) => surfacePoint(position, 1.0015))),
      ),
    [outline],
  )
  return (
    <>
      {rings.map((points, index) => (
        <Line
          key={index}
          ref={(object: LineObject | null) => {
            if (!object) {
              trace.current.lines.delete(index)
              return
            }
            trace.current.lines.set(index, { object, segments: Math.max(1, points.length - 1) })
            applyTrace(trace.current)
          }}
          points={points}
          color={OUTLINE_COLOR}
          lineWidth={1}
          transparent
          opacity={0.55}
        />
      ))}
    </>
  )
}

/** Outline of a sector (polygon, never a pin) or approximate zone of a ◆ (always dashed). */
function ZoneLine({ ring, color, width, dashed }: { ring: Position[]; color: string; width: number; dashed: boolean }) {
  const { points, dash } = useMemo(() => {
    const dense = densifyRing(ring, 0.05).map((position) => surfacePoint(position, 1.0025))
    let length = 0
    for (let index = 1; index < dense.length; index += 1) length += (dense[index] as THREE.Vector3).distanceTo(dense[index - 1] as THREE.Vector3)
    return { points: dense, dash: length / 48 }
  }, [ring])
  if (points.length < 2) return null
  return <Line points={points} color={color} lineWidth={width} dashed={dashed} dashSize={dash} gapSize={dash * 0.8} />
}

// ============================================================================
// Camera: flights with formula-based duration, altitude arc, and cancellation by input
// ============================================================================

interface ActiveFlight {
  plan: FlightPlan
  start: number
  pulseId: string | null
  targetCenter: Position
  targetDistance: number
}

interface FlightTarget {
  /** Destination center; by default, the targeted center (destination of the current flight or the current one). */
  center?: Position
  /** Explicit distance (scene units). */
  distance?: number
  /** Distance of the panel's global view. */
  global?: boolean
  /** Equivalent Mercator zoom (return from 2D). */
  zoom?: number
  /** Just past the 2D threshold: the globe yields to the map on landing. */
  enterFlat?: boolean
  /** Half a zoom level, etc., relative to the targeted altitude. */
  zoomDelta?: number
}

interface CameraApi {
  flyTo(target: FlightTarget, options?: { instant?: boolean; pulseId?: string | null }): void
  /** Targeted center and distance: destination of the current flight or the current pose. */
  aim(): { center: Position; distance: number }
  /** lon/lat point of the globe under a screen point (null if it falls in space). */
  pick(clientX: number, clientY: number, rect: DOMRect): Position | null
}

interface CameraRigProps {
  apiRef: MutableRefObject<CameraApi | null>
  flightRef: MutableRefObject<ActiveFlight | null>
  controlsRef: RefObject<ControlsRef | null>
  baseInsets: ViewInsets
  thresholds: FlatThresholds
  onApproach?: () => void
  onFlightEnd: (pulseId: string | null) => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function CameraRig({ apiRef, flightRef, controlsRef, baseInsets, thresholds, onApproach, onFlightEnd }: CameraRigProps) {
  const { camera, size, invalidate } = useThree()
  const latest = useRef({ size, baseInsets, thresholds, onApproach, onFlightEnd })
  latest.current = { size, baseInsets, thresholds, onApproach, onFlightEnd }

  useEffect(() => {
    const fov = () => (camera instanceof THREE.PerspectiveCamera ? camera.fov : 40)
    const centerOf = (): Position => lonLatFromDirection(camera.position.x, camera.position.y, camera.position.z)
    const zoomAt = (distance: number, lat: number) => zoomForAltitude(distance - RADIUS, RADIUS, fov(), latest.current.size.height, lat)
    const distanceForZoom = (zoom: number, lat: number) =>
      clamp(RADIUS + altitudeForZoom(zoom, RADIUS, fov(), latest.current.size.height, lat), MIN_DISTANCE, MAX_DISTANCE)
    const raycaster = new THREE.Raycaster()
    const sphere = new THREE.Sphere(new THREE.Vector3(), RADIUS)
    const hit = new THREE.Vector3()

    const api: CameraApi = {
      aim() {
        const flight = flightRef.current
        return flight ? { center: flight.targetCenter, distance: flight.targetDistance } : { center: centerOf(), distance: camera.position.length() }
      },
      flyTo(target, options = {}) {
        const { size, baseInsets, thresholds } = latest.current
        const aim = api.aim()
        const center = target.center ?? aim.center
        let distance = aim.distance
        if (target.distance !== undefined) distance = target.distance
        else if (target.zoom !== undefined) distance = distanceForZoom(target.zoom, center[1])
        else if (target.global) distance = RADIUS * fitDistanceRatioForInsets(size.width, size.height, baseInsets, fov())
        else if (target.enterFlat) distance = distanceForZoom(thresholds.enter + ENTER_MARGIN, center[1])
        else if (target.zoomDelta !== undefined) {
          let zoom = zoomAt(aim.distance, center[1]) + target.zoomDelta
          // If the step ends up at the edge of the threshold, it is actually crossed: the globe yields to 2D on landing.
          if (target.zoomDelta > 0 && zoom >= thresholds.enter - ENTER_MARGIN) zoom = Math.max(zoom, thresholds.enter + ENTER_MARGIN)
          distance = distanceForZoom(zoom, center[1])
        }
        distance = clamp(distance, MIN_DISTANCE, MAX_DISTANCE)
        const from = camera.position
        const plan = planFlight(
          { direction: [from.x, from.y, from.z], altitude: from.length() - RADIUS },
          { direction: latLngToVec3(center[1], center[0], 1), altitude: distance - RADIUS },
          options.instant === true || prefersReducedMotion(),
        )
        // During the flight ZoomWatcher and onApproach are suspended: if the destination approaches 2D,
        // the map is instantiated right away, in parallel with the flight.
        if (zoomAt(distance, center[1]) >= thresholds.global + 0.15) latest.current.onApproach?.()
        flightRef.current = { plan, start: performance.now(), pulseId: options.pulseId ?? null, targetCenter: center, targetDistance: distance }
        invalidate()
      },
      pick(clientX, clientY, rect) {
        const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
        raycaster.setFromCamera(ndc, camera)
        if (!raycaster.ray.intersectSphere(sphere, hit)) return null
        return lonLatFromDirection(hit.x, hit.y, hit.z)
      },
    }
    apiRef.current = api
    return () => {
      if (apiRef.current === api) apiRef.current = null
    }
  }, [apiRef, flightRef, camera, invalidate])

  useFrame(() => {
    const flight = flightRef.current
    if (flight) {
      const pose = sampleFlight(flight.plan, performance.now() - flight.start)
      camera.position.set(...pose.direction).multiplyScalar(RADIUS + pose.altitude)
      camera.lookAt(0, 0, 0)
      if (pose.done) {
        flightRef.current = null
        latest.current.onFlightEnd(flight.pulseId)
      } else {
        // With frameloop="demand" the flight requests its next frame for as long as it lasts (≤1,8 s).
        invalidate()
      }
    }
    const controls = controlsRef.current
    if (controls) {
      // Rotate more slowly the closer to the surface.
      controls.rotateSpeed = THREE.MathUtils.clamp((camera.position.length() - RADIUS) / RADIUS, 0.04, 0.45)
      controls.update()
    }
  })

  return null
}

const SUN_OFFSET = new THREE.Vector3(-0.55, 0.45, 0.2)

function SunLight() {
  const light = useRef<THREE.DirectionalLight>(null)
  const offset = useMemo(() => new THREE.Vector3(), [])
  const { camera } = useThree()
  useFrame(() => {
    // The light follows the camera (from the top left) so that the observed area is lit.
    offset.copy(SUN_OFFSET).applyQuaternion(camera.quaternion).multiplyScalar(camera.position.length())
    light.current?.position.copy(camera.position).add(offset)
  })
  return <directionalLight ref={light} intensity={2.1} color="#fff6ea" />
}

/**
 * Centers the globe in the free area between margins: it shifts the camera window by half
 * the difference between opposite sides. It does not change the scale: it only translates the image.
 */
function ViewOffset({ insets }: { insets: ViewInsets }) {
  const { camera, size, invalidate } = useThree()
  const x = (insets.right - insets.left) / 2
  const y = (insets.bottom - insets.top) / 2
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    if (x !== 0 || y !== 0) camera.setViewOffset(size.width, size.height, x, y, size.width, size.height)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
    invalidate()
  }, [camera, size.width, size.height, x, y, invalidate])
  return null
}

/**
 * Notifies once when the camera exceeds the zoom for entering the 2D map. It is only armed after
 * seeing a zoom below the threshold, and it is suspended during flights (§2.2 rule 4).
 */
interface ZoomWatcherProps {
  active: boolean
  thresholds: FlatThresholds
  flightRef: MutableRefObject<ActiveFlight | null>
  onEnterFlat: (handoff: FlatHandoff) => void
  onApproach?: () => void
}

function ZoomWatcher({ active, thresholds, flightRef, onEnterFlat, onApproach }: ZoomWatcherProps) {
  const { camera, size } = useThree()
  const fired = useRef(false)
  const approached = useRef(false)
  const armed = useRef(false)
  useEffect(() => {
    fired.current = false
    armed.current = false
  }, [active])
  useFrame(() => {
    if (!active || fired.current || flightRef.current) return
    const { x, y, z } = camera.position
    const [lon, lat] = lonLatFromDirection(x, y, z)
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 40
    const zoom = zoomForAltitude(camera.position.length() - RADIUS, RADIUS, fov, size.height, lat)
    if (!approached.current && zoom >= thresholds.global + 0.15) {
      approached.current = true
      onApproach?.()
    }
    if (zoom < thresholds.enter - 0.15) {
      armed.current = true
      return
    }
    if (armed.current && zoom >= thresholds.enter) {
      fired.current = true
      onEnterFlat({ lon, lat, zoom })
    }
  })
  return null
}

// ============================================================================
// Choreography A: atmosphere glow 0,6→1→0,6 and drawing of the outline of Chile
// ============================================================================

const GLOW_MS = 900
const TRACE_DELAY_MS = 150
const TRACE_MS = 900

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

function IntroEffects({ intro, atmosphere, trace }: { intro: IntroState; atmosphere: THREE.ShaderMaterial; trace: MutableRefObject<OutlineTrace> }) {
  const { invalidate } = useThree()
  const start = useRef<number | null>(null)
  const apply = useCallback((progress: number, glow: number) => {
    const uniform = atmosphere.uniforms.intensity
    if (uniform) uniform.value = glow
    trace.current.progress = progress
    applyTrace(trace.current)
  }, [atmosphere, trace])

  useEffect(() => {
    if (intro === 'play' && !prefersReducedMotion()) {
      start.current = performance.now()
    } else {
      // pending: the outline awaits its stroke; done (or reduced motion): final state.
      start.current = null
      apply(intro === 'pending' ? 0 : 1, ATMOSPHERE_REST)
    }
    invalidate()
  }, [intro, apply, invalidate])

  useFrame(() => {
    if (start.current === null) return
    const elapsed = performance.now() - start.current
    const glow = ATMOSPHERE_REST + 0.4 * Math.sin(Math.PI * Math.min(1, elapsed / GLOW_MS))
    apply(easeOutCubic(clamp((elapsed - TRACE_DELAY_MS) / TRACE_MS, 0, 1)), glow)
    if (elapsed >= TRACE_DELAY_MS + TRACE_MS) {
      start.current = null
      apply(1, ATMOSPHERE_REST)
    } else {
      invalidate()
    }
  })
  return null
}

// ============================================================================
// Marker projector: a single useFrame for all of them (frameloop "demand")
// ============================================================================

interface MarkerProjectorProps {
  runtime: GlobeMarkerRuntime
  models: readonly MarkerModel[]
  selection: StageSelection | null
  hoverId: string | null
  narrow: boolean
  active: boolean
}

function MarkerProjector({ runtime, models, selection, hoverId, narrow, active }: MarkerProjectorProps) {
  const { camera, size, invalidate } = useThree()
  const sizeRef = useRef(size)
  sizeRef.current = size
  const items = useMemo(
    () =>
      models.map((model) => ({
        model,
        position: toVector(latLngToVec3(model.center[1], model.center[0], RADIUS * 1.003)),
        outline: (model.outline ?? []).map((position) => surfacePoint(position)),
        labelWidth: estimateLabelWidth(markerLabelText(model)),
      })),
    [models],
  )
  const state = useRef({ items, selection, hoverId, narrow, active })
  state.current = { items, selection, hoverId, narrow, active }
  const signature = useRef<string | null>(null)
  const scratch = useMemo(() => new THREE.Vector3(), [])

  const toScreen = useCallback((point: THREE.Vector3) => {
    scratch.copy(point).project(camera)
    const { width, height } = sizeRef.current
    return { x: ((scratch.x + 1) / 2) * width, y: ((1 - scratch.y) / 2) * height }
  }, [camera, scratch])

  // Live projection for the Tesla lines: reads the camera at the moment of the call.
  const projection = useMemo<StageProjection>(() => {
    const point = new THREE.Vector3()
    return {
      mode: 'globe',
      project(lon, lat) {
        point.fromArray(latLngToVec3(lat, lon, RADIUS))
        const visible = markerVisibility(horizonFacing([point.x, point.y, point.z], [camera.position.x, camera.position.y, camera.position.z], RADIUS))
        if (visible <= 0) return null
        const { x, y } = toScreen(point)
        const { width, height } = sizeRef.current
        if (x < 0 || y < 0 || x > width || y > height) return null
        return { x, y, visible }
      },
    }
  }, [camera, toScreen])

  // With frameloop "demand", any change in data, selection, or hover requests a frame.
  useEffect(() => {
    if (active) invalidate()
  }, [items, selection, hoverId, narrow, active, invalidate])
  useEffect(() => () => publishStageFrame({ projection: null, anchor: null }), [])

  useFrame(() => {
    const { items, selection, hoverId, narrow, active } = state.current
    if (!active) return
    const cameraPosition: Vec3 = [camera.position.x, camera.position.y, camera.position.z]
    const screen: ScreenMarker[] = []
    for (const { model, position, labelWidth } of items) {
      const { x, y } = toScreen(position)
      const visible = markerVisibility(horizonFacing([position.x, position.y, position.z], cameraPosition, RADIUS))
      screen.push({ id: model.id, kind: model.kind, x, y, visible, order: model.order, group: model.group, labelWidth })
    }
    const selectedId = selection?.id ?? null
    const result = clusterMarkers(screen, { exclude: [selectedId, hoverId] })
    const labels = assignLabels(screen, { budget: labelBudget(narrow), clustered: result.clustered, selectedId, hoverId })
    // Ring of each place: covers the projected polygon (or the zone of the selected ◆).
    const radii = screen.map((marker, index) => {
      const item = items[index]
      const ringed = item !== undefined && marker.visible >= HIDDEN_BELOW && item.outline.length > 0 && (item.model.kind !== 'reference' || marker.id === selectedId)
      return ringed ? ringRadius(marker, item.outline.map(toScreen)) : RING_MIN_PX
    })
    const selectedIndex = screen.findIndex((marker) => marker.id === selectedId && marker.visible >= HIDDEN_BELOW)
    const selectedScreen = screen[selectedIndex]
    const selectedRing = selectedScreen ? { x: selectedScreen.x, y: selectedScreen.y, radius: radii[selectedIndex] ?? RING_MIN_PX } : null

    // Panels that cover the stage (bar, dock, rail, sheet, HUD): what is beneath them is not focused.
    const obstacles = uiStore.getState().obstacles
    for (const cluster of result.clusters) {
      const placed = placeNearSelection(cluster, selectedRing)
      const frame = { x: placed.x, y: placed.y, opacity: cluster.visible, compact: placed.compact }
      runtime.lastCluster.set(cluster.key, frame)
      const element = runtime.clusters.get(cluster.key)
      if (element) {
        applyPinFrame(element, frame)
        const inert = pinUnfocusable(placed.x, placed.y, cluster.visible, obstacles)
        if (element.inert !== inert) element.inert = inert
      }
    }
    const nextSignature = clusterSignature(result)
    if (nextSignature !== signature.current) {
      // The list of groups is repainted only when the partition changes (not per frame).
      signature.current = nextSignature
      runtime.clusterList = result.clusters
      const keys = new Set(result.clusters.map((cluster) => cluster.key))
      for (const key of runtime.lastCluster.keys()) if (!keys.has(key)) runtime.lastCluster.delete(key)
      runtime.setClusters?.(result.clusters)
    }

    let anchor: StageAnchor | null = null
    for (let index = 0; index < screen.length; index += 1) {
      const marker = screen[index] as ScreenMarker
      const item = items[index]
      if (!item) continue
      const hidden = marker.visible < HIDDEN_BELOW
      const clustered = result.clustered.has(marker.id)
      const radius = radii[index] ?? RING_MIN_PX
      const frame = { x: marker.x, y: marker.y, opacity: marker.visible }
      runtime.lastPin.set(marker.id, frame)
      const element = runtime.pins.get(marker.id)
      if (element) {
        applyPinFrame(element, frame)
        setDataFlag(element, 'hidden', hidden)
        setDataFlag(element, 'clustered', clustered)
        setDataFlag(element, 'label', labels.has(marker.id))
        // Hidden, grouped, almost on the horizon, or covered by a panel: outside the focus order.
        const inert = hidden || clustered || pinUnfocusable(marker.x, marker.y, marker.visible, obstacles)
        if (element.inert !== inert) element.inert = inert
        const ring = `${radius.toFixed(1)}px`
        if (element.style.getPropertyValue('--ring-r') !== ring) element.style.setProperty('--ring-r', ring)
      }
      if (marker.id === selectedId && selection?.kind === 'evaluated' && !hidden) {
        anchor = { siteId: marker.id, x: marker.x, y: marker.y, radius, visible: marker.visible, mode: 'globe' }
      }
    }
    publishStageFrame({ projection, anchor })
  })
  return null
}

/** Delivers `invalidate` from the Canvas to the DOM layer, which lives outside it. */
function RuntimeBinder({ runtime }: { runtime: GlobeMarkerRuntime }) {
  const { invalidate } = useThree()
  useEffect(() => {
    runtime.invalidate = invalidate
    return () => {
      runtime.invalidate = null
    }
  }, [runtime, invalidate])
  return null
}

// ============================================================================
// Componente principal
// ============================================================================

/** If the intro does not start within this time after the globe is ready, the final state is shown. */
const INTRO_PENDING_LIMIT_MS = 1500

export default function CandidateGlobe({
  candidates,
  outline,
  markerInput,
  selection,
  hoverId,
  onActivate,
  view,
  fly,
  active,
  insets,
  baseInsets,
  thresholds,
  narrow,
  intro,
  resultsRevision,
  onReady,
  onApproach,
  onDetailReady,
  onEnterFlat,
  onContextLost,
  onCameraInput,
  onHome,
}: CandidateGlobeProps) {
  const controlsRef = useRef<ControlsRef | null>(null)
  const apiRef = useRef<CameraApi | null>(null)
  const flightRef = useRef<ActiveFlight | null>(null)
  const runtime = useMemo(createGlobeMarkerRuntime, [])
  const trace = useRef<OutlineTrace>({ progress: intro === 'pending' ? 0 : 1, lines: new Map() })
  const atmosphere = useMemo(createAtmosphereMaterial, [])
  useEffect(() => () => atmosphere.dispose(), [atmosphere])
  const [ready, setReady] = useState(false)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady
  const markReady = useMemo(() => () => {
    setReady(true)
    onReadyRef.current?.()
  }, [])

  // The intro is written by boot; if it never gets past "pending", the data is not hidden forever.
  const [pendingExpired, setPendingExpired] = useState(false)
  useEffect(() => {
    if (!ready || intro !== 'pending') return
    const timer = window.setTimeout(() => setPendingExpired(true), INTRO_PENDING_LIMIT_MS)
    return () => window.clearTimeout(timer)
  }, [ready, intro])
  const effectiveIntro: IntroState = intro === 'pending' && pendingExpired ? 'done' : intro

  const models = useMemo(() => buildMarkerModels(markerInput), [markerInput])
  const byId = useMemo(() => new Map(models.map((model) => [model.id, model])), [models])
  const modelsRef = useRef(byId)
  modelsRef.current = byId

  const selectedSector = selection?.kind === 'evaluated' ? selection.id : null
  const selectedZone = selection?.kind === 'reference' ? byId.get(selection.id)?.outline ?? null : null
  const footprints = useMemo(
    () => candidates.map((candidate) => ({ id: candidate.site_id, rings: outerRings(candidate.geometry), pending: candidate.similarity === null })),
    [candidates],
  )

  // ---- Framings requested by the stage ----------------------------------------------------
  const onFlightEnd = useCallback((pulseId: string | null) => {
    const element = pulseId ? runtime.pins.get(pulseId) : undefined
    if (element && !prefersReducedMotion()) pulsePin(element)
  }, [runtime])

  const lastView = useRef(view.nonce)
  useEffect(() => {
    if (view.nonce === lastView.current) return
    lastView.current = view.nonce
    const api = apiRef.current
    if (!api) return
    if (view.kind === 'global') api.flyTo({ center: HOME, global: true })
    else if (view.kind === 'at') api.flyTo({ center: [view.at.lon, view.at.lat], zoom: view.at.zoom }, { instant: true })
    else if (view.kind === 'zoom') api.flyTo({ zoomDelta: view.delta })
    else {
      const target = selection ? modelsRef.current.get(selection.id)?.center : undefined
      api.flyTo({ center: target ?? api.aim().center, enterFlat: true })
    }
    // Reacts only to new requests (nonce).
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  const lastFly = useRef(fly?.nonce ?? 0)
  useEffect(() => {
    if (!fly || fly.nonce === lastFly.current) return
    lastFly.current = fly.nonce
    const model = modelsRef.current.get(fly.id)
    if (!active || !model) return
    apiRef.current?.flyTo({ center: model.center }, { pulseId: model.id })
  }, [fly, active])

  // ---- Choreography D: halos in the new order, every 120 ms --------------------------------------
  const lastRevision = useRef(resultsRevision)
  useEffect(() => {
    if (resultsRevision === lastRevision.current) return
    lastRevision.current = resultsRevision
    if (!active || prefersReducedMotion()) return
    playHalos(runtime.pins, models.filter((model) => model.kind === 'evaluated' && model.rank !== null).map((model) => model.id), 120)
  }, [resultsRevision, models, active, runtime])

  // ---- Direct input: any gesture cancels the flight and counts as "touched the camera" -------------
  const onControlsStart = () => {
    flightRef.current = null
    onCameraInput()
  }

  // ---- Keyboard and double click -----------------------------------------------------------------
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const action = cameraKeyAction(event.key, event.shiftKey)
    const api = apiRef.current
    if (!action || !api) return
    event.preventDefault()
    onCameraInput()
    if (action.kind === 'home') onHome()
    else if (action.kind === 'zoom') api.flyTo({ zoomDelta: action.delta })
    else api.flyTo({ center: rotateCenter(api.aim().center, action.dLon, action.dLat) })
  }
  const onDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    const api = apiRef.current
    const point = api?.pick(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())
    if (!api || !point) return
    onCameraInput()
    api.flyTo({ center: point, zoomDelta: 0.5 })
  }

  // The camera is born already in the panel's global framing: no initial animation (the poster matches).
  const [initialPosition] = useState(() => {
    const width = typeof window === 'undefined' ? 1600 : window.innerWidth
    const height = typeof window === 'undefined' ? 1000 : window.innerHeight
    const distance = THREE.MathUtils.clamp(RADIUS * fitDistanceRatioForInsets(width, height, baseInsets), MIN_DISTANCE, MAX_DISTANCE)
    return latLngToVec3(HOME[1], HOME[0], distance)
  })

  return (
    <>
      <div
        className="globe-surface"
        tabIndex={0}
        role="application"
        aria-roledescription="3D globe"
        aria-label={`Earth globe with ${candidates.length} evaluated sectors. Arrows: rotate 10°, with Shift 30°. Plus and minus: zoom in or out. Home: global view.`}
        onKeyDown={onKeyDown}
        onDoubleClick={onDoubleClick}
      >
        <Canvas
          className="globe-canvas"
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          dpr={[1, 1.5]}
          // On-demand drawing: without interaction or animation there is no redraw (0 draws at rest).
          frameloop={active ? 'demand' : 'never'}
          camera={{ fov: 40, near: 0.01, far: 100, position: initialPosition }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', onContextLost, { once: true })
          }}
        >
          <ambientLight intensity={0.55} />
          <SunLight />
          {/* Null fallback: a drei <Html> as a fallback fails when removed with React 19. */}
          <Suspense fallback={null}>
            <Earth onReady={markReady} onDetailReady={onDetailReady} />
            <ChileOutline outline={outline} trace={trace} />
            {footprints.map(({ id, rings, pending }) =>
              rings.map((ring, index) => (
                <ZoneLine
                  key={`${id}-${index}`}
                  ring={ring}
                  color={id === selectedSector ? FOOTPRINT_SELECTED_COLOR : pending ? FOOTPRINT_PENDING_COLOR : FOOTPRINT_COLOR}
                  width={id === selectedSector ? 2.4 : 1.4}
                  dashed={pending}
                />
              )),
            )}
            {selectedZone && <ZoneLine key={selection?.id} ring={selectedZone} color={ZONE_COLOR} width={1.6} dashed />}
          </Suspense>
          <Atmosphere material={atmosphere} />
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enablePan={false}
            enableZoom
            minDistance={MIN_DISTANCE}
            maxDistance={MAX_DISTANCE}
            enableDamping
            dampingFactor={0.1}
            onStart={onControlsStart}
          />
          <CameraRig
            apiRef={apiRef}
            flightRef={flightRef}
            controlsRef={controlsRef}
            baseInsets={baseInsets}
            thresholds={thresholds}
            onApproach={onApproach}
            onFlightEnd={onFlightEnd}
          />
          <ViewOffset insets={insets} />
          <ZoomWatcher active={active} thresholds={thresholds} flightRef={flightRef} onEnterFlat={onEnterFlat} onApproach={onApproach} />
          <IntroEffects intro={effectiveIntro} atmosphere={atmosphere} trace={trace} />
          {/* After the camera: markers are projected using the frame's final pose. */}
          <MarkerProjector runtime={runtime} models={models} selection={selection} hoverId={hoverId} narrow={narrow} active={active} />
          <RuntimeBinder runtime={runtime} />
        </Canvas>
      </div>
      {ready && (
        <GlobeMarkerOverlay runtime={runtime} models={models} selectedId={selection?.id ?? null} hoverId={hoverId} intro={effectiveIntro} onActivate={onActivate} />
      )}
      {!ready && (
        <div className="globe-loading globe-loading-page">
          <span className="loader" aria-hidden="true" />
          Loading local textures…
        </div>
      )}
    </>
  )
}
