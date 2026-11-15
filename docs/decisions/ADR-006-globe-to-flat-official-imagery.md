# ADR-006 — Background globe with automatic switch to a 2D map and official sources by zoom

- Status: accepted by the human team (2026-11-14, direct user decision, without Codex review).
- Date: 2026-11-14
- Relation: extends ADR-007 (three.js globe) and reuses ADR-005 (Sentinel-2 context). Contradicts the line "SVG map, no MapLibre or WebGL" of `CLAUDE.md`; the human team accepts it anyway and `CLAUDE.md` remains pending update.

## Context

The team asked for: the planet as the background and center of the site, no candidate column, no repeated information, no 3D/2D selector, the card floating in liquid glass, and that zooming in automatically switches to a 2D map with the best available official imagery, with the source visible. The globe's Blue Marble (~10 km/pixel) becomes pixelated when zooming in.

## Decision

1. **Background stage** (`MapStage`): full-screen three.js globe. When the equivalent Mercator zoom crosses 5,6 it switches to a 2D MapLibre map with the same center and scale; below 4,9 it returns to the globe (hysteresis). The equivalences are pure functions with tests (`domain/mapZoom.ts`).
2. **2D layers, from bottom to top by quality**:
   - Blue Marble NG ~500 m of northern Chile, local copy (`artifacts/basemaps/`, NASA GIBS).
   - HLS S30 ~30 m online (NASA GIBS WMTS, several dates stacked): it only improves things if there is a connection.
   - HLS S30/L30 median 2025 ~30 m per sector with a margin of 0,12°, local, without clouds or gaps (`pipelines/fetch_basemaps.py`).
   - Sentinel-2 L2A from ADR-005 over each polygon, local: the sharpest and the already reviewed one.
3. **Legend**: shows the main source visible according to framing and zoom, plus a line with those that remain underneath. It always states that the images do not enter the score.
4. **Without WebGL** (ADR-001): the local SVG map is used automatically, without a selector.
5. The card floats in liquid glass, with a compact 1·2·3 selector instead of the ranking column. The ADR-005 panel replaces the thumbnail with "View the sector on the 2D map" so as not to repeat the image.

## Consequences

- The core demo remains offline: globe, regional Blue Marble, HLS medians and Sentinel-2 are local. The online tiles are only an enhancement; GIBS returns intermittent 500 on empty tiles, which the map tolerates.
- `maplibre-gl` is added (deferred chunk of ~1,1 MB and its own worker) and ~1 MB of images in `artifacts/basemaps/`.
- `scripts/package_release.py` rejects this build: its explicit list does not include the deferred chunks, the textures, the worker or `basemaps/`. It must be extended before packaging.
- The HLS median delivered by GIBS looks less contrasted than the Sentinel-2 one from ADR-005; the polygon edge is noticeable, and it is also drawn.
