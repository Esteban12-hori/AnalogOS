# Atribuciones, licencias y uso

## Datos

### NASA PDS MOLA

- Proveedor: NASA Planetary Data System, Geosciences Node.
- Producto: Mars Global Surveyor MOLA Mission Experiment Gridded Data Record.
- Archivo usado: `MEGT44N000HB`.
- Fuente: https://pds-geosciences.wustl.edu/missions/mgs/megdr.html
- Uso: referencia topográfica regional de Marte.

### NASADEM

- Proveedor: NASA EOSDIS Land Processes DAAC.
- Producto: NASADEM Merged DEM Global 1 arc second V001 (`NASADEM_HGT.001`).
- Fuente: https://doi.org/10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001
- Uso: elevación, pendiente, rugosidad, relieve local y máscara de agua SWB.

### NASA HLS

- Producto: HLS Sentinel-2 Multi-spectral Instrument Surface Reflectance Daily Global 30m v2.0.
- Fuente: https://doi.org/10.5067/HLS/HLSS30.002
- Uso: inventario independiente de disponibilidad 2025; sus píxeles no entran al score v2.

### Copernicus Sentinel-2

- Proveedor: Copernicus Data Space Ecosystem — Sentinel Hub.
- Producto: Sentinel-2 L2A mediante Statistical API.
- Fuente: https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html
- Uso: superficie no vegetada, vegetación, agua, NDVI y BSI mensual de 2025.
- Atribución: Modified Copernicus Sentinel data 2025 / Sentinel Hub.

### NASA POWER

- Proveedor: NASA Prediction Of Worldwide Energy Resources.
- Servicio: Climatology Point API.
- Fuente: https://power.larc.nasa.gov/docs/services/api/temporal/climatology/
- Uso: contexto regional de precipitación y temperatura de piel 2001–2025.

### Natural Earth

- Producto: Admin 0 Countries, escala 1:50m, vía `world-atlas`.
- Fuente: https://www.naturalearthdata.com/downloads/50m-cultural-vectors/
- Licencia: dominio público.
- Uso: contorno referencial de Chile; no es un límite oficial ni participa del score.

## Software

El código de AnalogOS Chile se distribuye bajo licencia MIT. Dependencias principales: React, Vite, TypeScript, Ajv, JSON Schema, earthaccess, Requests, NumPy, PyProj y pytest. Cada dependencia conserva su propia licencia.

## Advertencia

Los nombres de sectores y polígonos son ventanas de screening aproximadas, no límites administrativos, propiedades ni sitios autorizados. Las fuentes oficiales mantienen sus propias condiciones de uso y atribución; el manifiesto del snapshot registra enlaces y checksums exactos.
