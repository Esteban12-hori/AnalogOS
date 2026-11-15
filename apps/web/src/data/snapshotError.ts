/**
 * Snapshot loading errors (docs/I18N.md §4.6, §11). The loader writes canonical English (state and console never
 * depend on the language); the error screen maps the loader's own messages to the interface language when it shows
 * them. Any other detail (contract validation, network errors raised by the browser) is technical, English, and is
 * shown as is, marked `lang="en"` inside a Spanish page.
 */
import type { Locale } from '../i18n/core'
import { tShell } from '../i18n/messages/shell'

const en = tShell.in('en')
const KEYS = ['app.unknownError', 'app.loadFailed', 'app.outlineInvalid'] as const

/** Canonical English of a loader message. */
export const snapshotLoadFailed = (path: string, status: number): string => en('app.loadFailed', { path, status })
export const SNAPSHOT_OUTLINE_INVALID: string = en('app.outlineInvalid')
export const SNAPSHOT_UNKNOWN_ERROR: string = en('app.unknownError')

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** English templates compiled once: `{name}` holes become captures, in order. */
const PATTERNS = KEYS.map((key) => {
  const template = tShell.catalog.en[key]
  if (typeof template !== 'string') throw new Error(`snapshotError: ${key} is not a text message.`)
  const names: string[] = []
  const source = template.split(/(\{\w+\})/).map((part) => {
    const hole = /^\{(\w+)\}$/.exec(part)
    if (!hole) return escape(part)
    names.push(hole[1] as string)
    return '([\\s\\S]+?)'
  }).join('')
  return { key, names, pattern: new RegExp(`^${source}$`) }
})

export interface SnapshotErrorView {
  text: string
  /** 'en' when a technical detail is shown untranslated inside a non-English interface. */
  lang?: 'en'
}

export function displaySnapshotError(message: string, locale: Locale): SnapshotErrorView {
  if (locale === 'en') return { text: message }
  for (const { key, names, pattern } of PATTERNS) {
    const match = pattern.exec(message)
    if (!match) continue
    const vars: Record<string, string> = {}
    names.forEach((name, index) => { vars[name] = match[index + 1] ?? '' })
    return { text: tShell.in(locale)(key, vars) }
  }
  return { text: message, lang: 'en' }
}
