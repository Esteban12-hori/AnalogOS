/**
 * Canonical messages of the mission interface (area mission-ui, docs/I18N.md §4.6, ADR-017).
 *
 * The planner state, the mission controller, the AI client and the geometry validators keep their messages in
 * CANONICAL English (`canonicalMessage` = `tMission.in('en')`): state, history and tests never depend on the interface
 * language, and switching language after an error never leaves stale text. The interface shows them through
 * `displayMissionMessage` (mission/messageDisplay.ts), which recognizes the English template and fills the Spanish one.
 * Unknown text (technical details, server text, user and AI-drafted text) is returned unchanged: nothing is translated
 * on the fly.
 *
 * Deferred chunks only: loading this module registers its translator in mission/messageDisplay.ts (main chunk), so the
 * composer can show in Spanish any message the deferred code stores.
 */
import { tMission } from '../i18n/messages/mission'
import { registerMessageTranslator, translateComposerNotice } from './messageDisplay'

export { displayMissionMessage, displayMissionMessages } from './messageDisplay'

export type MissionMessageKey = Parameters<typeof tMission>[0]

/** Canonical (English) text of a mission message: what producers store, whatever the interface language. */
export const canonicalMessage = tMission.in('en')

/** Converts a captured placeholder to its Spanish rendering, or null when the fragment is not of that kind. */
type Converter = (value: string) => string | null

const keep: Converter = (value) => (value.length > 0 ? value : null)

/** Plain en-US number (“0.001”, “3000”) → es-CL (“0,001”, “3000”; groups from 5 digits like the frozen pack). */
const number: Converter = (value) => {
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value)
  if (!m) return null
  const int = (m[2] as string).length >= 5 ? (m[2] as string).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : (m[2] as string)
  return `${m[1]}${int}${m[3] ? `,${m[3]}` : ''}`
}

const TOPIC_IDS = ['max_point_slope', 'rock_size', 'traction', 'loose_soil', 'road_access', 'cost', 'permits', 'operational_date', 'local_rain', 'mobile_coverage', 'unknown'] as const

/** English topic label → Spanish topic label (the catalog repeats the mission packs, tested equal). */
const topic: Converter = (value) => {
  const id = TOPIC_IDS.find((item) => tMission.in('en')(`topic.${item}`) === value)
  return id ? tMission.in('es')(`topic.${id}`) : null
}

const AI_KEYS: readonly MissionMessageKey[] = [
  'ai.unavailable', 'ai.timeout', 'ai.rateLimitedProvider', 'ai.refused', 'ai.truncated', 'ai.invalidOutput', 'ai.upstream', 'ai.rateLimited',
  'ai.origin', 'ai.stale', 'ai.invalidRequest', 'ai.nothingToExplain', 'ai.geologyUnavailable', 'ai.geologyStale', 'ai.genericError',
  'ai.offline', 'ai.noResponse', 'ai.badFormat', 'ai.canceled', 'ai.noAi',
]

/** A known AI client sentence (exact): the first part of “<reason> <the AI could not be used…>”. */
const aiReason: Converter = (value) => {
  const key = AI_KEYS.find((item) => canonicalMessage(item) === value)
  return key ? tMission.in('es')(key) : null
}

/** Every canonical message the interface may show, with converters for its placeholders (default: kept verbatim). */
const MESSAGES: ReadonlyArray<{ key: MissionMessageKey; holes?: Readonly<Record<string, Converter>> }> = [
  { key: 'msg.unnamedRequirement' }, { key: 'msg.chooseCountry' }, { key: 'msg.minMax' }, { key: 'msg.value' }, { key: 'msg.chooseSector' },
  { key: 'msg.lon' }, { key: 'msg.lat' }, { key: 'msg.west' }, { key: 'msg.south' }, { key: 'msg.east' }, { key: 'msg.north' },
  { key: 'msg.briefTooLong', holes: { max: number } }, { key: 'msg.otherTarget' }, { key: 'msg.pendingMention', holes: { topic } },
  { key: 'msg.aiCanceledContent' }, { key: 'msg.briefChanged' }, { key: 'msg.otherTargetWarning' }, { key: 'msg.aiStale' },
  { key: 'msg.cancelledDraft' }, { key: 'msg.cancelledExplain' }, { key: 'msg.restored' }, { key: 'msg.undone' },
  { key: 'msg.evaluateFailed' }, { key: 'msg.exportFailed' }, { key: 'msg.exportGeologyFailed' }, { key: 'msg.noGeology' },
  { key: 'msg.slowAnnouncement' },
  { key: 'geo.bboxShape' }, { key: 'geo.lonRange' }, { key: 'geo.latRange' }, { key: 'geo.lonOrder' }, { key: 'geo.latOrder' },
  { key: 'geo.bboxSmall', holes: { min: number } }, { key: 'geo.bboxLarge', holes: { max: number } }, { key: 'geo.coords' },
  ...AI_KEYS.map((key) => ({ key })),
  { key: 'ai.withNoAi', holes: { reason: aiReason } },
]

interface Compiled {
  key: MissionMessageKey
  pattern: RegExp
  names: string[]
  holes: Readonly<Record<string, Converter>>
}

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

let compiled: readonly Compiled[] | null = null

/** Templates are compiled on first use (never on load: the composer chunk only pays when Spanish shows a message). */
function templates(): readonly Compiled[] {
  compiled ??= MESSAGES.map((entry) => {
    const template = tMission.catalog.en[entry.key]
    if (typeof template !== 'string') throw new Error(`messages: ${entry.key} is not a text message.`)
    const names: string[] = []
    const source = template.split(/(\{\w+\})/).map((part) => {
      const hole = /^\{(\w+)\}$/.exec(part)
      if (!hole) return escape(part)
      names.push(hole[1] as string)
      return '([\\s\\S]+?)'
    }).join('')
    return { key: entry.key, pattern: new RegExp(`^${source}$`), names, holes: entry.holes ?? {} }
  })
  return compiled
}

/** Spanish rendering of a canonical English message, or null when the text is not one of them. */
export function translateMissionMessage(text: string): string | null {
  const notice = translateComposerNotice(text)
  if (notice !== null) return notice
  for (const item of templates()) {
    const match = item.pattern.exec(text)
    if (!match) continue
    const vars: Record<string, string> = {}
    let ok = true
    item.names.forEach((name, index) => {
      const converted = (item.holes[name] ?? keep)(match[index + 1] ?? '')
      if (converted === null) ok = false
      else vars[name] = converted
    })
    if (ok) return tMission.in('es')(item.key, vars)
  }
  return null
}

registerMessageTranslator(translateMissionMessage)
