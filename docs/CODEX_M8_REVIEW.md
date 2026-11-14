# Revisión y aceptación M8 — Codex

Fecha: 2026-11-14. Implementación: Claude Code, supervisada por Codex con dos devoluciones y correcciones verificadas. Base: `4d197e17893dc4eef2dc5c9771c79813c909b657`, rama local `dev`. Sin commit, push ni publicación de M8.

## Decisión

Aceptada la implementación local del planificador para responsables de campañas de robótica planetaria. Permite definir un ensayo o elegir un sector, revisar y confirmar requisitos, recibir una priorización reproducible y exportar el diagnóstico. Anthropic funciona realmente como ayuda opcional para proponer requisitos y destacar razones ya calculadas.

La aceptación cubre software e integración local, no aptitud de campo ni un despliegue remoto verificado. El perfil disponible es rover marciano/Jezero; la evidencia corresponde a seis candidatos de Chile y Argentina más Yungay como referencia conocida. No se adquirieron datos para geometrías nuevas ni se habilitó búsqueda global en vivo.

## Evidencia independiente

| Comprobación | Resultado |
|---|---|
| `source .venv/bin/activate && npm run verify` | 177 pruebas Python, 196 web, 2 pruebas de IA real omitidas por defecto; typecheck del servidor y build correctos |
| Auditoría adicional de Codex | 10/10 casos pasan, separada de las pruebas escritas por Claude |
| Baseline de ciencia, contexto visual, configuración y contratos existentes | Los 38 archivos conservan sus hashes |
| Empaquetado repetido | Dos ejecuciones producen el mismo ZIP; sus 30 entradas coinciden byte por byte con `apps/web/dist` |
| Clave y paquete | La clave real no aparece en archivos versionables ni en las entradas del ZIP; `.env` ignorado; sin función servidor en el paquete estático |
| Navegador escritorio | Ambos recorridos, confirmación, resultados, edición que invalida resultados, errores de coordenadas, exportaciones JSON y funcionamiento con IA real |
| Móvil | 390 × 844, controles y textos legibles, ancho de documento 390 px; sin desbordamiento horizontal observado |
| Teclado | Entrada al recorrido y confirmación con Enter; foco/anuncio de paso presentes |
| ZIP bajo `/AnalogOS/` | Aplicación y datos locales cargan; red externa bloqueada en la prueba; IA ausente da error claro y el recorrido manual continúa |
| Informe imprimible | Contenido y condiciones efectivas comprobados con pruebas de renderizado y revisión de CSS; vista nativa de impresión pendiente de inspección visual |

La auditoría independiente incluye selección sensible al umbral (pendiente regional ≤ 2,3° deja un sector; ≤ 0° deja cero), Yungay evaluable como referencia, subpolígono que no hereda estadísticas, rechazo de exportación de otra solicitud, escala puntual no convertida en mediana regional, timeout durante lectura del cuerpo, huellas SHA-256 compatibles con Node, respuesta vigente con huella equivocada que termina en error, procedencia conservada tras reintento fallido y umbral diminuto que nunca se muestra como cero.

Los archivos temporales de auditoría de esta sesión fueron `/tmp/analogos-m8-audit.test.ts`, `/tmp/analogos-m8-audit.config.mjs` y `/tmp/analogos-m8-final-verify.log`. Las regresiones correspondientes también se incorporaron a las pruebas del repositorio. No se cuentan las nueve pruebas de snapshot repetidas durante el build como pruebas adicionales.

## Anthropic real

Codex verificó desde la interfaz, con entradas de ejemplo inocuas y `claude-sonnet-5-5`:

| Operación | Fecha UTC | Request ID | Tokens entrada/salida |
|---|---|---|---|
| Destacar razones de una evaluación | 2026-11-14T20:20:48.843Z | `req_011Ch3SZfUu5fd5ACoQKqHWc` | 4365 / 398 |
| Proponer requisitos editables | 2026-11-14T20:25:27.672Z | `req_011Ch3SuvcnEHTWXVzW1LFvG` | 2162 / 846 |

Ambas terminaron con `end_turn`. Se descargaron y revisaron los JSON desde el navegador: procedencia de borrador y explicación separadas, requisitos confirmados, geometría, evaluación y fuentes coherentes. Resumen local sin secretos: `../outputs/analogos-m8-browser-ai-smoke.json` respecto de la raíz del repositorio. Las pruebas reales adicionales de Claude constan en `project/M8_PROGRESS.md`.

Después de estas llamadas solo se ajustaron textos/formato de presentación; se repitieron pruebas completas y build. No se presenta la prueba local como comprobación de la función desplegada en Vercel.

## Correcciones exigidas durante la supervisión

- Geometría: coincidencia exacta con tolerancia solo numérica; ni una subárea casi idéntica recibe medidas del polígono completo. Punto dentro de ventana exige seleccionarla explícitamente; fuera de cobertura produce diagnóstico, sin vecino sustituto.
- IA: JSON estricto, cifras y países anclados a la cita del brief, distinción entre máximos puntuales y medianas regionales. Timeout cubre cabeceras y cuerpo. El servidor recalcula hechos desde el snapshot y nunca acepta scores del cliente.
- Estado: edición invalida confirmación y resultado; respuestas tardías no contaminan otro pedido; huella incorrecta de una respuesta vigente termina en error. Un reintento fallido conserva la procedencia del borrador aún utilizado.
- Exportación: revalida solicitud y evaluación; conserva borrador original, cambios del usuario y explicación por separado. No exporta resultados de otra solicitud.
- Presentación: confirmación muestra umbrales reales, unidades y escala; informe contiene condiciones y geometría incluso sin opciones. Preferencias desconocidas dejan comparación parcial. Tracción, permisos y máximos puntuales no se anuncian como medidos.
- Ajuste final de Codex: números extremadamente pequeños conservan notación científica en vez de redondearse a cero; etiqueta de cobertura válida tanto para una ventana como para el catálogo. Regresión en `missionFormat.test.tsx`.

## Artefacto y reproducción

- ZIP vigente: `submission/analogos-static.zip`, **12.987.711 bytes**, **30 entradas**.
- SHA-256: `440b295e936613eea74e43e74cd2f978defd2e8c01b72e7bedcdd359b8d2b5da`.
- Checksum propio: `submission/analogos-static.zip.sha256`; `SHA256SUMS.txt` corresponde al ZIP histórico v2 y se conserva.
- Captura revisada: `submission/assets/analogos-m8-review.png`.

```bash
source .venv/bin/activate && npm run verify
npm run release:package
(cd submission && shasum -a 256 -c analogos-static.zip.sha256)
npm run preview -- --host 127.0.0.1 --port 4187 --strictPort
```

La vista local queda en `http://127.0.0.1:4187/` mientras el proceso siga activo. `npm run test:ai-live` realiza llamadas reales y requiere la configuración local descrita en `docs/AI_SETUP.md`; no forma parte de las pruebas por defecto.

## Pendientes y límites de aceptación

1. Publicar y probar la función en Vercel en una etapa de entrega posterior: configurar variables del proveedor en el entorno correcto y verificar inclusión de artefactos, duración y recorrido real. No se tocaron secretos remotos, autenticación ni workflows.
2. Revisar visualmente la impresión nativa en el equipo de presentación. El intento desde IAB no permitió observar el diálogo y el acceso a la aplicación nativa fue rechazado por seguridad; no se eludió la restricción ni se afirma haber impreso un PDF.
3. Validar utilidad con responsables de campañas; integrar territorio, bibliografía adicional y contraste climático local. Los datos agregados no miden tracción ni obstáculos a escala de rueda, y no autorizan acceso.
4. El límite de frecuencia es básico, en memoria y por instancia; el control de origen no sustituye autenticación. Debe revisarse si se amplía la exposición del servicio.

Claude queda sin una nueva asignación. La siguiente tarea debe constar explícitamente en `project/NEXT_TASK.md`.
