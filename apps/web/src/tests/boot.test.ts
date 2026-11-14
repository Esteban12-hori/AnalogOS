import { describe, expect, it } from 'vitest'
import { posterLayout } from '../boot/posterLayout.js'
import { globeScreenRadius } from '../domain/mapZoom'

describe('posición del póster previo a React', () => {
  it('coincide con el radio del globo 3D en móvil, laptop y monitores grandes', () => {
    for (const [w, h] of [[390, 844], [1024, 768], [1440, 900], [1920, 1080], [3840, 2160]]) {
      const inset = w >= 1100 ? 520 : 0
      const radius = globeScreenRadius(w, h, inset)
      const layout = posterLayout(w, h)
      expect(layout.size).toBeCloseTo(2 * radius * (445 / 396.5), 6)
      expect(layout.left + layout.size / 2).toBeCloseTo((w - inset) / 2, 6)
      expect(layout.top + layout.size / 2).toBeCloseTo(h / 2, 6)
    }
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
