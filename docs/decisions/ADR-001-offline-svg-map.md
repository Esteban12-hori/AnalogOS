# ADR-001 — Local SVG map for the deliverable

- Status: accepted
- Date: 2026-11-14

## Context

The first implementation used MapLibre with a local style. During review on the presentation browser, WebGL did not render the geographic content and left the panel empty. The demo must work offline and on unknown machines.

## Decision

The deliverable uses an SVG map of Chile generated from the local Natural Earth GeoJSON. Candidates are drawn as interactive callouts connected to their location. There are no tiles, remote services, or dependency on graphics acceleration.

## Consequences

- The demo works in browsers without WebGL, and the bundle drops from ~1,45 MB to less than 400 kB of JavaScript.
- The map serves the national ranking and the communication of the result, not detailed cartographic navigation.
- MapLibre may return in a later version as an exploration mode, keeping SVG as a fallback.
