import { describe, expect, it } from 'vitest'
import { latLngToVec3 } from '../domain/globe'
import { altitudeForZoom, lonLatFromDirection, ZOOM_ENTER_FLAT, ZOOM_EXIT_FLAT, zoomForAltitude } from '../domain/mapZoom'

describe('zoomForAltitude / altitudeForZoom', () => {
  it('son inversas entre sí', () => {
    for (const zoom of [3, 5.6, 9, 13]) {
      const altitude = altitudeForZoom(zoom, 2, 40, 900, -24)
      expect(zoomForAltitude(altitude, 2, 40, 900, -24)).toBeCloseTo(zoom, 6)
    }
  })

  it('acercar la cámara aumenta el zoom y un viewport más alto también', () => {
    expect(zoomForAltitude(0.1, 2, 40, 900, -24)).toBeGreaterThan(zoomForAltitude(1, 2, 40, 900, -24))
    expect(zoomForAltitude(1, 2, 40, 1200, -24)).toBeGreaterThan(zoomForAltitude(1, 2, 40, 600, -24))
  })

  it('una altitud nula o negativa equivale a zoom infinito', () => {
    expect(zoomForAltitude(0, 2, 40, 900, 0)).toBe(Number.POSITIVE_INFINITY)
  })

  it('tiene histéresis: se entra al 2D a un zoom mayor del que se sale', () => {
    expect(ZOOM_ENTER_FLAT).toBeGreaterThan(ZOOM_EXIT_FLAT)
  })
})

describe('lonLatFromDirection', () => {
  it('invierte latLngToVec3', () => {
    for (const [lat, lon] of [[-24, -69.5], [0, 0], [45, 120], [-60, 179]] as const) {
      const [x, y, z] = latLngToVec3(lat, lon, 3)
      const [longitude, latitude] = lonLatFromDirection(x, y, z)
      expect(latitude).toBeCloseTo(lat, 6)
      expect(longitude).toBeCloseTo(lon, 6)
    }
  })
})
