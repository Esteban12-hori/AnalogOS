import { describe, expect, it } from 'vitest'
import { latLngToVec3 } from '../domain/globe'
import {
  altitudeForZoom,
  fitDistanceRatio,
  fitDistanceRatioForInsets,
  flatThresholds,
  globeScreenCenter,
  globeScreenRadius,
  lonLatFromDirection,
  normalizeInsets,
  zoomForAltitude,
} from '../domain/mapZoom'
import { baseStageInsets } from '../shell/stageGeometry.js'

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

describe('márgenes {top, right, bottom, left} (ADR-010)', () => {
  it('un número es el margen derecho (compatibilidad con rightInset)', () => {
    expect(normalizeInsets(520)).toEqual({ top: 0, right: 520, bottom: 0, left: 0 })
    expect(normalizeInsets({ bottom: 280 })).toEqual({ top: 0, right: 0, bottom: 280, left: 0 })
    expect(globeScreenRadius(1440, 900, 520)).toBeCloseTo(globeScreenRadius(1440, 900, { right: 520 }), 9)
    expect(flatThresholds(1440, 900, 520)).toEqual(flatThresholds(1440, 900, { right: 520 }))
  })

  it('sin márgenes verticales coincide con fitDistanceRatio(anchoLibre / alto)', () => {
    expect(fitDistanceRatioForInsets(1440, 900, { left: 384, right: 404 })).toBeCloseTo(fitDistanceRatio((1440 - 788) / 900), 9)
  })

  it('el dock y la barra achican el globo y lo centran en el área libre', () => {
    const insets = { top: 78, right: 0, bottom: 280, left: 0 }
    expect(globeScreenRadius(1440, 900, insets)).toBeLessThan(globeScreenRadius(1440, 900))
    expect(globeScreenCenter(1440, 900, insets)).toEqual({ x: 720, y: 78 + (900 - 78 - 280) / 2 })
    expect(globeScreenCenter(1440, 900, { left: 384, right: 404 }).x).toBe(384 + (1440 - 788) / 2)
  })

  it('la vista global nunca cae en 2D con los márgenes base de cada tramo', () => {
    for (const [w, h] of [[390, 844], [844, 390], [1100, 700], [1280, 720], [1440, 900], [3840, 2160]] as const) {
      const t = flatThresholds(w, h, baseStageInsets(w, h))
      expect(t.global).toBeLessThan(t.exit)
      expect(t.enter).toBeGreaterThan(t.exit)
    }
  })
})

describe('globeScreenRadius', () => {
  it('el globo cabe en el lado limitante del panel visible', () => {
    const r = globeScreenRadius(1440, 900, 520)
    expect(2 * r).toBeLessThan(Math.min(1440 - 520, 900))
    expect(2 * r).toBeGreaterThan(Math.min(1440 - 520, 900) * 0.7)
  })

  it('escala con el panel', () => {
    expect(globeScreenRadius(2880, 1800, 1040)).toBeCloseTo(2 * globeScreenRadius(1440, 900, 520), 6)
  })
})
