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
artifacts/science-v3
  ↓ JSON + GeoJSON + metadatos
apps/web
  ↓ mapa, ranking, ficha, comparación y metodología
build estático
```

## Frontend

- Vite + React + TypeScript.
- Globo 3D (three.js, chunk diferido, texturas NASA locales) con mapa SVG local de Natural Earth como alternativa y fallback sin WebGL; con paso a mapa 2D MapLibre y teselas NASA GIBS opcionales (ADR-006/007).
- Estado local; no Redux en P0.
- Carga final desde `/science-v3/manifest.json` y rutas relativas; `/demo/` se conserva solo para tests.
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
- `candidate-details.json`;
- `context-outline.geojson`;
- `search-results.json` y `precedents.json`;
- `analysis-summary.json`.

Los archivos deben validar contra `contracts/` antes del build.

## Estructura mínima de la web

Tras integrar el rediseño con dev (ADR-010, ADR-013), la web es un escenario fijo con features
independientes que leen los stores compartidos; el planificador del equipo vive en `mission/` y
`components/planner/` y se reutiliza dentro de «Tu misión».

```text
apps/web/src/
├── App.tsx                  # carga en el límite y promesa del producto
├── shell/                   # armazón: escenario, dock, riel, hoja, ficha (Origen, Método…)
├── state/                   # stores ui y mission (único escritor: el controlador de misión)
├── features/
│   ├── globe/               # globo, paso a 2D, marcadores, mapa SVG sin WebGL (CandidateMap)
│   ├── places/              # carrusel (candidatos, REF, ◆, filtro por país, grupos de Misión)
│   ├── metrics/             # riel de métricas y capa de requisitos
│   ├── leaders/             # líneas Tesla
│   ├── boot/                # arranque «Órbita honesta»
│   ├── composer/            # dock, «Tu misión», controlador del planificador
│   └── analysis/            # Lectura: resultado, motivos destacados, hechos
├── components/
│   ├── planner/             # piezas del planificador del equipo (PlannerView, ResultView…)
│   └── CandidateComparison.tsx, SurfaceSignals.tsx, …
├── mission/                 # reexports de shared/mission y cliente de IA (aiClient)
├── domain/                  # contratos (validadores precompilados), discovery, formato
└── data/                    # loadDemoSnapshot, contexto visual, mapas base
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
- Un clon limpio puede ejecutar `npm run verify`; la prueba que reprocesa NASADEM crudo se activa únicamente cuando `data/raw/` está disponible.

## M8: planificador y capa de decisión (ADR-009)

- **Núcleo compartido** (`apps/web/src/mission/`, TypeScript estricto, puro y sin red): catálogo de seis métricas medidas, validación Ajv, geometría, motor determinista, explicación por selección, exportación y estado del planificador (`plannerState.ts`, el reductor que usa la UI). La UI y el servidor importan el mismo código.
- **Contratos aditivos** en `contracts/`: `mission-request`, `mission-evaluation`, `mission-export`, `mission-ai`. Los contratos de ciencia v2/v3 no cambian.
- **Servidor opcional** (`server/ai/`, `api/ai.ts`): handler agnóstico testeable + adaptador Node para Vercel y para el servidor local (plugin de `apps/web/vite.config.ts`). Hechos siempre desde `artifacts/science-v3` validado. Detalle y límites en `docs/AI_SETUP.md`.

El motor puro y los contratos TypeScript compartidos viven en `shared/mission/` y `shared/domain/contracts.ts`. Las rutas antiguas de la web reexportan esta única implementación; el servidor importa `shared/` directamente para no cruzar el ámbito ESM del paquete frontend durante la compilación NodeNext. Antes de desplegar, CI ejecuta `scripts/check-vercel-function.mjs` contra la salida real de Vercel y exige respuestas controladas sin credenciales ni red.
- **Motor**: críticos primero (incumplido ⇒ no cumple; desconocido o escala inadecuada ⇒ evidencia insuficiente); entre los demás se ordena por preferencias cumplidas, similitud v3 y ID. Sin porcentaje de aptitud nuevo. Geometrías: solo una ventana idéntica (épsilon 1e-9°) o elegida explícitamente hereda estadísticos; punto, subbbox y cobertura parcial no.
- **UI** (`components/planner/`): dos entradas, pasos (describir, sector, confirmar, resultado), editor de requisitos, esquema SVG local, resultado, informe imprimible (CSS `@media print`) y exportación JSON validada. Cualquier edición invalida confirmación, resultado y llamadas de IA pendientes; las respuestas tardías se ignoran por `requestId` y huellas.
- **Estático/offline**: nada del planificador requiere red; el ZIP no lleva función ni clave.
