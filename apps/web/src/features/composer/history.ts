/**
 * Historial de pruebas del visitante (recientes ⟲, «Historial» y Deshacer de «Tu misión»).
 * Es una comodidad local: vive en localStorage de este navegador, nunca se envía a ningún
 * servicio y la UI funciona igual si el almacenamiento falla o está bloqueado (try/catch).
 *
 * Formato v2 (ADR-013, docs/INTEGRATION_PLAN.md §3.7): se guardan el brief, el recorrido, el
 * alcance y SOLO los requisitos escritos o editados por el usuario. Nunca se guardan propuestas
 * intactas de la IA, su procedencia ni resultados: al restaurar, el usuario vuelve a confirmar y
 * la evaluación determinista se recalcula. La clave v1 (niveles por criterio) se ignora.
 */
import type { EditableRequirement, JourneyId, ScopeInput } from '../../mission/plannerState'
import type { MetricId } from '../../mission/types'

export interface HistoryEntry {
  id: string
  /** ms epoch. */
  at: number
  journey: JourneyId
  brief: string
  scope: ScopeInput
  /** Requisitos con origin 'user' (los de la IA sin editar no se guardan). */
  requirements: EditableRequirement[]
  /** Resumen para la lista («3 requisitos · catálogo»). */
  label: string
}

export const HISTORY_KEY = 'analogos.composer.history.v2'
export const HISTORY_MAX = 8
const MAX_BRIEF = 3000

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null
  } catch {
    return null
  }
}

const METRIC_IDS: readonly MetricId[] = ['median_slope_degree', 'terrain_roughness_meter', 'local_relief_meter', 'nonvegetated_fraction', 'polygon_area_km2', 'country']
const OPERATORS = ['<=', '>=', 'between', 'in'] as const
const SCOPE_MODES = ['catalog', 'sector', 'point', 'bbox'] as const

const isString = (value: unknown, max = 400): value is string => typeof value === 'string' && value.length <= max
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

function parseScope(raw: unknown): ScopeInput | null {
  if (!isRecord(raw) || !SCOPE_MODES.includes(raw.mode as (typeof SCOPE_MODES)[number])) return null
  const text = (key: string) => (isString(raw[key], 40) ? (raw[key] as string) : '')
  return {
    mode: raw.mode as ScopeInput['mode'],
    siteId: isString(raw.siteId, 80) ? raw.siteId : '',
    lon: text('lon'),
    lat: text('lat'),
    west: text('west'),
    south: text('south'),
    east: text('east'),
    north: text('north'),
    windowSiteId: isString(raw.windowSiteId, 80) ? raw.windowSiteId : null,
  }
}

function parseRequirement(raw: unknown): EditableRequirement | null {
  if (!isRecord(raw) || raw.origin !== 'user') return null
  if (!isString(raw.requirement_id, 40) || !isString(raw.label, 200)) return null
  if (raw.importance !== 'critical' && raw.importance !== 'preference') return null
  const importance: 'critical' | 'preference' = raw.importance
  const quote = raw.source_quote === null || isString(raw.source_quote, 600) ? (raw.source_quote as string | null) : null
  const base = { requirement_id: raw.requirement_id, label: raw.label, importance, origin: 'user' as const, source_quote: quote }
  if (raw.kind === 'unmeasured') {
    if (!isString(raw.topic_id, 60) || !isString(raw.detail, 400)) return null
    return { ...base, kind: 'unmeasured', topic_id: raw.topic_id, detail: raw.detail }
  }
  if (raw.kind !== 'measurable' || !METRIC_IDS.includes(raw.metric_id as MetricId)) return null
  if (!OPERATORS.includes(raw.operator as (typeof OPERATORS)[number])) return null
  const values = raw.valueText
  if (!Array.isArray(values) || values.length !== 2 || !values.every((value) => isString(value, 40))) return null
  const countries = Array.isArray(raw.countries) ? raw.countries.filter((value): value is string => isString(value, 4)) : []
  if (!isString(raw.unit, 20) || (raw.scale !== 'window' && raw.scale !== 'point')) return null
  return {
    ...base,
    kind: 'measurable',
    metric_id: raw.metric_id as MetricId,
    operator: raw.operator as (typeof OPERATORS)[number],
    valueText: [values[0] as string, values[1] as string],
    countries,
    unit: raw.unit,
    scale: raw.scale,
  }
}

/** Valida en el límite: lo guardado puede venir de otra versión o estar alterado. */
export function parseHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return []
  const out: HistoryEntry[] = []
  for (const item of raw) {
    if (!isRecord(item)) continue
    if (!isString(item.id, 80) || typeof item.at !== 'number' || !Number.isFinite(item.at)) continue
    if (item.journey !== 'test' && item.journey !== 'sector') continue
    if (!isString(item.brief, MAX_BRIEF) || !isString(item.label, 120)) continue
    const scope = parseScope(item.scope)
    if (!scope || !Array.isArray(item.requirements)) continue
    const requirements = item.requirements.map(parseRequirement)
    if (requirements.some((requirement) => requirement === null)) continue
    out.push({ id: item.id, at: item.at, journey: item.journey, brief: item.brief, scope, requirements: requirements as EditableRequirement[], label: item.label })
    if (out.length >= HISTORY_MAX) break
  }
  return out
}

/** Solo lo que el usuario escribió o editó: las propuestas intactas de la IA no se guardan. */
export function userRequirements(requirements: readonly EditableRequirement[]): EditableRequirement[] {
  return requirements.filter((requirement) => requirement.origin === 'user')
}

function scopeLabel(scope: ScopeInput): string {
  if (scope.mode === 'catalog') return 'las siete áreas'
  if (scope.mode === 'sector') return 'un sector'
  return scope.mode === 'point' ? 'un punto' : 'un rectángulo'
}

export function entryLabel(requirements: readonly EditableRequirement[], scope: ScopeInput): string {
  const count = requirements.length
  return `${count} ${count === 1 ? 'requisito' : 'requisitos'} · ${scopeLabel(scope)}`
}

export function entryFrom(
  state: { journey: JourneyId | null; brief: string; scope: ScopeInput; requirements: readonly EditableRequirement[] },
  at: number,
): HistoryEntry {
  const requirements = userRequirements(state.requirements)
  return {
    id: `${at.toString(36)}-${requirements.length}`,
    at,
    journey: state.journey ?? 'test',
    brief: state.brief,
    scope: state.scope,
    requirements,
    label: entryLabel(requirements, state.scope),
  }
}

/** Huella de lo que se restauraría: dos entradas iguales no se repiten en la lista. */
export function entrySignature(entry: Pick<HistoryEntry, 'journey' | 'brief' | 'scope' | 'requirements'>): string {
  return JSON.stringify([entry.journey, entry.brief, entry.scope, entry.requirements])
}

/** Más nueva primero; la misma prueba no se repite: sube al principio. */
export function addHistory(list: readonly HistoryEntry[], entry: HistoryEntry, max = HISTORY_MAX): HistoryEntry[] {
  const key = entrySignature(entry)
  return [entry, ...list.filter((item) => entrySignature(item) !== key)].slice(0, max)
}

/** Textos recientes únicos para el menú ⟲. */
export function recentTexts(list: readonly HistoryEntry[], max = 5): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of list) {
    const text = entry.brief.trim()
    if (!text || seen.has(text)) continue
    seen.add(text)
    out.push(text)
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
