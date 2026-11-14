import { describe, expect, it } from 'vitest'
import { posterLayout } from '../boot/posterLayout.js'
import { globeScreenCenter, globeScreenRadius } from '../domain/mapZoom'
import { baseStageInsets } from '../shell/stageGeometry.js'

describe('posición del póster previo a React', () => {
  it('coincide al píxel con el globo 3D en el área libre base (móvil, laptop y monitores grandes)', () => {
    for (const [w, h] of [[390, 844], [844, 390], [1024, 768], [1280, 720], [1440, 900], [1920, 1080], [3840, 2160]] as const) {
      const insets = baseStageInsets(w, h)
      const radius = globeScreenRadius(w, h, insets)
      const center = globeScreenCenter(w, h, insets)
      const layout = posterLayout(w, h, insets)
      expect(layout.size).toBeCloseTo(2 * radius * (445 / 396.5), 6)
      expect(layout.left + layout.size / 2).toBeCloseTo(center.x, 6)
      expect(layout.top + layout.size / 2).toBeCloseTo(center.y, 6)
    }
  })

  it('sin márgenes conserva la fórmula original (globo centrado en el viewport)', () => {
    const layout = posterLayout(1440, 900)
    expect(layout.size).toBeCloseTo(2 * globeScreenRadius(1440, 900) * (445 / 396.5), 6)
    expect(layout.left + layout.size / 2).toBeCloseTo(720, 6)
  })
})

describe('textura adaptativa del globo', () => {
  it('usa 2K en teléfonos y pantallas comunes, 4K en Retina grandes', async () => {
    const { pickGlobeTexture } = await import('../data/preload')
    expect(pickGlobeTexture(412, 823, 1.75)).toBe('2k')
    expect(pickGlobeTexture(1366, 768, 1)).toBe('2k')
    expect(pickGlobeTexture(1440, 900, 2)).toBe('4k')
    expect(pickGlobeTexture(2560, 1440, 1)).toBe('4k')
  })
})
