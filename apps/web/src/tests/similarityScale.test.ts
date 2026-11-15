import { describe, expect, it } from 'vitest'
import { similarityTone, similarityToneLabel } from '../domain/similarityScale'

describe('escala de color de la similitud', () => {
  it('asigna rojo, amarillo, azul y verde por tramos', () => {
    expect(similarityTone(0)).toBe('low')
    expect(similarityTone(49.9)).toBe('low')
    expect(similarityTone(50)).toBe('mid')
    expect(similarityTone(69.9)).toBe('mid')
    expect(similarityTone(70)).toBe('good')
    expect(similarityTone(89.9)).toBe('good')
    expect(similarityTone(90)).toBe('high')
    expect(similarityTone(100)).toBe('high')
  })

  it('clasifica el número como se muestra (redondeado)', () => {
    expect(similarityTone(69.6, 0)).toBe('good') // se ve «70»: azul, como dice la leyenda
    expect(similarityTone(69.94)).toBe('mid') // se ve «69,9»
    expect(similarityTone(69.96)).toBe('good') // se ve «70,0»
    expect(similarityTone(89.96)).toBe('high') // se ve «90,0»
  })

  it('sin cifra no hay color', () => {
    expect(similarityTone(null)).toBeNull()
    expect(similarityTone(undefined)).toBeNull()
    expect(similarityTone(Number.NaN)).toBeNull()
  })

  it('el texto accesible nombra el tramo', () => {
    expect(similarityToneLabel(94.9)).toBe('similitud muy alta (90–100)')
    expect(similarityToneLabel(63.9)).toBe('similitud media (50–69)')
    expect(similarityToneLabel(null)).toBeNull()
  })
})
