/**
 * Historial de misiones del visitante (recientes ⟲ y «Historial» de Tu misión). Es una
 * comodidad local: vive en localStorage de este navegador, nunca se envía a ningún servicio y
 * la UI funciona igual si el almacenamiento falla o está bloqueado (todo va en try/catch).
 * Guarda niveles, no cifras: al restaurar, el motor vuelve a calcular el %.
 */
import type { CriterionLevel } from '../../domain/aiContracts'
import type { CriterionId } from '../../domain/contracts'
import { CRITERION_IDS } from '../../domain/criteria'
import type { MissionSource } from '../../state/mission'

export type Levels = Readonly<Record<CriterionId, CriterionLevel>>

export interface HistoryEntry {
  id: string
  /** ms epoch. */
  at: number
  /** Texto enviado; null en perfiles predefinidos. */
  text: string | null
  source: MissionSource
  label: string
  levels: Levels
  /** Id del predefinido, si lo era (para restaurarlo con su id). */
  presetId: string | null
}

export const HISTORY_KEY = 'analogos.composer.history.v1'
export const HISTORY_MAX = 8

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
  } catch {
    return null
  }
}

function isLevel(value: unknown): value is CriterionLevel {
  return value === 0 || value === 1 || value === 2 || value === 3
}

const SOURCES: readonly MissionSource[] = ['lktron', 'demo', 'preset']

/** Valida en el límite: lo guardado puede venir de otra versión o estar alterado. */
export function parseHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return []
  const out: HistoryEntry[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue
    const entry = item as Record<string, unknown>
    const levels = entry.levels as Record<string, unknown> | undefined
    if (typeof levels !== 'object' || levels === null) continue
    if (!CRITERION_IDS.every((id) => isLevel(levels[id]))) continue
    if (typeof entry.id !== 'string' || typeof entry.at !== 'number' || !Number.isFinite(entry.at)) continue
    if (!(entry.text === null || (typeof entry.text === 'string' && entry.text.length <= 600))) continue
    if (typeof entry.label !== 'string' || entry.label.length > 80) continue
    if (!SOURCES.includes(entry.source as MissionSource)) continue
    const presetId = typeof entry.presetId === 'string' ? entry.presetId : null
    const clean = {} as Record<CriterionId, CriterionLevel>
    for (const id of CRITERION_IDS) clean[id] = levels[id] as CriterionLevel
    out.push({ id: entry.id, at: entry.at, text: entry.text as string | null, source: entry.source as MissionSource, label: entry.label, levels: clean, presetId })
    if (out.length >= HISTORY_MAX) break
  }
  return out
}

export function levelsSignature(levels: Levels): string {
  return CRITERION_IDS.map((id) => levels[id]).join('')
}

/** Más nueva primero; la misma misión (texto + niveles) no se repite: sube al principio. */
export function addHistory(list: readonly HistoryEntry[], entry: HistoryEntry, max = HISTORY_MAX): HistoryEntry[] {
  const key = `${entry.text ?? ''}|${levelsSignature(entry.levels)}`
  const rest = list.filter((item) => `${item.text ?? ''}|${levelsSignature(item.levels)}` !== key)
  return [entry, ...rest].slice(0, max)
}

/** Textos recientes únicos para el menú ⟲. */
export function recentTexts(list: readonly HistoryEntry[], max = 5): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of list) {
    if (!entry.text || seen.has(entry.text)) continue
    seen.add(entry.text)
    out.push(entry.text)
    if (out.length >= max) break
  }
  return out
}

export function loadHistory(storage: StorageLike | null = defaultStorage()): HistoryEntry[] {
  try {
    const raw = storage?.getItem(HISTORY_KEY)
    return raw ? parseHistory(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

export function saveHistory(list: readonly HistoryEntry[], storage: StorageLike | null = defaultStorage()): void {
  try {
    if (list.length === 0) storage?.removeItem(HISTORY_KEY)
    else storage?.setItem(HISTORY_KEY, JSON.stringify(list))
  } catch {
    // Almacenamiento lleno o bloqueado: el historial queda solo en memoria.
  }
}

const time = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit' })
const dayTime = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** «14:32» si es de hoy; «13 nov, 14:32» si no. */
export function formatWhen(at: number, now: number = Date.now()): string {
  const date = new Date(at)
  const today = new Date(now)
  const sameDay = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
  return (sameDay ? time : dayTime).format(date)
}
