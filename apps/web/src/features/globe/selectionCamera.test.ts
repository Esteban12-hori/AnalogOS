import { describe, expect, it } from 'vitest'
import { selectionCamera } from './selectionCamera'

describe('cámara al cambiar la selección', () => {
  it('la selección manual siempre vuela', () => {
    expect(selectionCamera(false, false)).toBe('fly')
    expect(selectionCamera(false, true)).toBe('fly')
  })

  it('la vista previa del #1 vuela solo si nadie tocó la cámara; si no, «Centrar en ‹#1›»', () => {
    expect(selectionCamera(true, false)).toBe('fly')
    expect(selectionCamera(true, true)).toBe('chip')
  })
})
