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
- Operaciones `draft` (`brief`) y `explain` (`request` confirmada + huella). `explain` recalcula la evaluación en el servidor desde `artifacts/science-v3` validado; no acepta hechos del cliente.
- La salida del proveedor se valida con JSON Schema estricto antes de usarse; negativa, truncado, IDs ajenos o JSON inválido se descartan sin reparar.
- Errores con mensajes fijos: nunca se refleja el cuerpo del proveedor, la clave ni trazas. Sin logs de briefs.
- Límite de frecuencia: 8 llamadas/min por cliente y 60/min global, **en memoria por instancia (no distribuido)**.
- **Origen**: se acepta loopback `http` (no en `VERCEL_ENV=production`), los hostnames de `VERCEL_URL`/`VERCEL_BRANCH_URL`/`VERCEL_PROJECT_PRODUCTION_URL`, orígenes explícitos y el mismo host de la petición (alias). Sin comodines. **La comprobación de `Origin` limita el uso desde navegadores; no es autenticación.** El despliegue `dev` sigue bajo la protección existente de Vercel; no se modificó.

## Qué se envía a Anthropic

- Borrador: el texto del brief.
- Explicación: los nombres/detalles de los requisitos confirmados y los resultados ya calculados (estados, ids). **No** se envía el texto completo del brief.
- El botón de cada operación lo explica junto a sí; el recorrido manual no transmite nada.

## Procedencia

Cada llamada devuelve modelo, fecha, `request-id`, uso de tokens y `stop_reason`. El JSON exportado guarda borrador y explicación por separado, vinculados a su huella de entrada, con los cambios del usuario calculados (editados/quitados/añadidos). Si el usuario edita el brief después, el borrador deja de atribuirse a la IA.

## Estado de verificación y pendiente en Vercel

Entrega autorizada después de la revisión local: el workflow `vercel-deploy.yml` recibe `ANTHROPIC_API_KEY` desde GitHub Secrets y la inyecta con `vercel deploy --env` solo para `dev`, junto al modelo. No se entrega al build ni se necesita copiar el `.env` al repositorio. Para rotarla, actualizar ese secreto y volver a desplegar dev. La protección existente sigue activa. Referencia: [variables de runtime en Vercel CLI](https://vercel.com/docs/cli/deploy#env). La verificación remota se registrará al concluir el despliegue.

- Verificado: handler (tests), servidor local de Vite (`dev` y `preview`) y llamadas reales a Anthropic desde ese servidor (ver `project/M8_PROGRESS.md`).
- **No verificado aún en Vercel** (no se publicó nada): compilación de `api/ai.ts` y trazado de los JSON dentro de la función, duración máxima y variables de entorno.
- Para activarla allí, el equipo debe definir `ANTHROPIC_API_KEY` (y opcionalmente `ANTHROPIC_MODEL`) en las variables del proyecto Vercel y revisar un preview. Esta tarea no cambió secretos remotos, protección, workflows ni `vercel.json`.
- El ZIP portable (`submission/analogos-static.zip`) no incluye función ni clave: la IA aparece «no disponible» con un mensaje claro y el modo manual sigue completo.
