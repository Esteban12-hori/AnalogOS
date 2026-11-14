import { describe, expect, it } from 'vitest'
import { latLngToVec3 } from '../domain/globe'
import { altitudeForZoom, fitDistanceRatio, flatThresholds, lonLatFromDirection, zoomForAltitude } from '../domain/mapZoom'

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

})

describe('flatThresholds', () => {
  it('tiene histéresis y ambos umbrales están por encima de la vista global', () => {
    const t = flatThresholds(1440, 900, 520)
    expect(t.enter).toBeGreaterThan(t.exit)
    expect(t.exit).toBeGreaterThan(t.global)
  })

  it('la vista global no cae en 2D en ninguna pantalla habitual', () => {
    for (const [w, h, inset] of [[390, 844, 0], [1280, 720, 520], [1440, 900, 520], [2560, 1440, 520], [3840, 2160, 520]]) {
      const t = flatThresholds(w, h, inset)
      expect(t.global).toBeLessThan(t.exit)
    }
  })

  it('una pantalla más alta tiene la vista global a mayor zoom', () => {
    expect(flatThresholds(1440, 1400).global).toBeGreaterThan(flatThresholds(1440, 900).global)
  })

  it('fitDistanceRatio usa el lado limitante del panel', () => {
    expect(fitDistanceRatio(0.5)).toBeGreaterThan(fitDistanceRatio(1.6))
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
