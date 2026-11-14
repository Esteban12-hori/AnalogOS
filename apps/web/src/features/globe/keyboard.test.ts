import { describe, expect, it } from 'vitest'
import { cameraKeyAction, KEY_ZOOM_STEP, rotateCenter } from './keyboard'

describe('teclado del escenario', () => {
  it('flechas giran 10° y 30° con Mayús', () => {
    expect(cameraKeyAction('ArrowLeft')).toEqual({ kind: 'rotate', dLon: -10, dLat: 0 })
    expect(cameraKeyAction('ArrowRight', true)).toEqual({ kind: 'rotate', dLon: 30, dLat: 0 })
    expect(cameraKeyAction('ArrowUp')).toEqual({ kind: 'rotate', dLon: 0, dLat: 10 })
    expect(cameraKeyAction('ArrowDown', true)).toEqual({ kind: 'rotate', dLon: 0, dLat: -30 })
  })

  it('+ / − acercan o alejan medio nivel e Inicio vuelve a la vista global', () => {
    for (const key of ['+', '=', 'Add']) expect(cameraKeyAction(key)).toEqual({ kind: 'zoom', delta: KEY_ZOOM_STEP })
    for (const key of ['-', '_', 'Subtract']) expect(cameraKeyAction(key)).toEqual({ kind: 'zoom', delta: -KEY_ZOOM_STEP })
    expect(cameraKeyAction('Home')).toEqual({ kind: 'home' })
  })

  it('ignora el resto de las teclas (Enter, Tab, Escape quedan para la UI)', () => {
    for (const key of ['Enter', ' ', 'Tab', 'Escape', 'a', 'End']) expect(cameraKeyAction(key)).toBeNull()
  })

  it('envuelve la longitud y acota la latitud del centro', () => {
    expect(rotateCenter([175, -24], 10, 0)).toEqual([-175, -24])
    expect(rotateCenter([-175, -24], -10, 0)).toEqual([175, -24])
    expect(rotateCenter([-69.5, 75], 0, 30)).toEqual([-69.5, 80])
    expect(rotateCenter([-69.5, -75], 0, -30)).toEqual([-69.5, -80])
    expect(rotateCenter([170, 0], 10, 0)).toEqual([-180, 0])
  })
})
