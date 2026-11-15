# Plan de integración: rediseño Explorar/Misión sobre origin/dev (M7 y M8)

> **Cierre de revisión (2026-11-15):** integración publicada en `dev` en `dd625b4`, Actions 43678787020 correcto. Codex comprobó borrador y explicación geológica con Anthropic real y aceptó ADR-013/014. Ver `docs/CODEX_INTEGRATION_REVIEW.md` y el bloque vigente de STATUS. Los estados «plan sin ejecutar», ADR propuesto y push pendiente que siguen describen las etapas históricas del plan, no bloqueos actuales.

- Fecha: 2026-11-14
- Rama de trabajo: `feature/mision-redesign` (HEAD `9b32457`).
- Destino: `origin/dev` (HEAD `92392f1`), que tiene 14 commits del equipo desde la base común `adcffcd`.
- Estado: **plan sin ejecutar.** El commit que añade este archivo no cambia nada más.
- Autorización: el usuario pidió «fusiona en dev y haz push» y decidió integrar. La interfaz sigue siendo la del rediseño. Por dentro se usan el motor determinista (`shared/mission`), la IA Anthropic (`server/ai` y su cliente) y los datos v3 del equipo, con su búsqueda reproducible.
- De dónde sale este plan:
  - lectura de origin/dev en modo solo lectura (worktree temporal ya eliminado, `git merge-tree`, `git archive`);
  - tests ejecutados en los dos árboles;
  - `docs/UX_REDESIGN.md` y `docs/BUILD_CONTRACTS.md`.

## 0. Resumen

1. **La interfaz es la del rediseño:** globo de fondo con paso automático a 2D, marcadores ●◆○, carrusel de lugares, líneas Tesla, riel de métricas, composer, Lectura, carga «Órbita honesta» y hoja móvil.
2. **Por dentro se usa lo del equipo:**
   - `evaluateMission`, la explicación y el JSON exportable de `shared/mission`;
   - la IA Anthropic, que vive solo en el servidor y se llama con `apps/web/src/mission/aiClient.ts`;
   - el snapshot `science-v3` con `domain/discovery.ts`.
3. **Se retiran `features/engine` y el cliente lktron (NDJSON),** junto con sus contratos, validadores, el análisis pregenerado y sus tests. Solo sobreviven dos piezas sin equivalente: los umbrales de espera visual (`PHASE_THRESHOLDS`, que pasan al composer sin timeout propio) y la capa de hechos de `analysis`.
4. **Misión deja de calcular un «% de misión».** Muestra:
   - el estado, con 4 valores posibles;
   - el puesto, solo para las opciones priorizadas;
   - las preferencias cumplidas;
   - similitud, confianza y estabilidad v3 sin recalcular;
   - la factibilidad territorial, siempre «pendiente».
5. **La IA nunca se llama sola.** Hay dos botones explícitos, cada uno con su aviso de envío: «Proponer requisitos con IA» y «Destacar motivos con IA». Sin clave, o desde el ZIP, el recorrido manual funciona completo.
6. **Pampa Yungay es REF:** queda fuera del ranking de Explorar y lleva su rótulo en el globo, el carrusel, el riel y Comparar.
7. **ADR:** nuestros 008–010 pasan a 010–012 y se añade ADR-013 para la integración.
8. **Tests:**
   - los del equipo se conservan sin tocar sus aserciones;
   - los del motor propio y de lktron se eliminan;
   - los de las features se reescriben contra v3 y `MissionEvaluation`.
9. **Orden de trabajo:** F0 línea base → F1 fusión → F2 datos, contratos y build → F3 Explorar v3 → F4 Misión → F5 Lectura → F6 retiros, ADR y documentación → F7 verificación y push (§8).

## 1. Invariantes

| Regla | Cómo se comprueba |
|---|---|
| La IA no produce cifras ni ordena | Todas las cifras de la Lectura salen de `MissionEvaluation` vía `shared/mission/format.ts`. `checkSelection` rechaza IDs ajenos. Lo cubren los tests `aiServer` y `missionEngine` intactos y un test nuevo del adaptador (§7.6) |
| Similitud, confianza y factibilidad separadas | `snapshot_scores` se muestra tal cual y ningún componente los combina. La factibilidad dice siempre «pendiente» |
| Nada inventado | No hay conversión texto→umbrales sin IA. Los requisitos de plantilla vienen sin valor. Los ◆ siguen «por calcular» |
| Primero sin conexión | El ZIP abierto desde `file://` y sin red ofrece Explorar, Misión manual y la exportación JSON |
| Sin secretos | `ANTHROPIC_*` y `ANALOGOS_AI_*` existen solo en el entorno del servidor, nunca con prefijo `VITE_` |
| No cambiar fórmulas, pesos ni artefactos v1/v2/v3 | `git diff --quiet origin/dev -- <lista de §9.3>` |
| TypeScript estricto | `tsc --noEmit` (web) y `npm run typecheck:server` |
| Sin dependencias npm nuevas | Hoy `package.json` (raíz y web) y `package-lock.json` ya son idénticos en las dos ramas, y deben seguir así |
| `shared/` y `server/` no importan nada de `apps/web` | `grep -rn "apps/web" shared server api` vacío y `scripts/check-vercel-function.mjs` en verde (ERR_REQUIRE_ESM) |
| No tocar dev/main en local; un único push al final | `git push origin HEAD:dev` desde la rama de trabajo, sin `--force` |

## 2. Correspondencia pieza por pieza

Qué significa cada decisión:
- **Conserva:** la pieza entra sin cambios de comportamiento.
- **Adapta:** se mantiene, con los cambios indicados.
- **Adopta:** se toma la versión del equipo.
- **Retira:** se borra.

### 2.1 Datos, contratos y validación

| Nuestra pieza | Pieza del equipo | Decisión | Motivo y cómo |
|---|---|---|---|
| `data/loadDemoSnapshot.ts` (v2, `chileOutline`) | La misma en dev: v3, con `outline`, `search`, `precedents`, `SNAPSHOT_PATH` e `IS_DISCOVERY_SNAPSHOT` | Adopta | Es el límite de carga de v3. Hay que renombrar `chileOutline`→`outline` en `AppShell`, `appData`, `features/globe/{MapStage,CandidateGlobe,CandidateFlatMap,CandidateMap}` y en los `testSupport` de metrics, places, leaders, composer y analysis |
| `domain/contracts.ts` (validadores precompilados, `CRITERION_IDS`, `isCriterionId`, `ReferenceAnalog`, `errorSummary`) | `shared/domain/contracts.ts` (Ajv en runtime); en dev, la web solo lo reexporta | Adapta la nuestra | Se mantienen los validadores precompilados en el chunk principal. Desde `shared/domain/contracts` se reexportan **solo tipos** (`export type`). `assertSnapshotContracts` y `assertDiscoveryContracts` se implementan con los validadores generados y con los mismos mensajes que dev («Candidato N inválido», «Resultados de búsqueda inválidos», «Catálogo de antecedentes inválido»). `shared/domain/contracts.ts` no se toca porque lo usa `server/ai/facts.ts` |
| `apps/web/scripts/build-validators.mjs` | — | Adapta | Hay que añadir `validateSearch` (discovery-search) y `validatePrecedents` (precedent-catalog) en `validators.discovery.generated.js`, que es un chunk aparte; si van al principal suben unos 17 KB gz. Hay que quitar `validators.interpretation.*` y `validators.mission.*`. Luego se regenera con `npm -w apps/web run validators`, porque el `--check` del build falla si el esquema `candidate-site` cambió |
| `contracts/{mission-interpretation,evidence-packet,ai-analysis}.schema.json` | `contracts/mission-{request,evaluation,export,ai}.schema.json` | Retira las nuestras | Las sustituyen los contratos M8 (ADR-009 del equipo). Se borran junto con sus fixtures en `tests/fixtures/contracts`, los validadores generados y los tests |
| `contracts/reference-analog.schema.json` y `config/reference_analogs.json` (◆) | No hay equivalente; `precedents.json` es otra cosa | Conserva | Es el catálogo mundial de análogos «por calcular». No se mezcla con `precedents.json`, que es la bibliografía de la región piloto |
| `domain/scoring.ts` `rankCandidates(todos)` | `domain/discovery.ts` (`splitByRole`, `filterByCountry`, `availableCountries`, `initialSelection`, `summarizeSearch`, `matchDetails`, `buildExport` y etiquetas) | Adopta discovery y adapta los usos | `rankCandidates` se aplica solo sobre `splitByRole(...).ranked`. Hay 8 llamadas que cambian: `places/placeModel.ts`, `globe/markers.ts`, `globe/CandidateMap.tsx`, `metrics/metricContext.ts`, `analysis/runtime.ts`, `analysis/evidencePacket.ts`, `composer/model.ts` y `composer/missionRun.ts` |
| `data/loadVisualContext.ts` | La versión de dev, con `VISUAL_CONTEXT_DIR` | Adopta | Entra sin conflicto |
| `features/boot/loadingHints.ts` (precarga v2) | — | Adapta | Pasa a precargar v3 (§4.4). `snapshotCredit` lee el manifest v3 |
| `artifacts/basemaps/*` (WebP del rediseño) | Igual | Conserva | Son imágenes de fondo, no artefactos científicos. Las vistas previas WebP solo coinciden por SHA con Yungay; los otros 6 sitios cargan el PNG v3 |
| `artifacts/analysis/ai-analysis.default.json` y `scripts/make_pregenerated_analysis.py` | — | Retira | Es prosa pregenerada, atada a la huella del paquete v2. Con v3 nunca coincide, y mostrarla como IA atribuiría una plantilla a la IA (ADR-009 §9 del equipo) |
| `artifacts/{demo,science-v1,science-v2,visual-context}` | Iguales | Conserva | Los leen `test_discovery.py` y `snapshot.test.ts`. `prune-build` los saca del dist |

### 2.2 Motor y evaluación

| Nuestra pieza | Pieza del equipo | Decisión | Motivo y cómo |
|---|---|---|---|
| `features/engine/scoreMission.ts` (`scoreMission`, `buildMissionInputs`, `limitingCriterion`, `isUsableBase`) | `shared/mission/evaluate.ts` (`evaluateMission`) | Retira; se usa la del equipo | El ADR-009 del equipo, ya aceptado, prohíbe cambiar pesos. Su orden es: imprescindibles → preferencias cumplidas → similitud v3 → `site_id`. Si ambos motores siguieran activos, la pantalla mostraría dos órdenes y dos «similitudes» |
| `profiles.ts` (`levelsToWeights`, `profileFromLevels`, `MISSION_PRESETS`, `fnv1a32`) | `Requirement[]`, `exampleState`, `EXAMPLE_BRIEF`, `defaultMetricRequirement`, `fingerprint` | Retira | Volver a ponderar es cambiar pesos |
| `demoMatcher.ts` (`matchMissionDemo`, `DEMO_LABEL`) | `detectUnmeasuredMentions`, `uncoveredMentions`, el ejemplo editable y la edición manual | Retira | Sacar umbrales de palabras clave inventa cifras. No se crea ningún sustituto |
| `aggregate.ts`, `pyMath.ts` (port de `scoring.py`) | — | Retira | Nadie los usa una vez quitado el recálculo. La robustez base se lee de `analysis-summary.sites[].sensitivity`, que ya escribe el pipeline |
| `missionPhase.ts`: `PHASE_THRESHOLDS`, `PhaseThresholds`, `WaitStage` | `CLIENT_TIMEOUT_MS` = 45 s en aiClient | Adapta: pasan a `features/composer/labels.ts` | Quedan solo los umbrales visuales: contador a los 3 s y aviso de lentitud a los 10 s. Se **elimina** `timeoutMs` = 20 s. El corte lo hace aiClient a los 45 s, o el usuario con «Cancelar» (AbortSignal), y el rótulo dice «cancelado», no «falló la IA» |
| `nextMissionPhase`, `createMissionRunController`, `waitStage` | `plannerReducer` y `usePlanner` | Retira | El reducer del equipo ya protege contra respuestas tardías con `requestId` y las huellas de brief, solicitud y evaluación |
| `state/mission.ts` (`lktron`/`demo`/`preset`, interpretation, profile, scoring) | `PlannerState` | Adapta, con la forma nueva de §3.1 | |
| — | `shared/mission/*`, los reexportes de `apps/web/src/mission/*`, `plannerState.ts` y `siteMeasures.ts` | Conserva intacto | Es trabajo verificado y el servidor depende de `shared/` |

### 2.3 IA

| Nuestra pieza | Pieza del equipo | Decisión | Motivo y cómo |
|---|---|---|---|
| `analysis/lktron.ts`, `lktronConfig.ts` (`VITE_LKTRON_URL`), `lktronClient.ts`, `ndjson.ts` | `apps/web/src/mission/aiClient.ts` (`requestDraft`, `requestExplanation`), que hace `POST ${BASE_URL}api/ai` | Retira; se usa aiClient | Con aiClient el secreto queda en el servidor, la llamada es al mismo origen, hay un tope de 45 s, se cancela con AbortSignal y las respuestas se validan |
| `eventGate.ts`, `analysisTokens.ts`, `TokenText.tsx`, `factIds.ts` | `checkSelection`, `composeExplanation`, `deterministicSelection` | Retira | La IA del equipo no escribe prosa con `{{id}}`: solo elige IDs existentes |
| `fnv.ts` (huella del paquete) | `fingerprint.ts` (SHA-256 puro) | Retira | |
| `pregenerated.ts` | `deterministicSelection`, rotulada «Plantilla determinista sin IA» | Retira | |
| `evidencePacket.ts` (paquete y capa de hechos) | — | Adapta: queda solo la capa de hechos (`features/analysis/facts.ts`) | Estos hechos deterministas no tienen equivalente: dirección frente a Jezero, factor limitante, criterio que satura, valor regional compartido, criterio sin discriminación, mejor de N, datos faltantes y verificaciones. Hay que quitar `SITE_ID=/^cl-/` (deja fuera los 3 argentinos) y tratar la REF como un hecho aparte. Desaparecen el paquete y su huella |
| `robustness.ts` | — | Adapta | Pasa a leer `analysis-summary.sites[].sensitivity`, con un parser en `domain/` similar a `parseMarsReference`, en lugar de `engine.sensitivity` |
| `readingStore`, `controller`, `ReadingPanel`, `ReadingPill`, `ReadingSnippet`, `ReadingView`, el esqueleto | — | Adapta | Siguen siendo la superficie de la Lectura, ahora alimentada por `ExplanationView` (§5) |
| — | `server/ai/*`, `api/ai.ts`, `tsconfig.server.json`, `scripts/check-vercel-function.mjs`, `.github/workflows/vercel-deploy.yml` | Conserva intacto | Despliegue y función verificados por el equipo |
| `apps/web/vite.config.ts` (`loadingHints`, `codeSplitting` de rolldown) | El plugin `aiDevApi` (`/api/ai` en `vite dev` y `vite preview`, `loadEnv` filtrado por `ANTHROPIC_`/`ANALOGOS_AI_`) | Une ambos | Sin `aiDevApi`, la IA local siempre aparece como no disponible |

### 2.4 Features del rediseño

| Feature | Qué se conserva | Qué se adapta | Qué se retira |
|---|---|---|---|
| `places` | El catálogo ◆ (`analogCatalog`, `referenceAnalogs`, `ReferenceCard`) y `classify`, que añade la insignia «coincide con» cuando un ◆ cae dentro de un polígono | `buildPlaceModel` y `PlaceRail`:<br>• Explorar usa `ranked` con su puesto global, luego la REF y luego los ◆, y tiene filtro por país.<br>• Misión agrupa por estado de `MissionEvaluation` (§4).<br>• `PlaceModelInput.scoring` → `evaluation`, más `country`.<br>• `EvaluatedPlace` suma `role`, `country`, `optionStatus`, `preferences` e `inScope` | Las etiquetas «% del motor determinista vX». También `components/CandidateRanking.tsx` de dev: nunca fue parte de nuestra UI y sus aserciones pasan a los tests de `PlaceRail` (§7.4) |
| `globe` | Vuelo, teclado, geometría, cámara, `stageBridge`, el paso de 3D a 2D y el SVG cuando no hay WebGL | Marcadores:<br>• puesto desde `splitByRole`/`rankOf` y «REF» en vez de número;<br>• grupo por `candidate.country`;<br>• `outline` CL+AR;<br>• encuadre que incluye las dos regiones;<br>• `contextLayers` según `snapshot_version`;<br>• en Misión, tipo de marcador según `OptionStatus`.<br>`features/globe/CandidateMap.tsx` toma el contenido de dev (50 ventanas, antecedentes, `mapFrame`, `projector`) con rutas `../../`.<br>Hay que portar a `features/globe/*` los cambios de dev en `components/{CandidateGlobe,CandidateFlatMap,MapStage}.tsx` | `MissionScoring` y `scoreSource: 'mission'` |
| `metrics` | `MetricRail`, `MetricViz`, `FadeNumber`, S1 | Pesos y contribuciones salen **siempre** del snapshot. En Misión se superpone una capa de requisitos (§4.2). `engineVersion` → `rulesVersion` (`RULES_VERSION`). `MetricView.requirements?: RequirementResult[]` | El contexto `kind: 'mission'` con pesos de misión |
| `leaders` | `layoutLeaders`, `projector`, `LeaderToggle`, `controller` y la regla de no dibujar con un ◆ seleccionado | `pickPrincipalMetrics`: en Misión, primero los criterios con requisito (imprescindibles antes que preferencias) y después el peso base. El rótulo lleva ✓/✕/○ y el texto de `describeCondition`. No hay líneas para sitios fuera del alcance | Ordenar por pesos de misión |
| `boot` | `BootLayer`, `OrbitLoader`, `StatusChip`, hitos | Precarga v3, textos del chip y del anuncio, órbita centrada en las dos regiones (§4.4). `OrbitLoader` se reutiliza para las esperas del borrador y de la explicación | La precarga v2 |
| `composer` | `Composer`, `MissionCard`, `focusComposer` (sin cambio de firma), los resaltados del brief, Deshacer y el historial | Se convierte en una capa sobre el planificador del equipo (§3). `missionRun.ts` usa `MissionController`. `history.ts` pasa al formato v2 (§3.7). Los chips «Refinar» cambian (§3.4) | `MISSION_PRESETS`, niveles y pesos, la tarjeta «7 criterios con niveles», «DEMO · sin IA» y el envío automático a la IA al pulsar «Enviar» |
| `analysis` | La capa de hechos, la robustez y la superficie de la Lectura | §5 | lktron, NDJSON, eventGate, tokens, FNV y el texto pregenerado |
| `components/planner/*` (equipo) | `RequirementEditor`, `ScopePicker`, `ConfirmSummary`, `ResultView` (con `CriteriaTable`, `AiPanel`, `PrintReport`), `GeometryFigure`, `planner.css`, `usePlanner` | Se reutilizan **como piezas internas** de «Tu misión», con los tokens del rediseño. `PlannerPanel` se divide en `PlannerPanel`, que sigue llamando a `usePlanner` y mantiene su firma para los tests, y `PlannerView`, que es presentacional y recibe el planificador compartido. `ResultView` admite una prop opcional `compact` (sin ella se comporta igual) | — |

### 2.5 Shell, estado y componentes de dev en conflicto

| Ruta | Decisión | Cómo |
|---|---|---|
| `apps/web/src/App.tsx` | La nuestra | Mantiene la carga y `AppShell`. Debe contener literalmente «Prioriza qué sectores merecen reconocimiento para un ensayo de rover» y «No mide tracción ni aprueba terreno» (los lee `missionFormat.test.tsx`), como una constante `PRODUCT_PROMISE` que se pasa al shell y se muestra en el estado inicial de Explorar y en la cabecera de Misión. Sin hero, sin `#planner` y sin la frase «reproduce mejor condiciones» |
| `content/shell.ts`, `AppShell` | Adapta | La marca pasa de «AnalogOS Chile» a «AnalogOS», con el subtítulo «Piloto Chile–Argentina». Ninguna superficie dice «M8» |
| `shell/detail/FullDetail.tsx` | Adapta | Pestaña nueva «Origen», con el bloque «Origen y antecedentes» de dev en `shell/detail/OriginSection.tsx` y textos literales. En la cabecera: país, rol (REF), «Exportar ficha (JSON)» con `buildExport(candidate, search)` y «Evaluar este sector». «Comparar» deja de leer `scoring.engineVersion` |
| `shell/detail/MethodTab.tsx` | Adapta | Nueva sección «Cómo se buscaron»: `summarizeSearch` (2 regiones; 50 ventanas intentadas y 50 evaluadas; unos 22.274 km²; 4 excluidas por antecedente; 6 preseleccionadas; hasta 3 por país; al menos 25 km entre centros), la lista de regiones, el `CandidateMap` SVG con las 50 ventanas y enlaces a `search-results.json` y `analysis-summary.json` |
| `components/CandidateComparison.tsx` | Fusión manual | Firma de dev (`ranked`, `references`, `rankOf`), REF aparte y estilo nuestro |
| `components/CandidateDetails.tsx` (modificado en dev, borrado aquí) | Retira | La ficha es `FullDetail`, más el riel. Los bloques de dev se reparten: «Origen y antecedentes» va a `OriginSection`, la exportación y «Evaluar este sector» a la cabecera de `FullDetail`, y «Dónde falla», «Qué verificar» y «Evidencia» ya existen en las pestañas Métricas y Fuentes |
| `breakdown/ScoreBreakdown.tsx` (modificado en dev, borrado aquí) | Retira | Lo reemplaza el riel de métricas. El único cambio de dev, «Sector chileno»→«Sector terrestre», se lleva a la leyenda de `MetricViz` |
| `components/LiquidNav.tsx` (modificado en dev, borrado aquí) | Retira | Lo reemplaza `ModeTabs`. El ícono `planner` de dev no hace falta: Misión ya es una pestaña |
| `components/{CandidateGlobe,CandidateFlatMap,MapStage}.tsx` (modificados en dev, borrados aquí) | Retira | Sus cambios (REF, país, `outline`, `VISUAL_CONTEXT_DIR`) se portan a `features/globe/*` |
| `state/ui.ts` | Adapta | `MissionPhase`: `profile` → `review`, que no cuenta como ocupado. `isMissionBusy` = `interpreting`, `scoring` o `analysis`. Yungay REF se selecciona con `kind: 'evaluated'`; `kind: 'reference'` queda para los ◆ |

### 2.6 Build, empaquetado y despliegue

| Ruta | Decisión | Cómo |
|---|---|---|
| `package.json` (raíz) | Adopta dev | Trae `typecheck:server`, `test:ai-live`, `discovery:*` y el `verify` con `typecheck:server`. Hoy entra sin conflicto |
| `apps/web/package.json` | La nuestra | Conserva `validators` y el `build` con `build-validators --check`. Las dependencias son idénticas en las dos ramas |
| `apps/web/vite.config.ts` | Unión | `aiDevApi` (de dev) más `loadingHints` y la agrupación `$initial` (nuestros) |
| `apps/web/scripts/prune-build.mjs` | Adopta dev | Al dist solo llegan v3 y `visual-context-v3`. Hay que comprobar que `basemaps/` se conserva |
| `vercel.json` | Adopta dev | `git.deploymentEnabled: false` y cabeceras de caché para v3 |
| `.github/workflows/vercel-deploy.yml`, `scripts/check-vercel-function.mjs` | Conserva intacto | Fuera de alcance |
| `scripts/package_release.py` | Fusión manual | Base de dev: `SCIENCE_FILES` v3, `visual_images()`, control de versión del snapshot, `DEFAULT_ZIP = submission/analogos-static.zip`. Se le añade lo nuestro: `BASEMAP_FILES` (`s2-*.webp`, `world.webp`), la precarga `./data`, el favicon `data:` y el póster WebP. `DATA_REFERENCES` se calcula con las listas v3. **Se quita `ANALYSIS_FILES`.** Nunca debe escribir `analogos-chile-static.zip`, que es el histórico v2 |
| `submission/analogos-static.zip` y `.sha256` | Se regeneran en F7 | Hoy corresponden a la UI de dev (`9060970`, SHA `eacf5dce…`). Tras integrar se regeneran con `npm run release:package` (dos veces, mismo SHA) y en STATUS se anotan el SHA anterior y el nuevo |

## 3. Recorridos del planificador en Explorar, Misión y el composer

### 3.1 Un único planificador compartido

- `features/composer/MissionController.tsx` se monta una vez, en la raíz del shell y en diferido (§3.8). Llama a `usePlanner(bundle)` del equipo, con `bundle = {candidates, manifest, profile}` de `science-v3` **sin transformar**.
- El resultado se publica en `missionStore` (`state/mission.ts`):

```ts
interface MissionState {
  planner: PlannerState                  // reducer del equipo, tal cual
  request: MissionRequest | null         // built.request, si es válida
  evaluation: MissionEvaluation | null   // planner.result
  explanation: ExplanationView | null    // derivada (§5.2)
  source: 'anthropic' | 'manual' | 'example' | null
  revision: number                       // +1 en cada evaluación aceptada
}
```

- Solo `MissionController` escribe en el store. Expone `dispatch`, `evaluate`, `runDraft`, `runExplain` y `exportJson` como acciones.
- places, globe, metrics, leaders y analysis solo leen `evaluation` y `explanation`.
- `PlannerView` (§2.4) recibe esta misma instancia, así que no hay un segundo estado.

| Paso del planificador (dev) | Fase de UI (`state/ui.ts`) | Superficie del rediseño | ¿Ocupado? |
|---|---|---|---|
| Sin brief | `idle` | Explorar; dock vacío | no |
| Borrador de IA en curso (`draft_start`) | `interpreting` | Dock con `OrbitLoader` «Proponiendo requisitos…» y botón «Cancelar» | solo el composer |
| Describir y alcance (editar requisitos y geometría) | `review` (nueva) | «Tu misión»: `RequirementEditor` y `ScopePicker` | no |
| Confirmar | `review` | «Tu misión»: `ConfirmSummary` («Confirmar requisitos y sector» y después «Evaluar ahora», los botones del equipo) | no |
| `evaluated` (síncrono) | `scoring` → `done` | Carrusel, globo, riel, líneas y Lectura; vista previa de `recommended_site_ids[0]` si existe; un solo `announce()` | transitorio |
| Explicación de IA en curso | `analysis` | Lectura con `OrbitLoader`; el resto se puede usar | solo la Lectura |
| Edición después del resultado | `review` | El reducer invalida y aborta; los resultados pasan a `--o-busy` hasta reevaluar | no |
| Error o cancelación | `error` / `cancelled` | Mensaje en la superficie que lo originó | no |

### 3.2 «Definir una prueba» (recorrido `test`)

1. **Entradas:**
   - el usuario escribe en el dock;
   - pulsa «Definir una prueba» en el estado inicial de Explorar;
   - o cambia a la pestaña Misión.

   En los tres casos se ejecuta `dispatch({type:'set_journey', journey:'test'})`.
2. **El brief:**
   - Llega hasta 3000 caracteres (`MAX_BRIEF_CHARS`; antes eran 600).
   - Pulsar «Enviar», o Intro, **no llama a la IA**: abre «Tu misión» en el paso de requisitos, con el brief ya cargado.
   - Debajo del brief se resaltan las menciones que detecta `detectUnmeasuredMentions` y su aviso de «pendientes detectados».
3. **Requisitos:**
   - Se editan a mano, se carga «Usar ejemplo» (`exampleState`) o se pulsa «✦ Proponer requisitos con IA».
   - Junto a ese botón va, literal, el aviso del equipo: «Al pulsarlo, el texto de su prueba se envía a Anthropic para proponer un borrador. El recorrido manual no envía nada. La IA no confirma ni evalúa…».
   - El borrador llega con `confirmed=false` y con la etiqueta IA/Usted en cada requisito.
   - Los `source_quote` se resaltan en el brief.
4. **Alcance:** el catálogo (las 7 ventanas), un sector, un punto o un bbox, con `ScopePicker` y `GeometryFigure`.
5. **Confirmar y evaluar:** con los botones del equipo. **Nunca se confirma solo después de la IA.**
6. **Resultado en el escenario:** se presenta según §4.2. En «Tu misión» queda el `ResultView` compacto: titular, bloqueos visibles, regla de orden, «Descargar JSON» (`analogos-recomendacion-<fp8>.json`), «Imprimir informe» y «Volver a editar».

### 3.3 «Evaluar un sector» (recorrido `sector`)

- **Entradas:**
  - «Evaluar este sector» en la cabecera de `FullDetail`, en el riel o en la tarjeta del carrusel;
  - en Misión, el menú contextual del marcador.

  Todas hacen `dispatch({type:'set_journey', journey:'sector', siteId})` y cambian el modo a Misión. El alcance queda fijado en esa ventana y se abre el paso de requisitos. No se reimplementa nada de lo que el reducer conserva o reinicia.
- **«Evaluar un sector…» sin sitio:** abre `ScopePicker` con sector, punto o bbox. El catálogo solo existe en el recorrido `test`, como en dev.
- **Punto o bbox:**
  - `resolveScope` muestra la resolución.
  - Un punto dentro de una ventana da `needs_window_selection`, y hay que pulsar de forma explícita «Evaluar la ventana completa» (`windowSiteId`).
  - Un bbox parcial da `partial_coverage`.
  - Fuera de toda ventana da `insufficient_coverage`, sin vecino. El carrusel muestra el diagnóstico y la exportación de `data_request`.
- **Opcional (P2):** con `ScopePicker` en modo punto o bbox, un clic en el mapa 2D rellena lon/lat como texto. No hereda métricas.

### 3.4 Composer (dock) y «Tu misión»

| Elemento actual | Elemento integrado |
|---|---|
| Brief de 600 caracteres → lktron o `matchMissionDemo` → niveles → `scoreMission` | Brief de hasta 3000 caracteres → (opcional) `requestDraft` → requisitos editables sin confirmar → confirmación explícita → `evaluateMission` local |
| Tarjeta «Tu misión»: 7 criterios con niveles y pesos | Requisitos (`describeEditable`, `topicLabel`, `RequirementEditor`), alcance y `ConfirmSummary` |
| Chips «Refinar» (`MISSION_PRESETS`) | «Usar ejemplo», «Añadir requisito: pendiente / rugosidad / relieve / suelo desnudo / área / país» (`defaultMetricRequirement`, **sin valor**) y «Evaluar un sector…» |
| Resaltados «DEMO» | `source_quote` del borrador de IA y coincidencias de `detectUnmeasuredMentions` (se reutiliza `highlightSegments`) |
| Línea de resultado «#1 … %» | «N priorizados · #1 ‹nombre› (REF si aplica) · similitud v3 X (sin recalcular)», o «Ninguna opción priorizada» cuando `none_prioritized` |
| `announce()` | Una sola vez por `revision`, con el mismo texto |

### 3.5 Sin IA y en el ZIP

- El botón de IA está siempre visible: su disponibilidad la decide el servidor.
- Si no hay clave, si hay 404 o HTML (ZIP), un error de red o se cumplen los 45 s, aiClient devuelve `unavailable` con «IA no disponible… Puede continuar manualmente». El texto se muestra junto al botón y el recorrido sigue.
- Nunca se usa la palabra «DEMO».
- La Lectura muestra la plantilla determinista, rotulada (§5).
- La exportación JSON funciona y lleva `ai.draft` y `ai.explanation` en `null`.

### 3.6 Lo que se pide al usuario aceptar

Sin IA no hay conversión determinista de un texto libre a umbrales, y crearla rompería la regla «nada inventado». Por eso el flujo «escribo y veo resultados» pasa a ser «escribo, añado requisitos o uso el ejemplo, confirmo y evalúo». Hay que registrarlo en ADR-013 y en STATUS.

### 3.7 Invalidación, respuestas tardías e historial

- **Invalidación:** cualquier edición de brief, requisitos o alcance hace que el reducer invalide la confirmación y el resultado. `MissionController` aborta en red la petición vigente con un `AbortController` por `requestId` (efecto portado de `usePlanner`).
- **Historial** (`analogos.composer.history.v2`):
  - Guarda el brief, el alcance y los requisitos con `origin: 'user'`.
  - Los requisitos con `origin: 'ai'` que nadie editó **no se guardan**.
  - Tampoco se guarda nunca la procedencia de la IA ni los resultados.
  - Se restaura con una secuencia de acciones existentes (`reset` → `set_journey` → `set_brief` → `add_requirement`×n → `set_scope`), sin crear una acción nueva en el reducer.
  - La clave v1 se ignora: su formato de niveles es incompatible.
- **Deshacer:** usa el mismo formato.

### 3.8 Carga diferida

- `shared/mission/validate.ts` y `aiClient.ts` compilan Ajv al importarse. Por eso **todo lo que importe `apps/web/src/mission/index.ts`, `validate`, `evaluate`, `exportReport`, `plannerState`, `aiClient` o `components/planner/*` va en el chunk diferido de misión.** Se carga al entrar en Misión, al pulsar «Evaluar este sector» o al enfocar el dock.
- Explorar y el riel solo pueden importar los módulos sin Ajv: `mission/format`, `mission/catalog`, `mission/siteMeasures`, `mission/types` y `mission/fingerprint`.
- Se verifica en F7: el chunk de entrada no contiene `ajv`.

## 4. Cómo se presenta v3

### 4.1 Explorar

| Superficie | Presentación |
|---|---|
| Globo / 2D | • 6 ● numerados 1–6 con su puesto global (`rankOf`).<br>• Yungay: ● con rótulo «REF» y contorno de referencia, **nunca un número**.<br>• Los 8 ◆ del catálogo mundial siguen «por calcular». `atacama-yungay` coincide con el polígono de la REF y aparece como insignia «coincide con Pampa Yungay (REF)», no como un ◆ superpuesto.<br>• Agrupación por `candidate.country` (`countryLabels`).<br>• Contorno de `context-outline.geojson` (CL y AR) con el rótulo «Contorno referencial, no límite oficial».<br>• El encuadre inicial y el 2D cubren el interior de Antofagasta y la Puna de Catamarca y Salta. |
| Carrusel | • Primero las 6 tarjetas en orden global; después la tarjeta REF («REF · Referencia conocida · No sale de la búsqueda»); al final los ◆.<br>• Chips «Todos / Chile / Argentina» (`availableCountries`, `filterByCountry`) con `aria-label="Filtrar candidatos por país"`. Filtrar **conserva el puesto global**.<br>• El contador «de N» cuenta solo los candidatos.<br>• Estado vacío: «La búsqueda no dejó candidatos en ‹país›» y «Referencia conocida: Yungay».<br>• Similitud v3 con 1 decimal y confianza aparte. El país va en texto, sin banderas. |
| Riel | • Pesos y contribuciones del snapshot.<br>• Cabecera con país, rol (REF), «Factibilidad territorial: pendiente» y un enlace a «Origen».<br>• «Mejor de N» cuenta solo los 6 candidatos, con una nota que dice que la REF queda fuera.<br>• Valores regionales compartidos, rotulados como hoy. |
| Líneas Tesla | Igual que hoy, con los pesos base. |
| Ficha (`FullDetail`) | • Pestaña «Origen»: origen, `window_id`, `selection_rank`, la prioridad topográfica con su nota («solo ordena la preselección; no es el score ni la confianza»), la revisión bibliográfica (`note`, `catalog_version`, `reviewed_at`) y `matchDetails` con su fuente.<br>• Para la REF: «Referencia conocida», «No sale de la búsqueda» y «La ventana contiene coordenadas de muestreo publicadas».<br>• Botón «Exportar ficha (JSON)», que usa `buildExport`.<br>• Las autoridades territoriales salen del propio sitio (IDERA o IDE Chile, según el país), sin textos fijos. |
| Método | «Cómo se buscaron» (§2.5). Los antecedentes de `precedents.json` son bibliografía: solo el transecto de Navarro-González (30 puntos) se dibuja, en el SVG; el resto son topónimos sin coordenadas y nunca se dibujan como pin. |
| Comparar | `CandidateComparison` con `ranked`, `references` y `rankOf`, y la REF aparte. |

### 4.2 Misión (después de evaluar)

| Superficie | Presentación |
|---|---|
| Carrusel | • Grupos en el orden de estados del equipo.<br>• **Priorizados para reconocimiento:** «#rank» de `option.rank`; si es Yungay, «#n · REF».<br>• **Evidencia insuficiente:** ○.<br>• **No cumple requisitos:** atenuado, con «qué lo impide» (`critical_failed`).<br>• **Objetivo no soportado.**<br>• **Fuera del alcance:** sitios que no están en `evaluated_site_ids`, en un grupo plegado y neutro.<br>• Cada tarjeta muestra el estado (`STATUS_DEFINITIONS`), «met/total preferencias», «similitud v3 X (sin recalcular)», la confianza y «Factibilidad territorial: pendiente».<br>• Cuando `outcome` es `needs_window_selection`, `insufficient_coverage` o `unsupported_target`, el carrusel muestra la tarjeta de diagnóstico (con `data_request` exportable) en lugar de una lista vacía. |
| Globo | • Priorizado: ● con «#rank».<br>• Evidencia insuficiente: ○.<br>• No cumple: ● atenuado con ✕.<br>• Fuera del alcance: neutro y discontinuo.<br>• La REF conserva su rótulo.<br>• **No hay ningún %:** el marcador codifica estado o rol, nunca aptitud. |
| Riel | Capa de requisitos sobre cada criterio, vía `METRICS[metric_id].source.criterion_id`:<br>• `median_slope_degree`→`slope`<br>• `terrain_roughness_meter`→`terrain_roughness`<br>• `local_relief_meter`→`local_relief`<br>• `nonvegetated_fraction`→`bare_ground_fraction`<br><br>Cada fila muestra:<br>• lo exigido (`describeCondition`);<br>• lo observado (`fmtObserved`);<br>• ✓/✕/○;<br>• `reason`, `scale_note`, `period`, `conversion` y `evidence_ids` (enlazados a Fuentes).<br><br>Área y país son filas del sitio (`siteMeasures`). Los temas no medidos aparecen como «pendiente · no medido». Los pesos son los del snapshot. |
| Líneas Tesla | Criterios con requisito (imprescindibles primero), con ✓/✕/○ y el texto de `describeCondition`, igual que en el JSON exportado. Sin líneas para sitios fuera del alcance. |
| «Tu misión» / hoja | `ResultView` compacto (titular, regla de orden, bloqueos, `pending_requirements`, `open_questions`, `limits`), «Descargar JSON», «Imprimir informe» (`PrintReport` montado mientras hay resultado) y «Volver a editar». |

### 4.3 Hoja móvil

- **S0 (Explorar):** carrusel, con su filtro de país.
- **S1 (resultados de Misión):** grupos de estado y riel con la capa de requisitos.
- **S2 (ficha):** `FullDetail`, con las pestañas Origen y Método.
- La pestaña «Misión» de la hoja aloja `PlannerView`.
- La exportación y la impresión siguen al alcance en móvil: la hoja nunca las desmonta mientras haya resultado.

### 4.4 Arranque y créditos

| Elemento | Valor |
|---|---|
| Snapshot por defecto | `VITE_SNAPSHOT_PATH ?? 'science-v3'` (se importa `SNAPSHOT_PATH`) |
| Precarga | `candidate-details.json`, `manifest.json`, `mission-profile.json`, `context-outline.geojson`, `analysis-summary.json`, `search-results.json`, `precedents.json`, `visual-context-v3/index.json` y `basemaps/basemaps.json` |
| Chip | «Snapshot v3 · 6 candidatos · 1 REF · N ◆ por calcular» |
| Anuncio | «6 candidatos y 1 referencia conocida» |
| Órbita | Centrada en las dos regiones |
| Crédito | Desde el manifest v3 (22 conjuntos de datos) |

## 5. La Lectura con la IA real del equipo

### 5.1 Qué hace y qué no hace la IA del equipo

- La operación `explain` recibe la `MissionRequest` confirmada y su huella. El servidor recalcula `evaluateMission` con `artifacts/science-v3` empaquetado y envía a Anthropic solo hechos compactos. El modelo devuelve **una selección de IDs**: requisitos clave y evidencias por opción, y el orden de las verificaciones.
- No escribe prosa ni cifras.
- El cliente acepta la selección solo si `request_fingerprint` y `evaluation_fingerprint` coinciden con la evaluación local y si `checkSelection` pasa.

### 5.2 Modelo de la Lectura en Misión (tres capas, siempre separadas)

| Capa | Fuente | Rótulo |
|---|---|---|
| 1. Resultado | `MissionEvaluation`: `ordering_rule`, grupos, `requirement_results[].reason`, `what_would_change`, `pending_requirements`, `open_questions`, `limits`, y `data_request` cuando `outcome` no es `evaluated` | «Cálculo determinista · reglas mission-rules-1.0.0 · similitud v3 sin recalcular» |
| 2. Motivos destacados | Por defecto, `composeExplanation(evaluation, deterministicSelection(evaluation), 'deterministic_template')`. Después de la IA, `composeExplanation(evaluation, selection, 'anthropic')` | Plantilla: «Plantilla determinista sin IA», sin ✦. IA: «✦ Motivos destacados con IA (Anthropic) · las cifras salen del cálculo determinista», con la procedencia (modelo, `created_at`, `request_id`) |
| 3. Hechos del snapshot | La capa de hechos de `analysis` (§2.3) sobre los sitios evaluados | «Hechos del snapshot» |

- La glosa ✦ solo aparece cuando `explanation.source === 'anthropic'`.
- La lista de verificación de campo sigue `selection.verification_ids`, que reemplaza a `field_priority`.

### 5.3 Adaptadores necesarios (funciones puras, con tests)

| Adaptador | Firma | Función |
|---|---|---|
| `explanationToReading` | `(view: ExplanationView, evaluation: MissionEvaluation) → ReadingModel` | Convierte la vista del equipo en las secciones de `ReadingPanel`, `ReadingPill` y `ReadingSnippet`. Las líneas usan `describeRequirementLine`, `fmtObserved` y `fmtQuantity`. **Nunca lee números de la selección:** solo IDs, que resuelve contra `evaluation` |
| `readingKey` | `(evaluation, revision) → string` | `mission:${request_fingerprint}:${revision}` para `readingStore`. Una clave distinta descarta la Lectura anterior |
| `snippetFor` | `(view, siteId) → string \| null` | Primer requisito clave del sitio, para la píldora de la tarjeta del carrusel |
| `evidenceHref` | `(evidenceId, evaluation) → {tab: 'fuentes', anchor} \| {url}` | Une `evidence_ids` con la pestaña Fuentes (artefacto) o con `#site-record` (`app_derived`) |
| `buildFactsLayer` | `(snapshot, rankedIds, referenceIds) → Fact[]` | Lo que queda de `buildEvidencePacket`: sin paquete, sin huella FNV y sin filtro `^cl-` |
| `parseSensitivity` | `(analysisSummary) → Map<siteId, Sensitivity>` | Entrada de `robustness.ts`, tomada del pipeline |
| `requestMissionExplanation` | Envoltorio de `runExplain` del controlador | La Lectura no llama a aiClient directamente. Todo pasa por el reducer, que conserva las protecciones |

### 5.4 Estados y textos

| Estado | Comportamiento |
|---|---|
| Inicial (`done`) | Capas 1, 2 (plantilla) y 3, y el botón «✦ Destacar motivos con IA». Junto al botón va el aviso literal de `ResultView`: «Al pulsar el botón se envían a Anthropic los requisitos confirmados y los resultados ya calculados (no el texto completo del brief).» El botón **solo existe cuando `outcome === 'evaluated'`** |
| En curso (`analysis`) | `OrbitLoader` «Destacando motivos…»: contador a los 3 s, aviso de lentitud a los 10 s, «Cancelar». La plantilla sigue visible |
| No disponible | Mensaje de aiClient; la plantilla queda como Lectura |
| Huella distinta (`stale_request`) o selección rechazada | «La respuesta no corresponde al cálculo vigente», y la plantilla se mantiene |
| Edición | El reducer aborta la petición; la Lectura vuelve a `--o-busy` hasta reevaluar |
| Exportación | `buildMissionExport(request, evaluation, bundle, {draft, explanation})`. La plantilla **no** se registra como IA (`ai.explanation: null`) |

**No hay llamadas automáticas:** se elimina el arranque de lktron al entrar en la fase `analysis`, que ahora termina en `done` en cuanto está la plantilla.

### 5.5 Lectura en Explorar

- En Explorar no hay operación de IA, porque `explain` necesita una solicitud confirmada.
- La Lectura muestra solo «Hechos del snapshot» y la robustez base, rotulada «Lectura determinista». No lleva ✦.

## 6. Renumeración de ADR

origin/dev ya ocupa ADR-008 (`global-discovery-pilot`, aceptado) y ADR-009 (`mission-guided-recommendation`, aceptado). El ADR-007 es idéntico en las dos ramas.

| Actual (nuestra rama) | Nuevo | Estado tras la integración |
|---|---|---|
| `ADR-008-escenario-fijo-y-hoja.md` | `ADR-014-escenario-fijo-y-hoja.md` (ADR-010 hasta la fusión de M9/M10) | Propuesto (sigue pendiente de aceptación humana). Se añade la relación: no afecta a ADR-008 ni ADR-009 del equipo |
| `ADR-009-recalculo-determinista-en-cliente.md` | `ADR-015-recalculo-determinista-en-cliente.md` (ADR-011 hasta la fusión de M9/M10) | **Sustituido por ADR-009** (recomendación guiada). No se integra; se conserva como registro de la decisión descartada |
| `ADR-010-ia-opcional-fuera-del-flujo-central.md` | `ADR-012-ia-opcional-fuera-del-flujo-central.md` | **Sustituido por ADR-009 §7–9** (Anthropic solo en el servidor) |
| — | `ADR-013-integracion-rediseno-planificador.md` | Propuesto. Registra cinco decisiones:<br>• la UI del rediseño aloja el planificador;<br>• validadores precompilados en el chunk principal y Ajv en runtime solo en el chunk de misión;<br>• la Lectura combina la plantilla determinista con una explicación de IA opcional;<br>• no hay llamadas automáticas a la IA;<br>• el flujo sin IA exige requisitos manuales (§3.6). |

**Procedimiento** (en ese orden, para que no choquen las rutas):

1. Renombrar con `git mv` 010→012, después 009→011 y por último 008→010.
2. Actualizar las referencias **solo en los archivos que vienen de nuestra rama** que no se borren en F6. Fuera de `docs/decisions` hoy hay 56 referencias en 36 archivos, y cerca de la mitad de esos archivos se borran con engine y lktron:
   - `apps/web/src/shell/{AppShell.tsx,layout.ts,shell.css,stageGeometry.js}`;
   - `apps/web/src/shell/sheet/{Sheet.tsx,resolveDetent.ts,useKeyboardInset.ts}`;
   - `apps/web/src/shell/detail/FullDetail.tsx`;
   - `apps/web/src/features/globe/MapStage.css`;
   - `apps/web/src/features/composer/missionRun.test.ts`;
   - `apps/web/src/features/analysis/README.md`;
   - `apps/web/src/tests/{shell.test.tsx,mapZoom.test.ts}`;
   - `docs/UX_REDESIGN.md`, `docs/BUILD_CONTRACTS.md`, `tests/fixtures/contracts/README.md`, `project/STATUS.md` y `project/CHANGELOG.md`.
3. Las menciones a ADR-008/009 en archivos de dev (incluido el comentario de su `vite.config.ts`) son correctas y **no se tocan**.
4. Verificar con `git grep -nE "ADR-0(08|09|1[0-3])"` y revisar cada aparición:
   - ADR-008 = piloto de descubrimiento;
   - ADR-009 = recomendación guiada;
   - ADR-014 = escenario fijo (era ADR-010; el equipo usó ADR-010/011 para la geología M9/M10);
   - ADR-015 (era ADR-011) y ADR-012 = sustituidos;
   - ADR-013 = integración.

   Además, `ls docs/decisions | cut -c1-7 | sort | uniq -d` no debe devolver nada.

## 7. Tests

Línea base medida:
- **Nuestra rama:** pytest 170 pasan y 1 se omite; vitest 857 en 57 archivos.
- **origin/dev:** pytest 173 pasan y 4 se omiten (requieren `data/raw`); vitest 196 pasan y 2 se omiten (IA real, opt-in); `typecheck:server` correcto.

### 7.1 Del equipo: se conservan con las aserciones intactas

`apps/web/src/tests/{aiServer,aiLive,missionEngine,missionGeometry,plannerState,plannerUi,missionFormat}.test.*` y `tests/test_discovery.py`.

- `aiLive` sigue siendo opt-in: **no** se ejecuta `npm run test:ai-live` sin autorización explícita del usuario.
- `plannerUi` y `missionFormat` siguen renderizando `components/planner/*` con la firma de siempre (§2.4).
- `missionFormat` lee `App.tsx` (§2.5).
- Al final, `git diff origin/dev -- <estos archivos>` debe salir vacío.

### 7.2 Compartidos (existen en las dos ramas)

| Test | Situación | Acción |
|---|---|---|
| `domain`, `globe`, `snapshot` (web); `test_constraints`, `test_contracts`, `test_precision_artifacts`, `test_science_artifacts`, `test_scoring`, `test_visual_context` (Python) | Ninguna rama los cambió | Se conservan |
| `surfaceSeries`, `visualContext` | Solo los cambió dev (7 series de 12 meses; `visual-context-v3`) | Se adoptan los de dev. `contextLayers` debe pasar además nuestros dos casos con el índice v2 |
| `basemaps`, `mapZoom`, `test_basemaps.py` | Solo los cambiamos nosotros | Se conservan; en `mapZoom` solo se actualiza la mención al ADR |
| `mapStage.test.ts` | Cambiado en las dos y fusionado sin conflicto; importa `features/globe/MapStage` y exige `visual-context-v3` (7 capas, 3 `s2-ar-*`) | Se conserva; lo hace pasar `contextLayers` según `snapshot_version` |
| `tests/test_release_package.py` | Cambiado en las dos y fusionado sin conflicto, pero roto: nuestros casos de precarga apuntan a `./science-v2/manifest.json` y `./visual-context/index.json` | Se reescriben los casos de precarga contra las rutas v3. Se mantienen los de `BASEMAP_FILES`. Se quitan los de `ANALYSIS_FILES` |
| `discovery.test.tsx` (de dev) | Importa `../components/CandidateMap` (ahora en `features/globe/`), `CandidateRanking` y `CandidateDetails` (retirados) | Los bloques de contratos, roles, búsqueda, exportación y mapa **se conservan con sus aserciones**; solo cambia la ruta de `CandidateMap`. El bloque «ranking y ficha» se porta con **los mismos textos esperados**: el ranking a `places/PlaceRail.test.tsx` y la ficha a `shell/detail/OriginSection.test.tsx`. Se registra en STATUS como portado, no eliminado |

### 7.3 Nuestros: se conservan sin cambios

- `globe/{flight,geometry,keyboard,selectionCamera}.test.ts`
- `leaders/{layoutLeaders,projector,controller}.test.ts`
- `tests/{reducedMotion,resolveDetent}.test.ts`

### 7.4 Nuestros: se reescriben

| Test | Qué cambia |
|---|---|
| `globe/markers.test.ts`, `globe/MarkerLayer.test.tsx` | Rótulo «REF» sin número; grupo por país; tipos según `OptionStatus`; ningún % de misión |
| `places/places.test.ts`, `places/PlaceRail.test.tsx` | REF fuera del ranking; filtro por país con puesto global; estado vacío honesto; grupos por estado en Misión; diagnóstico cuando `outcome ≠ evaluated`. También reciben las aserciones portadas de `CandidateRanking` (`>REF<`, `aria-label="Filtrar candidatos por país"`, el puesto global argentino, «La búsqueda no dejó candidatos en Argentina», «Referencia conocida: Yungay») |
| `metrics/{metricContext,buildMetricViews}.test.ts`, `metrics/MetricRail.test.tsx` | Sin pesos de misión; capa de requisitos (✓/✕/○, `reason`, escala); filas de área y país; «Factibilidad territorial: pendiente»; «Mejor de N» sin REF |
| `leaders/{principal,labelModel}.test.ts`, `leaders/leaders.test.tsx` | Métricas principales ordenadas por requisito; rótulo con `describeCondition`; sin líneas fuera del alcance |
| `boot/boot.test.tsx`, `tests/boot.test.ts` | Precarga v3; chip «6 candidatos · 1 REF»; marca «AnalogOS · Piloto Chile–Argentina» |
| `composer/{Composer.test.tsx,missionRun,model,history}.test.ts` | Sobre `MissionController` y `plannerReducer`:<br>• «Enviar» no llama a la IA;<br>• nunca se confirma solo;<br>• una edición invalida y aborta;<br>• historial v2 sin procedencia de IA;<br>• umbrales visuales sin timeout propio, con los casos de umbral traídos de `missionPhase.test.ts` |
| `analysis/{runtime,controller,evidencePacket→facts,robustness}.test.ts`, `analysis/ReadingView.test.tsx` | Contra `MissionEvaluation` y `ExplanationView`; aceptan sitios `ar-`; la REF como hecho aparte; sensibilidad desde el pipeline |
| `tests/comparison.test.ts` | Firma de dev (`ranked`, `references`, `rankOf`) |
| `tests/featureContracts.test.ts` | Sin la entrada `engine`; sin `LKTRON_ENABLED`, `interpretWithLktron` ni `LktronResult`; con las exportaciones nuevas del composer |
| `tests/shell.test.tsx` | Marca, pestañas Origen y Método, referencias de ADR |
| `tests/uiStore.test.ts` | Fase `review`, que no cuenta como ocupada |
| `tests/validators.test.ts` | `OUTPUTS` nuevos (`discovery-search`, `precedent-catalog`). Siguen aceptando v3, v2, v1 y demo, y rechazando los 9 casos rotos de dev |

### 7.5 Se eliminan (obsoletos)

| Test | Motivo |
|---|---|
| `features/engine/{aggregate,parity,profiles,scoreMission,demoMatcher,missionPhase}.test.ts` | Se retira el motor de recálculo por pesos (ADR-015, sustituido). Los casos de umbral de `missionPhase` se trasladan al composer |
| `tests/test_engine_parity.py` y `tests/fixtures/engine/` | Comprobaban que el port TS de `aggregate` daba lo mismo que `scoring.py`. Sin port, no hay paridad que verificar. `test_scoring.py` sigue cubriendo el pipeline |
| `features/analysis/{lktron,ndjson,eventGate,analysisTokens,fnv,pregenerated,integration}.test.ts` | Se retiran el canal lktron NDJSON, los tokens `{{id}}`, la huella FNV y la prosa pregenerada (ADR-012, sustituido por ADR-009 §7–9) |
| `apps/web/src/tests/aiContracts.test.ts` y `tests/test_ai_contracts.py` | Validaban `mission-interpretation`, `evidence-packet` y `ai-analysis`, que se retiran. Los nuevos contratos los cubren `missionEngine`, `plannerState` y `aiServer` |
| Fixtures de `tests/fixtures/contracts/` de esos tres contratos, más sus entradas en `expectations.json` | Retiro de contratos. Los de `reference-analog` se conservan |

### 7.6 Tests nuevos

| Test | Qué comprueba |
|---|---|
| `composer/MissionController.test.tsx` | Un solo planificador compartido por el dock, «Tu misión», el carrusel y el riel. Sin llamadas automáticas a la IA. Una edición invalida el escenario y aborta en red |
| `analysis/explanationToReading.test.ts` | Todas las cifras salen de `evaluation`. La plantilla va rotulada y sin ✦. ✦ solo con `anthropic`. Una huella distinta deja la plantilla |
| `tests/bundleParity.test.ts` | El bundle que la web pasa a `evaluateMission` tiene la misma huella canónica que `loadTrustedBundle()` del servidor. Si no, toda explicación de IA terminaría en `stale_request` |
| `tests/referenceNeverRanked.test.ts` | En Explorar, Yungay nunca recibe puesto en places, globe, metrics ni analysis |
| `tests/copy.test.ts` | Ninguna superficie contiene «% del motor determinista», «DEMO · sin IA», «nivel ÷ suma», «Perfil de tu misión», «M8», «AnalogOS Chile» ni `VITE_LKTRON` |
| `shell/detail/OriginSection.test.tsx` | La parte de ficha portada de `discovery.test.tsx` (§7.2) |

## 8. Orden de los pasos

Se trabaja en `feature/mision-redesign`; si se quiere poder abandonar, se usa una rama hija `feature/integracion-dev`. **No hay checkout de `dev` ni de `main` en local.** El entorno es este:
- Python: `PATH=/tmp/claude-venv314/bin:$PATH`. Si hace falta, `pip install -e ".[dev]" pillow`.
- Navegador: playwright-core en `/tmp/claude-pw`.
- Servidor estático: `node /tmp/claude-srv/serve.mjs <dist> <puerto>`, que hay que reiniciar después de cada build.

Cada fase termina con su compuerta y su commit en español con los trailers de sesión.

### F0 · Línea base

1. Árbol limpio. Anotar `git rev-parse HEAD origin/dev`.
2. Repetir la medición de §7 en las dos ramas y anotarla.
3. Anotar el SHA de `submission/analogos-static.zip`.

### F1 · Fusión y conflictos

1. `git merge --no-ff --no-commit origin/dev`.
2. Resolver las 16 rutas:

| Ruta | Tipo | Resolución |
|---|---|---|
| `apps/web/src/App.tsx` | contenido | La nuestra, más los textos de §2.5 |
| `apps/web/src/breakdown/ScoreBreakdown.tsx` | modificado/borrado | Borrar (§2.5) |
| `apps/web/src/components/CandidateComparison.tsx` | contenido | Firma de dev y estilo nuestro |
| `apps/web/src/components/CandidateDetails.tsx` | modificado/borrado | Borrar; el bloque de origen pasa a `OriginSection` (en F3) |
| `apps/web/src/components/{CandidateFlatMap,CandidateGlobe,MapStage}.tsx` | modificado/borrado | Borrar; los cambios se portan a `features/globe/*` (en F2–F3) |
| `apps/web/src/components/LiquidNav.tsx` | modificado/borrado | Borrar |
| `apps/web/src/data/loadDemoSnapshot.ts` | contenido | La de dev |
| `apps/web/src/domain/contracts.ts` | contenido | La nuestra precompilada, con tipos de `shared` (§2.1) |
| `apps/web/src/features/globe/CandidateMap.tsx` | contenido (renombre detectado) | Contenido de dev con rutas `../../` |
| `apps/web/src/styles.css` | contenido | La nuestra, más los estilos imprescindibles del SVG de búsqueda; `planner.css` se importa desde sus componentes |
| `apps/web/vite.config.ts` | contenido | Unión (§2.3) |
| `project/STATUS.md`, `project/CHANGELOG.md` | contenido | El texto de dev completo, más un bloque nuevo arriba |
| `scripts/package_release.py` | contenido | Fusión según §2.6 |

3. Dentro del mismo commit van además estos arreglos mecánicos:
   - renombrar `chileOutline`→`outline`;
   - regenerar los validadores;
   - cambiar la ruta de `CandidateMap` en `discovery.test.tsx`.
4. **Compuerta F1:**
   - `npm run typecheck:server` en verde;
   - `tsc --noEmit` en verde;
   - pytest en verde, salvo `test_release_package.py`, que se arregla en F2;
   - `git diff --quiet origin/dev -- <lista de §9.3>`;
   - las suites del equipo de §7.1 en verde.
5. Commit: «Fusiona origin/dev (piloto v3, planificador e IA Anthropic) en el rediseño».

### F2 · Datos v3, contratos, build y servidor

1. `build-validators` con `discovery-search` y `precedent-catalog`. Quitar los validadores lktron cuando ya nadie los importe; si no, en F6.
2. `assertDiscoveryContracts` precompilado.
3. `loadingHints` y `snapshotCredit` en v3.
4. `contextLayers` según `snapshot_version`.
5. `prune-build` y `vercel.json` de dev.
6. `package_release.py` y `test_release_package.py`.
7. **Compuerta F2:**
   - `npm run build` en verde;
   - `visualContext`, `mapStage`, `surfaceSeries`, `snapshot`, `validators` y `discovery` (bloques conservados) en verde;
   - smoke local: `npx vite preview` en `apps/web`, sin `.env`, responde `GET /api/ai` → 405 `method_not_allowed` y `POST {operation:'draft', client_request_id:'ci-startup-0001', brief:'x'}` → 503 `ai_unavailable` con `cache-control: no-store`.

### F3 · Explorar v3

1. `splitByRole`, `rankOf`, REF y país en markers, places, metrics y analysis.
2. El filtro por país en `PlaceRail`.
3. `OriginSection`, «Exportar ficha», «Cómo se buscaron» en Método y `CandidateComparison`.
4. Boot y marca.
5. **Compuerta F3:**
   - tests reescritos de globe, places, metrics, boot, comparison y shell, más los portados de `discovery`, en verde;
   - en el navegador, en escritorio (1440) y móvil (390×844): 6 candidatos, la REF y los ◆; el filtro por país; la REF sin número; Origen y Método; descarga de la ficha.

### F4 · Misión sobre el planificador

1. `MissionController` y `state/mission.ts` nuevos; fase `review`.
2. División `PlannerPanel`/`PlannerView` y `ResultView` con `compact`.
3. Composer y «Tu misión» (§3).
4. Carrusel, globo, riel y líneas según `MissionEvaluation` (§4.2); exportación e impresión.
5. Carga diferida (§3.8).
6. **Compuerta F4:**
   - `plannerUi`, `missionFormat`, `plannerState`, `missionEngine` y `missionGeometry` intactos y en verde;
   - composer, places, metrics y leaders reescritos en verde;
   - `MissionController.test` y `bundleParity` en verde;
   - en el navegador, sin clave: ejemplo → confirmar → evaluar → grupos → capa de requisitos en el riel → JSON → imprimir. Editar invalida. El botón de IA dice «no disponible». Un punto fuera de cobertura da el diagnóstico exportable.

### F5 · Lectura y retiro de lktron

1. Los adaptadores de §5.3; plantilla por defecto; «✦ Destacar motivos con IA» pasando por el reducer.
2. Capa de hechos sin `^cl-`; robustez desde el pipeline.
3. Borrar `lktron*`, `ndjson`, `eventGate`, `analysisTokens`, `TokenText`, `factIds`, `fnv` y `pregenerated`, con sus tests.
4. **Compuerta F5:**
   - tests de analysis reescritos y `explanationToReading` en verde;
   - `git grep -nE "lktron|LKTRON|ndjson"` solo devuelve apariciones en ADR-012 y en el CHANGELOG.

### F6 · Retiro del motor propio, contratos, ADR y documentación

1. Borrar:
   - `features/engine/*` (salvo lo que se movió a composer en F4);
   - `tests/test_engine_parity.py` y `tests/fixtures/engine/`;
   - los tres contratos lktron con sus fixtures y validadores;
   - `domain/aiContracts.ts` y `domain/interpretationContract.ts`;
   - `scripts/make_pregenerated_analysis.py` y `artifacts/analysis/ai-analysis.default.json`.
2. Actualizar `featureContracts.test.ts`.
3. ADR: renumerar según §6 y crear ADR-013.
4. Documentación:
   - `docs/UX_REDESIGN.md` §5: marcar como sustituido por `contracts/mission-ai.schema.json` y ADR-009;
   - §3.2 y §3.7: actualizar;
   - `docs/BUILD_CONTRACTS.md` §2.6 y §2.8: motor retirado, analysis sin lktron;
   - `README.md` si menciona lktron o el % de misión;
   - `project/NEXT_TASK.md`: registrar que el equipo humano pidió directamente esta integración y el push a dev, en un bloque «decisión directa del usuario» que conserve el encargo M8 aceptado de Codex.
5. `docs/AI_SETUP.md` y `docs/DEV_AI_VERIFICATION.md` no se tocan.
6. **Compuerta F6:**
   - `git grep -nE "features/engine|MissionScoring|profileFromLevels|matchMissionDemo|motor determinista v"` vacío fuera de ADR-015 y del CHANGELOG;
   - las verificaciones de ADR de §6;
   - `npm run test` en verde.

### F7 · Verificación total y publicación

1. `PATH=/tmp/claude-venv314/bin:$PATH npm run verify`.
2. `npm run release:package` dos veces: mismo SHA y lista blanca correcta. Abrir el ZIP desde `file://` sin red.
3. Smoke de `/api/ai` (como en F2), sobre el build final.
4. Revisión en el navegador completa (§9.8), sin errores de consola.
5. Actualizar STATUS y CHANGELOG: qué funciona, cómo ejecutarlo, pruebas con sus números, archivos cambiados, decisiones, bloqueos y los tres próximos pasos.
6. Push **solo en el paso autorizado por el usuario:** `git fetch origin` y comprobar que `origin/dev` sigue en `92392f1`, o en un descendiente que haya que fusionar antes. Después `git push origin HEAD:dev`, que debe ser fast-forward, nunca `--force`. **El HEAD empujado no debe llevar `[skip ci]`.**
7. Seguir la ejecución de Actions con `gh run list --branch dev` y `gh run watch`: `vercel build`, `check-vercel-function` (GET 405 y POST sin clave 503), deploy con la clave inyectada y el alias `analogos-dev.vercel.app`.

## 9. Criterios de terminado

1. **`npm run verify` en verde** (pytest, `typecheck:server`, vitest y build): 0 fallos en todos. Las únicas omisiones permitidas son las que requieren `data/raw` y los 2 tests de `aiLive`.
2. **Tests del equipo intactos:** `git diff origin/dev -- apps/web/src/tests/{aiServer,aiLive,missionEngine,missionGeometry,plannerState,plannerUi,missionFormat}.test.* tests/test_discovery.py` sale vacío. En `discovery.test.tsx` solo cambian la ruta de `CandidateMap` y el bloque portado, que figura en STATUS.
3. **Línea base científica:** `git diff --quiet origin/dev -- artifacts/demo artifacts/science-v1 artifacts/science-v2 artifacts/science-v3 artifacts/visual-context artifacts/visual-context-v3 config/mission_profiles config/discovery_search_v3.json config/analog_precedents_v1.json config/visual_observations_v3.json contracts/candidate-site.schema.json contracts/data-manifest.schema.json contracts/mission-profile.schema.json contracts/discovery-search.schema.json contracts/precedent-catalog.schema.json contracts/mission-request.schema.json contracts/mission-evaluation.schema.json contracts/mission-export.schema.json contracts/mission-ai.schema.json submission/analogos-chile-static.zip` devuelve 0.
4. **Servidor:**
   - `npm run typecheck:server` correcto;
   - `grep -rn "apps/web" shared server api` vacío;
   - `git diff --quiet origin/dev -- shared server api tsconfig.server.json vercel.json .github scripts/check-vercel-function.mjs` devuelve 0.
5. **Smoke de `/api/ai` sobre el build final:** GET → 405 `method_not_allowed`; POST de `draft` sin clave → 503 `ai_unavailable` con `no-store`.
6. **Release:**
   - `npm run release:package` repetido da el mismo SHA y el ZIP contiene solo la lista blanca;
   - desde `file://` y sin red funcionan Explorar y Misión manual hasta exportar el JSON, y los botones de IA dicen «no disponible»;
   - en STATUS figuran el SHA anterior y el nuevo.
7. **Bundle:**
   - el chunk de entrada no contiene el compilador de Ajv;
   - el aumento en gz frente a `9b32457` respeta el presupuesto de UX_REDESIGN §6.1 (+12 KB gz como máximo en el chunk principal), o la desviación queda justificada en STATUS;
   - el planificador, el cliente de IA y `shared/mission/validate` van en un chunk diferido.
8. **Navegador, escritorio 1440 y móvil 390×844:**
   - **Explorar:** 6 candidatos numerados, la REF sin número, los ◆ «por calcular», el filtro por país con puesto global, Origen, Método con las 50 ventanas y la exportación de la ficha.
   - **Misión sin clave:** recorrido completo, diagnóstico de punto fuera de cobertura e invalidación al editar.
   - **Lectura:** plantilla rotulada y ✦ ausente.
   - **Accesibilidad:** foco visible, navegación por teclado y atribución de datos siempre visible.
   - **Consola:** sin errores.
9. **Textos:**
   - `App.tsx` contiene las dos frases exigidas;
   - `copy.test.ts` en verde;
   - ninguna superficie dice «M8», muestra un % de misión ni rotula «DEMO».
10. **ADR:** 001–015 sin números repetidos (tras la fusión de M9/M10, el escenario fijo y el recálculo pasaron a 014 y 015); ADR-015 y ADR-012 marcados como sustituidos; ADR-013 propuesto; las referencias, revisadas.
11. **Documentación:**
    - STATUS y CHANGELOG conservan el texto de dev con un bloque nuevo arriba;
    - NEXT_TASK registra la decisión del usuario;
    - UX_REDESIGN §5 y BUILD_CONTRACTS §2.6 y §2.8 están actualizados;
    - el handoff indica que Codex puede retomar leyendo `prompts/RESUME_CODEX.md` y `project/STATUS.md`.
12. **Seguridad:**
    - `git grep -nE "sk-ant-|ANTHROPIC_API_KEY=."` vacío;
    - `.env` sin versionar;
    - ningún `VITE_ANTHROPIC*` ni `VITE_LKTRON*`.
13. **Dependencias:** `git diff --quiet origin/dev -- package-lock.json` y ninguna dependencia nueva en `package.json`.
14. **CI:**
    - el push a dev es fast-forward;
    - la ejecución de `vercel-deploy.yml` termina en verde (build, check de la función, deploy y alias);
    - `analogos-dev.vercel.app` carga con una sesión autorizada, sin desactivar la Protección de Vercel. Si no hay sesión autorizada, la comprobación remota de la IA real queda en STATUS como pendiente para el equipo.

## 10. Riesgos que quedan y decisiones abiertas

| Riesgo o decisión | Mitigación o propuesta |
|---|---|
| El bundle de la web no es byte-equivalente al del servidor, y toda explicación de IA termina en «no corresponde al cálculo vigente» | `bundleParity.test.ts`: nunca filtrar ni transformar el snapshot antes de `evaluateMission` |
| Un `rankCandidates(todos)` olvidado pone a Yungay #4 | `referenceNeverRanked.test.ts` y el grep de F3 |
| El flujo sin IA es más largo («añadir requisitos») | Aceptarlo explícitamente (ADR-013). «Usar ejemplo» queda a un clic |
| Más peso del chunk de misión por Ajv en runtime | Carga diferida. Precompilar `mission-*` solo si la salida va dentro de `shared/` (nunca en `apps/web`, que es ESM) y con `check-vercel-function` en verde. Se pospone |
| El cuerpo de `explain` incluye el brief (hasta 3000 caracteres) y tiene un tope de 24 KB | Sin cambios. El texto junto al botón es el del equipo |
| Prefetch de las 7 capas: 6 son PNG de 1,1 a 1,2 MB | Opcional: prefetch solo de la capa seleccionada en móvil. Los WebP v3 serían archivos nuevos (no científicos) y se aplazan |
| Los fondos HLS de Domeyko y María Elena (v2) y la etiqueta «Norte de Chile» sobre ventanas argentinas | Mostrar solo las capas cuyo `site_id` exista en el snapshot activo, y rotular la región en la UI sin editar `basemaps.json`. Decisión del equipo |
| Gobierno: el `CLAUDE.md` y el `NEXT_TASK` de dev dicen que Claude no tiene asignación | Registrar en STATUS, CHANGELOG y NEXT_TASK que el usuario pidió directamente esta integración y el push |
| Push a dev = despliegue inmediato, porque el workflow no corre tests | F7 exige `verify` en local antes del push. Si el workflow falla, se corrige con un commit nuevo, nunca con `--force` |

## 11. Fusión de M9/M10 del equipo (2026-11-15, `origin/dev` `d2252b6`)

`origin/dev` avanzó de `92392f1` a `d2252b6` (M9: contexto geológico oficial por sector; M10: geología en la orientación de pruebas con IA; robustez de la función Vercel). Se fusionó sin squash. Todo lo del equipo queda **intacto**: `shared/`, `server/`, `api/`, `vercel.json`, `.github/`, `check-vercel-function.mjs`, `package.json` raíz y `package-lock.json`, contratos y artefactos `geology-context-v1`, pipelines científicos, evidencias y sus tests (`aiGeology`, `geologyGuidance`, `plannerGeology`, `plannerState`, `aiLive`, `test_geology_*`). Difieren desde antes de esta fusión, y no por ella: `apps/web/package.json` (`build` ejecuta `build-validators.mjs --check` desde la integración anterior; `vercel build` + `check-vercel-function.mjs` verificados) y, desde el rediseño, `pipelines/fetch_basemaps.py`, `artifacts/basemaps/` y `contracts/reference-analog.schema.json`. Su UI se **portó** a la interfaz integrada, con los mismos textos y garantías.

| Del equipo (dev) | En la interfaz integrada |
|---|---|
| `App.tsx` carga `loadGeologyContext` tras el snapshot | `App.tsx` lo pide en un momento ocioso por `data/loadAppGeology.ts` (chunk diferido: el validador usa Ajv en runtime). `AppData.geology` (opcional) lleva el estado y los sectores con ficha válida (`selectGeologySite`). Nunca bloquea nada |
| `CandidateDetails` › `GeologyContext` (cobertura, unidades, procedencia, «Descargar contexto geológico (JSON)») | Pestaña **«Geología»** de la ficha (riel 520 px y hoja S2), después de «Origen»: `shell/detail/GeologyTab.tsx` monta `GeologyContext` del equipo sin cambios. Sus estilos pasan de `styles.css` a `shell/detail/geology.css` (se cargan con la pestaña) |
| `ScoreBreakdown`: texto del criterio geológico pendiente con contexto | `MetricDetails` (Métricas) con `domain/geologyCopy.ts`: mismo texto; el criterio sigue «por calcular» y fuera del puntaje |
| «Dónde falla la analogía»: limitación histórica actualizada | Pestaña «Fuentes»: mismo reemplazo, pero «se consulta en la pestaña «Geología»» en vez de «arriba» (el panel ya no está arriba) |
| `usePlanner(bundle, geology)` › `GeologyUi`, `runExplain(withGeology?)`, exportación geológica | `missionController`: `setGeology`, catálogo cerrado por evaluación (`buildGeologyCatalog`, memorizado), `runExplain(withGeology?)` con `geologyContextFp`, `geology_context_changed`, `exportGeologyJson` (`buildMissionGeologyExport`) y `api().geologyUi`. El armazón registra el estado con `registerMissionGeology` (`runLoader`) |
| `ResultView` › `AiPanel`: casilla «Incluir orientación geológica…», aviso único condicional, «Reintentar sin geología» | La Lectura (`AiControls`), donde vive «✦ Destacar motivos con IA»: mismos textos (constantes en `explanationToReading.ts`, cotejadas con el `AiPanel` del equipo en `ReadingView.test`). La casilla se deshabilita mientras la solicitud está en curso |
| `ResultView` › `GeologyGuidance` y `PrintGeology` | «Tu misión» (`ResultView` compacto) lleva `GeologyGuidance` del equipo sin cambios **plegado después de exportar** (`<details>` cerrado; el resumen dice «Orientación geológica para esta prueba», el rótulo del equipo —«Selección por IA» u «Orientación general sin IA»— y el número de sectores), con una línea que indica que la selección con IA se pide en la Lectura. Desplegada en línea sumaba 4.100–5.200 px a una franja de 344–676 px y dejaba «Descargar JSON» y «Volver a editar» 4–5 veces más abajo. El informe imprimible (`MissionPrintReport`) recibe `missionStore.geologyCatalog` e incluye `PrintGeology` |
| `PlannerPanel(snapshot, intent, geology)` | Envoltorio con la misma firma: `usePlanner(bundle, geology)` + `PlannerView`, que pasa `geologyUi` a `ResultView` |

**Garantías comprobadas:** la IA solo elige ids del catálogo cerrado; el reductor del equipo descarta toda respuesta cuyo contexto, catálogo, solicitud o evaluación no coincida; recibir el contexto o la selección no cambia `state.result` ni sus huellas (`MissionControllerGeology.test.ts` recalcula y compara); sin opt-in no se envía la huella y una respuesta con geología no pedida se descarta; la exportación M8 1.0 no cambia y la geológica valida con `validateAnyMissionExport`.

**ADR:** el equipo numeró ADR-010 (contexto geológico, aceptado) y ADR-011 (orientación geológica) en dev. Los nuestros con esos números pasan a **ADR-014** (escenario fijo, propuesto) y **ADR-015** (recálculo en cliente, sustituido); ADR-012 y ADR-013 no cambian. Los bloques históricos de STATUS y CHANGELOG conservan la numeración de su fecha.

