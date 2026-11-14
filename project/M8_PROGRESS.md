# M8 — Reporte de entrega para revisión de Codex

Estado: **entregado para revisión** (no autoaceptado). Sin commit ni push. Base `4d197e1`, rama `dev`. Sin dependencias nuevas. Ciencia v2/v3, configs, workflows, `vercel.json` y protección de Vercel intactos.

## Correcciones de la revisión de A (todas con regresión de repo)

1. **Geometría**: solo épsilon numérica 1e-9°; bbox casi igual (±0,0005°, ±0,0015°, ±0,002°) → cobertura parcial sin heredar. Idéntico decimal (o ruido de coma flotante) sí.
2. **Timeout**: el temporizador cubre cabeceras **y** lectura del cuerpo (más una carrera con la señal por si un `fetch` la ignora); aborto en JSON → `ai_timeout`. Pruebas: cuerpo que se demora, con y sin respetar la señal.
3. **Exportación**: `ai.draft` y `ai.explanation` separados, cada uno con su procedencia, huella de entrada y, para el borrador, la propuesta original y los cambios del usuario **calculados** (editados/quitados/añadidos). Editar el brief después rompe la atribución a la IA.
4. **Validación**: `buildMissionExport` rechaza (`MissionExportError`) solicitud sin confirmar, evaluación de otra solicitud o alterada (se re-evalúa y compara), huellas ajenas y selección fuera de contrato. `checkSelection` exige forma cerrada y acotada (`contracts/mission-ai.schema.json`).
5. **Salida del proveedor**: se valida con Ajv (esquema enviado + contrato estricto) antes de `buildDraft`/`checkSelection`; extras, faltantes y tipos incorrectos → `ai_invalid_output`, sin normalizar.
6. **Escala y cifras**: pendiente/rugosidad/relieve solo van a ventana si la cita dice «mediana/regional/ventana completa»; si no, se conservan como escala puntual con una pregunta. Las cifras propuestas deben aparecer en `source_quote` (acepta coma decimal); países deben nombrarse en la cita. Verificado también con el modelo real («pendiente máxima de 10 grados» → escala puntual).
7. **Destino**: `Otro objetivo / no soportado` con texto libre; el borrador puede proponerlo; no se fuerza Marte. (Retiré `target_stated` del esquema del modelo: la auditoría de Codex llama a `buildDraft` sin él; el destino lo describe el usuario.)

Auditoría independiente `/tmp/analogos-m8-audit.test.ts`: **9/9 pasan**, sin modificarla. Las dos pruebas añadidas por Codex destaparon dos defectos del estado, ya corregidos con regresión: (a) una respuesta de IA del `requestId` vigente con huellas ajenas se ignoraba y la llamada quedaba «pendiente» para siempre → ahora termina en error; (b) iniciar un reintento de borrador/explicación borraba la procedencia del resultado aún en uso → ahora se conserva y un fallo no la pierde.

## Revisión B de Codex (puntos 3–6; 1 y 2 ya corregidos)

- **Formateo único** `mission/format.ts` (números es-CL deterministas, sin añadir precisión; °, m, %, km², fracción con su equivalencia en %), reutilizado por el motor (razones y «Exigido»), el resumen de confirmación, el resultado y el informe impreso. El JSON conserva unidad canónica y valores exactos (`degree`, `2.3`).
- **Confirmación** (`ConfirmSummary`): muestra las condiciones efectivas (p. ej. «≤ 2,3° · Ventana completa (~20 km) (imprescindible)»), la geometría pedida y una nota de que el cálculo usa esas condiciones y no los números del brief. Valores incompletos se señalan sin NaN.
- **Informe impreso** autosuficiente: tabla con «Condición efectiva» (operador, valor, unidad, escala o «sin medición») aunque no haya opciones; geometría pedida y medida en texto (punto/bbox pedido, bbox y área medidos, intersecciones y cobertura).
- **Microcopia**: «Esta versión …» en lugar de «M8» (incluye `data_request.note`; el valor de enumeración `no_adquirido_en_M8` del contrato no se tocó para no cambiar su estructura); escala genérica «Ventana completa (~20 km)»; hero sin promesa de tracción: «Prioriza qué sectores merecen reconocimiento para un ensayo de rover, con medidas regionales y verificaciones de campo pendientes. No mide tracción ni aprueba terreno».
- Cambiar los textos de razones cambia las huellas de evaluación (reglas aún prerelease); snapshot científico y contratos sin cambios. No se repitieron llamadas de IA (solo cambió la presentación).
- Pruebas nuevas: `missionFormat.test.tsx` (14 casos de formateo, confirmación, informe sin opciones, microcopia, hero).

## Etapa B (UI) — qué se entrega

- Entradas «Definir una prueba» / «Evaluar un sector» en el primer pantallazo (hero), nueva pestaña «Planificar» y botón «Evaluar este sector» en la ficha. Planificador integrado como sección; globo, explorador, búsqueda v3, comparación y método intactos.
- Pasos accesibles (teclado, 44 px, controles nativos, foco y anuncio por paso): describir (objetivo, brief ≤ 3000, actividad, ejemplo editable rotulado, IA opcional con aviso de envío a Anthropic, editor completo de requisitos), sector (siete áreas con país y REF, punto, bbox; coordenadas como texto con avisos y sin NaN; esquema SVG local pedida vs medida), confirmar (resumen, advertencias, confirmación explícita), resultado.
- Resultado: veredicto, grupos por estado con bloqueos visibles sin abrir nada, detalle por criterio (exigido/observado/escala/periodo/evidencia con enlace), medidas del sector, valores originales rotulados, comparabilidad parcial, regla de orden, verificaciones de campo, pendientes, informe de evidencia insuficiente con fuentes previstas, JSON validado e informe imprimible (brief completo, requisitos con origen y cita, geometría, límites, procedencia).
- Estado puro `mission/plannerState.ts` (reductor usado por la UI): editar brief, requisitos, sector, destino o actividad borra confirmación y resultado y cancela IA pendiente (se aborta el `fetch`); las respuestas tardías se ignoran por `requestId` y huellas; un requisito editado deja de figurar como «IA». Sin `localStorage`; «Borrar todo» disponible.
- IA: errores amables, modo manual intacto; en el ZIP (sin función) falla claro (no hay spinner eterno: timeout de 45 s y cancelación).

## Verificación ejecutada

- `source .venv/bin/activate && npm run verify` → exit 0: **177 Python**, **196 web** (+2 omitidas: IA real), `tsc -p tsconfig.server.json` incluido en `verify`, build.
- `npm run release:package` **dos veces**: ZIP idéntico, 30 archivos, 12.983.416 bytes, SHA-256 `7b2b30b578e428ea76d8e9998a994935853dd0b50c850771d0b9dabac7a8d2ec` (`shasum -c` OK). Sin `sk-ant`/`ANTHROPIC_API_KEY`/`x-api-key` en el contenido; sin `api/` ni `server/`.
- Baseline `/tmp/analogos-m8-baseline-hashes.json`: 38 archivos sin diferencias; `git status` sin cambios en `artifacts/`, `config/`, `.github/`.
- `git diff --check` limpio.
- **IA real** (`npm run test:ai-live`, `claude-sonnet-5-5`, entradas inocuas, sin secretos), última corrida tras los cambios:
  - borrador `req_011Ch3SU1U1WP9u5CNUGtJve` · 2026-11-14T20:19:36.481Z · 2161 in / 1033 out · `end_turn`;
  - explicación `req_011Ch3SUb9ZCuGKimh1dmVKC` · 2026-11-14T20:19:40.585Z · 6174 in / 569 out · `end_turn`;
  - caso pendiente máxima `req_011Ch3SUtmi2ZccExEUrdjvf` · 2097 in / 696 out → escala puntual + 1 pregunta;
  - la exportación completa con ambos registros reales valida contra el contrato.
  - Probado vía handler y servidor local Vite (`dev` y `preview`); **no en Vercel**.

## Límites y riesgos honestos

- **Vercel nuevo no verificado**: compilación de `api/ai.ts`, trazado de JSON en la función, duración máxima y variables de entorno quedan para el preview que revise Codex. No se publicó nada ni se tocaron secretos remotos.
- **No hay automatización de navegador**: la interfaz se verificó con pruebas de estado y de renderizado (`renderToStaticMarkup`), no visualmente; el diseño responsive, el foco, la impresión real y el contraste necesitan tu CUA.
- El control de `Origin` no es autenticación; el limitador es en memoria y por instancia.
- El borrador de IA puede cambiar la escala de una métrica topográfica a «puntual» (comportamiento deliberado y conservador); el usuario puede devolverla a «ventana» en «Más opciones».
- `explain` envía ~6 k tokens de entrada; la explicación sigue siendo solo selección de referencias, por decisión de ADR/Codex.
- Los dos recorridos comparten editor y resultado; el recorrido de sector sin requisitos evalúa con todo «priorizado» (se advierte en el paso de confirmación).

## Archivos principales

Núcleo `apps/web/src/mission/*`; UI `apps/web/src/components/planner/*` (+ `App.tsx`, `CandidateDetails.tsx`, `LiquidNav.tsx`); servidor `server/ai/*`, `api/ai.ts`, `tsconfig.server.json`, plugin en `apps/web/vite.config.ts`; contratos `contracts/mission-*.schema.json`; tests `apps/web/src/tests/{missionEngine,missionGeometry,aiServer,plannerState,plannerUi}.test.*` y `aiLive.test.ts`; docs `docs/AI_SETUP.md`, `ARCHITECTURE.md`, `PRODUCT_AND_SCIENCE.md`, `DEMO_ACCEPTANCE.md`, `README.md`; `.env.example`, `package.json`, ZIP y checksum regenerados.

## Reproducir

```bash
source .venv/bin/activate && npm run verify
npm run release:package          # dos veces: mismo SHA-256
npm run test:ai-live             # llamada real; requiere ANTHROPIC_API_KEY en el .env ignorado
npm run dev                      # o: npm run build && npm run preview  (ambos sirven /api/ai)
```


## Cierre de revisión — Codex (2026-11-14)

**Aceptado localmente.** El handoff y los hashes anteriores documentan la entrega de Claude; la evidencia vigente está en `docs/CODEX_M8_REVIEW.md`. Codex corrigió además el formato de umbrales diminutos y la etiqueta de cobertura, comprobó 177 Python + 196 web (2 pruebas reales omitidas por defecto), typecheck/build y auditoría independiente 10/10. IA real verificada desde navegador, escritorio/móvil/teclado, exportaciones y recorrido manual del ZIP bajo `/AnalogOS/` sin servicio de IA.

ZIP final: 30 entradas, 12.987.711 bytes, SHA-256 `440b295e936613eea74e43e74cd2f978defd2e8c01b72e7bedcdd359b8d2b5da`. Empaquetado repetido idéntico y 38 hashes de baseline intactos. Captura `submission/assets/analogos-m8-review.png`. Pendientes delimitados: prueba remota de Vercel e inspección visual del diálogo nativo de impresión; no certificación de terreno. Sin commit ni push; Claude espera nueva asignación.
