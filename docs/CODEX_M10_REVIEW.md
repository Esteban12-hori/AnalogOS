# Revisión independiente M10 — Codex

**Estado: aceptado por Codex, publicado en dev y verificado remotamente.** Implementación de Claude, devolución de Codex y correcciones completadas. Alcance autorizado: orientar ensayos con geología oficial; sin modificar evaluación, score ni datos científicos.

## Resultado revisado

- Anthropic recibe objetivo confirmado y unidades/fuentes oficiales. Solo selecciona pares unidad+comprobación de un catálogo validado; frases editoriales fijas, sin inventar mediciones. Límites de cobertura, escala y solapamiento siempre visibles. Sectores descartados no se rehabilitan; Yungay mantiene REF.
- Servidor y navegador ligan la selección al request, evaluación, contexto completo y subconjuntos exactos. Rechazo de respuestas obsoletas/ajenas. Geología ausente o inválida conserva el flujo de requisitos; IA opcional con recuperación explícita.
- Wrapper nuevo con exportación M8 intacta, fuentes, geometrías, selección y procedencia. Auditoría independiente del contenido y recálculo con snapshot; huella del subconjunto comprobable. La identidad del paquete completo es declarada si no está incluido. Estos hashes permiten verificar coherencia, no son firmas ni certificación de autenticidad.

## Revisión y pruebas de Codex

Los tres repros iniciales ahora se rechazan: geometría desplazada 0,01°, URL de fuente alterada y selección de IA con sector inventado. El caso válido pasa. Se revisaron límites de propósito, geometría pedida/medida, estados y conservación de M8. El constructor exige contexto validado contra candidatos oficiales.

- Verificación de Claude supervisada: **316 Python, 332 web**, tres pruebas reales opt-in omitidas por defecto; typecheck/build correctos (`/tmp/m10-verify2.log`, ronda final). La corrección final de CSS pasó build y validación de snapshot.
- Dos consultas reales contrastantes finales en `submission/evidence/m10-live-geology-evidence.json`: movilidad 12 referencias y muestreo 12 (ronda final), con propósitos distintos. No se afirma calidad científica calibrada ni determinismo del modelo.
- Navegador local real: explicación de movilidad con contexto geológico, tres referencias válidas (Qa/PE3i), tracción pendiente. Descarga en `submission/evidence/m10-local-geology-export.json`, validada y reconstruida idéntica con contexto/snapshot oficiales. Request `req_011Ch3rc6KyhKhPmVZ2CHY4t`, modelo claude-sonnet-5-5; 6514/313 tokens; end_turn.
- Informes históricos M8/M9 continúan validando y reconstruyéndose. Scripts de auditoría de sesión: `/tmp/analogos-m10-independent-review.mjs`, `/tmp/analogos-m10-validate-exports.mjs`.
- Navegador del ZIP bajo `/AnalogOS/`, conexiones externas bloqueadas por CSP: evaluación/contexto/exportación funcionan; IA no disponible se informa y conserva resultado. Sector AR-5 muestra 0 % y ninguna unidad. Rutas con paquete ausente e inválido mantienen evaluación y explicación sin geología.
- Móvil **390 × 844**, teclado Enter en detalles; se detectó y corrigió desborde de URL con `overflow-wrap:anywhere`. Verificación final: ancho de documento 390, sin elementos geológicos fuera del ancho, contenido nuevo ≥12 px. Capturas en `submission/assets/analogos-m10-local.jpg` y `analogos-m10-mobile.jpg`.
- **33 archivos únicos protegidos intactos**: ciencia, geología, perfiles, evaluación y ZIP histórico; 24 entradas de baseline +11 complementarias con duplicados. Código/evidencia/bundle/ZIP revisados contra credenciales locales, sin coincidencias.
- ZIP final repetido idéntico: **31 entradas, 13,255,407 bytes**, SHA-256 `f76a905564f69737e763724da8467aff45dff1177e269a188a60da35807eb122`.

## Límites

No se mide tracción, mecánica de suelos, aptitud planetaria ni permisos. La cobertura sigue siendo el piloto de siete sectores; no hay nuevos datos/candidatos. La IA prioriza comprobaciones; no añade un score geológico. La función Vercel real, IA en dev y exportación descargada quedaron comprobadas; detalle en `docs/DEV_AI_VERIFICATION.md`.

## Hallazgos originales — resueltos

 (repro: node /tmp/analogos-m10-independent-review.mjs)
1. Wrapper: desplazar longitud de todos los vértices del export geológico CL1 +0.01 sigue validando incluso {bundle} real. Debe comparar geometry y site_id/geodatos con candidatos de bundle; catálogo/selección debe vincular evidencia completa, no solo brief que omite geometría. La identidad de paquete completo declarada no verifica bytes del subconjunto.
2. Cambiar source.dataset_url a otra URL permitida del mismo host sigue validando sin modificar catálogo. Citas/origen/metadata/raw/geometry omitidos del hash de catálogo quedan manipulables sin detectar. Agregar huella independiente explícita de subconjuntos exactos incluidos, vinculada al catálogo/registro, reconstruible sin todo el paquete (no llamar hash completo). Preferir derivar la misma identidad de subset normalizado server/browser/export. Mantener declaración honesta de hash completo no verificable del subset.
3. mission_export.ai.explanation.selection.options[0].site_id='inventado' sigue validando en wrapper con bundle real. Reutilizar buildMissionExport para reconstruir desde request/eval/bundle+ai y comparar entero; sin bundle al menos checkSelection/huellas draft/explanation/user_changes. No basta JSON Schema de M8 para afirmar export coherent. validateAnyMissionExport con bundle debe auditar M8 también.
Otros puntos a comprobar al terminar:
- roots(opts.root) cae a repo si explicitroot vacío; aislamiento opcional debe ser real.
- caché loader solo root, ignora cambio de bundle. Clave bundle identidad para tests/publicAPI; runtime bundle inmutable documentado.
- script check-vercel-function debe probar geología DE LA FUNCIÓN y no encontrar archivo del checkout por cwd original/ancestros; aislar copia en /tmp+chdir y restaurar. Sin red/clave. IncludeFiles ambos context y candidates bytes.
- mantener fracciones originales (no redondear a0/1enprompt) y explicar qué fracciónincluyesolape; unidad no localizada sihintpartial. Mostrar originalsourcehref.
4. UI GeologyGuidance no enlaza ninguna fuente: imprime dataset_name/authority, pero source brief omite dataset_url. Añadir enlace oficial visible con descripción, impresión URL, bound al catálogo y export (punto2).
5. UnitBrief.fraction es fraction_including_overlap y UI dice simplemente «% del sector». Mostrar que incluye solape/no sumar porcentajes de unidades; incluir fraction_unambiguous y ofrecer datos sin doble conteo y aclaración. Prompt redondea a4decimales volviendo0/1 valores noextremos, evitar redondeo agresivo que oculta porcentajes pequeños.
6. Producto: AiPanel dice «no el texto completo del brief» mientras casilla por defecto activa envía brief; usar aviso único condicional claro. Eliminar jerga M8 en textos visibles «consulta M8»/«lo que describe M8»; decir explicación de requisitos sin geología. Ubicar acción IA antes del bloque geológico largo o acceso claro, para no ocultar activación después de7fichas.


Prueba real inicial de Claude: movilidad y muestreo producen selecciones distintas. No sustituye revisión de integridad, fuentes y navegador.


## Controles de Vercel y corrección del aislamiento

Los intentos `ab13fb8` (Actions 43664379073) y `e0e6f1c` (43664642031) construyeron correctamente, pero detuvieron la publicación al comprobar la función aislada: faltaban archivos trazados al copiar solo el directorio .func. Primero se cubrió el caso de enlaces (repro local real); el segundo control mostró que eso no bastaba. Vercel también mantiene archivos fuera de .func y los declara en filePathMap. Su código oficial los resuelve contra el directorio de build: https://github.com/vercel/vercel/blob/main/packages/cli/src/commands/build/index.ts. El control ahora materializa únicamente esas entradas declaradas, con rutas acotadas al proyecto y al paquete, antes de aislarlo; no rellena ausencias por su cuenta. Se comprobaron fixtures con enlace y con filePathMap: el control anterior falla y el corregido pasa, conservando los casos de ausencia/corrupción. Ninguno de los intentos fallidos cambió el alias dev. El tercer control pasó en Actions 43664952053 (1ac15e3), con dos entradas filePathMap materializadas y todos los casos negativos correctos.

## Fiabilidad observada en dev y ronda 3

Dos consultas AR6 en el primer despliegue M10 fueron rechazadas sin alterar el resultado. Reproducción local: selección M8 válida, seis referencias geológicas del mismo sector frente al tope de tres. Claude corrigió bajo nueva asignación de Codex: presupuesto efectivo explícito y una única nueva llamada ante selección inválida, sin recortar ni aceptar respuestas incorrectas. El plazo total se conserva y la procedencia es de la respuesta aceptada (no incluye consumo del intento descartado). 316 Python/332 web, typecheck/build correctos; tres consultas AR6 reales locales válidas. Revisado y aceptado por Codex. ZIP vigente: 31 entradas, 13,255,407 bytes, SHA-256 `f76a905564f69737e763724da8467aff45dff1177e269a188a60da35807eb122`. La comprobación remota final pasó; ver cierre siguiente.

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
