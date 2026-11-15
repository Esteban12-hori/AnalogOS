/**
 * Static scaffold of the first screen. The loadingHints plugin (features/boot/loadingHints.ts) writes it into index.html
 * so that the bar, dock, tray and boot layer are painted
 * before the app loads; React replaces it on mount with the same boxes (CLS 0).
. * It must mirror shell/AppShell.tsx (same classes and reserved heights, shell/shell.css), and the boot
 * layer must mirror features/boot/BootLayer.tsx (verified by tests/boot.test.ts).
. * This module also runs in Node (Vite configuration): no DOM.
 *
 * Language (docs/I18N.md §8): the HTML is written in English; every translatable text carries `data-i18n="<key>"` and
 * the inline script after #root (i18n/staticHtml.ts) applies the Spanish dictionary from `staticShellText('es')` before
 * React when the language is Spanish.
 */
import { bootLines, INITIAL_MILESTONES, LINE_GLYPH } from '../features/boot/bootModel'
import { getLocale, LOCALES, type Locale } from '../i18n/core'
import { tBoot } from '../i18n/messages/boot'
import { tShell } from '../i18n/messages/shell'

/** Shell texts in the current language (getters: read on use, never frozen at import time). */
export const SHELL_TEXT = {
  brand: 'AnalogOS',
  get brandTagline(): string {
    return tShell('brand.tagline')
  },
  get statusLoading(): string {
    return tBoot('chip.loading')
  },
  get scienceNote(): string {
    return tShell('scienceNote')
  },
  get scienceNoteShort(): string {
    return tShell('scienceNoteShort')
  },
  get composerPrompt(): string {
    return tShell('composerPrompt')
  },
}

/**
 * Texts of the static shell by `data-i18n` key in a language (plus `description` for <meta name="description">).
 * The build writes the English ones into the HTML and ships the other languages as dictionaries.
 */
export function staticShellText(locale: Locale): Record<string, string> {
  const shell = tShell.in(locale)
  const text: Record<string, string> = {
    tagline: shell('brand.tagline'),
    modeExplore: shell('mode.explore'),
    modeMission: shell('mode.mission'),
    status: tBoot.in(locale)('chip.loading'),
    scienceNote: shell('scienceNote'),
    scienceNoteShort: shell('scienceNoteShort'),
    composerPrompt: shell('composerPrompt'),
    description: shell('meta.description'),
  }
  for (const line of bootLines(INITIAL_MILESTONES, null, null, locale)) text[`boot.${line.id}`] = line.text
  return text
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface StaticShellOptions {
  /** URL of the globe poster (only ≥1100 px, via <source media>). Without it there is no poster. */
  posterUrl?: string
  /**
   * Snapshot data attribution ("Data: NASADEM · …", shell/attribution.ts), computed at
   * build time from its manifest: it is painted with the HTML, just like the React stage line.
   */
  credit?: string
  /** Language of the HTML (default: the current one). The build plugin writes English. */
  locale?: Locale
}

/**
 * Pre-React boot layer (slot stage.overlay): poster (desktop) or CSS silhouette (mobile),
 * orbital ring with satellite and log with the milestones in their actual initial state. It is positioned with
 * the --boot-* variables written by the inline script in the <head>.
 */
export function staticBootHtml({ posterUrl, locale = getLocale() }: StaticShellOptions = {}): string {
  const poster = posterUrl
    ? `<picture><source media="(min-width: 1100px)" srcset="${escape(posterUrl)}"><img class="boot-poster" alt="" fetchpriority="high" decoding="async"></picture>`
    : ''
  const lines = bootLines(INITIAL_MILESTONES, null, null, locale)
    .map((line) => `<li data-s="${line.state}" data-i18n="boot.${line.id}"><span>${LINE_GLYPH[line.state]}</span>${escape(line.text)}</li>`)
    .join('')
  return (
    `<div class="boot" data-phase="orbit" aria-hidden="true">${poster}<span class="boot-disc"></span>` +
    '<span class="boot-orbit"><span class="boot-wave"><span class="boot-ring"><span class="boot-sat"></span></span></span></span>' +
    `<ul class="boot-log">${lines}</ul></div>`
  )
}

/** Static (non-interactive) language selector: same box as i18n/LanguageSwitch.tsx, hidden from assistive tech. */
function staticLanguageSwitch(locale: Locale): string {
  const options = LOCALES.map(
    (option) => `<span class="lang-option" lang="${option}" data-lang-option="${option}"${option === locale ? ' data-selected=""' : ''}>${option.toUpperCase()}</span>`,
  ).join('')
  return `<div class="lang-switch" aria-hidden="true">${options}</div>`
}

/** Static markup equivalent to the first render of AppShell (no data or interaction). */
export function staticShellHtml(options: StaticShellOptions = {}): string {
  const locale = options.locale ?? getLocale()
  const t = staticShellText(locale)
  const loading = `<div class="place-stub" aria-busy="true"><p class="place-stub-note" data-i18n="status">${escape(t.status)}</p></div>`
  const pill = `<span class="composer-pill"><span class="composer-pill-text" data-i18n="composerPrompt">${escape(t.composerPrompt)}</span><kbd aria-hidden="true">/</kbd></span>`
  return (
    '<div class="app" data-static="" data-mode="explorar">' +
    `<div class="stage"><div class="map-stage">${options.credit ? `<div class="stage-dock" data-static=""><p class="stage-data-credit">${escape(options.credit)}</p></div>` : ''}</div></div>` +
    `<div class="stage-overlay" data-slot="stage.overlay">${staticBootHtml({ ...options, locale })}</div>` +
    '<header class="topbar">' +
    `<div class="brand"><span class="brand-mark" aria-hidden="true"></span><span class="brand-text"><strong>AnalogOS</strong><small data-i18n="tagline">${escape(t.tagline)}</small></span></div>` +
    '<div class="mode-tabs" aria-hidden="true"><span class="mode-thumb" data-mode="explorar"></span>' +
    `<span class="mode-static" data-selected="" data-i18n="modeExplore">${escape(t.modeExplore)}</span><span class="mode-static" data-i18n="modeMission">${escape(t.modeMission)}</span></div>` +
    `<div class="topbar-end"><div class="topbar-status"><span class="status-chip" data-state="loading" data-i18n="status"><span class="status-dot"></span>${escape(t.status)}</span></div>${staticLanguageSwitch(locale)}</div>` +
    `<p class="science-note" role="note"><span aria-hidden="true"></span><span class="note-long" data-i18n="scienceNote">${escape(t.scienceNote)}</span><span class="note-short" data-i18n="scienceNoteShort">${escape(t.scienceNoteShort)}</span></p>` +
    '</header>' +
    `<section class="dock"><div class="dock-places">${loading}</div><div class="dock-composer">${pill}</div></section>` +
    '<section class="sheet" data-detent="S0"><div class="sheet-grip"><span class="sheet-handle"><span></span></span></div>' +
    `<div class="sheet-body"><div class="sheet-tray"><div class="sheet-tray-places">${loading}</div><div class="sheet-tray-composer">${pill}</div></div></div></section>` +
    '</div>'
  )
}
