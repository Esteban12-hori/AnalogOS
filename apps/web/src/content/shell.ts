/**
 * Static scaffold of the first screen. The loadingHints plugin (features/boot/loadingHints.ts) writes it into index.html
 * so that the bar, dock, tray and boot layer are painted
 * before the app loads; React replaces it on mount with the same boxes (CLS 0).
. * It must mirror shell/AppShell.tsx (same classes and reserved heights, shell/shell.css), and the boot
 * layer must mirror features/boot/BootLayer.tsx (verified by tests/boot.test.ts).
. * This module also runs in Node (Vite configuration): no DOM.
 */
import { bootLines, INITIAL_MILESTONES, LINE_GLYPH } from '../features/boot/bootModel'

export const SHELL_TEXT = {
  brand: 'AnalogOS',
  brandTagline: 'Chile–Argentina pilot',
  statusLoading: 'Loading validated snapshot…',
  scienceNote: 'PRELIMINARY SCIENTIFIC SCREENING · REAL DATA · NOT A TERRAIN AUTHORIZATION',
  scienceNoteShort: 'PRELIMINARY · NOT A TERRAIN AUTHORIZATION',
  composerPrompt: 'Describe the Mars test you want to run…',
} as const

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface StaticShellOptions {
  /** URL of the globe poster (only ≥1100 px, via <source media>). Without it there is no poster. */
  posterUrl?: string
  /**
   * Snapshot data attribution ("Data: NASADEM · …", shell/attribution.ts), computed at
   * build time from its manifest: it is painted with the HTML, just like the React stage line.
   */
  credit?: string
}

/**
 * Pre-React boot layer (slot stage.overlay): poster (desktop) or CSS silhouette (mobile),
 * orbital ring with satellite and log with the milestones in their actual initial state. It is positioned with
 * the --boot-* variables written by the inline script in the <head>.
 */
export function staticBootHtml({ posterUrl }: StaticShellOptions = {}): string {
  const poster = posterUrl
    ? `<picture><source media="(min-width: 1100px)" srcset="${escape(posterUrl)}"><img class="boot-poster" alt="" fetchpriority="high" decoding="async"></picture>`
    : ''
  const lines = bootLines(INITIAL_MILESTONES)
    .map((line) => `<li data-s="${line.state}"><span>${LINE_GLYPH[line.state]}</span>${escape(line.text)}</li>`)
    .join('')
  return (
    `<div class="boot" data-phase="orbit" aria-hidden="true">${poster}<span class="boot-disc"></span>` +
    '<span class="boot-orbit"><span class="boot-wave"><span class="boot-ring"><span class="boot-sat"></span></span></span></span>' +
    `<ul class="boot-log">${lines}</ul></div>`
  )
}

/** Static markup equivalent to the first render of AppShell (no data or interaction). */
export function staticShellHtml(options: StaticShellOptions = {}): string {
  const t = SHELL_TEXT
  const loading = `<div class="place-stub" aria-busy="true"><p class="place-stub-note">${escape(t.statusLoading)}</p></div>`
  const pill = `<span class="composer-pill"><span class="composer-pill-text">${escape(t.composerPrompt)}</span><kbd aria-hidden="true">/</kbd></span>`
  return (
    '<div class="app" data-static="" data-mode="explorar">' +
    `<div class="stage"><div class="map-stage">${options.credit ? `<div class="stage-dock" data-static=""><p class="stage-data-credit">${escape(options.credit)}</p></div>` : ''}</div></div>` +
    `<div class="stage-overlay" data-slot="stage.overlay">${staticBootHtml(options)}</div>` +
    '<header class="topbar">' +
    `<div class="brand"><span class="brand-mark" aria-hidden="true"></span><span class="brand-text"><strong>${escape(t.brand)}</strong><small>${escape(t.brandTagline)}</small></span></div>` +
    '<div class="mode-tabs" aria-hidden="true"><span class="mode-thumb" data-mode="explorar"></span>' +
    '<span class="mode-static" data-selected="">Explore</span><span class="mode-static">Mission</span></div>' +
    `<div class="topbar-status"><span class="status-chip" data-state="loading"><span class="status-dot"></span>${escape(t.statusLoading)}</span></div>` +
    `<p class="science-note" role="note"><span aria-hidden="true"></span><span class="note-long">${escape(t.scienceNote)}</span><span class="note-short">${escape(t.scienceNoteShort)}</span></p>` +
    '</header>' +
    `<section class="dock"><div class="dock-places">${loading}</div><div class="dock-composer">${pill}</div></section>` +
    '<section class="sheet" data-detent="S0"><div class="sheet-grip"><span class="sheet-handle"><span></span></span></div>' +
    `<div class="sheet-body"><div class="sheet-tray"><div class="sheet-tray-places">${loading}</div><div class="sheet-tray-composer">${pill}</div></div></div></section>` +
    '</div>'
  )
}
