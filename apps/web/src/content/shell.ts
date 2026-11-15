/**
 * Armazón estático de la primera pantalla. Lo escribe en index.html el plugin loadingHints
 * (features/boot/loadingHints.ts) para que barra, dock, bandeja y la capa de arranque se pinten
 * antes de que cargue la app; React lo reemplaza al montar con las mismas cajas (CLS 0).
 * Debe reflejar shell/AppShell.tsx (mismas clases y alturas reservadas, shell/shell.css) y la capa
 * de arranque debe reflejar features/boot/BootLayer.tsx (lo verifica tests/boot.test.ts).
 * Este módulo corre también en Node (configuración de Vite): sin DOM.
 */
import { bootLines, INITIAL_MILESTONES, LINE_GLYPH } from '../features/boot/bootModel'

export const SHELL_TEXT = {
  brand: 'AnalogOS',
  brandTagline: 'Piloto Chile–Argentina',
  statusLoading: 'Cargando snapshot validado…',
  scienceNote: 'SCREENING CIENTÍFICO PRELIMINAR · DATOS REALES · NO ES AUTORIZACIÓN DE TERRENO',
  scienceNoteShort: 'PRELIMINAR · NO AUTORIZA TERRENO',
  composerPrompt: 'Describe la prueba que quieres hacer para Marte…',
} as const

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export interface StaticShellOptions {
  /** URL del póster del globo (solo ≥1100 px, vía <source media>). Sin ella no hay póster. */
  posterUrl?: string
  /**
   * Atribución de datos del snapshot («Datos: NASADEM · …», shell/attribution.ts), calculada en el
   * build desde su manifiesto: se pinta con el HTML, igual que la línea del escenario de React.
   */
  credit?: string
}

/**
 * Capa de arranque previa a React (slot stage.overlay): póster (escritorio) o silueta CSS (móvil),
 * anillo orbital con satélite y bitácora con los hitos en su estado inicial real. Se posiciona con
 * las variables --boot-* que escribe el script en línea del <head>.
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

/** Marcado estático equivalente al primer render de AppShell (sin datos ni interacción). */
export function staticShellHtml(options: StaticShellOptions = {}): string {
  const t = SHELL_TEXT
  const loading = `<div class="place-stub" aria-busy="true"><p class="place-stub-note">${escape(t.statusLoading)}</p></div>`
  const pill = `<span class="composer-pill"><span aria-hidden="true">✦</span><span class="composer-pill-text">${escape(t.composerPrompt)}</span><kbd aria-hidden="true">/</kbd></span>`
  return (
    '<div class="app" data-static="" data-mode="explorar">' +
    `<div class="stage"><div class="map-stage">${options.credit ? `<div class="stage-dock" data-static=""><p class="stage-data-credit">${escape(options.credit)}</p></div>` : ''}</div></div>` +
    `<div class="stage-overlay" data-slot="stage.overlay">${staticBootHtml(options)}</div>` +
    '<header class="topbar">' +
    `<div class="brand"><span class="brand-mark" aria-hidden="true"></span><span class="brand-text"><strong>${escape(t.brand)}</strong><small>${escape(t.brandTagline)}</small></span></div>` +
    '<div class="mode-tabs" aria-hidden="true"><span class="mode-thumb" data-mode="explorar"></span>' +
    '<span class="mode-static" data-selected="">Explorar</span><span class="mode-static">Misión</span></div>' +
    `<div class="topbar-status"><span class="status-chip" data-state="loading"><span class="status-dot"></span>${escape(t.statusLoading)}</span></div>` +
    `<p class="science-note" role="note"><span aria-hidden="true"></span><span class="note-long">${escape(t.scienceNote)}</span><span class="note-short">${escape(t.scienceNoteShort)}</span></p>` +
    '</header>' +
    `<section class="dock"><div class="dock-places">${loading}</div><div class="dock-composer">${pill}</div></section>` +
    '<section class="sheet" data-detent="S0"><div class="sheet-grip"><span class="sheet-handle"><span></span></span></div>' +
    `<div class="sheet-body"><div class="sheet-tray"><div class="sheet-tray-places">${loading}</div><div class="sheet-tray-composer">${pill}</div></div></div></section>` +
    '</div>'
  )
}
