# Official geology in AnalogOS: value, effort and proposed decision

Evaluation date: 14 November 2026. Owner: Codex.
Inspected baseline: `dev`, `92392f1181133ee2b86fb6b13c97ec9b10de021d`.
Status: evaluation completed; product integration pending assignment. The web app, the engine, the AI and the scientific snapshots have not been modified.

## Verdict

**Yes, it is worth incorporating official geology as reconnaissance context. It is not yet advisable to activate a geological score or to infer mechanical properties of the soil.** The first recommended cut requires approximately **20–32 hours of engineering and review**, spread over 3–5 working days depending on team availability. This is an estimate, not a commitment on schedule or on scientific validation.

The usefulness for the current user —the person in charge of a planetary robotics campaign— is moderate and concrete: distinguishing geological settings within areas that already look favorable because of relief and non-vegetated surface; preparing what to inspect, sample and cross-check in the field. For sampling targets or the selection of geological analogs the potential is greater, but those profiles are not yet supported by AnalogOS.

It does not today answer the question "can this rover drive here?". The inspected layers contain no strength, cohesion, surface grain size, sand depth, obstacle size or measured traction. Nor do they resolve access, ownership or permits. If the immediate goal were to organize a real campaign, resolving access and territorial restrictions would have more operational impact than a more elaborate geological explanation.

## What was verified with real data

Not only the existence of a viewer was evaluated. Public data were downloaded, intersected with the seven exact polygons of `science-v3` and independent queries were verified for Argentina. No credentials were used and Anthropic was not called.

| Product sector | Initial source | Map scale | Area covered by geological polygons | Useful finding |
|---|---|---:|---:|---|
| Chile 1 · 25,0° S / 69,7° W | SERNAGEOMIN via MMA | 1:1.000.000 | 99,4 % | Alluvial deposits and volcanic units; 5 differentiated units |
| Chile 2 · 24,8° S / 69,5° W | SERNAGEOMIN via MMA | 1:1.000.000 | 99,2 % | Cartographic predominance of alluvial deposits; 6 units |
| Chile 3 · 25,2° S / 69,5° W | SERNAGEOMIN via MMA | 1:1.000.000 | 99,3 % | Alluvial deposits, sedimentary and volcanic sequences; 6 units |
| Argentina 4 · 26,2° S / 67,5° W | SEGEMAR, 250K units | 1:250.000 | 50,0 % | Usable descriptions in the covered half; 7 units |
| Argentina 5 · 26,4° S / 67,3° W | SEGEMAR, 250K units | 1:250.000 | 0 % | This layer has no coverage; this does not imply absence of geology |
| Argentina 6 · 25,8° S / 67,1° W | SEGEMAR, 250K units | 1:250.000 | 100 % approx. | Units of the Galán volcanic complex and others; 7 units |
| Yungay · reference window | SERNAGEOMIN via MMA | 1:1.000.000 | 99,1 % | Mixed window with plutonic units and deposits; 6 units |

The percentages express map coverage, **not accuracy, confidence, suitability or the percentage of terrain confirmed in the field**. The Yungay box represents a window of about 20 km and not the exact perimeter of a historical campaign.

Example of the added value: the alluvial cartographic unit `Qa` occupies approximately 43–56 % of the three Chilean windows; in Argentina 6 a unit of the Galán complex described as dacitic ignimbrite occupies approximately 46 %. This is information distinct from slope or NDVI and makes it possible to prepare different reconnaissance questions. It does not prove that those materials are exposed across that entire surface.

### Alternatives for the Argentine gaps

Two additional layers were tested separately:

| SEGEMAR layer | Argentina 4 | Argentina 5 | Argentina 6 | Proposed decision |
|---|---:|---:|---:|---|
| `sigam:e1M.NOA.Geol`, 1:1.000.000 | 100 % | 47,6 % | 97,8 % | Do not prioritize in the first cut: incomplete coverage and texts with encoding problems |
| `sigam:e2.5M.UnidadesGeologicas`, 1:2.500.000 | 100 % | 100 % | 100 % | Available as separate national context, without silently filling in the 250K layer |

The 1:2.500.000 map is ten times more general in linear scale than the 1:250.000. Covering the same polygon with both does not make them evidence of equal detail. The MVP can show the gap in the 250K layer and a link to the national context; it does not need to incorporate three layers or invent homogeneous coverage.

## Sources, access and real problems

### Chile

- [MMA catalog: Base Geology](https://lineasdebasepublicas.mma.gob.cl/datos_abiertos/dataset/geologia-base). It states SERNAGEOMIN as the source, scale 1:1.000.000, EPSG:4326 and a CC0 license. The catalog update is dated 21 April 2026; **that date must not be presented as the date of the geological survey**.
- [CKAN JSON metadata](https://lineasdebasepublicas.mma.gob.cl/datos_abiertos/api/3/action/package_show?id=geologia-base).
- [Resource labeled SHP](https://lineasdebasepublicas.mma.gob.cl/datos_abiertos/dataset/fe09e3df-c26e-41c8-bd7d-ac9605b1b0aa/resource/b4196bd6-a094-4f1e-914e-118f07df9983/download/geologia-base_shapefile.zip): download verified, **its actual content is GeoJSON**, 5.995.050 compressed bytes.
- [Resource labeled GeoJSON](https://lineasdebasepublicas.mma.gob.cl/datos_abiertos/dataset/fe09e3df-c26e-41c8-bd7d-ac9605b1b0aa/resource/44d0cc33-0059-4b65-88b0-f73bc46a3fdb/download/geologia-base_geojson.zip): download verified, **its actual content is Shapefile**, 5.653.045 bytes. The labels are swapped in what was downloaded during this audit. Adapters must inspect content and schema.
- The geometries of 306 records near the pilot match between both formats. There are 115 null geometries in the national file; those 115 are not attributed to our sectors.
- In the four Chilean windows there is approximately 0,6–1,2 % overlap between units, in addition to gaps. Processing must separate no-data area from ambiguous area; summing unit percentages without handling overlaps produces a misleading distribution.
- [SERNAGEOMIN direct catalog](https://portalsdnmext.sernageomin.cl/publicacionesgeologicas): includes more detailed cartography, but a direct, complete vector download for the four polygons was not verified here. Direct access produced errors during the query. The MMA route did work.

### Argentina

- [SIGAM/SEGEMAR geoservices](https://sigam.segemar.gov.ar/sigam/geoservicios/): WFS for vector objects, WMS for visualization and CSW for metadata. The page declares CC BY 4.0; keep attribution and record the layer's conditions when packaging the integration.
- [WFS GetCapabilities](https://sigam.segemar.gov.ar/geoserver217/ows?SERVICE=WFS&REQUEST=GetCapabilities).
- Verified request: base `https://sigam.segemar.gov.ar/geoserver217/ows`, `service=WFS`, `version=1.0.0`, `request=GetFeature`, `typeName=sigam:e250K_UnidadGeologica`, `bbox=-67.8,-26.5,-66.8,-25.5,EPSG:4326`, `srsName=EPSG:4326`, `outputFormat=application/json`, `maxFeatures=2000`.
- Regional result: 700 features, `numberMatched=numberReturned=700`; the limit was not reached. Useful fields: sheet, unit code and name, lithological description, ages and genesis. Many other columns are empty: they must not be turned into facts by AI.
- The individual queries returned 46, 0 and 28 features; after clipping geometries with positive area, 44, 0 and 27. remain. The geometric coverage matches the regional query intersection exactly.
- An exploratory `resultType=hits` test with WFS 1.0 returned zero even in areas with features. **Do not use that response to decide absence**; the actual GeoJSON features and their geometry were checked. A production connector must fix the version, axis order and explicit completeness checks.
- References for cross-checking units: [Cachi Sheet](https://repositorio.segemar.gov.ar/handle/308849217/99), [Paso San Francisco Sheet](https://repositorio.segemar.gov.ar/handle/308849217/167) and [Antofalla Sheet](https://repositorio.segemar.gov.ar/handle/308849217/97). Do not confuse the date of incorporation into the repository with the date of publication or of the survey.

## Value for the product and the AI

1. **Geological context: clear value.** A sheet can show which mapped units cross the window, which surface lacks coverage, the scale, the source and questions for reconnaissance. It helps justify why an area should be studied.
2. **Test requirements: conditional value.** A future requirement "mapped presence of volcanic units" would be different from "exposed, traversable basaltic rock". It requires a controlled vocabulary, provenance, a scale accepted by the user and explicit rules for partial coverage. Do not translate one into the other automatically.
3. **AI explanation: later improvement.** Anthropic could explain previously validated geological facts and cite their IDs. It must not fill gaps, turn a regional category into surface soil, or declare similarity to Jezero without a compatible planetary reference.
4. **Geological analogy score: do not enable now.** Currently `geologic_relevance` weighs 0,10 in the profile, but it is `needs_calibration`, has zero quality and does not enter similarity; the valid weight is 0,90. Introducing terrestrial data is not enough to calibrate compatibility with Mars. Adding it would require another scientific version and expert review; it does not guarantee that the ranking will improve.

## Recommended scope and effort

Engineering estimate with Claude implementing and Codex reviewing; it includes normal fixes, but not the acquisition of paid cartography or external scientific review.

| First-cut work | Estimate | Result |
|---|---:|---|
| Download and cache adapters, metadata and content checks | 4–6 h | Two reproducible public sources, no API in the browser |
| Clipping, invalid geometries, gaps, overlaps and separate contract | 6–10 h | Context per sector with explicit states and hashes |
| Geological sheet and own export | 4–6 h | Legible units, coverage, scale and source; without touching scores |
| Independent review, data tests, offline mode and package | 6–10 h | Reviewed delivery without regressions in M8 |
| **Total** | **20–32 h** | **Useful, bounded first cut** |

A colored layer on the map would add approximately 6–10 h. Incorporating geology into the AI context and into structured requirements would be another cut of approximately 8–16 h of engineering, once the vocabulary and its interpretation have been reviewed; the specialist's time is estimated separately. They are not necessary to prove the initial value.

Do not budget yet for a planetary score: the decisive work would be choosing Mars references, harmonizing scale and variables, defining compatibility, and validating it with experts. More code or more credentials do not replace that work.

## Proposed technical integration for Claude

This section is a scope prepared for a future assignment, **not an order to start implementation**.

- Create an independent geological-context artifact, with its own contract and a link to the exact geometry hash of each site. Keep `science-v2`, `science-v3`, profiles, weights and rankings byte for byte.
- Process in batches in Python. `requests` and `pyproj` are already available; it is probably enough to add Shapely to the pipeline dependencies. The verified Chilean GeoJSON makes it possible to avoid GDAL/GeoPandas and a Shapefile reader in the initial cut.
- Data per site: original provider and distributor; layer/sheet/version; original code and name; original description; query date and map date kept separate; scale; coverage, gaps and ambiguity; requested/processed geometry; transformations, license, URL and hash. Unknowns remain null.
- Do not use AI to classify lithologies in this phase. Keep the source names; do not present a harmonized vocabulary as reviewed by a geologist when it is not.
- Invalid geometries: record IDs, method and effect of the repair. If the repair materially alters the area or does not produce coherent polygons, mark that evidence as unusable until review. The current audit is exploratory, not automatic acceptance of repairs.
- Show the record only for its exact geometry. A point within a window or a sub-polygon does not inherit aggregated percentages. Coverage 0 means "this layer does not cover the sector", not "no rocks" nor "discarded".
- Create an available/partial/no coverage/source error status separate from the trial's suitability status. Do not give a ranking advantage to the country with more detailed mapping.
- Keep the score's "Uncalibrated geology" card, explaining that cartographic context may exist without calibrated planetary compatibility.
- Adapt optional loading in the web app, the packager's allowlist and the geological export; if the context is missing or fails, M8 keeps working. Do not change the recommendation report schema without versioning it.
- Existing files to review: `apps/web/src/data/loadDemoSnapshot.ts`, `apps/web/src/components/CandidateDetails.tsx`, `scripts/package_release.py` and their tests. AI would be left for another cut: `server/ai/facts.ts`, shared contracts, evidence validation and export.
- Acceptance criteria: seven honest statuses; sources and scale visible; gaps and conflicts not added up as known material; no score changes; reproducibility from cache; truncated response rejected; source errors tolerated; traceable export; mobile screen and offline reviewed.

## Evidence and reproduction

- Detailed results and hashes: `docs/research/geology/measurements.json`.
- Offline calculation: `docs/research/geology/audit.py`. Intersection in lon/lat, areas in the equal-area projection EPSG:6933, preservation of gaps, dissolving by unit and separate calculation of overlap between units. The units are not normalized to force 100 %.
- Local ignored public cache: `data/raw/geology-feasibility-20261114/`, 13 files, 20.873.381 bytes. It contains both Chilean ZIPs, CKAN metadata, WFS capabilities, three Argentine layers, individual queries and independent controls. That cache is not redistributed in the build.
- For a new reproduction, the responses must be obtained from the links and parameters above, their hashes recorded, and the individual checks repeated; the sources may change. The offline script does not download data nor guarantee that a future query will be identical.
- Audit environment: Shapely 2.2.0 and pyshp 2.4.2 installed exclusively in `/tmp/analogos-geology-audit-libs`; pyshp was used to cross-check formats and is not needed to rerun the GeoJSON calculation. `pyproj` comes from the project's existing environment.

Command run from the repository root:

```sh
PYTHONPATH=/tmp/analogos-geology-audit-libs .venv/bin/python docs/research/geology/audit.py \
  --raw-dir data/raw/geology-feasibility-20261114 \
  --candidates artifacts/science-v3/candidate-details.json \
  --output docs/research/geology/measurements.json
```

Verification of the existing product: `source .venv/bin/activate && npm run verify` → 177 Python tests and 196 web tests pass; 2 real-AI tests skipped because they are opt-in; typecheck and build correct. That check validates that the current state still works, **not that geology is already integrated**.

## Pending product decision

I recommend authorizing the first cut described and measuring its usefulness with a campaign manager: whether they can explain which environment is mapped in a sector, which part is unknown and what needs to be verified in the field. If the user only needs the same information they already get from the relief and imagery, do not expand toward filters or geological AI.

Until a new assignment, M8 remains accepted and published; Claude waits. This assessment does not authorize a ranking change, a suitability claim or a publication to dev.
