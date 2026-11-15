# M11 — Acceso directo a Lectura e informe imprimible

- **Task ID:** M11-READING-PRINT
- **Owner:** Codex
- **Estado:** accepted — código revisado y aprobado por Codex; publicación dev/main y reprueba remota en curso. Evidencia: docs/CODEX_M11_REVIEW.md. Claude sin nueva asignación.
  - `verify`: 333 Python, 798 web y 3 omitidas; build correcto.
  - Entrega inicial de Claude por SSR/CSS; Codex completó después navegador y PDF nativo. Ver revisión M11.
  - **Ronda 2 (Claude):** «Ir a la Lectura» se movió de la exportación al resumen del resultado compacto, tras `pl-lead` y antes de chips y grupos. Acción única, mínimo 44 px. Web 799 pasan y 3 omitidas; build correcto. Python no se repitió.
  - **Ronda 3 (Claude):** solo cambia la tabla impresa de criterios. Recibe la clase `pl-criteria-table` y, en `@media print`, layout fijo con columnas al 18/15/13/20/18/16 %. Las palabras solo se parten si no caben; los enlaces y códigos sí se parten. No cambian texto, fuente, pantalla ni las otras tablas. Web 799 pasan y 3 omitidas; build correcto. El PDF nuevo lo genera Codex.
- **Base:** dev `ce86a879905cb927d9881aae6ab564d9082f39fc`.
- **Dirección, revisión y aceptación:** Codex. Dan pide delegar a Claude, supervisar y revisar todo antes de subir a dev. Claude no hace commit, push, merge, deploy ni cambia de rama. Codex publicará dev tras aceptar. **Ampliación posterior de Dan:** revisar todo y promover después a main/producción; esta promoción queda exclusivamente a cargo de Codex tras validar dev. Claude sigue sin autorización para publicar.

## Primer checkpoint: solo lectura

Lee AGENTS.md, CLAUDE.md, este bloque, STATUS, CHANGELOG y ADR-013/014. Confirma rama y diff; los cambios de asignación son de Codex y `outputs/` es ajeno. Inspecciona código y devuelve un plan breve con archivos, hallazgos y pruebas. Espera aprobación de Codex antes de editar. No subagentes. No leer credenciales ni .env; no herramientas de navegador externas. Codex hará las comprobaciones de navegador y PDF reales mediante su entorno controlado.

## Ronda 3 — legibilidad del PDF real

Codex obtuvo y revisó las 12 páginas de `submission/evidence/m11-seven-sectors-print.pdf`; ahora hay contenido completo hasta procedencia/huellas. Hallazgo visual: la tabla de criterios asigna muy poco ancho a «Requisito» y «Observado»: «Mediana de pendiente regional» y «Observado» quedan partidos en fragmentos de 2–4 letras, mientras Escala ocupa ~36%. Corregir SOLO presentación impresa de esa tabla, sin cambiar datos ni pantalla. Dar clase propia (p.ej. pl-criteria-table) y layout fijo con anchos equilibrados para las seis columnas (referencia: 16/16/12/18/22/16 %; ajustar con criterio), manteniendo enlaces que se parten, encabezado repetido y filas sin recortar. No limitar/ocultar textos ni reducir fuente para que quepa. No afectar tabla de requisitos confirmados de cinco columnas o Medidas de tres. Tests relacionados/build; no añadir tests que solo busquen cadenas CSS. Dejar review. Codex generará y verificará un nuevo PDF; el PDF añadido por Codex es evidencia provisional y no lo modifiques.

## Ronda 2 — hallazgo de usabilidad de Codex

Navegación y foco comprobados en Chrome 390×844, 1280×800 y 1440×900; también sin selección, Atrás y Escape. **Corregir antes de aceptar:** «Ir a la Lectura» queda junto a Exportar, después de toda la lista. En 390×844, el ejemplo de siete sectores sitúa el botón en y=1470 y mide solo 34 px de alto: no se encuentra en la primera vista del resultado. Mover UNA sola acción junto al resumen inicial del resultado compacto (después de pl-lead y antes de chips/grupos), con altura mínima de 44 px y margen adecuado; mantener el texto y comportamiento. No duplicarla ni presentarla como exportación. Añadir una regresión ligera de presencia única y orden anterior a los grupos de alternativas; Codex verificará visualmente la visibilidad real. Conservar el resto de la entrega revisada; sin cambios en ciencia, IA, servidor o rutas. Tests afectados y build; documentar ronda y volver a Owner Codex / Estado review. No hace falta repetir Python por este movimiento. Codex corrige el espacio final propio del encargo y hace verify final.

## Plan aprobado por Codex (2026-11-15)

Plan de Claude revisado. Se aprueba reutilizar la píldora de Lectura para Misión en 1100–1439, manteniendo selección; el CTA de Tu misión puede fijar modo Misión. En móvil conservar hoja única y alcance aunque no haya selección o sea ◆. Priorizar una solución pequeña; reintentos de foco acotados y cancelables, nada de focus trap nuevo. Navegar no consulta IA ni muta el planificador. Mantener el acceso al cambiar ancho sin saltos de selección.

**Impresión:** Codex reprodujo y obtuvo PDF nativo de una página (`/tmp/analogos-m11-baseline.pdf`, siete sectores), cortado tras geometría: faltan resultados, geología y fuentes. Corregir resets/paginación y completar PrintGeology con la misma evidencia de pantalla. No añadir una explicación generada distinta: el informe ya incluye los motivos deterministas completos y procedencia; conservar ese alcance.

**Ajuste al plan:** evitar imprimir automáticamente después de una espera asíncrona. Preferir botón deshabilitado «Preparando informe…» hasta que el informe vigente esté montado y un clic síncrono para imprimir. Ctrl+P durante carga/sin resultado debe mostrar aviso, nunca un informe viejo. No colas de impresión que puedan dispararse para otra misión tras editar. Pruebas de carga inicial, invalidación y sin catálogo. Solo una fuente de verdad para vigencia.

Se autoriza implementar el plan con estos ajustes, tests y documentación. Claude deja review; Codex revisará navegador/PDF y release. No commits/push, no cambiar main, no nuevas dependencias, no editar ciencia/servidor. El objetivo nuevo de Dan es revisar el conjunto y luego publicar main/producción; Codex lo realizará después de probar dev.

## Resultado esperado

1. «Ir a la Lectura» es una acción visible y operativa desde el resultado compacto / Tu misión. En móvil abre la hoja y la pestaña Lectura; a 1100–1439 abre la superficie adecuada y ≥1440 enfoca el panel izquierdo. Debe funcionar sin sitio seleccionado, con selección de referencia, con evaluación sin candidatos priorizados y tras cambio de ancho. No cambiar selección, brief, requisitos, geometría, ranking ni iniciar IA por navegar. Cerrar/volver conserva el estado y el foco es accesible. No crear otro motor ni rediseñar la interfaz.
2. Revisar y corregir impresión del informe integrado, incluida PrintGeology. Un solo informe vigente, completo, legible sobre fondo blanco, sin globo/dock/controles ni recorte por 100dvh/overflow. Paginación de informes largos, tablas y enlaces; contenido geológico y límites de evidencia íntegros, nunca convertir cartografía regional en aptitud. Sin geología debe funcionar igual. No imprimir un informe obsoleto al editar ni una página vacía por carga diferida.

## Alcance y límites

Se permiten cambios mínimos en shell, estado UI, features composer/analysis y componentes planner de presentación, CSS y tests asociados. Conserva contratos compartidos, ciencia, servidor, IA, datos, dependencias, CI y capturas del README. No modificar artifacts/, shared/, server/, api/, .github/, vercel.json ni secretos. No regenerar datos científicos. Codex regenerará el ZIP después de la revisión final si procede. No modificar outputs/ ni evidencias históricas.

El resultado de navegación no depende de una alternativa seleccionada ni hereda datos de otra geometría. Preserva Yungay REF y el flujo manual sin IA. Una ruta accesible y acción ligera de UI son preferibles a duplicar estados del planificador. Si imprimir exige esperar a render, preservar activación del usuario y mostrar estado claro; no lanzar impresión automáticamente al evaluar.

## Pruebas y entrega

- Añadir regresiones significativas para navegación y selección/alcance preservados; no tests que solo busquen cadenas del código.
- Verificar informe con/sin geología, texto largo, varios sectores, referencias/fuentes, resultado invalidado y carga inicial. Distinguir SSR/CSS de un PDF real: no afirmar comprobación nativa si no ocurrió.
- Ejecutar tests relacionados, types/build y `PATH="$PWD/.venv/bin:$PATH" npm run verify` (guardar log fuera de repo; reportar resumen). No pruebas de IA real ni consumo externo necesarios para estas mejoras de presentación.
- Actualizar STATUS/CHANGELOG y documentación de UX/contratos si cambia el canal de UI; registrar comandos, límites y archivos. Dejar este bloque con **Owner Codex / Estado review**. No autoaprobar.
- Codex revisará diff, repetirá pruebas pertinentes y comprobará 390×844, 1280×800 y 1440×900, teclado, recorrido a Lectura y PDF real con geología antes de publicar dev.

---

# README de la nueva interfaz y promoción a producción — Codex (2026-11-15)

- **Owner:** Codex. **Estado:** accepted; completado, publicado y comprobado. **Base:** `dev` `513c44a`; producción `origin/main` `437b515`, ancestro de dev.
- **Autorización directa de Dan:** «actualiza el readme ahora que tiene nueva interfaz y pasemos a main todo, el push master para que pase a prod». El repositorio despliega producción desde `main`; no existe `master`.
- Actualizar el README con Explorar/Misión, captura vigente y enlace público. Promover la entrega completa revisada a `main`, sin force. Configurar la IA en runtime de producción mediante el secreto existente de GitHub, como en dev; comprobar build, función y recorrido real publicado.
- Preservar datos científicos, límites de aceptación y `outputs/` ajeno. Registrar resultado y sincronizar continuidad. No asigna trabajo a Claude.
- Este encargo sustituye la restricción de no publicar main de la revisión anterior; los bloques siguientes son antecedentes.
- **Entrega:** main/dev `7e8c779`, Actions producción `43682694089` y dev `43682693561` correctos. Screenshot del README tomado después de publicar; IA real de producción y exportación comprobadas. Ver `docs/PRODUCTION_RELEASE.md`. Checkpoint posterior solo documental/evidencia con `[skip ci]`; ambas ramas sincronizadas. Sin nueva asignación a Claude.

---

# Revisión de la integración publicada — Codex (2026-11-15)

- **Owner:** Codex. **Estado:** accepted; completado, publicado y comprobado con IA real. **Rama/base:** `dev`, `dd625b4`. **Entrega:** `9c183fb`, Actions `43681551867` correcto.
- Dan entregó el handoff de Gus para continuar la integración ya fusionada y desplegada. Verificar IA real (borrador, explicación y geología AR6), decidir el tratamiento de Yungay en Misión, revisar ADR-013/014 y corregir la referencia de CLAUDE.md.
- Corregir regresiones encontradas en este recorrido, verificar y publicar en dev bajo la autorización vigente. No modificar el núcleo científico ni main. Sin nueva asignación a Claude.
- Hallazgo reproducido y corregido: «Evaluar este sector» → texto en el dock → «Enviar» conserva ahora recorrido y geometría elegidos. Prueba de regresión y recorrido local correctos.
- Resultado: IA real AR6 comprobada, ADR-013/014 aceptados, Yungay conservado como alternativa conocida en Misión y separado del descubrimiento. Ver `docs/CODEX_INTEGRATION_REVIEW.md`; no hay nueva asignación a Claude.
- Reprueba final tras publicación: el sector se conserva; borrador y explicación/geología reales correctos; exportación final validada/reconstruida. Evidencia: `submission/evidence/integration-final-dev-geology-export.json`.
- Los bloques siguientes son antecedentes; el push pendiente allí descrito ya se completó en `dd625b4` (Actions 43678787020).

---

# Decisión directa del usuario — integración del rediseño con dev (2026-11-14)

- **Pedido:** el usuario pidió directamente a Claude Code «fusiona en dev y haz push» y decidió integrar: la interfaz es la del rediseño (`feature/mision-redesign`, ADR-010, hoy ADR-014) y por dentro se usan el planificador determinista, la IA de Anthropic y los datos v3 del equipo (ADR-008, ADR-009). Registrado en ADR-013 y `docs/INTEGRATION_PLAN.md`.
- **Alcance ejecutado en `feature/mision-redesign`:** fusión sin squash de `origin/dev` (`92392f1`), adaptación de las features, retiro del motor propio y del canal lktron, renumeración de ADR (entonces 010–013; hoy 012–015) y documentación. Sin cambios en `shared/`, `server/`, `api/`, artefactos científicos, contratos M8 ni CI.
- **Pendiente:** el push a `dev` es un paso aparte autorizado por el usuario; la aceptación de ADR-014 (antes ADR-010) y ADR-013 corresponde al equipo humano. El encargo M10 de Codex de abajo sigue aceptado y no se modifica.
- **Fusión de M9/M10 (2026-11-15):** `origin/dev` `d2252b6` fusionado sin squash en `feature/mision-redesign`. La UI de M9/M10 se portó a la interfaz integrada: pestaña «Geología» de la ficha, orientación geológica en «Tu misión», y casilla y reintento en la Lectura. Todo lo del equipo queda intacto. Los ADR propios 010/011 pasan a 014/015. Detalle en `docs/INTEGRATION_PLAN.md` §11 y `project/STATUS.md`.

---

# M10 — Recomendación de prueba con evidencia geológica e IA

> Mantenimiento documental posterior: [README de producto](tasks/README_PRODUCT.md), a cargo de Codex por solicitud de Dan. No reabre M10 ni asigna trabajo a Claude.

- **Task ID:** M10-GEOLOGY-AI
- **Owner:** Codex
- **Status:** accepted — completado, publicado y verificado en dev por Codex
- **Branch:** dev
- **Base commit:** bdbdab0603be6745993e1689f6dcec960d766c9e
- **Dirección, revisión y aceptación:** Codex. Dan autorizó: «hagamos que la IA use estos datos geológicos para mejorar las recomendaciones. Dale la siguiente tarea a Claude y tú supervisa y revisa todo antes de subirlo a dev». Codex publicará dev después de aceptar. Claude no hace commit/push/deploy. Main intacto.

## Checkpoint inicial obligatorio

Leer AGENTS, CLAUDE, STATUS, último CHANGELOG, ADR-009/010, GEOLOGY_CONTEXT, núcleo M8 IA/exportación/UI y M9. Confirmar rama/HEAD y cambios de asignación de Codex. **Solo lectura:** devolver plan concreto de archivos, contrato de selección geológica, validación y fingerprint, carga opcional servidor/Vercel, migración compatible de exportación y pruebas. Esperar aprobación de Codex antes de editar. Sin subagentes. Trabajar por un corte vertical acotado.

## Resultado de producto

Tras definir y confirmar una prueba o elegir uno de los sectores evaluados, la explicación de IA usa las unidades geológicas oficiales de M9 para destacar evidencia relevante para ese ensayo y orientar reconocimiento/validaciones de campo. La pantalla muestra qué unidad/documento respalda cada sugerencia, qué limitaciones hay y qué falta verificar. La IA debe recibir realmente el objetivo confirmado y contexto geológico, y su selección debe cambiar razonablemente entre objetivos diferentes. No basta adjuntar el JSON ni crear un bloque genérico igual para todo.

Mantener separado el resultado determinista de requisitos y la orientación geológica. No cambiar rankings, score, confianza, pesos, criterios medidos ni perfiles: cartografía regional no prueba tracción, mecánica de suelos, equivalencia marciana, seguridad ni permisos. Cobertura no es aptitud/precisión; ausencia no significa inexistencia de geología. Un sector descartado no se rehabilita por su geología. Yungay sigue REF. Geología de ventana completa no se hereda a un punto/subpolígono u otra geometría.

## Alcance autorizado

1. Reutilizar artefacto geológico real M9 sin modificarlo. Factores: unidades originales, descripción y código, fracciones sin doble conteo, huecos/ambigüedad/descripción ausente, autoridad, escala, fecha mapa desconocida, fuente y límites. Se permite refactor mínimo de validador/tipos puros M9 a shared/geology con reexport web; servidor NO importa apps/web (evitar ERR_REQUIRE_ESM M8). Validación única estricta, no copia debilitada.
2. Servidor carga paquete oficial validado, ligándolo a candidatos/snapshot exactos. Nunca confiar en geodatos o IDs libres enviados por cliente. Carga opcional ausente/inválida conserva M8; tratar presencia/versión divergente con error controlado de contexto obsoleto. Proponer y verificar inclusión real del archivo en función Vercel, arranque empaquetado y ausencia opcional; cambios acotados vercel.json/script de startup autorizados si necesarios. No cambiar secretos, autenticación, proveedores ni workflow sin necesidad demostrada.
3. Extender explicación de Anthropic con esquema cerrado de referencias válidas por sector, unidad/fuente y propósito de comprobación. Preferir selección de hechos y preguntas editoriales citadas; no permitir prosa factual libre que invente litología. La IA puede priorizar orientaciones según brief; las inferencias/preguntas deben estar rotuladas como tales, no mediciones. Incluir unidades genuinas y contexto suficiente, no solo IDs. Datos y brief tratados como datos, no instrucciones. Validar pertenencia, unicidad, límites, correspondencia con selección/scope y estado. No ofrecer compatibilidad geológica calibrada ni introducir requisitos medidos ficticios.
4. Vincular respuesta a fingerprint de request/evaluation y paquete geológico exacto. Rechazar selección de otra versión, otro sector/unidad/fuente, respuestas tardías tras editar/cambiar scope o cambiar contexto. Preservar cancelación y estados M8. Opcional sin datos/IA: contexto factual y preguntas deterministas con etiqueta honesta, flujo manual intacto. IA no inventa unidades en sector sin cobertura ni asegura detalles dentro de huecos/solapamientos.
5. UI integrada en planificador/resultados, español claro, contraste/tamaño >=12px en contenido nuevo, móvil390px/teclado. Resumen útil de orientación geológica para la prueba; detalle/fuentes expandibles si voluminosos. Límites esenciales/gaps siempre visibles aunque IA los omita. Actualizar texto de qué se envía al proveedor (ahora también objetivo y geología pública). Explicar fuente, escala y relación con prueba sin confundir ranking/aptitud.
6. Exportación reproducible autodescriptiva con evidencia geológica efectivamente usada, fuentes, limitaciones, selección IA, identidad de contexto y provenance. Proponer evolución explícita/versionada o wrapper compatible: exports M8 1.0 existentes deben seguir validando y reconstruyéndose; no añadir campos silenciosos al contrato viejo. Verificar reconstrucción y rechazo de manipulación/stale. Exportación M9 propia continúa. Paquete estático portable funciona sin servidor, no claves en bundle.
7. Sin nueva infraestructura/dependencia salvo necesidad justificada en checkpoint, sin nuevos países/datos/mapas/score. No regenerar ciencia/geología/visuales. Baseline protegido /tmp/analogos-m10-baseline-hashes.json (no alterarlo para pasar). M9 historial en project/tasks/M9_GEOLOGY_CONTEXT.md. Se autorizan modificaciones al núcleo IA/shared/contratos/UI necesarias para M10; evaluación/geometry/catalog protegidos.

## Aceptación

- Tests significativos: evidencia real CL/AR (parcial/0/100), unidad ajena, paquete antiguo/ausente/inválido, fingerprint/edición/respuesta tardía, scope de geometría, prompt injection como dato, no promoción de descartados ni score; selección relacionada con objetivo y citas exactas; fallback sin IA; exports antiguos y nuevos/tamper. Dos pruebas reales opt-in con objetivos contrastantes, sin asumir estabilidad exacta del LLM.
- source .venv/bin/activate && npm run verify; release:package repetido idéntico; git diff --check; baseline íntegro; función empaquetada compatible. Codex hará revisión independiente, IA real y navegador escritorio/móvil/offline/descarga, después dev.
- ADR-011 proposed, documentación operación/IA/ciencia/export, project/M10_PROGRESS.md, STATUS/CHANGELOG y comandos reproducibles. No exagerar cobertura ni validación científica.
- Al entregar: Owner Codex / Status review; informar resultados y brechas reales, no autoaceptar ni publicar. Preservar asignación y documentos de Codex.

## Revisión de checkpoint y autorización de implementación — Codex

Plan revisado. Autorizo implementar tras leer los archivos concretos abajo y confirmar git status/HEAD; Bash disponible en esta llamada. Corregir estos puntos del plan:

- **Los sectores parciales SÍ tienen unidades conocidas**: no eliminar sus referencias por tener huecos. Mostrar unidades del área cubierta con límites del hueco/solapamiento siempre visibles, sin localizar unidades en el hueco. Si se elige una ventana para un punto/bbox, solo contexto de ventana completa explícitamente rotulado; nunca evidencia atribuida a la geometría pequeña. Sin ventana elegida no emitir unidades.
- **Propósitos útiles para la prueba**: además de resolver huecos/ambigüedad, incluir preguntas editoriales acotadas de caracterización de material superficial para movilidad (granulometría/compactación/fricción a medir, nunca inferidas), reconocimiento de diversidad litológica para muestreo/instrumentación y comprobación de correspondencia mapa-terreno. La IA debe elegir pares unidad+propósito válidos según objetivo; no basta priorizar huecos idénticos. No clasificar materiales automáticamente por keywords ni introducir nuevas métricas. Propósitos sobre huecos solo se admiten si hay huecos, etc. Hasta3 referencias por sector y12 global, sin obligación de llenar cupo; si necesita más debe justificar. Ningún texto factual libre.
- Identidad: usar SHA256 del JSON canónico COMPLETO del contexto validado con shared/mission/fingerprint.ts (ya implementado); nombrarlo context_fingerprint, no presentarlo como hash de bytes. Comprobar además el candidates_sha256 de bytes originales en servidor. Identidad vinculada a request/evaluation existentes; no inventar policy_version ausente.
- **Compatibilidad recomendada**: mantener selección/record/schema/export M8 1.0 intactos, añadir canal geológico opt-in al explain (campo opcional de fingerprint del cliente y resultado geológico separado). UI guarda registro geológico aparte pero de la misma llamada/provenance. Sin opt-in conserva M8. Nuevo wrapper con kind/version propios y mission M8 1.0 embebido + contexto/evidencia/selección geológica y provenance. Constructor/validador de wrapper aparte, aceptación de formatos explícita. No reescribir validadores/exportadores M8 innecesariamente. El wrapper debe ser auditable sin artefactos externos (incluir contexto validado completo o subconjunto validable con identidad de paquete declarada y sin pretender poder verificar hash del resto omitido).
- Carga opcional: ausente o inválido da estado no disponible para geología, no rompe M8. Si cliente cree tener contexto válido y servidor tiene otro/no tiene, error específico antes de llamar al proveedor y opción de reintentar M8 sin geología, explícita (no ocultar degradación). Cliente ausente puede usar M8 aunque servidor sí tenga datos.
- includeFiles acotado autorizado; prueba función empaquetada sin claves/red debe EJERCITAR que la geología está incluida y validada, además del GET405/POST503 existente. No basta que el endpoint arranque y nunca lea archivo por no tener clave. Probar ausencia de forma aislada sin dañar bundle/repo.

Rutas confirmadas: docs/decisions/ADR-009-mission-guided-recommendation.md; project/CHANGELOG.md; server/ai/{operations,prompts,facts,handler,nodeAdapter,anthropic,config}.ts; shared/mission/{types,aiSchemas,explanation,exportReport,validate,fingerprint}.ts; apps/web/src/mission/{aiClient,plannerState}.ts; apps/web/src/components/planner/{usePlanner,PlannerPanel,ResultView}.tsx/ts; apps/web/src/App.tsx; apps/web/src/domain/geologyContext.ts; apps/web/src/data/loadGeologyContext.ts; scripts/check-vercel-function.mjs; vercel.json; contracts/mission-{ai,export,request}.schema.json.

Se autoriza el corte completo y checks locales; no commit/push/deploy. Si presupuesto de llamada se acaba, dejar checkpoint claro de lo hecho y pendiente. Al terminar Owner Codex / review. Mantener evidencia original y datos intactos; actualizar textos que decían que IA no consume geología.


## Devolución de Codex — correcciones necesarias antes de aceptar

Aplicar docs/CODEX_M10_REVIEW.md. Reproducción exacta de tres fallos confirmados: node /tmp/analogos-m10-independent-review.mjs, resultados en /tmp/analogos-m10-independent-results.json. Hoy todas las mutaciones producen [] y eso es incorrecto incluso con bundle oficial. Cerrar coherencia de geometría/citas/subconjunto completo y M8 embebido con tests de regresión. Se autoriza enriquecer catálogo/huellas/contrato nuevo y helpers de auditoría, sin cambiar contratos antiguos ni artefactos. No aceptar integridad científica por un hash que no incluye todos los hechos usados/exportados. El constructor del wrapper debe validar contexto contra bundle/candidatos de modo apropiado, no asumir que TypeScript prueba procedencia.

Cerrar además fuente clicable/URL impresa, fracciones sin ambigüedad y aclaración de solapes; evitar redondear hechos a0/1enprompt. Limpiar textos de implementación (M8) de UI y aviso de envío condicional coherente; poner activación IA antes de las fichas largas. Revisa los otros bordes del informe: ya solucionaste root explícito; conservar esa corrección y verificar aislamiento real del startupcheck. Considerar identidad de bundle en caché para evitar reutilizar contexto con candidatos cambiados.

Reejecutar tests relevantes y luego verify una vez redirigida a log para conservar conteos sin repetir por falta de salida. Repetir ZIP después de cambios finales; baseline original+complemento desde HEAD en /tmp/analogos-m10-additional-protected.json. IA real ya demostró diferencia; si cambias prompt/esquema ejecutar las dos consultas finales y conservar respuestas/objetivos/selecciones/provenance sin claves en archivo de evidencia para auditoría, no solo conteos. No subagentes/commit/push. Devolver Owner Codex/review. Codex hace navegador y salida dev.

## Aceptación local de Codex

Revisión y correcciones cerradas; ver docs/CODEX_M10_REVIEW.md. Claude queda sin nueva asignación. Codex publica dev y comprueba la función y la IA remotas antes del cierre definitivo. No iniciar nuevos cambios.

## Devolución remota de Codex — 2026-11-14

M10 se publicó en 1ac15e3 (Actions 43664952053), función real validada. Dos consultas del mismo caso AR6 en dev dieron ai_invalid_output. Reproducción local exacta /tmp/analogos-m10-debug-live.mjs: M8 válido, geología rechazada por más de 3 referencias para un sector; la respuesta del proveedor en /tmp/analogos-m10-dev-repro-provider.json es solo sintética/pública. NO ampliar límites ni recortar silenciosamente la respuesta.

Implementar recuperación acotada: solo para explicación con canal geológico y selección semánticamente inválida, una única segunda llamada con los mismos hechos/esquema y recordatorio preciso de los topes/IDs. Sin reenviar texto libre de proveedor; mensaje fijo o motivos tipados/controlados. Revalidar entero M8+geología; si vuelve a fallar, error existente y fallback intacto. No reintentar timeout/refusal/rate-limit/truncation ni M8 sin geología. Preservar plazo TOTAL configurado para la operación (la segunda llamada usa restante, no duplica 20s), procedencia de la respuesta finalmente aceptada y no registrar secretos/cuerpos de usuario. Documentar que el consumo de una segunda llamada no aparece agregado en provenance de la respuesta final; mejor añadir evidencia solo en tests, no cambiar contrato público M8.

Se autoriza reforzar prompt con presupuesto efectivo min(12,3*sectores elegibles), incluyendo límite por sector. No usar maxItems: documentación oficial de Anthropic limita arrays y requiere postvalidación (https://platform.claude.com/docs/en/build-with-claude/structured-outputs).

Tests proporcionales: primera respuesta 4 IDs válidos AR6 -> segunda3 válida; segunda inválida -> rechazo; ajenos/duplicados no se aceptan; sin cambio de evaluación; no retry M8/errores upstream; plazo restante; retorno de provenance segunda. Ejecutar los tests de IA/geología, typecheck/build y caso real sintético AR6, guardando evidencia sin datos privados. No reescribir ciencia/shared/mission/artefactos/contratos/UI. ZIP no cambia si solo servidor. Actualiza progreso y devuelve Owner Codex/status review. No commit/push/deploy/subagentes.

## Aceptación ronda 3 por Codex

Revisados diff, límite de un reintento, plazo compartido, procedencia final, postvalidación completa y pruebas. 316 Python/332 web correctos. Repros de integridad y exports históricos siguen validando correctamente; 33 archivos protegidos intactos. Codex publica esta corrección y verifica dev. Claude sin nueva asignación.

## Cierre definitivo de Codex

Código 4708b42b4bd152dca74d3e009f233a910e458d8b; Actions 43665786554 correcto. IA geológica real en dev y exportación descargada verificadas contra los datos oficiales. Ver docs/DEV_AI_VERIFICATION.md y docs/CODEX_M10_REVIEW.md. Claude sin nueva tarea; main conservado por esta entrega.
