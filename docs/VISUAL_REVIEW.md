# Visual review of the candidates (M4, partial progress)

This document accompanies `artifacts/visual-context/`. It records where the three images come from, how to reproduce them, what is worth looking at, and what was observed when viewing them. It is not an expert review and does not close M4.

## What it is and what it is not

- It is one natural-color Sentinel-2 L2A view per candidate, saved offline with its provenance.
- It does not modify similarity, confidence, stability or feasibility.
- It does not validate a site, does not assess ownership, access or restrictions, and does not replace a recent image or a site visit.

## Source

| Field | Value |
|---|---|
| Service | Copernicus Data Space Ecosystem — Sentinel Hub Process API (`https://sh.dataspace.copernicus.eu/process/v1`) |
| Collection | `sentinel-2-l2a`, bands B04, B03, B02 and `dataMask` |
| Window | 2025-12-01T00:00:00Z to 2026-01-01T00:00:00Z |
| Mosaic | `ORBIT`, order `leastCC`, maximum cloud cover 40 % per scene; per pixel, first orbit with data |
| Transformation | reflectance × 2,0 clipped to [0, 1], 8 bits; alpha 0 no data |
| Framing | bbox of the versioned polygon of each candidate (0,2° × 0,2°), CRS84 |
| Size | 705–714 × 768 px, about 28,8 m per pixel (the bands are 10 m at source) |
| Attribution | Contains modified Copernicus Sentinel data (2025), processed with Sentinel Hub |

Query made on 2026-11-14 between 16:16 and 16:18 UTC. Orbits according to the metadata returned by the service:

| Candidate | Orbits considered | Orbit that provided the pixels | Valid pixels |
|---|---:|---|---:|
| Pampa Yungay | 15 | 2025-12-21 (100 %) | 100 % |
| Pampa María Elena | 15 | 2025-12-21 (100 %) | 100 % |
| Cordón de Domeyko | 8 | 2025-12-03 (100 %) | 100 % |

Although each view comes from a single orbit, the product is labeled as a mosaic of the period: it is the result of applying the rule to December 2025,, not the choice of a date.

## Reproduction

```bash
source .venv/bin/activate
python -m pipelines.fetch_visual_context            # reuses the local package; no network or credentials
python -m pipelines.fetch_visual_context --refresh  # consulta de nuevo; requiere COPERNICUS_CLIENT_ID y COPERNICUS_CLIENT_SECRET
```

`artifacts/visual-context/index.json` stores, per site, the exact request (including the evalscript), the returned metadata, the query time and the SHA-256 of the PNG. A new query may return different bytes if the service changes version or reprocesses scenes.

## What to inspect

1. Rectilinear traces, geometric structures and any sign of infrastructure or activity within the polygon.
2. Channels, bright surfaces and abrupt changes in tone that suggest water, salts or different materials.
3. Continuity of broad surfaces without apparent obstacles at this scale.
4. Clouds, shadows or haze that alter the reading.
5. Consistency with the score criteria (relief, non-vegetated surface), without using the image to correct them.

## Observations after viewing the images

Made by Claude on the three PNGs at full size on 2026-11-14; Codex inspected them independently. These are descriptions of what appears in the view, not identifications.

### Pampa Yungay

- No appreciable vegetation or clouds.
- Network of darker branching shapes in the northern half and in the southwest; lighter, smooth strip crossing from west to east through the center.
- Fine rectilinear traces in several directions, including a long diagonal in the southwest.
- Set of bright patches with rectangular outlines in the southeast quadrant, and some smaller ones near the center-east.

### Pampa María Elena

- Mostly flat surface, with no appreciable vegetation or clouds.
- Long north–south and east–west rectilinear traces forming a grid.
- Dark, sinuous strip along the east edge.
- Two dark sets with rectangular outlines (top center and east), a dark oval structure near the center with a dense pattern beside it, a very bright rectangular area to the east and a bright set with reddish patches south of the center.

### Cordón de Domeyko

- No appreciable vegetation or clouds.
- Relief with darker tones in the western half; lighter fan-shaped surfaces in the eastern half.
- Numerous fine rectilinear traces crossing each other in the eastern half.
- White patch in the northwest and a rectangular structure on the east edge.

## Hypotheses to test (not verified)

The rectilinear traces and geometric structures, especially visible in Yungay and María Elena, are compatible with roads, facilities or industrial activity. This is an appearance to be tested:

- It has not been verified what they are, who owns them, or whether they imply access restrictions.
- They do not produce an automatic exclusion or change feasibility, which remains at "requires review".
- The sinuous strip in María Elena could be a channel; the white patch in Domeyko, a saline surface. Neither reading has been verified.

To test them, the official layers of urban areas, infrastructure, property and protected areas are needed, which remain unintersected.

## Pending

- Intersection with official territorial layers (urban, infrastructure, property, sensitive areas).
- Recent imagery (2026) or NASA Worldview to detect changes after December 2025.
- Review by a person with geological or rover-campaign experience.
- Log of false positives and corrections.

## v3 package (Chile–Argentina pilot)

`artifacts/visual-context-v3/` contains one view per site from the v3 snapshot: six candidates queried on 2026-11-14 at around 18:00 UTC and the Yungay reference, reused unchanged from the v2 package. Same collection, window, mosaic and transformation described above.

```bash
python -m pipelines.fetch_visual_context --snapshot v3            # reutiliza el paquete local
python -m pipelines.fetch_visual_context --snapshot v3 --refresh  # hasta 6 consultas nuevas; requiere credenciales
```

Preliminary observations by Codex and Claude, made after viewing each image. They describe appearance; they do not identify facilities, owners or permits and do not change any score.

| Window | Observation |
|---|---|
| `cl-win-s2500-w06970` | Numerous linear traces and a sinuous, branching, light-toned network in the northeast |
| `cl-win-s2480-w06950` | Relief with fans, a wide, sinuous light-colored band and linear traces |
| `cl-win-s2520-w06950` | Rectilinear traces and light-toned geometric concentrations in the north |
| `ar-win-s2620-w06750` | Dark fields in the center and east and a green or dark strip on the northeast edge |
| `ar-win-s2640-w06730` | Dense concentration of light-colored structures in the south with an adjacent green or dark strip, consistent with human intervention to be verified |
| `ar-win-s2580-w06710` | Branching green or dark strips in the north and west |

These observations appear as a warning on each card. A window of ~440 km² is not entirely free or suitable terrain; all remain "requires review" and need to be cross-checked against official territorial layers of Chile and Argentina.
