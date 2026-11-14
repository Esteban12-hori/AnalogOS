/**
 * Textos del armazón de la primera pantalla. Los usan App.tsx y el plugin de Vite
 * que los escribe en index.html, para que el hero se pinte antes de que cargue la app.
 */
export const SHELL_TEXT = {
  bannerLoading: 'CARGANDO SNAPSHOT VALIDADO…',
  brand: 'AnalogOS Chile',
  brandTagline: 'Earth analog decision system',
  versionLoading: 'Cargando…',
  heroKicker: 'Snapshot científico',
  heroTitle: 'No buscamos un lugar que “parezca Marte”.',
  heroLead:
    '¿Qué zona reproduce mejor condiciones relevantes para percepción, tracción, navegación y autonomía de rover? Elige un sector en el mapa.',
} as const

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Marcado estático equivalente al primer render de App (sin datos, sin navbar WebGL). */
export function staticShellHtml(): string {
  const t = SHELL_TEXT
  return (
    '<div class="app-shell">' +
    '<div class="map-stage" aria-hidden="true"></div>' +
    `<div class="fixture-banner science-banner" role="status"><span></span>${escape(t.bannerLoading)}</div>` +
    '<header class="topbar"><div class="brand-block"><div class="brand-mark" aria-hidden="true"></div>' +
    `<div><strong>${escape(t.brand)}</strong><small>${escape(t.brandTagline)}</small></div></div>` +
    `<div class="lq-nav-placeholder" aria-hidden="true"></div><div class="version-block"><span class="status-dot"></span>${escape(t.versionLoading)}</div></header>` +
    '<main id="workspace" class="hero"><section class="hero-intro glass" aria-labelledby="hero-title">' +
    `<span class="section-kicker">${escape(t.heroKicker)}</span><h1 id="hero-title">${escape(t.heroTitle)}</h1><p>${escape(t.heroLead)}</p>` +
    '</section></main></div>'
  )
}
