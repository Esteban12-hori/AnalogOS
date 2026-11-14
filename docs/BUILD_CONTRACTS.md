# Contratos de construcción en paralelo (rediseño Explorar / Misión)

Este documento reparte los incrementos 3 a 10 de `docs/UX_REDESIGN.md` §7.1 entre **8 constructores que trabajan a la vez en worktrees separados**. Cada uno edita solo su carpeta y los archivos que se le asignan aquí. Lo demás pertenece al **integrador**.

- **Base:** rama `feature/mision-redesign`, en el commit que introduce este documento (`git log -1 -- docs/BUILD_CONTRACTS.md`). Ese commit trae los incrementos 0, 1 y 2: contratos, tokens, store, armazón y slots con stubs.
- **Especificación:** `docs/UX_REDESIGN.md`. Decisiones: ADR-008, ADR-009 y ADR-010 (`docs/decisions/`, en estado propuesto).
- **Reglas del proyecto:** `CLAUDE.md` y `AGENTS.md`. Las más sensibles aquí:
  - la IA nunca puntúa ni produce cifras;
  - similitud, confianza y factibilidad van siempre separadas;
  - nada se inventa: lo que no existe se muestra como «por calcular»;
  - offline primero: lktron es opcional;
  - TypeScript estricto y sin `any`;
  - **0 dependencias npm nuevas** (§6.2);
  - teclado, foco visible y `prefers-reduced-motion` obligatorios.

---

## 1. Reglas comunes para los 8 constructores

1. **Propiedad.** Edita solo tu carpeta `apps/web/src/features/<key>/` y los archivos que la tabla del §2 te asigna. Si necesitas cambiar un archivo compartido (§4), no lo toques: descríbelo en tu entrega y lo aplica el integrador.
2. **Interfaz estable.** Tu `index.ts` exporta tipos y firmas que otras features ya consumen.
   - **Puedes:** añadir exports y añadir campos **opcionales**.
   - **No puedes:** renombrar, quitar ni cambiar el tipo de lo que ya está firmado.
   - **Guardia:** `apps/web/src/tests/featureContracts.test.ts` falla si falta un export.
3. **Consumo entre features.** Importa de otra feature solo desde su `index.ts` (`import { X } from '../places'`), nunca de un archivo interno.
   - Del armazón, solo `apps/web/src/shell/public.ts`.
   - Del estado compartido, solo `apps/web/src/state/ui.ts` (`useUi`, `uiActions`) y `apps/web/src/state/mission.ts` (`useMission`, `missionStore`).
   - Para tipos de contrato: `domain/contracts.ts` y `domain/aiContracts.ts`, con `import type` cuando sea posible.
4. **Implementación actual.** Hoy cada `index.ts` apunta a un **stub honesto**: no inventa cifras y rotula «por calcular». Reemplaza el stub por la implementación real dentro de tu carpeta.
5. **Tests.**
   - Van en tu carpeta: `features/<key>/*.test.ts(x)`. Vitest los recoge solo y corren en Node, sin jsdom. Prueba funciones puras y renderiza con `react-dom/server` (`renderToStaticMarkup`).
   - No edites tests compartidos de `apps/web/src/tests/`.
   - Si un test del stub deja de aplicar porque lo implementaste (p. ej. el de «por calcular» del motor), avisa al integrador.
6. **Estilos.**
   - Cada feature trae su propio CSS, importado por sus componentes, con prefijo de clase propio: `.places-*`, `.globe-*`, `.metrics-*`, `.leaders-*`, `.boot-*`, `.composer-*`, `.analysis-*`. Los stubs usan `*-stub`: bórralos.
   - Usa los tokens de `shell/tokens.css`: `--ease-*`, `--dur-*`, `--stagger-*`, `--o-busy`, `--o-dim`, colores con significado, `--fs-*`, `--marker-bg`, `--focus-ring`.
   - Usa los glifos de `GLYPH` (`shell/glyphs.ts`).
   - **No** uses `backdrop-filter`: el blur pertenece solo a las superficies del armazón (≤3 en escritorio, 1 en móvil).
   - **No** estilices clases del armazón (`.app`, `.dock`, `.rail`, `.sheet`, `.topbar`…).
7. **Movimiento** (§2.2). Anima solo `transform` y `opacity`. Ningún bucle supera 4,8 s. Ninguna cifra se interpola. Con reduced motion: sin translate, scale ni rotate y con opacidad ≤150 ms.
   - Lee la preferencia con `useReducedMotion()` o `prefersReducedMotion()`, que vienen de `shell/public`.
   - No hay `setState` por cuadro: la manipulación directa va por ref o por variable CSS.
8. **Anuncios.** No crees regiones `aria-live` propias. Usa `announce(texto)` o `announce(texto, 'alert')` de `shell/public`. Única excepción: el carrusel de métricas en móvil, según el patrón APG.
9. **Peso** (§6.1). Lo que no cabe en el chunk principal se carga con `lazy()` o `import()`.
   - `validators.mission.generated.js` y `domain/aiContracts.ts` pesan: impórtalos solo desde código diferido (motor, composer en envío y análisis).
   - Presupuesto total del chunk principal: **+≤12 KB gz** de JS y **+≤5 KB gz** de CSS frente a `857b05f`. El armazón ya consumió +2,6 KB de JS y +1 KB de CSS.
10. **Datos.** Toda cifra viene del snapshot (`data.snapshot`) o del motor (`features/engine`).
    - Fixtures solo en `tests/fixtures/` y marcados `FIXTURE`.
    - No regeneres `artifacts/science-v2/` ni `submission/`.
11. **Entrega.**
    - `npm run test` y `npm run build` en verde en tu worktree, y `/tmp/claude-venv314/bin/python -m pytest -q` si tocaste Python.
    - Commit en tu rama con mensaje en español.
    - Mensaje final con: archivos tocados, exports nuevos, cambios pedidos a archivos compartidos y riesgos.

### Worktree

```sh
git worktree add ../AnalogOS-<key> -b feature/mision-<key> feature/mision-redesign
cd ../AnalogOS-<key> && npm ci          # o: ln -s ../AnalogOS/node_modules node_modules
npm run test && npm run build
```

---

## 2. Propiedad de archivos, slot e interfaz por feature

Todas las rutas son relativas a `apps/web/src/`, salvo que empiecen por la raíz del repo (`config/`, `tests/`, `artifacts/`).

### 2.1 `places` · incremento 3 · PlaceRail y catálogo de ◆

**Archivos propios:**
- `features/places/**`
- `config/reference_analogs.json` (nuevo). Valida contra `contracts/reference-analog.schema.json` con `parseReferenceAnalogs`. Solo entran los ◆ con fuente citada.

**Slots:**

| Slot | Dónde se monta | Componente |
|---|---|---|
| `dock.places` | ≥1100, fila superior del dock (contenedor de consulta `dock`) | `<PlaceRail placement="dock">` |
| `sheet.tray.places` | <1100, bandeja S0 | `<PlaceRail placement="sheet">` |
| `sheet.list` | S1/S2 sin selección | `<PlaceRail placement="sheet" listView>` |
| `rail.reference` | riel con un ◆ seleccionado | `<ReferenceCard>` |
| `sheet.reference` | hoja con un ◆ seleccionado | `<ReferenceCard>` |

**Interfaz:**
- `PlaceRail(props: PlaceRailProps)`, con `{ data, placement: 'dock' | 'sheet', listView?, onListViewChange? }`.
- `ReferenceCard({ data, analogId })`.
- `useReferenceAnalogs(): ReferenceAnalogsState`.
- `loadReferenceAnalogs(): Promise<ReferenceAnalogsState>`.
- `ReferenceAnalogsState = loading | ready{analogs} | unavailable{reason}`.

**Consume:**
- `useUi`: `selection`, `mode`, `missionPhase`, `hoverSiteId`.
- `uiActions.select` (con `kind: 'reference'` para un ◆) y `uiActions.setHover`.
- `useMission`: `scoring` y `profile`, para el orden y los % en Misión.
- `rankCandidates`.

**Notas:**
- Se dibuja en cuanto `data.status === 'ready'`.
- Durante la espera de la IA, los resultados previos van a `--o-busy` con `aria-busy` y sin `inert`.
- `onListViewChange` todavía no se cablea: lo agrega el integrador si se necesita.

### 2.2 `globe` · incremento 4 · marcadores ●◆○, vuelo y agrupación

**Archivos propios:**
- `features/globe/**`: `MapStage.tsx`, `MapStage.css`, `CandidateGlobe.tsx`, `CandidateGlobe.css`, `CandidateFlatMap.tsx`, `CandidateMap.tsx` y `stageBridge.ts`.
- `domain/globe.ts`.
- `tests/globe.test.ts` y `tests/mapStage.test.ts`.

**Slot:** `stage`, el escenario a pantalla completa (`.stage`). Queda `inert` y en pausa en S2.

**Interfaz:**
- `MapStage(props: MapStageProps)`, con estas props:
  - `candidates`, `chileOutline`, `visual`;
  - `selectedId: string | null`;
  - `onSelect`;
  - `insets` (márgenes asentados → `setViewOffset` / `setPadding`);
  - `baseInsets` (encuadre global, umbrales 2D, póster);
  - `focusSignal`;
  - `paused?`;
  - `onMilestone?('globe' | 'texture', 'ok' | 'error')`;
  - `hudSlot?: ReactNode` (franja de leyenda).
- `contextLayers()`.
- Canal por cuadro:
  - `publishStageFrame({ projection, anchor })` (solo el globo publica);
  - `getStageProjection(): StageProjection | null`;
  - `getStageAnchor(): StageAnchor | null`;
  - `subscribeStageFrame(cb)`.
- Tipos `ScreenPoint`, `StageProjection`, `StageAnchor`.

**Consume:**
- `useUi`: `selection`, `hoverSiteId`, `introPhase` (aterrizaje de la coreografía A, que escribe `boot`) y `cameraTouchedAt`.
- `uiActions.touchCamera()` ante cualquier input de cámara.
- `useReferenceAnalogs()` de `places`, para los ◆.
- `useMission(scoring)`, para el orden de halos en la coreografía D.

**Notas:**
- Las funciones nuevas de geometría o vuelo van en `features/globe/`.
- `domain/mapZoom.ts` es de `boot`: impórtalo, no lo edites.

### 2.3 `metrics` · incremento 5 · MetricRail, buildMetricViews y S1

**Archivos propios:**
- `features/metrics/**`.
- `breakdown/**` (`ScoreBreakdown.tsx`, `score-breakdown.css`). Puedes reemplazarlo o retirarlo si tu `MetricRail` lo sustituye.

**Slots:**

| Slot | Dónde se monta | Componente |
|---|---|---|
| `rail.metrics` | riel de 340–380 px (≥1440, o pestaña «Métricas» en 1100–1439) | `<MetricRail variant="rail">` |
| `full.metrics` | pestaña «Métricas» de la ficha completa (520 px o S2) | `<MetricRail variant="full">` |
| `sheet.s1` | <1100, detent S1 | `<MetricRail variant="sheet">` |

**Interfaz:**
- `MetricRail({ data, site, variant, onShowOnMap? })`.
- `buildMetricViews(input: BuildMetricViewsInput): MetricView[]`, función pura, ordenada por peso del perfil activo.
- Tipo `MetricView`, con estos campos:
  - `criterionId`, `label`, `weight`, `baseWeight`, `status`, `similarity`;
  - `siteValue`;
  - `marsValue`: solo pendiente, rugosidad y relieve; null en el resto;
  - `rule`;
  - `vsMars`;
  - `isLimiting` y `contribution`: el limitante sale de `contribution`;
  - `saturates`;
  - `sharedRegionalWith`;
  - `quality` y `datasetId`.

**Consume:**
- `useUi`: `activeCriterionId` y `previewCriterionId`; escribe con `setActiveCriterion` y `setPreviewCriterion`.
- `useMission`: `profile.weights` y `scoring`, para las contribuciones con el perfil de misión.
- `snapshot.marsReference`.

**Notas:**
- La cabecera del lugar (`● nombre` + ✕) la pone el armazón. Tu variante `sheet` muestra «% · ‹ ›» y el contenido.

### 2.4 `leaders` · incremento 6 · líneas Tesla

**Archivos propios:** `features/leaders/**`.

**Slots:**

| Slot | Dónde se monta | Componente |
|---|---|---|
| `stage.overlay` | capa fija sobre el escenario, bajo los paneles (`pointer-events: none`) | `<LeaderLayer>` |
| `stage.hud` | franja de leyenda del escenario, por `hudSlot` | `<LeaderToggle>` (interruptor «Líneas») |

**Interfaz:**
- `LeaderLayer({ data })` y `LeaderToggle()`.
- `pickPrincipalMetrics(views, count = 4)`.
- `layoutLeaders(input: LeaderLayoutInput): LeaderLayout`, con `mode: 'lines' | 'docked' | 'chip'`.
- Tipos `Rect`, `LeaderLayoutInput` y `LeaderLayout`.

**Consume:**
- Canal por cuadro de `globe`: `subscribeStageFrame`, `getStageAnchor` y `getStageProjection`.
- `buildMetricViews` y `MetricView` de `metrics`.
- `useUi`: `selection`, `activeCriterionId`, `stageInsets` (área segura) y `obstacles` (rects de paneles con `data-obstacle`).
- `useMission(profile)`.

**Notas:**
- Nunca hace `setState` por cuadro.
- No se dibuja con un ◆ seleccionado.
- En móvil, una sola línea hasta el borde superior de la hoja.

### 2.5 `boot` · incremento 7 · Loading WOW «Órbita honesta»

**Archivos propios:**
- `features/boot/**`, incluido `loadingHints.ts`: plugin de Vite, código de Node, nunca importado por la app.
- `boot/posterLayout.js` y `boot/posterLayout.d.ts`.
- `content/shell.ts`: HTML estático previo a React. Debe reflejar las cajas de `AppShell`.
- `data/preload.ts`.
- `domain/mapZoom.ts`.
- `tests/boot.test.ts` y `tests/mapZoom.test.ts`.

**Slots:**

| Slot | Dónde se monta | Componente |
|---|---|---|
| `stage.overlay` | sobre el escenario | `<BootLayer>` (anillo, satélite, bitácora, revelado) |
| `topbar.status` | derecha de la barra superior | `<StatusChip>` (la bitácora se pliega en el chip) |

**Interfaz:**
- `BootLayer({ data })` y `StatusChip({ data })`.
- `OrbitLoader({ active, label, placement? })`, reutilizable para la espera de la IA.
- `reportBootMilestone(m, status)`, `getBootMilestones()` y `useBootMilestones()`.
- Tipos `BootMilestone = 'snapshot' | 'globe' | 'texture'` y `MilestoneStatus`.

**Consume:**
- `useUi(introPhase)`; escribe con `setIntroPhase`.
- `useReferenceAnalogs()` de `places`, para «8 por calcular».

**El armazón ya cablea:**
- `reportBootMilestone('snapshot', …)` al validar o fallar el snapshot.
- `MapStage.onMilestone` → `globe` / `texture`.

**Notas:**
- `?intro=full` fuerza la intro.
- El póster debe seguir coincidiendo al píxel con `baseStageInsets`: lo verifica `boot.test.ts`.
- Si cambian las alturas reservadas, pídelo al integrador: viven en `shell/stageGeometry.js` y `shell/shell.css`.

### 2.6 `engine` · incremento 8 · motor de misión determinista (sin UI)

**Archivos propios:**
- `features/engine/**`.
- `tests/fixtures/engine/**` (nuevo).
- `tests/test_engine_parity.py` (nuevo): genera o verifica la paridad con `pipelines/scoring.py`.

**Slot:** ninguno. Es una librería pura que se importa de forma diferida.

**Interfaz:**
- `aggregate(criteria, inputs, epsilon, minimumValidWeight): AggregateResult`: port de `pipelines/scoring.py`, paridad ≤1e-6.
- `sensitivity(...)`.
- `levelsToWeights(levels)` y `profileFromLevels(levels, base, label?)`, que produce el id `mission:<fnv>`.
- `scoreMission({ profile, candidates, base }): MissionScoring`.
- `matchMissionDemo(text): DemoMatch | null`, el matcher «DEMO · sin IA».
- `nextMissionPhase(phase, event)`.
- Constantes `MISSION_PRESETS`, `PHASE_THRESHOLDS` (3/10/20 s) y `ENGINE_VERSION`.
- Tipos en `types.ts`: `MissionProfileDraft`, `ScoredSite`, `MissionScoring`, `MissionPreset`, `DemoMatch`, `MissionPhaseEvent`, `AggregateInput`, `AggregateResult`, `SensitivityResult`…

**Consume:** solo `domain/*`. No lee stores.

**Notas:**
- Al implementarlo, `ENGINE_VERSION` deja de terminar en `-stub`, y el test de stub de `featureContracts.test.ts` se salta solo.
- `matchMissionDemo` devuelve un `mission-interpretation/1` con `engine: 'demo'`.

### 2.7 `composer` · incremento 9 · composer, «Tu misión», historial y coreografía de resultados

**Archivos propios:** `features/composer/**`.

**Slots:**

| Slot | Dónde se monta | Componente |
|---|---|---|
| `dock.composer` | ≥1100, fila inferior del dock | `<Composer placement="dock">`. El popover «Tu misión» de 1100–1439 lo abre el propio Composer. |
| `sheet.tray.composer` | S0 | `<Composer placement="sheet">` |
| `sheet.head` | cabecera de S1 | `<Composer placement="sheet-head" onRequestTray>` (botón «✦ Refinar») |
| `left.mission` | ≥1440 en Misión, sección superior del panel izquierdo | `<MissionCard placement="panel">` |
| `full.mission` | pestaña «Tu misión» de S2 | `<MissionCard placement="sheet">` |

**Interfaz:**
- `Composer({ data, placement, onRequestTray? })`.
- `MissionCard({ data, placement })`.
- `focusComposer()`.

**Orquesta la misión.** Es el **único escritor** de `state/mission.ts`:
1. `uiActions.setMissionPhase('interpreting')` y `resetCameraTouch()`.
2. Interpreta con `interpretWithLktron` de `analysis` si `LKTRON_ENABLED`; si no, con `engine.matchMissionDemo`.
3. Fase `profile`: `engine.profileFromLevels`.
4. Fase `scoring`: `engine.scoreMission`. Escribe `missionStore` (`revision + 1`) y deja el #1 en `uiActions.select(id, 'evaluated', true)` (vista previa).
5. Pasa a `analysis`.

**Además:**
- Muestra la espera con `OrbitLoader` de `boot`.
- Hace un solo anuncio con `announce()`.
- La tecla «/» y Esc (cancelar) son suyas.

### 2.8 `analysis` · incremento 10 · hechos, evidencia, robustez, Lectura y lktron

**Archivos propios:**
- `features/analysis/**`.
- Análisis pregenerado nuevo, **fuera** de `artifacts/science-v2/`. Ruta sugerida: `artifacts/analysis/ai-analysis.default.json`, rotulado no científico.
  - Si se empaqueta, pide al integrador extender `scripts/package_release.py`.

**Slots:**

| Slot | Dónde se monta | Componente |
|---|---|---|
| `left.reading` | ≥1440 en Misión, sección inferior del panel izquierdo | `<ReadingPanel placement="panel">` |
| `rail.reading` | 1100–1439, pestaña «Lectura IA» del riel | `<ReadingPanel placement="rail">` |
| `full.reading` | pestaña «Lectura IA» de la ficha completa o S2 | `<ReadingPanel placement="full">` |
| `pill.reading` | ≥1100 en Explorar, arriba a la izquierda | `<ReadingPill>` |

**Interfaz:**
- `ReadingPanel({ data, placement })` y `ReadingPill({ data })`.
- `LKTRON_ENABLED: boolean`.
- `interpretWithLktron(request, signal?): Promise<LktronResult<MissionInterpretation>>`.
- Tipo `LktronResult<T>`.

**Consume:**
- `useMission`: `scoring`, `profile` e `interpretation`.
- `useUi(missionPhase)`: cuando la fase es `analysis`, arma `evidence-packet/1` (FNV-1a 64), valida cada evento `ai-analysis/1` (§5.5) y termina con `setMissionPhase('done')`, también si solo hay hechos.
- `buildMetricViews` de `metrics`.
- `sensitivity` de `engine`, para la robustez con perfil de misión.
- `OrbitLoader` de `boot`.

**Contratos:** `domain/aiContracts.ts` (`checkEvidencePacket`, `checkAiAnalysisEvent`, `checkMissionInterpretation`).

---

## 3. Estado compartido: quién escribe qué

| Campo | Escribe | Lee |
|---|---|---|
| `ui.mode` | armazón (pestañas), composer («/», Refinar) | todos |
| `ui.selection` | armazón, places, globe (vía `onSelect`), composer (vista previa del #1) | todos |
| `ui.hoverSiteId` | places | globe |
| `ui.activeCriterionId` / `previewCriterionId` | metrics, analysis | leaders, metrics, analysis |
| `ui.stageInsets` / `ui.obstacles` | **solo el armazón**, al asentarse | leaders, globe (vía props) |
| `ui.missionPhase` | composer (`idle → interpreting → profile → scoring → analysis`, `error`, `cancelled`), analysis (`analysis → done`) | composer, places, analysis, boot |
| `ui.introPhase` | boot | globe |
| `ui.cameraTouchedAt` | globe (`touchCamera`), composer (`resetCameraTouch`) | composer |
| `missionStore` (`state/mission.ts`) | **solo composer** | places, metrics, leaders, globe, analysis |
| `stageBridge` (por cuadro) | **solo globe** | leaders |

---

## 4. Archivos compartidos: solo los edita el integrador

Si una feature necesita un cambio aquí, lo pide en su entrega.

| Área | Archivos |
|---|---|
| Armazón | `App.tsx`, `main.tsx`, `styles.css` y `shell/**`: `AppShell`, `RightRail`, `ModeTabs`, `Tabs`, `LiveRegion`, `announce`, `appData`, `public`, `layout`, `stageGeometry.js/.d.ts`, `shell.css`, `tokens.css`, `glyphs`, `placeLabel`, `useReducedMotion`, `useViewportLayout`, `sheet/**`, `detail/**` |
| Estado | `state/store.ts`, `state/ui.ts`, `state/mission.ts` |
| Dominio y contratos | `domain/contracts.ts`, `domain/aiContracts.ts`, `domain/formatting.ts`, `domain/scoring.ts`, `domain/marsReference.ts`, `domain/surfaceSeries.ts`, `domain/validators*.generated.*`, `scripts/build-validators.mjs` (+ `--check` en el build), `contracts/*.schema.json`, `tests/fixtures/contracts/**`, `tests/test_ai_contracts.py` |
| Datos | `data/loadDemoSnapshot.ts`, `data/loadVisualContext.ts`, `data/loadBasemaps.ts` |
| Contenido existente | `components/**` (Señal, Comparar, contexto satelital) y `liquid/**` |
| Tests del armazón | `tests/featureContracts.test.ts`, `tests/shell.test.tsx`, `tests/uiStore.test.ts`, `tests/resolveDetent.test.ts`, `tests/reducedMotion.test.ts`, `tests/aiContracts.test.ts`, `tests/validators.test.ts`, `tests/snapshot.test.ts`, `tests/basemaps.test.ts`, `tests/surfaceSeries.test.ts`, `tests/visualContext.test.tsx` |
| Configuración | `vite.config.ts`, `package.json`, `package-lock.json`, `tsconfig.json`, `vercel.json`, `scripts/**` |
| Documentación | `docs/**` (incluidos los ADR), `project/**`, `README.md`, `CLAUDE.md`, `AGENTS.md` |
| Artefactos | `artifacts/science-v2/**` y `submission/**`: **nadie los regenera** |

---

## 5. Mapa de slots del armazón

```
┌ topbar ─ brand · ModeTabs (Explorar|Misión) · [topbar.status → boot.StatusChip] ─────┐
│ aviso científico fijo                                                                 │
├──────────────┬────────────────────────────────────────────────┬──────────────────────┤
│ ≥1440 Misión │  stage → globe.MapStage                         │ rail (≥1100, con     │
│ left-panel   │  stage.overlay → leaders.LeaderLayer,           │ selección)           │
│ left.mission │                 boot.BootLayer                  │  rail.metrics        │
│ left.reading │  stage.hud (hudSlot) → leaders.LeaderToggle     │  rail.reading (1100– │
│              │  pill.reading (Explorar) → analysis.ReadingPill │  1439, pestaña)      │
│              │                                                 │  rail.reference      │
│              ├─ dock (≥1100) ──────────────────────────────────┤  «Ver ficha → 520»:  │
│              │  dock.places → places.PlaceRail                 │  full.metrics ·      │
│              │  dock.composer → composer.Composer              │  full.reading · Señal│
└──────────────┴─────────────────────────────────────────────────┴  Comparar · Método · │
                                                                    Fuentes             │
<1100: una hoja (#mode-panel)                                                            │
  S0 → sheet.tray.places + sheet.tray.composer                                            │
  S1 → sheet.s1 (metrics) · sheet.head (composer «✦ Refinar») · sheet.list sin selección  │
  S2 → ficha completa: full.metrics · full.reading · full.mission (Misión) · Señal…       │
```

Cada envoltorio lleva `data-slot="<nombre>"` en el DOM, para tests y QA.

---

## 6. Orden de integración sugerido

1. `engine`: puro, sin UI; desbloquea la paridad.
2. `places`, `globe`, `metrics` y `boot`, en cualquier orden: tocan carpetas disjuntas.
3. `leaders`: consume `globe` y `metrics`.
4. `analysis` y `composer`: consumen `engine`, `boot.OrbitLoader` y `metrics`.

El integrador fusiona cada rama en `feature/mision-redesign`. En cada paso corre `npm run test`, `npm run build`, pytest y la verificación en navegador, y actualiza `project/STATUS.md`.
