/**
 * Equivalencia entre la cámara del globo 3D y el nivel de zoom de un mapa Web Mercator.
 * Sirve para pasar automáticamente del globo al mapa 2D (y volver) sin saltos de escala.
 */

export const EARTH_RADIUS_M = 6_371_008.8
/** Metros por píxel en el ecuador a zoom 0 con teselas de 512 px (MapLibre). */
const METERS_PER_PIXEL_Z0 = (2 * Math.PI * EARTH_RADIUS_M) / 512

const DEG = Math.PI / 180

/** Campo de visión vertical de la cámara del globo. */
export const GLOBE_FOV_DEGREES = 40
/** El globo con atmósfera ocupa el lado corto del panel con este margen. */
const GLOBE_FIT_MARGIN = 1.12
/**
 * Cuánto puede acercarse el globo desde la vista global antes de ceder al 2D (en
 * niveles de zoom: 0,5 ≈ ×1,4). La textura 4K se ve nítida hasta ahí; más cerca se
 * pixelaría, y el mapa 2D ya tiene Blue Marble a ~500 m.
 */
const ENTER_FLAT_OVER_GLOBAL = 0.5
/** Margen de vuelta al globo, menor que el de entrada (histéresis para no oscilar). */
const EXIT_FLAT_OVER_GLOBAL = 0.2
/** Latitud de referencia para los umbrales (Atacama central). */
const THRESHOLD_LATITUDE = -24

/** Distancia cámara-centro, en radios, a la que el globo cabe completo en el panel. */
export function fitDistanceRatio(aspect: number, fovDegrees = GLOBE_FOV_DEGREES): number {
  const vertical = fovDegrees * DEG
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect)
  return GLOBE_FIT_MARGIN / Math.sin(Math.min(vertical, horizontal) / 2)
}

/** Márgenes de UI sobre el escenario (px). Un número equivale al margen derecho (compatibilidad). */
export interface ViewInsets {
  top: number
  right: number
  bottom: number
  left: number
}
export type InsetArg = number | Partial<ViewInsets>

export function normalizeInsets(insets: InsetArg = 0): ViewInsets {
  if (typeof insets === 'number') return { top: 0, right: insets, bottom: 0, left: 0 }
  return { top: insets.top ?? 0, right: insets.right ?? 0, bottom: insets.bottom ?? 0, left: insets.left ?? 0 }
}

/**
 * Como `fitDistanceRatio`, pero para el área libre entre márgenes. La cámara conserva su campo
 * de visión sobre el canvas completo (alto `height`); el área libre lo reduce en ambos ejes.
 * Sin márgenes verticales coincide con `fitDistanceRatio(anchoLibre / alto)`.
 */
export function fitDistanceRatioForInsets(width: number, height: number, insets: InsetArg = 0, fovDegrees = GLOBE_FOV_DEGREES): number {
  const { top, right, bottom, left } = normalizeInsets(insets)
  const tall = Math.max(height, 1)
  const usableWidth = Math.max(width - left - right, 1)
  const usableHeight = Math.max(height - top - bottom, 1)
  const tanHalf = Math.tan((fovDegrees * DEG) / 2)
  const vertical = 2 * Math.atan(tanHalf * (usableHeight / tall))
  const horizontal = 2 * Math.atan(tanHalf * (usableWidth / tall))
  return GLOBE_FIT_MARGIN / Math.sin(Math.min(vertical, horizontal) / 2)
}

/** Centro del área libre en píxeles CSS: ahí queda el centro del globo con setViewOffset. */
export function globeScreenCenter(width: number, height: number, insets: InsetArg = 0): { x: number; y: number } {
  const { top, right, bottom, left } = normalizeInsets(insets)
  return { x: left + Math.max(width - left - right, 1) / 2, y: top + Math.max(height - top - bottom, 1) / 2 }
}

export interface FlatThresholds {
  /** Zoom Mercator equivalente de la vista global en este panel. */
  global: number
  /** Desde este zoom el globo cede al mapa 2D. */
  enter: number
  /** Bajo este zoom el mapa 2D vuelve al globo. */
  exit: number
}

/**
 * Umbrales del paso globo ↔ mapa 2D relativos a la vista global del panel visible,
 * para que funcionen igual en una pantalla baja o en un monitor 4K.
 */
export function flatThresholds(width: number, height: number, insets: InsetArg = 0): FlatThresholds {
  const ratio = fitDistanceRatioForInsets(width, height, insets)
  // El radio es arbitrario: el zoom depende solo de altitud/radio.
  const global = zoomForAltitude(ratio - 1, 1, GLOBE_FOV_DEGREES, Math.max(height, 1), THRESHOLD_LATITUDE)
  return { global, enter: global + ENTER_FLAT_OVER_GLOBAL, exit: global + EXIT_FLAT_OVER_GLOBAL }
}


/**
 * Zoom Mercator equivalente a una cámara en perspectiva mirando al centro del globo.
 * @param altitude distancia de la cámara a la superficie, en unidades de la escena
 * @param radius radio del globo en unidades de la escena
 * @param fovDegrees campo de visión vertical
 * @param viewportHeight alto del canvas en píxeles CSS
 * @param latitude latitud del punto observado
 */
export function zoomForAltitude(
  altitude: number,
  radius: number,
  fovDegrees: number,
  viewportHeight: number,
  latitude: number,
): number {
  if (altitude <= 0 || radius <= 0 || viewportHeight <= 0) return Number.POSITIVE_INFINITY
  const visibleMeters = 2 * altitude * Math.tan((fovDegrees * DEG) / 2) * (EARTH_RADIUS_M / radius)
  const metersPerPixel = visibleMeters / viewportHeight
  return Math.log2((METERS_PER_PIXEL_Z0 * Math.cos(latitude * DEG)) / metersPerPixel)
}

/** Inversa de `zoomForAltitude`: altitud de cámara (unidades de escena) para un zoom dado. */
export function altitudeForZoom(
  zoom: number,
  radius: number,
  fovDegrees: number,
  viewportHeight: number,
  latitude: number,
): number {
  const metersPerPixel = (METERS_PER_PIXEL_Z0 * Math.cos(latitude * DEG)) / 2 ** zoom
  const visibleMeters = metersPerPixel * viewportHeight
  return (visibleMeters * (radius / EARTH_RADIUS_M)) / (2 * Math.tan((fovDegrees * DEG) / 2))
}

/** Latitud/longitud (grados) del punto de la esfera hacia el que mira la cámara desde (x, y, z). */
export function lonLatFromDirection(x: number, y: number, z: number): [number, number] {
  const length = Math.hypot(x, y, z) || 1
  const latitude = Math.asin(y / length) / DEG
  // Inversa de latLngToVec3: x = -r·sinφ·cosθ, z = r·sinφ·sinθ, θ = lon + 180°.
  let longitude = Math.atan2(z, -x) / DEG - 180
  if (longitude < -180) longitude += 360
  return [longitude, latitude]
}

/**
 * Radio en píxeles CSS del disco del globo (sin atmósfera) en la vista global.
 * Sirve para colocar el póster estático exactamente donde aparecerá el globo 3D.
 */
export function globeScreenRadius(width: number, height: number, insets: InsetArg = 0, fovDegrees = GLOBE_FOV_DEGREES): number {
  const ratio = fitDistanceRatioForInsets(width, height, insets, fovDegrees)
  const angular = Math.asin(1 / ratio)
  return (Math.tan(angular) / Math.tan((fovDegrees * DEG) / 2)) * (Math.max(height, 1) / 2)
}
