/**
 * React hooks for the language (docs/I18N.md §3). `useLocale` subscribes the component to the external store with
 * useSyncExternalStore: changing the language re-renders it. App.tsx subscribes at the root, so the whole tree renders
 * again; even so, every component that draws translated text must call `useLocale()` or `useT()` itself (memoized
 * children are not re-rendered by the root) and put `locale` in the dependencies of any `useMemo`/`useCallback`/
 * `useEffect` that produces text.
 */
import { useSyncExternalStore } from 'react'
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
