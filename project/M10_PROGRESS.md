# M10 — Progreso y cierre (Claude → Codex)

**Estado vigente:** completado, revisado y publicado/verificado en dev por Codex (4708b42). Las rondas siguientes son historia de implementación. Cierre y evidencia final en docs/DEV_AI_VERIFICATION.md.

## Qué se entregó

- **Núcleo compartido** `shared/geology/`: `context.ts` (validador M9 movido, único; `apps/web/src/domain/geologyContext.ts` ahora reexporta), `guidance.ts` (catálogo cerrado, selección, vista, huellas), `aiSchema.ts`, `exportWrapper.ts` (wrapper + validador + detección de formato).
- **Servidor**: `server/ai/geology.ts` (carga/valida el paquete oficial + SHA-256 de bytes de candidatos), `handler.ts`/`operations.ts`/`prompts.ts` (canal opt-in, errores 409 antes de la clave y del proveedor, esquema/prompt/`max_tokens` propios solo con canal), `nodeAdapter.ts`.
- **Web**: `GeologyGuidance.tsx` (sección + impresión), `ResultView.tsx` (casilla opt-in con aviso de qué se envía, reintento sin geología, botón de exportación con geología), `usePlanner.ts`, `plannerState.ts` (registro geológico separado), `aiClient.ts`, CSS.
- **Contratos/ops**: `contracts/mission-geology-export.schema.json` (nuevo; los de M8 y M9 intactos), `vercel.json` (`includeFiles` acotado), `scripts/check-vercel-function.mjs` (ejercita geología empaquetada, ausencia y corrupción aisladas).
- **Docs**: ADR-011 (proposed), `docs/AI_SETUP.md`, `docs/GEOLOGY_CONTEXT.md`, ADR-010 (notas de superación), STATUS, CHANGELOG.

## Decisiones locales (reversibles; revisar)

1. Topes 3/sector y 12 totales **duros**; sin campo de justificación (evita texto libre). Si Codex quiere «más cupo con justificación», requiere un campo cerrado.
2. Solo sectores evaluados y **no descartados** reciben referencias; los descartados figuran con su razón.
3. Casilla geológica **marcada por defecto** cuando el contexto está disponible; el texto junto a ella declara que viajan objetivo (brief) y cartografía pública. Cámbiese a desmarcada si se prefiere opt-in estricto por sesión.
4. `max_tokens` 6000 con canal geológico (2000 se truncaba en la prueba real con el modelo actual, que además razona antes de responder).
5. Tolerancia de ruido numérico 1e-8 (la de `available`) para hueco/solape: el sector AR-6 trae 1e-15 de solape en una unidad.
6. Export con geología es un **segundo botón**; «Descargar JSON» sigue emitiendo M8 1.0 exacto.

## Verificación ejecutada

```sh
source .venv/bin/activate && npm run verify   # 316 Python; 314 web (+3 omitidas: reales opt-in); typecheck servidor, build
npm run release:package                        # repetido idéntico
git diff --check
ANALOGOS_LIVE_AI=1 npm -w apps/web run test -- src/tests/aiLive.test.ts -t "orientación geológica" --silent=false
```

- Web: 314 pasan (antes 246): `geologyGuidance` (39), `aiGeology` (16), `plannerGeology` (13) y los existentes sin tocar. Python sin cambios (316).
- ZIP: 31 entradas, 13.246.742 bytes, SHA-256 `b2153f69c07be2edc1980c86d7d3eab6b8839b3556c0b244b6b618f8988a1b44`, repetido idéntico; sin `sk-ant` en el bundle. Baseline `/tmp/analogos-m10-baseline-hashes.json` (24 entradas) intacto; `artifacts/` sin cambios.
- **IA real (2026-11-14)**, dos objetivos contrastantes con el paquete real: movilidad → 10 refs (`caracterizar_material_superficial`, `resolver_ambiguedad`, `verificar_hueco…`, `correspondencia…`), muestreo → 12 refs (casi todas `diversidad_litologica_muestreo`); selecciones distintas y válidas (`differs: true`). Request IDs `req_011Ch3qnoRvrnHh2fbbzHiML` y `req_011Ch3qogrowSADrgjvx6T5K`; ≈25.300 tokens de entrada y ≈1.850 de salida cada una. La primera prueba real falló por truncamiento (`max_tokens`): corregido y cubierto por prueba.
- Función empaquetada: **emulada** (tsc CommonJS a `/tmp/m10-fn/api.func`, archivos copiados como `includeFiles`): GET 405, POST sin clave 503, geología incluida y validada (409 con huella ajena, 503 con la correcta), ausencia y corrupción aisladas → `geology_context_unavailable`; quitar los candidatos hace fallar el script.

## Brechas honestas

- **No hay `vercel build` real aquí** (sin CLI/token): no se verificó que Vercel acepte el glob con llaves de `includeFiles` ni la disposición real de archivos; el paso de CI «Comprobar arranque de la función empaquetada» lo ejercita antes de desplegar y fallará si falta algo. Codex debería comprobarlo en el primer deploy.
- Sin QA en navegador (escritorio/390 px/teclado/offline/descarga): solo render SSR y pruebas de estado. La UI nueva usa ≥12 px y controles nativos, pero no se vio en pantalla.
- La respuesta de la IA incluye por sí sola sectores que M8 destacaría igual; no se mide calidad científica de la selección. No hay validación de campo ni de equivalencia planetaria.
- La web no calcula SHA-256 de bytes; el wrapper declara la identidad del paquete completo sin poder recalcularla.
- Prompt grande (≈25 k tokens de entrada) por consulta con geología; sin optimizar.
- Archivos grandes nuevos/no versionados: ninguno. `submission/analogos-static.zip` y su `.sha256` se regeneraron (cambia el bundle).

## Ronda 2 — correcciones de `docs/CODEX_M10_REVIEW.md`

- **Integridad del wrapper**: el catálogo incluye `subset_fingerprint` (SHA-256 del JSON canónico de los subconjuntos `geology-export` exactos de los sectores usados: geometría, unidades, fuente, citas, peticiones, metadatos); va en `catalog_fingerprint`, en `context_identity` y en el catálogo declarado, y se recalcula al validar sin el paquete completo. `context_fingerprint` sigue siendo la identidad declarada del paquete completo (no verificable desde el archivo). Con `bundle`, cada subconjunto se ancla a los candidatos del snapshot (país, nombre y geometría exactos: `validateGeologyExport(data, candidate)`). El constructor exige `{ bundle }`, valida el contexto con `parseGeologyContext` contra esos candidatos y audita el M8 embebido.
- **M8 embebido**: `auditMissionExport` reconstruye con `buildMissionExport` (solicitud + snapshot + registros de IA) y compara entero cuando hay bundle; sin bundle comprueba contrato, huellas, `checkSelection`, huella del brief/propuesta y `user_changes`. `validateAnyMissionExport` lo aplica también al M8 1.0 suelto (el export real de M9 sigue válido).
- **Repros** `/tmp/analogos-m10-independent-review.mjs`: ahora los tres se rechazan (geometría ≠ candidato; huella de subconjuntos/catálogo/guía; «Sector ajeno a la evaluación: inventado»).
- **Otros bordes**: `root` explícito, incluida la cadena vacía, aísla de verdad; caché del loader con identidad del bundle; `check-vercel-function.mjs` copia la función a un directorio temporal fuera del checkout, corre desde ahí y restaura el cwd.
- **UI/prompt**: fuente oficial clicable (https) y URL impresa en la versión imprimible; cada unidad muestra % incluyendo solapes y % sin solape, con aviso de que no se suman y de que el mapa no localiza unidades dentro del sector; el prompt manda fracciones sin redondear (más sin solape y solape), URL de fuente y límites; aviso de envío único y condicional según la casilla; sin jerga «M8» visible; la acción de IA va antes de las fichas geológicas.
- **IA real final** (prompt/esquema cambiados): `submission/evidence/m10-live-geology-evidence.json` (entradas sintéticas, datos públicos, selecciones, procedencia, huellas; sin claves): movilidad 8 refs (`caracterizar_material_superficial` + hueco), muestreo 10 (`diversidad_litologica_muestreo` + hueco), `differs: true`. Request IDs `req_011Ch3rSGCXCzpqhztrctMGL`, `req_011Ch3rT5D1Kw8W69qRKNZww`.
- **Verificación**: `npm run verify` a `/tmp/m10-verify.log`: 316 Python, 325 web (+3 omitidas), typecheck/build OK. ZIP repetido idéntico: 31 entradas, 13.255.254 bytes, SHA-256 `22b327cc622abadbb54c16358a750a1eb3c6a85033500294ad91310b18a470bb`. Baseline 24 + complemento 11 intactos; `git diff --check` limpio.
- **Brechas que siguen**: sin `vercel build` real (función emulada; el glob con llaves de `includeFiles` sin verificar en Vercel) y sin QA en navegador. Sin bundle no se puede anclar la geometría del subconjunto al snapshot (solo coherencia interna). La procedencia M8 en modo determinista es autodeclarada.


## Revisión visual final de Codex

Corregido desborde de URL en móvil con overflow-wrap:anywhere; no cambia contratos/IA. ZIP final y evidencia en docs/CODEX_M10_REVIEW.md. Revisión local aceptada; publicación y comprobación remota a cargo de Codex.

## Ronda 3 — recuperación acotada tras reproducción en dev (AR6, `ai_invalid_output`)

- **Causa** (repro `/tmp/analogos-m10-debug-live.mjs`): M8 válido; la IA devolvió 6 ids válidos del mismo sector (tope 3) y la validación estricta descartó todo. Guardarraíles sin cambios: no se amplían topes ni se recorta.
- **Cambio (solo servidor + tipado aditivo en `shared/geology/guidance.ts`)**: en `runExplain`, solo con canal geológico y selección semánticamente inválida (la llamada tuvo éxito), **una** segunda llamada con los mismos hechos y esquema más un `<reminder>` fijo por motivo tipado (`GeologyRejection`: forma, total, por sector —con el `site_id` solo si es del catálogo—, ajeno, repetido, o selección M8 inválida). El recordatorio no repite texto de la respuesta rechazada; los hechos originales y el objetivo confirmado se envían de nuevo. Se revalida M8+geología completos; si falla de nuevo, `ai_invalid_output` y fallback intactos.
- **Sin reintento** ante timeout, negativa, límite de frecuencia, truncamiento, errores upstream/no JSON, ni M8 sin geología (sin canal: una sola llamada).
- **Plazo total**: `startedAt` con `Date.now()`; la segunda llamada usa `timeoutMs = total − transcurrido` (`StructuredCall.timeoutMs` opcional) y no se intenta con < 2 s restantes.
- **Procedencia**: la de la respuesta finalmente aceptada; el consumo de la primera llamada **no** se agrega (contrato público M8 sin cambios; solo evidencia en tests).
- **Prompt**: `geology.budget = { per_site: 3, total: min(12, 3 × sectores con referencias) }` y texto que pide contar por sector. Sin `maxItems` (postvalidación, según la documentación de structured outputs).
- **Pruebas** (`aiGeology.test.ts`, +7): 4 válidos AR6 → 3 válidos con procedencia/usage de la segunda y recordatorio sin eco; segunda inválida → rechazo tras exactamente 2 llamadas; ajenos/duplicados/>tope y M8 inválido; evaluación sin cambios; sin reintento en 500/429/401, refusal, max_tokens, no JSON ni sin canal; plazo restante (≤ 11 s tras 9 s consumidos; sin reintento con 1 s restante); presupuesto en el prompt.
- **Verificación** (`/tmp/m10-verify2.log`): 316 Python, 332 web (+3 omitidas), typecheck/build OK; `git diff --check` limpio. Repro real AR6 ×3: las tres correctas (evidencia en `submission/evidence/m10-ar6-retry-live-evidence.json`; no distingue si hubo reintento).
- **ZIP**: cambió de todos modos porque `shared/geology/guidance.ts` entra al bundle web (cambio aditivo): SHA-256 `f76a905564f69737e763724da8467aff45dff1177e269a188a60da35807eb122`, repetido idéntico. Codex decide si regenerar/publicar; no hay cambios de comportamiento en la UI.
- Brecha: el reintento consume una segunda llamada (latencia/costo) solo cuando falla la validación; no medido en dev.

## M10 — publicación y comprobación remota final (Codex, 2026-11-14 America/Santiago)

**Completado, revisado y publicado en dev.** Implementación de Claude bajo encargo; revisión, devoluciones, correcciones y aceptación de Codex. Código `4708b42b4bd152dca74d3e009f233a910e458d8b`; [Actions correcto](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43665786554); [dev](https://analogos-dev.vercel.app/); deployment https://analogos-5plfynboc-pruebas-730d0f41.vercel.app. El checkpoint documental posterior usa `[skip ci]` y conserva este código desplegado. Esta entrega no modificó main, secretos ni protección Vercel.

- La función Vercel real pasó el control aislado: dos entradas filePathMap materializadas; snapshot/contratos/geología cargan y validan; casos de ausencia/corrupción correctos antes de publicar.
- Prueba real desde Chrome en dev, sector AR6 (`ar-win-s2580-w06710`), brief sintético de movilidad/reconocimiento geológico, pendiente regional ≤9° y preferencia no vegetada ≥95 %. El único sector evaluado quedó priorizado; tracción y factibilidad territorial pendientes. Son umbrales de demostración, no recomendaciones operativas.
- Anthropic eligió tres referencias válidas: caracterizar material superficial en Complejo volcánico Galán y depósitos aluviales/coluviales, más comprobar correspondencia mapa–terreno del primero. Fuente SEGEMAR 1:250.000, cobertura 100 %, límites y enlace oficial visibles. Ningún cambio de evaluación, valores ni ranking.
- Exportación descargada: `submission/evidence/m10-dev-geology-export.json`. Validada con `validateAnyMissionExport` y reconstruida idéntica con `buildMissionGeologyExport`, snapshot y contexto oficiales. Captura: `submission/assets/analogos-m10-dev.jpg`.
- Procedencia: modelo `claude-sonnet-5-5`, `2026-11-15T02:02:57.957Z`, request `req_011Ch3teqxMdwPrJqPCngjWE`, tokens 6795/719, `end_turn`. Esta evidencia prueba la respuesta aceptada; no registra si se requirió el reintento interno ni agrega su consumo.
- Verificación final: **316 Python, 332 web**, typecheck/build correctos. Dos objetivos reales finales contrastantes: movilidad y muestreo, 12 referencias válidas cada uno, propósitos distintos (`submission/evidence/m10-live-geology-evidence.json`). Tres consultas AR6 locales correctas; regresión M8/M9 y repros de integridad correctos; 33 archivos protegidos intactos.
- ZIP vigente: **31 entradas, 13.255.407 bytes**, SHA-256 `f76a905564f69737e763724da8467aff45dff1177e269a188a60da35807eb122`, repetido idéntico. QA local offline/subcarpeta/ausencia de geología/móvil 390px/teclado documentado en `docs/CODEX_M10_REVIEW.md`; las últimas modificaciones solo añaden recuperación del servidor y motivos tipados de rechazo compartidos, sin cambiar el recorrido ni los datos.

Antes de esta publicación, el modelo excedió el tope de tres referencias por sector en AR6. Se mantuvo el rechazo y se agregó una única segunda llamada con recordatorio controlado, mismos hechos y validación completa, dentro del plazo total. Si vuelve a fallar, la app conserva el resultado manual. No se amplían topes ni se recorta la salida. Los fallos iniciales de empaquetado quedaron resueltos antes de actualizar el alias.

Límites: siete sectores del piloto; orientación de reconocimiento, sin validación geológica de campo, score litológico, tracción medida ni autorización de acceso. En M10 se probó remotamente la explicación con geología; la prueba remota de generación de borrador permanece como antecedente M9, no se atribuye una nueva ejecución a M10. La inspección de impresión nativa sigue pendiente. Claude queda sin nueva asignación.
