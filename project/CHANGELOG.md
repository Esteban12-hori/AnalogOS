# Changelog de trabajo

## 2026-11-14 Codex · corrección del control de empaquetado M10

- El primer control real de Vercel detuvo la publicación por enlaces de JSON rotos al copiar la función a /tmp. Reproducido fuera del repositorio; la copia ahora materializa los archivos enlazados y conserva el aislamiento y los casos negativos. No cambia aplicación, IA, datos ni ZIP. Reintento dev tras validar la misma fixture antes/después.

## 2026-11-14 Codex · M10 aceptado localmente

- Revisada implementación de Claude; cerrados tres fallos reproducidos de integridad del informe. Fuentes clicables, porcentajes con/sin solape y aviso de envío coherente. Codex corrigió desborde móvil de URL.
- 316 Python, 325 web, typecheck/build correctos; IA real con objetivos contrastantes y desde navegador. Informe descargado reconstruido idéntico; regresión histórica M8/M9 correcta; ZIP offline/móvil/teclado y fallos de carga revisados. 33 archivos únicos protegidos intactos, sin credenciales en entregables.
- Dev autorizado por Dan: publicación y comprobación remota en curso. Main conservado; Claude sin nueva tarea.

## 2026-11-14 Codex · M10 asignado a Claude

- Dan autoriza incorporar evidencia geológica a la orientación de IA y publicar dev tras revisión. Encargo con checkpoint de plan, fuentes/IDs verificables, fallback y exportación compatible. Evaluación científica y artefactos preservados.
- Baseline M10 guardado; verify inicial correcto (316 Python, 246 web, typecheck/build). Codex supervisa y acepta; Claude implementa sin publicar.

## 2026-11-14 Codex · M9 publicado y verificado en dev

- Código `34e76b9`, Actions 43658989969 correcto; alias dev actualizado y función empaquetada verificada. Main conservado.
- Contexto geológico remoto y exportación argentina validados; referencia Yungay conservada. Borrador y explicación reales de Anthropic correctos; JSON descargado validado y recalculado idéntico.
- Evidencia en `submission/evidence/m9-dev-*.json`, capturas en `submission/assets/analogos-m9-dev*.jpg` e informes en `docs/CODEX_M9_REVIEW.md` / `docs/DEV_AI_VERIFICATION.md`. Este checkpoint documental usa `[skip ci]` y no cambia el código desplegado. M9 accepted; Claude sin nueva tarea.

## 2026-11-14 Codex · M9 aceptado localmente y listo para dev

- Revisión independiente de A/B, cierres adversos y procedencia. Ficha oficial, exportación propia y paquete portable; ciencia y núcleo M8 intactos. Ajustes de legibilidad (12 px mínimo), errores de carga comprensibles y advertencias históricas actualizadas solo en presentación.
- 316 Python, 246 web (+2 opt-in omitidos), typecheck/build, baseline49 intacto. ZIP determinista de 31 entradas, SHA-256 `eed86833…6520c`. Navegador offline en subcarpeta, móvil/teclado, carga ausente/inválida y descarga real validada.
- Publicación dev y verificación remota en curso; no promoción a main. Informe en `docs/CODEX_M9_REVIEW.md`.

## 2026-11-14 Claude Code · M9 fase B (ficha, exportación, empaquetador) — entrega para revisión

- Dos bordes de A cerrados con regresiones: `publish` declara `PackageStateError` si no puede restaurar el respaldo del mismo par; los anillos GeoJSON deben cerrar exactamente.
- Política pura separada en `pipelines/geology_policy.py`; validador único `geology_contract` (sin Shapely/pyproj/requests) con exportación `geology-export` autocontenida. Web: validación espejo, carga con timeout que cubre el cuerpo, ficha compacta/expandible con redondeo honesto y descarga de JSON. Empaquetador con paquete geológico opcional y validado.
- 316 Python, 245 web, build y ZIP repetido idéntico (31 entradas, SHA-256 `579a4fed…74be`); baseline intacto. Sin commit, push ni deploy; QA de navegador y publicación a cargo de Codex.

## 2026-11-14 Claude Code · M9 fase A corregida tras la revisión de Codex

- Cinco hallazgos cerrados con regresiones: límite de cambio de área total en reparaciones (original no positivo ⇒ rechazo con máscara), validación estructural de cada vértice antes de Shapely y antes de instalar caché, transacción caché+paquete con rollback (`prepare_raw` + `publish`), procedencia exacta por sector (rol, `site_id`, bbox de la URL sin redondeo) y chilena ligada a la descarga de la capa.
- Caché con nombre/symlink comprobados antes de abrir; licencia leída de CKAN (rechazo si no es cc-zero); narrativa de formatos solo de lo observado; SIGAM corregido; método alineado con la superposición en EPSG:6933. Prueba de texto del código sustituida por una funcional.
- Paquete real recalculado desde la caché sin red (SHA-256 `fe2552dd…856c`, rebuild idéntico). 297 Python, 196 web, typecheck y build correctos; baseline intacto. Fase B pendiente; `release:package` sigue fallando hasta B. Sin commit ni push.

## 2026-11-14 Claude Code · M9 fase A (datos, contrato, pruebas) — entrega para revisión

- Adquisición pública acotada (CKAN + ZIP Chile inspeccionado por contenido + un WFS 1.0.0 por sector argentino), caché raw ignorada con petición exacta/SHA-256/`acquired_at`, validación de truncamiento, CRS, rangos y bbox por entidad. Sin credenciales.
- Recorte/partición en plano EPSG:6933 con ambigüedad, huecos y descripción ausente separados; reparación `make_valid` vs `buffer(0)` con límites 0,1 %/0,05 % y máscara conservadora en rechazo; estados conservadores. Contrato `geology-context` + semántica (geometría exacta, cierre de áreas, estado recalculado).
- Paquete real de siete sectores; rebuild offline idéntico. 248 Python, 196 web, typecheck y build correctos; baseline intacto. `release:package` falla hasta la fase B (lista del empaquetador). ADR-010 propuesto. Sin commit ni push; fase B pendiente.

## 2026-11-14 Codex — M9 autorizado y asignado a Claude

- Dan aprobó implementar y sacar el contexto geológico recomendado. Encargo M9 en NEXT_TASK, revisión de datos y producto entre fases, M8 archivado y baseline protegido.
- Dos fuentes oficiales, siete sectores, cobertura/ambigüedad explícitas, ficha/exportación y paquete offline. Ciencia, rankings e IA actual conservados. Codex verifica antes de dev.

## 2026-11-14 Codex — evaluación de valor y esfuerzo de geología oficial

- Auditadas las siete geometrías v3 contra datos públicos reales: SERNAGEOMIN vía MMA y WFS SEGEMAR. Chile ≈99 % de cobertura a 1:1M; Argentina 50/0/100 % a 1:250K. Probadas alternativas 1M/2,5M sin confundir su detalle ni rellenar silenciosamente huecos.
- Detectados formatos intercambiados en el catálogo chileno, geometrías inválidas y solapamientos; contraste SHP/GeoJSON de 306 geometrías próximas sin discrepancias. Consultas argentinas individuales y regional coinciden al recortar.
- Informe `docs/GEOLOGY_FEASIBILITY.md`, cálculo offline y evidencia con hashes en `docs/research/geology/`. Recomendación: primer corte descriptivo, 20–32 h estimadas; ranking/calibración geológica pendientes. No se asignó implementación a Claude ni se publicó.
- Caché pública local de 20.873.381 bytes en `data/raw/geology-feasibility-20261114/` ignorada; dependencias de investigación aisladas en `/tmp`. Sin cambios de app, IA ni ciencia. `npm run verify`: 177 Python, 196 web, typecheck/build correctos; 2 opt-in omitidos.

## 2026-11-14 Codex — dev e IA real verificados

- Publicación corregida `9060970`, Actions 43639834860 correcto, alias `https://analogos-dev.vercel.app/`. Main y protección de acceso sin cambios.
- Prueba real desde navegador: borrador de tres requisitos (`req_011Ch3V9sX8XWfnCFHCehTem`) y explicación (`req_011Ch3VD7AVeY7uEpeKT9i9e`), ambos con `claude-sonnet-5-5`. Un área priorizada y seis descartadas; permisos siguen pendientes.
- JSON descargado validado contra contrato y recálculo local idéntico. Exportación sintética y captura en `submission/evidence/m8-dev-ai-export.json` y `submission/assets/analogos-m8-dev-ai.png`.
- Evidencia y operación en `docs/DEV_AI_VERIFICATION.md`. ZIP final determinista: 30 entradas, 12.987.707 bytes, SHA-256 `eacf5dce441763b2c5e21d2aa2d75fe88130cccfeafb098c72e73bba1f2bd32f`; 38 hashes de baseline intactos. 177 Python y 196 web correctos, más arranque del paquete real en CI.
- Este checkpoint solo agrega documentación y evidencia, con `[skip ci]`; conserva el código desplegado y ya verificado. Claude queda sin nueva asignación.

## 2026-11-14 Codex — corrección de ejecución en Vercel

- El primer deploy de M8 (`707d4b1`, Actions 43639120488) compiló y publicó, pero la prueba de IA en navegador reveló `ERR_REQUIRE_ESM`: la función Node requería módulos dentro del paquete ESM de la web.
- Extraído el mismo núcleo puro a `shared/`, con reexports compatibles para el frontend e imports directos desde servidor. Sin cambios de reglas, datos ni dependencias. Typecheck servidor alineado con NodeNext.
- Nueva comprobación de arranque sobre la función realmente empaquetada antes del deploy: carga módulos, snapshot/contratos y valida GET 405 y POST sin clave 503. Verificado también con compilación Node local.
- Repetidos 177 Python, 196 web (+2 opt-in omitidas), typecheck y build. Segunda publicación y prueba real remota en curso.

## 2026-11-14 Codex — publicación M8 en dev autorizada

- Dan pidió commit/push a dev y comprobación de la IA remota. Preparado despliegue con `ANTHROPIC_API_KEY` como secreto de GitHub, inyectado por `vercel deploy --env` únicamente en runtime de dev. Main y protección de Vercel se conservan.
- Verificación previa repetida: 177 Python, 196 web (+2 pruebas opt-in omitidas), typecheck y build correctos. Se seguirá Actions y se comprobarán las dos operaciones desde la web protegida.

## 2026-11-14 Codex — aceptación local de M8

- Revisada la implementación de Claude y verificadas las correcciones de geometría, escala, timeout, estado de IA, exportación y presentación. Ajuste final de Codex: umbrales diminutos conservan notación científica y la etiqueta de cobertura sirve para una o siete ventanas.
- Verificación independiente final: 177 Python, 196 web (+2 de IA real omitidas por defecto), typecheck/build; 10/10 casos adicionales de auditoría. Los 38 hashes de baseline siguen intactos.
- Navegador: recorridos de prueba/sector, IA real de borrador y explicación, exportación con procedencia, invalidación, cero priorizados, puntos y cobertura, teclado y móvil. ZIP manual bajo `/AnalogOS/` con red externa bloqueada.
- ZIP final determinista: 30 entradas, 12.987.711 bytes, SHA-256 `440b295e936613eea74e43e74cd2f978defd2e8c01b72e7bedcdd359b8d2b5da`; contenido cotejado con dist y sin clave. Captura `submission/assets/analogos-m8-review.png`.
- Informe `docs/CODEX_M8_REVIEW.md`; NEXT_TASK y ADR-009 aceptados localmente. Pendientes: despliegue/prueba en Vercel e inspección visual de impresión nativa. No hay commit, push ni nueva tarea a Claude.

## 2026-11-14 Claude Code · M8 revisión B (presentación)

- Formateo compartido (`mission/format.ts`): unidades humanas y números es-CL en razones, tablas, confirmación e informe; JSON con unidad canónica sin cambios.
- Confirmación con condiciones efectivas y geometría pedida; informe impreso con condición efectiva por requisito y geometría pedida/medida en texto aunque no haya opciones.
- «Esta versión» en lugar de «M8» en textos de usuario; escala «Ventana completa (~20 km)»; hero sin promesa de tracción.
- Verificación: 177 Python, 196 web (+2 de IA real omitidas), typecheck del servidor, build; auditoría Codex 9/9; ZIP repetido idéntico (SHA-256 `7b2b30b5…d2ec`); baseline de 38 archivos intacto. Sin llamadas de IA nuevas. Sin commit ni push.

## 2026-11-14 Claude Code · M8 recomendación guiada por prueba y sector (entrega para revisión)

- Corrección de la revisión de A: geometría solo con épsilon 1e-9°, timeout que cubre la lectura del cuerpo, exportación con borrador y explicación de IA separados y validada semánticamente, salida del proveedor validada con Ajv, escala/cifras ancladas al brief, «otro objetivo» no soportado. Auditoría independiente 9/9 (incluye respuesta de IA con huellas ajenas ⇒ error, y reintento fallido que conserva la procedencia).
- Etapa B: planificador integrado (`components/planner/`), estado puro con invalidación y protección contra respuestas tardías (`mission/plannerState.ts`), esquema SVG local, resultado, informe imprimible y JSON validado; entradas en el hero y botón en la ficha.
- Servidor opcional de IA (`server/ai/`, `api/ai.ts`) y servidor local en el plugin de Vite; contratos `mission-*`; docs `AI_SETUP`, arquitectura, producto, guía de aceptación y README.
- Verificación: 177 Python, 196 web (+2 de IA real omitidas), typecheck del servidor, build; ZIP repetido idéntico (SHA-256 `7b2b30b5…d2ec`); baseline de 38 archivos intacto. IA real registrada en `project/M8_PROGRESS.md`.
- Pendiente: revisión de Codex (CUA, Vercel sin publicar). Sin commit ni push.

## 2026-11-14 Claude Code · rediseño fusionado en dev

- `redesign/planeta-3d` fusionada en `dev` (fast-forward) por decisión directa del equipo humano, sin revisión de Codex: liquid glass global, globo de fondo con paso a 2D, ficha flotante, desglose del score con magnitudes y series Sentinel-2.
- ADR del globo renumerado a ADR-007; ADR-006 y ADR-007 aceptados por el equipo.
- `npm run verify` (128 Python, 1 omitido; 52 web; build) y `npm run release:package` en verde; ZIP de 24 archivos con SHA-256 verificado.
- Pendiente: `CLAUDE.md` aún dice «mapa SVG, no MapLibre ni WebGL»; debe actualizarlo el equipo o Codex.

## 2026-11-14 Claude Code · desglose del score con magnitudes reales

- `breakdown/ScoreBreakdown.tsx`: cada criterio se dibuja con su magnitud y unidad; la topografía se dibuja frente a Jezero (MOLA). Hay rampa de pendiente (exageración ×5 rotulada), perfiles de rugosidad a escala, montañas de relieve, cuadrícula de 100 píxeles Sentinel-2, pluviómetro y termómetro con las marcas del perfil (25 mm/año, saturación en 45 K).
- El anillo muestra `normalized_similarity` del pipeline sin recalcularla; el texto explica cómo sale del valor (razón de medianas, 1/(1+mm/25), saturación, fracción), verificado contra los tres sectores.
- `domain/marsReference.ts` lee `mola_reference` de `analysis-summary.json` (opcional); 2 tests nuevos.
- Liquid glass: los paneles con scroll interno dibujan el borde con sombras para que no se desplace con el contenido.

## 2026-11-14 Claude Code · liquid glass global

- `liquid/liquid-glass.css` y `liquid/LiquidGlass.tsx`: el efecto deja de estar solo en la navbar y se aplica a paneles, tarjetas, métricas, criterios, avisos, chips, botones y controles sobre el globo.
- Capas: tinte translúcido con desenfoque, brillo especular que sigue al cursor (un solo listener con rAF), borde de luz iridiscente, arista y cáustica internas, compresión al presionar.
- Refracción real con filtro SVG en Chromium para los controles flotantes; el resto de navegadores usa solo desenfoque. Respeta `prefers-reduced-motion` y `prefers-reduced-transparency`.
- Fondo con manchas azul/naranja en deriva lenta para que el vidrio tenga algo que refractar.
- Capturas de `submission/assets/`, ZIP y `SHA256SUMS.txt` regenerados.

## 2026-11-14 Claude Code · rediseño liquid glass (rama redesign/liquid-glass)

- Paleta nueva: navy #02070A, azul #0297DE (interacción, similitud, selección) y naranja #FC734D (advertencias, fixture, énfasis). La confianza usa un tono hielo distinto.
- Superficies de vidrio (`.glass`) con desenfoque y bordes de luz; alias `--accent/--sand/--mint` para compatibilidad con los estilos del globo.
- `LiquidNav`: navbar con gota WebGL (adaptada de Nimbus UI "Waterline"), fallback CSS sin WebGL y scroll-spy de secciones.
- `SignalCard` + `SurfaceSignals`: series mensuales Sentinel-2 2025 (BSI y NDVI) por sector, adaptadas de "Market Card" (Louis Studios). Al cambiar de zona la tarjeta anima su salida y repite la entrada con la serie nueva. Solo visualización: no alteran el score.
- `parseSurfaceSeries` valida `analysis-summary.json` (opcional) sin interpolar meses faltantes; 4 tests nuevos.
- Ficha con entrada animada al seleccionar zona; marcador seleccionado con pulso; workspace con altura fija y scroll interno en escritorio (el mapa quedaba fuera de vista con fichas largas).

## 2026-11-14 Codex

- Creado paquete de handoff para Claude Code.
- Congelado stack P0.
- Añadidos contratos de perfil, candidato y manifiesto.
- Añadido backlog con gates M0–M6.
- Añadido protocolo de continuidad para retomar con Codex.
- No se inició todavía la implementación competitiva en esta carpeta.

## 2026-11-14 Claude Code

- M0 cerrado: monorepo npm + paquete Python `pipelines`, Vitest y pytest configurados.
- M1 cerrado: snapshot fixture NO científico en `artifacts/demo/` y web con mapa, ranking, ficha y desglose.
- Validación de contratos en Python (jsonschema) y en la web (Ajv), con los mismos schemas.
- Agregación determinista en `pipelines/scoring.py` (adelanta parte de M2): media geométrica ponderada, epsilon, peso válido mínimo 0,70 y confianza separada.
- `python -m pipelines.build_demo` genera el snapshot; un test detecta si queda desfasado.
- Contorno de Chile local (Natural Earth, dominio público) para que el mapa no dependa de servicios externos.
- Verificado: `npm run test` (11), `npm run build`, `python -m pytest` (15) y revisión manual en navegador.
- Sin cambios en `contracts/`, perfil P0 ni decisiones congeladas; no hubo ADR. Detalle de decisiones en `project/STATUS.md`.
- Pendiente de M2: restricciones con razón trazable y sensibilidad.

## 2026-11-14 Codex — retomado después de Claude

- Resuelto el conflicto de las dos implementaciones web; se conservó e integró una sola app compilable.
- Sustituido MapLibre por un mapa SVG local tras detectar un panel vacío en un navegador sin WebGL confiable; decisión registrada en ADR-001.
- Cerrado M2: restricciones trazables `exclude/review/warn`, sensibilidad de pesos ±20 % y tests de exclusión.
- Añadido pipeline reproducible sin credenciales para NASA PDS MOLA, NASA SRTM vía Terrain Tiles y NASA POWER.
- Generado `artifacts/science-v1/` con tres candidatos reales de screening; decisión científica registrada en ADR-002.
- Resultado: Yungay 73,65; Domeyko 65,11; María Elena 40,70. Confianza 57,8 y factibilidad `requires_review` para los tres.
- La app final usa el snapshot científico; fixtures se conservan solo para tests.
- Añadidos comparador, estabilidad, advertencias expandibles, descarga de ficha y metodología dentro de la app.
- Creado paquete de presentación bilingüe, pitch, demo, metodología, resultados, atribuciones, captura y checklist.
- Verificado: 25 tests Python, 12 tests web, TypeScript estricto y build Vite estático de ~552 kB.

## 2026-11-14 Codex — cierre post-Claude

- Auditado el árbol completo y confirmado que no hubo cambios posteriores al checkpoint de las 10:30.
- Eliminados tres restos no importados de la primera implementación de Claude: `ScoreBreakdown.tsx`, `DataProvenance.tsx` y `styles/app.css`.
- Reejecutado `npm run verify`: 25 tests Python, 12 tests web, contratos, TypeScript y build verdes.
- Verificados nuevamente el ZIP estático y su checksum SHA-256; el contenido desplegable no cambió.

## 2026-11-14 Codex — snapshot autenticado v2

- Probadas correctamente las credenciales Earthdata Login y OAuth Client Credentials de Copernicus.
- Añadidas dependencias reproducibles `earthaccess`, `requests` y `python-dotenv`.
- Detectado y corregido un error de borde: Pampa Yungay cruza cuatro tiles NASADEM; v1 analizaba solo un tile SRTM.
- Descargados seis granules `NASADEM_HGT.001` con HGT y máscara SWB.
- Consultados 677 granules HLS S30 v2.0 en total como inventario NASA independiente, sin doble conteo espectral.
- Procesados 12 mosaicos mensuales Sentinel-2 L2A por sitio mediante Statistical API con SCL, NDVI y BSI.
- Generado `artifacts/science-v2/`: Yungay 75,67; Domeyko 71,60; María Elena 49,99; confianza ~77,4.
- Añadido screening de agua permanente; María Elena conserva advertencia por ~0,15 %.
- La web final ahora carga `science-v2`; documentación, pitch, metodología y atribuciones actualizados.
- Añadido ADR-003 y tests de mosaico multitesela, fuentes autenticadas, ranking y ausencia de secretos.
- Verificado: 30 tests Python, 14 tests web y build Vite estático verdes.

## 2026-11-14 Codex — empaquetado final v2

- Alineados `submission/README.md` y `submission/DEMO_SCRIPT_2_MIN_ES.md` con los resultados v2; no quedan cifras v1 en el material de presentación activo.
- Actualizadas las versiones del paquete Python, monorepo y frontend a `0.2.0`.
- Añadidas anclas de comparación y método para navegación y captura reproducible.
- Regeneradas las dos capturas de presentación con el snapshot v2 y verificada visualmente la app compilada sin errores de consola.
- Regenerado `submission/analogos-chile-static.zip`, comprobada su integridad y actualizado `submission/SHA256SUMS.txt`.
- Excluidos `demo/` y `science-v1/` del build desplegable para mantener `science-v2/` como única fuente de verdad entregada.
- Confirmado que `.env` y `data/raw/` están ignorados y que ninguna credencial aparece en código o artefactos entregables.

## 2026-11-14 Claude Code — publicación y rótulos

- Inicializado repositorio Git propio (rama `main`) y publicado el commit `becd783` en https://github.com/hori0729/AnalogOS; `.gitignore` suma `*.egg-info/` y `.claude/`.
- Perfil `mars-rover-screening-v2` pasa a `2.0.1-preliminary`: dos limitaciones nuevas aclaran que la calidad es asignada por fuente (ADR-003), qué significa `validated` y que la comparación topográfica es una razón de medianas. Sin cambios en pesos, criterios ni scores.
- Regenerado `artifacts/science-v2/`: solo cambian `mission-profile.json` y `candidate-details.json` (versión de perfil, limitaciones y porcentajes con coma decimal). Similitud, confianza, estabilidad, `manifest.json` y `analysis-summary.json` quedan idénticos.
- Web: un solo orden (`rankCandidates`) en ranking, mapa, comparador y selección inicial; área con dos cifras significativas (≈ 450 km², antes ≈ 500); decimales con coma en el mapa; la confianza se rotula «Calidad asignada por fuente».
- `submission/METHODOLOGY.md` documenta lo anterior; regenerados `analogos-chile-static.zip` y `SHA256SUMS.txt`.
- Verificado: 30 tests Python, 14 tests web, build y revisión en navegador sin errores de consola.
- Publicado en `origin/main` como segundo commit.
- Destino cambiado por decisión del equipo: `origin` pasa a https://github.com/Esteban12-hori/AnalogOS (privado). https://github.com/hori0729/AnalogOS queda como remoto secundario `hori0729`, con los dos primeros commits y sin más actualizaciones.
- Incorporados tres cambios hechos por otro proceso a las 12:15: `README.md` y `docs/ARCHITECTURE.md` alineados con el mapa SVG y `science-v2`, y `tests/test_precision_artifacts.py` con la prueba de NASADEM crudo opcional más una prueba nueva sobre el análisis versionado. Verificado: 31 tests Python aquí; 30 verdes y 1 omitido en un clon limpio sin `data/raw/`.
- Pendiente: las dos capturas de `submission/assets/` son anteriores a estos rótulos.

## 2026-11-14 Codex — cierre de handoff en el repositorio definitivo

- Confirmado que `origin/main` y el HEAD local coinciden en `92053ea` para `https://github.com/Esteban12-hori/AnalogOS`.
- Retirado el remoto local obsoleto `hori0729`, cuyo repositorio ya no responde, para evitar publicar por error en el destino anterior.
- Validada la app compilada con el perfil `2.0.1-preliminary`, área ≈450 km² y rótulo «Calidad asignada por fuente».
- Regeneradas `submission/assets/analogos-chile-overview.jpg` y `analogos-chile-comparison.jpg` con los rótulos actuales.
- Verificada la suite con datos locales (31 tests Python) y simulando un clon sin `data/raw/` (30 verdes, 1 integración NASADEM omitida).

## 2026-11-14 Claude Code — revisión de capturas (local, sin commit, pendiente de decisión del equipo)

- Hallazgo: a 1280×720 y 1440×900 el mapa quedaba fuera de la primera pantalla. El SVG se centraba verticalmente en un panel de ~1.500 px de alto (la fila de la rejilla crece con la ficha), así que la captura `analogos-chile-overview.jpg` de las 12:20 mostraba el panel del mapa vacío.
- Corrección de una línea en `apps/web/src/components/CandidateMap.tsx`: `preserveAspectRatio` pasa de `xMidYMid meet` a `xMidYMin meet`; el mapa se ancla arriba. Sin cambios en ciencia, contratos, perfil, snapshot ni ranking.
- Regenerados `submission/analogos-chile-static.zip` y `SHA256SUMS.txt` con el build nuevo.
- Reemplazada `submission/assets/analogos-chile-overview.jpg` por una captura 1280×720 de Chrome sin interfaz con el mapa visible. La versión de las 12:20 no estaba en Git y no se conserva. `analogos-chile-comparison.jpg` queda como la dejó Codex.
- Verificado: 31 tests Python, 14 tests web, build y revisión visual a 1280×720 y 1440×900 sin errores de consola.
- Estos cambios se hicieron antes de leer `project/NEXT_TASK.md` (creado a las 12:28). No hay commit ni push; no se tocaron `AGENTS.md`, `CLAUDE.md`, `project/HANDOFF_PROTOCOL.md`, `prompts/START_CLAUDE.md` ni `project/NEXT_TASK.md`.

## 2026-11-14 Codex — dirección técnica Codex → Claude

- Corregido `CLAUDE.md`, que todavía describía a Claude como lead temporal de M0/M1 y exigía MapLibre; ahora refleja M6, SVG local y el snapshot v2.
- Establecida la cadena de trabajo: Codex define/revisa/acepta; Claude implementa; el equipo humano conserva autoridad final.
- Creado `project/NEXT_TASK.md` como única cola autorizada, con propietario, estado, rama, commit base, alcance y restricciones.
- Actualizados `AGENTS.md`, `prompts/START_CLAUDE.md`, `prompts/RESUME_CODEX.md` y `project/HANDOFF_PROTOCOL.md` para impedir trabajo fuera de alcance, autoaprobación o pushes a `main` sin autorización.
- Rama de implementación fijada en `dev`; `main` reservada para entregas revisadas.
- Revisado y aceptado el ajuste final de Claude en `CandidateMap.tsx` (`xMidYMin`): mejora la captura 16:9 sin cambiar datos, score ni contratos; ZIP y checksum coherentes.

## 2026-11-14 Claude Code — M6-PORTABLE-RELEASE (entregado en `review`, sin commit)

- Nuevo `npm run release:package`: encadena `npm run build` con `scripts/package_release.py` (solo biblioteca estándar).
- `apps/web/vite.config.ts` usa `base: './'`; el build carga en `/` y en un subdirectorio. No hizo falta tocar `loadDemoSnapshot.ts` ni `App.tsx`: ya usaban `import.meta.env.BASE_URL`.
- El empaquetador admite solo `index.html`, los JS/CSS que ese HTML referencia de forma relativa y los cinco archivos `science-v2/`. Rechaza archivos adicionales, enlaces simbólicos, referencias absolutas o externas y archivos ausentes.
- ZIP determinista: orden alfabético, fecha interna fija, permisos fijos y sin compresión. Tres ejecuciones seguidas dieron el mismo SHA-256 (`beb83736…68ac14`); la lista del ZIP y sus bytes coinciden con `apps/web/dist/`.
- Tras la revisión de Codex: temporales únicos con `mkstemp`, reemplazo en pareja con restauración del ZIP anterior si falla el del checksum, y rechazo previo de `--zip` igual a `--checksum` o de destinos dentro del build. Límite documentado: sin atomicidad frente a cortes abruptos entre los dos renombrados.
- `tests/test_release_package.py`: 29 casos sobre directorios temporales (determinismo, conjunto exacto, faltantes, inesperados, enlaces simbólicos, referencias no portables, preservación ante error, rollback, rollback fallido, destinos inválidos y temporales únicos).
- Verificado: `npm run verify` (60 tests Python, 14 tests web, build), `npm run release:package`, `shasum -a 256 -c`, `git diff --check`. Prueba por HTTP local con Chrome sin interfaz en `/AnalogOS/` y en `/`: la app renderiza y todas las peticiones responden 200 (solo `favicon.ico` da 404, igual que antes).
- Documentado en `README.md`, `submission/README.md` y `docs/decisions/ADR-004-portable-static-release.md` (estado `proposed`).
- Sin cambios en ciencia, contratos, perfil, snapshot, ranking ni dependencias. Sin commit, push ni publicación.

## 2026-11-14 Codex — aceptación de M6-PORTABLE-RELEASE

- Asignada la implementación a la sesión existente de Claude Code y supervisada hasta su devolución en `review`.
- Reproducido un fallo de la primera versión: el segundo reemplazo podía dejar ZIP nuevo con checksum anterior. Devuelto a Claude; aceptada la corrección con restauración, temporales únicos y rechazo de destinos solapados.
- Reejecutados de forma independiente `npm run verify` (60 Python, 14 web, contratos, TypeScript y build), `npm run release:package`, checksum y `git diff --check`: correctos.
- Comprobado el determinismo del ZIP y sus ocho entradas byte a byte contra dist y contra la copia probada por HTTP en `/` y `/AnalogOS/`. Verificados ranking, mapa, selección de María Elena, advertencia de agua y ausencia de errores de consola.
- Confirmados los seis hashes originales de snapshot v2 y perfil de configuración. Preservados los cambios previos del equipo; HEAD sigue en `92053ea` sobre `dev`.
- ADR-004 y encargo aceptados, con límites de interrupción abrupta y HTTP documentados. Claude queda a la espera de nueva asignación. Sin commit, push ni publicación.

## 2026-11-14 Codex — checkpoint de dev autorizado por Dan

- Dan autorizó explícitamente commit y push de los cambios revisados a `dev`.
- Integrados por avance directo `6516743` y `3c1a014` desde `origin/dev`: configuración de Vercel e ignorado de `.vercel`; sin conflictos con la entrega local.
- El checkpoint reúne el empaquetador portable aceptado, su documentación y pruebas, la coordinación Codex/Claude y el ajuste de mapa y capturas ya revisados.
- Antes del commit se repitió `npm run verify`: 60 pruebas Python, 14 web, contratos, TypeScript y compilación correctos.

## 2026-11-14 Claude Code — M4-VISUAL-EVIDENCE (entregado en `review`, sin commit)

- Nuevo `pipelines/fetch_visual_context.py`: una petición por candidato a la Process API de Copernicus Sentinel Hub (`sentinel-2-l2a`, B04/B03/B02, ventana 2025-12-01 a 2026-01-01, `leastCC`, nubosidad máxima 40 % por escena). Resultado en `artifacts/visual-context/`: tres PNG reales de 705–714 × 768 px y un `index.json` con petición, evalscript, metadata devuelta, hora de consulta y SHA-256.
- La primera ejecución falló por red al pedir el token (tres intentos, sin escribir nada); la segunda funcionó. Cada vista salió de una sola órbita con 100 % de píxeles válidos: Yungay y María Elena, 2025-12-21; Domeyko, 2025-12-03.
- Un paquete local válido se reutiliza sin red ni credenciales; `--refresh` consulta de nuevo. Las generaciones no se mezclan y ante error se conserva la anterior.
- Tras la revisión de Codex: el validador exige que toda la metadata presentada (bbox, periodo, colección, transformación, identidad, snapshot, dimensiones, escenas) coincida con el candidato, la petición, el PNG o la metadata devuelta; `_swap` informa el estado real y conserva el respaldo si no puede restaurar o limpiar; la web valida cada elemento de `scenes_used`, exige `image === site_id + ".png"` y `site_id` únicos.
- Web: panel «Contexto satelital» en la ficha (`VisualContext.tsx`, `loadVisualContext.ts`) con imagen local, periodo, atribución, nota preliminar, enlace a la imagen y procedencia. Cae a «no disponible» con fixtures, índice ausente o inválido e imagen fallida. No toca score, confianza ni factibilidad; el navegador solo pide archivos locales.
- Empaquetador: lista explícita ampliada con `visual-context/index.json` y tres PNG de nombre fijo, con verificación de su SHA-256 contra el índice. ZIP de 12 archivos y 4.084.880 bytes.
- Verificado: `python -m pipelines.fetch_visual_context` (reutiliza sin red), `npm run verify` (119 tests Python, 24 web, build), `npm run release:package`, `shasum -a 256 -c`, `git diff --check`. En navegador: imagen por candidato, cambio de candidato, procedencia, error de imagen, vista móvil y `/AnalogOS/` por HTTP, sin errores de consola.
- Documentado en `docs/VISUAL_REVIEW.md`, ADR-005 (`proposed`), `README.md`, `submission/README.md`, `submission/ATTRIBUTIONS.md`, `submission/JUDGING_CHECKLIST.md` y `project/BACKLOG.md` (avance parcial de M4).
- Sin cambios en `artifacts/science-v2/`, perfil, contratos, score, ranking ni dependencias. Las credenciales Copernicus se usaron solo desde el programa y contra los hosts oficiales; no aparecen en artefactos ni registros.

## 2026-11-14 Codex — aceptación de M4-VISUAL-EVIDENCE

- Supervisada la sesión existente de Claude hasta su devolución en `review`, incluido un reintento tras fallo de conexión.
- Inspeccionados los tres PNG reales y su procedencia. Las trazas rectilíneas y formas geométricas observadas quedan como pistas para contraste territorial; no cambian factibilidad ni autorizan acceso.
- Devueltos y comprobados los defectos de validación de bbox/periodo, escenas malformadas en la web y mensajes incorrectos ante fallo de restauración.
- Verificación propia: 119 pruebas Python, 24 web, contratos, TypeScript, build, empaquetado, checksum y diff correctos. Cache demostrado sin red; 12 entradas del ZIP idénticas al build y empaquetado determinista.
- Navegador: selección de tres candidatos, procedencia, ZIP bajo `/AnalogOS/`, PNG ausente e índice inválido sin romper ranking/ficha. Los seis hashes científicos permanecen intactos.
- ADR-005 y tarea aceptados. M4 sigue parcial por imágenes recientes, revisión territorial y experta. Cambios locales sobre `dev`, sin commit ni push; Claude devuelve el control.

## 2026-11-14 Codex — checkpoint de contexto visual para dev

- Dan autorizó commit y push de M4-VISUAL-EVIDENCE a `dev`.
- El checkpoint incorpora los tres PNG reales y su procedencia, el panel offline, validadores y pruebas, documentación, ZIP y checksum revisados.
- Verificación previa al commit: `npm run verify` (119 pruebas Python, 24 web y build), checksum del ZIP y `git diff --check`.

## 2026-11-14 Claude Code — rama `redesign/planeta-3d`

- Globo terrestre 3D en el explorador (three.js, R3F, drei) con texturas NASA locales, atmósfera y polígonos de candidatos.
- Mapa SVG conservado como alternativa y fallback automático sin WebGL (ADR-004, propuesto; renumerado después a ADR-007).
- Geometría esférica pura en `src/domain/globe.ts` con tests; three.js en chunk diferido.

## 2026-11-14 Claude Code — rediseño de layout en `redesign/planeta-3d`

- Merge de `dev` (contexto visual ADR-005, entrega portable, Vercel); `submission/` toma la versión de `dev`.
- Globo como fondo; paso automático a mapa 2D (MapLibre) por zoom con histéresis; leyenda de fuente activa.
- `pipelines/fetch_basemaps.py`: Blue Marble regional y medianas HLS por sector desde NASA GIBS, en Web Mercator y sin huecos.
- Sentinel-2 de ADR-005 encima de cada polígono en el 2D; en la ficha, botón «Ver el sector en el mapa 2D» en lugar de la miniatura.
- Se elimina la columna de candidatos (selector 1·2·3 en la ficha) y el rótulo de snapshot repetido en la ficha; integrado `ScoreBreakdown`.
- ADR-006 propuesto. Pendiente: aceptación frente a `CLAUDE.md` de `dev` y lista del empaquetador.

## 2026-11-14 Claude Code — rendimiento, precarga y empaquetado en `redesign/planeta-3d`

- Globo con `frameloop="demand"`, sin objetos nuevos por cuadro y `dpr` limitado a 1,5. Agua de la navbar a ~15 fps cuando no hay interacción.
- Texturas del globo 2K/1K; `data/preload.ts` precarga texturas y chunks; el mapa 2D se monta oculto cuando el navegador queda ocioso.
- `vercel.json`: caché inmutable en assets con hash y corta en JSON.
- `package_release.py` lee `.vite/manifest.json` para los chunks diferidos y admite `basemaps/` explícitos; 7 tests nuevos.


## 2026-11-14 Codex — asignación M7-GLOBAL-DISCOVERY

- Dan autorizó AnalogOS con visión global y primer piloto de búsqueda Chile–Argentina, usando Yungay como referencia conocida.
- Asignado a Claude un corte vertical: 50 ventanas topográficas en dos regiones declaradas, hasta seis preselecciones multifuente, auditoría bibliográfica, snapshot v3, roles referencia/candidato, mapa binacional, exportación y paquete offline.
- Preservar v2 y pesos/fórmulas como línea base; distinguir alcance regional de cobertura mundial y ausencia de antecedentes de novedad demostrada.
- Baseline comprobada antes del handoff: 119 pruebas Python, 24 web y build verdes. Sin cambios de implementación, commit ni push en esta asignación.

## 2026-11-14 Claude Code — M7-GLOBAL-DISCOVERY (entregado en `review`, sin commit)

- Marca visible «AnalogOS» con subtítulo «Exploración de análogos planetarios · Piloto Chile–Argentina». Carpeta, remoto y paquetes no cambian.
- Búsqueda reproducible: `config/discovery_search_v3.json`, `pipelines/discover_candidates.py` y `pipelines/fetch_discovery_data.py`. 50 ventanas de 0,2° en dos regiones de prueba, prioridad topográfica con pesos relativos 0,20/0,20/0,15, hasta 3 por país con centros a ≥ 25 km. Cada ventana guarda su motivo.
- Resultado de la etapa 1: 50 evaluadas, 4 excluidas por coordenadas de muestreo publicadas, 2 por cercanía, 38 fuera del cupo y 6 preseleccionadas (3 por país).
- Snapshot `artifacts/science-v3/` con `pipelines/build_discovery_snapshot.py`: seis candidatos y Yungay como referencia, con las fórmulas y pesos v2. Yungay conserva 75,67 / 77,45 / 99,03. Los candidatos chilenos obtienen 94,87 / 91,87 / 90,35 y los argentinos 63,85 / 53,68 / 49,43; coinciden con el cálculo independiente de Codex.
- Antecedentes: `config/analog_precedents_v1.json` con las 30 coordenadas del material suplementario de Navarro-González et al. (2003) y fuentes sobre Atacama y la Puna; tres búsquedas dirigidas registradas. Ningún candidato se declara nuevo.
- Contratos: `candidate-site` admite `cl-`/`ar-`, añade `country`, `role`, `discovery`, `literature_review` y el estado `reference`; nuevos `discovery-search` y `precedent-catalog`. Los snapshots históricos siguen validando.
- Calidad sin confianza falsa: completitud Sentinel-2 contra 12 meses con rechazo de filas mal formadas, calidad topográfica × cobertura, validación de POWER y caché ligada a la petición exacta. Los valores v2 no cambian.
- Correcciones tras las revisiones de Codex: fallos de datos por ventana sin abortar la búsqueda, identidad de petición en el build, filas Sentinel-2 y POWER estrictas, redacción «valores coincidentes; posible celda compartida», búsqueda sin preselección como experimento negativo y etiqueta accesible del mapa.
- Web: alcance de la búsqueda, ranking con filtro por país, tarjeta de referencia aparte, mapa SVG regional con las 50 ventanas, ambos países y recuadro de ubicación, sección «Origen y antecedentes» en la ficha y exportación con rol, origen y alcance.
- Contexto visual v3 en `artifacts/visual-context-v3/`: seis imágenes nuevas y la de Yungay reutilizada del paquete v2. Observaciones preliminares en `config/visual_observations_v3.json`, visibles como advertencia.
- Empaquetador v3: lista derivada de metadata validada; `submission/analogos-static.zip` (18 archivos, 9.012.267 bytes) con `analogos-static.zip.sha256`. El ZIP v2 se conserva.
- Documentación: ADR-006 (`proposed`), `docs/DISCOVERY_REPORT.md`, README, documentos de producto y ciencia, material de `submission/` y captura `assets/analogos-pilot-overview.jpg`.
- Verificado: 167 tests Python, 39 tests web, build, empaquetado repetido byte a byte, demo en `/AnalogOS/` por HTTP y `git diff --check` limpio. v2 y sus artefactos sin cambios.
- Uso de red: 7 teselas NASADEM, 6 consultas Statistical API, 6 POWER, 6 inventarios HLS y 6 imágenes Process API, todas dentro de los límites; credenciales solo desde el programa.

## 2026-11-14 Codex — aceptación M7-GLOBAL-DISCOVERY (15:33)

- Aceptada la implementación de Claude como piloto regional de AnalogOS: 50 ventanas, seis candidatos, referencia Yungay fuera del ranking y precedentes visibles. Sin declarar descubrimientos confirmados ni cobertura global.
- Repetidos de forma independiente: 167 tests Python, 39 web y build; reconstrucción byte a byte de v2/v3; 11 hashes de baseline; cachés de 18 entradas y paquetes visuales v2/v3 sin red/login.
- Recalculadas las 50 prioridades, la selección y las seis similitudes/confianzas desde datos crudos. Verificados los puntos bibliográficos y las seis imágenes nuevas. Correcciones devueltas a Claude y regresiones incluidas.
- Navegador: filtro Argentina, fichas, referencia, exportación real con rol/origen, teclado del mapa, móvil y ZIP extraído en raíz y /AnalogOS/. Sin errores de aplicación durante la comprobación.
- ZIP determinista: 18 entradas, 9.012.267 bytes, SHA-256 3b419d770f1a1dce5e01f7345aaafef3f33ca18df4d2f73e6d3fb8c7c9853415. Baseline v2 intacto.
- ADR-006 y NEXT_TASK aceptados; informe independiente en docs/CODEX_M7_REVIEW.md. Actualizados STATUS, BACKLOG, instrucciones de continuidad y referencias activas de producto/ciencia para evitar volver a v2.
- Pendientes explícitos: territorio, bibliografía completa de la Puna y contraste climático local. Claude espera nueva asignación. Sin commit, push ni publicación.

## 2026-11-14 Codex — integración revisada y autorizada para dev

- Dan pidió «actualiza dev». Checkpoint científico M7 guardado en 1302ed8 e integrado con el rediseño remoto del equipo, preservando sus decisiones y despliegue. ADR de descubrimiento renumerado a 008; ADR-006/007 del equipo conservados.
- Conectado v3 a globo/2D, ficha flotante, series y desglose. Yungay REF queda fuera del ranking en todas las vistas. La sección Búsqueda conserva alcance, rejilla y filtro por país. Corregidas rutas de imágenes v3, propagación de rankings y encaje de nombres largos.
- 177 pruebas Python, 69 web y build correctos. ZIP repetido idéntico: 30 entradas, 12.865.983 bytes, SHA-256 804184d6015440fa073e451bfea376fc9b1c9ae6b672e133094cd528ac3af12b. Once hashes de baseline científico v2 y artefactos v3 sin cambios.
- Revisado el ZIP servido en /AnalogOS/: globo, Argentina y Sentinel-2 en 2D, Yungay como referencia, filtro por país, escritorio y móvil sin desborde horizontal. Captura submission/assets/analogos-integrated-dev.jpg. Actualizadas instrucciones del stack, entrega e informe de revisión.
- Comandos: source .venv/bin/activate && npm run verify; npm run release:package. No nuevas adquisiciones de datos ni cambios de pesos. Pendientes científicos: territorio, bibliografía de la Puna y clima local. Claude espera nueva asignación.

## 2026-11-14 Codex — corrección del alias dev en Vercel

- Integración publicada en origin/dev (8df83c0), árbol local limpio y SHA remoto verificado. Actions 43629101506 completó build/deploy, pero falló al asignar analogos-dev.vercel.app con «User not found», el mismo error del run anterior 43628749578.
- El paso del alias ahora pasa explícitamente --scope "$VERCEL_ORG_ID", usando el equipo ya configurado en el workflow. Referencia: https://vercel.com/docs/cli/global-options#scope (acepta slug o ID de equipo).
- Cambio limitado al despliegue y registro de estado; no requiere reconstruir ZIP ni repetir pruebas científicas. Se valida ejecutando el workflow en dev.

## 2026-11-14 Codex — alias mediante API de equipo

- Run 43629219568: build/deploy correctos; la CLI de alias sigue intentando cargar un usuario y devuelve 404 incluso con --scope. Sustituido ese paso por POST /v2/deployments/{hostname}/aliases?teamId=... de la API oficial, con el mismo secreto del workflow, timeout y comprobación del alias dev devuelto.
- Referencia: https://vercel.com/docs/rest-api/aliases/assign-an-alias. No se cambian permisos, secretos ni el destino aprobado. El secreto se usa por variable de entorno y no se imprime.

## 2026-11-14 Codex — encargo M8-MISSION-RECOMMENDATION

- Dan autorizó convertir el producto a definición de ensayo/evaluación de sector, recomendación con datos e IA y supervisión de Claude. Proveedor seleccionado: Anthropic.
- M7 archivado en project/tasks/M7_GLOBAL_DISCOVERY.md. NEXT_TASK asigna M8 a Claude con checkpoint de plan, criterios verificables y devolución a Codex.
- ADR-009 autoriza capa determinista de requisitos sobre v3, Yungay como alternativa conocida, geometrías con cobertura explícita y API mínima opcional de IA. Sin nuevos datos ni perfiles; no se traslada evidencia agregada a polígonos distintos.
- Base 4d197e1 verificada: 177 Python, 69 web, build; 38 hashes de ciencia/config/contratos en /tmp/analogos-m8-baseline-hashes.json. Publicación anterior verificada en Actions y navegador autenticado.

## 2026-11-14 Claude — M10-GEOLOGY-AI (en revisión de Codex)

- La explicación con IA puede usar el contexto geológico oficial M9 (opt-in): catálogo cerrado de pares unidad+propósito calculado en servidor, selección por IA (≤3 por sector, ≤12), orientación determinista sin IA, límites siempre visibles. Sin cambios de score, ranking, estados, pesos ni artefactos. ADR-011 propuesto.
- Validador M9 movido a `shared/geology/` (web reexporta). Servidor carga el paquete con SHA-256 de bytes de candidatos; errores 409 específicos antes del proveedor; `vercel.json` `includeFiles` acotado y `check-vercel-function.mjs` ejercita carga, ausencia y corrupción.
- Exportación: wrapper `analogos-mission-geology-export` v1 (embebe M8 1.0 intacto) con validador que recalcula catálogo/selección/guía; M8 1.0 y M9 sin cambios.
- Pruebas: 316 Python, 314 web (+3 omitidas), typecheck/build; ZIP 31 entradas SHA-256 `b2153f69c07be2edc1980c86d7d3eab6b8839b3556c0b244b6b618f8988a1b44` repetido idéntico; baseline de 24 archivos intacto. IA real con dos objetivos contrastantes OK tras corregir un truncamiento (`max_tokens` 6000 con canal).
- Comandos: `source .venv/bin/activate && npm run verify`; `npm run release:package`; `ANALOGOS_LIVE_AI=1 npm -w apps/web run test -- src/tests/aiLive.test.ts -t "orientación geológica" --silent=false`. Brechas: sin `vercel build` real ni QA de navegador. Sin commit/push/deploy.

## 2026-11-14 Claude — M10 ronda 2 (correcciones de revisión; en revisión de Codex)

- Wrapper: `subset_fingerprint` de los subconjuntos exactos, anclaje de geometría a candidatos con bundle, auditoría y reconstrucción del M8 embebido (`auditMissionExport`), constructor con `{ bundle }`. Los tres repros independientes ahora se rechazan. Contrato nuevo ampliado; contratos M8/M9 intactos.
- Loader: raíz explícita aísla de verdad y caché con identidad del bundle; startup check ejecuta una copia fuera del checkout. UI: fuente oficial clicable/impresa, fracciones con y sin solape, avisos de envío condicionales, sin jerga M8, IA antes de las fichas.
- Verify 316 Python / 325 web (+3 omitidas); ZIP SHA-256 `22b327cc…70bb` repetido idéntico; baseline y complemento intactos; evidencia real en `submission/evidence/m10-live-geology-evidence.json`. Sin commit/push/deploy.
