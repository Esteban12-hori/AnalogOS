/**
 * Display of the canonical (English) messages kept in the mission state (ADR-017, docs/I18N.md §4.6). MAIN CHUNK:
 * the composer shows the draft message and the notices, so this module stays tiny and carries no message catalog.
 *
 * - The two notices the main chunk itself writes (the planner chunk could not be loaded; the geology context is still
 *   loading) are translated here with the `composer` catalog.
 * - Every other message is written by deferred code (planner state, mission controller, AI client, geometry
 *   validators), whose chunk imports mission/messages.ts; that module registers its translator here on load. A stored
 *   message therefore never exists before its translator.
 *
 * English returns the text unchanged; unknown text (technical details, server text, user and AI-drafted text) is
 * returned unchanged in Spanish too: nothing is translated on the fly.
 */
import { getLocale, type Locale } from '../i18n/core'
import { tComposer } from '../i18n/messages/composer'

type Translate = (text: string) => string | null

let translator: Translate | null = null

/** Called once by mission/messages.ts when the deferred chunk loads. */
export function registerMessageTranslator(translate: Translate): void {
  translator = translate
}

const COMPOSER_NOTICES = ['notice.loadFailed', 'notice.geologyLoading'] as const

/** Canonical English of the notices written by the main chunk. */
export const composerNotice = (key: (typeof COMPOSER_NOTICES)[number]): string => tComposer.in('en')(key)

/** Spanish rendering of a main-chunk notice, or null. */
export function translateComposerNotice(text: string): string | null {
  const key = COMPOSER_NOTICES.find((item) => composerNotice(item) === text)
  return key ? tComposer.in('es')(key) : null
}

const translateOne = (text: string): string | null => translateComposerNotice(text) ?? translator?.(text) ?? null

/**
 * Canonical message (planner issues, notices, errors, AI client messages, geometry validation, the deterministic
 * “the brief mentions …” question) as it must be SHOWN: unchanged in English; in Spanish the same message in Spanish,
 * or the original when it is not a known message. Issues joined with “ · ” are mapped one by one.
 */
export function displayMissionMessage(text: string, locale: Locale = getLocale()): string {
  if (locale !== 'es') return text
  const whole = translateOne(text)
  if (whole !== null) return whole
  if (!text.includes(' · ')) return text
  return text.split(' · ').map((part) => translateOne(part) ?? part).join(' · ')
}

export function displayMissionMessages(items: readonly string[], locale: Locale = getLocale()): string[] {
  return items.map((item) => displayMissionMessage(item, locale))
}
