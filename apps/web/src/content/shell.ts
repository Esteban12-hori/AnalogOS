/**
 * Armazón estático de la primera pantalla. Lo escribe en index.html el plugin loadingHints
 * (features/boot/loadingHints.ts) para que barra, dock y bandeja se pinten antes de que
 * cargue la app; React lo reemplaza al montar con las mismas cajas (CLS 0).
 * Debe reflejar shell/AppShell.tsx: mismas clases y alturas reservadas (shell/shell.css).
 */
export const SHELL_TEXT = {
  brand: 'AnalogOS Chile',
  brandTagline: 'Earth analog decision system',
  statusLoading: 'Cargando snapshot validado…',
  scienceNote: 'SCREENING CIENTÍFICO PRELIMINAR · DATOS REALES · NO ES AUTORIZACIÓN DE TERRENO',
  scienceNoteShort: 'PRELIMINAR · NO AUTORIZA TERRENO',
  composerPrompt: 'Describe el trabajo que quieres probar para Marte…',
} as const

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Marcado estático equivalente al primer render de AppShell (sin datos ni interacción). */
export function staticShellHtml(): string {
  const t = SHELL_TEXT
  const loading = `<div class="place-stub" aria-busy="true"><p class="place-stub-note">${escape(t.statusLoading)}</p></div>`
  const pill = `<span class="composer-pill"><span aria-hidden="true">✦</span><span class="composer-pill-text">${escape(t.composerPrompt)}</span><kbd aria-hidden="true">/</kbd></span>`
  return (
    '<div class="app" data-static="" data-mode="explorar">' +
    '<div class="stage"><div class="map-stage" aria-hidden="true"></div></div>' +
    '<header class="topbar">' +
    `<div class="brand"><span class="brand-mark" aria-hidden="true"></span><span class="brand-text"><strong>${escape(t.brand)}</strong><small>${escape(t.brandTagline)}</small></span></div>` +
    '<div class="mode-tabs" aria-hidden="true"><span class="mode-thumb" data-mode="explorar"></span>' +
    '<span class="mode-static" data-selected="">Explorar</span><span class="mode-static">Misión</span></div>' +
    `<div class="topbar-status"><span class="status-chip" data-state="loading"><span class="status-dot"></span>${escape(t.statusLoading)}</span></div>` +
    `<p class="science-note" role="note"><span aria-hidden="true"></span><span class="note-long">${escape(t.scienceNote)}</span><span class="note-short" aria-hidden="true">${escape(t.scienceNoteShort)}</span></p>` +
    '</header>' +
    `<section class="dock"><div class="dock-places">${loading}</div><div class="dock-composer">${pill}</div></section>` +
    '<section class="sheet" data-detent="S0"><div class="sheet-grip"><span class="sheet-handle"><span></span></span></div>' +
    `<div class="sheet-body"><div class="sheet-tray"><div class="sheet-tray-places">${loading}</div><div class="sheet-tray-composer">${pill}</div></div></div></section>` +
    '</div>'
  )
}
