# Catálogo de fuentes

## Recursos oficiales del desafío

| ID | Recurso | Prioridad | URL | Nota |
|---|---|---:|---|---|
| R1 | NASA Earthdata Search | P0 | https://search.earthdata.nasa.gov/search | Descarga y metadatos de Tierra |
| R2 | NASA Worldview | Validación | https://worldview.earthdata.nasa.gov/ | Inspección visual, no score directo |
| R3 | NASA PDS | P0 | https://pds.nasa.gov/ | Archivo planetario |
| R4 | NASA LRO | P1 | https://science.nasa.gov/mission/lro/ | Perfil lunar futuro |
| R5 | LRO Diviner | P1 | https://science.nasa.gov/mission/lro/spacecraft-and-instruments/ | Firma térmica lunar |
| R6 | CSA RCM | P2 | https://www.csa-asc.gc.ca/eng/satellites/radarsat/access-to-data/about.asp | Acceso/licencia con fricción |
| R7 | RADARSAT-1 | P1 | https://www.csa-asc.gc.ca/eng/satellites/radarsat1/data-access.asp | Archivo abierto |
| R8 | Tutorial SAR CSA | Aprendizaje | https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial | Guía Python/QGIS |
| R9 | Copernicus Data Space | P0/P1 | https://dataspace.copernicus.eu/ | Sentinel-2; Sentinel-1 opcional |
| R10 | ESA Open Science Catalog | P2 | https://opensciencedata.esa.int/ | Descubrimiento de productos |
| R11 | JAXA G-Portal | P2 | https://gportal.jaxa.jp/ | Registro para descargar |

## APIs y documentación

- NASA CMR: https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html
- NASA POWER: https://power.larc.nasa.gov/docs/services/api/
- NASA GIBS: https://nasa-gibs.github.io/gibs-api-docs/access-basics/
- PDS MOLA: https://pds-geosciences.wustl.edu/missions/mgs/mola.html
- Copernicus docs: https://documentation.dataspace.copernicus.eu/
- IDE Chile: https://www.ide.cl/
- SERNAGEOMIN: https://www.sernageomin.cl/geologia-general/
- Portal Geomin: https://portalgeomin.sernageomin.cl/

## Accesos a preparar

- Earthdata Login probado con `earthaccess`; descarga NASADEM y consulta HLS operativas.
- OAuth Copernicus Data Space probado; Statistical API Sentinel-2 L2A operativo.
- No hacer depender P0 de RCM ni JAXA.
- Registrar en el manifiesto cualquier restricción de redistribución.

## Productos congelados en v2

- `NASADEM_HGT.001`: seis archives ZIP, incluida máscara SWB, descargados con Earthdata Login.
- `HLSS30 v2.0`: inventario CMR 2025 por AOI; sus píxeles no entran al score.
- `sentinel-2-l2a`: Statistical API, 12 intervalos mensuales de 2025, ~30 m nominal.
- MOLA `MEGT44N000HB` y NASA POWER 2001–2025 se conservan desde v1.

## Regla de selección

Preferir fuente primaria, oficial, con licencia clara y metadatos suficientes. Worldview y visores sirven para inspección; el score debe usar el producto de datos subyacente.
