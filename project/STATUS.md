# Estado actual

**Última actualización:** 2026-11-14 20:30 America/Santiago (rediseño Explorar / Misión, integración de los incrementos 3–10)
**Responsable del checkpoint:** Codex
**Milestone activo:** M6 — empaquetado y entrega
**Estado general:** producto funcional y presentable con snapshot científico v2 autenticado. NASADEM corrige el mosaico de borde y Sentinel-2 completa superficie no vegetada. Faltan acciones humanas/externas: video, URLs públicas, integrantes, capas territoriales y revisión experta.


## Rediseño Explorar / Misión — integración de los incrementos 3–10 (2026-11-14, Claude, rama `feature/mision-redesign`)

Los 8 constructores trabajaron en paralelo según `docs/BUILD_CONTRACTS.md`. El integrador fusionó sus ramas con `--no-ff`, en este orden: engine, places, globe, metrics, leaders, boot, composer y analysis. No hubo conflictos de texto: cada rama tocó solo su carpeta. Después de cada fusión se corrió `npm run test`.

### Qué funciona

- **Explorar.**
  - Arranque «Órbita honesta» con hitos reales que se pliegan en el chip «Snapshot v2 · 3 evaluados · 8 por calcular».
  - Globo con marcadores ● ◆ ○, agrupación «Chile · 3 ●», vuelo y teclado.
  - Carrusel con 3 sectores evaluados y 7 ◆ con fuente citada, sin % ni ranking.
  - Píldora «✦ Lectura de la comparativa».
- **Lugar seleccionado.**
  - Riel de métricas ordenado por peso. El limitante sale de `contribution`, ■ Jezero aparece solo en la topografía y el riel marca «satura» y el valor regional compartido.
  - Líneas Tesla con 4 etiquetas, sin cruces y fuera de los paneles.
  - En móvil, S1 con pestañas y una sola línea hacia la hoja.
- **Misión DEMO, sin red.**
  - El composer interpreta con el matcher «DEMO · sin IA».
  - `profileFromLevels` arma el perfil y `scoreMission` (motor 1.0.0, paridad ≤1e-6 con `pipelines/scoring.py`) da el orden. Resultado: Yungay 72,6 · Domeyko 68,4 · María Elena 44,6.
  - Un solo anuncio, el #1 en vista previa, «Tu misión» con niveles, Deshacer, historial y presets.
  - La Lectura se arma desde los hechos del motor. El análisis pregenerado solo se muestra si coincide su huella FNV (perfil base); con un perfil de misión, la Lectura queda en «Solo hechos del motor · sin IA».
- **Paso a 2D y vuelta**, en el globo y en el mapa.

### Integración: cambios del integrador

- **Slots y obstáculos** (`shell/AppShell.tsx`, `features/globe/MapStage.tsx`):
  - `onListViewChange` cableado: «Ver lista» en la bandeja abre S1 con `sheet.list`, y cerrarla vuelve a S0.
  - `data-obstacle` en la píldora `pill.reading`, la franja del HUD (`.stage-dock`) y los controles + − ⌂ (`.stage-controls`).
  - Los obstáculos se vuelven a medir después de que el escenario aplica los márgenes asentados. Antes se medían un render antes y la franja del HUD quedaba en su posición vieja.
  - Resultado: en Misión a 1440 las etiquetas ya no tapan + − ⌂.
- **Globo ↔ líneas** (`shell/shell.css`): si la columna de líneas va a la derecha, se oculta el rótulo del pin seleccionado, que el globo dibuja a la derecha. El nombre y el % siguen en el riel.
- **Composer:**
  - `matchMissionDemo` recibe `{ id, version }` del perfil cargado, como pide engine.
  - La franja «Refinar» tiene fondo sólido; antes se mezclaba con las tarjetas del carrusel.
- **Tests:**
  - El test del stub del motor en `featureContracts.test.ts` ahora fija la regla honesta sin condición: perfil vacío y perfil base inutilizable → «por calcular».
  - Se retiró el caso «solo stub» del composer.
  - `analysis/integration.test.ts` ya no se salta: falla si metrics o engine vuelven a ser stubs.
  - La aserción del composer usa el `OrbitLoader` real (`boot-inline`).
- **Bundler** (`vite.config.ts`): `codeSplitting.groups = [{ tags: ['$initial'] }]`. Todo lo que la entrada importa de forma estática va en un único chunk inicial. Sin esto, Rolldown partía la ruta crítica en ~18 `modulepreload`, incluido código diferido de analysis. Ahorro: −5,7 KB gz de JS y −0,5 KB gz de CSS. Los chunks diferidos no cambian.
- **Empaquetador** (`scripts/package_release.py`): admite `analysis/ai-analysis.default.json` como opcional y con nombre fijo, más un test.
- **Limpieza:** se quitaron de `liquid/` las reglas muertas `.globe-label` y `.globe-callout`.

### Cómo ejecutarlo

- `npm run dev`, o `npm run build && node /tmp/claude-srv/serve.mjs apps/web/dist 4395`.
- Para probar Misión: pestaña Misión, escribir p. ej. «probar navegación autónoma de un rover en terreno rocoso» y pulsar Enter.
- lktron es opcional: `VITE_LKTRON_URL`, ver `features/analysis/README.md`.

### Pruebas

- `npm run test`: 56 archivos y 817 tests en verde, sin omitidos.
- `npm run build`: verde (validate 9/9, validadores `--check`, tsc estricto, vite y prune).
- `/tmp/claude-venv314/bin/python -m pytest -q`: PYTEST_RESULT.
- `scripts/package_release.py` contra el build integrado, con destino en `/tmp`: el ZIP incluye `analysis/ai-analysis.default.json`. `submission/` no se tocó.
- Navegador (build servido en :4395, Chrome for Testing con GPU Metal; script `/tmp/claude-pw/integ-4395.mjs`): 34/34 comprobaciones OK.
  - **1440×900:** Explorar (globo, 10 marcadores, carrusel 3 ● + 7 ◆, chip, píldora); selección (riel con 7 criterios, líneas en modo `lines`); Misión DEMO (orden del motor, un anuncio, «Tu misión», Lectura con hechos y rótulos, % del motor en el riel, etiquetas sin tapar + − ⌂); 2D con «Acercar» y vuelta con «Vista global»; 0 errores de consola.
  - **390×844 táctil:** S0 con carrusel; «Ver lista» → S1; tocar una tarjeta → S1 con métricas y una línea; Misión DEMO con anuncio; S2 «Lectura IA» con hechos; 2D y vuelta; sin scroll horizontal; 0 errores de consola.
  - Avisos previos, sin cambio: `THREE.Clock` obsoleto y preload de texturas con distinto modo de credenciales.
- Peso de la carga inicial, contado desde el manifiesto (`/tmp/initial-size.cjs`, gzip -9):
  - JS: 116,6 KB gz, contra 98,8 en `857b05f` y 101,4 en `ffd9ce0` (+17,8 KB respecto de `857b05f`).
  - CSS: 14,6 KB gz, contra 10,8 en `857b05f` (+3,8 KB).
  - Antes del ajuste del bundler eran 122,3 KB de JS y 15,1 KB de CSS.
- Lighthouse, mediana de corridas intercaladas contra el build de `857b05f`: LIGHTHOUSE_RESULT.

### Decisiones nuevas

- Un único chunk inicial (`$initial`) en lugar del reparto automático de Rolldown. Es reversible: es una línea de `vite.config.ts`.
- Si las líneas Tesla van a la derecha del anillo, manda la columna sobre el rótulo del pin seleccionado.
- ADR-008, ADR-009 y ADR-010 siguen en estado **propuesto**.

### Bloqueos y pendientes reales

- **Presupuesto §6.1 excedido.** Cada constructor gastó una parte y la suma supera el límite:
  - JS inicial: +17,8 KB gz contra +≤12. Sobran ~5,8 KB.
  - Peso por feature en el chunk inicial:
    - places: PlaceRail + modelo, ≈ 6–8 KB;
    - composer: formulario, ≈ 5 KB;
    - metrics: MetricRail + `buildMetricViews`, ≈ 6 KB;
    - boot: ≈ 4 KB;
    - analysis: controlador + píldora, ≈ 3 KB;
    - leaders: `layoutLeaders`, ≈ 3 KB.
  - Candidatos para diferir: el controlador de analysis (cargarlo al entrar en fase `analysis`), `layoutLeaders`/`pickPrincipalMetrics` (solo los usa el chunk diferido) y `buildMetricViews` junto con el riel.
  - Diferidos, contra su presupuesto:

    | Chunk | Peso (gz) | Presupuesto |
    |---|---|---|
    | Marcadores (MarkerLayer) | 5,6 KB | ≤4 |
    | Líneas (LeaderCanvas) | 5,1 KB | ≤4 |
    | Misión (missionRun 5,0 + MissionPanel 3,3 + motor 6,1, sin los validadores) | ≈ 14 KB | ≤8 |
    | Lectura (deferred 13,8 + lktronClient 3,2) | 17 KB | ≤10 con validadores |

  - Validadores de misión: ≈ 9,4 KB, compartidos entre misión y lectura.
  - El riel (MetricDetails, 7,2 KB) sí cumple.
- **Pestaña Señal:** `SignalCard` todavía interpola cifras (odómetro), y §2.2 lo prohíbe. Sigue pendiente del integrador: es un componente de 1.200 líneas anterior al rediseño.
- **Sin cablear, opcionales:**
  - «¿Por qué este orden?» del composer: falta un hook `onOpenReading` para abrir la Lectura bajo 1440.
  - `ReadingSnippet` de analysis en las tarjetas del riel de métricas (§3.6, «✦ Lectura para tu misión»).
  - `MapStage.onSelectReference`: sin ese prop, el globo escribe `ui.selection` con `kind: 'reference'`, que es lo esperado.
- **Contenido pendiente de revisión:**
  - El análisis pregenerado está atado a la huella del paquete base `fnv1a64:a6e090bf523550de`. Si cambian metrics, engine o el snapshot, `integration.test.ts` falla y hay que regenerar el texto. El generador está fuera del repo: `/tmp/analysis-exp/make_pregenerated.py`.
  - El vocabulario DEMO y las descripciones de los presets son decisiones de producto por revisar.
  - ADR-009 necesita la aceptación del equipo científico.
- **Sin probar en navegador:** lktron real (solo con el mock NDJSON de analysis) y VoiceOver/TalkBack (incremento 11).

### Próximos 3 pasos

1. Bajar el JS inicial a +≤12 KB gz: diferir el controlador de analysis, `layoutLeaders` y `buildMetricViews`, y medir con `/tmp/initial-size.cjs`.
2. Incremento 11 (QA): VoiceOver y TalkBack, reduced transparency, CPU ×4 en el arrastre de la hoja, ZIP sin conexión, y `docs/` y `DEMO_ACCEPTANCE`.
3. Aceptación humana de ADR-008, ADR-009 y ADR-010, y retirar la interpolación de `SignalCard`.

## Rediseño Explorar / Misión — incrementos 0–2 (2026-11-14, Claude, rama `feature/mision-redesign`)

Especificación: `docs/UX_REDESIGN.md`. El trabajo en paralelo se reparte según `docs/BUILD_CONTRACTS.md`.

### Qué funciona

**Escenario fijo (sin scroll del documento):**
- Globo con paso a 2D y datos reales del snapshot v2.
- Pestañas Explorar | Misión.
- Dock con lugares y composer.
- Riel derecho al seleccionar, con «Ver ficha completa»: Métricas · Lectura IA · Señal · Comparar · Método · Fuentes.
- Panel izquierdo en Misión ≥1440.
- Hoja S0/S1/S2 en <1100: manija con teclado, arrastre, Atrás/Esc y `inert` en S2.
- La tecla «/» abre el composer.
- El globo se centra en el área libre (`insets`).

**Contratos:** cuatro esquemas nuevos con validadores precompilados (`validators.mission.generated.js` va diferido). Tipos en `domain/aiContracts.ts`.

**Stubs honestos de las 8 features**, montados en sus slots:
- places: lista simple;
- metrics: ficha existente;
- composer: píldora y textarea sin envío;
- analysis y boot: rótulos «por calcular»;
- engine: sectores «por calcular»;
- leaders: no dibuja.

### Cómo ejecutarlo

- `npm run dev`, o `npm run build && node /tmp/claude-srv/serve.mjs apps/web/dist 4390`.
- Tests: `npm run test` y `/tmp/claude-venv314/bin/python -m pytest -q`.

### Pruebas

- 141 web (16 archivos), 165 Python con 1 omitido, y build con `--check` de validadores en verde.
- Navegador (Chromium con GPU) a 1440×900, 1280×800 y 390×844:
  - 0 errores de consola;
  - selección → riel o S1; ficha completa y pestañas; Esc;
  - «/» → `?modo=mision` con foco en el textarea;
  - rueda → mapa 2D, también con el panel izquierdo abierto;
  - S2 con escenario `inert` y Atrás → S1; arrastre de la manija → S0;
  - un dedo sobre el globo no desplaza el documento.
- Avisos previos, sin cambio: `THREE.Clock` obsoleto y preload de texturas con distinto modo de credenciales.

### Decisiones nuevas

ADR-008, ADR-009 y ADR-010, en estado **propuesto**.

### Pendiente

- `SignalCard` (pestaña Señal) aún interpola cifras: §2.2 lo prohíbe; lo corrige el integrador.
- Las etiquetas del globo siguen en naranja al seleccionar (incremento 4).

### Próximos 3 pasos

1. Lanzar los 8 constructores en worktrees según `docs/BUILD_CONTRACTS.md` (engine primero en el orden de fusión).
2. Aceptación humana de ADR-008/009/010.
3. Integrar rama por rama: tests, build, navegador y Lighthouse contra `857b05f`.

## Fusión en `dev` (2026-11-14, Claude, decisión directa del equipo)

- El rediseño completo (liquid glass, globo de fondo con paso a 2D, ficha flotante, desglose del score, series Sentinel-2) está en `dev`. Commit de cierre y push a `origin/dev`.
- Verificación: `npm run verify` → 128 Python pasan y 1 se omite, 52 web y build en verde; `npm run release:package` → ZIP de 24 archivos, SHA-256 OK. Python 3.11+ requerido: el `python` del sistema (3.10) no sirve; usar un venv con `pip install -e .[dev] pillow`.
- Decisiones: ADR-006 y ADR-007 (globo, antes ADR-004) aceptados por el equipo humano sin revisión de Codex.
- Pendiente: actualizar en `CLAUDE.md` la línea «mapa SVG local; no MapLibre ni WebGL», que ya no refleja el producto.

## Modelo de trabajo activo

- Codex dirige producto, ciencia, arquitectura, prioridades, revisión y release.
- Claude implementa solo tareas asignadas en `project/NEXT_TASK.md` y entrega en estado `review`.
- La rama de implementación es `dev`; `main` queda reservada para entregas revisadas.
- Encargo `M6-RELEASE-REVIEW`: aceptado por Codex.
- Encargo `M6-PORTABLE-RELEASE`: implementado por Claude, corregido tras revisión y aceptado por Codex (12:44). Dan autorizó su commit y push a `dev` (12:48); Claude espera una nueva asignación.

- Encargo `M4-VISUAL-EVIDENCE`: implementado por Claude, corregido tras revisión y aceptado por Codex (13:54). Dan autorizó su commit y push a `dev` (14:15); Claude espera una nueva asignación.

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

## Optimización máxima — `dev` (2026-11-14 17:15, Claude, pedido directo del equipo)

- **Qué cambió:**
  - Validadores Ajv precompilados.
  - Armazón estático en `index.html` y armazón inmediato en React.
  - Precarga de datos desde el HTML.
  - Secciones bajo el pliegue diferidas.
  - Mapa 2D instanciado al empezar a acercarse.
  - Póster del globo en escritorio.
  - Textura 2K/4K adaptativa.
  - Detalle en `docs/PERFORMANCE.md`.
- **Mediciones** (mediana de 5, mismo servidor): escritorio 99 en `dev` y en `main`, con Speed Index de 0,7 s contra 0,8 s. Móvil: TBT de 148 ms contra 222 ms y LCP observado de 140 ms contra 482 ms. El LCP móvil simulado por Lighthouse empata (~5 s en ambas).
- **Pruebas:** web, Python, build, `package_release.py`, flujo completo en navegador y ZIP sin conexión (ver CHANGELOG).
- **Pendiente:** medir en producción después de desplegar; `.fixture-banner` en móvil salta ~5 px al llegar los datos (la regla de `styles.css` pisa la altura reservada).

## Nitidez y carga — `dev` (2026-11-14 15:45, Claude, pedido directo del equipo)

- **Problema reportado:** el globo Blue Marble se pixelaba al hacer zoom (la textura 2K de la iteración anterior era insuficiente) y la carga era lenta.
- **Qué cambió:**
  - Textura progresiva 1K → 4K WebP.
  - El paso al 2D ocurre al acercarse ~×1,4 desde la vista global (`flatThresholds`, según la pantalla), donde Blue Marble ~500 m ya es nítido.
  - La precarga del 2D espera a que el globo esté listo.
  - Sentinel-2 en el mapa como WebP derivado (229 KB contra 3,4 MB), ligado al SHA del PNG original.
  - Mundo local para el 2D sin conexión.
- **Mediciones** (`docs/PERFORMANCE.md`; 8 Mbps, gzip): globo de 2,9 s a 1,9 s; bytes de la sesión de 5,6 MB a 3,4 MB.
- **Rust:** evaluado y descartado con datos. La CPU es ~0,4 s, el render ya va en GPU, no hay backend y lo que domina son los bytes.
- **Pruebas:** 129 Python pasan y 1 se omite; 58 web; build, `package_release.py` (ZIP de 29 archivos) y ZIP sin conexión bajo `/AnalogOS/` sin fallas.
- **Próximos pasos:** 1) medir en producción (Vercel) con Brotli y caché; 2) decidir si conviene la proyección globo de MapLibre (ver PERFORMANCE.md); 3) aceptar ADR-006 y ADR-007.

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

La vista final consume `artifacts/science-v2/`, no fixtures.

| Rank | Sector | Similitud | Confianza | Estabilidad | Factibilidad |
|---:|---|---:|---:|---:|---|
| 1 | Pampa Yungay | 75,67 | 77,45 | 99,03 | requiere revisión |
| 2 | Cordón de Domeyko | 71,60 | 77,41 | 98,89 | requiere revisión |
| 3 | Pampa María Elena | 49,99 | 77,44 | 98,41 | requiere revisión |

Interpretación obligatoria: es un screening de escritorio para ordenar investigación. No aprueba sitios ni autoriza acceso.

## Qué funciona

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

- No existe barrido nacional exhaustivo; se evaluaron tres sectores semilla de 0,2°.
- Geología sigue fuera del score por falta de revisión experta.
- No se intersectaron capas oficiales de urbano, áreas sensibles, propiedad o acceso; agua sí está screenada.
- La resolución ~460–480 m no evalúa obstáculos o tracción a escala de rueda.
- Falta inspección Worldview/imagen reciente y revisión experta, si el tiempo lo permite. El contexto Sentinel-2 de diciembre de 2025 es un avance parcial: muestra trazas rectilíneas y estructuras geométricas en Yungay y María Elena que son hipótesis a contrastar con capas oficiales, no hechos comprobados.
- La estabilidad mide cambio de score por un peso a la vez; no es incertidumbre científica total.

## Verificación ejecutada

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

# Ciencia v2 desde fuentes autenticadas
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
python -m pipelines.fetch_precision_data
python -m pipelines.build_precision_snapshot

# Auditoría completa
npm run verify
```

## Archivos grandes/no versionables

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

## Acciones humanas antes de enviar

1. Grabar el video usando `submission/VIDEO_SHOT_LIST.md`.
2. Publicar `apps/web/dist/` o `submission/analogos-chile-static.zip`.
3. Probar demo/repositorio/video en incógnito y completar sus URLs.
4. Añadir integrantes y contribuciones del equipo.
5. Guardar el comprobante de envío.

## Aviso de Git

La carpeta tiene repositorio Git propio desde 2026-11-14 (ramas `main` y `dev`; el trabajo continúa en `dev`, creada desde `main` en `92053ea`), con único remoto `origin` en https://github.com/Esteban12-hori/AnalogOS (privado: para la entrega debe hacerse público o dar acceso a los jueces). `.env`, `data/raw/`, `node_modules/`, `dist/`, `.venv/`, `*.egg-info/` y `.claude/` quedan fuera por `.gitignore`. En un clon nuevo, la prueba que reprocesa NASADEM crudo se omite hasta ejecutar `python -m pipelines.fetch_precision_data`; el resto pasa sin `data/raw/` (comprobado en un clon limpio).
