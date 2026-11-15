# Web performance

Measurements of the 2026-11-14 with Chromium and Metal GPU (Mac), 1440×900, with no cache. Simulated network of 8 Mbps with 60 ms latency. Static server with gzip, like Vercel.

## Where the time goes

| Resource | Cost |
|---|---|
| JavaScript until the globe is visible | ~430 ms of CPU (parsing and compiling three.js and the app) |
| Total main-thread tasks until the globe is visible | ~740 ms |
| Transfer | Dominates on any real network: three.js ~250 KB gz, MapLibre ~290 KB gz, its worker ~145 KB gz, images |
| GPU | Globe and map already draw on the GPU (WebGL); at rest there are 0 draws |

## Before and after (globe and 2D map)

| Metric | `main` in `adcffcd` | Now |
|---|---|---|
| Globe visible with labels | 2,9 s | 1,9 s |
| Everything preloaded (2D included) | 7,5 s | 5,3 s |
| Total session bytes | 5,6 MB | 3,4 MB |
| Globe texture | 2K (blurry in the global view) | Immediate 1K + sharp 4K WebP |
| Zoom on the globe | pixelated up to zoom ~5,6 | switches to 2D (Blue Marble ~500 m) when zooming in ~×1,4 |

What changed:
- Progressive texture: a 57 KB 1K texture paints the globe immediately and the ~585 KB 4K WebP replaces it when it arrives.
- Threshold for switching to 2D relative to the panel's global view (`flatThresholds`), so it behaves the same on a short monitor or a 4K one.
- The 2D preload waits for the globe to have its texture, so it does not compete with it.
- The Sentinel-2 views from ADR-005 are drawn on the map as 229 KB WebP instead of 3,4 MB PNG. The original PNGs remain intact and the web only uses the WebP if the PNG's SHA-256 matches.
- Local Blue Marble world (239 KB) for offline 2D.

## Would Rust make it faster?

No, given these measurements:
- **Browser (Rust → WebAssembly).** CPU computation is ~0,4 s and almost all of it is parsing three.js and MapLibre, which already draw on the GPU. Rewriting the renderer in Rust/WASM would add a WASM binary, generally several MB for engines like Bevy or maplibre-rs, and would increase exactly what dominates today: bytes. There is no heavy algorithm in JavaScript to speed up.
- **"Backend".** There is none: the site is static on Vercel's CDN, with immutable cache on `/assets`. A Rust server (Axum, Actix) would add a compute hop compared with files already cached at the edge. It would be slower, not faster.
- **Pipelines.** `fetch_basemaps` takes ~3 min, almost all of it waiting on NASA GIBS over the network. Rust does not change the network, and the pipelines do not affect page load.

What does still move the needle:
1. Bytes: split three.js, serve KTX2/Basis textures or slim down MapLibre (for example, load the worker only when zooming in).
2. Verify in production that Vercel applies the `vercel.json` cache and Brotli.
3. An architecture alternative, not a language one: use MapLibre's `globe` projection with Blue Marble tiles. A single engine and no texture to pixelate, at the cost of redoing the globe's look (atmosphere, lighting) and adding local tiles for offline mode.

## Second round: optimization against production (https://analogos.vercel.app)

Production already serves everything from Vercel's CDN with Brotli, immutable cache on `/assets` and `HIT`; the bottleneck is not the server.

Changes:
- **Precompiled validators:** Ajv standalone (`scripts/build-validators.mjs`). Same validation, without compiling schemas in the browser; the main JS drops from 458 to 353 KB (≈144 → 99 KB compressed). The build fails if the generated file does not match `contracts/`.
- **Immediate shell:**
  - `index.html` ships the bar and the hero as static HTML (`src/content/shell.ts`), so the text is painted before the JavaScript.
  - The app draws the shell without waiting for the data.
  - Below-the-fold sections load as they are approached by scrolling.
- **No network waterfall:** the snapshot JSONs and the image indexes are preloaded from the HTML, at low priority, and `analysis-summary.json` runs in parallel.
- **On-demand 2D map:** chunk, worker and images are downloaded when idle without being executed; MapLibre is instantiated when the user starts zooming in, one step before the threshold.
- **Globe poster on desktop:** a 64 KB image rendered from the app, placed with the same formula as the 3D (verified to the pixel) and removed when the sharp texture is ready. It is not downloaded on mobile: there it would be the LCP and would arrive after the text.
- **Adaptive texture:** 2K on phones and ordinary screens, 4K only where it is noticeable (2π·radius·dpr texels).
- **Camera in the final framing from the first frame** (avoids false preloads) and inline favicon (no 404).

Lighthouse, median of 5 runs, same local server (precompressed Brotli) for `main` and `dev`:

| Profile | Version | Score | FCP | LCP | TBT | Speed Index |
|---|---|---|---|---|---|---|
| Mobile (slow 4G, CPU ×4) | `main` | 81 | 2,2 s | 4,1 s | 222 ms | 2,8 s |
| Mobile | `dev` | 75 | 2,0 s | 5,0 s | 148 ms | 3,2 s |
| Desktop | `main` | 99 | 0,5 s | 0,8 s | 0 ms | 0,8 s |
| Desktop | `dev` | 99 | 0,4 s | 1,0 s | 18 ms | 0,7 s |

The observed (unsimulated) metrics from the same mobile analysis: LCP of 482 ms on `main` versus 136–144 ms on `dev`, and FCP of 152 ms versus 110–130 ms. Lighthouse's simulated mobile LCP (Lantern) assigns ~5 s to the hero text in both versions; it is a noisy estimate for this graph. What is measured in the browser is ~3,4 times faster.

Method warnings:
- A local server that compresses on every request skews the results heavily. You must precompress, like a CDN.
- You must verify that the app loads in every build: a cached `index.html` once gave a false "100" with the app broken.

## Explore / Mission redesign: §6.1 budget after the review (2026-11-14)

Lighthouse 12.6.0 in Chrome for Testing with Metal. Median of 3 interleaved runs against `857b05f` (before the redesign), with the same static brotli server (`/tmp/claude-lh/FIXT-*.json`).

| Profile | Version | Score | FCP | LCP | TBT | Speed Index | CLS |
|---|---|---|---|---|---|---|---|
| Mobile (slow 4G, CPU ×4) | `857b05f` | 75 | 2,0 s | 5,0 s | 180 ms | 2,9 s | 0,100 |
| Mobile | redesign | 74 | 2,1 s | 5,4 s | 204 ms | 2,9 s | 0 |
| Desktop | `857b05f` | 99 | 0,3 s | 0,8 s | 39 ms | 0,7 s | 0,047 |
| Desktop | redesign | 98 | 0,5 s | 1,1 s | 0 ms | 0,7 s | 0,0003 |

Build weight after integrating with dev (ADR-013, `feature/mision-redesign`, gzip):

| Chunk | `9b32457` (redesign) | Integration | Note |
|---|---|---|---|
| Initial JS (`index-*.js`) | 112,0 KB | 122,2 KB | +10,3 (budget +12): candidate v3 validator, `domain/discovery`, SVG map without WebGL, requirements layer and Mission views |
| Initial CSS | 15,3 KB | 17,1 KB | +1,8 |
| Mission (`mission`, Ajv at runtime + `shared/mission`) | — | 52,4 KB | deferred: only when entering Mission, focusing the dock or "Evaluate this sector" |
| "Your mission" (`MissionPanel` + `ResultView` + controller) | — | 8,3 + 5,9 + 4,1 KB | deferred |
| v3 search and background (`discoveryContracts`) | — | 9,1 KB | deferred: only with the v3 snapshot |
| Reading (`deferred`) | 14,2 KB | 7,7 KB | without lktron, tokens or FNV |

The entry chunk does not contain the Ajv compiler; the lktron channel and the custom engine no longer exist. The following table is the measurement prior to the integration.

Build weight (`vite build`, gzip):

| Chunk | `857b05f` | 1161db6 | Now | Budget |
|---|---|---|---|---|
| Initial JS (`index-*.js`) | 100,0 KB | 118,1 KB | 111,9 KB | +≤12 over `857b05f` (met: +11,9) |
| Initial CSS | — | — | 15,3 KB | +≤5 over `857b05f` |
| Engine (`engine`) | — | 15,6 KB | 8,5 KB | mission ≤8 in total (not met: with missionRun 5,0 and MissionPanel 3,2 it adds up to ≈17) |
| Reading (`deferred`) | — | 13,7 KB + lktronClient 3,2 | 14,2 KB (lktronClient only with the flag) | ≤10 (not met) |
| Lines (`LeaderCanvas`) | — | 5,1 KB | 6,7 KB + `buildMetricViews` 2,0 shared | ≤4 (not met) |
| Markers (`MarkerLayer`) | — | 5,7 KB | 5,7 KB | ≤4 (not met) |

What reduced the initial JS:

- `buildMetricViews`, `layoutLeaders` and `pickPrincipalMetrics` are no longer re-exported from the feature indexes. Rolldown left in the main chunk every re-exported module that was also used by a deferred chunk.
- The ◆ catalog validator travels with the catalog (`analogCatalog`).
- Method and Sources are loaded when their tab is opened.
- The mission chunk loads only the interpretation validator. Evidence package and analysis go with the Reading, and `lktronClient` is downloaded only if `VITE_LKTRON_URL` exists.

Pending:

- **Mobile LCP.** With Lantern it is still 0,4 s over the baseline. The LCP candidate is the attribution line that React paints, with a render delay of about 4,9 s. The identical copy in the static HTML is not left as a candidate.
- **CLS on desktop.** 0,0003, because of the carousel header, even with the fixed-width counter.
- **Glass.** There are 3 surfaces with blur on desktop (left panel, rail and dock) and 1 on mobile (sheet). The top bar no longer has blur.
