import { describe, expect, it } from 'vitest'
import { DETENT_FLICK_VELOCITY, DETENT_HYSTERESIS_PX, DETENT_SLOP_PX, resolveDetent } from '../shell/sheet/resolveDetent'

// S0 bandeja · S1 lugar (54dvh de 844) · S2 ficha
const DETENTS = [248, 456, 770] as const
const S0 = 0
const S1 = 1
const S2 = 2

describe('resolveDetent · umbrales', () => {
  it('un gesto rápido hacia arriba sube un detent desde la posición actual', () => {
    expect(resolveDetent(270, DETENT_FLICK_VELOCITY, DETENTS, { from: S0 })).toBe(S1)
    expect(resolveDetent(470, 1.2, DETENTS, { from: S1 })).toBe(S2)
    expect(resolveDetent(780, 2, DETENTS, { from: S2 })).toBe(S2)
  })

  it('un gesto rápido hacia abajo baja un detent y nunca retrocede contra el gesto', () => {
    expect(resolveDetent(740, -DETENT_FLICK_VELOCITY, DETENTS, { from: S2 })).toBe(S1)
    expect(resolveDetent(430, -0.9, DETENTS, { from: S1 })).toBe(S0)
    // Arrastró desde S2 hasta casi S0 y soltó con impulso hacia arriba: va a S1, no vuelve a S2.
    expect(resolveDetent(300, 1, DETENTS, { from: S2 })).toBe(S1)
    expect(resolveDetent(200, -3, DETENTS, { from: S0 })).toBe(S0)
  })

  it('sin velocidad gana el detent más cercano', () => {
    expect(resolveDetent(450, 0, DETENTS, { from: S0 })).toBe(S1)
    expect(resolveDetent(700, 0.1, DETENTS, { from: S1 })).toBe(S2)
    expect(resolveDetent(260, -0.1, DETENTS, { from: S2 })).toBe(S0)
  })

  it('un arrastre que supera el máximo o el mínimo queda en el extremo', () => {
    expect(resolveDetent(900, 0, DETENTS, { from: S1 })).toBe(S2)
    expect(resolveDetent(10, 0, DETENTS, { from: S1 })).toBe(S0)
  })
})

describe('resolveDetent · histéresis', () => {
  it('cerca del punto medio la hoja se queda en su detent de origen, en ambos sentidos', () => {
    const mid = (DETENTS[S0] + DETENTS[S1]) / 2
    const band = DETENT_HYSTERESIS_PX / 2 - 1
    expect(resolveDetent(mid + band, 0, DETENTS, { from: S0 })).toBe(S0)
    expect(resolveDetent(mid - band, 0, DETENTS, { from: S1 })).toBe(S1)
    // Fuera de la banda, cambia.
    expect(resolveDetent(mid + DETENT_HYSTERESIS_PX, 0, DETENTS, { from: S0 })).toBe(S1)
    expect(resolveDetent(mid - DETENT_HYSTERESIS_PX, 0, DETENTS, { from: S1 })).toBe(S0)
  })
})

describe('resolveDetent · cancelación', () => {
  it('pointercancel vuelve al origen aunque el gesto fuera rápido', () => {
    expect(resolveDetent(700, 3, DETENTS, { from: S0, cancelled: true })).toBe(S0)
  })

  it('un movimiento menor que el umbral de arrastre es un toque y no mueve la hoja', () => {
    expect(resolveDetent(DETENTS[S1] + DETENT_SLOP_PX - 1, 0, DETENTS, { from: S1 })).toBe(S1)
  })

  it('entradas no finitas o vacías no rompen: vuelve al origen', () => {
    expect(resolveDetent(Number.NaN, 0, DETENTS, { from: S2 })).toBe(S2)
    expect(resolveDetent(400, Number.POSITIVE_INFINITY, DETENTS, { from: S1 })).toBe(S1)
    expect(resolveDetent(400, 0, [], { from: 3 })).toBe(0)
    expect(resolveDetent(400, 0, DETENTS, { from: 9, cancelled: true })).toBe(S2)
  })
})
