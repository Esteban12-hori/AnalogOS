import { describe, expect, it } from 'vitest'
import { HISTORY_KEY, HISTORY_MAX, addHistory, formatWhen, loadHistory, parseHistory, recentTexts, saveHistory, type HistoryEntry } from './history'
import { MOBILITY, levels } from './testSupport'

function entry(id: string, text: string | null, at = 1_700_000_000_000, levelsIn = MOBILITY): HistoryEntry {
  return { id, at, text, source: text ? 'demo' : 'preset', label: 'Perfil de tu misión', levels: levelsIn, presetId: text ? null : 'preset-movilidad' }
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('composer · historial local (comodidad del visitante)', () => {
  it('la más nueva primero; la misma misión no se repite; tope de entradas', () => {
    let list: HistoryEntry[] = []
    list = addHistory(list, entry('a', 'rover en pendiente'))
    list = addHistory(list, entry('b', 'tracción'))
    list = addHistory(list, entry('c', 'rover en pendiente'))
    expect(list.map((item) => item.id)).toEqual(['c', 'b'])
    for (let index = 0; index < HISTORY_MAX + 3; index += 1) list = addHistory(list, entry(`x${index}`, `misión ${'a'.repeat(index + 1)}`))
    expect(list).toHaveLength(HISTORY_MAX)
    // Mismo texto con otros niveles = otra misión.
    const other = addHistory([entry('a', 'rover')], entry('b', 'rover', 1, levels({ slope: 3 })))
    expect(other).toHaveLength(2)
  })

  it('recientes: textos únicos, sin perfiles predefinidos', () => {
    const list = [entry('a', 'uno'), entry('b', null), entry('c', 'dos'), entry('d', 'uno', 2, levels({ slope: 1 }))]
    expect(recentTexts(list)).toEqual(['uno', 'dos'])
  })

  it('valida lo guardado: descarta niveles fuera de 0–3, fuentes desconocidas y basura', () => {
    const good = entry('ok', 'rover')
    const parsed = parseHistory([
      good,
      { ...good, id: 'bad-level', levels: { ...MOBILITY, slope: 7 } },
      { ...good, id: 'bad-source', source: 'gpt' },
      { ...good, id: 'bad-at', at: 'ayer' },
      'basura',
      null,
    ])
    expect(parsed.map((item) => item.id)).toEqual(['ok'])
    expect(parseHistory({ not: 'array' })).toEqual([])
  })

  it('guarda y lee de localStorage; si el almacenamiento falla, sigue en memoria sin romper', () => {
    const storage = memoryStorage()
    saveHistory([entry('a', 'rover')], storage)
    expect(loadHistory(storage).map((item) => item.id)).toEqual(['a'])
    saveHistory([], storage)
    expect(storage.data.has(HISTORY_KEY)).toBe(false)
    const broken = {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('lleno')
      },
      removeItem: () => undefined,
    }
    expect(loadHistory(broken)).toEqual([])
    expect(() => saveHistory([entry('a', 'rover')], broken)).not.toThrow()
    expect(loadHistory(memoryStorage({ [HISTORY_KEY]: '{json roto' }))).toEqual([])
    expect(loadHistory(null)).toEqual([])
  })

  it('hora local es-CL; otro día lleva la fecha', () => {
    const now = new Date(2026, 10, 14, 18, 0).getTime()
    expect(formatWhen(new Date(2026, 10, 14, 9, 5).getTime(), now)).toMatch(/09:05/)
    expect(formatWhen(new Date(2026, 10, 12, 9, 5).getTime(), now)).toMatch(/12/)
  })
})
