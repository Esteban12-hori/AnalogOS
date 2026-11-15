/**
 * Typed message catalogs per area (docs/I18N.md §3.2). One file per catalog, `i18n/messages/<name>.ts`, declares the
 * English source text and its Spanish translation together with `defineMessages`:
 *
 *   export const tShell = defineMessages({ en: { 'mode.explore': 'Explore' }, es: { 'mode.explore': 'Explorar' } })
 *
 * English is the reference and must be the current product text VERBATIM (English UI tests keep passing). The type
 * `Translation<M>` forces Spanish to have EXACTLY the same keys and shape (text or plural): a missing key, an extra key
 * or a plural written as text does not compile. Placeholder parity ({name}) is checked by i18n/i18n.test.ts.
 *
 * Each area imports only its catalogs, so text travels in the chunk of the feature that uses it (globe, mission and
 * reading stay deferred). No React: also used by pure functions and by the Vite plugin in Node.
 */
import { getLocale, INTL_LOCALE, type Locale } from './locale'

/** Simple plural: `one` when count = ±1, `other` otherwise (0 included), in en and es. */
export interface PluralMessage {
  readonly one: string
  readonly other: string
}

export type Message = string | PluralMessage
export type Messages = Readonly<Record<string, Message>>

/** Catalog of another language with the same keys and shape as the reference (English). */
export type Translation<M extends Messages> = { readonly [K in keyof M]: M[K] extends string ? string : PluralMessage }

/** Interpolation variables `{name}`. Numbers are formatted for the language (no grouping, ≤3 decimals). */
export type Vars = Readonly<Record<string, string | number>>

type VarsArg<M extends Messages, K extends keyof M> = M[K] extends PluralMessage
  ? [vars: Vars & { readonly count: number }]
  : [vars?: Vars]

/** `t` bound to one language. */
export type BoundTranslator<M extends Messages> = <K extends keyof M & string>(key: K, ...args: VarsArg<M, K>) => string

export interface Translator<M extends Messages> extends BoundTranslator<M> {
  /** `t` fixed to a language (static HTML, Node, tests): it does not read the current language. */
  in(locale: Locale): BoundTranslator<M>
  /** Raw catalogs (parity tests, tools). */
  readonly catalog: Readonly<Record<Locale, Readonly<Record<string, Message>>>>
}

const PLACEHOLDER = /\{(\w+)\}/g
const numberCache = new Map<Locale, Intl.NumberFormat>()

function formatVar(value: string | number, locale: Locale): string {
  if (typeof value === 'string') return value
  let format = numberCache.get(locale)
  if (!format) {
    // No thousands separator: a year (2024) or a numeric id must not come out as “2,024”.
    format = new Intl.NumberFormat(INTL_LOCALE[locale], { maximumFractionDigits: 3, useGrouping: false })
    numberCache.set(locale, format)
  }
  return format.format(value)
}

/** Replaces `{name}`; a missing variable stays visible as `{name}` (an obvious error, never silent). */
export function interpolate(template: string, vars: Vars | undefined, locale: Locale): string {
  if (!vars) return template
  return template.replace(PLACEHOLDER, (match, name: string) => {
    const value = vars[name]
    return value === undefined ? match : formatVar(value, locale)
  })
}

export function selectPlural(message: PluralMessage, count: number | undefined): string {
  return count !== undefined && Math.abs(count) === 1 ? message.one : message.other
}

/** Placeholders `{x}` of a message (text or plural), sorted and unique. */
export function placeholdersOf(message: Message): string[] {
  const text = typeof message === 'string' ? message : `${message.one} ${message.other}`
  return [...new Set([...text.matchAll(PLACEHOLDER)].map((match) => match[1] as string))].sort()
}

export function defineMessages<M extends Messages>(catalog: { readonly en: M; readonly es: Translation<NoInfer<M>> }): Translator<M> {
  const raw: Record<Locale, Readonly<Record<string, Message>>> = { en: catalog.en, es: catalog.es }
  const bound = new Map<Locale, BoundTranslator<M>>()

  function lookup(locale: Locale, key: string, vars: Vars | undefined): string {
    // Keys are guaranteed by the type; if something arrives untranslated (a cast), fall back to English, then the key.
    const message = raw[locale][key] ?? raw.en[key]
    if (message === undefined) return key
    const text = typeof message === 'string' ? message : selectPlural(message, typeof vars?.count === 'number' ? vars.count : undefined)
    return interpolate(text, vars, locale)
  }

  const inLocale = (locale: Locale): BoundTranslator<M> => {
    let fn = bound.get(locale)
    if (!fn) {
      fn = ((key: string, vars?: Vars) => lookup(locale, key, vars)) as BoundTranslator<M>
      bound.set(locale, fn)
    }
    return fn
  }

  // Keys and variables are typed by Translator<M>; at runtime everything is a string.
  const translator = Object.assign((key: string, vars?: Vars) => lookup(getLocale(), key, vars), { in: inLocale, catalog: raw })
  return translator as unknown as Translator<M>
}
