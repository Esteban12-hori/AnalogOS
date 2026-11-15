/**
 * Visitor test history (recent ⟲, "History" and Undo in "Your mission").
 * It is a local convenience: it lives in this browser's localStorage, is never sent to any
 * service, and the UI works the same if storage fails or is blocked (try/catch).
 *
 * Format v2 (ADR-013, docs/INTEGRATION_PLAN.md §3.7): the brief, the journey, the
 * scope and ONLY the requirements written or edited by the user are saved. Intact AI proposals,
 * their provenance, and results are never saved: on restore, the user confirms again and
 * the deterministic evaluation is recalculated. The v1 key (levels per criterion) is ignored.
 */
import { formatDate, getLocale, type Locale } from '../../i18n/core'
import { tPlanner } from '../../i18n/messages/planner'
import type { EditableRequirement, JourneyId, ScopeInput } from '../../mission/plannerState'
import type { MetricId } from '../../mission/types'

export interface HistoryEntry {
  id: string
  /** ms epoch. */
  at: number
  journey: JourneyId
  brief: string
  scope: ScopeInput
  /** Requirements with origin 'user' (unedited AI ones are not saved). */
  requirements: EditableRequirement[]
  /**
   * Summary for the list ("3 requirements · the seven areas"), stored in English. The interface recomputes it in its
   * language from `requirements` and `scope` (`entryLabel`); the stored value is only validated.
   */
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

/** Validates at the boundary: what is stored may come from another version or may have been tampered with. */
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

/** Only what the user wrote or edited: intact AI proposals are not saved. */
export function userRequirements(requirements: readonly EditableRequirement[]): EditableRequirement[] {
  return requirements.filter((requirement) => requirement.origin === 'user')
}

/** “3 requirements · the seven areas” in a language (the history saves it in English). */
export function entryLabel(requirements: readonly EditableRequirement[], scope: ScopeInput, locale: Locale = 'en'): string {
  const t = tPlanner.in(locale)
  return t('history.entry', { count: requirements.length, scope: t(`history.scope.${scope.mode}`) })
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

/** Fingerprint of what would be restored: two identical entries are not repeated in the list. */
export function entrySignature(entry: Pick<HistoryEntry, 'journey' | 'brief' | 'scope' | 'requirements'>): string {
  return JSON.stringify([entry.journey, entry.brief, entry.scope, entry.requirements])
}

/** Newest first; the same test is not repeated: it moves to the top. */
export function addHistory(list: readonly HistoryEntry[], entry: HistoryEntry, max = HISTORY_MAX): HistoryEntry[] {
  const key = entrySignature(entry)
  return [entry, ...list.filter((item) => entrySignature(item) !== key)].slice(0, max)
}

/** Unique recent texts for the ⟲ menu. */
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
    // Storage full or blocked: the history stays in memory only.
  }
}

/** “2:32 PM” if it is from today; “Nov 13, 2:32 PM” otherwise (es: “14:32”, “13 nov, 14:32”). */
export function formatWhen(at: number, now: number = Date.now(), locale: Locale = getLocale()): string {
  const date = new Date(at)
  const today = new Date(now)
  const sameDay = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
  return formatDate(date, sameDay ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }, locale)
}
