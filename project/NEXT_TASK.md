# Encargo vigente — definir una prueba o evaluar un sector

## Estado

- **Task ID:** M8-MISSION-RECOMMENDATION
- **Owner:** Codex
- **Status:** accepted
- **Branch:** dev
- **Base commit:** 4d197e17893dc4eef2dc5c9771c79813c909b657
- **Dirección, supervisión y aceptación:** Codex. Dan autorizó esta implementación el 2026-11-14 y eligió Anthropic para la IA.
- M7 aceptado, archivado en project/tasks/M7_GLOBAL_DISCOVERY.md. La versión integrada tiene globo, MapLibre, liquid glass, series y ciencia v3: conservar el trabajo del equipo.
- La implementación de Claude no autorizaba publicación. Tras la aceptación, Dan autorizó a Codex el 2026-11-14: «súbelo a dev y verifica que la IA funcione ahí también». Esto habilita commit/push, configuración de Anthropic para dev y verificación remota; no promoción a main.

## Resultado de producto

Usuario: responsable de campaña de robótica planetaria en laboratorio, universidad o empresa. Decisión: «Para este ensayo, ¿qué sector merece reconocimiento, por qué, qué lo descarta y qué falta medir?».

Entregar dos recorridos completos, con datos reales y asistencia opcional Anthropic:

1. **Definir una prueba:** describir objetivo, revisar requisitos estructurados editables, confirmarlos, comparar opciones y exportar recomendación reproducible.
2. **Evaluar un sector:** elegir una de las siete áreas con evidencia o introducir coordenadas/bbox; comprobar qué geometría tiene datos, aplicar la prueba y entregar evaluación o informe explícito de evidencia insuficiente.

Primer perfil científico soportado: rover marciano/Jezero. Fuera de cobertura debe completarse el diagnóstico y solicitud de datos; no fabricar una recomendación positiva ni anunciar búsqueda global en vivo.

## Primer checkpoint obligatorio

Leer AGENTS, CLAUDE, STATUS, ADR-001 a 009, PRODUCT_AND_SCIENCE, DATA_AND_SCORING y contratos. Confirmar rama, HEAD y cambios ajenos. Codex verificó base: 177 Python, 69 web y build; hashes en /tmp/analogos-m8-baseline-hashes.json.

**Antes de editar implementación, entregar a Codex un plan compacto: archivos, requisitos/estados, resolución espacial, endpoint y pruebas. Esperar su devolución.** Se permite inspeccionar y preparar el plan/ADR. Sin subagentes ni sesiones paralelas. Mientras Claude implementa, Codex revisa sin editar su alcance.

## 1. Experiencia

- Entrada principal «Definir una prueba» / «Evaluar un sector», explicación del problema y ejemplo. Conservar explorador, búsqueda v3, comparación y método.
- Flujo progresivo accesible en escritorio, móvil y teclado, integrado en diseño existente. No forzar recorrer fichas largas para comenzar.
- Brief máximo 3000 caracteres, actividad, destino/referencia, requisitos. Un solo perfil realmente soportado, sin perfiles ficticios para llenar selectores.
- Requisitos medibles disponibles: mediana de pendiente regional (grados), rugosidad mediana (m), relieve (m), fracción no vegetada (% o 0–1 con conversión explícita), área del polígono completo (~km²), países. Cada uno: operador/rango, unidad, imprescindible o preferencia. Mostrar pocos al inicio y más detalle opcional.
- Máxima pendiente puntual del rover, tamaño de roca, tracción, suelo suelto, carretera, coste, permisos, fecha operativa, lluvia local y cobertura móvil no están medidos. Conservar estos pedidos como no evaluables; no reinterpretarlos silenciosamente como una métrica disponible.
- Requisito guarda origen usuario/IA, escala y confirmación. Mostrar lo no estructurado del brief como preguntas/pendientes. Usuario confirma/edita antes de evaluar; ninguna restricción oculta o descartada en silencio.
- Cambiar brief/requisitos/sector invalida resultados previos. Cancelar/ignorar respuestas tardías mediante fingerprint o request ID. No mezclar dos solicitudes.
- Mantener texto al volver. Sin almacenar briefs en logs/backend. Persistencia local solo si se explica y permite borrar.

## 2. Motor verificable

- Módulo puro y contratos aditivos de solicitud/evaluación. Ciencia v2/v3 byte a byte intacta; sin modificar pesos, tolerancias, quality ni perfiles científicos.
- La IA no elige pesos/score/veredicto. Requisitos del usuario son condiciones de su ensayo, no estándares NASA.
- Requisitos críticos primero: incumplimiento observado => incompatible; faltante/escala inadecuada => evidencia insuficiente. Un score alto no compensa bloqueos ni desconocidos.
- Entre opciones con críticos evaluables cumplidos, ordenar por preferencias satisfechas y luego similitud v3, desempate estable por ID. Documentar orden. Sin nuevo porcentaje de aptitud. Preferencias desconocidas conservan comparabilidad parcial, no equivalen a cero ni prueban dominancia.
- Estados: priorizado para reconocimiento, no cumple requisitos, evidencia insuficiente, objetivo no soportado. Factibilidad territorial independiente y pendiente. Es válido no recomendar ninguno.
- Por opción: requisito, valor/unidad, cumple/no cumple/no evaluable, razón, fuente/evidence_id y escala/periodo; similitud/confianza originales rotuladas. Incluir límites, verificaciones de campo y qué evidencia cambiaría la decisión.
- Área es extensión del polígono, no hectáreas libres. SCL no prueba tracción/mineralogía. POWER contextual no aprueba lluvia local ni pronósticos.
- Yungay evaluable como alternativa conocida, rol referencia visible. No modificar ranking M7 ni aplicar su exclusión de antecedentes al problema de seleccionar campaña.
- Exportación JSON validada con solicitud confirmada, reglas/versiones, snapshot/perfil, geometría pedida vs medida, evaluación, evidencias, límites y provenance IA cuando exista. Informe legible imprimible (CSS print basta).

## 3. Geometría y cobertura

- Seleccionar siete sectores desde lista/mapa/ficha con país y polígono visibles. Coordenadas y bbox como alternativa accesible; dibujo de rectángulo opcional sin librería nueva si no es necesaria.
- Validar rangos, orden lon/lat, finitud, bbox y tamaño. Punto dentro de área: «hay evidencia de esta ventana, no del punto exacto», y selección explícita de esa ventana antes de evaluarla. Resolver múltiples coincidencias.
- Subpolígono o cobertura parcial NO heredan métricas agregadas del polígono completo. Informar cobertura/evidencia faltante; ofrecer evaluar la ventana completa solo por acción explícita.
- Fuera de piloto: sin evidencia suficiente y solicitud exportable con bbox/requisitos/fuentes previstas. Sin vecino más cercano, fake loading ni consultas satelitales simuladas. No adquisiciones nuevas en M8.

## 4. Anthropic real y opcional

- Proveedor elegido por Dan. Aún no hay clave al asignar; Codex prepara entrada local segura. No leer/imprimir secretos ni pedirlos por chat. Solo entorno/.env ignorado consumido por programa.
- Dos operaciones: extraer borrador del brief y explicar evaluación calculada. Contexto limitado al catálogo/evidencias suministrados. Sin herramientas, shell, navegación arbitraria, datos externos libres ni agentes.
- `ANTHROPIC_API_KEY` y `ANTHROPIC_MODEL` solo servidor; modelo configurable y soportado (comprobar docs/cuenta). Host oficial fijo, sin URL arbitraria del cliente.
- JSON Schema y validación sintáctica/semántica; manejar negativa, salida truncada, citas/IDs ajenos, errores y timeout. Structured outputs no admite citas nativas: usar evidence IDs validados y enlaces aportados por app.
- El servidor obtiene hechos/scores de artefactos versionados y solicitud validada, no del navegador. Rechazar IDs/fuentes ajenos. La IA nunca cambia el motor ni resultados. Mostrar interpretación separada de métricas.
- No presentar narración que contradiga los bloqueos; puede seleccionar razones/referencias estructuradas para que el renderizador conserve los hechos. Respaldo determinista siempre rotulado como tal, sin simular IA.
- Endpoint mínimo `api/` Vercel Node, lógica separada testeable y servidor local equivalente con proxy Vite. Sin DB ni login nuevo. Ningún secreto en VITE_, bundle, ZIP, prompt, respuesta o log.
- POST/content type, tamaño de cuerpo/brief, timeout, tokens de salida acotados, origen permitido local/preview explícito, llamadas por botón y bloqueo durante llamada, errores sanitizados, protección básica de frecuencia documentada como no distribuida. No generación general abierta.
- Explicar junto al botón que el texto se envía a Anthropic. El camino manual no transmite datos.
- Sin clave/offline/proveedor caído: recorrido manual y recomendación funcionan, IA no disponible. Nunca atribuir plantilla o mock a IA real.
- Para aceptar integración real: un borrador y una explicación con entradas inocuas, registrar modelo/fecha/request ID/uso sin secretos. Si no está la clave, informar bloqueo específico, no afirmar éxito por mocks.

## 5. Alcance técnico autorizado

Nuevos contratos/módulo decisión/IA, planificador, App/mapa/fichas, API/local server/proxy, scripts de pruebas, `.env.example`, ADR-009, documentación de producto/arquitectura/presentación. Dependencias mínimas justificadas en checkpoint. Adaptar empaquetador solo con lista explícita de nuevos assets; conservar controles.

Sin tocar datos científicos v2/v3, configs de ciencia, datos crudos, credenciales, protección/auth Vercel, workflows de deploy, remotos ni rediseño ajeno. Sin nuevas regiones, pesos, perfiles científicos, SAR, ML entrenado, documentos privados ni barridos en vivo.

Esta asignación autoriza explícitamente la extensión al antiguo «sin IA/backend». ZIP portable manual; servidor/clave se documentan aparte. No prometer IA offline ni IA disponible sin servicio configurado.

## 6. Aceptación y entrega

1. Brief -> requisitos editables -> confirmación -> recomendación/exportación; editar invalida resultados. Requisito medible cambia selección, crítico imposible deja cero; no evaluable nunca aprueba.
2. Objetivos no soportados, pendiente puntual/tracción y preferencias desconocidas conservan límites. Yungay referencia evaluable, Chile/Argentina correctos.
3. Sectores existentes, punto dentro/fuera, bbox parcial/subpolígono, coordenadas inválidas y salida sin evidencia; sin trasladar métricas a otra geometría.
4. IA: borrador/explicación reales, sin clave, timeout, negativa, JSON truncado, IDs/citas inventados, texto adversarial y respuestas tardías. Sin red real en tests automatizados por defecto.
5. Endpoint no confía en hechos cliente, secretos no filtrados, errores sanitizados, restricciones acotadas. Añadir pruebas servidor al comando verify.
6. `source .venv/bin/activate && npm run verify`; `npm run release:package`; checksum, ZIP repetido idéntico y baseline científico intacto.
7. Navegador escritorio/móvil, teclado, errores, ambos recorridos, exportación, sin WebGL y modo manual offline; ZIP bajo /AnalogOS/. Codex revisará independientemente.
8. Actualizar STATUS, CHANGELOG y NEXT_TASK a Owner Codex / Status review. Reportar archivos, tests, pruebas reales IA, límites y comandos exactos. No autoaceptar, commit ni push.

Después de M8: adquisición para geometrías nuevas, territorio y perfiles adicionales, tras validar esta experiencia con usuarios. No iniciar esas tareas automáticamente.

## Entrega de Claude (2026-11-14) — para revisión de Codex

Etapas A (corregida según la revisión) y B implementadas; ver `project/M8_PROGRESS.md` (archivos, pruebas, IA real, límites) y `docs/AI_SETUP.md`. No autoaceptada: sin commit ni push. Pendiente de Codex: CUA de escritorio/móvil/teclado/impresión, revisión de Vercel sin publicar y decisión de aceptación.


## Devolución Codex — revisión de interfaz (2026-11-14)

La implementación aún no está aceptada. Auditoría independiente: 9/9; navegador confirma flujo manual, cero priorizados con crítico imposible, IA real de explicación, exportación JSON, invalidación al editar, punto con selección explícita, fuera de cobertura y móvil 390 px.

Claude debe aplicar los puntos 3 a 6 de `/tmp/analogos-m8-review-B.txt` (1 y 2 ya corregidos): informe impreso autosuficiente con umbrales/unidades/escala y geometría pedida/medida explícitas; confirmación con valores reales editados; unidades humanas en interfaz; retirar «M8» del texto del usuario y etiqueta de escala incorrecta para área/país. Ajustar texto hero para no sugerir que se mide tracción. Mantener ciencia intacta. Volver a status review / Owner Codex tras verificación proporcional, build y ZIP determinista. Sin commit/push.

### Revisión B aplicada (2026-11-14)

Puntos 3–6 de `/tmp/analogos-m8-review-B.txt` aplicados (formateo humano, confirmación con condiciones efectivas, informe impreso autosuficiente, microcopia «Esta versión», escala genérica y hero). Detalle en `project/M8_PROGRESS.md`. Sin commit ni push; no autoaceptada.

## Aceptación final de Codex (2026-11-14)

Implementación local aceptada tras revisión independiente: 177 Python, 196 web (+2 pruebas reales omitidas por defecto), typecheck/build, auditoría adicional 10/10, IA real desde navegador, escritorio/móvil, geometría, exportaciones y ZIP estático sin servicio de IA. Los 38 hashes de baseline siguen intactos. Corrección final de formato para umbrales diminutos incluida y verificada.

Informe vigente: `docs/CODEX_M8_REVIEW.md`. ZIP final: 30 entradas, 12.987.711 bytes, SHA-256 `440b295e936613eea74e43e74cd2f978defd2e8c01b72e7bedcdd359b8d2b5da`. Los apartados de entrega/devolución anteriores son históricos.

Pendientes delimitados: prueba remota de Vercel y revisión visual de impresión nativa. No se certifica aptitud científica de campo. Sin commit, push ni publicación. Claude espera nueva asignación; no iniciar otra etapa automáticamente.
