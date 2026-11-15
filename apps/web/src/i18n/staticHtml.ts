/**
 * Inline scripts of index.html for the language, before React (docs/I18N.md §8). Runs in Node (loadingHints plugin):
 * no DOM. Both scripts apply the SAME rule as i18n/locale.ts (`?lang=` > localStorage > English); i18n/i18n.test.ts
 * executes them with a minimal browser.
 *
 * 1. `localeHeadScript`, in the <head>: sets `<html lang>` before the first frame.
 * 2. `staticLocaleScript`, right after #root: when the language is not the one of the HTML (English), it replaces the
 *    text of the elements marked `data-i18n` (and of the few selectors whose markup is pinned by tests) with the
 *    dictionary of the chosen language, marks the option of the static selector (`data-lang-option`) and translates
 *    `<meta name="description">` (key `description`). It replaces only the last text node of each element: the
 *    structure does not change (CLS 0). Scripts add no `src`/`href` (scripts/package_release.py accepts the HTML).
 */
import { DEFAULT_LOCALE, LOCALE_QUERY_PARAM, LOCALE_STORAGE_KEY, LOCALES, type Locale } from './locale'

/** JSON safe inside <script>: no `</script>` or `<!--` possible. */
function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

/** Ends with “;” so that it can be concatenated before another IIFE without being read as a call. */
export function localeHeadScript(): string {
  return (
    `(function(){var a=${scriptJson(LOCALES)},l=${scriptJson(DEFAULT_LOCALE)},v=null;` +
    'function p(x){x=typeof x==="string"?x.trim().toLowerCase():"";return a.indexOf(x)<0?null:x}' +
    `try{v=p(new URLSearchParams(location.search).get(${scriptJson(LOCALE_QUERY_PARAM)}))}catch(e){}` +
    `if(!v)try{v=p(localStorage.getItem(${scriptJson(LOCALE_STORAGE_KEY)}))}catch(e){}` +
    'if(v)l=v;document.documentElement.lang=l})();'
  )
}

/** Per language: texts by `data-i18n` key (plus `description`) and texts by CSS selector. */
export interface StaticDictionary {
  readonly keys: Readonly<Record<string, string>>
  readonly selectors?: Readonly<Record<string, string>>
}
export type StaticDictionaries = Partial<Record<Locale, StaticDictionary>>

export function staticLocaleScript(dictionaries: StaticDictionaries): string {
  return (
    `(function(){var d=document,l=d.documentElement.lang,D=${scriptJson(dictionaries)},m=Object.prototype.hasOwnProperty.call(D,l)?D[l]:null,n,i,e,v,k;` +
    'function s(e,v){var c=e.lastChild;if(c&&c.nodeType===3)c.nodeValue=v;else e.textContent=v}' +
    'n=d.querySelectorAll("[data-lang-option]");' +
    'for(i=0;i<n.length;i++){e=n[i];if(e.getAttribute("data-lang-option")===l)e.setAttribute("data-selected","");else e.removeAttribute("data-selected")}' +
    'if(!m)return;n=d.querySelectorAll("[data-i18n]");' +
    'for(i=0;i<n.length;i++){e=n[i];v=m.keys[e.getAttribute("data-i18n")];if(typeof v==="string")s(e,v)}' +
    'if(m.selectors)for(k in m.selectors){n=d.querySelectorAll(k);for(i=0;i<n.length;i++)s(n[i],m.selectors[k])}' +
    'v=m.keys.description;e=d.querySelector(\'meta[name="description"]\');if(typeof v==="string"&&e)e.setAttribute("content",v)})();'
  )
}
