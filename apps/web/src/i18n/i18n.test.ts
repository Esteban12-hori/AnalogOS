// ADR-017 base: English by default, EN | ES selector, Spanish as a presentation layer only.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { loadTrustedBundle } from '../../../../server/ai/facts'
import { PRODUCT_PROMISE } from '../App'
import { staticShellHtml, staticShellText } from '../content/shell'
import * as domainFormatting from '../domain/formatting'
import { bootLines, chipText, INITIAL_MILESTONES, snapshotAnnouncement } from '../features/boot/bootModel'
import { headScript, staticDictionaries } from '../features/boot/loadingHints'
import { buildMissionExport, canonicalJson, evaluateMission } from '../mission'
import type { AppData } from '../shell/appData'
import { AppShell } from '../shell/AppShell'
import { dataAttributionText } from '../shell/attribution'
import { CASES } from '../tests/legacyCases'
import {
  DEFAULT_LOCALE, formatArea, formatDecimal, formatInteger, formatList, formatPercent, formatScore, formatScorePercent, getLocale, interpolate,
  LanguageSwitch, LOCALE_STORAGE_KEY, parseLocale, placeholdersOf, resolveInitialLocale, setLocale, subscribeLocale, type Locale, type Message,
} from './index'
import { tBoot } from './messages/boot'
import { tShell } from './messages/shell'
import { knownSpanishLang, originalWordingMark, scienceText, scienceTexts, unitDescriptionGloss, unitNameGloss } from './science'
import { displayVerificationText } from './recordText'
import { localeHeadScript, staticLocaleScript } from './staticHtml'

const quiet = { persist: false, updateUrl: false } as const
const loading: AppData = { status: 'loading', snapshot: null, visual: { status: 'loading' }, error: null }

// ---- Locale store ---------------------------------------------------------------------------------------------------

describe('locale: English by default, URL > localStorage > English', () => {
  it('starts in English and parses only en/es', () => {
    expect(DEFAULT_LOCALE).toBe('en')
    expect(getLocale()).toBe('en')
    expect(parseLocale(' ES ')).toBe('es')
    expect(parseLocale('es-CL')).toBeNull()
    expect(parseLocale(null)).toBeNull()
  })

  it('resolves the start-up language with the documented priority', () => {
    expect(resolveInitialLocale('', null)).toBe('en')
    expect(resolveInitialLocale('', 'es')).toBe('es')
    expect(resolveInitialLocale('?lang=en', 'es')).toBe('en')
    expect(resolveInitialLocale('?lang=es', null)).toBe('es')
    expect(resolveInitialLocale('?lang=fr', 'es')).toBe('es')
    expect(resolveInitialLocale('?modo=mision&lang=ES', 'en')).toBe('es')
    expect(resolveInitialLocale('?lang=xx', 'garbage')).toBe('en')
  })

  describe('setLocale with a minimal browser', () => {
    const g = globalThis as Record<string, unknown>
    afterEach(() => {
      delete g.window
      delete g.document
    })
    function browser(search: string, storage: 'throws' | Record<string, string> = {}) {
      const replaced: string[] = []
      const html = { lang: 'en' }
      g.document = { documentElement: html }
      g.window = {
        location: { pathname: '/app/', search, hash: '#x' },
        history: { state: null, replaceState: (_s: unknown, _t: string, url: string) => replaced.push(url) },
        localStorage: {
          getItem: (key: string) => (storage === 'throws' ? (() => { throw new Error('blocked') })() : storage[key] ?? null),
          setItem: (key: string, value: string) => {
            if (storage === 'throws') throw new Error('blocked')
            storage[key] = value
          },
        },
      }
      return { replaced, html, storage }
    }

    it('persists the choice, sets <html lang> and notifies subscribers once per change', () => {
      const { html, storage, replaced } = browser('')
      let calls = 0
      const off = subscribeLocale(() => calls++)
      setLocale('es')
      setLocale('es')
      off()
      expect(getLocale()).toBe('es')
      expect(html.lang).toBe('es')
      expect(storage).toEqual({ [LOCALE_STORAGE_KEY]: 'es' })
      expect(calls).toBe(1)
      // Without ?lang= the URL stays clean.
      expect(replaced).toEqual([])
    })

    it('rewrites ?lang= when the URL carries it (the URL wins on reload)', () => {
      const { replaced } = browser('?modo=mision&lang=en')
      setLocale('es')
      expect(replaced).toEqual(['/app/?modo=mision&lang=es#x'])
    })

    it('works without storage (private mode, file://): the choice lasts for the session', () => {
      const { html } = browser('', 'throws')
      expect(() => setLocale('es')).not.toThrow()
      expect(getLocale()).toBe('es')
      expect(html.lang).toBe('es')
    })
  })
})

// ---- Catalogs -------------------------------------------------------------------------------------------------------

type AnyTranslator = { catalog: Record<Locale, Record<string, Message>> }
const catalogs = Object.entries(import.meta.glob<Record<string, unknown>>('./messages/*.ts', { eager: true })).flatMap(([file, mod]) =>
  Object.entries(mod)
    .filter((entry): entry is [string, AnyTranslator] => typeof entry[1] === 'function' && 'catalog' in (entry[1] as object))
    .map(([name, translator]) => ({ name: `${file}:${name}`, catalog: translator.catalog })),
)

describe('catalogs: same keys, shape and placeholders in en and es (every area, discovered automatically)', () => {
  it('finds the base catalogs', () => {
    expect(catalogs.map((c) => c.name)).toEqual(expect.arrayContaining(['./messages/shell.ts:tShell', './messages/boot.ts:tBoot']))
  })
  for (const { name, catalog } of catalogs) {
    it(name, () => {
      expect(Object.keys(catalog.es).sort()).toEqual(Object.keys(catalog.en).sort())
      for (const [key, en] of Object.entries(catalog.en)) {
        const es = catalog.es[key]
        expect(typeof es, `${key}: same shape`).toBe(typeof en)
        expect(placeholdersOf(es), `${key}: same placeholders`).toEqual(placeholdersOf(en))
        const texts = typeof es === 'string' ? [es] : [es.one, es.other]
        for (const text of texts) expect(text.trim().length, `${key}: not empty`).toBeGreaterThan(0)
      }
    })
  }
})

describe('t(): interpolation and plurals', () => {
  it('interpolates, formats numbers for the language without grouping and leaves missing variables visible', () => {
    expect(interpolate('{a} of {b}', { a: 2.5, b: 2024 }, 'en')).toBe('2.5 of 2024')
    expect(interpolate('{a} of {b}', { a: 2.5, b: 2024 }, 'es')).toBe('2,5 of 2024')
    expect(interpolate('Hello {name}', {}, 'en')).toBe('Hello {name}')
  })
  it('chooses one/other and follows the current language', () => {
    expect(tBoot.in('en')('chip.candidates', { count: 1 })).toBe('1 candidate')
    expect(tBoot.in('es')('chip.candidates', { count: 0 })).toBe('0 candidatos')
    expect(tShell('mode.explore')).toBe('Explore')
    setLocale('es', quiet)
    expect(tShell('mode.explore')).toBe('Explorar')
  })
})

// ---- Formatting (UI only) -------------------------------------------------------------------------------------------

describe('formatters: en-US output identical to the current UI, es-CL as before ADR-016', () => {
  it('English is byte-identical to domain/formatting.ts (owners can delegate without changing English text)', () => {
    for (const x of [0, 0.05, 49.99, 77.45, 1234.56, 12345.4, 1e6]) {
      expect(formatScore(x, 'en')).toBe(domainFormatting.formatScore(x))
      expect(formatDecimal(x, 'en')).toBe(domainFormatting.formatDecimal(x))
      expect(formatInteger(x, 'en')).toBe(domainFormatting.formatWhole(x))
      expect(formatArea(x + 1, 'en')).toBe(domainFormatting.formatArea(x + 1))
      expect(formatPercent(x / 100, 'en')).toBe(domainFormatting.formatPercent(x / 100))
    }
  })
  it('Spanish uses decimal comma, es-CL grouping and a space before %', () => {
    expect(formatScore(49.99, 'es')).toBe('50,0')
    expect(formatDecimal(1234.56, 'es')).toBe('1.234,6')
    expect(formatDecimal(12345.4, 'es')).toBe('12.345,4')
    expect(formatPercent(0.949, 'es')).toBe('94,9 %')
    expect(formatScorePercent(94.87, 'en')).toBe('94.9%')
    expect(formatScorePercent(null, 'es')).toBe('—')
    expect(formatList(['A', 'B', 'C'], 'es')).toBe('A, B y C')
    expect(formatList(['A', 'B', 'C'], 'en')).toBe('A, B, and C')
  })
})

// ---- Selector -------------------------------------------------------------------------------------------------------

describe('EN | ES selector: accessible group in the top bar', () => {
  it('named group, two toggle buttons with lang, aria-pressed and their own names', () => {
    const html = renderToStaticMarkup(createElement(LanguageSwitch))
    expect(html).toMatch(/^<div class="lang-switch" role="group" aria-label="Language">/)
    expect(html).toContain('<button type="button" class="lang-option" lang="en" aria-pressed="true" aria-label="English" title="English">EN</button>')
    expect(html).toContain('<button type="button" class="lang-option" lang="es" aria-pressed="false" aria-label="Español" title="Español">ES</button>')
    setLocale('es', quiet)
    const es = renderToStaticMarkup(createElement(LanguageSwitch))
    expect(es).toContain('aria-label="Idioma"')
    expect(es).toContain('lang="es" aria-pressed="true"')
  })

  it('lives in the top bar next to the status and the logo; ≥44 px touch target and visible focus', () => {
    const html = renderToStaticMarkup(createElement(AppShell, { data: loading }))
    const bar = html.slice(html.indexOf('<header class="topbar"'), html.indexOf('</header>'))
    expect(bar).toContain('class="brand-mark"')
    expect(bar).toMatch(/<div class="topbar-end"><div class="topbar-status"[^>]*>.*<\/div><div class="lang-switch" role="group"/)
    const css = readFileSync(resolve(__dirname, 'language-switch.css'), 'utf8')
    expect(css).toMatch(/\.lang-option:focus-visible \{ outline: var\(--focus-ring\)/)
    expect(css).toMatch(/@media \(pointer: coarse\) \{\s*\.lang-option \{ min-width: 44px; \}/)
    expect(css).toContain('height: max(100%, 44px)')
  })

  it('the whole bar follows the language; English stays exactly as before', () => {
    const en = renderToStaticMarkup(createElement(AppShell, { data: loading }))
    expect(en).toContain('PRELIMINARY SCIENTIFIC SCREENING · REAL DATA · NOT A TERRAIN AUTHORIZATION')
    expect(en).toContain('<h1 class="sr-only">AnalogOS · Chile–Argentina pilot</h1>')
    expect(en).toContain('aria-label="Mode"')
    setLocale('es', quiet)
    const es = renderToStaticMarkup(createElement(AppShell, { data: loading }))
    expect(es).toContain('SCREENING CIENTÍFICO PRELIMINAR · DATOS REALES · NO ES AUTORIZACIÓN DE TERRENO')
    expect(es).toContain('<h1 class="sr-only">AnalogOS · Piloto Chile–Argentina</h1>')
    expect(es).toContain('aria-label="Modo"')
    expect(es).toContain('>Explorar<')
    expect(es).toContain('Cargando snapshot validado…')
  })
})

// ---- Boot texts and static HTML ---------------------------------------------------------------------------------------

describe('boot texts and the static shell in both languages', () => {
  it('log, chip and announcement in Spanish keep the wording used before ADR-016', () => {
    expect(bootLines(INITIAL_MILESTONES, null, null, 'es').map((l) => l.text)).toEqual(['Snapshot científico · validando', 'Globo 3D · cargando', 'Imagen NASA Blue Marble nítida'])
    expect(chipText({ status: 'ready', version: 'science-screening-v3', evaluated: 6, references: 1, pendingAnalogs: 7 }, 'es')).toBe('Snapshot v3 · 6 candidatos · 1 REF · 7 ◆ por calcular')
    expect(chipText({ status: 'ready', version: 'science-screening-v2', evaluated: 1, pendingAnalogs: 8 }, 'es')).toBe('Snapshot v2 · 1 evaluado · 8 por calcular')
    expect(snapshotAnnouncement('science-screening-v3', 6, 1, 'es')).toBe('Snapshot científico v3 validado: 6 candidatos y 1 referencia conocida.')
    expect(snapshotAnnouncement('science-screening-v3', 6, 1, 'en')).toBe('Scientific snapshot v3 validated: 6 candidates and 1 known reference.')
    expect(chipText({ status: 'ready', version: 'science-screening-v2', evaluated: 3, pendingAnalogs: 8 }, 'en')).toBe('Snapshot v2 · 3 evaluated · 8 not yet calculated')
  })

  it('attribution: source names are kept, the label follows the language', () => {
    const manifest = { datasets: [{ provider: 'NASA', product: 'NASADEM' }] } as Parameters<typeof dataAttributionText>[0]
    expect(dataAttributionText(manifest, 'en')).toBe('Data: NASADEM')
    expect(dataAttributionText(manifest, 'es')).toBe('Datos: NASADEM')
  })

  it('the HTML is English and every data-i18n key has a Spanish text', () => {
    const html = staticShellHtml({ credit: 'Data: NASADEM', locale: 'en' })
    const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1])
    const es = staticShellText('es')
    expect(keys.length).toBeGreaterThan(8)
    for (const key of keys) expect(es[key], key).toBeTruthy()
    expect(html).toContain('<div class="lang-switch" aria-hidden="true"><span class="lang-option" lang="en" data-lang-option="en" data-selected="">EN</span>')
    expect(staticShellHtml({ locale: 'es' })).toContain('Describe la prueba que quieres hacer para Marte…')
  })

  /** Minimal DOM for the inline scripts: a tiny tree of the static HTML, elements found by attribute or class. */
  function fakeDocument(html: string, lang: string) {
    type Text = { nodeType: 3; nodeValue: string }
    type El = { nodeType: 1; attrs: Record<string, string>; children: Array<El | Text> }
    const root: El = { nodeType: 1, attrs: {}, children: [] }
    const elements: El[] = []
    const stack: El[] = [root]
    const VOID = new Set(['img', 'source', 'meta', 'br', 'input', 'link'])
    for (const m of html.matchAll(/<(\/?)(\w+)([^>]*)>|([^<]+)/g)) {
      const parent = stack[stack.length - 1]
      if (m[4] !== undefined) {
        parent.children.push({ nodeType: 3, nodeValue: m[4] })
      } else if (m[1]) {
        stack.pop()
      } else {
        const attrs: Record<string, string> = {}
        for (const a of m[3].matchAll(/([\w-]+)="([^"]*)"/g)) attrs[a[1]] = a[2]
        const el: El = { nodeType: 1, attrs, children: [] }
        parent.children.push(el)
        elements.push(el)
        if (!VOID.has(m[2])) stack.push(el)
      }
    }
    const text = (e: El | Text): string => (e.nodeType === 3 ? e.nodeValue : e.children.map(text).join(''))
    const meta = { content: 'English description', setAttribute(_: string, v: string) { this.content = v } }
    const wrap = (e: El) => ({
      get lastChild() { return e.children[e.children.length - 1] ?? null },
      getAttribute: (name: string) => e.attrs[name] ?? null,
      setAttribute: (name: string, value: string) => { e.attrs[name] = value },
      removeAttribute: (name: string) => { delete e.attrs[name] },
      set textContent(v: string) { e.children = [{ nodeType: 3, nodeValue: v }] },
    })
    const document = {
      documentElement: { lang },
      querySelectorAll: (selector: string) => {
        const attr = /^\[([\w-]+)\]$/.exec(selector)?.[1]
        const cls = /^\.([\w-]+)$/.exec(selector)?.[1]
        return elements.filter((e) => (attr ? attr in e.attrs : cls ? (e.attrs.class ?? '').split(' ').includes(cls) : false)).map(wrap)
      },
      querySelector: (selector: string) => (selector === 'meta[name="description"]' ? meta : null),
    }
    return { document, elements, meta, text }
  }

  it('the <head> script sets <html lang> with the same rule as the store, before the boot script', () => {
    const run = (search: string, stored: string | null | 'throws') => {
      const documentElement = { lang: 'en' }
      const localStorage = { getItem: () => { if (stored === 'throws') throw new Error('blocked'); return stored } }
      new Function('document', 'location', 'localStorage', 'URLSearchParams', localeHeadScript())({ documentElement }, { search }, localStorage, URLSearchParams)
      return documentElement.lang
    }
    expect(run('', null)).toBe('en')
    expect(run('', 'es')).toBe('es')
    expect(run('?lang=en', 'es')).toBe('en')
    expect(run('?lang=ES', null)).toBe('es')
    expect(run('?lang=fr', 'throws')).toBe('en')
    const full = headScript('function baseStageInsets(){return{top:0,bottom:0,left:0,right:0}}', 'function posterLayout(){return{left:0,top:0,size:1}}')
    expect(full.indexOf('documentElement.lang')).toBeLessThan(full.indexOf('data-boot'))
    // The concatenated script runs both parts (the “;” between IIFEs).
    const attrs: Record<string, string> = {}
    const documentElement = { lang: 'en', style: { setProperty: () => undefined }, setAttribute: (k: string, v: string) => (attrs[k] = v) }
    new Function('document', 'location', 'localStorage', 'sessionStorage', 'URLSearchParams', 'innerWidth', 'innerHeight', 'addEventListener', full)(
      { documentElement }, { search: '?lang=es' }, { getItem: () => null }, { getItem: () => null }, URLSearchParams, 1440, 900, () => undefined,
    )
    expect(documentElement.lang).toBe('es')
    expect(attrs['data-boot']).toBe('normal')
  })

  it('the script after #root applies Spanish to the static shell before React (and leaves English alone)', () => {
    const credit = (locale: Locale) => (locale === 'es' ? 'Datos: NASADEM' : 'Data: NASADEM')
    const dictionaries = staticDictionaries(credit)
    const html = staticShellHtml({ credit: 'Data: NASADEM', locale: 'en' })
    const es = fakeDocument(html, 'es')
    new Function('document', staticLocaleScript(dictionaries))(es.document)
    const byKey = (key: string) => es.elements.filter((e) => e.attrs['data-i18n'] === key).map(es.text)
    expect(byKey('modeExplore')).toEqual(['Explorar'])
    expect(byKey('tagline')).toEqual(['Piloto Chile–Argentina'])
    expect(byKey('scienceNote')).toEqual(['SCREENING CIENTÍFICO PRELIMINAR · DATOS REALES · NO ES AUTORIZACIÓN DE TERRENO'])
    expect(byKey('composerPrompt')).toEqual(['Describe la prueba que quieres hacer para Marte…', 'Describe la prueba que quieres hacer para Marte…'])
    // Glyph spans stay: only the last text node changes (no layout shift).
    expect(byKey('boot.snapshot')).toEqual(['•Snapshot científico · validando'])
    expect(byKey('status')).toEqual(['Cargando snapshot validado…', 'Cargando snapshot validado…', 'Cargando snapshot validado…'])
    expect(es.elements.filter((e) => e.attrs.class === 'stage-data-credit').map(es.text)).toEqual(['Datos: NASADEM'])
    expect(es.elements.find((e) => e.attrs['data-lang-option'] === 'es')?.attrs['data-selected']).toBe('')
    expect(es.elements.find((e) => e.attrs['data-lang-option'] === 'en')?.attrs['data-selected']).toBeUndefined()
    expect(es.meta.content).toBe(tShell.in('es')('meta.description'))

    const en = fakeDocument(html, 'en')
    new Function('document', staticLocaleScript(dictionaries))(en.document)
    expect(en.elements.filter((e) => e.attrs['data-i18n'] === 'modeExplore').map(en.text)).toEqual(['Explore'])
    expect(en.meta.content).toBe('English description')
  })

  it('the product promise in the catalog is the English source text of App.tsx', () => {
    expect(tShell.in('en')('app.promise')).toBe(PRODUCT_PROMISE)
    expect(tShell.in('es')('app.promise')).toMatch(/^Prioriza qué sectores merecen reconocimiento/)
  })

  it('index.html declares English and its description is the catalog text', () => {
    const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8')
    expect(html).toContain('<html lang="en">')
    expect(html.replace(/\s+/g, ' ')).toContain(`content="${tShell.in('en')('meta.description')}"`)
  })
})

// ---- Science and records ------------------------------------------------------------------------------------------------

describe('science text and records follow the language without changing the data', () => {
  const warning = 'SCREENING CIENTÍFICO: prioriza reconocimiento; no aprueba el sitio, no garantiza seguridad y no autoriza acceso.'

  it('artifact text: English rendering in en, the original Spanish in es (no gloss, no original-wording mark)', () => {
    expect(scienceText(warning, 'en')).toMatch(/^SCIENTIFIC SCREENING/)
    expect(scienceText(warning, 'es')).toBe(warning)
    expect(scienceTexts([warning], 'es')).toEqual([warning])
    expect(unitNameGloss('Formación Geste', 'en')).toBe('Geste Formation')
    expect(unitNameGloss('Formación Geste', 'es')).toBeNull()
    expect(unitDescriptionGloss('grava,arena,limo', 'es')).toBeNull()
    expect(originalWordingMark('es')).toBe('')
    expect(originalWordingMark('en')).not.toBe('')
    expect(knownSpanishLang('en')).toBe('es')
    expect(knownSpanishLang('es')).toBeUndefined()
  })

  it('verification items: field checks are source text, generated instructions are record text', () => {
    const fc = { id: 'cl-x|fc|0', site_id: 'cl-x', text: 'Verificar pendiente local en terreno.' }
    const req = { id: 'cl-x|req|slope', site_id: 'cl-x', text: 'Obtain a measurement of “Pendiente ≤ 3°” at the required scale.' }
    expect(displayVerificationText(fc, 'es')).toBe(fc.text)
    expect(displayVerificationText(req, 'es')).toBe('Obtener una medición de «Pendiente ≤ 3°» a la escala requerida.')
    expect(displayVerificationText(req, 'en')).toBe(req.text)
  })

  it('records and exports are byte-identical in English and Spanish (1.1.0, never the interface language)', () => {
    const bundle = loadTrustedBundle()
    const request = CASES.sector_cl_partial
    const build = () => {
      const evaluation = evaluateMission(request, bundle)
      return canonicalJson(buildMissionExport(request, evaluation, bundle))
    }
    const en = build()
    setLocale('es', quiet)
    const es = build()
    expect(es).toBe(en)
    expect(JSON.parse(es).export_version).toBe('1.1.0')
  })
})
