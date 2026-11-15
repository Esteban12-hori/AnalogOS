# M9 — progreso de implementación y revisión

## Checkpoint Codex — entrega completada

Revisión de A/B y QA local terminadas; correcciones de legibilidad y advertencias históricas aplicadas por Codex. 316 Python, 246 web, build/typecheck, baseline49 intacto, ZIP determinista `eed86833…6520c`. Descarga real validada y móvil/teclado/offline comprobados. Ver `docs/CODEX_M9_REVIEW.md`. Publicado en dev (`34e76b9`, Actions 43658989969 correcto); geología/exportación remotas y las dos operaciones Anthropic verificadas, JSON recalculado idéntico. Las secciones siguientes preservan la historia de entregas de Claude.

## Fase B — IMPLEMENTADA, para revisión de Codex (2026-11-14)

Cerrados antes dos bordes de A: (1) `publish` ahora registra como `PackageStateError` (con ruta, estado real y respaldo `.previo` conservado) el caso en que falla instalar el staging y también restaurar el respaldo del MISMO par (probado en el primer y el segundo par; los pares anteriores se deshacen igual); (2) `check_geometry_dict` exige el cierre exacto de cada anillo (probado en Chile y Argentina; los datos reales siguen pasando y el paquete no cambió).

### Qué se hizo

- **Estructura**: `pipelines/geology_policy.py` (constantes y reglas puras, sin geoproceso); `geology_contract.py` solo depende de él y de `jsonschema`; `build_export`/`validate_export` y `contracts/geology-export.schema.json` (autocontenido; prueba de no divergencia con el esquema del paquete).
- **Web**: `domain/geologyContext.ts` (contrato Ajv + semántica espejo, exportación, formato), `data/loadGeologyContext.ts` (timeout 8 s que cubre el cuerpo, tope 2 MB, nunca lanza), `components/GeologyContext.tsx` (ficha compacta + detalles expandibles + botón de descarga accesible), cableado en `App.tsx`/`CandidateDetails.tsx` y estilos en `styles.css` dentro del vidrio existente. Sin mapa de polígonos, sin filtros, sin tocar `shared/`, `server/`, `api/`, M8, ciencia, perfiles ni IA.
- **Exportación**: `<site_id>-geology-context.json`, subconjunto de un sector con las peticiones necesarias; `full_candidates_file_sha256` no se confunde con el subset. Validada antes de descargar.
- **Empaquetador**: `geology-context-v1/index.json` opcional (único archivo de su carpeta), validado completo con el validador único contra los bytes de `candidate-details.json` del build; importación diferida; sin carpeta, ZIP como antes.
- **Docs**: README, `docs/GEOLOGY_CONTEXT.md` (producto, exportación, empaquetado), `docs/DATA_AND_SCORING.md`, `docs/SOURCE_CATALOG.md`, ADR-010 (decisiones 12–16 y brechas).

### Verificación

- `npm run verify`: **316 Python**, **245 web** (+2 de IA real omitidas), typecheck del servidor y build correctos.
- Pruebas nuevas: 49 web (paquete real, 30 mutaciones de vínculos/fracciones/política/URL, exportación, paridad con la exportación de referencia de Python, carga tolerante con cuerpo colgado, formato honesto, ficha en cuatro estados, nombres largos) y Python (exportación, drift de esquema, aislamiento de dependencias, 10 del empaquetador).
- `npm run release:package` dos veces: ZIP idéntico (`cmp`), 31 entradas, 13220555 bytes, SHA-256 `579a4fedf5e5cee8f3653ac8e3c3fc62995518d4cc42f747862cdc5581d674be`, `shasum -c` OK. Contiene `geology-context-v1/index.json` (190.198 bytes, idéntico al artefacto) y nada de raw/investigación. Extraído bajo `/AnalogOS/` y servido por HTTP: `index.html` y el paquete geológico responden 200.
- Paquete geológico no recalculado (contenido sin cambios): SHA-256 `fe2552dd…856c`; rebuild offline idéntico. Baseline de 49 archivos intacto; `git diff --check` limpio. Sin refresh de red en esta fase.
- Cambia `submission/analogos-static.zip` y su `.sha256` (entrega v3 regenerada con geología).

### Brechas reales

- No se hizo QA en navegador (escritorio, 390 px, teclado, descarga real, ZIP en navegador): lo hace Codex. Solo hay render estático (`renderToStaticMarkup`) y verificación de bytes/HTTP.
- La web no calcula SHA-256: el hash de candidatos y `request_id` los verifican pipeline y empaquetador.
- El estilo usa tamaños de 9–12 px acordes con el resto de la ficha; si la revisión visual los considera pequeños, ajustar.
- Un servidor `http.server` temporal del puerto 8765 (comprobación manual) puede seguir ejecutándose: el sandbox no permitió terminarlo; no tiene efecto en el repo.
- La exportación de referencia (`tests/fixtures/geology-export-ar-win-s2640-w06730.json`) debe regenerarse si el paquete se reconstruye con fechas nuevas.

## Fase A — CORREGIDA tras la revisión de Codex (2026-11-14); a la espera de su aprobación

El detalle de la corrección está en la sección siguiente; lo posterior describe la entrega original y sigue vigente salvo donde se indica.

Fase B (UI, exportación, empaquetador/ZIP) **pendiente**; no iniciada. Sin commit ni push.

### Correcciones de la revisión A (docs/CODEX_M9_REVIEW.md)

| Hallazgo | Corrección | Regresión permanente |
|---|---|---|
| P1 MultiPolygon duplicado aceptado (cambio total 50 %) | `_diagnose` exige además cambio ORIGINAL TOTAL / REPARADO TOTAL ≤ 0,001; original no positivo o no finito → rechazo con máscara; el contraste simétrico make_valid/buffer(0) se conserva y registra | `test_material_total_area_change_is_rejected_…`, `test_original_area_not_positive_…`, `test_accepted_repairs_satisfy_all_three_…` |
| P1 NaN interno / hojas malformadas | `check_geometry_dict`: estructura de Polygon/MultiPolygon y cada vértice 2D, finito y en rango, ANTES de Shapely; Chile y Argentina usan el mismo control (`validate_chile_collection` y `validate_wfs` llaman a `parse_features`) antes de instalar; AR con 0 entidades y `crs: null` sigue válido | 16 geometrías malformadas parametrizadas; `test_chile_and_argentina_share_the_geometry_control_…` |
| P1 refresh con Point reemplaza la caché | `prepare_raw` descarga y valida en staging; el build construye el índice y valida ANTES de instalar; `publish` reemplaza caché y paquete en pareja con rollback (caché primero) | `test_fresh_layer_with_a_point_…`, fallo de análisis, validación inyectada, fallo del segundo reemplazo (restaura raw y paquete), fallo de rollback (`PackageStateError`, mensaje veraz), reuso offline sin copias |
| P1 AR4 puede citar AR6 | Semántica: un sector argentino cita exactamente UNA petición `argentina_wfs` con su `site_id`; la URL tiene forma exacta y su bbox (parse numérico exacto, sin redondeo) es la del sector; `request_id` = SHA-256 de método+URL recalculado; una petición por sector | `test_ar_site_cannot_cite_another_sector_acquisition`, `test_wfs_request_bbox_…` (1e-6, 1e-12 y 6 decimales) |
| P2 CL cita solo metadata | Un sector chileno debe citar `chile_layer`; la metadata puede ser adicional | `test_chile_site_must_cite_the_layer_download_…` |
| Caché: nombre/symlink | Nombre seguro y no-symlink antes de abrir (O_NOFOLLOW); roles, tipos, fechas, bytes, hashes, número de entidades y archivos no declarados coherentes | symlink con mismos bytes, 6 nombres inseguros, archivo extra, 9 registros incoherentes |
| Licencia CC0 | Se lee `license_id` de CKAN; el build se rechaza si no es `cc-zero`; el paquete lleva `declared_id` | `test_changed_ckan_license_is_rejected_…` |
| Narrativa de formatos | Derivada del recurso realmente inspeccionado y de `rejected_resources` | `test_metadata_reflects_only_observed_resources_…` |
| SIGAM | «Sistema de Información Geológica Ambiental Minera» | mismo test |
| Método | COMMON_TRANSFORMATIONS, LIMITATIONS, docstrings, ADR-010 y docs alineados con la superposición en EPSG:6933 (aprobada) | — |
| Prueba de texto del código | Reemplazada por una funcional: cabeceras de las peticiones con secretos en el entorno | `test_requests_carry_no_credentials_…` |

Además: `policy` del paquete debe coincidir con la política vigente y toda reparación aceptada debe cumplir los tres límites (validación semántica).

Los tres casos de `/tmp/analogos-m9-independent-review.py` dan ahora `true, true, true`; los dos de procedencia cuentan con regresiones. El script reescribe `/tmp/analogos-m9-independent-review-results.json` al ejecutarse.

**Paquete real recalculado DESDE LA CACHÉ, sin red ni refresh** (fechas de adquisición originales conservadas): SHA-256 `fe2552dd…856c`, rebuild offline repetido idéntico. Mismos números de cobertura, ambigüedad y diagnósticos que la tabla siguiente (cambian solo metadata: licencia con `declared_id`, distribuidor SIGAM, narrativa, política con el límite de cambio total). Comparación con la auditoría: dentro de 1e-3 pp en el test, diferencia real ≤ 5e-5 pp. Las cuatro reparaciones reales cumplen los tres límites (cambio total 0–1,6e-15; diferencia simétrica 0).

Verificación: **297 pasan** (49 más), de ellos 120 geológicos; 196 web (+2 omitidas), typecheck y build correctos; baseline de 49 archivos intacto; `git diff --check` limpio. `npm run release:package` no se ejecutó (sigue fallando hasta B).


### Decisiones aprobadas por Codex para la fase A (registradas en ADR-010)

1. WFS por sector; descarga fresca (CKAN + ZIP Chile + 3 consultas AR); hosts públicos y límites. BBOX devuelve polígonos completos: se valida CRS/rangos lon/lat y que el bbox de cada entidad intersecte la consulta, y después se recorta; entidades sin intersección positiva son válidas; ejes invertidos no se aceptan sin comprobar posición.
2. Sin hash de coordenadas redondeadas ni SHA-256 artesanal: geometría exacta conservada (todos los anillos) con igualdad estructural numérica estricta en Python/web; SHA-256 del archivo `candidate-details.json` como procedencia, verificado en pipeline y empaquetador; web sin criptografía.
3. Estados conservadores (`available` solo cobertura completa ≤ 1e-8, sin ambigüedad/rechazos/descripción ausente; 99 % es `partial`).
4. Reparación: `make_valid` vs `buffer(0)`, límites independientes 0,1 % (entidad) y 0,05 % (sector); rechazo → bbox∩AOI como máscara conservadora restada de todas las unidades.
5. Shapely `>=2.2,<2.3`, versión en `processing`; sin pyshp/GDAL/GeoPandas.
6. Preservar anterior ante fallos; validación de contrato y semántica antes del reemplazo; raw con petición exacta y `acquired_at`; sin hora de build.

### Decisión propia (aprobada por Codex en la revisión A)

Superposición y recorte en el plano EPSG:6933 (validez/reparación en lon/lat). Motivo: operar en grados y medir proyectado rompía la aditividad (~2e-7 del sector) y el cierre de la partición. Efecto frente a la auditoría ≤ 5e-5 puntos porcentuales. Detalle en ADR-010 §7. Si prefieres lon/lat puro habría que medir con una integral exacta en lugar de proyectar vértices.

### Resultados reales (paquete `artifacts/geology-context-v1/index.json`, SHA-256 `fe2552ddaedf61c7c54a35081d4cf3977d2806ec7127298bc564a89a7630856c`)

| Sector | Estado | Cubierta | Sin cobertura | Ambigua | Unidades | Auditoría (cubierta / sin cob. / ambigua) |
|---|---|---:|---:|---:|---:|---|
| `cl-win-s2500-w06970` | partial | 99,389372 % | 0,610628 % | 0,831560 % | 5 | 99,389364 / 0,610636 / 0,831551 |
| `cl-win-s2480-w06950` | partial | 99,224138 % | 0,775862 % | 0,823337 % | 6 | 99,224112 / 0,775888 / 0,823327 |
| `cl-win-s2520-w06950` | partial | 99,286114 % | 0,713886 % | 0,558495 % | 6 | 99,286114 / 0,713886 / 0,558495 |
| `ar-win-s2620-w06750` | partial | 49,998417 % | 50,001583 % | 0 % | 7 | 49,998418 / 50,001582 / 0 |
| `ar-win-s2640-w06730` | no_coverage | 0 % | 100 % | 0 % | 0 | 0 / 100 / 0 |
| `ar-win-s2580-w06710` | available | 100 % | 0 % | 0 % | 7 | 100 / 0 / 0 |
| `cl-pampa-yungay-screening` | partial | 99,068520 % | 0,931480 % | 1,183567 % | 6 | 99,068499 / 0,931501 / 1,183521 |

Áreas del sector idénticas a la auditoría (447,301089 … 450,519184 km²). Los valores salen del cálculo; la auditoría es un control comparado en un test (tolerancia 1e-3 pp), no se copia. Cero descripciones ausentes y cero entidades rechazadas en los siete sectores. Argentina 6 es `available` porque su capa 250K cubre todo el sector sin solape ni descripción vacía; eso es evidencia cartográfica completa, no calidad.

### Diagnósticos de reparación (todas aceptadas; ninguna máscara)

Entidades CL únicas 824, 846 y 9388 y AR `e250K_UnidadGeologica.117363`, todas «Ring Self-intersection». Cambio relativo de área total original→reparada 0–1,6e-15; diferencia simétrica `make_valid` vs `buffer(0)` 0,0 km² en todas; sin descarte dimensional. 846 (1296 km² totales) tiene bbox cruzado: área recortada 0 en Chile 1 (`accepted_no_positive_intersection`) y 26,45 km² en Yungay. 824: 190,55 / 250,40 / 0 (Chile 3) / 20,31 km² recortados según sector. 9388: 0,118 y 43,24 km². AR 117363: 14,49 km² recortados. Detalle por sector en `geometry_diagnostics`.

### Fuentes y adquisición real

CKAN `package_show` (3.590 bytes); ZIP del recurso rotulado SHP (5.995.050 bytes, SHA-256 `916fad22…95a3`, idéntico a la caché de la investigación) que contiene un único GeoJSON de 16.364 entidades (115 con geometría nula); tres WFS por sector (46, 0 y 28 entidades). La capa chilena no declara fecha del mapa; CKAN `metadata_modified` 2026-04-21 va como `catalog_modified_at`. SIGAM sin fecha de levantamiento. Todas las respuestas del WFS con entidades traen CRS EPSG:4326; la de cero entidades trae `crs: null` (válido y documentado).

### Archivos de la fase A

Nuevos: `contracts/geology-context.schema.json`; `pipelines/{fetch_geology_data,geology_coverage,geology_contract,build_geology_context}.py`; `artifacts/geology-context-v1/index.json`; `tests/{geology_fixtures,test_geology_coverage,test_geology_fetch,test_geology_context}.py`; `docs/decisions/ADR-010-geology-context.md`; `docs/GEOLOGY_CONTEXT.md`; este archivo. Modificados: `pyproject.toml` (solo Shapely), `project/{NEXT_TASK,STATUS,CHANGELOG}.md`. Preservados sin cambios: documentación y evidencia de investigación de Codex, `science-v2/v3`, M8, `shared/`, `server/`, `api/`, workflows, Vercel.

### Verificación

- Entrega original: 248 pasan (177 previos + 71 geológicos); tras la corrección, 297.
- `npm run verify` con el venv: 248 Python, 196 web (+2 de IA real omitidas), typecheck del servidor y build correctos.
- Rebuild offline repetido dos veces: SHA-256 idéntico. `git diff --check` limpio. Baseline `/tmp/analogos-m9-baseline-hashes.json`: 49 archivos, ninguno cambió.
- Pruebas: agujeros, multipolígonos, polígono que cruza ampliamente el borde, duplicados vs conflictos, cero/mínima cobertura, descripción ausente, bowtie rechazado con máscara, reparación aceptada con descarte, CRS/esquema/truncamiento/límite/ejes invertidos, ZIP inseguro/bomba/Shapefile, hosts y redirecciones, límites de bytes, no eco de cuerpos de error, caché corrupta/otra geometría (1e-9°)/otra petición, fallo que conserva caché y paquete, contrato inválido que no reemplaza, 17 manipulaciones semánticas, rebuild offline determinista. Fixtures solo en tests, rotulados sintéticos.

### Brechas y riesgos a revisar

- **`npm run release:package` falla ahora** («Archivo inesperado en el build: geology-context-v1/index.json») porque `publicDir` copia el paquete a `dist` y el empaquetador no lo admite aún; conserva el ZIP anterior (`submission/` sin cambios). Se resuelve en B (lista explícita). Si hay que publicar antes, necesita adelantar ese cambio mínimo o decidir otra cosa.
- Estado `available` para Argentina 6 es cobertura cartográfica completa, no calidad: la UI de B debe separar porcentaje, estado y escala.
- No se validó la geología (ni la de la fuente) en campo; umbrales provisionales; aristas rectas en el plano.
- Adquisición fresca con una sola respuesta por petición; las fuentes pueden cambiar y un `--refresh` futuro mostrará el cambio real.
- NEXT_TASK pasó a `review` al entregar; no marqué `in_progress` al comenzar (asignación y arranque ocurrieron en la misma sesión).

### Pendiente fase B

`apps/web/src/domain/geologyContext.ts` (contrato + semántica + igualdad exacta de geometría) y `data/loadGeologyContext.ts` (carga opcional tolerante); ficha «Contexto geológico» en `CandidateDetails.tsx`; exportación JSON propia con nombre estable; `scripts/package_release.py` con `geology-context-v1/index.json` opcional validado (incluido SHA-256 de `candidate-details.json` leyendo bytes y semántica); pruebas web y de empaquetador; ZIP repetible bajo `/AnalogOS/`; textos de UI; nota de que la IA M8 no consume geología.
