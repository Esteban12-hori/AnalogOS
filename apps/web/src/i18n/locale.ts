/**
 * Interface language (docs/I18N.md, ADR-017). Minimal external store without React or dependencies: used by the hooks
 * (i18n/react.ts), by pure functions that build display text and by the Vite plugin in Node.
 *
 * English is the source language and the default. Spanish is a PRESENTATION layer only: records, exports, contracts,
 * fingerprints, IDs and AI payloads never depend on the interface language (ADR-016 records stay 1.1.0 / wrapper 2).
 *
 * Start-up priority: `?lang=en|es` > localStorage (`analogos:lang`) > English. The inline <head> script applies the
 * same rule before React (i18n/staticHtml.ts; i18n/i18n.test.ts runs it).
 */

export type Locale = 'en' | 'es'

export const LOCALES: readonly Locale[] = ['en', 'es']
export const DEFAULT_LOCALE: Locale = 'en'
/** localStorage key: written only by an explicit choice in the selector. */
export const LOCALE_STORAGE_KEY = 'analogos:lang'
/** URL parameter that forces the language (shared links, tests). */
export const LOCALE_QUERY_PARAM = 'lang'
/** Name of each language in its own language (selector, announcements). */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = { en: 'English', es: 'Español' }
/** BCP 47 tag for Intl in the UI: en-US and the Chilean variant es-CL used by the product before ADR-016. */
export const INTL_LOCALE: Readonly<Record<Locale, string>> = { en: 'en-US', es: 'es-CL' }

/** “en”, “ES”, “ es ” → Locale; anything else (including “es-CL”) → null. */
export function parseLocale(value: string | null | undefined): Locale | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return normalized === 'en' || normalized === 'es' ? normalized : null
}

/** Pure start-up rule: URL > storage > English. */
export function resolveInitialLocale(search: string, stored: string | null): Locale {
  let fromUrl: Locale | null = null
  try {
    fromUrl = parseLocale(new URLSearchParams(search).get(LOCALE_QUERY_PARAM))
  } catch {
    fromUrl = null
  }
  return fromUrl ?? parseLocale(stored) ?? DEFAULT_LOCALE
}

function readStored(): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    // Private mode, file:// or blocked storage: the app works the same, without remembering.
    return null
  }
}

function writeStored(locale: Locale): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // No storage: the choice lasts for the session.
  }
}

/** Language for the current environment (browser) or the default one (Node, tests). */
export function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  let search = ''
  try {
    search = window.location?.search ?? ''
  } catch {
    search = ''
  }
  return resolveInitialLocale(search, readStored())
}

/** `<html lang>` always reflects the current language (screen readers, hyphenation, spell-checking). */
function syncDocumentLang(locale: Locale): void {
  if (typeof document === 'undefined' || !document.documentElement) return
  if (document.documentElement.lang !== locale) document.documentElement.lang = locale
}

/**
 * When the URL already carries `?lang=`, it is rewritten with replaceState so that reloading or sharing keeps the
 * choice (the URL wins over storage). Without the parameter the URL is left clean: storage decides.
 */
function syncUrl(locale: Locale): void {
  try {
    if (typeof window === 'undefined' || !window.history?.replaceState) return
    const { pathname, search, hash } = window.location
    const params = new URLSearchParams(search)
    if (!params.has(LOCALE_QUERY_PARAM) || params.get(LOCALE_QUERY_PARAM) === locale) return
    params.set(LOCALE_QUERY_PARAM, locale)
    window.history.replaceState(window.history.state, '', `${pathname}?${params.toString()}${hash}`)
  } catch {
    // No History API (test environments): nothing to rewrite.
  }
}

let current: Locale = detectInitialLocale()
syncDocumentLang(current)
const listeners = new Set<() => void>()

export function getLocale(): Locale {
  return current
}

export interface SetLocaleOptions {
  /** Remember in localStorage (default true: it is an explicit choice). */
  persist?: boolean
  /** Rewrite `?lang=` when the URL carries it (default true). */
  updateUrl?: boolean
}

export function setLocale(next: Locale, { persist = true, updateUrl = true }: SetLocaleOptions = {}): void {
  if (persist) writeStored(next)
  if (updateUrl) syncUrl(next)
  if (next === current) return
  current = next
  syncDocumentLang(next)
  for (const listener of [...listeners]) listener()
}

export function subscribeLocale(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
