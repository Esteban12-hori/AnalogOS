# IA verificada en dev — 2026-11-14

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
