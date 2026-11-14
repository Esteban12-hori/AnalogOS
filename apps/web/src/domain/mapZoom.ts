/**
 * Equivalencia entre la cámara del globo 3D y el nivel de zoom de un mapa Web Mercator.
 * Sirve para pasar automáticamente del globo al mapa 2D (y volver) sin saltos de escala.
 */

export const EARTH_RADIUS_M = 6_371_008.8
/** Metros por píxel en el ecuador a zoom 0 con teselas de 512 px (MapLibre). */
const METERS_PER_PIXEL_Z0 = (2 * Math.PI * EARTH_RADIUS_M) / 512

/** Por encima de este zoom el globo cede al mapa 2D con imágenes oficiales. */
export const ZOOM_ENTER_FLAT = 5.6
/** Por debajo de este zoom el mapa 2D vuelve al globo (histéresis para no oscilar). */
export const ZOOM_EXIT_FLAT = 4.9

const DEG = Math.PI / 180

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
