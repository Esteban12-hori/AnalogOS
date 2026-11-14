# Estado actual

**Última actualización:** 2026-11-14, M8 aceptado localmente (America/Santiago)
**Responsable del checkpoint:** Codex

**Entrega M8 autorizada:** Dan pidió subir a dev y verificar la IA allí. Codex prepara commit/push y seguirá el despliegue hasta probar borrador y explicación reales. La clave se configura como GitHub Secret y se inyecta solo en runtime del deploy dev; no se incluye en build ni ZIP. Verificación previa repetida: 177 Python, 196 web, typecheck y build correctos. La aceptación local de abajo permanece como evidencia; publicación remota aún en curso.

**Corrección de runtime:** `707d4b1` se desplegó (Actions 43639120488), pero la IA falló por incompatibilidad CommonJS/ESM detectada en navegador y logs. El núcleo se extrae a `shared/` sin duplicarlo; se añade comprobación de arranque de la función empaquetada. La IA remota no se da por aprobada hasta completar ambas operaciones.
**Milestone activo:** M8 — implementación local aceptada; entrega remota pendiente. Claude espera nueva asignación.
**Estado general:** producto funcional con snapshot científico v3: 50 ventanas evaluadas, seis candidatos y Yungay como referencia. Faltan capas territoriales, revisión bibliográfica completa y experta, contraste climático local y acciones de entrega humana.

**Sincronización:** M7 y el rediseño se publicaron previamente en `origin/dev`. M8 está revisado en el working tree local sobre `4d197e1`, sin commit ni push. La autorización de publicación y los cortes anteriores de abajo son históricos; la verificación vigente de M8 es la siguiente.

**Publicación anterior en dev:** integración y corrección de alias aceptadas en la base `4d197e1`. M8 no modifica workflows, autenticación ni secretos remotos; su función de IA debe verificarse al desplegarla.

## M8 — aceptado por Codex, pendiente de entrega remota

- Owner Codex, status accepted. Claude implementó y corrigió ambos recorridos; Codex revisó motor, contratos, IA, interfaz y paquete. Incluye editor de requisitos, sectores/coordenadas/bbox, confirmación, evaluación, detalle por criterio, informe imprimible, JSON validado y Anthropic opcional solo en servidor.
- Verificación independiente: `npm run verify` → 177 Python, 196 web (+2 omitidas de IA real), typecheck y build; auditoría adicional 10/10. ZIP repetido idéntico, 30 entradas, 12.987.711 bytes, SHA-256 `440b295e936613eea74e43e74cd2f978defd2e8c01b72e7bedcdd359b8d2b5da`; 38 hashes de baseline intactos.
- Probados desde navegador: borrador y explicación reales con `claude-sonnet-5-5`, JSON con procedencia, cambios de umbral/resultado, cero priorizados, punto con selección explícita de ventana, fuera de cobertura, móvil 390 px y teclado. ZIP bajo `/AnalogOS/` funciona manualmente sin API ni red externa. Captura `submission/assets/analogos-m8-review.png`.
- Límites: función en Vercel aún no publicada/verificada; impresión nativa pendiente de inspección visual (contenido y CSS comprobados). Siete ventanas con evidencia, perfil rover/Jezero; ninguna nueva adquisición ni aprobación de terreno.
- Informe vigente y reproducción: `docs/CODEX_M8_REVIEW.md`. Handoff histórico: `project/M8_PROGRESS.md`; configuración: `docs/AI_SETUP.md`. Vista local: `http://127.0.0.1:4187/` mientras siga activo el servidor. Claude espera nueva asignación.

## Integración revisada por Codex para dev

- Conservados el globo 3D, paso automático a mapa 2D, liquid glass, ficha flotante, desglose de magnitudes, series mensuales y despliegue del equipo. La aplicación carga v3 y sus siete imágenes; Yungay aparece como REF, fuera de los seis puestos, también en globo, mapa y selector.
- La sección Búsqueda mantiene el alcance de 50 ventanas, los descartes, filtro por país y mapa SVG auditable. Las series Sentinel-2 cubren los siete sitios; no intervienen en los scores. Sin modificar fórmulas, pesos ni artefactos científicos v2/v3.
- ADR-006/007 conservados del rediseño; el ADR de descubrimiento pasa a ADR-008. `CLAUDE.md` refleja el stack actual. El ZIP v2 actualizado por el equipo se conserva como histórico; los once hashes del baseline científico v2 siguen intactos.
- Verificación: `source .venv/bin/activate && npm run verify` → 177 Python, 69 web y build correctos. `npm run release:package` → 30 archivos, 12.865.983 bytes, SHA-256 `804184d6015440fa073e451bfea376fc9b1c9ae6b672e133094cd528ac3af12b`. Empaquetado repetido idéntico y entradas cotejadas con dist.
- Revisión del ZIP bajo `/AnalogOS/`: candidato argentino y su imagen Sentinel-2 real en mapa 2D, referencia Yungay, filtro Argentina, vista de escritorio y móvil de 390 px sin desborde horizontal. Sin errores de aplicación registrados en el servidor de producción local. Captura: `submission/assets/analogos-integrated-dev.jpg`.
- Archivos grandes versionados: ZIP v3, siete PNG de contexto y basemaps/texturas del equipo. Datos crudos y credenciales permanecen locales e ignorados. El mapa puede usar GIBS público como mejora opcional; el núcleo y las imágenes están empaquetados.
- La autorización incluye `dev`; no cambia el alcance científico ni inicia una nueva tarea a Claude. Próximos pasos: cruce territorial oficial, bibliografía completa de la Puna y contraste climático local.


## Fusión en `dev` (2026-11-14, Claude, decisión directa del equipo)

- El rediseño completo (liquid glass, globo de fondo con paso a 2D, ficha flotante, desglose del score, series Sentinel-2) está en `dev`. Commit de cierre y push a `origin/dev`.
- Verificación: `npm run verify` → 128 Python pasan y 1 se omite, 52 web y build en verde; `npm run release:package` → ZIP de 24 archivos, SHA-256 OK. Python 3.11+ requerido: el `python` del sistema (3.10) no sirve; usar un venv con `pip install -e .[dev] pillow`.
- Decisiones: ADR-006 y ADR-007 (globo, antes ADR-004) aceptados por el equipo humano sin revisión de Codex.
- Pendiente: actualizar en `CLAUDE.md` la línea «mapa SVG local; no MapLibre ni WebGL», que ya no refleja el producto.

## Modelo de trabajo activo

- Dan autorizó ampliar la visión a AnalogOS global, buscar candidatos en Chile y Argentina y mantener Yungay como referencia conocida. Encargo `M7-GLOBAL-DISCOVERY` aceptado; Claude espera una nueva asignación. La entrega v2 de abajo es histórica. La autorización posterior permite actualizar `dev`.

- Codex dirige producto, ciencia, arquitectura, prioridades, revisión y release.
- Claude implementa solo tareas asignadas en `project/NEXT_TASK.md` y entrega en estado `review`.
- La rama de implementación es `dev`; `main` queda reservada para entregas revisadas.
- Encargo `M6-RELEASE-REVIEW`: aceptado por Codex.
- Encargo `M6-PORTABLE-RELEASE`: implementado por Claude, corregido tras revisión y aceptado por Codex (12:44). Dan autorizó su commit y push a `dev` (12:48); Claude espera una nueva asignación.

- Encargo `M4-VISUAL-EVIDENCE`: implementado por Claude, corregido tras revisión y aceptado por Codex (13:54). Dan autorizó su commit y push a `dev` (14:15); Claude espera una nueva asignación.

## Entrega M7 aceptada (Codex, 15:33)

Revisión independiente en `docs/CODEX_M7_REVIEW.md`: 167 pruebas Python, 39 web y build; scores y selección recalculados, rebuild v2/v3 byte a byte, cachés sin red, ZIP determinista y navegador en raíz/subcarpeta. ADR-008 aceptado. La aceptación del software no certifica novedad ni aptitud de campo.

AnalogOS con piloto Chile–Argentina. Búsqueda real sobre 50 ventanas de ~20 km en dos regiones de prueba; seis candidatos preseleccionados y Yungay como referencia conocida, fuera del ranking.

| Rol | Sitio | Similitud | Confianza | Estabilidad | Factibilidad |
|---|---|---:|---:|---:|---|
| Candidato 1 | `cl-win-s2500-w06970` · 25,0° S, 69,7° O | 94,87 | 77,45 | 99,33 | requiere revisión |
| Candidato 2 | `cl-win-s2480-w06950` · 24,8° S, 69,5° O | 91,87 | 77,45 | 99,03 | requiere revisión |
| Candidato 3 | `cl-win-s2520-w06950` · 25,2° S, 69,5° O | 90,35 | 77,36 | 99,08 | requiere revisión |
| Candidato 4 | `ar-win-s2620-w06750` · 26,2° S, 67,5° O | 63,85 | 77,00 | 95,88 | requiere revisión |
| Candidato 5 | `ar-win-s2640-w06730` · 26,4° S, 67,3° O | 53,68 | 77,25 | 96,81 | requiere revisión |
| Candidato 6 | `ar-win-s2580-w06710` · 25,8° S, 67,1° O | 49,43 | 77,40 | 96,81 | requiere revisión |
| Referencia | `cl-pampa-yungay-screening` | 75,67 | 77,45 | 99,03 | requiere revisión |

- Etapa 1: 50 ventanas evaluadas (≈ 22.274 km²); 4 excluidas por contener coordenadas de muestreo publicadas, 2 por cercanía, 38 fuera del cupo, 6 preseleccionadas.
- Ningún candidato se declara nuevo: ambas regiones tienen antecedentes y los seis quedan como `regional_precedent`.
- Los argentinos bajan sobre todo por el contexto climático POWER (celda MERRA-2 mayor que la ventana); no se cambiaron pesos ni valores.
- Las siete imágenes Sentinel-2 muestran trazas y estructuras a contrastar; van como advertencia en cada ficha.
- Snapshot v2, paquete visual v2 y ZIP v2 intactos (`git diff --quiet HEAD` sobre ellos devuelve 0).
- Entregable nuevo: `submission/analogos-static.zip` (18 archivos, 9.012.267 bytes, sha256 `3b419d770f1a1dce5e01f7345aaafef3f33ca18df4d2f73e6d3fb8c7c9853415`).
- Verificado: 167 tests Python, 39 tests web, build, empaquetado repetido idéntico, demo por HTTP en `/AnalogOS/`.
- Detalle: `docs/DISCOVERY_REPORT.md`, ADR-008 (`accepted`) y el reporte en `project/NEXT_TASK.md`.

Próximos tres pasos: cruce territorial con capas oficiales de IDE Chile e IDERA; revisión bibliográfica con textos completos y coordenadas de la Puna; contraste local del clima. Requieren una nueva asignación, sin ampliar automáticamente regiones ni pesos.

## Rediseño integrado — rama `redesign/planeta-3d` (2026-11-14 13:10)

Fusiona dos ramas: el globo 3D (`redesign/planeta-3d`) y el rediseño visual (`redesign/liquid-glass`).

- **Qué funciona:**
  - Paleta navy #02070A / azul #0297DE / naranja #FC734D con superficies de vidrio.
  - Navbar líquida (gota WebGL, fallback CSS) con scroll-spy.
  - Liquid glass global (`apps/web/src/liquid/`): todas las superficies tienen vidrio con borde de luz, brillo que sigue al cursor y refracción SVG en Chromium; fondo con manchas de color en deriva.
  - Globo terrestre 3D (three.js, Blue Marble) con alternador a mapa SVG y fallback automático sin WebGL; huellas en azul y la zona seleccionada en naranja.
  - Sección «Señal de superficie»: BSI y NDVI mensuales Sentinel-2 2025 por sector, animados al cambiar de zona. Solo contexto: no alteran el score.
- **Cómo ejecutarlo:** `npm run dev`, o `npm run build && npm run preview`.
- **Pruebas:** ver «Verificación ejecutada». Revisión manual en Chromium headless con SwiftShader a 1440×900 y 390×844: sin desborde horizontal ni errores de consola, salvo el 404 de `favicon.ico` preexistente. Capturas de `submission/assets/`, ZIP y `SHA256SUMS.txt` regenerados desde este build.
- **Archivos:** `styles.css`, `App.tsx`, `components/{LiquidNav,SignalCard,SurfaceSignals,CandidateGlobe,CandidateMapView}.tsx`, `CandidateGlobe.css`, `domain/{surfaceSeries,globe}.ts`, `data/loadDemoSnapshot.ts`, tests `surfaceSeries` y `globe`, `vite.config.ts`, ADR-004.
- **Decisiones:** ADR-007 (antes ADR-004) amplía el stack con three.js sin retirar ADR-001. Las series mensuales no entran al score y no se interpolan meses faltantes.
- **Bloqueos:** ninguno técnico. Abierto: con zoom, el globo se ve pixelado, porque Blue Marble tiene ~10 km por píxel. Propuesta evaluada, pendiente de decisión del usuario: hornear offline parches NASA GIBS, HLS S30 a 30 m por sector y MODIS a 250 m regional.
- **Próximos pasos:** 1) ~~aceptar ADR-007~~ aceptado por el equipo; 2) decidir la mejora de textura con GIBS; 3) revisar en el equipo de presentación real.

## Rendimiento y precarga — rama `redesign/planeta-3d` (2026-11-14 14:55, Claude)

- **Qué cambió:**
  - El globo se dibuja a demanda: 0 dibujos WebGL en reposo, contra ~360 cada 3 s antes.
  - El agua de la navbar baja a ~15 fps cuando no hay interacción.
  - Texturas 2K/1K: de 1,84 MB a 0,38 MB.
  - Globo, texturas y mapa 2D se piden al cargar la página; el 2D se monta oculto cuando el navegador queda ocioso, así que el paso desde el globo es instantáneo.
  - Caché inmutable en Vercel para `/assets/*` (`vercel.json`).
- **Mediciones** (Chromium con GPU Metal, red simulada de 8 Mbps): globo con rótulos de 3,2 s a 1,7 s; imagen 2D inmediata al cruzar el umbral (antes 273 ms y solo la capa regional).
- **Empaquetador:** `scripts/package_release.py` admite los chunks diferidos y assets alcanzables según `.vite/manifest.json`, que no entra al ZIP, y `basemaps/` con nombres fijos. Lo que el manifiesto no alcanza se sigue rechazando.
- **Pruebas:**
  - Python: 128 pasan y 1 se omite, incluidas las de lktron (contexto visual y empaquetador, más 7 nuevas).
  - Web: 52 pasan; build y `git diff --check` limpios.
  - `package_release.py` produce un ZIP de 24 archivos con checksum OK.
  - El ZIP descomprimido bajo `/AnalogOS/`, sin red externa, funciona sin fallas: globo, 2D, panel de lktron y cambio de candidato.

## Rediseño de layout — rama `redesign/planeta-3d` (2026-11-14 15:30, Claude, pedido directo del equipo)

- **Qué funciona:** el globo es el fondo del sitio. Al acercarse pasa solo a un mapa 2D con imágenes oficiales y vuelve al alejarse; no hay selector 3D/2D. La leyenda indica la fuente visible. Ya no hay columna de candidatos: un selector 1·2·3 en la ficha, que flota en liquid glass. La Sentinel-2 de ADR-005 se dibuja sobre cada polígono en el 2D. Sin WebGL se usa el SVG.
- **Cómo ejecutarlo:** `npm run dev`. Regenerar mapas base: `python -m pipelines.fetch_basemaps` (sin credenciales; requiere certifi, numpy y pillow).
- **Pruebas:** 52 web y 3 nuevas de Python (`tests/test_basemaps.py`) en verde, `npm run build` y `git diff --check` limpios. Recorrido en Chromium headless a 1440×900 y 390×844: globo → «Acercar» → 2D con Sentinel-2 → cambio de candidato → «Vista global» → «Ver el sector en el mapa 2D» → rueda hacia afuera vuelve al globo. Sin desborde en móvil. En consola, solo el 404 de favicon y 500 intermitentes de teselas HLS en línea de GIBS.
- **Decisión nueva:** ADR-006 (propuesto).
- **Bloqueos:** 1) `CLAUDE.md` en `dev` dice «mapa SVG, no MapLibre ni WebGL»; resuelto: el equipo aceptó ADR-006 y ADR-007 y la rama se fusionó en `dev`. 2) `scripts/package_release.py` rechaza el build: falta admitir los chunks diferidos, las texturas, el worker de MapLibre y `basemaps/`.
- **Próximos pasos:** 1) ~~revisar ADR-006/007~~ aceptados; 2) extender la lista del empaquetador; 3) probar en el equipo de presentación real con y sin conexión.

## Resultado disponible

La app consume `artifacts/science-v3/` (ver la sección anterior). La tabla siguiente es el snapshot v2, que se conserva como histórico.

| Rank | Sector | Similitud | Confianza | Estabilidad | Factibilidad |
|---:|---|---:|---:|---:|---|
| 1 | Pampa Yungay | 75,67 | 77,45 | 99,03 | requiere revisión |
| 2 | Cordón de Domeyko | 71,60 | 77,41 | 98,89 | requiere revisión |
| 3 | Pampa María Elena | 49,99 | 77,44 | 98,41 | requiere revisión |

Interpretación obligatoria: es un screening de escritorio para ordenar investigación. No aprueba sitios ni autoriza acceso.

## Base funcional heredada de v2

Los conteos y nombres de los tres sectores en esta sección describen el histórico v2; el resultado activo v3 y su entrega están arriba. El comportamiento de ranking, mapa, ficha, comparador y exportación se amplió a los siete sitios y ambos países.

- Pipeline autenticado con Earthdata Login y OAuth Copernicus; ningún secreto se persiste en artefactos.
- NASADEM_HGT.001 mosaico multitesela; Yungay usa correctamente cuatro tiles antes de agregarse a ~473 m.
- Sentinel-2 L2A: 12 intervalos mensuales de 2025, ~30 m nominal, SCL, NDVI y BSI.
- Inventario HLS S30 v2.0: 338 granules en Yungay, 168 en Domeyko y 171 en María Elena.
- Comparación topográfica con escala igualada: NASADEM agregado ~473–476 m frente a MOLA ~451 m nominal.
- Media geométrica ponderada, confianza separada, mínimo 0,70 de peso válido y sensibilidad ±20 %.
- Restricciones trazables con autoridad, fuente, acción y razón; las no evaluadas fuerzan revisión.
- Manifiesto con URLs, versiones, periodo, resolución, CRS, unidades, licencia, NoData, transformaciones y SHA-256.
- App estática: ranking, mapa SVG offline, ficha, desglose, fuentes, advertencias, comparador, exportación JSON y metodología.
- Screening de agua permanente con NASADEM SWB; María Elena conserva advertencia por ~0,15 %.
- Snapshot fixture permanece en `artifacts/demo/` solo para probar estados límite y contratos.
- Paquete de entrega v2 en `submission/`, dos capturas verificadas en `submission/assets/` y checksum SHA-256 actualizado.
- Cerrado el saneamiento post-Claude: no quedan componentes ni hojas de estilo huérfanas de la implementación descartada.

## Cambios recientes

- Aceptado por Codex (13:54): contexto visual Sentinel-2 offline por candidato, tres PNG reales de diciembre de 2025 y procedencia completa. Verificados imágenes, selección, datos inválidos, archivo ausente y ZIP en subcarpeta. No cambia ciencia, score ni factibilidad. Detalle en `docs/VISUAL_REVIEW.md` y ADR-005 (`accepted`).

- Perfil v2 en `2.0.1-preliminary`: limitaciones nuevas sobre calidad asignada por fuente, significado de `validated` y razón de medianas. Los scores no cambian.
- Web: orden único con `rankCandidates`, área con dos cifras significativas y decimales con coma.
- `submission/analogos-chile-static.zip` y `SHA256SUMS.txt` regenerados; las capturas de `submission/assets/` ya reflejan los rótulos nuevos.
- `origin/main` apunta a `https://github.com/Esteban12-hori/AnalogOS`; el remoto local obsoleto fue retirado.
- La verificación reproducible pasa también sin `data/raw/`: 30 tests verdes y una integración NASADEM explícitamente omitida.
- Aceptado por Codex (12:44): `npm run release:package` genera el ZIP con lista explícita de archivos, bytes deterministas y SHA-256; el build carga en `/` o en `/AnalogOS/`. ADR-004 aceptado. Corregido un fallo de restauración detectado durante la revisión; pruebas independientes verdes.
- Ajuste visual final de Claude aceptado: el mapa SVG se alinea arriba en 16:9; captura principal, ZIP y checksum fueron regenerados.
- Integrados por avance directo los cambios remotos `6516743` y `3c1a014`: configuración de Vercel e ignorado de `.vercel`. Conservados junto con la entrega revisada.

## Fuentes reales del snapshot

- NASA PDS MOLA MEGDR `MEGT44N000HB`, entorno regional de Jezero.
- NASADEM HGT/SWB 1 arc-second: seis archives Earthdata; mosaico por AOI.
- Copernicus Sentinel-2 L2A Statistical API, enero–diciembre de 2025.
- NASA HLS S30 v2.0, inventario CMR 2025 sin mezclar píxeles en el score.
- NASA POWER Climatology Point API 2001–2025.
- Natural Earth 1:50m solo como contorno visual.

## Limitaciones abiertas

- No existe barrido nacional exhaustivo: v3 evalúa 50 ventanas en dos regiones de prueba; v2 evaluaba tres sectores semilla de 0,2°.
- Geología sigue fuera del score por falta de revisión experta.
- No se intersectaron capas oficiales de urbano, áreas sensibles, propiedad o acceso; agua sí está screenada.
- La resolución ~460–480 m no evalúa obstáculos o tracción a escala de rueda.
- Falta inspección Worldview/imagen reciente y revisión experta, si el tiempo lo permite. El contexto Sentinel-2 de diciembre de 2025 es un avance parcial: muestra trazas rectilíneas y estructuras geométricas en Yungay y María Elena que son hipótesis a contrastar con capas oficiales, no hechos comprobados.
- La estabilidad mide cambio de score por un peso a la vez; no es incertidumbre científica total.

## Verificación histórica de v2

La revisión actual de M7 está en `docs/CODEX_M7_REVIEW.md`. Los resultados siguientes corresponden a los hitos previos y sus ZIP históricos.

| Comando | Resultado |
|---|---|
| `.venv/bin/python -m pytest -q` | 119 tests verdes (31 de ciencia y contratos, 39 del empaquetador, 49 del contexto visual); en un clon sin `data/raw/` se omite 1 integración NASADEM |
| `python -m pipelines.fetch_visual_context` | reutiliza el paquete visual local sin red ni credenciales |
| `npm run release:package` | build + validación + ZIP determinista; `shasum -a 256 -c SHA256SUMS.txt` OK; mismo SHA-256 en tres ejecuciones |
| HTTP local en `/AnalogOS/` y `/` | Claude comprobó respuestas HTTP; Codex verificó el ZIP extraído en navegador, ranking, mapa, selección, advertencia de agua y consola sin errores |
| `npm run test` | 24 tests verdes (10 del contexto visual) |

| `.venv/bin/python -m pytest -q` | 31 tests verdes; en un clon sin `data/raw/`, 30 verdes y 1 omitido |
| `npm run test` | 24 tests verdes (incluye `surfaceSeries` y `globe`) |
| `npm run build` | contratos + TypeScript + Vite verdes |
| revisión manual | snapshot v2, ranking, mapa, evidencia, layout y consola sin errores verificados |
| `npm audit` | 0 vulnerabilidades |

El build estático queda en `apps/web/dist/` (~4,1 MB), incluye `science-v2/` y `visual-context/`, sin llamadas externas obligatorias.

Codex repitió la suite y el empaquetado durante la aceptación de M4-VISUAL-EVIDENCE. Verificó las 12 entradas del ZIP contra dist, su determinismo y los seis hashes de snapshot/perfil contra la línea base; sin cambios científicos. El ZIP pesa 4.084.880 bytes y su SHA-256 es `97dc819efb7e0511e2b4a6e388eab5cf113db442006b3b01b415ae0db9f25f81`. También probó en navegador un PNG ausente y un índice con escenas inválidas: ambos conservan ranking y ficha.

El build estático queda en `apps/web/dist/` (~3,2 MiB; ZIP ~2,2 MiB, casi todo texturas del globo y three.js en chunk diferido), incluye solo `science-v2/` y no hace llamadas externas.

## Comandos de reproducción

```bash
# Demo con artefactos incluidos
npm install
npm run dev

# Entorno y ciencia histórica v2 (también aporta la referencia Yungay)
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
python -m pipelines.fetch_precision_data
python -m pipelines.build_precision_snapshot

# Piloto activo v3; descargas acotadas y reutilización de caché
python -m pipelines.fetch_discovery_data --stage tiles
python -m pipelines.discover_candidates
python -m pipelines.fetch_discovery_data --stage sources
python -m pipelines.build_context_outline
python -m pipelines.build_discovery_snapshot
python -m pipelines.fetch_visual_context --snapshot v3

# Auditoría completa
npm run verify
```

## Archivos grandes/no versionables

M7 añade siete teselas NASADEM (~102 MB), estadísticas e inventario de seis ventanas y el registro de adquisición en `data/raw/`; ver rutas exactas en `docs/DISCOVERY_REPORT.md`. La lista siguiente describe los insumos históricos reutilizados.

- `data/raw/mola/megt44n000hb.img`: ~124 MiB.
- `data/raw/nasadem/*.zip`: seis archivos, ~61 MiB combinados.
- `data/raw/earthdata/cmr_inventory_v2.json`: inventario HLS/NASADEM, regenerable.
- `data/raw/copernicus/sentinel2_stats_2025.json`: estadísticas mensuales, regenerable.
- `data/raw/srtm/`: permanece solo para reproducir v1.

## Decisiones registradas

- `docs/decisions/ADR-001-offline-svg-map.md`
- `docs/decisions/ADR-002-science-screening-v1.md`
- `docs/decisions/ADR-003-authenticated-precision-snapshot-v2.md`
- `docs/decisions/ADR-004-portable-static-release.md`
- `docs/decisions/ADR-005-offline-visual-context.md`
- `docs/decisions/ADR-006-global-discovery-pilot.md`

## Acciones humanas antes de enviar

1. Grabar el video usando `submission/VIDEO_SHOT_LIST.md`.
2. Publicar, cuando se autorice, `apps/web/dist/` o `submission/analogos-static.zip` (v3).
3. Probar demo/repositorio/video en incógnito y completar sus URLs.
4. Añadir integrantes y contribuciones del equipo.
5. Guardar el comprobante de envío.

## Aviso de Git

La carpeta tiene repositorio Git propio desde 2026-11-14 (ramas `main` y `dev`; el trabajo continúa en `dev`, creada desde `main` en `92053ea`), con único remoto `origin` en https://github.com/Esteban12-hori/AnalogOS (privado: para la entrega debe hacerse público o dar acceso a los jueces). `.env`, `data/raw/`, `node_modules/`, `dist/`, `.venv/`, `*.egg-info/` y `.claude/` quedan fuera por `.gitignore`. En un clon nuevo, la prueba que reprocesa NASADEM crudo se omite hasta ejecutar `python -m pipelines.fetch_precision_data`; el resto pasa sin `data/raw/` (comprobado en un clon limpio).
