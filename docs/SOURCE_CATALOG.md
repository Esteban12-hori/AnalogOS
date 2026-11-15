# Source Catalog

## Official Challenge Resources

| ID | Resource | Priority | URL | Note |
|---|---|---:|---|---|
| R1 | NASA Earthdata Search | P0 | https://search.earthdata.nasa.gov/search | Earth data download and metadata |
| R2 | NASA Worldview | Validation | https://worldview.earthdata.nasa.gov/ | Visual inspection, not a direct score |
| R3 | NASA PDS | P0 | https://pds.nasa.gov/ | Planetary archive |
| R4 | NASA LRO | P1 | https://science.nasa.gov/mission/lro/ | Future lunar profile |
| R5 | LRO Diviner | P1 | https://science.nasa.gov/mission/lro/spacecraft-and-instruments/ | Lunar thermal signature |
| R6 | CSA RCM | P2 | https://www.csa-asc.gc.ca/eng/satellites/radarsat/access-to-data/about.asp | Access/license with friction |
| R7 | RADARSAT-1 | P1 | https://www.csa-asc.gc.ca/eng/satellites/radarsat1/data-access.asp | Open archive |
| R8 | CSA SAR Tutorial | Learning | https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial | Python/QGIS guide |
| R9 | Copernicus Data Space | P0/P1 | https://dataspace.copernicus.eu/ | Sentinel-2; Sentinel-1 optional |
| R10 | ESA Open Science Catalog | P2 | https://opensciencedata.esa.int/ | Product discovery |
| R11 | JAXA G-Portal | P2 | https://gportal.jaxa.jp/ | Registration required to download |

## APIs and Documentation

- NASA CMR: https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html
- NASA POWER: https://power.larc.nasa.gov/docs/services/api/
- NASA GIBS: https://nasa-gibs.github.io/gibs-api-docs/access-basics/
- PDS MOLA: https://pds-geosciences.wustl.edu/missions/mgs/mola.html
- Copernicus docs: https://documentation.dataspace.copernicus.eu/
- IDE Chile: https://www.ide.cl/
- SERNAGEOMIN: https://www.sernageomin.cl/geologia-general/
- Geomin Portal: https://portalgeomin.sernageomin.cl/
- Base Geology (SERNAGEOMIN via MMA, CKAN, CC0 declared): https://lineasdebasepublicas.mma.gob.cl/datos_abiertos/dataset/geologia-base
- SIGAM/SEGEMAR Geoservices (WFS, CC BY 4.0 declared by the page): https://sigam.segemar.gov.ar/sigam/geoservicios/ — uses and limits in `docs/GEOLOGY_CONTEXT.md`

## Access to Prepare

- Earthdata Login tested with `earthaccess`; NASADEM download and HLS query operational.
- Copernicus Data Space OAuth tested; Sentinel-2 L2A Statistical API operational.
- Do not make P0 depend on RCM or JAXA.
- Record any redistribution restriction in the manifest.

## Products Frozen in v2

- `NASADEM_HGT.001`: six ZIP archives, including the SWB mask, downloaded with Earthdata Login.
- `HLSS30 v2.0`: CMR inventory 2025 per AOI; its pixels do not enter the score.
- `sentinel-2-l2a`: Statistical API, 12 monthly intervals of 2025, ~30 m nominal.
- MOLA `MEGT44N000HB` and NASA POWER 2001–2025 are retained from v1.

## Selection Rule

Prefer a primary, official source with a clear license and sufficient metadata. Worldview and viewers are for inspection; the score must use the underlying data product.
