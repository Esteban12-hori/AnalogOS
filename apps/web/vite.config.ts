import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { staticShellHtml } from './src/content/shell'

/**
 * Pistas de carga en index.html para cortar la cascada de red:
 * - preload de los JSON del snapshot y de los índices de imágenes: se piden en
 *   paralelo con el JavaScript en vez de después de ejecutarlo;
 * - prefetch del chunk del mapa 2D: se descarga en baja prioridad, sin ejecutarse;
 * - favicon en línea: evita una petición 404.
 */
function loadingHints(): Plugin {
  const snapshot = process.env.VITE_SNAPSHOT_PATH ?? 'science-v2'
  const data = [
    ...['candidate-details.json', 'manifest.json', 'mission-profile.json', 'chile-outline.geojson', 'analysis-summary.json']
      .map((file) => `${snapshot}/${file}`),
    'visual-context/index.json',
    'basemaps/basemaps.json',
  ]
  return {
    name: 'analogos-loading-hints',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const tags: HtmlTagDescriptor[] = [
          { tag: 'link', attrs: { rel: 'icon', href: 'data:,' }, injectTo: 'head' },
          ...data.map((href): HtmlTagDescriptor => ({
            tag: 'link',
            attrs: {
              rel: 'preload',
              as: 'fetch',
              crossorigin: 'anonymous',
              href: `./${href}`,
              // Baja prioridad: se adelantan al JavaScript sin quitarle ancho de banda al
              // código que pinta la primera pantalla (medido en Lighthouse móvil).
              fetchpriority: 'low',
            },
            injectTo: 'head',
          })),
        ]
        // Póster del globo en el HTML estático: se pinta antes de que corra React (mejora LCP
        // y Speed Index). Un script en línea lo ubica con la misma fórmula del globo 3D.
        const poster = Object.values(ctx.bundle ?? {}).find(
          (item) => item.type === 'asset' && /globe-poster-[\w-]+\.webp$/.test(item.fileName),
        )
        if (poster) {
          const layout = readFileSync(new URL('./src/boot/posterLayout.js', import.meta.url), 'utf8')
            .replace(/^\/\/.*$/gm, '')
            .replace('export function', 'function')
          tags.push(
            // Solo en pantallas anchas: en móvil el póster sería el LCP y llegaría después del texto.
            { tag: 'link', attrs: { rel: 'preload', as: 'image', fetchpriority: 'high', media: '(min-width: 1100px)', href: `./${poster.fileName}` }, injectTo: 'head' },
            {
              tag: 'style',
              children:
                '#boot-stage{position:fixed;inset:0;z-index:1;pointer-events:none;background:radial-gradient(circle at 50% 50%,#0A2236 0%,#04111B 55%,#02070A 100%);transition:opacity .45s ease}' +
                '#boot-stage.is-hidden{opacity:0}#boot-poster{position:absolute;max-width:none}',
              injectTo: 'head',
            },
            {
              tag: 'div',
              attrs: { id: 'boot-stage', 'aria-hidden': 'true' },
              children: [{ tag: 'img', attrs: { id: 'boot-poster', 'data-src': `./${poster.fileName}`, alt: '', fetchpriority: 'high', decoding: 'async' } }],
              injectTo: 'body-prepend',
            },
            {
              tag: 'script',
              children: `(function(){${layout}var img=document.getElementById('boot-poster');if(!matchMedia('(min-width: 1100px)').matches){img.remove();return}function place(){var l=posterLayout(innerWidth,innerHeight);img.style.width=img.style.height=l.size+'px';img.style.left=l.left+'px';img.style.top=l.top+'px'}place();img.src=img.getAttribute('data-src');addEventListener('resize',place)})()`,
              injectTo: 'body-prepend',
            },
          )
        }
        const flat = Object.values(ctx.bundle ?? {}).find(
          (chunk) => chunk.type === 'chunk' && chunk.facadeModuleId?.endsWith('CandidateFlatMap.tsx'),
        )
        if (flat) tags.push({ tag: 'link', attrs: { rel: 'prefetch', href: `./${flat.fileName}` }, injectTo: 'head' })
        // Armazón estático dentro de #root: barra y hero se pintan con el HTML, antes del
        // JavaScript; React lo reemplaza al montar con el mismo marcado.
        return { html: html.replace('<div id="root"></div>', `<div id="root">${staticShellHtml()}</div>`), tags }
      },
    },
  }
}

export default defineConfig({
  // Rutas relativas: el mismo build carga en "/" y en un subdirectorio como "/AnalogOS/".
  base: './',
  plugins: [react(), loadingHints()],
  publicDir: fileURLToPath(new URL('../../artifacts', import.meta.url)),
  server: {
    host: '127.0.0.1',
    fs: {
      allow: [fileURLToPath(new URL('../..', import.meta.url))],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // El empaquetador de entrega toma de aquí los chunks diferidos y assets permitidos.
    manifest: true,
    // El chunk del globo (three.js) se carga de forma diferida; ver ADR-007.
    chunkSizeWarningLimit: 1100,
  },
})
