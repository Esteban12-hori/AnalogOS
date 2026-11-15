# Asistencia de IA (M8) — configuración y límites

La IA es **opcional**: sin clave, sin red o en el ZIP estático el planificador funciona completo de forma manual. Ver ADR-009.

## Qué hace y qué no

- **Borrador** (`draft`): convierte el texto de la prueba en requisitos estructurados **sin confirmar**. Cada requisito cita un fragmento literal del brief; las cifras deben aparecer en esa cita; una métrica topográfica sin «mediana/regional/ventana completa» queda como escala puntual (no evaluable) con una pregunta.
- **Explicación** (`explain`): la IA solo **selecciona** referencias (sectores, requisitos, evidencias, verificaciones) entre IDs que el servidor recalcula. No escribe prosa. Estados, valores, exclusiones y bloqueos los pinta siempre la app desde el motor determinista.
- La IA nunca elige pesos, puntajes, veredictos, fuentes ni hechos geográficos.

## Variables (solo servidor; nunca con prefijo `VITE_`)

Copiar `.env.example` a `.env` (ignorado por git) y completar:

| Variable | Uso |
|---|---|
| `ANTHROPIC_API_KEY` | clave del proveedor; sin ella la IA queda «no disponible» |
| `ANTHROPIC_MODEL` | modelo; por defecto `claude-sonnet-5-5`; un nombre mal formado desactiva la IA |
| `ANALOGOS_AI_ALLOWED_ORIGINS` | orígenes exactos extra, separados por coma (opcional) |
| `ANALOGOS_AI_TIMEOUT_MS` | tiempo máximo del proveedor, 1000–55000 (por defecto 20000) |

## Ejecutar en local

- `npm run dev` (Vite en 127.0.0.1) y `npm run build && npm run preview` sirven `/api/ai` con la misma lógica que Vercel (`server/ai/`). Solo se leen `ANTHROPIC_*` y `ANALOGOS_AI_*` del `.env` raíz, en el proceso Node.
- Prueba real opcional: `npm run test:ai-live` (llama a Anthropic; imprime solo modelo, request-id, fecha y uso).
- Los tests automáticos (`npm run verify`) usan `fetch` simulado y nunca la red.

## Endpoint `POST /api/ai`

- Cuerpo JSON ≤ 24 KB; brief ≤ 3000 caracteres; `max_tokens` 2000; timeout cubre cabeceras **y** lectura del cuerpo.
- Operaciones `draft` (`brief`) y `explain` (`request` confirmada + huella + `geology_context_fingerprint` opcional). `explain` recalcula la evaluación en el servidor desde `artifacts/science-v3` validado; no acepta hechos ni geodatos del cliente.
- La salida del proveedor se valida con JSON Schema estricto antes de usarse; negativa, truncado, IDs ajenos o JSON inválido se descartan sin reparar.
- Errores con mensajes fijos: nunca se refleja el cuerpo del proveedor, la clave ni trazas. Sin logs de briefs.
- Límite de frecuencia: 8 llamadas/min por cliente y 60/min global, **en memoria por instancia (no distribuido)**.
- **Origen**: se acepta loopback `http` (no en `VERCEL_ENV=production`), los hostnames de `VERCEL_URL`/`VERCEL_BRANCH_URL`/`VERCEL_PROJECT_PRODUCTION_URL`, orígenes explícitos y el mismo host de la petición (alias). Sin comodines. **La comprobación de `Origin` limita el uso desde navegadores; no es autenticación.** El despliegue `dev` sigue bajo la protección existente de Vercel; no se modificó.

## Qué se envía a Anthropic

- Borrador: el texto del brief.
- Explicación (sin geología): los nombres/detalles de los requisitos confirmados y los resultados ya calculados (estados, ids). **No** se envía el texto completo del brief.
- Explicación **con orientación geológica** (casilla opt-in en la pantalla de resultados): además se envían el **objetivo confirmado** (texto del brief, actividad, objetivo y requisitos) y la **cartografía geológica pública oficial** de los sectores evaluados y no descartados (nombre, código y descripción original de cada unidad, fracciones de cobertura, escala y fuente). Entrada típica ≈ 25 000 tokens.
- El botón de cada operación lo explica junto a sí; el recorrido manual no transmite nada.

## Orientación geológica (M10, opt-in)

- El cliente declara `geology_context_fingerprint` (SHA-256 del JSON canónico completo del contexto validado en el navegador). El servidor carga su propio paquete (`server/ai/geology.ts`), lo valida con `shared/geology/context.ts` y comprueba el SHA-256 de los bytes de `candidate-details.json`. Sin huella no hay canal geológico y el comportamiento es el de M8.
- Errores antes del proveedor: `geology_context_unavailable` (el servidor no tiene un paquete válido o falta) y `geology_context_stale` (otra versión), ambos 409; la UI ofrece «Reintentar sin geología».
- La IA devuelve `geology_ref_ids` (hasta 3 por sector y 12 en total) tomados de un catálogo cerrado de pares unidad+propósito; cualquier id ajeno, repetido o fuera de tope descarta toda la respuesta. `max_tokens` 6000 solo con canal geológico (con 2000 la prueba real se truncaba).
- Respuesta: `geology: { context_fingerprint, catalog_fingerprint, selection: { ref_ids } }`, separada de la selección M8. Objetivo, brief y descripciones de unidades viajan como datos JSON dentro de `<geology>` con `<` escapado (no pueden cerrar el delimitador).
- Función Vercel: `vercel.json` incluye `artifacts/geology-context-v1/index.json` y `artifacts/science-v3/candidate-details.json` en `api/ai.ts`; `scripts/check-vercel-function.mjs` comprueba (en CI, sobre la función ya construida) que el paquete viaja y valida, y la ausencia/corrupción aisladas en una copia temporal.
- Prueba real opcional: `npm run test:ai-live` incluye dos objetivos contrastantes (movilidad frente a muestreo); no asume estabilidad exacta del modelo.

- **Recuperación acotada**: si la llamada tiene éxito pero la selección (M8 o geología) es semánticamente inválida, se hace una única segunda llamada con los mismos hechos/esquema y un recordatorio fijo por motivo tipado, dentro del plazo total configurado (la segunda usa el restante; sin restante ≥ 2 s no se intenta). No se reintenta ante timeout, negativa, límite de frecuencia, truncamiento ni errores upstream, ni M8 sin geología. La procedencia es la de la respuesta aceptada; el consumo de la primera no se agrega. El prompt fija `budget = min(12, 3 × sectores con referencias)`.

## Procedencia

Cada llamada devuelve modelo, fecha, `request-id`, uso de tokens y `stop_reason`. El JSON exportado guarda borrador y explicación por separado (con geología, el wrapper `analogos-mission-geology-export` añade la selección geológica de la misma llamada), vinculados a su huella de entrada, con los cambios del usuario calculados (editados/quitados/añadidos). Si el usuario edita el brief después, el borrador deja de atribuirse a la IA.

## Despliegue dev verificado

Dan autorizó la publicación. El workflow `vercel-deploy.yml` recibe `ANTHROPIC_API_KEY` desde GitHub Secrets y la inyecta con `vercel deploy --env` solo en runtime de `dev`, junto al modelo. No se entrega al build ni se necesita copiar `.env` al repositorio. Para rotarla, actualizar ese secreto y volver a desplegar dev. La protección de Vercel sigue activa. Referencia: [variables de runtime en Vercel CLI](https://vercel.com/docs/cli/deploy#env).

- Handler, servidor local y función desplegada verificados, incluidas llamadas reales de borrador y explicación desde https://analogos-dev.vercel.app/. Evidencia, request IDs y exportación en `docs/DEV_AI_VERIFICATION.md`.
- Código desplegado `9060970`; Actions 43639834860 correcto. Núcleo único en `shared/` para evitar mezclar paquetes CommonJS/ESM. CI comprueba arranque, contratos y snapshot del paquete real antes de desplegar.
- La configuración de IA se entrega al despliegue desde GitHub; editar únicamente una variable de proyecto Vercel con el mismo nombre no sustituye el secreto que usa este workflow.
- El ZIP portable (`submission/analogos-static.zip`) no incluye función ni clave: la IA aparece «no disponible» con un mensaje claro y el modo manual sigue completo.
