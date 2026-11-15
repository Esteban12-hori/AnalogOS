import { describe, expect, it } from 'vitest'
import { selectionCamera } from './selectionCamera'

describe('camera on selection change', () => {
  it('manual selection always flies', () => {
    expect(selectionCamera(false, false)).toBe('fly')
    expect(selectionCamera(false, true)).toBe('fly')
  })

  it('the #1 preview flies only if nobody touched the camera; otherwise, “Center on ‹#1›”', () => {
    expect(selectionCamera(true, false)).toBe('fly')
    expect(selectionCamera(true, true)).toBe('chip')
  })
})
