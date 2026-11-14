# ADR-009 — Recomendación guiada por prueba, con asistencia de IA

- Fecha: 2026-11-14
- Estado: accepted por Codex; implementación local M8 revisada y aceptada, con límites de entrega registrados en `docs/CODEX_M8_REVIEW.md`
- Autorización: Dan pidió implementar los recorridos definir una prueba/elegir un sector y recibir una recomendación con datos e IA, bajo supervisión de Codex. Eligió Anthropic como proveedor.

## Problema y usuario

El responsable de una campaña de robótica planetaria debe justificar dónde hacer reconocimiento, qué condiciones reproduce cada terreno y qué evidencia falta. La interfaz comienza por esa decisión y conserva el explorador científico.

## Decisión

1. Dos entradas: definir el ensayo y evaluar un sector. Un brief editable se convierte en requisitos explícitos que el usuario confirma antes de evaluar.
2. Primer perfil soportado: movilidad/navegación de rover marciano con referencia regional Jezero y evidencia v3. Otros objetivos se registran como no soportados o pendientes de datos; no reutilizar scores para Luna, hábitats, perforación o astrobiología.
3. Capa de decisión determinista sobre v3: requisitos del usuario, cumplimiento por criterio, incompatibilidades y evidencia ausente separados de similitud/confianza originales. No cambiar pesos, tolerancias, datos ni calidad científica.
4. Los requisitos críticos se evalúan antes de ordenar. Un desconocido no cumple ni se compensa por similitud alta. La similitud no es probabilidad de éxito. Nunca declarar aprobado, seguro, libre ni autorizado.
5. Yungay sigue referencia en la búsqueda histórica y puede ser alternativa conocida para una prueba; su rol siempre visible, sin declararlo descubrimiento.
6. Sectores cubiertos: evidencia del polígono completo. Coordenadas/bbox nuevas: resolver cobertura sin asignar métricas del vecino a una geometría diferente. Sin evidencia suficiente, entregar diagnóstico y solicitud reproducible de análisis. Este corte no lanza descargas globales ni sustituye datos faltantes por IA.
7. IA Anthropic solo servidor: propone borrador estructurado y explica una recomendación calculada. No crea scores, hechos geográficos, permisos, citas ni requisitos oficiales. Fuentes y valores provienen de artefactos validados.
8. Extensión autorizada al P0: endpoint mínimo opcional de IA (Vercel/Node) y servidor local equivalente, sin base de datos, cuentas nuevas ni agentes autónomos. Credenciales por entorno, nunca VITE_ ni navegador. Envío del texto a Anthropic solo al accionar IA, explicado junto al botón.
9. Recorrido manual, motor y exportación funcionan sin red ni clave. Falla del proveedor se identifica como IA no disponible; no atribuir una plantilla a IA. ZIP portable manual, sin secretos ni funciones servidor.
10. Contratos aditivos de solicitud/evaluación/respuestas IA, validación estricta, límites de tamaño y tiempo, escape de texto, referencias restringidas al catálogo. Sin ejecución de código ni navegación arbitraria desde briefs.

## Validación

Corrección de integración Vercel (2026-11-14): el núcleo puro de requisitos y los validadores viven en `shared/`, fuera del paquete ESM de la web. La web conserva reexports y el servidor importa directamente el núcleo compartido. Esto evita que la función CommonJS requiera archivos emitidos como ESM por el `package.json` anidado de `apps/web`. No hay dos motores ni cambios de fórmulas. CI ejecuta la función realmente empaquetada (GET 405 y POST sin clave 503) antes de desplegar; ese control verifica también presencia de snapshot y contratos.

Requisitos distintos, exclusiones, datos insuficientes, Yungay, zonas sin cobertura, IA malformada/timeout/sin clave, respuestas tardías y modo sin WebGL. Prueba real de Anthropic con credencial configurada; mocks no la sustituyen. Detalle en project/NEXT_TASK.md.

## Fuentes

- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://vercel.com/docs/functions/runtimes/node-js
- https://www.nasa.gov/solar-system/moon/nasa-testing-advanced-capabilities-for-moon-mars-rovers/

## Límites

Validar utilidad con responsables de campañas. Faltan datos de campo, territorio, perfiles adicionales y adquisición interactiva para nuevos sectores. Novedad bibliográfica y conveniencia para una prueba son preguntas independientes.
