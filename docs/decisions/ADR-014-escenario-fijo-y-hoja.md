# ADR-014 — Fixed stage (100dvh) with dock, rail and a single sheet with 3 detents

- Status: **accepted by Codex (2026-11-15)** as the pilot's interface architecture, under the direction delegated by Dan. Reviewed on desktop and Chrome mobile viewport, with limits recorded in `docs/CODEX_INTEGRATION_REVIEW.md`; it does not amount to certifying iOS devices or native printing. The human team retains final authority. Originally numbered ADR-008,, then ADR-010 and finally ADR-014 to preserve the team's scientific ADRs.
- Date: 2026-11-14
- Relationship: does not affect the team's ADR-008 (discovery pilot) or ADR-009 (guided recommendation); the stage hosts their data and their planner (ADR-013). Applies `docs/UX_REDESIGN.md` §0–§2 and §3.8. Replaces the layout of ADR-006 item 5 (floating card and scrolling hero). Maintains ADR-006/007 (globe with transition to 2D) and ADR-001 (SVG without WebGL).

## Context

The current site is a scrolling document: a «No buscamos…» hero, a floating 480 px card on the right, and Signal, Compare and Method sections below. On mobile there are five different proposed sheets and eight breakpoints. The globe loses the one-finger gesture because the document scrolls, and each component passed its margins to the stage in a different way (`rightInset`, `--stage-inset-*`, `--rail-h`…).

## Decision

1. **Fixed stage**: `html`/`body` without scroll; the stage (globe or 2D map) fills the entire viewport and rotates with one finger. Everything else floats on top.
2. **One spatial rule**: center = where (globe and lines); right = the place (metrics rail `clamp(340px, 26vw, 380px)`, 520 px in «full card»); left = your mission and its reading (only ≥1440 px and in Mission); bottom = choose and write (a single dock: places on top, composer below).
3. **Three ranges**: ≥1440, 1100–1439 and <1100 px. Height <860 px uses compact variants. Below 1100 px there is **a single sheet** with detents S0 (tray), S1 (place, 54dvh) and S2 (card). Landscape with height ≤500 px: side sheet of 360 px.
4. **Sheet**: it is dragged only from the handle or the header; the handle is a `<button>` (tap or arrows change detent). The destination is decided by the pure function `resolveDetent` (velocity threshold, hysteresis in favor of the originating detent, cancellation). S2 uses `pushState`; Back and Esc return to S1; the stage remains `inert` and paused in S2. The virtual keyboard is compensated with VisualViewport and `--kb-inset`.
5. **Stage margins**: a single channel. The shell computes `insets {top, right, bottom, left}` from the layout and publishes them to the `ui` store when the layout settles. The globe applies them with `setViewOffset(x, y)` and MapLibre with `setPadding`. The global framing, the globe↔2D thresholds and the pre-React poster use the range's **base** margins (`shell/stageGeometry.js`), which do not change when opening the rail or the sheet, so that the camera does not jump.
6. **Modes** Explore | Mission as APG tabs with a CSS thumb (`?modo=` with `replaceState`). The WebGL shader of `LiquidNav` is removed. Signal, Compare and Method become tabs of the full card (520 px rail or S2).
7. **UI state** in an external store (`useSyncExternalStore`) outside the R3F tree, to avoid re-rendering the globe.

## Consequences

- The hero and the floating card are removed; the existing content is relocated without loss (Metrics, Signal, Compare, Method and Sources as tabs).
- The globe poster and its pixel-level test (`boot.test`) are aligned with the new base margins; changing the dock height requires updating `stageGeometry.js` and `shell.css` together (verified by a test).
- iOS risk (pointercancel, scrollend): every detent is reachable with buttons and keyboard; QA on a real device is pending (increment 11).
- Acceptance preserves the fixed stage; the pending adjustments to mobile navigation and printing do not authorize changing the contracts or the scientific engine.
