# IA verificada en dev — integración, con antecedentes M10/M9/M8

## Integración Explorar/Misión — Codex, 2026-11-15

**Cierre final publicado:** código `9c183fb8cc5d8adbc717f931efd64bf877ddb0b0`, [Actions 43681551867 correcto](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43681551867), incluyendo arranque aislado de la función empaquetada y alias fijo. Desde una pestaña nueva de dev se repitió AR6 → Evaluar este sector → Enviar: conserva recorrido y geometría. Se repitieron las dos llamadas reales de Anthropic, sin respuestas simuladas.

- Borrador final: `req_011Ch4ApuLtToXEojFVFZVG5`, `2026-11-15T05:35:08.907Z`, `claude-sonnet-5-5`, 2229/1637 tokens, `end_turn`. Seis requisitos sin confirmar; confirmación explícita y una sola ventana AR6 priorizada.
- Explicación/geología final: `req_011Ch4Auogxy1aMjkFPPkkB5`, `2026-11-15T05:36:08.544Z`, mismo modelo, 7521/354 tokens, `end_turn`. Tres referencias válidas: caracterizar material superficial de Galán y depósitos aluviales/coluviales, más reconocer diversidad litológica de Galán. La selección puede variar; las unidades y textos se resuelven contra el catálogo cerrado y el resultado determinista permanece igual.
- `submission/evidence/integration-final-dev-geology-export.json`: validación sin incidencias y reconstrucción idéntica con snapshot/contexto oficiales. SHA-256 `e1d5ffcf461af972a2422423b8da6ec2eeeb953e992360fee3caed07cbaaa653`. Captura `submission/assets/analogos-integration-final-dev.png`.
- El checkpoint posterior solo incorpora documentación y evidencia con `[skip ci]`; no altera el código desplegado ni requiere regenerar el ZIP.

### Prueba inicial sobre la integración de Gus

Sobre `dd625b4` desplegado ([Actions 43678787020](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43678787020)), se probaron realmente **las dos operaciones de Anthropic desde la nueva interfaz**, con geología activada en la explicación. Brief sintético, seis requisitos propuestos sin confirmar, confirmación humana explícita de prueba, una ventana AR6 evaluada y tres referencias geológicas SEGEMAR seleccionadas. Ningún cambio de números, estados ni orden por la IA.

- Borrador: `req_011Ch49r2xSqLrAHSpZDFz6w`, `2026-11-15T05:22:19.635Z`, `claude-sonnet-5-5`, tokens 2229/1842.
- Explicación/geología: `req_011Ch49vXptJHdQhMzJSRTMq`, `2026-11-15T05:23:11.255Z`, mismo modelo, tokens 7536/374.
- Ambas respuestas `end_turn`. Exportación `submission/evidence/integration-dev-geology-export.json`, validada con `validateAnyMissionExport` y reconstruida idéntica con `buildMissionGeologyExport` y datos oficiales. Captura `submission/assets/analogos-integration-dev.png`.
- La revisión corrigió aparte la pérdida de alcance al enviar el brief desde el dock; no cambió el motor, el cliente de IA ni el servidor. Alcance de aceptación y pendientes en `docs/CODEX_INTEGRATION_REVIEW.md`.

Los bloques siguientes conservan los resultados de sus respectivas versiones; no describen el número de pruebas ni el ZIP vigente.

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

## Antecedente M9 — publicación y regresión remota

**M9 completado y publicado en dev.** Código `34e76b9734efab2428013a13c6d0defb8d85d8f4`, Actions correcto: https://github.com/Esteban12-hori/AnalogOS/actions/runs/43658989969. Deploy https://analogos-nmyfr42k8-pruebas-730d0f41.vercel.app, alias https://analogos-dev.vercel.app/. El checkpoint posterior agrega solo documentos/evidencia con `[skip ci]` y conserva ese código desplegado. Main no cambió.

- La función realmente empaquetada pasó el control de arranque (módulos/snapshot/contratos, GET 405 y POST sin clave 503). Se mantuvieron protección Vercel y configuración de credenciales.
- Geología en dev: Chile 99,4 %, Argentina 100 % y referencia Yungay 99,1 % observados; unidades y escala correctas. Exportación argentina descargada y validada, idéntica a la reconstruida desde el paquete: `submission/evidence/m9-dev-geology-export.json`.
- Regresión IA real: brief sintético con pendiente mediana regional ≤ 2,3°, preferencia no vegetada ≥ 95 %, permisos pendientes. Anthropic propuso tres requisitos editables; confirmación explícita y evaluación priorizaron una de siete áreas. La explicación destacó motivos existentes sin alterar números ni exclusiones. Permisos y factibilidad quedaron pendientes.
- JSON de IA descargado desde dev, contrato validado y evaluación recalculada idéntica; reconstrucción completa con `buildMissionExport` también idéntica. Evidencia: `submission/evidence/m9-dev-ai-export.json`.
- Borrador: `claude-sonnet-5-5`, `2026-11-15T00:38:32.854Z`, request `req_011Ch3nDHnwnQR73oKU4vndZ`, tokens 2177/1010, `end_turn`.
- Explicación: `claude-sonnet-5-5`, `2026-11-15T00:39:27.098Z`, request `req_011Ch3nHb48fJE7MMfz5V45L`, tokens 5792/460, `end_turn`.
- Capturas: `submission/assets/analogos-m9-dev.jpg` y `analogos-m9-dev-ai.jpg`. La IA sigue usando exclusivamente el motor/evidencia M8; no consume el nuevo contexto geológico.

Aceptado por Codex tras revisar la implementación de Claude y corregir la presentación final. Claude queda sin nueva asignación. No se afirma validación de campo, exactitud absoluta ni ausencia universal de defectos; las pruebas cubren el alcance M9 y sus regresiones observadas.

## Antecedente M8 — 2026-11-14

**Resultado: publicado y comprobado.** Dan autorizó subir M8 a dev y probar allí la IA. Codex realizó la entrega, corrigió el fallo detectado en la primera publicación y verificó ambas operaciones desde Chrome con la sesión autorizada de Vercel.

- URL del equipo: https://analogos-dev.vercel.app/
- Código desplegado: `9060970ecf71e3c68f7b11a8d220e37e49057dc8`.
- Actions final, correcto: https://github.com/Esteban12-hori/AnalogOS/actions/runs/43639834860
- Deployment: `dpl_Ar1mb5AXiyviiCaBbWmAFPvWmAvE`, https://analogos-op5lhed43-pruebas-730d0f41.vercel.app/
- El checkpoint posterior solo agrega documentación y evidencia; usa `[skip ci]` para conservar este despliegue ya comprobado. Main y producción no se publicaron.

## Prueba real de extremo a extremo

Entrada sintética: ensayo de navegación autónoma de rover marciano, mediana de pendiente regional de la ventana completa ≤ 2,3°, preferencia de superficie no vegetada ≥ 95 % y verificación pendiente de permisos de acceso.

1. «Proponer requisitos con IA» devolvió tres requisitos editables con citas del brief, sin confirmarlos automáticamente. Conservó permisos como no medidos.
2. La confirmación mostró valores/unidades/escala efectivos. La evaluación priorizó `cl-win-s2500-w06970` y descartó los otros seis por incumplir la pendiente requerida; mantuvo comparación parcial y factibilidad territorial pendiente.
3. «Destacar motivos con IA» devolvió una selección válida de motivos calculados; mostró incumplimientos, permisos pendientes y verificaciones. No cambió valores, estados ni ranking.
4. Se descargó el JSON desde dev. Codex validó su contrato, recalculó la evaluación localmente y comprobó igualdad exacta, huella y selección de motivos. Conserva ambas procedencias de Anthropic.

| Operación | Fecha UTC | Modelo | Request ID | Tokens entrada/salida |
|---|---|---|---|---|
| Borrador | 2026-11-14T20:54:49.557Z | claude-sonnet-5-5 | `req_011Ch3V9sX8XWfnCFHCehTem` | 2166 / 870 |
| Explicación | 2026-11-14T20:55:30.448Z | claude-sonnet-5-5 | `req_011Ch3VD7AVeY7uEpeKT9i9e` | 5751 / 461 |

Ambas finalizaron con `end_turn`. Exportación completa del ejemplo: `submission/evidence/m8-dev-ai-export.json`. Captura: `submission/assets/analogos-m8-dev-ai.png`. El observador automático de descarga agotó su espera; el navegador sí había guardado el archivo, recuperado del disco y validado. No se atribuye ese timeout a la aplicación.

## Corrección comprobada

La publicación inicial `707d4b1` pasó build/deploy pero la función terminó con `ERR_REQUIRE_ESM`: el servidor CommonJS requería código del paquete ESM anidado de la web. Se extrajo la única implementación del motor y los validadores a `shared/`; la web conserva reexports y el servidor importa directamente ese núcleo. Sin cambios de reglas, datos ni dependencias.

El workflow ahora ejecuta `scripts/check-vercel-function.mjs` contra la función realmente empaquetada antes de desplegar. Comprueba carga de módulos, snapshot y contratos, respuesta GET 405 y POST sin clave 503. Pasó en Actions y en compilación Node local. El typecheck del servidor usa NodeNext.

## Configuración y verificación final

- `ANTHROPIC_API_KEY` se guarda en GitHub Secrets y se inyecta únicamente en runtime de dev mediante el workflow. No aparece en Git, bundle, ZIP ni evidencia. La clave no se incorpora al build.
- La protección existente de Vercel permanece activa; las pruebas usaron la sesión autorizada. No se deshabilitó ni se publicaron credenciales de acceso.
- Pruebas tras la corrección: 177 Python, 196 web (+2 pruebas reales opt-in omitidas por defecto), typecheck y build correctos. Las llamadas reales remotas anteriores complementan esa suite.
- Los 38 hashes del baseline científico, visual, configuración y contratos existentes siguen intactos.
- ZIP final: 30 entradas, 12.987.707 bytes, SHA-256 `eacf5dce441763b2c5e21d2aa2d75fe88130cccfeafb098c72e73bba1f2bd32f`. Empaquetado repetido idéntico y entradas cotejadas con dist.

Reproducción local: `source .venv/bin/activate && npm run verify`; `npm run release:package`. Para repetir la prueba remota, abrir dev con acceso autorizado, definir el ejemplo, generar requisitos, confirmar/evaluar, destacar motivos y descargar JSON. Cada acción de IA realiza una llamada real.

La disponibilidad comprobada corresponde a esta configuración y fecha. Se mantienen los límites científicos de M8: siete áreas, perfil rover/Jezero, sin adquisición para polígonos nuevos ni permisos de terreno. La inspección visual de impresión nativa sigue pendiente y no afecta estas dos operaciones de IA.
