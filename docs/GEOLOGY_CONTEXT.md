# Contexto geológico M9 — operación, reproducción y fuentes

Paquete: `artifacts/geology-context-v1/index.json` (versionado). Contrato: `contracts/geology-context.schema.json`. Decisiones: `docs/decisions/ADR-010-geology-context.md`.

## Comandos

```sh
source .venv/bin/activate
python -m pip install -e '.[dev]'              # incluye shapely>=2.2,<2.3
python -m pipelines.build_geology_context --refresh   # descarga pública nueva (CKAN + ZIP Chile + 3 WFS) y reconstruye
python -m pipelines.build_geology_context --offline   # reconstruye solo desde data/raw/geology-context-v1/ (sin red)
python -m pipelines.build_geology_context             # usa la caché si es válida; si no, descarga
python -m pytest tests/test_geology_coverage.py tests/test_geology_fetch.py tests/test_geology_context.py -q
```

Sin credenciales: el pipeline no usa `.env`; las peticiones llevan solo `Accept` y `User-Agent` (comprobado en pruebas). Caché nueva y paquete nuevo se preparan aparte, se validan por completo y recién entonces se reemplazan en pareja con rollback: un fallo de HTTP, análisis, contrato o publicación deja lo anterior. No hay atomicidad frente a un corte de energía entre ambos reemplazos (pueden quedar directorios ocultos `.previo`). El rebuild offline es idéntico byte a byte.

## Fuentes y condiciones

| Fuente | Autoridad original / distribuidor | Escala | Petición | Licencia declarada |
|---|---|---:|---|---|
| Geología Base | SERNAGEOMIN / MMA | 1:1.000.000 | CKAN `package_show?id=geologia-base`; se usa el recurso ZIP cuyo contenido real es GeoJSON | CC0 solo si CKAN declara `license_id` = `cc-zero`; si cambia, el build se rechaza |
| `sigam:e250K_UnidadGeologica` | SEGEMAR / SIGAM, Sistema de Información Geológica Ambiental Minera (WFS) | 1:250.000 | WFS 1.0.0 GetFeature por sector, `srsName=EPSG:4326`, bbox exacta, `maxFeatures=2000` | CC BY 4.0 declarada por la página de geoservicios; alcance registrado, sin licencia adicional |

URLs exactas, SHA-256, bytes y `acquired_at` de cada respuesta están en `sources[].requests[]` del paquete. La fecha del levantamiento es `null`; `catalog_modified_at` es solo la actualización del registro del catálogo.

## Datos grandes no versionados (ignorados)

`data/raw/geology-context-v1/` (~6,9 MB: `acquisition.json`, `ckan-package_show.json`, `cl-geologia-base.zip`, tres `ar-<site_id>.json`). Ya existente e ignorada: `data/raw/geology-feasibility-20261114/` (20,9 MB, investigación; no se publica ni entra al paquete). El raw no entra al bundle ni al ZIP.

## Cómo leer un sector

- `availability` define evidencia: `available` (cobertura completa, sin ambigüedad, sin rechazos ni descripciones ausentes), `partial`, `no_coverage` (esta capa no cubre el sector), `unavailable`.
- `area_fractions`: `unmapped + covered_unambiguous + covered_ambiguous + unusable_upper_bound = 1`. Mostrar porcentaje y estado por separado; cobertura no es precisión.
- `units[]`: identidad de fuente, código, nombre, descripción original (o `null`), fracción con y sin ambigüedad, y propiedades originales de cada entidad.
- `geometry_diagnostics[]`: reparaciones aceptadas/rechazadas con áreas antes/después.
- `verification_questions[]`: orientación editorial, no mediciones.

## Límites

Cartografía regional, no campo. Validez/reparación en lon/lat; recorte y superposición en el plano EPSG:6933 con aristas rectas en él (no es una integral geodésica exacta; diferencia con la auditoría exploratoria < 0,00005 pp). Umbrales de reparación y de estado provisionales. No modifica score, confianza, restricciones, IA ni M8.

## Producto (fase B)

- **Ficha «Contexto geológico»** en la ficha de cada sector, dentro del diseño existente: resumen compacto (estado de evidencia, barra de reparto del área, cobertura, sin cobertura, solape entre unidades distintas, unidades sin descripción, escala y fuente) y tres detalles expandibles: *Unidades cartografiadas* (código, nombre y descripción originales, porcentaje con y sin solape, hoja, IDs de entidad), *Fuente, escala y procedencia* (autoridad, distribuidor, capa, escala como denominador, CRS, licencia con su alcance, atribución, fecha del mapa «no informada», fecha del registro del catálogo aparte, petición/hash/hora de cada descarga, procesamiento, límites) y *Qué verificar en terreno* (orientación editorial, no mediciones).
- **Estados**: `available` «Cobertura cartográfica completa», `partial`, `no_coverage` «Sin cobertura en esta capa», `unavailable` «Evidencia no utilizable». Definen evidencia, nunca aptitud. Redondeo honesto: «<0,1 %», «>99,9 %» y «100 %» solo con cobertura exacta.
- **Lo que no hace**: no cambia score, confianza, restricciones, IA ni M8; la IA de M8 no consume geología; no hay mapa litológico, filtros ni requisitos litológicos; no se rellenan huecos con capas más generales; nada de «apto», tracción, granulometría o equivalencia química. «Geología sin calibrar» del puntaje se mantiene.
- **Carga**: `apps/web/src/data/loadGeologyContext.ts` lee solo `geology-context-v1/index.json` del build (nunca proveedores geológicos), con timeout de 8 s que cubre la lectura del cuerpo y tope de 2 MB, y valida contrato y semántica contra los candidatos ya cargados (`apps/web/src/domain/geologyContext.ts`, espejo de `pipelines/geology_contract.py`): geometría exacta, procedencia por sector (rol, `site_id`, bbox de la URL sin redondeo), fracciones, estado recalculado, política, URL https permitidas. Ausente, lento, enorme o inválido ⇒ «no disponible» y la selección, el ranking y M8 siguen igual. La web no calcula SHA-256: el hash del archivo de candidatos y cada `request_id` los verifican el pipeline y el empaquetador.
- **Exportación** `<site_id>-geology-context.json` (botón «Descargar contexto geológico (JSON)»): contrato autocontenido `contracts/geology-export.schema.json` (sus `$defs` duplican los del paquete; una prueba vigila que no diverjan). Es un **subconjunto** de un solo sector con las peticiones que lo respaldan más la fuente y la metadata; `export_info.full_candidates_file_sha256` es el hash del archivo completo de candidatos y el subset **no** es ese archivo. Se valida antes de descargar. Las exportaciones de M8 y del candidato no cambian. La exportación de referencia `tests/fixtures/geology-export-ar-win-s2640-w06730.json` fija la paridad Python/web; si se reconstruye el paquete con otras fechas, regenerarla con el comando indicado en el mensaje de `test_python_export_matches_the_golden_…`.

## Empaquetado

`npm run release:package` admite `geology-context-v1/index.json` como único archivo de esa carpeta. Opcional: sin carpeta, el ZIP sale igual que antes. Con carpeta, el paquete debe validar completo con el validador único `pipelines/geology_contract.py` (contrato y semántica, incluido el SHA-256 de los bytes de `science-v3/candidate-details.json` del build); si no, el empaquetado se detiene y la entrega anterior se conserva. El validador se importa solo en ese caso y no arrastra Shapely, pyproj ni requests (sí `jsonschema`, dependencia ya existente de los pipelines; las constantes y reglas puras viven en `pipelines/geology_policy.py`). El raw, la investigación y la auditoría no entran al bundle ni al ZIP.
