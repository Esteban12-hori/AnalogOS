# M11 completado en producción — Codex, 2026-11-15

- **Milestone cerrado:** M11-READING-PRINT. Claude implementó; Codex revisó tres rondas, corrigió la agrupación de procedencia y aprobó con QA real de navegador/PDF.
- **Código publicado:** `e5e91390b2eea261b1f8d46f3b17786b2bb295dc` en dev y main, sin force. Dev Actions `43686593750` y producción `43686863876` correctos. Sitios: https://analogos-dev.vercel.app/ y https://analogos.vercel.app/.
- **IA real en producción:** cuatro requisitos propuestos sin confirmar; confirmación explícita; AR6 conservado y único sector evaluado; explicación y tres referencias geológicas SEGEMAR. Exportación descargada validada y reconstruida idéntica. Ver `docs/CODEX_M11_REVIEW.md`.
- **UI y PDF:** CTA móvil junto al resumen, 44 px; tres anchos de pantalla, sin selección, referencia MDRS, cero priorizados y geometría sin cobertura; Atrás/Escape y foco. PDF nativo completo de 18 páginas, tablas legibles y geología; al editar, se imprime aviso en vez del informe anterior.
- **Verificación:** 333 Python, 799 web, 3 opt-in omitidos, tipos/build correctos; 35 tests relacionados y build tras ajuste final. ZIP vigente CRC/checksum OK, SHA-256 `e2edb58317fc51e85ef5bc4adf9d46a09b7255531bd332341e96e0b9e6f81c30`.
- Ciencia, contratos, servidor, datos y dependencias preservados. `outputs/` ajeno no se incluye. Checkpoint final solo evidencia/documentación `[skip ci]`; no cambia el código desplegado. Sin nueva asignación a Claude.
- **Límites de QA que no se presentan como resueltos:** iOS físico y fallo de teselas GIBS por bloqueo de red. La prueba móvil se hizo con tamaños de Chrome; el respaldo local/SVG y el flujo manual se conservan.
- **Próximos tres pasos:** 1) preparar la demo con el caso AR6 y las evidencias; 2) recoger validación en un teléfono real y probar pérdida de red de GIBS; 3) acordar el siguiente milestone antes de delegar trabajo nuevo.

---

# M11 aceptado; publicación en curso — Codex, 2026-11-15

- **Milestone activo:** M11-READING-PRINT. Claude implementó; Codex revisó tres rondas y completó QA real móvil/escritorio/PDF. Código aceptado; todavía falta la publicación y reprueba remotas.
- **Funciona:** CTA visible con objetivo táctil 44 px; Lectura con/sin selección y referencias; navegación por teclado/Atrás; informe completo con geología; invalidación al editar. PDF de 18 páginas revisado, sin recortes.
- **Verificación:** 333 Python, 799 web, 3 opt-in omitidos, tipos/build correctos. Después del último ajuste de presentación: 35 tests relacionados y build correctos. ZIP CRC/checksum OK: `e2edb58317fc51e85ef5bc4adf9d46a09b7255531bd332341e96e0b9e6f81c30`.
- **Alcance:** ciencia, contratos, IA/servidor, datasets y dependencias intactos; `outputs/` ajeno no se incluye. iOS físico y fallo de GIBS por red siguen como límites de QA documentados.
- **Autorización:** Dan amplió la tarea a revisar el conjunto y publicar main/producción después de comprobar dev. Solo Codex publica; Claude queda sin nueva asignación.
- **Comandos/evidencia:** `docs/CODEX_M11_REVIEW.md`. No bloqueos.
- **Próximos pasos:** 1) publicar/verificar dev; 2) avanzar main y comprobar producción e IA real; 3) registrar commits, Actions y evidencia final.

---

# M11 en review — Claude, 2026-11-15

- **Ronda 3:** tabla impresa de criterios con layout fijo y seis columnas equilibradas (`pl-criteria-table`, solo `@media print`). Web 799 pasan y 3 omitidas; build correcto. El nuevo PDF lo verifica Codex.

- **Ronda 2:** «Ir a la Lectura» es ahora una acción única junto al resumen del resultado compacto (tras `pl-lead`, antes de chips y grupos), con objetivo táctil de 44 px. Web 799 pasan y 3 omitidas; build correcto. La visibilidad en 390×844 queda para la comprobación de Codex.

- **Entrega de Claude (sin commit):** «Ir a la Lectura» en el resultado compacto de «Tu misión» y corrección del informe imprimible, según el plan aprobado por Codex. Owner Codex, estado review.
- **Navegación:** `uiActions.requestReading()` y `ui.readingRequest`. La superficie la decide la función pura `shell/readingRoute.ts`:
  - ≥1440: panel izquierdo;
  - 1100–1439: píldora, también en Misión, con el rótulo «Lectura»;
  - <1100 con ●: S2 en la pestaña Lectura de la ficha;
  - <1100 sin selección o con ◆: S2 con la vista `sheet.reading`; Volver, Esc, Atrás y ✕ regresan a S0 o S1 sin borrar la selección.

  El foco va al título con un reintento acotado y cancelable. Navegar no cambia selección, planificador ni alcance, y no llama a la IA.
- **Impresión:**
  - reset de `html`/`body`/`#root`/`.app` en `@media print` (era la causa del PDF de una página);
  - paginación: secciones que se parten, encabezado de tabla repetido, URL impresas;
  - `PrintGeology` con la misma evidencia que la pantalla: aviso de capa aparte, cobertura, unidades, fuente y fecha, límites y excluidos;
  - aviso impreso sin informe vigente (carga inicial, prueba editada o informe en camino);
  - «Imprimir informe» deshabilitado con «Preparando informe…» hasta que el informe del `planner.result` vigente está montado (`printState.ts`); el clic imprime en el acto.
- **Validación:** `PATH="$PWD/.venv/bin:$PATH" npm run verify` correcto: 333 Python; web 798 pasan y 3 opt-in omitidas (62 archivos); typecheck del servidor y build correctos. Nuevo `apps/web/src/tests/readingPrint.test.tsx` con 14 pruebas. Se ajustó una aserción de `plannerGeology.test.tsx`: la URL impresa pasa a la línea de fuente.
- **Límites:** la comprobación es por SSR, lógica y CSS. No se generó un PDF nativo ni se usó navegador. Quedan pendientes, a cargo de Codex: 390×844, 1280×800, 1440×900, teclado y PDF real con geología. No hubo cambios en ciencia, `shared/`, servidor, contratos JSON, dependencias ni `outputs/`.

---

# M11 en preparación — Codex, 2026-11-15

- **Milestone activo:** M11-READING-PRINT. Claude asignado al acceso directo a Lectura y presentación del informe; primer checkpoint solo lectura, pendiente de aprobación técnica de Codex.
- **Base:** dev/main `ce86a87`, publicación anterior verificada. Funciona misión/IA/geología; pendientes navegación directa móvil y paginación nativa.
- **Validación:** aún no hay cambios de código ni nuevas pruebas; baseline anterior 333 Python, 784 web y 3 opt-in omitidas, types/build correctos.
- **Límites:** no ciencia/contratos/IA/datos/dependencias; `outputs/` ajeno preservado. Solo Codex publica dev tras aceptar; Dan amplió después el objetivo a revisión integral y promoción a main/producción una vez verificado dev.
- **Bloqueos:** ninguno identificado. Próximos pasos: 1) revisar plan de Claude; 2) implementar y revisar con pruebas de UI/PDF; 3) aceptar, empaquetar y publicar dev.
- Comandos previstos: `PATH="$PWD/.venv/bin:$PATH" npm run verify`; `PATH="$PWD/.venv/bin:$PATH" python scripts/package_release.py` después de aceptación.

---

# Estado actual



## Escala de color de la similitud (2026-11-15, Claude)

- Rojo/amarillo/azul/verde según el % de similitud, con leyenda «no es aptitud». En `dev` local junto con la corrección de la lista móvil; pendiente de push y de que Danilo lo promueva a `main`.

## Corrección móvil (2026-11-15, Claude)

- Lista vacía al deslizar hacia arriba la hoja de lugares: corregida en `dev` (CSS de `features/places`, con test). Pendiente que Danilo la promueva a `main`.

## Promoción a producción autorizada — 2026-11-15

- **Owner:** Codex. **Estado: completado y verificado en producción.** Dan pidió actualizar el README y pasar toda la entrega revisada de dev a main; precisó publicar primero y después sustituir el screenshot con una captura de la nueva producción.
- Base dev `513c44a`; main remoto `437b515`, ancestro de dev. Se usa `main` (no existe master). Promoción por avance directo, sin force.
- **Publicado:** `7e8c7798186e02a5014f6bf8b79554b7faa84c3c`, producción [Actions 43682694089 correcto](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43682694089), dev [Actions 43682693561 correcto](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43682693561). Main y dev sincronizados; checkpoint posterior de documentos/captura con `[skip ci]` conserva ese código desplegado.
- README actualizado con Explorar/Misión y enlace público. Captura tomada **después de publicar**, directamente de producción: `submission/assets/analogos-production.jpg`.
- Workflow entrega el secreto Anthropic existente solo en runtime de dev y main; sin clave, detiene el despliegue. Sin cambios de datos, motor o interfaz.
- Verificación previa: 333 Python, 784 web, 3 web opt-in omitidos; tipos/build correctos. Cuatro escenarios del paso de despliegue comprobados con una CLI simulada: dev/main con y sin clave; no imprime la clave y main usa `--prod`. Enlaces locales del README correctos.
- **IA real de producción comprobada:** borrador de cuatro requisitos, confirmación explícita y evaluación exclusiva de AR6; explicación/geología con tres referencias oficiales. `submission/evidence/production-geology-export.json` validado y reconstruido idéntico con los datos oficiales. Web pública HTTP 200; función GET 405 esperado.
- Revisión, procedencia y límites: `docs/PRODUCTION_RELEASE.md`. Continúan los pendientes menores ya documentados; no hay nueva tarea para Claude. El desarrollo continúa en dev. Los checkpoints de abajo describen entregas anteriores.

---

## Antecedente — integración verificada en dev antes de producción

**Última actualización:** 2026-11-15, aceptación de la integración Explorar/Misión (America/Santiago).
**Responsable:** Codex. **Rama:** `dev`. **Estado:** integración aceptada, corrección publicada y comprobada con IA real.

## Checkpoint vigente — cierre del handoff de Gus

- **Entrega final:** código `9c183fb8cc5d8adbc717f931efd64bf877ddb0b0`, [Actions 43681551867 correcto](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43681551867), incluida función empaquetada, deploy y alias `https://analogos-dev.vercel.app/`. Checkpoint posterior de documentación/evidencia con `[skip ci]` conserva ese código desplegado.
- **Reprueba tras publicar:** AR6 → «Evaluar este sector» → dock → Enviar conserva el sector. Anthropic real vuelve a proponer seis requisitos sin confirmar; confirmación y evaluación incluyen solo AR6. Explicación/geología reales, tres referencias válidas. `submission/evidence/integration-final-dev-geology-export.json` validado y reconstruido idéntico; captura `submission/assets/analogos-integration-final-dev.png`. Modelo `claude-sonnet-5-5`; procedencia completa en DEV_AI_VERIFICATION.

- Integración `dd625b4` ya fusionada y publicada; [Actions 43678787020 correcto](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43678787020). Los bloqueos de fusión/push descritos más abajo son históricos.
- **IA real comprobada en dev:** borrador de seis requisitos, confirmación explícita, evaluación AR6, explicación Anthropic y tres referencias geológicas de SEGEMAR. JSON descargado validado y reconstruido idéntico con los datos oficiales: `submission/evidence/integration-dev-geology-export.json`.
- **Hallazgo corregido:** enviar un brief desde el dock tras «Evaluar este sector» ya no cambia el alcance a las siete áreas. Prueba de regresión primero roja, luego verde y comprobación en el navegador del build local.
- **ADR-013 y ADR-014 aceptados por Codex. Yungay decidido:** fuera del ranking de Explorar; alternativa conocida evaluable/priorizable en Misión, siempre REF. Se conserva `shared/mission/evaluate.ts`, conforme a ADR-009 §5. Referencia de CLAUDE.md corregida a ADR-006/007/014.
- **Verificación:** 333 Python y 784 web pasan; 3 web opt-in omitidos; tipos servidor y build correctos. ZIP regenerado, 73 entradas / 14.792.109 bytes; SHA-256 `d977f0adf4f9e7e3d2ee4e9b780ee7f00d7124def36b24e1369a7270e8e12393` y CRC verificados.
- Núcleo científico, servidor, datos, dependencias y CI preservados. `outputs/` preexistente no incluido. Sin nueva asignación a Claude.
- **Pendientes acotados:** navegación directa a Lectura desde popover móvil (alternativa Ficha → Lectura comprobada), GIBS sin red, paginación/impresión nativa e iOS real. No hay validación de campo ni garantía de aptitud territorial.
- Revisión completa y evidencias: `docs/CODEX_INTEGRATION_REVIEW.md`. Continuidad: este bloque y `project/NEXT_TASK.md` prevalecen sobre los checkpoints históricos siguientes.

---

## Antecedentes históricos de la integración

## Revisión de la fusión M9/M10: hallazgos corregidos (Claude Code, `feature/mision-redesign`, 2026-11-15)

**Pedido:** corregir los hallazgos de la revisión de `c1065d1` (1 medio y 6 bajos; ninguno alto), verificar cada uno, repetir `verify`, el paquete y el recorrido en navegador. **Push a `dev`: no se hizo.** No se tocaron `dev` ni `main` locales.

### Qué cambió (y cómo se comprobó)

- **Medio · «Tu misión» compacta:** `GeologyGuidance` del equipo ya no se despliega entre el titular y la exportación. Va **después** de «Descargar JSON», «Imprimir informe» y «Volver a editar», dentro de un `<details class="pl-more pl-geo-fold">` cerrado por defecto. El resumen dice «Orientación geológica para esta prueba», el rótulo del equipo («Selección por IA» u «Orientación general sin IA») y «N sectores». Dentro, el componente del equipo sin cambios (mismos textos, límites, fuente, unidades y «Descargar JSON con orientación geológica»), más la línea que dice dónde pedir la selección con IA. En la variante compacta se quita el marco exterior de `.pl-geo` y su h3 queda solo para lectores de pantalla (el resumen ya lo muestra). La vista del equipo (sin `compact`) no cambia. Medido en Chrome (contenedor de «Tu misión», alto del scroll y posición de «Descargar JSON»): **1440** 344 px de franja, scroll 6.863 → **1.658**, botón 6.670 → **1.408** (antes de la fusión: 1.601 y 1.408); **1280** (popover) 5.586 → **1.454**, botón 5.424 → **1.235**; **390** (popover) 6.763 → **1.647**, botón 6.557 → **1.384**. El ancho útil de cada sector sube a 326/426/332 px. Con la IA simulada, el resumen dice «Selección por IA» sin abrir el pliegue.
- **Bajo · tira de pestañas de la ficha:** `TabList` marca `data-more-start` / `data-more-end` cuando quedan pestañas ocultas y el CSS difumina ese borde (28 px). Además lleva la pestaña activa fuera del difuminado moviendo solo la tira (sin `scrollIntoView`, que movería la hoja o el riel). Chrome en 1440, 1280 y 390: al abrir, borde final difuminado; con «Fuentes» activa, queda entera y se difumina el inicio; Inicio vuelve a «Métricas» y la tira al comienzo. Funciones puras `overflowEdges` y `revealDelta` con tests.
- **Bajo · cabecera de «Geología» en 390:** `.geology-context .subheading-row` hace `flex-wrap` y, en ≤480 px, el subtítulo baja entero bajo el título. Chrome: título y subtítulo en una línea cada uno (antes, dos líneas cada uno lado a lado).
- **Bajo · invariantes del STATUS:** el bloque de la fusión decía «sin diferencias con `origin/dev` en `package*.json`». Ahora dice «`package.json` raíz y `package-lock.json`» y aclara que `apps/web/package.json` difiere desde la integración anterior (`build` ejecuta `build-validators.mjs --check`; `vercel build` + `check-vercel-function.mjs` verificados). Se corrigió igual `docs/INTEGRATION_PLAN.md` §11, que además decía «pipelines» intactos: `pipelines/fetch_basemaps.py`, `artifacts/basemaps/` y `contracts/reference-analog.schema.json` difieren desde el rediseño (mapas base y referencias del escenario, no artefactos científicos).
- Documentación: `docs/INTEGRATION_PLAN.md` §11 (fila de «Tu misión») y `docs/DEMO_ACCEPTANCE.md` (paso de la orientación geológica) describen el pliegue.

### Hallazgos no corregidos

- **Bajo · `CLAUDE.md:34`** sigue citando «ADR-006/007/010» para el escenario fijo; tras la renumeración debe decir **«ADR-006/007/014»** (ADR-010 es ahora la geología del equipo). No se editó: este agente no cambia `CLAUDE.md` por encargo de un flujo automatizado. Queda para una persona (cambio de una línea).
- **Bajo · «Ir a la Lectura» desde «Tu misión» en móvil:** la pista sigue siendo texto. La Lectura vive en tres sitios según el ancho (panel izquierdo ≥1440, pestaña del riel 1100–1439, pestaña de S2 <1100) y la pestaña activa es estado local de cada lista; un botón que navegue exige un canal compartido en `uiActions` (selección + hoja S2 + pestaña). No es trivial.
- **Bajo · teselas GIBS sin conexión** (anterior a la fusión): el 2D sigue pidiéndolas y la consola registra los fallos de red; el mapa se ve con las imágenes locales. Quitar las fuentes tras el primer fallo toca el ciclo de vida del mapa y el informe de fuentes activas (atribución). Sin cambio.

### Pruebas realizadas

- `npm run verify`: **pytest 328 pasan, 5 omitidas**; `typecheck:server` correcto; **vitest 783 pasan, 3 omitidas** (IA real opt-in) en 61 archivos (+4: pliegue después de exportar y cerrado, resumen con «Selección por IA», vista del equipo sin cambios, bordes de la tira); build correcto. Chunk de entrada 123,97 KB gz (+0,32); CSS inicial 17,52 KB gz (+0,08).
- **Paquete:** `npm run release:package` → **73 entradas, 14.792.111 bytes, SHA-256 `cd09543ce3d882f07aeddd5d357b763203b105eb631c860e8cee9d591327fda2`**; `shasum -c` OK; un segundo empaquetado a `/tmp` da el mismo SHA; el contenido coincide con `apps/web/dist` (salvo `.vite`); `geology-context-v1/index.json` idéntico al artefacto; sin claves. SHA anterior: `30b2b119…`.
- **Navegador** (Chrome, puerto 4731, 1440×900, 1280×800 y 390×844; `/tmp/claude-pw/geo4731/walk.mjs`): sobre el build, todas correctas; sobre el ZIP bajo `/AnalogOS/`, **96/96**; sin red externa, **32/32** (único host bloqueado: `gibs.earthdata.nasa.gov`). Incluye ficha «Geología» y su exportación, Métricas y Fuentes, 2D y vuelta, Misión sin clave (0 llamadas en el recorrido manual; 1 con huella al pulsar), `/api/ai` simulado con el manejador real del servidor (resultado sin cambios, exportación con procedencia), canal geológico obsoleto y «Reintentar sin geología», y en móvil el popover, la Lectura y la pestaña «Tu misión» de S2. 0 errores de la app y sin desborde horizontal.

### Archivos cambiados

- `apps/web/src/components/planner/ResultView.tsx` (`CompactGeology`, `COMPACT_GEOLOGY_WHERE`), `features/composer/mission.css`, `features/composer/MissionGeologyView.test.tsx`, `shell/Tabs.tsx`, `shell/shell.css`, `shell/detail/geology.css`, `tests/shell.test.tsx`.
- `project/STATUS.md`, `project/CHANGELOG.md`, `docs/INTEGRATION_PLAN.md`, `docs/DEMO_ACCEPTANCE.md`, `submission/analogos-static.zip(.sha256)`.
- Sin cambios en `shared/`, `server/`, `api/`, `apps/web/src/mission/`, `GeologyGuidance`, `GeologyContext`, artefactos, CI ni dependencias.

### Bloqueos reales

- **`origin/dev` avanzó** de `d2252b6` a `e074762` (`e074762` «Presenta AnalogOS como producto y separa la guía técnica [skip ci]», solo documentación: `README.md`, `docs/DEVELOPMENT.md` nuevo, `project/{CHANGELOG,NEXT_TASK,STATUS}.md`, `project/tasks/README_PRODUCT.md`). El push de esta rama a `dev` ya **no es fast-forward**: hay que fusionarlo antes. `git merge-tree` anticipa conflictos solo en `README.md`, `project/CHANGELOG.md` y `project/STATUS.md`.
- ADR-013 y ADR-014 requieren aceptación humana; `CLAUDE.md:34` requiere el cambio de una línea descrito arriba.
- Sin clave real no se probó Anthropic con la interfaz integrada.

### Próximos tres pasos exactos

1. `git merge origin/dev` (`e074762`) en `feature/mision-redesign`: resolver `README.md` (conservar la presentación de producto del equipo y llevar a `docs/DEVELOPMENT.md` lo técnico de la interfaz integrada), `CHANGELOG.md` y `STATUS.md` (conservar las dos ramas); repetir `npm run verify` y `npm run release:package` (el ZIP no incluye el README; el SHA no debería cambiar).
2. `git push origin feature/mision-redesign:dev` (fast-forward, sin `--force`) y seguir `gh run watch` de `vercel-deploy.yml`.
3. En `analogos-dev.vercel.app` con sesión autorizada: «Destacar motivos con IA» real con la casilla geológica (sector AR6), abrir el pliegue de «Tu misión», descargar el JSON con orientación geológica y validarlo con `validateAnyMissionExport`.

**Handoff:** Codex puede retomar leyendo `prompts/RESUME_CODEX.md` y `project/STATUS.md` (este bloque y el de la fusión), con `docs/INTEGRATION_PLAN.md` §11 como contexto.

## Fusión de M9/M10 en la interfaz integrada (Claude Code, `feature/mision-redesign`, 2026-11-15)

**Pedido:** fusionar `origin/dev` (`92392f1` → `d2252b6`, 7 commits de M9/M10) sin squash ni `--force`, conservar íntegro lo del equipo y portar su UI a la interfaz integrada con los mismos textos y garantías. **Push a `dev`: no se hizo.** No se tocaron `dev` ni `main` locales.

### Qué funciona

- **Ficha · pestaña «Geología»** (riel 520 px y hoja S2, después de «Origen»): el panel `GeologyContext` del equipo tal cual: estado de cobertura, barra y cifras (cubierto, sin cobertura, solape, sin descripción), escala, autoridad, unidades originales, procedencia con hash de cada petición, preguntas de terreno y «Descargar contexto geológico (JSON)» (`<site_id>-geology-context.json`). Sin paquete: «no disponible», y el resto de la ficha no cambia.
- **Textos que dependen del contexto:** en «Métricas», el criterio geológico (sigue «por calcular», fuera del puntaje) dice «El contexto geológico oficial está disponible… Falta calibrar…». En «Fuentes», la limitación histórica remite a la pestaña «Geología». Los textos del snapshot no cambian.
- **Misión · orientación geológica:** tras evaluar, «Tu misión» muestra «Orientación geológica para esta prueba» (`GeologyGuidance` del equipo): general sin IA o «Selección por IA», con límites, fuente oficial enlazada, unidades y «Descargar JSON con orientación geológica» (envoltorio M10, con la exportación M8 1.0 dentro). El informe imprimible la incluye (`PrintGeology`).
- **Lectura · IA opcional:** junto a «✦ Destacar motivos con IA» está la casilla «Incluir orientación geológica de la prueba» (activa por defecto). El aviso de envío es uno solo y cambia con ella. Sin contexto: «Orientación geológica con IA no disponible: …». Si falla solo el canal geológico: «Reintentar sin geología». Los textos son los del `AiPanel` del equipo, y un test lo comprueba.
- **Garantías:** el controlador de misión porta `usePlanner` del equipo. La huella del contexto solo se envía con la casilla marcada. El catálogo cerrado sale de la evaluación vigente. El reductor del equipo descarta toda selección que no coincida con el contexto, el catálogo, la solicitud o la evaluación. La IA no cambia `state.result`: el recálculo da las mismas huellas, estados y puestos.
- **Sin IA o en el ZIP:** el recorrido manual es completo y no llama a `/api/ai`. Al pulsar el botón sin clave, la IA aparece como «no disponible», y la plantilla y la orientación general siguen.

### Cómo ejecutarlo

- `npm install`; `npm run dev`. IA local solo con `.env` (`docs/AI_SETUP.md`).
- Verificación: `PATH=/ruta/a/venv-py311+:$PATH npm run verify`. M9/M10 necesitan `shapely` y `pyproj`: `pip install -e ".[dev]" pillow`.
- Entrega: `npm run release:package` y después `(cd submission && shasum -a 256 -c analogos-static.zip.sha256)`.

### Pruebas realizadas

- `npm run verify`: **pytest 328 pasan, 5 omitidas**; `typecheck:server` correcto; **vitest 779 pasan, 3 omitidas** (IA real opt-in) en 61 archivos; build correcto.
- Tests nuevos: `shell/detail/GeologyTab.test.tsx` (porta los dos bloques de `geologyContext.test.tsx` que usaban `CandidateDetails`, con los mismos textos), `features/composer/MissionControllerGeology.test.ts` (opt-in, huella, catálogo, descarte, reintento, cambio de contexto, recálculo idéntico y exportaciones validadas con `validateAnyMissionExport`) y `features/composer/MissionGeologyView.test.tsx` («Tu misión» compacto e informe). Ampliados: `ReadingView.test.tsx` (casilla, aviso condicional, reintento y paridad de textos con el `AiPanel` del equipo) y `shell.test.tsx` (pestaña).
- Tests del equipo sin cambios: `aiGeology`, `geologyGuidance`, `plannerGeology`, `plannerState`, `plannerUi`, `aiLive`, `aiServer`, `missionEngine` y `test_geology_*`. En `geologyContext.test.tsx` solo se retiraron los dos bloques portados, con un comentario que indica dónde están.
- **Navegador** (Chrome, build de producción en el puerto 4701): 56 comprobaciones correctas en 1440×900 y 390×844, y otras 56 con el ZIP servido bajo `/AnalogOS/`. Se recorrieron la ficha «Geología» y su exportación (JSON validado), «Métricas» y «Fuentes», el paso a 2D y la vuelta, y Misión sin clave (recorrido manual con 0 llamadas; al pulsar, 1 llamada con huella y «no disponible»). También `/api/ai` simulado por intercepción, con el **manejador real del servidor** y el paquete real; solo el proveedor estaba simulado. Resultados: «Selección por IA» con respaldo y límites, el resultado sin cambios, exportación con procedencia, canal geológico obsoleto con 409 y «Reintentar sin geología» sin huella, y en móvil «Tu misión», la Lectura y la pestaña «Tu misión» de S2. Hubo 0 errores de la app y ningún desborde horizontal. Sin red externa (ZIP): 24 comprobaciones correctas, y el único host bloqueado fue `gibs.earthdata.nasa.gov` (teselas opcionales).
- **Peso:** chunk de entrada 123,65 KB gz (+0,75). CSS inicial 17,44 KB gz (sin cambio: los estilos geológicos se cargan con la pestaña). Diferidos: `GeologyTab` 2,8 KB gz + 1,0 KB gz de CSS; el validador geológico con Ajv (46,4 KB gz) se comparte con el chunk de misión y se pide en un momento ocioso tras el snapshot.
- **Paquete:** `npm run release:package` → **73 entradas, 14.789.257 bytes, SHA-256 `30b2b1191489898b91e85aaf26f93104da62bc733d854ae0352e517bf2517c9c`** (`shasum -c` OK). Dos empaquetados a `/tmp` dan el mismo SHA. Cada entrada coincide byte a byte con dist, `geology-context-v1/index.json` es idéntico al artefacto y no hay secretos. SHA anterior de la entrega: `c5904c66…` (integración sin M9/M10). El del equipo en dev: `f76a9055…`.
- **Invariantes:** sin diferencias con `origin/dev` en `shared/`, `server/`, `api/`, `vercel.json`, `.github/`, `check-vercel-function.mjs`, `package.json` raíz y `package-lock.json`, `tsconfig.server.json`, `apps/web/src/mission/`, los artefactos (`geology-context-v1`, `science-v2/v3`, `demo`, `visual-context-v3`), evidencias, ADR-010/011 del equipo, `GeologyContext`, `GeologyGuidance`, `usePlanner`, `loadGeologyContext` ni los tests del equipo citados. `apps/web/package.json` difiere desde la integración anterior: `build` ejecuta `build-validators.mjs --check`; `vercel build` + `check-vercel-function.mjs` verificados. También difieren, desde el rediseño, `pipelines/fetch_basemaps.py`, `artifacts/basemaps/` y `contracts/reference-analog.schema.json` (mapas base y referencias del escenario, no artefactos científicos).

### Archivos cambiados (resumen)

- Nuevos: `data/loadAppGeology.ts`, `domain/geologyCopy.ts`, `shell/detail/GeologyTab.tsx`, `shell/detail/geology.css` (estilos M9 movidos desde `styles.css`) y los tres tests nombrados.
- Adaptados: `App.tsx` (carga diferida), `shell/{appData,public,AppShell}.ts(x)`, `shell/detail/{FullDetail,SourcesTab}.tsx`, `features/metrics/MetricDetails.tsx`, `features/composer/{missionController,runLoader,composerStore,MissionPanel,PrintContent,index}.ts(x)`, `features/analysis/{ReadingView,explanationToReading,analysis.css}`, `state/mission.ts` (`geologyCatalog`), `components/planner/{ResultView,PlannerView,PlannerPanel}.tsx`, `scripts/package_release.py` y `tests/test_release_package.py` (las dos ramas).
- Retirados otra vez, con sus cambios portados: `components/CandidateDetails.tsx` y `breakdown/ScoreBreakdown.tsx`.
- Documentación: `docs/INTEGRATION_PLAN.md` §11, `docs/BUILD_CONTRACTS.md`, `docs/ARCHITECTURE.md`, `docs/DEMO_ACCEPTANCE.md`, `README.md` y ADR renumerados.

### Decisiones nuevas

- **ADR renumerados:** el equipo usa ADR-010 (contexto geológico, aceptado) y ADR-011 (orientación geológica). Los nuestros pasan a **ADR-014** (escenario fijo, propuesto) y **ADR-015** (recálculo en cliente, sustituido). ADR-012 y ADR-013 no cambian. Los bloques históricos de este archivo y del CHANGELOG conservan la numeración de su fecha.
- **Una sola acción de IA:** la casilla geológica va en la Lectura, junto a «Destacar motivos con IA», y la orientación se ve en «Tu misión». «Tu misión» compacto no repite el `AiPanel`, como en la integración anterior. Una línea indica dónde pedir la selección con IA.
- **Carga diferida del contexto geológico:** el validador del equipo usa Ajv en runtime, así que va en un chunk diferido que se pide en un momento ocioso. `AppData.geology` es opcional: ausente significa «cargando».
- En «Fuentes», el reemplazo de la limitación dice «en la pestaña «Geología»» en lugar de «arriba», porque el panel ya no está arriba de la lista.

### Bloqueos reales

- El push a `dev` (que despliega en `analogos-dev.vercel.app`) no se hizo en este paso.
- ADR-013 y ADR-014 requieren aceptación humana.
- Sin clave real no se probó Anthropic. El canal geológico se probó con el manejador real y el proveedor simulado.

### Próximos tres pasos exactos

1. `git fetch origin` y confirmar que `origin/dev` sigue en `d2252b6`. Si avanzó, fusionar y repetir `npm run verify` y `npm run release:package`.
2. `git push origin feature/mision-redesign:dev` (fast-forward, sin `--force`) y seguir `gh run watch` de `vercel-deploy.yml` (build, `check-vercel-function`, deploy y alias).
3. En `analogos-dev.vercel.app` con sesión autorizada: «Destacar motivos con IA» real con la casilla geológica (sector AR6 como en M10), descargar el JSON con orientación geológica y validarlo con `validateAnyMissionExport`.

**Handoff:** Codex puede retomar leyendo `prompts/RESUME_CODEX.md` y `project/STATUS.md` (este bloque), con `docs/INTEGRATION_PLAN.md` §11 como contexto de esta fusión.

## Revisión de la integración: hallazgos corregidos (Claude Code, `feature/mision-redesign`, 2026-11-15)

**Pedido:** «fusiona en dev y haz push». Tres revisiones de `e568d9d` (honestidad científica e IA; recorrido visual 1440/1280/390; no regresión del equipo) dejaron 25 hallazgos: 2 altos, 11 medios y 12 bajos. Se corrigieron los altos, los medios y 9 bajos. **Push a `dev`: no se hizo en este paso.**

### Qué cambió (y cómo se comprobó)

- **Alto · Lectura:** «Todos los requisitos se cumplen…» ya no depende de lo que eligió la IA. `explanationToReading` calcula `emptyNote` y `omitted` con la evaluación. Con selección vacía de la IA se lee «La IA no destacó motivos para 7 lugares; los bloqueos del cálculo están en «Resultado»» y los 7 lugares se listan (vitest y Chrome con `/api/ai` simulado).
- **Alto · «Tu misión» ≥1440:** sin resultado vigente (`data-focus="mission"`), el planificador ocupa el panel y la Lectura una franja de ~22 %. En la variante compacta, ejemplo y texto van arriba, las tarjetas de recorrido pierden la descripción y «Siguiente →» queda fijo al pie. Medido en 1440×900: hueco de 576 px (antes 344); «Cargar un ejemplo» en 271–305, texto en 396–485 y «Siguiente» en 534–568, todo a la vista sin scroll interno. Con resultado vuelve el reparto 45 % / resto.
- **Medio · orden:** los motivos siguen el orden de la evaluación aunque la IA invierta la selección. En Chrome se probó con la selección invertida: salen #1…#4 y después los no priorizados. Las verificaciones siguen en el orden de la IA, como dice su rótulo.
- **Medio · REF en Misión:** `shared/mission/evaluate.ts` (sin cambios) puede darle puesto a la REF. Ahora la REF siempre lleva «REF» en el riel, la hoja S1, el carrusel y el globo, y no cuenta en «N de M candidatos priorizados» ni en el título del carrusel («+ REF»). `referenceNeverRanked.test.ts` suma 6 casos de Misión (pendiente ≤ 10° prioriza a Yungay).
- **Medio · ✦:** se quitó de la píldora, del formulario de Misión (y de su pulso), de «Refinar», del esqueleto de la Lectura y de la carga de «Tu misión». Hay tests que lo comprueban, también sobre el HTML estático.
- **Medio · «Enviar»:** el foco va al texto cargado aunque el paso ya estuviera abierto, y la línea de estado dice «Texto cargado en «Tu misión»…». En Chrome, en dos envíos seguidos con el panel desplazado, el foco quedó en el textarea, que quedó a la vista. 0 llamadas a la IA.
- **Medio · espera de la IA:** la fase ya no aparece en la esquina superior izquierda, encima del logo. La órbita sigue alrededor del globo y el composer muestra la fase.
- **Medio · rótulos y 2D:** nombre y estado se acortan con «…», nunca el puesto ni el %. `CandidateFlatMap` escribe `--pin-x`. En 390 px el rótulo del 2D termina en x=382 (antes 507) y en 1440 no desborda (`scrollWidth == clientWidth`).
- **Medio · carrusel:** el título ya no encoge. En tarjetas angostas se usan formas cortas («#2 · Priorizado», «Conf. 77,5», «Factib.: pendiente») y la forma completa queda en el árbol accesible. «similitud v3» se ve entero y la cifra cabe en el anillo (medido en 1440, 1280 y 390, sin recortes).
- **Medio · Fuentes:** «Descargar ficha (JSON)» usa `buildExport`. En Chrome, la descarga trae `exported_from, notice, site, search_context`.
- **Medio · privacidad:** el `title` de «Borrar todo» en «Tu misión» ya no dice que nada se guarda, porque hay historial local, y explica cómo borrarlo. `PlannerPanel` del equipo conserva su texto.
- **Bajos corregidos:** «confirmados por usted» tras confirmar requisitos de la IA. La procedencia de la IA sigue visible con la Lectura atenuada y el rótulo lleva un solo ✦. Con objetivo no soportado, el anillo dice «no aplica». El chip «Métricas en el panel →» va bajo el anillo (en Chrome no se superpone con el rótulo). La precarga de texturas usa `crossorigin` (1 descarga por textura y 0 avisos; antes 2). Las sugerencias se ocultan con el popover abierto. «estado · reglas mission-rules-1.0.0» reemplaza a «reglas del equipo» (ahora prohibido en `copy.test.ts`). El ZIP de entrega está regenerado. El guion de demo y «Recorridos M8» están al día.

### Bajos sin corregir (con motivo)

- `aiLive.test.ts` no compara las huellas del servidor: es un test del equipo que necesita una clave real para correr. No se puede ejecutar aquí, así que no se modificó a ciegas. Queda para el equipo: comparar `evaluation_fingerprint` y `request_fingerprint` y pasar la respuesta por `explain_ok`.
- La línea móvil termina en la leyenda: devolver `null` cuando la recorta un panel la eliminaría siempre en 390 px, porque la leyenda está siempre entre el pin y la hoja. Es una decisión de diseño. Se probó y se revirtió.
- El 2D sin red sigue pidiendo teselas GIBS: solo genera ruido en consola, la vista funciona con las copias locales.

### Pruebas realizadas (este paso)

- `npm run verify`: **pytest 190 pasan, 4 omitidas**, `typecheck:server` correcto, **vitest 624 pasan, 2 omitidas** (IA real opt-in) en 53 archivos, y build correcto. Chunk de entrada: 122,9 KB gz (+0,7). CSS inicial: 17,4 KB gz.
- Tests nuevos o ampliados: `explanationToReading`, `ReadingView` (selección vacía, procedencia con la Lectura atenuada, esqueleto sin ✦), `Composer` (✦, popover, «Borrar todo», «confirmados por usted»), `MissionController` (foco al texto), `PlaceRail` (no soportado, rótulo de reglas, formas cortas), `SourcesTab.test.tsx` (nuevo), `referenceNeverRanked` (Misión), `layoutLeaders` (chip bajo el anillo) y `boot`.
- Chrome (playwright-core, puerto 4631, build de producción): recorrido completo de Explorar y Misión en 1440×900 con red real (Origen, Método con 50 ventanas, exportación de cabecera y de Fuentes, paso a 2D, Misión sin clave con 0 llamadas a la IA, JSON, edición atenuada y diagnóstico fuera de cobertura). Resultado: `ERRORS []`. Además: flujos de Misión offline en 1440 y 1280 (solo el 404 esperado de `/api/ai`), IA simulada (borrador y explicación), y en móvil 390×844 Explorar, Misión, hoja y 2D, sin `pageerror` ni desborde horizontal.
- Paquete: `npm run build` + `package_release.py` a `/tmp` dos veces, idénticos. Luego `npm run release:package` en `submission/`: **66 entradas, 14.508.759 bytes, SHA-256 `c5904c66c84ca6d8dfc480f4ad1841b09015a343f63e5bea19d822a54d0f99f8`** (`shasum -c` OK). Servido bajo `/AnalogOS/` sin red externa, en 1440 y 390: Explorar y Misión manual funcionan, y el JSON es válido contra `mission-export.schema.json`, con `ai.draft` y `ai.explanation` en `null`.
- Invariantes: sin diferencias con `origin/dev` en `shared/`, `server/`, `api/`, `apps/web/src/mission/`, `tsconfig.server.json`, `vercel.json`, `.github/`, `check-vercel-function.mjs`, `package.json`, `package-lock.json`, `artifacts/science-v2`, `artifacts/science-v3`, `artifacts/demo`, ni en los tests del equipo (`aiLive`, `aiServer`, `missionEngine`, `plannerState`, `plannerUi`, `test_discovery.py`). Sin secretos en el diff ni en dist.

### Decisiones nuevas

- La REF conserva el puesto que le da el motor del equipo, siempre rotulado. Ordenar solo `role !== 'reference'` en `shared/mission/evaluate.ts` (ADR-008 §6) queda para el equipo y exige actualizar `ORDERING_RULE`, `missionEngine.test` y los fixtures de exportación.
- Línea del composer: «N de M candidatos priorizados», sin contar la REF. `ResultView` del equipo sigue diciendo «N de 7 áreas», que sí cuenta la REF como área.

### Próximos tres pasos exactos

1. `git fetch origin` y confirmar que `origin/dev` sigue en `92392f1`. Si avanzó, fusionar y repetir `npm run verify`.
2. `git push origin feature/mision-redesign:dev` (fast-forward, sin `--force`) y seguir `gh run watch` de `vercel-deploy.yml`.
3. En `analogos-dev.vercel.app` con sesión autorizada: probar la IA real («Proponer requisitos con IA» y «Destacar motivos con IA»), exportar el JSON y decidir la REF en `evaluate.ts`.

## Integración del rediseño con dev (Claude Code, rama `feature/mision-redesign`, 2026-11-14)

**Pedido:** el usuario pidió «fusiona en dev y haz push» y decidió integrar: la interfaz es la del rediseño (ADR-010) y por dentro se usan el planificador determinista, la IA de Anthropic y los datos v3 del equipo (ADR-008, ADR-009). Plan: `docs/INTEGRATION_PLAN.md`; decisión: ADR-013 (propuesto). **El push a `dev` es un paso aparte; no se hizo en esta sesión.** Base: `origin/dev` `92392f1`, fusionado sin squash (merge `44feec6`).

### Qué funciona

- **Explorar v3:** 6 candidatos con su puesto global y la referencia conocida (Pampa Yungay) con rótulo «REF», nunca con número, en el carrusel, el globo, el riel, Comparar y la Lectura; filtro «Todos / Chile / Argentina» que conserva el puesto global; contorno CL+AR rotulado «Contorno referencial, no límite oficial»; globo centrado en las dos regiones; chip «Snapshot v3 · 6 candidatos · 1 REF · 7 ◆ por calcular»; promesa del producto en el carrusel. Ficha con pestaña **Origen** (bloque «Origen y antecedentes» del equipo), «Exportar ficha (JSON)» (`buildExport`) y «Evaluar este sector»; **Método** con «Cómo se buscaron» (50 ventanas, regiones, mapa SVG y enlaces auditables).
- **Misión sobre el planificador del equipo:** un único controlador (chunk diferido) con `plannerReducer`, `evaluateMission`, `aiClient` y `buildMissionExport` sin cambios. «Tu misión» monta `PlannerView` (separado de `PlannerPanel`, que conserva su firma) en variante compacta. «Enviar» abre los requisitos con el brief y **no llama a la IA**; «Usar ejemplo», «Añadir requisito: …» (sin valor) y «Evaluar un sector…» como sugerencias. Tras confirmar y evaluar: carrusel agrupado por estado, globo con #puesto / ○ / ✕ / fuera del alcance (sin %), riel con la capa de requisitos (✓ ✕ ○, exigido, observado, motivo), líneas Tesla ordenadas por requisito, «Descargar JSON», «Imprimir informe» (un informe por página) y diagnóstico exportable fuera de cobertura. Editar tras evaluar invalida y aborta la IA en curso; los resultados quedan atenuados hasta reevaluar.
- **Lectura en tres capas:** resultado (`MissionEvaluation`), motivos destacados (plantilla determinista sin ✦ o «✦ Destacar motivos con IA», validada por el reductor) y hechos del snapshot (sin el filtro `^cl-`, REF aparte, robustez de `analysis-summary.json`). En Explorar es «Lectura determinista», sin IA.
- **Sin IA o en el ZIP:** recorrido manual completo; los botones de IA muestran «no disponible» y la exportación lleva `ai.draft` y `ai.explanation` en `null`.

### Cómo ejecutarlo

- `npm install`; `npm run dev` (IA local solo si hay `.env` con `ANTHROPIC_*`, ver `docs/AI_SETUP.md`).
- Verificación completa: `PATH=/ruta/a/python311+:$PATH npm run verify` (pytest, `typecheck:server`, vitest y build).
- Paquete: `npm run build && python scripts/package_release.py --zip <ruta>.zip --checksum <ruta>.zip.sha256`. `npm run release:package` sin flags escribe `submission/analogos-static.zip`.

### Pruebas realizadas (2026-11-14)

- `npm run verify`: **pytest 190 pasan, 4 omitidas** (requieren `data/raw`); `typecheck:server` correcto; **vitest 603 pasan, 2 omitidas** (IA real opt-in) en 52 archivos; build correcto.
- Tests del equipo intactos: `aiServer`, `aiLive`, `missionEngine`, `missionGeometry`, `plannerState`, `plannerUi`, `missionFormat` y `tests/test_discovery.py` sin diferencias con `origin/dev`. En `discovery.test.tsx` solo cambió la ruta de `CandidateMap`; el bloque «ranking y ficha» se **portó** con los mismos textos a `features/places/PlaceRail.test.tsx` y `shell/detail/OriginSection.test.tsx`.
- Nuevos: `MissionController`, `explanationToReading`, `facts`, `bundleParity` (bundle web = `loadTrustedBundle()` del servidor), `referenceNeverRanked`, `copy`, `OriginSection`, `contractFixtures` (catálogo ◆). Retirados: motor propio, lktron, NDJSON, tokens, FNV, pregenerado, paridad TS↔Python del motor propio y contratos lktron.
- Smoke de `/api/ai` (`vite preview`, sin `.env`): GET → 405 `method_not_allowed`; POST `draft` → 503 `ai_unavailable` con `cache-control: no-store`.
- Paquete en `/tmp/claude-rel/integ.zip` (no se tocó `submission/`): **66 entradas, 14.500.565 bytes, SHA-256 `ee50dc4b7aa47aac59286d489647f8b96e07d0fe3da439b243385e98e95ec1bc`**, idéntico en dos ejecuciones y cotejado con dist. SHA anterior de la entrega de dev (`submission/analogos-static.zip`, UI `9060970`): `eacf5dce441763b2c5e21d2aa2d75fe88130cccfeafb098c72e73bba1f2bd32f`. Abierto bajo `/AnalogOS/` con toda red externa bloqueada: Explorar, Misión manual, IA «no disponible» y JSON exportado válido contra `mission-export.schema.json`. `file://` no está garantizado (ADR-004).
- Navegador (Chrome, puerto 4601) en 1440×900 y 390×844: Explorar con REF y filtro, selección con riel y líneas, Origen, Método (50 ventanas), exportar ficha, paso a 2D, Misión sin clave (0 llamadas a `/api/ai` en el recorrido manual), evaluación, JSON, edición que invalida y punto fuera de cobertura con diagnóstico. **0 errores de la app en consola**; los únicos errores de recurso son 500 de teselas opcionales de NASA GIBS en 2D y los 404 de `/api/ai` en el servidor estático (esperados). Sin desborde horizontal en móvil.
- Peso: chunk de entrada 122,2 KB gz (+10,3 frente a 112,0 en `9b32457`, dentro de +12); CSS inicial 17,1 KB gz (+1,8). El compilador de Ajv no está en el chunk de entrada: planificador, cliente de IA y `shared/mission/validate` van en el chunk diferido de misión (52,4 KB gz); búsqueda y antecedentes v3 en un chunk aparte (9,1 KB gz).
- Invariantes: `git diff --quiet origin/dev` sobre artefactos v1/v2/v3, configs, contratos del equipo y el ZIP v2 → sin cambios; `shared/`, `server/`, `api/`, `tsconfig.server.json`, `vercel.json`, `.github/` y `check-vercel-function.mjs` → sin cambios; `package.json` raíz y `package-lock.json` idénticos; sin secretos ni `VITE_ANTHROPIC*`/`VITE_LKTRON*`.

### Archivos cambiados (resumen)

- Nuevos: `domain/{criteria,snapshotContracts,discoveryContracts,missionView,sensitivity}.ts`, `features/composer/{missionController.ts,printHost.tsx,PrintContent.tsx}`, `features/analysis/{facts,explanationToReading}.ts`, `components/planner/PlannerView.tsx`, `shell/actions.ts`, `shell/detail/OriginSection.tsx`, ADR-013 y los tests nombrados arriba.
- Adaptados: carrusel, marcadores, riel, líneas, Lectura, composer, «Tu misión», ficha, Método, Comparar, arranque, `state/{mission,ui}.ts`, `loadDemoSnapshot` (validadores precompilados), `loadingHints` (precarga v3), `package_release.py`, `test_release_package.py`, `ResultView` (prop opcional `compact`), `PlannerPanel` (envoltorio).
- Retirados: `features/engine/**`, `features/analysis/{lktron*,ndjson,eventGate,analysisTokens,TokenText,factIds,fnv,pregenerated,controller,readingStore,runtime,evidencePacket}`, `domain/{aiContracts,interpretationContract}.ts`, validadores `interpretation`/`mission`, `contracts/{mission-interpretation,evidence-packet,ai-analysis}.schema.json` con sus fixtures, `tests/{test_ai_contracts,test_engine_parity}.py`, `tests/fixtures/engine/`, `scripts/make_pregenerated_analysis.py`, `artifacts/analysis/`, y de dev `components/{CandidateDetails,CandidateRanking,CandidateGlobe,CandidateFlatMap,MapStage,LiquidNav}.tsx` y `breakdown/ScoreBreakdown.tsx`.

### Decisiones nuevas

- ADR-013 (propuesto): la UI del rediseño aloja el planificador; validadores precompilados en el chunk principal y Ajv en runtime solo en el de misión; Lectura en tres capas; sin llamadas automáticas a la IA; el flujo sin IA exige requisitos manuales («Usar ejemplo» a un clic).
- ADR renumerados: escenario fijo 008→**010** (propuesto); recálculo en cliente 009→**011** y IA lktron 010→**012**, ambos **sustituidos** por ADR-009 del equipo.
- Desviaciones del plan, explicadas: el controlador usa el mismo reductor sobre un store externo en lugar de `usePlanner` (evita un render de retraso en campos controlados; `usePlanner` queda intacto); el grupo «fuera del alcance» va visible y atenuado, no plegado (un listbox APG no admite grupos plegables); `aiContracts.test.ts` y `test_ai_contracts.py` se conservaron como `contractFixtures.test.ts` y `test_contract_fixtures.py` para no perder la cobertura del catálogo ◆; el ZIP se generó en `/tmp` por instrucción de la tarea.

### Bloqueos reales

- ~~`submission/analogos-static.zip` (`eacf5dce…`) sigue siendo el de la UI de dev (`9060970`)~~ — resuelto en la revisión: regenerado con la interfaz integrada (`c5904c66…`, bloque de arriba).
- El push a `dev` (que despliega en `analogos-dev.vercel.app` vía Actions) no se ejecutó en esta sesión. La verificación remota de la IA real queda para el equipo o para el paso de publicación.
- ADR-010 y ADR-013 requieren aceptación humana.

### Próximos tres pasos exactos

1. `git fetch origin` y comprobar que `origin/dev` sigue en `92392f1` (o fusionar sus nuevos commits); regenerar `submission/analogos-static.zip` con `npm run release:package` y anotar el SHA.
2. `git push origin HEAD:dev` desde `feature/mision-redesign` (fast-forward, sin `--force`) y seguir `gh run watch` del workflow `vercel-deploy.yml` (build, `check-vercel-function`, deploy y alias).
3. En `analogos-dev.vercel.app` con sesión autorizada: «Proponer requisitos con IA» y «Destacar motivos con IA» reales, y exportar el JSON con `ai.draft` y `ai.explanation` presentes.

**Handoff:** Codex puede retomar leyendo `prompts/RESUME_CODEX.md` y `project/STATUS.md` (este bloque), con `docs/INTEGRATION_PLAN.md` y ADR-013 como contexto de la integración.


## Mantenimiento documental — README de producto

- Dan solicitó orientar el README al producto y reducir contenido del evento. Codex reorganiza problema, usuarios, recorrido, evidencia, alcance y acceso local; operación y reproducción pasan a `docs/DEVELOPMENT.md`.
- Se corrige la afirmación antigua de cobertura nacional: el alcance sigue siendo el piloto de dos regiones, seis candidatos y Yungay como referencia. Sin cambios de código, datos ni despliegue M10.
- Encargo y verificación en `project/tasks/README_PRODUCT.md`. M10 sigue aceptado; Claude sin nueva asignación.
- Contenido aceptado: 34 enlaces relativos comprobados; 316 Python y 332 web correctos (3 opt-in omitidas), typecheck/build correctos. Publicación documental con `[skip ci]`; `outputs/` local excluido.

## Entrega vigente — M10

- Código desplegado `4708b42b4bd152dca74d3e009f233a910e458d8b`; Actions 43665786554 correcto; https://analogos-dev.vercel.app/. Checkpoint posterior solo documental/evidencia con `[skip ci]`. Main no modificado por esta entrega.
- Claude implementó y corrigió bajo revisión de Codex. Fuentes SERNAGEOMIN/SEGEMAR, comprobaciones vinculadas al objetivo, cobertura/escala/límites visibles y exportación auditable. Reintento único ante selección inválida, plazo total conservado; sin cambiar score, requisitos, evaluación ni datos científicos.
- 316 Python y 332 web correctos; typecheck/build, contrastes reales movilidad/muestreo, integridad del wrapper y regresión M8/M9. 33 archivos protegidos intactos. Función Vercel real probada antes del despliegue.
- IA real en dev: AR6, tres comprobaciones con unidades SEGEMAR, tracción pendiente. Informe descargado validado y reconstruido idéntico con datos oficiales. Evidencia/captura: `submission/evidence/m10-dev-geology-export.json`, `submission/assets/analogos-m10-dev.jpg`. Detalle: `docs/DEV_AI_VERIFICATION.md` y `docs/CODEX_M10_REVIEW.md`.
- ZIP vigente: 31 entradas, 13.255.407 bytes, SHA-256 `f76a905564f69737e763724da8467aff45dff1177e269a188a60da35807eb122`. QA local offline/subcarpeta, errores, móvil/teclado completado; impresión nativa pendiente.
- NEXT_TASK accepted; Claude sin nueva asignación. No iniciar otro milestone automáticamente. Los bloques siguientes son historia, no el estado vigente.

## Antecedente M9 — aceptado y publicado

Ficha y exportación geológica oficial en siete sectores; cobertura/ambigüedad y escala explícitas. Revisión de datos/código y navegador offline, 390 px/teclado, errores de carga y descarga real completadas. 316 Python y 246 web correctos; typecheck/build; baseline49 intacto. ZIP 31 entradas, SHA-256 `eed868335c5374d20b05415a8627be9ec3f035c1dc10668bbe08f21e03f6520c`. Ver `docs/CODEX_M9_REVIEW.md`. Código desplegado `34e76b9`; Actions 43658989969 correcto. Geología y exportación remotas verificadas; ambas operaciones reales Anthropic correctas y JSON recalculado idéntico. Capturas y exportaciones en submission; detalle en `docs/DEV_AI_VERIFICATION.md`. El checkpoint documental posterior no cambia el despliegue. Sin cambio de score, ciencia ni IA geológica.

## Encargo M9 autorizado — contexto geológico

- Dan aprobó la recomendación: «ok saquemoslo que quede perfecto y que nada se rompa». Alcance en NEXT_TASK: ficha geológica, adquisición/contrato/exportación reproducibles y offline; ciencia, rankings e IA M8 conservados.
- Claude implementa por fases con checkpoint/revisión de Codex. Sin mapa litológico, filtros nuevos ni score geológico. Codex hará aceptación y salida a dev tras verificar; main se conserva.
- Baseline nuevo: `/tmp/analogos-m9-baseline-hashes.json`; M8 archivado en `project/tasks/M8_MISSION_RECOMMENDATION.md`. Investigación anterior preservada.

## M9 fase B — ficha, exportación y paquete portable (Claude, en revisión de Codex)

- Ficha «Contexto geológico» compacta y expandible en los siete sectores, exportación `<site_id>-geology-context.json` con contrato autocontenido, carga opcional validada (timeout incluye el cuerpo; sin llamadas a proveedores) y empaquetador con `geology-context-v1/index.json` opcional validado. No cambia score, confianza, restricciones, IA ni M8.
- `npm run verify`: 316 Python, 245 web (+2 omitidas), typecheck/build correctos. `release:package` repetido idéntico: 31 entradas, SHA-256 `579a4fed…74be`. Baseline de 49 archivos intacto. Brechas: sin QA en navegador (Codex), la web no calcula SHA-256. Detalle en `project/M9_PROGRESS.md`; datos ignorados: `data/raw/geology-context-v1/` (~6,9 MB).

## M9 fase A — contexto geológico (corregida tras la revisión de Codex)

- Paquete real `artifacts/geology-context-v1/index.json` (SHA-256 `fe2552dd…856c`), contrato propio, pipeline `python -m pipelines.build_geology_context [--refresh|--offline]`, ADR-010 propuesto y `docs/GEOLOGY_CONTEXT.md`. Estados: Chile 1–3 y Yungay `partial` (≈99 %), Argentina 4 `partial` (50 %), Argentina 5 `no_coverage`, Argentina 6 `available`. Coinciden con la auditoría dentro de 5e-5 pp. Reparaciones aceptadas, sin máscaras.
- Correcciones de revisión A: cambio de área total en reparaciones, validación de cada vértice, transacción caché+paquete con rollback, procedencia exacta por sector, caché y licencia estrictas. Paquete recalculado desde la caché sin red. Verificación: 297 Python, 196 web (+2 omitidas), typecheck/build correctos; rebuild offline idéntico; baseline de 49 archivos intacto.
- Brecha de la fase A resuelta en B: el empaquetador ya admite `geology-context-v1/`. Raw ignorado: `data/raw/geology-context-v1/` (~6,9 MB).

## Evaluación geológica posterior a M8 — Codex, 2026-11-14

- Dan pidió analizar primero esfuerzo y valor. Evaluación terminada en `docs/GEOLOGY_FEASIBILITY.md`, con mediciones reproducibles en `docs/research/geology/`. No se inició integración de producto ni una tarea a Claude.
- Descargas reales: SERNAGEOMIN distribuido por MMA a 1:1.000.000 cubre aproximadamente 99 % de las cuatro ventanas chilenas; SEGEMAR 250K cubre 50 %, 0 % y 100 % de las argentinas. Alternativas más generales verificadas por separado; huecos, solapamientos y geometrías inválidas explícitos.
- Recomendación: contexto descriptivo y trazable por sector, estimado en 20–32 h de ingeniería/revisión; no activar `geologic_relevance` ni inferir tracción. Datos y código de ciencia, IA, UI y publicación sin cambios. Claude sigue esperando asignación.
- Caché de investigación ignorada: `data/raw/geology-feasibility-20261114/`, 13 archivos, 20.873.381 bytes. Dependencias exploratorias aisladas en `/tmp/analogos-geology-audit-libs`, sin modificar dependencias de la app.
- Verificación del producto: 177 Python y 196 web correctos, 2 pruebas de IA real omitidas; typecheck/build correctos. La auditoría de cobertura no es validación de campo.

## Antecedente M8 — dev e IA real comprobados

- URL: https://analogos-dev.vercel.app/. Código desplegado `9060970ecf71e3c68f7b11a8d220e37e49057dc8`; Actions 43639834860 correcto. El checkpoint posterior solo agrega documentación/evidencia con `[skip ci]` y conserva ese despliegue verificado. Main no se publica.
- Dan autorizó subir a dev y verificar la IA. La clave está en GitHub Secrets, inyectada solo en runtime del deploy dev. Protección de Vercel conservada; clave ausente del código, bundle, ZIP y evidencia.
- Prueba real desde navegador: Anthropic propuso tres requisitos editables y explicó la evaluación confirmada. Ejemplo: pendiente regional ≤ 2,3°, superficie no vegetada ≥ 95 %, permisos pendientes. Resultado: una ventana priorizada y seis descartadas. JSON descargado validado y evaluación idéntica al recálculo local.
- Corregido fallo del primer deploy (`707d4b1`, `ERR_REQUIRE_ESM`): núcleo puro movido a `shared/`, web con reexports, servidor con imports directos y NodeNext. CI prueba el arranque de la función realmente empaquetada antes de desplegar.
- Verificación tras la corrección: 177 Python, 196 web (+2 pruebas reales opt-in omitidas por defecto), typecheck/build y arranque Node correctos. Los 38 hashes de baseline permanecen intactos.
- ZIP final: 30 entradas, 12.987.707 bytes, SHA-256 `eacf5dce441763b2c5e21d2aa2d75fe88130cccfeafb098c72e73bba1f2bd32f`, repetido idéntico y cotejado con dist.
- Informe vigente: `docs/DEV_AI_VERIFICATION.md`. Evidencia: `submission/evidence/m8-dev-ai-export.json`, captura `submission/assets/analogos-m8-dev-ai.png`. Configuración/rotación en `docs/AI_SETUP.md`.
- Pendientes delimitados: impresión nativa (contenido/CSS comprobados), territorio, bibliografía, contraste climático y validación con usuarios. No se certifica aptitud de campo ni se adquirieron datos para nuevas geometrías.
- La aceptación local y las dos devoluciones a Claude permanecen como historia en `docs/CODEX_M8_REVIEW.md` y `project/M8_PROGRESS.md`. Las secciones siguientes documentan M7 y entregas anteriores.

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
