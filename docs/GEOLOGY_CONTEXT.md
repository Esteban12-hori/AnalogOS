# M9 Geological Context — operation, reproduction and sources

Package: `artifacts/geology-context-v1/index.json` (versioned). Contract: `contracts/geology-context.schema.json`. Decisions: `docs/decisions/ADR-010-geology-context.md`.

## Commands

```sh
source .venv/bin/activate
python -m pip install -e '.[dev]'              # incluye shapely>=2.2,<2.3
python -m pipelines.build_geology_context --refresh   # new public download (CKAN + Chile ZIP + 3 WFS) and rebuilds
python -m pipelines.build_geology_context --offline   # rebuilds only from data/raw/geology-context-v1/ (no network)
python -m pipelines.build_geology_context             # uses the cache if valid; otherwise, downloads
python -m pytest tests/test_geology_coverage.py tests/test_geology_fetch.py tests/test_geology_context.py -q
```

No credentials: the pipeline does not use `.env`; requests carry only `Accept` and `User-Agent` (verified in tests). The new cache and new package are prepared separately, fully validated, and only then replaced as a pair with rollback: an HTTP, parsing, contract or publication failure leaves the previous state in place. There is no atomicity against a power outage between the two replacements (hidden `.previo` directories may remain). The offline rebuild is byte-for-byte identical.

## Sources and terms

| Source | Original authority / distributor | Scale | Request | Declared license |
|---|---|---:|---|---|
| Geología Base | SERNAGEOMIN / MMA | 1:1,000,000 | CKAN `package_show?id=geologia-base`; the ZIP resource whose actual content is GeoJSON is used | CC0 only if CKAN declares `license_id` = `cc-zero`; if it changes, the build is rejected |
| `sigam:e250K_UnidadGeologica` | SEGEMAR / SIGAM, Sistema de Información Geológica Ambiental Minera (WFS) | 1:250,000 | WFS 1.0.0 GetFeature per sector, `srsName=EPSG:4326`, exact bbox, `maxFeatures=2000` | CC BY 4.0 declared by the geoservices page; scope recorded, no additional license |

Exact URLs, SHA-256, bytes and `acquired_at` of each response are in the package's `sources[].requests[]`. The survey date is `null`; `catalog_modified_at` is only the update of the catalog record.

## Large unversioned data (ignored)

`data/raw/geology-context-v1/` (~6.9 MB: `acquisition.json`, `ckan-package_show.json`, `cl-geologia-base.zip`, three `ar-<site_id>.json`). Already existing and ignored: `data/raw/geology-feasibility-20261114/` (20.9 MB, research; it is not published and does not enter the package). The raw data does not enter the bundle or the ZIP.

## How to read a sector

- `availability` defines evidence: `available` (full coverage, no ambiguity, no rejections or missing descriptions), `partial`, `no_coverage` (this layer does not cover the sector), `unavailable`.
- `area_fractions`: `unmapped + covered_unambiguous + covered_ambiguous + unusable_upper_bound = 1`. Show percentage and status separately; coverage is not accuracy.
- `units[]`: source identity, code, name, original description (or `null`), fraction with and without ambiguity, and the original properties of each feature.
- `geometry_diagnostics[]`: accepted/rejected repairs with areas before/after.
- `verification_questions[]`: editorial guidance, not measurements.

## Limits

Regional cartography, not fieldwork. Validity/repair in lon/lat; clipping and overlay in the EPSG:6933 plane with straight edges in it (not an exact geodesic integral; difference from the exploratory audit < 0.00005 pp). Repair and status thresholds are provisional. It does not modify score, confidence, restrictions, AI or M8.

## Product (phase B)

- **“Geological context” card** in each sector's card, within the existing design: compact summary (evidence status, area breakdown bar, coverage, no coverage, overlap between distinct units, units without description, scale and source) and three expandable details: *Mapped units* (original code, name and description, percentage with and without overlap, sheet, feature IDs), *Source, scale and provenance* (authority, distributor, layer, scale as denominator, CRS, license with its scope, attribution, map date “not reported”, catalog record date separately, request/hash/time of each download, processing, limits) and *What to verify in the field* (editorial guidance, not measurements).
- **Statuses**: `available` “Complete cartographic coverage”, `partial`, `no_coverage` “No coverage in this layer”, `unavailable` “Evidence not usable”. They define evidence, never suitability. Honest rounding: “<0.1 %”, “>99.9 %” and “100 %” only with exact coverage.
- **What it does not do**: it does not change score, confidence, restrictions or M8; the M9 card itself does not use AI (since M10, the AI explanation can consume this package only with opt-in: see the section “AI geological guidance (M10)”); there is no lithological map, filters or lithological requirements; gaps are not filled with more general layers; nothing about “suitable”, traction, grain size or chemical equivalence. The score's “Uncalibrated geology” is maintained.
- **Loading**: `apps/web/src/data/loadGeologyContext.ts` reads only `geology-context-v1/index.json` from the build (never geological providers), with a timeout of 8 s that covers reading the body and a cap of 2 MB, and validates contract and semantics against the already loaded candidates (`apps/web/src/domain/geologyContext.ts`, mirror of `pipelines/geology_contract.py`): exact geometry, per-sector provenance (role, `site_id`, URL bbox without rounding), fractions, recomputed status, policy, allowed https URLs. Absent, slow, huge or invalid ⇒ “not available” and the selection, ranking and M8 remain the same. The web does not compute SHA-256:; the hash of the candidates file and each `request_id` are verified by the pipeline and the packager.
- **Export** `<site_id>-geology-context.json` (button “Download geological context (JSON)”): self-contained contract `contracts/geology-export.schema.json` (its `$defs` duplicate those of the package; a test ensures they do not diverge). It is a **subset** for a single sector with the requests that back it plus the source and metadata; `export_info.full_candidates_file_sha256` is the hash of the complete candidates file and the subset is **not** that file. It is validated before download. The M8 and candidate exports do not change. The reference export `tests/fixtures/geology-export-ar-win-s2640-w06730.json` fixes the Python/web parity; if the package is rebuilt with other dates, regenerate it with the command indicated in the message of `test_python_export_matches_the_golden_…`.

## Packaging

`npm run release:package` accepts `geology-context-v1/index.json` as the only file in that folder. Optional: without the folder, the ZIP comes out the same as before. With the folder, the package must fully validate with the single validator `pipelines/geology_contract.py` (contract and semantics, including the SHA-256 of the bytes of the build's `science-v3/candidate-details.json`); otherwise, packaging stops and the previous delivery is kept. The validator is imported only in that case and does not pull in Shapely, pyproj or requests (but does pull in `jsonschema`, an already existing dependency of the pipelines; the constants and pure rules live in `pipelines/geology_policy.py`). The raw data, the research and the audit do not enter the bundle or the ZIP.

## AI geological guidance (M10)

**Separate** layer from the deterministic requirements result (ADR-011). After confirming a test and evaluating it, the results screen shows “Geological guidance for this test”: per evaluated and non-discarded sector, up to 3 checks (official unit + purpose pair) with the unit/source that backs them, and always the limits (coverage, gap, overlap, scale, unknown map date).

- **Without AI** (always available with the package loaded): deterministic general guidance labeled “General guidance without AI”; it does not depend on the objective.
- **With AI (opt-in, checkbox in “AI interpretation”)**: the AI receives the confirmed objective (brief, activity, requirements) and the official units, and only **chooses** references from a closed catalog computed by the server. It does not write text: the sentences are fixed templates “editorial guidance, not measurement”. Purposes: `verificar_hueco_cartografico`, `resolver_ambiguedad`, `confirmar_descripcion_ausente`, `correspondencia_mapa_terreno`, `caracterizar_material_superficial` (grain size/compaction/friction **to be measured**, never inferred), `diversidad_litologica_muestreo`, `contrastar_escala`.
- Caps: 3 per sector, 12 in total, with no obligation to fill them. A purpose only if it applies (gap only with a zone without a polygon or not usable, ambiguity only with overlap, etc.); without coverage there are no references.
- `partial` sectors keep their units from the covered area; the gap/overlap is always shown and no units are located within it. Sector discarded by requirements: no guidance (“geology does not rehabilitate it”). With point/bbox: only geology of the **full window**, labeled as such; without a chosen window no units are emitted.
- It does not change ranking, statuses, score or confidence; regional cartography does not prove traction, soil mechanics, Martian equivalence, safety or permits.

### Export

“Download JSON” remains the M8 export 1.0 unchanged. “Download JSON with geological guidance” generates a `analogos-mission-geology-export` v1 wrapper (`contracts/mission-geology-export.schema.json`) that embeds that M8 export intact and adds, in `geology_guidance`: mode (`ai`/`deterministic`), context identity (`context_fingerprint` = SHA-256 of the full validated canonical JSON, **not** a byte hash; declared because the file only carries the used sectors), a validatable subset per sector (M9 contract `geology-export`), recomputable catalog, selection, guidance and, in `ai` mode, the provenance of the SAME call as the M8 explanation. `validateMissionGeologyExport` (`shared/geology/exportWrapper.ts`) recomputes catalog, selection and guidance and rejects tampering.

### Operation

The server reads `artifacts/geology-context-v1/index.json` and `artifacts/science-v3/candidate-details.json` (both included in the function via `vercel.json` → `functions.api/ai.ts.includeFiles`), validates with `shared/geology/context.ts` (the same validator as the web) and compares the SHA-256 of the candidates' bytes. Absent = channel not available, M8 intact. Present but invalid/divergent = `geology_context_unavailable`/`geology_context_stale` (409) **before** calling the provider, with an explicit option in the UI to retry without geology.
