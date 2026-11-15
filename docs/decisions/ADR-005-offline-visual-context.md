# ADR-005 — Offline Sentinel-2 visual context per candidate

- Status: accepted by Codex after independent review of code, images, tests and demo
- Date: 2026-11-14

## Context

M4 asks for candidates to be inspected visually. Until now the record showed numbers and a schematic map, but no image of the terrain. The demo must keep working offline, without APIs in the browser, and the v2 scientific snapshot must not change.

## Decision

1. `pipelines/fetch_visual_context.py` asks the Copernicus Sentinel Hub Process API for an RGB view (B04/B03/B02) per candidate and writes `artifacts/visual-context/`: three PNGs exactly as returned by the service and a public `index.json`.
2. The bbox comes from the candidate's versioned geometry and is checked against `config/science_snapshot_v2.json`. Fixed window: 2025-12-01 to 2026-01-01 UTC, `sentinel-2-l2a`, order `leastCC`, maximum cloud cover 40 % per scene.
3. View 768 px high and with a width proportional to latitude (705–714 px), about 28,8 m per pixel. It is documented as a reduced view, not as native resolution.
4. Single, explicit transformation: reflectance × 2,0 clipped to [0, 1]; alpha 0 where there is no data.
5. The evalscript uses a `ORBIT` mosaic, returns the orbits considered in `userdata` and counts the pixels contributed by each one. The “used” orbits are published only if those counters add up exactly to the requested grid; otherwise, only the considered ones remain.
6. The index stores the full request and the evalscript (without credentials), the returned metadata, the actual query time and the SHA-256 of each PNG. Everything it presents is validated against the candidate, the request, the file or the returned metadata.
7. A valid local package is reused without network or credentials; `--refresh` forces the query. A new generation is assembled in full in a temporary directory and swapped in as a whole; on error, the previous one is kept.
8. The web reads only local files (`BASE_URL`), shows the panel in the record and falls back to “not available” if the index is missing, is invalid, the candidate is a fixture or the image does not open. It does not touch similarity, confidence, stability or feasibility.
9. The packager accepts `visual-context/index.json` and exactly three PNGs with a fixed name, and requires that their SHA-256 match the index.

## Consequences

- The delivery ZIP goes from ~0,5 MB to ~4,1 MB; each PNG weighs 1,1–1,2 MB.
- Changing any constant that the index presents (period, transformation, limitations, evalscript) invalidates the local package and requires a new query with credentials.
- Adding or removing candidates requires updating the packager's explicit list.
- Copernicus credentials only via environment or `.env`, sent only to `identity.dataspace.copernicus.eu`; the token only to `sh.dataspace.copernicus.eu`. Response headers and bodies are not logged.

## Limits

- It is context for inspection, not evidence that closes warnings, territorial restrictions, expert review or M4.
- A one-month mosaic of 2025: is not a single date or a current image.
- The cloud filter is per scene; the view may have clouds, shadows or haze.
- Package replacement is not atomic against an abrupt interruption; if it also cannot be restored or cleaned up, the command reports the actual state and keeps the backup.
