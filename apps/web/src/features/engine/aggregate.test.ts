// Reglas de puntuación del motor TS (CLAUDE.md «Calidad mínima»): pesos, media geométrica,
// cero/ε, datos faltantes, confianza separada de la similitud y sensibilidad.
import { describe, expect, it } from 'vitest'
import { aggregate, sensitivity, type AggregateCriterion, type AggregateInput } from './index'

const CRITERIA: AggregateCriterion[] = [
  { id: 'a', weight: 0.5, unit: 'u' },
  { id: 'b', weight: 0.3, unit: 'u' },
  { id: 'c', weight: 0.2, unit: 'u' },
]

function full(a = 1, b = 1, c = 1, quality = 1): Record<string, AggregateInput> {
  return { a: { similarity: a, quality }, b: { similarity: b, quality }, c: { similarity: c, quality } }
}

const run = (inputs: Record<string, AggregateInput>, epsilon = 0.01, minimum = 0.7) => aggregate(CRITERIA, inputs, epsilon, minimum)

describe('aggregate · media geométrica ponderada', () => {
  it('reproduce 100·Π s_i^w_i', () => {
    const expected = 100 * 0.9 ** 0.5 * 0.5 ** 0.3 * 0.8 ** 0.2
    expect(run(full(0.9, 0.5, 0.8)).similarity).toBeCloseTo(expected, 2)
  })

  it('todo en 1 da 100 y contribuciones nulas', () => {
    const result = run(full())
    expect(result.similarity).toBe(100)
    expect(Object.values(result.contributions)).toEqual([0, 0, 0])
  })

  it('escalar todos los pesos no cambia la similitud (se renormalizan por el peso válido)', () => {
    const doubled = CRITERIA.map((criterion) => ({ ...criterion, weight: criterion.weight * 2 }))
    expect(aggregate(doubled, full(0.9, 0.5, 0.8), 0.01, 1.4).similarity).toBe(run(full(0.9, 0.5, 0.8)).similarity)
  })

  it('más peso a un criterio peor baja la similitud', () => {
    const heavyB = [
      { id: 'a', weight: 0.2, unit: 'u' },
      { id: 'b', weight: 0.6, unit: 'u' },
      { id: 'c', weight: 0.2, unit: 'u' },
    ]
    const base = run(full(0.9, 0.5, 0.8)).similarity ?? 0
    expect(aggregate(heavyB, full(0.9, 0.5, 0.8), 0.01, 0.7).similarity ?? 0).toBeLessThan(base)
  })
})

describe('aggregate · cero y ε', () => {
  it('una similitud 0 usa ε en vez de anular el score', () => {
    const result = run(full(0, 1, 1))
    expect(result.similarity).toBeCloseTo(100 * 0.01 ** 0.5, 2)
    expect(result.contributions.a).toBeCloseTo(0.5 * Math.log(0.01), 4)
  })

  it('valores bajo ε se recortan a ε', () => {
    expect(run(full(0.001, 1, 1)).similarity).toBe(run(full(0, 1, 1)).similarity)
  })
})

describe('aggregate · datos faltantes', () => {
  it('un criterio ausente no entra a la similitud y baja la confianza', () => {
    const result = run({ a: { similarity: 0.9, quality: 1 }, b: { similarity: 0.5, quality: 1 } })
    expect(result.validWeight).toBe(0.8)
    expect(result.similarity).toBeCloseTo(100 * Math.exp((0.5 * Math.log(0.9) + 0.3 * Math.log(0.5)) / 0.8), 2)
    expect(result.confidence).toBe(80)
    expect(result.contributions.c).toBeNull()
    expect(result.statuses?.c).toBe('missing')
  })

  it('bajo el peso válido mínimo no hay similitud (null), pero sí confianza', () => {
    const result = run({ a: { similarity: 0.9, quality: 1 } })
    expect(result.similarity).toBeNull()
    expect(result.confidence).toBe(50)
    expect(Object.values(result.contributions)).toEqual([null, null, null])
  })

  it('valid sin similitud se trata como missing', () => {
    const result = run({ ...full(0.9, 0.5, 0.8), c: { similarity: null, quality: 1, status: 'valid' } })
    expect(result.statuses?.c).toBe('missing')
    expect(result.validWeight).toBe(0.8)
  })

  it('needs_calibration y excluded no aportan similitud ni calidad', () => {
    for (const status of ['needs_calibration', 'excluded'] as const) {
      const result = aggregate(CRITERIA, { ...full(0.9, 0.5, 0.8), c: { similarity: 0.1, quality: 1, status } }, 0.01, 0.7)
      expect(result.contributions.c).toBeNull()
      expect(result.confidence).toBe(80)
    }
  })

  it('el umbral de peso válido tolera el error de coma flotante', () => {
    const criteria = [
      { id: 'a', weight: 0.4, unit: 'u' },
      { id: 'b', weight: 0.3, unit: 'u' },
      { id: 'c', weight: 0.3, unit: 'u' },
    ]
    expect(aggregate(criteria, { a: { similarity: 0.5, quality: 1 }, b: { similarity: 0.5, quality: 1 } }, 0.01, 0.7).similarity).toBe(50)
  })
})

describe('aggregate · confianza separada de la similitud', () => {
  it('cambiar la calidad mueve la confianza y nunca la similitud', () => {
    const high = run(full(0.9, 0.5, 0.8, 1))
    const low = run(full(0.9, 0.5, 0.8, 0.2))
    expect(low.similarity).toBe(high.similarity)
    expect(high.confidence).toBe(100)
    expect(low.confidence).toBe(20)
  })

  it('el resultado no tiene un campo que mezcle similitud y confianza', () => {
    expect(Object.keys(run(full(0.9, 0.5, 0.8))).sort()).toEqual(['confidence', 'contributions', 'similarity', 'statuses', 'validWeight'])
  })
})

describe('aggregate · validación en el límite', () => {
  it('rechaza similitud o calidad fuera de [0, 1] (como Python)', () => {
    expect(() => run(full(1.2))).toThrow(RangeError)
    expect(() => run(full(Number.NaN))).toThrow(RangeError)
    expect(() => run(full(0.9, 0.5, 0.8, -0.1))).toThrow(RangeError)
  })

  it('no muta sus entradas', () => {
    const criteria = structuredClone(CRITERIA)
    const inputs = full(0.9, 0.5, 0.8)
    const before = JSON.stringify([criteria, inputs])
    aggregate(criteria, inputs, 0.01, 0.7)
    sensitivity(criteria, inputs, 0.01, 0.7)
    expect(JSON.stringify([criteria, inputs])).toBe(before)
  })
})

describe('sensitivity', () => {
  it('sin datos suficientes devuelve null y sin escenarios', () => {
    expect(sensitivity(CRITERIA, { a: { similarity: 0.9, quality: 1 } }, 0.01, 0.7)).toEqual({
      stability: null,
      maxScoreDelta: null,
      scenarios: [],
    })
  })

  it('dos escenarios por criterio y estabilidad = 100 − peor delta', () => {
    const result = sensitivity(CRITERIA, full(0.9, 0.5, 0.8), 0.01, 0.7)
    expect(result.scenarios.map((row) => `${row.criterionId}:${row.direction}`)).toEqual([
      'a:minus',
      'a:plus',
      'b:minus',
      'b:plus',
      'c:minus',
      'c:plus',
    ])
    const worst = Math.max(...result.scenarios.map((row) => Math.abs(row.delta ?? 0)))
    expect(result.maxScoreDelta).toBe(worst)
    expect(result.stability).toBeCloseTo(100 - worst, 6)
  })

  it('si todos los criterios valen lo mismo, ningún peso mueve el resultado', () => {
    expect(sensitivity(CRITERIA, full(0.6, 0.6, 0.6), 0.01, 0.7).stability).toBe(100)
  })

  it('rechaza perturbaciones fuera de (0, 1)', () => {
    expect(() => sensitivity(CRITERIA, full(), 0.01, 0.7, 0)).toThrow(RangeError)
    expect(() => sensitivity(CRITERIA, full(), 0.01, 0.7, 1)).toThrow(RangeError)
  })
})
