# Arquitectura P0

## Principio

Static-first. Todo procesamiento pesado ocurre antes de la demo. El navegador consume un snapshot pequeño, versionado y validado.

## Componentes

```text
Fuentes abiertas
  ↓
pipelines/ingest
  ↓ validación de licencia, checksum, CRS, unidades y NoData
pipelines/features
  ↓ variables por celda
pipelines/scoring
  ↓ similitud, confianza y restricciones
pipelines/candidates
  ↓ clustering y generalización
artifacts/demo
  ↓ JSON + GeoJSON + metadatos
apps/web
  ↓ mapa, ranking, ficha, comparación y metodología
build estático
```

## Frontend

- Vite + React + TypeScript.
- MapLibre GL JS.
- Estado local; no Redux en P0.
- Carga desde `/demo/manifest.json` y rutas relativas.
- Vista inicial: mapa + panel lateral.
- Rutas opcionales: `/`, `/methodology`, `/about`.
- Sin login.
- Sin telemetría de usuario.

## Pipeline

- Paquete Python instalable.
- Configuración explícita, no constantes dispersas.
- Cada etapa escribe un artefacto versionado y logs legibles.
- Archivos grandes no se versionan salvo el snapshot demo reducido y con licencia permitida.
- Cada resultado debe registrar `profile_version`, `data_snapshot_version` y `pipeline_version`.

## Contrato web

El frontend no conoce Rasterio, CRS internos ni lógica de descarga. Solo consume:

- `manifest.json`;
- `mission-profile.json`;
- `candidates.geojson`;
- `candidate-details.json`;
- capas PMTiles opcionales.

Los archivos deben validar contra `contracts/` antes del build.

## Estructura mínima de la web

```text
apps/web/src/
├── app/
├── components/
│   ├── CandidateMap.tsx
│   ├── CandidateRanking.tsx
│   ├── CandidateDetails.tsx
│   ├── ScoreBreakdown.tsx
│   └── DataProvenance.tsx
├── domain/
│   ├── contracts.ts
│   ├── scoring.ts
│   └── formatting.ts
├── data/
│   └── loadDemoSnapshot.ts
├── styles/
└── tests/
```

## Estados obligatorios

- carga;
- error de contrato;
- snapshot ausente;
- lista vacía;
- candidato seleccionado;
- datos insuficientes;
- fixture/no científico;
- offline.

## No construir en P0

- FastAPI, salvo evidencia de necesidad;
- base de datos;
- PostGIS;
- autenticación;
- edición colaborativa;
- procesamiento raster en peticiones web;
- llamadas LLM en la demo central.

## Seguridad y licencias

- Secretos solo en `.env`, nunca expuestos al frontend.
- `.env.example` no contiene valores reales.
- Mostrar atribución de cada capa.
- No redistribuir datasets si su licencia no lo permite.
- Generalizar sitios sensibles y nunca afirmar permiso de acceso.

## Definition of Done técnica

- `npm run build` termina sin errores.
- `npm run test` está verde.
- `python -m pytest` está verde.
- Un comando genera el snapshot demo.
- Los artefactos validan contra los schemas.
- La web funciona sirviendo el directorio construido sin red externa.
- Un segundo computador puede ejecutar las instrucciones del README.
