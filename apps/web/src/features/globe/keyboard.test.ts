import { describe, expect, it } from 'vitest'
import { cameraKeyAction, KEY_ZOOM_STEP, rotateCenter } from './keyboard'

describe('stage keyboard', () => {
  it('arrows rotate 10° and 30° with Shift', () => {
    expect(cameraKeyAction('ArrowLeft')).toEqual({ kind: 'rotate', dLon: -10, dLat: 0 })
    expect(cameraKeyAction('ArrowRight', true)).toEqual({ kind: 'rotate', dLon: 30, dLat: 0 })
    expect(cameraKeyAction('ArrowUp')).toEqual({ kind: 'rotate', dLon: 0, dLat: 10 })
    expect(cameraKeyAction('ArrowDown', true)).toEqual({ kind: 'rotate', dLon: 0, dLat: -30 })
  })

  it('+ / − zoom in or out half a level and Home returns to the global view', () => {
    for (const key of ['+', '=', 'Add']) expect(cameraKeyAction(key)).toEqual({ kind: 'zoom', delta: KEY_ZOOM_STEP })
    for (const key of ['-', '_', 'Subtract']) expect(cameraKeyAction(key)).toEqual({ kind: 'zoom', delta: -KEY_ZOOM_STEP })
    expect(cameraKeyAction('Home')).toEqual({ kind: 'home' })
  })

  it('ignores the other keys (Enter, Tab, Escape stay with the UI)', () => {
    for (const key of ['Enter', ' ', 'Tab', 'Escape', 'a', 'End']) expect(cameraKeyAction(key)).toBeNull()
  })

  it('wraps the longitude and clamps the latitude of the center', () => {
    expect(rotateCenter([175, -24], 10, 0)).toEqual([-175, -24])
    expect(rotateCenter([-175, -24], -10, 0)).toEqual([175, -24])
    expect(rotateCenter([-69.5, 75], 0, 30)).toEqual([-69.5, 80])
    expect(rotateCenter([-69.5, -75], 0, -30)).toEqual([-69.5, -80])
    expect(rotateCenter([170, 0], 10, 0)).toEqual([-180, 0])
  })
})
