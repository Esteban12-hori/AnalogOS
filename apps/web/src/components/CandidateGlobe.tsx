import { Suspense, useEffect, useMemo, useRef, useState, type ComponentRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, Line, OrbitControls, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import type { CandidateSite, GeoJsonFeatureCollection, Position } from '../domain/contracts'
import { formatScore } from '../domain/formatting'
import { densifyRing, facingFactor, geometryCenter, latLngToVec3, outerRings, type Vec3 } from '../domain/globe'
import { altitudeForZoom, lonLatFromDirection, ZOOM_ENTER_FLAT, zoomForAltitude } from '../domain/mapZoom'
import { rankCandidates } from '../domain/scoring'
import earthTextureUrl from '../assets/globe/earth-blue-marble.jpg'
import earthBumpUrl from '../assets/globe/earth-topology.png'

// ============================================================================
// Configuración visual (inspirada en Globe3D; adaptada a la paleta de la app)
// ============================================================================

const RADIUS = 2
const GLOBAL_DISTANCE = RADIUS * 3.3
const CLOSE_DISTANCE = RADIUS * 1.22
const MIN_DISTANCE = RADIUS * 1.06
const MAX_DISTANCE = RADIUS * 7
/** Atacama central: punto de vista inicial. */
const HOME: Position = [-69.5, -24]
const ATMOSPHERE_COLOR = '#3FB4EC'
const FOOTPRINT_COLOR = '#3FB4EC'
const FOOTPRINT_SELECTED_COLOR = '#FC734D'
const OUTLINE_COLOR = '#9FD9F6'
const CALLOUT_DX = 74
const CALLOUT_GAP = 46

type ControlsRef = ComponentRef<typeof OrbitControls>

/** `nonce` permite repetir la misma vista después de que el usuario giró el globo. */
export interface GlobeView {
  /** `at`: volver desde el mapa 2D al mismo centro y escala. */
  kind: 'global' | 'close' | 'at'
  nonce: number
  at?: { lon: number; lat: number; zoom: number }
}

export interface FlatHandoff {
  lon: number
  lat: number
  zoom: number
}

interface CandidateGlobeProps {
  candidates: CandidateSite[]
  chileOutline: GeoJsonFeatureCollection
  selectedId: string
  onSelect: (siteId: string) => void
  view: GlobeView
  /** Si es `false` el render se pausa (vista 2D activa). */
  active: boolean
  /** Píxeles tapados a la derecha por la ficha; el globo se centra en el espacio restante. */
  rightInset: number
  /** La cámara cruzó el umbral de zoom: el globo cede al mapa 2D. */
  onEnterFlat: (handoff: FlatHandoff) => void
  /** Se invoca si el contexto WebGL se pierde, para volver al mapa SVG. */
  onContextLost: () => void
}

const toVector = ([x, y, z]: Vec3) => new THREE.Vector3(x, y, z)
const surfacePoint = ([lon, lat]: Position, scale = 1) => toVector(latLngToVec3(lat, lon, RADIUS * scale))

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

// ============================================================================
// Globo texturizado
// ============================================================================

function Earth({ onReady }: { onReady: () => void }) {
  const [colorMap, bumpMap] = useTexture([earthTextureUrl, earthBumpUrl])
  useEffect(onReady, [onReady])
  useMemo(() => {
    colorMap.colorSpace = THREE.SRGBColorSpace
    colorMap.anisotropy = 8
    bumpMap.anisotropy = 4
  }, [colorMap, bumpMap])

  return (
    <mesh>
      <sphereGeometry args={[RADIUS, 96, 96]} />
      <meshStandardMaterial map={colorMap} bumpMap={bumpMap} bumpScale={0.6} roughness={0.85} metalness={0} />
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

function Atmosphere() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          atmosphereColor: { value: new THREE.Color(ATMOSPHERE_COLOR) },
          intensity: { value: 0.6 },
          fresnelPower: { value: 3.2 },
        },
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  return (
    <mesh scale={1.07}>
      <sphereGeometry args={[RADIUS, 64, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

// ============================================================================
// Contorno de Chile y huellas de candidatos (polígonos, nunca pins exactos)
// ============================================================================

function ChileOutline({ outline }: { outline: GeoJsonFeatureCollection }) {
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
          <Line key={index} points={points} color={OUTLINE_COLOR} lineWidth={1} transparent opacity={0.55} />
        ))}
    </>
  )
}

function Footprint({ candidate, selected }: { candidate: CandidateSite; selected: boolean }) {
  const rings = useMemo(
    () =>
      outerRings(candidate.geometry).map((ring) =>
        densifyRing(ring, 0.05).map((position) => surfacePoint(position, 1.0025)),
      ),
    [candidate.geometry],
  )
  return (
    <>
      {rings.map((points, index) => (
        <Line
          key={index}
          points={points}
          color={selected ? FOOTPRINT_SELECTED_COLOR : FOOTPRINT_COLOR}
          lineWidth={selected ? 2.4 : 1.6}
        />
      ))}
    </>
  )
}

interface CalloutProps {
  candidate: CandidateSite
  rank: number
  anchor: Position
  offsetY: number
  selected: boolean
  onSelect: (siteId: string) => void
}

/**
 * Rótulo DOM anclado al centro aproximado del polígono. Es un <button> real
 * (foco, teclado, lector de pantalla). Se oculta cuando la zona queda detrás del globo.
 */
function Callout({ candidate, rank, anchor, offsetY, selected, onSelect }: CalloutProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const hiddenRef = useRef(false)
  const position = useMemo(() => latLngToVec3(anchor[1], anchor[0], RADIUS * 1.003), [anchor])
  const { camera } = useThree()

  useFrame(() => {
    const element = wrapperRef.current
    if (!element) return
    const hidden = facingFactor(position, [camera.position.x, camera.position.y, camera.position.z]) < 0.15
    if (hidden === hiddenRef.current) return
    hiddenRef.current = hidden
    element.classList.toggle('is-hidden', hidden)
    element.toggleAttribute('inert', hidden)
  })

  const insufficient = candidate.similarity === null
  const length = Math.hypot(CALLOUT_DX, offsetY)
  const angle = Math.atan2(offsetY, CALLOUT_DX)

  return (
    <Html position={position} zIndexRange={[2, 0]} wrapperClass="globe-callout-host">
      <div
        ref={wrapperRef}
        className={`globe-callout${selected ? ' selected' : ''}${insufficient ? ' insufficient' : ''}`}
      >
        <span className="globe-anchor" aria-hidden="true" />
        <span
          className="globe-leader"
          aria-hidden="true"
          style={{ width: `${length}px`, transform: `rotate(${angle}rad)` }}
        />
        <button
          type="button"
          className="globe-label"
          style={{ transform: `translate(${CALLOUT_DX}px, ${offsetY}px) translateY(-50%)` }}
          aria-pressed={selected}
          aria-label={`Seleccionar ${candidate.name}`}
          onClick={() => onSelect(candidate.site_id)}
        >
          <b>{rank}</b>
          <span>
            <small>RANK {rank}</small>
            {insufficient ? 'SIN SCORE' : `${formatScore(candidate.similarity)} / 100`}
          </span>
        </button>
      </div>
    </Html>
  )
}

// ============================================================================
// Cámara: enfoca la zona seleccionada y la vista pedida, sin pelear con el usuario
// ============================================================================

interface CameraRigProps {
  focus: Position
  distance: number
  zoom?: number
  nonce: number
  inset: number
  controlsRef: RefObject<ControlsRef | null>
}

/** Distancia a la que el globo (con atmósfera) cabe completo en el lado más corto del canvas. */
function fitDistance(verticalFovDegrees: number, aspect: number): number {
  const vertical = THREE.MathUtils.degToRad(verticalFovDegrees)
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect)
  return (RADIUS * 1.12) / Math.sin(Math.min(vertical, horizontal) / 2)
}

function CameraRig({ focus, distance: requestedDistance, zoom, nonce, inset, controlsRef }: CameraRigProps) {
  const { camera, size } = useThree()
  const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 40
  // `zoom` (vuelta desde el 2D) manda; `0` significa "vista global" según el aspecto real del panel.
  const distance = zoom !== undefined
    ? THREE.MathUtils.clamp(RADIUS + altitudeForZoom(zoom, RADIUS, fov, size.height, focus[1]), MIN_DISTANCE, MAX_DISTANCE)
    : requestedDistance > 0
      ? requestedDistance
      : THREE.MathUtils.clamp(fitDistance(fov, Math.max(size.width - inset, 1) / Math.max(size.height, 1)), MIN_DISTANCE, MAX_DISTANCE)
  const instant = zoom !== undefined
  const goal = useRef<{ direction: THREE.Vector3; distance: number } | null>(null)
  const [lon, lat] = focus

  useEffect(() => {
    goal.current = { direction: toVector(latLngToVec3(lat, lon, 1)).normalize(), distance }
    if (instant || prefersReducedMotion()) {
      camera.position.copy(goal.current.direction.clone().multiplyScalar(distance))
      camera.lookAt(0, 0, 0)
      goal.current = null
    }
  }, [lat, lon, distance, nonce, camera, instant])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    const cancel = () => {
      goal.current = null
    }
    controls.addEventListener('start', cancel)
    return () => controls.removeEventListener('start', cancel)
  }, [controlsRef])

  useFrame((_, delta) => {
    const controls = controlsRef.current
    const target = goal.current
    if (target) {
      const t = 1 - Math.exp(-delta * 3.2)
      const currentDistance = camera.position.length()
      const direction = camera.position.clone().normalize().lerp(target.direction, t).normalize()
      const nextDistance = THREE.MathUtils.lerp(currentDistance, target.distance, t)
      camera.position.copy(direction.multiplyScalar(nextDistance))
      camera.lookAt(0, 0, 0)
      if (
        camera.position.clone().normalize().angleTo(target.direction) < 0.0015 &&
        Math.abs(nextDistance - target.distance) < 0.01
      ) {
        goal.current = null
      }
    }
    if (controls) {
      // Rotar más lento cuanto más cerca de la superficie.
      controls.rotateSpeed = THREE.MathUtils.clamp((camera.position.length() - RADIUS) / RADIUS, 0.04, 0.45)
      controls.update()
    }
  })

  return null
}

function SunLight() {
  const light = useRef<THREE.DirectionalLight>(null)
  const { camera } = useThree()
  useFrame(() => {
    // La luz acompaña a la cámara (desde arriba a la izquierda) para que la zona observada esté iluminada.
    const offset = new THREE.Vector3(-0.55, 0.45, 0.2).applyQuaternion(camera.quaternion)
    light.current?.position.copy(camera.position).add(offset.multiplyScalar(camera.position.length()))
  })
  return <directionalLight ref={light} intensity={2.1} color="#fff6ea" />
}

/** Desplaza el encuadre a la izquierda la mitad de lo que tapa la ficha flotante. */
function ViewOffset({ inset }: { inset: number }) {
  const { camera, size } = useThree()
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    if (inset > 0) camera.setViewOffset(size.width, size.height, inset / 2, 0, size.width, size.height)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
  }, [camera, size.width, size.height, inset])
  return null
}

/** Avisa una vez cuando la cámara supera el zoom de entrada al mapa 2D. */
function ZoomWatcher({ active, onEnterFlat }: { active: boolean; onEnterFlat: (handoff: FlatHandoff) => void }) {
  const { camera, size } = useThree()
  const fired = useRef(false)
  useEffect(() => {
    fired.current = false
  }, [active])
  useFrame(() => {
    if (!active || fired.current) return
    const { x, y, z } = camera.position
    const [lon, lat] = lonLatFromDirection(x, y, z)
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 40
    const zoom = zoomForAltitude(camera.position.length() - RADIUS, RADIUS, fov, size.height, lat)
    if (zoom >= ZOOM_ENTER_FLAT) {
      fired.current = true
      onEnterFlat({ lon, lat, zoom })
    }
  })
  return null
}

// ============================================================================
// Componente principal
// ============================================================================

export default function CandidateGlobe({
  candidates,
  chileOutline,
  selectedId,
  onSelect,
  view,
  active,
  rightInset,
  onEnterFlat,
  onContextLost,
}: CandidateGlobeProps) {
  const controlsRef = useRef<ControlsRef | null>(null)
  const [ready, setReady] = useState(false)
  const markReady = useMemo(() => () => setReady(true), [])

  const callouts = useMemo(() => {
    const ranks = new Map(rankCandidates(candidates).map((candidate, index) => [candidate.site_id, index + 1]))
    const rows = candidates
      .map((candidate) => ({ candidate, rank: ranks.get(candidate.site_id) ?? 0, anchor: geometryCenter(candidate.geometry) }))
      .filter((row): row is typeof row & { anchor: Position } => row.anchor !== null)
      // De norte a sur para que las líneas guía no se crucen.
      .sort((a, b) => b.anchor[1] - a.anchor[1])
    return rows.map((row, slot) => ({ ...row, offsetY: (slot - (rows.length - 1) / 2) * CALLOUT_GAP }))
  }, [candidates])

  const selectedAnchor = callouts.find((row) => row.candidate.site_id === selectedId)?.anchor ?? HOME
  const focus: Position = view.kind === 'at' && view.at ? [view.at.lon, view.at.lat] : view.kind === 'close' ? selectedAnchor : HOME
  const distance = view.kind === 'close' ? CLOSE_DISTANCE : 0
  const initialPosition = latLngToVec3(HOME[1], HOME[0], GLOBAL_DISTANCE)

  return (
    <>
    <Canvas
      className="globe-canvas"
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      frameloop={active ? 'always' : 'never'}
      camera={{ fov: 40, near: 0.01, far: 100, position: initialPosition }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', onContextLost, { once: true })
      }}
      aria-label={`Globo terrestre 3D con ${candidates.length} zonas candidatas en Chile`}
    >
      <ambientLight intensity={0.55} />
      <SunLight />
      {/* Fallback nulo: un <Html> de drei como fallback falla al retirarse con React 19. */}
      <Suspense fallback={null}>
        <Earth onReady={markReady} />
        <ChileOutline outline={chileOutline} />
        {callouts.map((row) => (
          <Footprint key={row.candidate.site_id} candidate={row.candidate} selected={row.candidate.site_id === selectedId} />
        ))}
        {callouts.map((row) => (
          <Callout
            key={row.candidate.site_id}
            candidate={row.candidate}
            rank={row.rank}
            anchor={row.anchor}
            offsetY={row.offsetY}
            selected={row.candidate.site_id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </Suspense>
      <Atmosphere />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableZoom
        minDistance={MIN_DISTANCE}
        maxDistance={MAX_DISTANCE}
        enableDamping
        dampingFactor={0.1}
      />
      <CameraRig
        focus={focus}
        distance={distance}
        zoom={view.kind === 'at' ? view.at?.zoom : undefined}
        nonce={view.nonce}
        inset={rightInset}
        controlsRef={controlsRef}
      />
      <ViewOffset inset={rightInset} />
      <ZoomWatcher active={active} onEnterFlat={onEnterFlat} />
    </Canvas>
    {!ready && (
      <div className="globe-loading globe-loading-page" role="status">
        <span className="loader" />
        Cargando texturas locales…
      </div>
    )}
    </>
  )
}
