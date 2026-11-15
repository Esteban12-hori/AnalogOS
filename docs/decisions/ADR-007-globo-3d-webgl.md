# ADR-007 — 3D Globe (three.js) with SVG map as fallback

- Status: accepted by the human team (2026-11-14, direct decision by the user, without Codex review). Renumbered from ADR-004 to avoid colliding with `ADR-004-portable-static-release.md`.
- Date: 2026-11-14

## Context

The visual redesign calls for replacing the flat map with a 3D planet (reference: `Globe3D` component with React Three Fiber, NASA Blue Marble texture, relief and atmosphere). The frozen P0 stack does not include three.js, and ADR-001 chose SVG because WebGL failed in the presentation browser.

## Decision

1. Add `three`, `@react-three/fiber` and `@react-three/drei` to `apps/web`. No Tailwind or design system: styles in `components/CandidateGlobe.css`.
2. The globe is the default view **only if** the browser creates a WebGL context. If there is no WebGL, if the component throws an error or if the context is lost, the app automatically falls back to the SVG map from ADR-001. The user can switch between "3D Globe / 2D Map" at any time.
3. Textures are versioned in `apps/web/src/assets/globe/` (NASA Blue Marble 4096×2048 and relief 2048×1024, public domain; copy of `three-globe@2.31.0/example/img`). No CDN: the demo keeps working offline.
4. three.js is loaded with `React.lazy` in a separate chunk (~970 kB, ~260 kB gzip). The initial bundle does not change (~395 kB).
5. Candidates are drawn as **polygons** on the sphere, never as pins. The label is anchored to the approximate center of the polygon with a guide line; it is a keyboard-accessible `<button>`.
6. The geometric functions (`latLngToVec3`, `densifyRing`, `geometryCenter`, `facingFactor`) are pure, live in `src/domain/globe.ts` and have tests.

## Consequences

- The view is more communicative, but the texture (~10 km/pixel) becomes pixelated when zooming in: the globe locates the zones, and is not suitable for site-scale inspection.
- The SVG fallback remains as the guaranteed path for machines without graphics acceleration.
- The drei `Html` cannot be the fallback of `Suspense` with React 19 (it throws `removeChild` when removed); a DOM overlay is used.
