# Revisión independiente M10 — Codex

**Estado: aceptado localmente; publicación y comprobación remota pendientes.** Implementación de Claude, devolución de Codex y correcciones completadas. Alcance autorizado: orientar ensayos con geología oficial; sin modificar evaluación, score ni datos científicos.

## Resultado revisado

- Anthropic recibe objetivo confirmado y unidades/fuentes oficiales. Solo selecciona pares unidad+comprobación de un catálogo validado; frases editoriales fijas, sin inventar mediciones. Límites de cobertura, escala y solapamiento siempre visibles. Sectores descartados no se rehabilitan; Yungay mantiene REF.
- Servidor y navegador ligan la selección al request, evaluación, contexto completo y subconjuntos exactos. Rechazo de respuestas obsoletas/ajenas. Geología ausente o inválida conserva el flujo de requisitos; IA opcional con recuperación explícita.
- Wrapper nuevo con exportación M8 intacta, fuentes, geometrías, selección y procedencia. Auditoría independiente del contenido y recálculo con snapshot; huella del subconjunto comprobable. La identidad del paquete completo es declarada si no está incluido. Estos hashes permiten verificar coherencia, no son firmas ni certificación de autenticidad.

## Revisión y pruebas de Codex

Los tres repros iniciales ahora se rechazan: geometría desplazada 0,01°, URL de fuente alterada y selección de IA con sector inventado. El caso válido pasa. Se revisaron límites de propósito, geometría pedida/medida, estados y conservación de M8. El constructor exige contexto validado contra candidatos oficiales.

- Verificación de Claude supervisada: **316 Python, 325 web**, tres pruebas reales opt-in omitidas por defecto; typecheck/build correctos (`/tmp/m10-verify.log`). La corrección final de CSS pasó build y validación de snapshot.
- Dos consultas reales contrastantes finales en `submission/evidence/m10-live-geology-evidence.json`: movilidad 8 referencias y muestreo 10, con propósitos distintos. No se afirma calidad científica calibrada ni determinismo del modelo.
- Navegador local real: explicación de movilidad con contexto geológico, tres referencias válidas (Qa/PE3i), tracción pendiente. Descarga en `submission/evidence/m10-local-geology-export.json`, validada y reconstruida idéntica con contexto/snapshot oficiales. Request `req_011Ch3rc6KyhKhPmVZ2CHY4t`, modelo claude-sonnet-5-5; 6514/313 tokens; end_turn.
- Informes históricos M8/M9 continúan validando y reconstruyéndose. Scripts de auditoría de sesión: `/tmp/analogos-m10-independent-review.mjs`, `/tmp/analogos-m10-validate-exports.mjs`.
- Navegador del ZIP bajo `/AnalogOS/`, conexiones externas bloqueadas por CSP: evaluación/contexto/exportación funcionan; IA no disponible se informa y conserva resultado. Sector AR-5 muestra 0 % y ninguna unidad. Rutas con paquete ausente e inválido mantienen evaluación y explicación sin geología.
- Móvil **390 × 844**, teclado Enter en detalles; se detectó y corrigió desborde de URL con `overflow-wrap:anywhere`. Verificación final: ancho de documento 390, sin elementos geológicos fuera del ancho, contenido nuevo ≥12 px. Capturas en `submission/assets/analogos-m10-local.jpg` y `analogos-m10-mobile.jpg`.
- **33 archivos únicos protegidos intactos**: ciencia, geología, perfiles, evaluación y ZIP histórico; 24 entradas de baseline +11 complementarias con duplicados. Código/evidencia/bundle/ZIP revisados contra credenciales locales, sin coincidencias.
- ZIP final repetido idéntico: **31 entradas, 13,255,287 bytes**, SHA-256 `26bfbd68b3c7162db1c22ce3d640f6c8626f510107dd0587e6f6d3bfb09f06d1`.

## Límites y siguiente comprobación

No se mide tracción, mecánica de suelos, aptitud planetaria ni permisos. La cobertura sigue siendo el piloto de siete sectores; no hay nuevos datos/candidatos. La IA prioriza comprobaciones; no añade un score geológico. La prueba de arranque local usa función emitida por TypeScript; la función Vercel real se probará en CI antes de cambiar el alias. Luego Codex verificará IA y exportación desde dev.

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


## Primer control de Vercel y corrección del aislamiento

El primer push `ab13fb8` construyó correctamente, pero Actions 43664379073 detuvo la publicación al comprobar la función: el control copiaba literalmente enlaces de archivos trazados hacia fuera del paquete y dejaba roto el import de candidate-details.json al moverlo a /tmp. Codex reprodujo el fallo con una función y JSON enlazado; la misma función pasa al materializar los enlaces al copiar. El chequeo sigue aislado y conserva sus controles de ausencia/corrupción; no se eliminó ninguna validación. Script corregido; segundo despliegue pendiente. El alias dev no cambió en el primer intento.
