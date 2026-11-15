/**
 * Equivalence between the 3D globe camera and the zoom level of a Web Mercator map.
 * It is used to switch automatically from the globe to the 2D map (and back) without scale jumps.
 */

export const EARTH_RADIUS_M = 6_371_008.8
/** Meters per pixel at the equator at zoom 0 with 512 px tiles (MapLibre). */
const METERS_PER_PIXEL_Z0 = (2 * Math.PI * EARTH_RADIUS_M) / 512

const DEG = Math.PI / 180

/** Vertical field of view of the globe camera. */
export const GLOBE_FOV_DEGREES = 40
/** The globe with atmosphere takes up the short side of the panel with this margin. */
const GLOBE_FIT_MARGIN = 1.12
/**
 * How far the globe can zoom in from the global view before yielding to 2D (in
 * zoom levels: 0,5 ≈ ×1,4). The 4K texture looks sharp up to that point; any closer it would
 * pixelate, and the 2D map already has Blue Marble at ~500 m.
 */
const ENTER_FLAT_OVER_GLOBAL = 0.5
/** Margin for returning to the globe, smaller than the entry margin (hysteresis to avoid oscillation). */
const EXIT_FLAT_OVER_GLOBAL = 0.2
/** Reference latitude for the thresholds (central Atacama). */
const THRESHOLD_LATITUDE = -24

/** Camera-to-center distance, in radii, at which the whole globe fits in the panel. */
export function fitDistanceRatio(aspect: number, fovDegrees = GLOBE_FOV_DEGREES): number {
  const vertical = fovDegrees * DEG
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect)
  return GLOBE_FIT_MARGIN / Math.sin(Math.min(vertical, horizontal) / 2)
}

/** UI margins over the stage (px). A number is equivalent to the right margin (compatibility). */
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
 * Like `fitDistanceRatio`, but for the free area between margins. The camera keeps its field
 * of view over the full canvas (height `height`); the free area reduces it on both axes.
 * Without vertical margins it matches `fitDistanceRatio(anchoLibre / alto)`.
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

/** Center of the free area in CSS pixels: that is where the center of the globe ends up with setViewOffset. */
export function globeScreenCenter(width: number, height: number, insets: InsetArg = 0): { x: number; y: number } {
  const { top, right, bottom, left } = normalizeInsets(insets)
  return { x: left + Math.max(width - left - right, 1) / 2, y: top + Math.max(height - top - bottom, 1) / 2 }
}

export interface FlatThresholds {
  /** Equivalent Mercator zoom of the global view in this panel. */
  global: number
  /** From this zoom level the globe yields to the 2D map. */
  enter: number
  /** Below this zoom level the 2D map returns to the globe. */
  exit: number
}

/**
 * Thresholds for the globe ↔ 2D map transition relative to the global view of the visible panel,
 * so that they work the same on a short screen or on a 4K monitor.
 */
export function flatThresholds(width: number, height: number, insets: InsetArg = 0): FlatThresholds {
  const ratio = fitDistanceRatioForInsets(width, height, insets)
  // The radius is arbitrary: zoom depends only on altitude/radius.
  const global = zoomForAltitude(ratio - 1, 1, GLOBE_FOV_DEGREES, Math.max(height, 1), THRESHOLD_LATITUDE)
  return { global, enter: global + ENTER_FLAT_OVER_GLOBAL, exit: global + EXIT_FLAT_OVER_GLOBAL }
}


/**
 * Mercator zoom equivalent to a perspective camera looking at the center of the globe.
 * @param altitude camera distance to the surface, in scene units
 * @param radius globe radius in scene units
 * @param fovDegrees vertical field of view
 * @param viewportHeight canvas height in CSS pixels
 * @param latitude latitude of the observed point
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

/** Inverse of `zoomForAltitude`: camera altitude (scene units) for a given zoom. */
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

/** Latitude/longitude (degrees) of the point on the sphere the camera is looking at from (x, y, z). */
export function lonLatFromDirection(x: number, y: number, z: number): [number, number] {
  const length = Math.hypot(x, y, z) || 1
  const latitude = Math.asin(y / length) / DEG
  // Inverse of latLngToVec3: x = -r·sinφ·cosθ, z = r·sinφ·sinθ, θ = lon + 180°.
  let longitude = Math.atan2(z, -x) / DEG - 180
  if (longitude < -180) longitude += 360
  return [longitude, latitude]
}

/**
 * Radius in CSS pixels of the globe disk (without atmosphere) in the global view.
 * It is used to place the static poster exactly where the 3D globe will appear.
 */
export function globeScreenRadius(width: number, height: number, insets: InsetArg = 0, fovDegrees = GLOBE_FOV_DEGREES): number {
  const ratio = fitDistanceRatioForInsets(width, height, insets, fovDegrees)
  const angular = Math.asin(1 / ratio)
  return (Math.tan(angular) / Math.tan((fovDegrees * DEG) / 2)) * (Math.max(height, 1) / 2)
}
