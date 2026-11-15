# Attributions, licenses and use

## Data

### NASA PDS MOLA

- Provider: NASA Planetary Data System, Geosciences Node.
- Product: Mars Global Surveyor MOLA Mission Experiment Gridded Data Record.
- File used: `MEGT44N000HB`.
- Source: https://pds-geosciences.wustl.edu/missions/mgs/megdr.html
- Use: regional topographic reference for Mars.

### NASADEM

- Provider: NASA EOSDIS Land Processes DAAC.
- Product: NASADEM Merged DEM Global 1 arc second V001 (`NASADEM_HGT.001`).
- Source: https://doi.org/10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001
- Use: elevation, slope, roughness, local relief and SWB water mask.

### NASA HLS

- Product: HLS Sentinel-2 Multi-spectral Instrument Surface Reflectance Daily Global 30m v2.0.
- Source: https://doi.org/10.5067/HLS/HLSS30.002
- Use: independent 2025 availability inventory; its pixels do not enter the v2 score.

### Copernicus Sentinel-2

- Provider: Copernicus Data Space Ecosystem — Sentinel Hub.
- Product: Sentinel-2 L2A via Statistical API.
- Source: https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html
- Use: non-vegetated surface, vegetation, water, NDVI and monthly BSI from 2025.
- Attribution: Modified Copernicus Sentinel data 2025 / Sentinel Hub.

### Copernicus Sentinel-2 — visual context

- Provider: Copernicus Data Space Ecosystem — Sentinel Hub.
- Product: Sentinel-2 L2A via Process API; three RGB views (B04/B03/B02) in `visual-context/`, one per candidate.
- Source: https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Process.html
- Period: December 2025 mosaic (2025-12-01 to 2026-01-01 UTC), maximum cloud cover 40 % per scene.
- Use: preliminary visual context on the data sheet; it does not participate in the score or close verifications.
- Attribution: contains modified Copernicus Sentinel data (2025), processed with Sentinel Hub in the Copernicus Data Space Ecosystem.
- Provenance per image (request, scenes, query time and SHA-256): `visual-context/index.json`.

### NASA POWER

- Provider: NASA Prediction Of Worldwide Energy Resources.
- Service: Climatology Point API.
- Source: https://power.larc.nasa.gov/docs/services/api/temporal/climatology/
- Use: regional context of precipitation and skin temperature 2001–2025.

### Natural Earth

- Product: Admin 0 Countries, scale 1:50m, via `world-atlas` 2.0.2 (Chile and Argentina in the v3 snapshot).
- Source: https://www.naturalearthdata.com/downloads/50m-cultural-vectors/
- License: public domain.
- Use: reference outlines of Chile and Argentina; they are not official boundaries or territorial authority, and do not participate in the score.

### Analog background

- Own catalog `config/analog_precedents_v1.json`, reviewed on 2026-11-14, with the sources cited in each entry.
- Sampling coordinates transcribed from the supplementary material of Navarro-González et al. (2003), Science 302: https://www.astro.uantof.cl/wp-content/uploads/2015/06/navarro.SOM_.pdf
- Other sources: NASA Astrobiology (2005 and 2017), Azua-Bustos et al. (2015), Universidad Nacional de Catamarca (2025), CONICET sheet (2021) and EPSC abstracts 2022.
- Use: record background information and exclude from the ranking the windows with published coordinates. It does not participate in the score.

## Software

The AnalogOS code is distributed under the MIT license. Main dependencies: React, Vite, TypeScript, Ajv, JSON Schema, earthaccess, Requests, NumPy, PyProj and pytest. Each dependency retains its own license.

## Warning

The names of sectors and polygons are approximate screening windows, not administrative boundaries, properties or authorized sites, in Chile or in Argentina. The authorities cited in the data sheets (IDE Chile, IDERA) indicate where to verify; they do not imply permission. Official sources maintain their own terms of use and attribution; the snapshot manifest records exact links and checksums.
