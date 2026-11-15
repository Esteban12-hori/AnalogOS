import { describe, expect, it } from 'vitest'
import { similarityTone, similarityToneLabel } from '../domain/similarityScale'

describe('similarity color scale', () => {
  it('assigns red, yellow, blue and green by band', () => {
    expect(similarityTone(0)).toBe('low')
    expect(similarityTone(49.9)).toBe('low')
    expect(similarityTone(50)).toBe('mid')
    expect(similarityTone(69.9)).toBe('mid')
    expect(similarityTone(70)).toBe('good')
    expect(similarityTone(89.9)).toBe('good')
    expect(similarityTone(90)).toBe('high')
    expect(similarityTone(100)).toBe('high')
  })

  it('classifies the number as displayed (rounded)', () => {
    expect(similarityTone(69.6, 0)).toBe('good') // it looks «70»: blue, as the legend says
    expect(similarityTone(69.94)).toBe('mid') // shown as “69.9”
    expect(similarityTone(69.96)).toBe('good') // shown as “70.0”
    expect(similarityTone(89.96)).toBe('high') // shown as “90.0”
  })

  it('no figure, no color', () => {
    expect(similarityTone(null)).toBeNull()
    expect(similarityTone(undefined)).toBeNull()
    expect(similarityTone(Number.NaN)).toBeNull()
  })

  it('the accessible text names the band', () => {
    expect(similarityToneLabel(94.9)).toBe('very high similarity (90–100)')
    expect(similarityToneLabel(63.9)).toBe('medium similarity (50–69)')
    expect(similarityToneLabel(null)).toBeNull()
  })
})
