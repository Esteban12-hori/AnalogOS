# Publicación de AnalogOS en producción — 2026-11-15

**Estado: publicado y comprobado por Codex.** Dan autorizó actualizar el README y promover toda la versión revisada de dev a main, y precisó este orden: publicar primero y luego reemplazar el screenshot con una captura de la nueva producción.

## Versión y publicación

- Código desplegado: `7e8c7798186e02a5014f6bf8b79554b7faa84c3c`.
- Producción: https://analogos.vercel.app/ — [Actions 43682694089 correcto](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43682694089).
- Dev: https://analogos-dev.vercel.app/ — [Actions 43682693561 correcto](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43682693561).
- `main` avanzó de `437b515` a la entrega completa de dev, sin force ni pérdida de historia. No existe rama master. Main y dev se sincronizaron en el mismo commit.
- El checkpoint posterior de captura/documentación/evidencia usa `[skip ci]`: no cambia el código desplegado ni el ZIP. Ambas ramas reciben ese checkpoint; el desarrollo continúa en dev.

## README y captura

El README presenta Explorar/Misión, cómo partir de un sector, Tu misión y Lectura, geología, uso móvil y análogos por calcular, y enlaza a la aplicación pública. Conserva el alcance real del piloto y el rol de Yungay como referencia conocida.

**El screenshot se tomó después de publicar main**, desde `https://analogos.vercel.app/`, modo Explorar con el primer candidato seleccionado: `submission/assets/analogos-production.jpg`. JPEG original del navegador, 218.607 bytes, SHA-256 `bcfbd0e5f313030bf3d973f6edeb3f19984509a133bc06d71836fb372a5c0ffe`. No es una maqueta ni una captura de la versión anterior.

## IA de producción

El workflow ahora entrega el secreto Anthropic existente a dev y main **solo en runtime**; no se imprime, versiona ni envía al build/navegador. Se conserva el modelo, los límites y las validaciones del servidor. Sin secreto, la publicación se detiene. No se modificó la protección de dev ni se añadieron cuentas o autenticación.

La nueva página pública carga sin la barrera de acceso de dev (HTTP 200). El endpoint real responde 405 a GET (`Solo se admite POST.`). Desde la interfaz publicada se probó:

1. AR6 → Evaluar este sector → escribir un brief sintético en el dock → Enviar: mantiene AR6.
2. Borrador real Anthropic: cuatro requisitos sin confirmar (pendiente mediana regional ≤9°, preferencia no vegetada ≥95 %, orientación geológica y tracción como pendientes no medidos). Son umbrales de demostración, no criterios operativos oficiales.
3. Confirmación explícita y evaluación: una sola ventana AR6, priorizada para reconocimiento; una de tres preferencias satisfecha y dos sin dato. Sin autorización de terreno.
4. Explicación real con geología: tres referencias válidas de SEGEMAR 1:250.000, material superficial de Galán y depósitos aluviales/coluviales y correspondencia mapa–terreno de Galán. La IA no cambió evaluación, datos ni puestos.
5. Exportación descargada `submission/evidence/production-geology-export.json`, aceptada sin incidencias por `validateAnyMissionExport` y reconstruida idéntica mediante `buildMissionGeologyExport` con snapshot/contexto oficiales. SHA-256 `3fa32ea9c4ffd0137e8ab6d520a2c3eb114ad0126c26078c27821d1f006aedcd`. Captura de respaldo: `submission/assets/analogos-production-ai.jpg`.

| Operación | Procedencia de la respuesta aceptada |
|---|---|
| Borrador | `claude-sonnet-5-5`, `req_011Ch4C8fgUYoQgoF8HZmeBX`, `2026-11-15T05:52:16.354Z`, 2217 tokens de entrada / 1379 de salida |
| Explicación y geología | `claude-sonnet-5-5`, `req_011Ch4CDE41TMGKqYLUsgFLD`, `2026-11-15T05:53:11.040Z`, 7156 / 314 tokens |

Ambas respuestas terminaron en `end_turn`. La procedencia registra la respuesta aceptada, no el consumo agregado de un posible reintento interno.

## Comprobaciones y límites

- `source .venv/bin/activate && npm run verify`: **333 Python y 784 web** correctos, 3 web opt-in omitidos; tipos del servidor y build correctos.
- Paso shell de deploy ejecutado con CLI simulada, sin credenciales reales, para dev/main con y sin clave: cuatro casos correctos; main incluye `--prod`, ausencia de clave impide llamar a Vercel y la clave no aparece en la salida. Ambos workflows reales comprobaron después el arranque de la función empaquetada antes de publicar.
- Rutas locales e imagen del README verificadas. Ciencia, contratos, core, frontend y ZIP no cambiaron respecto de la integración aceptada; esta promoción agrega documentación y habilita la configuración de IA en runtime de producción.
- Se conservan los pendientes de `CODEX_INTEGRATION_REVIEW.md`: acceso directo a Lectura desde popover móvil, GIBS sin red, impresión nativa e iOS real. La publicación no valida los sitios en campo ni amplía la cobertura.
- Rate limiting en memoria por instancia y comprobación de Origin conservados; no equivalen a autenticación ni a una cuota distribuida. Detalle en `AI_SETUP.md`.
- `outputs/` preexistente permaneció fuera de los commits. No hay nueva asignación a Claude.
