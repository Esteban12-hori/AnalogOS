/**
 * Plugin de Vite (código de Node, NO importar desde la app): pistas de carga en index.html
 * para cortar la cascada de red y pintar el armazón y el arranque antes de React.
 * - preload de los JSON del snapshot y de los índices de imágenes;
 * - prefetch del chunk del mapa 2D: se descarga en baja prioridad, sin ejecutarse;
 * - favicon en línea: evita una petición 404;
 * - script mínimo tras <title> (antes del CSS y del módulo): centro y tamaño del globo y borde del
 *   área libre (shell/stageGeometry.js + boot/posterLayout.js, incrustados) como variables
 *   --boot-* y modo de intro en <html data-boot>, antes del primer cuadro;
 * - armazón estático dentro de #root (content/shell.ts), con la capa de arranque en
 *   stage.overlay: póster ≥1100 px (<picture>, el móvil no lo descarga) o silueta CSS, anillo
 *   orbital, satélite y bitácora de hitos reales. Queda bajo los paneles, como en React.
 */
import { readFileSync } from 'node:fs'
import type { HtmlTagDescriptor, Plugin } from 'vite'
import { staticShellHtml } from '../../content/shell'
import { dataAttributionText } from '../../shell/attribution'
import { INTRO_SESSION_KEY } from './bootModel'

/**
 * Compacta un módulo JS plano para incrustarlo en un <script>: quita comentarios, sangría y
 * `export`. Conserva los saltos de línea (los módulos no usan punto y coma).
 */
export function inlineModule(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^export /gm, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

const readModule = (path: string) => inlineModule(readFileSync(new URL(path, import.meta.url), 'utf8'))

/** Atribución del snapshot que se publica (mismo manifiesto que carga la app); null si no se lee. */
function snapshotCredit(): string | null {
  try {
    const snapshot = process.env.VITE_SNAPSHOT_PATH ?? 'science-v3'
    const manifest: unknown = JSON.parse(readFileSync(new URL(`../../../../../artifacts/${snapshot}/manifest.json`, import.meta.url), 'utf8'))
    return dataAttributionText(manifest as Parameters<typeof dataAttributionText>[0])
  } catch {
    return null
  }
}

/**
 * Script en línea del arranque. Misma fórmula que domain/mapZoom.ts y BootLayer: lo verifica
 * tests/boot.test.ts ejecutándolo. Modo: ?intro=full fuerza la intro; si ya se vio en la sesión,
 * solo el aterrizaje (debe coincidir con resolveIntroMode).
 */
export function bootHeadScript(geometrySource: string, layoutSource: string): string {
  return (
    `(function(){${geometrySource}\n${layoutSource}\n` +
    'var d=document.documentElement,m="normal";' +
    'function p(){var w=innerWidth,h=innerHeight,i=baseStageInsets(w,h),l=posterLayout(w,h,i),s=d.style;' +
    's.setProperty("--boot-x",l.left+l.size/2+"px");s.setProperty("--boot-y",l.top+l.size/2+"px");s.setProperty("--boot-s",l.size+"px");s.setProperty("--boot-fb",h-i.bottom+"px")}' +
    'p();addEventListener("resize",p);' +
    `try{if(new URLSearchParams(location.search).get("intro")==="full")m="full";else if(sessionStorage.getItem(${JSON.stringify(INTRO_SESSION_KEY)})!==null)m="quiet"}catch(e){}` +
    'd.setAttribute("data-boot",m)})()'
  )
}

/**
 * Datos que el cargador pide al arrancar, en el mismo orden (data/loadDemoSnapshot.ts y
 * data/loadVisualContext.ts): v3 trae además búsqueda, antecedentes y el contorno de los dos
 * países; los snapshots históricos, el contorno de Chile y el contexto visual v2.
 */
export function preloadedData(snapshot: string = process.env.VITE_SNAPSHOT_PATH ?? 'science-v3'): string[] {
  const discovery = snapshot === 'science-v3'
  const files = discovery
    ? ['candidate-details.json', 'manifest.json', 'mission-profile.json', 'context-outline.geojson', 'analysis-summary.json', 'search-results.json', 'precedents.json']
    : ['candidate-details.json', 'manifest.json', 'mission-profile.json', 'chile-outline.geojson', 'analysis-summary.json']
  return [
    ...files.map((file) => `${snapshot}/${file}`),
    `${discovery ? 'visual-context-v3' : 'visual-context'}/index.json`,
    'basemaps/basemaps.json',
  ]
}

export function loadingHints(): Plugin {
  const data = preloadedData()
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
        // Póster del globo en el HTML estático (≥1100 px): se pinta antes de que corra React (LCP y
        // Speed Index). En móvil sería el LCP y llegaría después del texto: allí va la silueta CSS.
        const poster = Object.values(ctx.bundle ?? {}).find(
          (item) => item.type === 'asset' && /globe-poster-[\w-]+\.webp$/.test(item.fileName),
        )
        const posterUrl = poster ? `./${poster.fileName}` : undefined
        if (posterUrl) {
          tags.push({ tag: 'link', attrs: { rel: 'preload', as: 'image', fetchpriority: 'high', media: '(min-width: 1100px)', href: posterUrl }, injectTo: 'head' })
        }
        const flat = Object.values(ctx.bundle ?? {}).find(
          (chunk) => chunk.type === 'chunk' && chunk.facadeModuleId?.endsWith('CandidateFlatMap.tsx'),
        )
        if (flat) tags.push({ tag: 'link', attrs: { rel: 'prefetch', href: `./${flat.fileName}` }, injectTo: 'head' })
        // Script del arranque tras <title> (el charset queda en los primeros 1024 bytes) y antes del
        // CSS y del módulo: no espera a la hoja de estilos y fija las variables del primer cuadro.
        const head = `<script>${bootHeadScript(readModule('../../shell/stageGeometry.js'), readModule('../../boot/posterLayout.js'))}</script>`
        // Armazón estático dentro de #root: barra, dock, hoja y arranque se pintan con el HTML, antes
        // del JavaScript; React lo reemplaza al montar con el mismo marcado.
        const out = html
          .replace('</title>', `</title>\n    ${head}`)
          .replace('<div id="root"></div>', `<div id="root">${staticShellHtml({ posterUrl, credit: snapshotCredit() ?? undefined })}</div>`)
        return { html: out, tags }
      },
    },
  }
}
