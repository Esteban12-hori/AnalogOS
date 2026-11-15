/**
 * Vite plugin (Node code, do NOT import from the app): loading hints in index.html
 * to break the network waterfall and paint the shell and the boot sequence before React.
 * - preload of the snapshot JSON files and the image indexes;
 * - prefetch of the 2D map chunk: downloaded at low priority, without being executed;
 * - inline favicon: avoids a 404 request;
 * - minimal script after <title> (before the CSS and the module): globe center and size and the edge of the
 *   free area (shell/stageGeometry.js + boot/posterLayout.js, inlined) as
 *   --boot-* variables and the intro mode in <html data-boot>, before the first frame;
 * - static shell inside #root (content/shell.ts), with the boot layer in
 *   stage.overlay: poster ≥1100 px (<picture>, mobile does not download it) or CSS silhouette, orbital
 *   ring, satellite and log of real milestones. It sits beneath the panels, as in React.
 */
import { readFileSync } from 'node:fs'
import type { HtmlTagDescriptor, Plugin } from 'vite'
import { staticShellHtml } from '../../content/shell'
import { dataAttributionText } from '../../shell/attribution'
import { INTRO_SESSION_KEY } from './bootModel'

/**
 * Compacts a plain JS module to inline it in a <script>: strips comments, indentation and
 * `export`. Keeps line breaks (the modules do not use semicolons).
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

/** Attribution of the snapshot being published (same manifest the app loads); null if it cannot be read. */
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
 * Inline boot script. Same formula as domain/mapZoom.ts and BootLayer: it is verified by
 * tests/boot.test.ts by executing it. Mode: ?intro=full forces the intro; if it was already seen in the session,
 * only the landing (must match resolveIntroMode).
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
 * Data the loader requests at startup, in the same order (data/loadDemoSnapshot.ts and
 * data/loadVisualContext.ts): v3 also brings search, background and the outline of the two
 * countries; the historical snapshots, the outline of Chile and the v2 visual context.
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
              // Low priority: they are fetched ahead of the JavaScript without taking bandwidth away from
              // the code that paints the first screen (measured in mobile Lighthouse).
              fetchpriority: 'low',
            },
            injectTo: 'head',
          })),
        ]
        // Globe poster in the static HTML (≥1100 px): painted before React runs (LCP and
        // Speed Index). On mobile it would be the LCP and would arrive after the text: there the CSS silhouette is used.
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
        // Boot script after <title> (the charset stays within the first 1024 bytes) and before the
        // CSS and the module: it does not wait for the stylesheet and sets the first-frame variables.
        const head = `<script>${bootHeadScript(readModule('../../shell/stageGeometry.js'), readModule('../../boot/posterLayout.js'))}</script>`
        // Static shell inside #root: bar, dock, sheet and boot are painted with the HTML, before
        // the JavaScript; React replaces it on mount with the same markup.
        const out = html
          .replace('</title>', `</title>\n    ${head}`)
          .replace('<div id="root"></div>', `<div id="root">${staticShellHtml({ posterUrl, credit: snapshotCredit() ?? undefined })}</div>`)
        return { html: out, tags }
      },
    },
  }
}
