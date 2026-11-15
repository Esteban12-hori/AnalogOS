/**
 * React hooks for the language (docs/I18N.md §3). `useLocale` subscribes the component to the external store with
 * useSyncExternalStore: changing the language re-renders it. App.tsx subscribes at the root, so the whole tree renders
 * again; even so, every component that draws translated text must call `useLocale()` or `useT()` itself (memoized
 * children are not re-rendered by the root) and put `locale` in the dependencies of any `useMemo`/`useCallback`/
 * `useEffect` that produces text.
 */
import { useCallback, useState, useSyncExternalStore } from 'react'
import { getLocale, subscribeLocale, type Locale } from './locale'
import type { BoundTranslator, Messages, Translator } from './translate'

export function useLocale(): Locale {
  return useSyncExternalStore(subscribeLocale, getLocale, getLocale)
}

/**
 * The area's `t` bound to the current language. Its identity changes only when the language changes, so it can be a
 * dependency of `useMemo`/`useCallback`.
 */
export function useT<M extends Messages>(translator: Translator<M>): BoundTranslator<M> {
  return translator.in(useLocale())
}

/** Text of a live region together with the language it was written in. */
export interface LiveText {
  text: string
  locale: Locale
}

/** What a live region shows: its text only while the interface is still in the language it was written in. */
export function liveTextIn(entry: LiveText | null, locale: Locale): string {
  return entry !== null && entry.locale === locale ? entry.text : ''
}

/**
 * State for an `aria-live` region whose text is written once by an event (a step change, a carousel move). Canonical
 * state (§4.6) would re-translate it on a language change and announce it a second time; instead a language change
 * empties the region (the selector already announces the new language) and switching back never brings old text back.
 */
export function useLiveText(): readonly [string, (text: string) => void] {
  const locale = useLocale()
  const [entry, setEntry] = useState<LiveText | null>(null)
  // Adjusting state while rendering (React's documented pattern): the stale text is never committed.
  if (entry !== null && entry.locale !== locale) setEntry(null)
  const announce = useCallback((text: string) => setEntry(text === '' ? null : { text, locale: getLocale() }), [])
  return [liveTextIn(entry, locale), announce] as const
}
