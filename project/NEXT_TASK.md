# Encargo vigente — AnalogOS global, piloto Chile–Argentina

## Estado

- **Task ID:** M7-GLOBAL-DISCOVERY
- **Owner:** Codex
- **Status:** accepted
- **Branch:** `dev`
- **Base commit:** `57b3a97bc13b712e98dae64ae28511fb2782c6c3`
- **Dirección y aceptación:** Codex. Dan autorizó este cambio y su supervisión el 2026-11-14; no autorizó publicación de esta entrega.

**Autorización posterior:** Dan pidió «actualiza dev» el 2026-11-14. Codex puede crear el commit e integrar/subir este checkpoint a `origin/dev`, preservando el trabajo remoto del equipo. La aceptación anterior describe el piloto antes de esa integración.

**Integración revisada por Codex:** piloto v3 integrado con ADR-006/007 del equipo (globo, mapa 2D y ficha flotante); ADR de descubrimiento renumerado a 008. 177 Python, 69 web y build correctos; ZIP vigente de 30 entradas, SHA-256 `804184d6015440fa073e451bfea376fc9b1c9ae6b672e133094cd528ac3af12b`. Detalle vigente en STATUS y CODEX_M7_REVIEW. El encargo original y su reporte de 18 entradas quedan como históricos; la restricción inicial «sin WebGL» fue sustituida por las decisiones de rediseño aceptadas por el equipo. Claude sigue esperando una nueva asignación.

**Aceptación de Codex — 2026-11-14 15:33 America/Santiago.** M7 aceptado como piloto regional preliminar. Verificación independiente: 167 tests Python, 39 web y build; rebuild v2/v3 idéntico, puntuaciones y selección recalculadas, cachés sin red, ZIP determinista y demo en `/` y `/AnalogOS/`. Evidencia y límites en `docs/CODEX_M7_REVIEW.md`. Sin commit, push ni publicación. Claude queda a la espera de una nueva tarea; no ampliar regiones ni recalibrar ciencia por iniciativa propia.

## Objetivo

Convertir la marca visible a **AnalogOS**, con visión global y un piloto real, acotado y reproducible en Chile y Argentina. Yungay pasa a **referencia conocida**, fuera del ranking de candidatos emergentes. La entrega debe encontrar sectores mediante una búsqueda documentada, caracterizarlos con datos reales y distinguir candidatos de antecedentes publicados. No basta agregar puntos elegidos manualmente ni cambiar el mapa.

Mantener perfil de rover marciano, referencia regional de Jezero, frontend estático sin WebGL y evidencia offline. No introducir perfil lunar ni afirmar cobertura mundial ejecutada. Rotular «Piloto Chile–Argentina» y área efectivamente explorada.

## Lectura y propiedad

Leer AGENTS.md, CLAUDE.md, STATUS.md, últimos cambios, ADR-001 a ADR-005, docs/PRODUCT_AND_SCIENCE.md, DATA_AND_SCORING.md, contratos, configuración y pipelines v2. La instrucción actual autoriza las ampliaciones de candidatos, contratos y alcance que antes estaban congeladas. Conservar v2 y su perfil byte a byte como baseline histórico; crear v3.

Codex ya comprobó la línea base: 119 pruebas Python, 24 web y build verdes. El árbol estaba limpio en dev. Mientras Claude implemente, Codex revisará sin editar su alcance. No subagentes ni sesiones paralelas de implementación.

## Primer checkpoint de supervisión

Antes de consultas nuevas masivas o de implementar la UI, entregar en el chat un plan compacto: archivos, configuración de búsqueda, número máximo de ventanas/peticiones, extensiones de contratos y tratamiento de referencias/novedad. Puedes preparar código de búsqueda y bibliografía mientras Codex revisa. Si propones cambiar fórmula, pesos, umbrales de ciencia, datasets o regiones fuera de lo autorizado, espera decisión concreta de Codex.

## 1. Búsqueda reproducible, no una lista manual

Crear configuración versionada de un experimento regional. Propuesta inicial autorizada en CRS84 [oeste,sur,este,norte]:

- Chile, interior de Antofagasta: `[-70.0, -25.5, -69.0, -24.5]`.
- Argentina, Puna de Catamarca/Salta: `[-67.8, -26.5, -66.8, -25.5]`.
- Rejilla regular de ventanas no solapadas de 0,2°: 25 por región, 50 en total. Centros derivados algorítmicamente de origen/paso, IDs estables; geometría no dibujada a mano. Documentar estas regiones como selección de prueba, no muestra representativa nacional. Verificar geografía y extensión antes de ejecutar; proponer corrección si falla.
- Las ventanas no tienen la misma área física: calcular área real y documentar tamaño ~20 km. No llamarlas rejilla de 5 km.
- Etapa 1: NASADEM multitesela a la escala v2/MOLA, cobertura válida, agua SWB y métricas topográficas por las 50 ventanas. Cachear tiles, no descargarlos por ventana. Excluir de shortlist falta de cobertura (<95 %), agua permanente >5 %, o superposición con referencias documentadas. Mantener registro de cada rechazo. No considerar las restricciones territoriales no evaluadas como resueltas.
- Orden de preselección: media geométrica de similitudes de pendiente/rugosidad/relieve con pesos relativos v2 0,20/0,20/0,15; nombrarlo **prioridad topográfica**, nunca score final ni confianza final. Desempate por ID. No relajar el mínimo 0,70 del score multifuente para aceptar esta etapa.
- Diversificación determinista: hasta tres ventanas por país, con centros separados al menos 25 km (distancia geodésica, criterio versionado). Guardar también descartes por proximidad. Si hay menos candidatos elegibles, mostrarlo; nunca forzar resultados ni elegir a mano para mejorar el relato.
- Etapa 2: caracterizar esas seis ventanas como máximo con NASADEM + Sentinel-2 mensual 2025 + POWER, usando fórmulas y pesos v2. Mantener geología sin calibrar. HLS sigue inventario, sin usar sus píxeles en score. Guardar cada intento fallido y NoData; no sustituir faltantes por datos ficticios.
- Reutilizar referencia Yungay con misma geometría/métricas/evidencia v2 y recalcularla mediante mismas reglas si se incluye en v3: debe conservar los valores numéricos de baseline. Documentar que la ventana de screening no es el perímetro exacto de cada campaña histórica.
- Procesar primero preselección y luego fuentes más costosas. Límite inicial: 50 ventanas topográficas, hasta 6 ventanas multifuente nuevas, hasta 20 tiles NASADEM adicionales, hasta 6 imágenes RGB nuevas. Reintentos acotados y caché reanudable, sin barridos extra si una API falla. Reportar bloqueo temprano.

La revisión debe poder reconstruir por qué cada ventana fue evaluada, descartada o seleccionada. Guardar config, métricas de todas las ventanas, ranking preliminar, razones, shortlist, timestamps de adquisición reales y hashes. El área explorada y el número evaluado deben verse en la demo y exportación.

## 2. Antecedentes y referencia Yungay

Crear catálogo versionado y revisado de antecedentes, con fuentes, fecha de revisión, coordenadas/geometría cuando la publicación las dé, precisión espacial y actividad probada. Sin coordenadas inventadas ni asignar el punto de un pueblo al área científica.

Fuentes iniciales contrastadas por Codex:

- Desafío: https://www.spaceappschallenge.org/2026/challenges/permanent-moon-base-locations-and-mars/
- NASA, Hyperion en Atacama en 2003 y Zoë posteriormente: https://astrobiology.nasa.gov/news/dry-signs-of-life/ (no prueba ocupación continua del mismo polígono de Yungay).
- Navarro-González et al. 2003: https://pubmed.ncbi.nlm.nih.gov/14605363/ ; fuente con coordenadas de muestreo: https://agupubs.onlinelibrary.wiley.com/doi/abs/10.1029/2010JE003599
- María Elena South, 2015: https://enviromicro-journals.onlinelibrary.wiley.com/doi/abs/10.1111/1758-2229.12261 (no asumir que coincide con Pampa María Elena de v2).
- Argentina también tiene antecedentes: https://bicyt.conicet.gov.ar/fichas/produccion/12391989 y https://tecno.unca.edu.ar/la-puna-catamarquena-un-sitio-con-similitudes-al-planeta-martela-puna-catamarquena-un-sitio/ (Campo de Piedra Pómez, Dunas Blancas, Carachi Pampa y entorno de Antofagasta de la Sierra).

Revisar fuentes primarias y bibliografía para las zonas finalmente seleccionadas; registrar búsquedas/fecha/alcance y hallazgos. Si un área de estudio publicado es más extensa que un punto, no usar solo distancia al punto para declarar independencia. Separar relación espacial exacta, proximidad y región con antecedentes. La ausencia de coincidencia en un catálogo incompleto NO prueba novedad.

Estados sugeridos: `known_reference`, `known_analogue_overlap`, `regional_precedent`, `literature_review_pending`, `no_match_in_reviewed_sources`. Separar rol del sitio (`reference` / `candidate`) de estado de revisión bibliográfica. Yungay siempre referencia conocida. Un resultado de búsqueda con antecedente debe conservarlo; no ocultarlo para fingir descubrimientos. No ajustar pesos para hacer ganar nuevos candidatos ni afirmar validación científica porque Yungay puntúe alto.

## 3. Snapshot v3 y contratos

- Crear `artifacts/science-v3/`, configuración de búsqueda y perfil v3 derivado de v2 con mismos pesos/fórmulas/tolerancias. Versionar nueva procedencia y alcance; no mutar archivos científicos v2.
- Ampliar IDs más allá de `cl-` (prefijo de país coherente y validado, al menos `cl`/`ar`) y añadir metadata tipada de país, rol, origen de búsqueda y revisión bibliográfica. Preferir extensión aditiva compatible con snapshots históricos; validar estrictamente requisitos extra de v3. No colar campos sin contrato.
- Referencias separadas del ranking de candidatos, pero comparables y exportables con su rol y fuente. No omitir su estado en exportaciones.
- Manifiesto real de todos los datos, perfil/snapshot sincronizados, métricas y fuentes enlazadas, rechazos y limitaciones explícitos. Guardar timestamps reales, no copiar la fecha de adquisición v2 a datos nuevos.
- Generalizar autoridades/advertencias por país. No atribuir IDE Chile a Argentina. Mantener áreas sensibles, urbano, propiedad y acceso como pendientes cuando no hay cruce oficial. Puedes integrar una capa oficial verificable si resulta pequeña y necesaria; documentar versión/fecha y no inferir permisos. No inventar datos de límites ni declarar «libre» por ausencia de datos.
- Corregir en el camino supuestos de calidad que darían confianza falsa a nuevos datos (p. ej. contar 12 meses esperados aunque API devuelva menos, exclusión de NoData), con regresión y sin alterar arbitrariamente calidades/pesos. Si cambia baseline numérica, informar antes de aceptarlo.

## 4. Aplicación AnalogOS

- Marca visible «AnalogOS»; subtítulo «Exploración de análogos planetarios · Piloto Chile–Argentina». No renombrar carpeta, remoto, paquetes ni hosting por cosmética.
- Mapa SVG offline adaptable con ambos países y encuadre útil de las regiones; contornos reales con atribución, sin dibujar países a mano. Países como contexto geográfico, no autoridad legal.
- Separar visualmente «Candidatos de la búsqueda» de «Referencia conocida: Yungay». Filtro país, ficha, comparación y exportación deben funcionar con ambos roles. El primer seleccionado debe ser candidato, salvo que no los haya; estado vacío honesto.
- Mostrar extensión y límites de búsqueda, conteos, criterio de preselección, evidencia de antecedentes y estado de revisión. No prometer búsqueda global completa ni análogos nuevos confirmados.
- Contexto RGB real offline de los seleccionados, con pipeline visual parametrizable y validación ligada a snapshot/config. Preservar paquete visual v2. Fuentes/periodo/NoData y ausencia de imagen deben seguir siendo claros.
- Mantener contraste, teclado y móvil. Evitar redesign no necesario.

## 5. Entrega y comprobaciones

Ampliar empaquetador a v3 con lista explícita derivada de metadata validada (no glob permisivo), rutas seguras, hashes, sin v2/demo sobrantes ni secretos, y conservando rollback y ZIP determinista. Conservar ZIP v2 histórico; nuevo entregable `submission/analogos-static.zip` con checksum propio. Actualizar narrativa activa de README, docs de producto/ciencia, submission/pitch/guion/atribuciones/checklist y capturas si cambió UI; no reescribir historia de ADR anteriores. Crear ADR-008 como proposed y reporte de búsqueda/bibliografía.

Pruebas necesarias: rejilla y límites; distancias y empate reproducibles; NoData/agua; selección sin intervención manual; separación rol/revisión bibliográfica; exclusión de referencias del ranking; contratos cl/ar e históricos; fuentes/autoridades por país; cobertura temporal incompleta; generación v3 reproducible; exportación conserva rol/origen; mapa y filtros; archivo visual ausente o inválido; empaquetado seguro sin extras y determinista. No inflar tests espejando implementación.

Comandos mínimos:

```bash
source .venv/bin/activate
# Documentar comandos nuevos exactos: descubrimiento, fetch acotado, build v3, imágenes.
npm run verify
npm run release:package
# Verificar checksum del nuevo ZIP, repetir empaquetado, comparar bytes.
git diff --check
git status --short
```

Codex repetirá verificaciones y auditará resultados de búsqueda, al menos un candidato de cada país, referencias, fuentes, imágenes y demo en `/` y `/AnalogOS/`. Mostrar resultado aunque sea negativo. Los tests verdes validan software, no equivalencia planetaria ni aptitud de campo.

## Archivos y autoridad

Autorizados: nuevos config/contratos/pipelines/artifacts v3/contornos y visuales v3; cambios necesarios en pipelines existentes con compatibilidad v2, tests, apps/web, scripts/packaging, docs, submission y project. Dependencias existentes primero; justificar necesidad antes de añadir nuevas. No .env leído por herramientas, no imprimir secretos. Usar credenciales existentes solo desde programa y endpoints oficiales de Earthdata/Copernicus; límites anteriores. Red de lectura para fuentes primarias autorizada. No AGENTS/CLAUDE, cuentas, remotos, .vercel, main, commits, push ni publicación.

Entregar reporte con archivos, comandos, conteos por etapa, resultados por país, evidencia bibliográfica, fallos/NoData, tamaño ZIP, limitaciones y datos crudos no versionados. Actualizar STATUS/CHANGELOG/BACKLOG. Dejar **Owner: Codex / Status: review**; solo Codex acepta.

## Reporte de Claude

Entregado en `review` el 2026-11-14 a las 15:27 (America/Santiago). Solo Codex acepta. Sin commit, push ni publicación.

### Decisiones del checkpoint aprobadas por Codex

1. `status: reference` además de `role` para la referencia.
2. Completitud Sentinel-2 contra los 12 meses configurados.
3. Calidad topográfica multiplicada por la cobertura NASADEM válida.
4. 25 km al centro como heurística explícita de cercanía, no perímetro del estudio ni prueba de novedad.

Geografía autorizada como piloto limitado. Quedan anotadas en ADR-008.

### Conteos por etapa

| Etapa | Resultado |
|---|---|
| Ventanas intentadas / evaluadas | 50 / 50 |
| Rechazadas por cobertura, agua o fallo de datos | 0 |
| Excluidas por contener coordenadas de muestreo publicadas | 4 |
| Descartadas por cercanía | 2 |
| Elegibles fuera del cupo | 38 |
| Preseleccionadas (etapa 2 completa) | 6 |
| Meses Sentinel-2 rechazados / fallos de API | 0 / 0 |

Uso de red frente a los límites: 7 teselas NASADEM nuevas de 20; 6 ventanas multifuente de 6; 6 imágenes RGB nuevas de 6 (Yungay se reutilizó del paquete v2). Además, 7 búsquedas CMR de teselas, 6 inventarios HLS, 6 consultas POWER y 1 descarga de contornos Natural Earth.

### Resultados por país

| Rol | Sitio | Prioridad topográfica | Similitud | Confianza | Estabilidad |
|---|---|---:|---:|---:|---:|
| Candidato | `cl-win-s2500-w06970` | 98,01 | 94,87 | 77,45 | 99,33 |
| Candidato | `cl-win-s2480-w06950` | 96,16 | 91,87 | 77,45 | 99,03 |
| Candidato | `cl-win-s2520-w06950` | 93,58 | 90,35 | 77,36 | 99,08 |
| Candidato | `ar-win-s2620-w06750` | 86,07 | 63,85 | 77,00 | 95,88 |
| Candidato | `ar-win-s2640-w06730` | 64,53 | 53,68 | 77,25 | 96,81 |
| Candidato | `ar-win-s2580-w06710` | 59,26 | 49,43 | 77,40 | 96,81 |
| Referencia | `cl-pampa-yungay-screening` | 66,40 | 75,67 | 77,45 | 99,03 |

Los seis scores coinciden con el cálculo independiente de Codex. Yungay conserva exactamente los valores v2 (test dedicado). Todos quedan en `requires_review`.

### Evidencia bibliográfica

- Catálogo `config/analog_precedents_v1.json`: 6 antecedentes, 30 coordenadas transcritas del material suplementario de Navarro-González et al. (2003), 3 búsquedas dirigidas con fecha, alcance y hallazgo.
- 17 coordenadas caen en la ventana de Yungay y 5 en la región chilena, en las 4 ventanas excluidas.
- Las fuentes argentinas revisadas no dan coordenadas; no se asignó ninguna a los topónimos.
- Los seis candidatos quedan como `regional_precedent`. Ninguno se declara nuevo.
- No se pudo abrir el artículo de JGR 2010 ni el registro ADS del estudio de Icarus 2020 (pidió verificación humana, que no se intentó sortear).

### Archivos propios

- Configuración: `config/discovery_search_v3.json`, `config/analog_precedents_v1.json`, `config/visual_observations_v3.json`, `config/mission_profiles/mars-rover-screening-v3.json`.
- Contratos: `contracts/candidate-site.schema.json` (extensión aditiva), `contracts/discovery-search.schema.json`, `contracts/precedent-catalog.schema.json`.
- Pipelines: `discover_candidates.py`, `fetch_discovery_data.py`, `build_discovery_snapshot.py`, `build_context_outline.py`; cambios compatibles en `build_precision_snapshot.py` (`score_inputs`, `TerrainDataError`, `expected_intervals`) y `fetch_visual_context.py` (`--snapshot v3`, reutilización, `post_json`).
- Artefactos: `artifacts/science-v3/` (7 archivos) y `artifacts/visual-context-v3/` (índice y 7 PNG).
- Web: `App.tsx`, `index.html`, `styles.css`, `components/CandidateMap.tsx`, `CandidateRanking.tsx`, `CandidateComparison.tsx`, `CandidateDetails.tsx`, `data/loadDemoSnapshot.ts`, `data/loadVisualContext.ts`, `domain/contracts.ts`, nuevo `domain/discovery.ts`, `scripts/prune-build.mjs`, tests `discovery.test.tsx` y `visualContext.test.tsx`.
- Entrega: `scripts/package_release.py`, `tests/test_release_package.py`, `submission/analogos-static.zip`, `submission/analogos-static.zip.sha256`, `submission/assets/analogos-pilot-overview.jpg`, `package.json` (scripts `discovery:*`).
- Tests: `tests/test_discovery.py`.
- Documentación: ADR-008, `docs/DISCOVERY_REPORT.md`, `docs/VISUAL_REVIEW.md`, `docs/PRODUCT_AND_SCIENCE.md`, `docs/DATA_AND_SCORING.md`, `README.md`, y en `submission/`: `README.md`, `PROJECT_PAGE_ES.md`, `PROJECT_PAGE_EN.md`, `PITCH_3_MIN_ES.md`, `DEMO_SCRIPT_2_MIN_ES.md`, `METHODOLOGY.md`, `RESULTS_AND_LIMITATIONS.md`, `ATTRIBUTIONS.md`, `JUDGING_CHECKLIST.md`, `VIDEO_SHOT_LIST.md`.
- Proyecto: `NEXT_TASK.md`, `STATUS.md`, `CHANGELOG.md`, `BACKLOG.md`.
- No se tocaron `AGENTS.md`, `CLAUDE.md`, remotos, ramas, `.vercel` ni `vercel.json`.

### Comandos y resultados

```bash
source .venv/bin/activate
python -m pipelines.fetch_discovery_data --stage tiles     # 7 teselas nuevas
python -m pipelines.discover_candidates                    # 50 ventanas, 6 preseleccionadas
python -m pipelines.fetch_discovery_data --stage sources   # 6 × Sentinel-2, POWER y HLS
python -m pipelines.build_context_outline
python -m pipelines.build_discovery_snapshot
python -m pipelines.fetch_visual_context --snapshot v3     # 6 imágenes nuevas; ahora reutiliza sin red
npm run verify
npm run release:package
(cd submission && shasum -a 256 -c analogos-static.zip.sha256)
git diff --check
git status --short
```

| Comprobación | Resultado |
|---|---|
| `npm run verify` | 167 tests Python, 39 tests web, contratos + TypeScript + Vite verdes |
| `npm run release:package` | sha256 `3b419d770f1a1dce5e01f7345aaafef3f33ca18df4d2f73e6d3fb8c7c9853415` |
| Segundo empaquetado | bytes idénticos (`cmp`) |
| ZIP v3 | 18 archivos, 9.012.267 bytes: `index.html`, JS, CSS, 7 de `science-v3/`, índice visual y 7 PNG |
| ZIP v2 y `SHA256SUMS.txt` | intactos; `shasum -c` OK |
| `git diff --quiet HEAD` sobre v2, demo, v1, paquete visual v2 y perfil v2 | código 0 |
| Rebuild v2 en carpeta temporal | idéntico byte a byte en sus 5 archivos |
| `git diff --check` | limpio |
| Demo por HTTP en `/AnalogOS/` (Chrome sin interfaz) | 7 tarjetas, 50 ventanas, imagen local; todo responde 200 salvo `favicon.ico` |

Tests nuevos: 37 en `tests/test_discovery.py` y 15 en `discovery.test.tsx`, que cubren rejilla y límites, distancias y empates, NoData y agua, selección sin intervención, fallos por ventana, relaciones con antecedentes, separación rol/revisión, referencia fuera del ranking, contratos `cl`/`ar` e históricos, autoridades por país, cobertura temporal incompleta, filas mal formadas, POWER, identidad de petición, reproducibilidad v3, experimento negativo, exportación, mapa, filtros y paquete visual.

### Fallos y NoData

- Ninguna ventana falló ni quedó bajo el 95 % de cobertura; ninguna superó el 5 % de agua.
- Los 72 meses Sentinel-2 de la etapa 2 fueron válidos.
- La primera prueba de red del encargo anterior falló por conexión; en este no hubo fallos de API.

### Limitaciones y decisiones para revisar

- Dos regiones de prueba; no es una búsqueda nacional ni global.
- POWER en la Puna (562–767 mm/año) proviene de una celda mayor que la ventana y domina la diferencia de los candidatos argentinos. Queda expuesto en ficha, manifiesto y documentación; no se cambió nada para compensarlo.
- Dos candidatos chilenos tienen valores POWER coincidentes; se rotula como posible celda compartida.
- El catálogo de antecedentes es incompleto; faltan textos completos de la literatura de la Puna.
- Las observaciones visuales son apariencia a contrastar; no hubo cruce territorial.
- El ZIP usa sin compresión y pesa 9,0 MB por las siete imágenes.
- `__version__` del pipeline sigue en 0.2.0 para no alterar la regeneración de v2 y del snapshot demo.
- Las capturas `assets/analogos-chile-*.jpg` y el ZIP v2 quedan como históricos.

### Datos crudos no versionados

En `data/raw/`: 7 teselas NASADEM nuevas (~102 MB), `copernicus/sentinel2_stats_2025_v3.json`, `power/climatology_points_v3.json`, `earthdata/cmr_inventory_v3.json`, `discovery/acquisition_v3.json` y `naturalearth/world-atlas-2.0.2-countries-50m.json`.

### Credenciales y permisos

Credenciales Earthdata y Copernicus leídas solo por los programas y enviadas únicamente a hosts oficiales. No se imprimieron ni guardaron valores, tokens ni cabeceras. No se detuvo ningún proceso ajeno. Ningún permiso bloqueado.
