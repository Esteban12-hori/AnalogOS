# M11 — revisión de Lectura móvil e impresión

Fecha: 2026-11-15. Dirección y aceptación: Codex. Implementación: Claude Code (sesión `e2bcb604-46ab-458e-b977-7fb6ede8eb6c`), revisada en tres rondas. Base: `ce86a879905cb927d9881aae6ab564d9082f39fc`.

## Decisión

**Código aceptado por Codex tras revisión y pruebas independientes.** Dan pidió delegar y revisar antes de publicar dev; amplió después el encargo a revisión del conjunto y promoción a main/producción. La publicación y la reprueba remotas se registran al final de este documento.

## Resultado de producto

- «Ir a la Lectura» aparece junto al resumen del resultado, antes de las alternativas. En Chrome 390×844: y≈459 px, alto 44 px; ya es visible sin recorrer la lista completa. Antes estaba en y≈1470 px y medía 34 px.
- Abre la pestaña de la hoja móvil, la Lectura independiente si no hay selección o es una referencia mundial, la píldora en 1100–1439 o el panel izquierdo en ≥1440. Solo cambia la UI: conserva selección, alcance, requisitos y cálculo; no solicita IA.
- Un único informe de la evaluación vigente. Mientras se monta, imprimir está deshabilitado. Tras editar, Ctrl+P muestra un aviso; no conserva el informe anterior para imprimir.
- Impresión paginada fuera del escenario fijo; tablas de criterios con anchos legibles, cabeceras repetidas, enlaces completos y geología con la misma evidencia y límites que la pantalla. Codex agrupó procedencia y huellas para que no queden separadas al cambiar de página.

## Evidencia independiente

| Comprobación | Resultado |
|---|---|
| 390×844, resultado de siete sectores | CTA visible, 44 px; Enter abre Lectura, foco en el título |
| 1280×800 | Abre la píldora en Misión sin depender de selección; Escape cierra y devuelve el foco |
| 1440×900 | Enfoca la Lectura del panel izquierdo; un único informe montado |
| Sin selección móvil | Lectura independiente en S2; Atrás vuelve a la bandeja |
| Referencia mundial MDRS seleccionada | Lectura abre sin sustituir la referencia; Escape vuelve a su ficha |
| Ningún sector priorizado (umbral sintético 0,001°) | Resultado válido, CTA operativo, informe coherente |
| Punto sintético (0°, 0°), fuera de cobertura | Diagnóstico de evidencia insuficiente y Lectura accesible; sin heredar geología ni medidas de otra ventana |
| Editar tras evaluar | Informe anterior retirado; impresión nativa de una página con aviso de reevaluación |
| PDF nativo completo | Guardado desde Chrome, todas las páginas renderizadas y revisadas |

El PDF anterior al arreglo tenía **una sola página**, cortada después de geometría. El definitivo usa Letter, márgenes Default y escala Default (100 %), con encabezados/pies del navegador: **18 páginas, ninguna vacía**, siete sectores, Yungay REF, resultados, cuatro orientaciones geológicas y tres exclusiones, SERNAGEOMIN/SEGEMAR, unidades/cobertura/límites/fuentes y procedencia completa. El número de páginas cambia con las opciones del usuario; la integridad del contenido es el criterio. La vista anterior con escala 90 % y márgenes mínimos daba 12 páginas.

- PDF: `submission/evidence/m11-seven-sectors-print.pdf`, SHA-256 `76e1f2949ac3422782acebbf007b404d6a89ff60cc260c2269d3fadddd8fedb8`.
- Captura móvil: `submission/assets/m11-mobile-reading.jpg`.
- Prueba manual sintética: ejemplo de la app, no requisitos operacionales ni validación de campo.
- Huella de solicitud del ejemplo: `85b453d5edfb38589a781ff74c532526789409c63efbefd73e786b6bf88d5c6b`; evaluación `035031fc7b243fd927baaf05b2bc3c98a8b8ae6a6788e121c94e9329898e2eb6`.

## Pruebas y paquete

- `PATH="$PWD/.venv/bin:$PATH" npm run verify`: **333 Python, 799 web**, 3 opt-in omitidos; tipos servidor y build correctos. Log de Codex: `/tmp/analogos-m11-codex-verify.log`.
- Tras el ajuste final de agrupación de procedencia: 35 tests relacionados y build correctos; logs `/tmp/analogos-m11-print-final-tests.log` y `/tmp/analogos-m11-print-final-build.log`. No se añadieron tests que solo busquen reglas CSS.
- ZIP regenerado con `PATH="$PWD/.venv/bin:$PATH" python scripts/package_release.py`, CRC y checksum verificados: **73 entradas, 14799960 bytes**, SHA-256 `e2edb58317fc51e85ef5bc4adf9d46a09b7255531bd332341e96e0b9e6f81c30`.
- `git diff --check` limpio. Sin cambios en shared/, server/, api/, artifacts/, contratos, dependencias o CI. Ninguna clave de Anthropic en el build distribuido. `outputs/` ajeno preservado.

## Alcance de la comprobación

Se probó Chrome y sus tamaños de viewport; no equivale a probar gestos/teclado virtual de un dispositivo iOS físico ni todos los motores de impresión. El flujo manual local funciona sin endpoint de IA. La prueba de fallo de teselas GIBS por bloqueo de red sigue separada del arreglo M11; las imágenes locales y SVG son el respaldo existente. No se amplía la ciencia ni la cobertura del piloto.

## Publicación

**Completado y verificado.** Código `e5e91390b2eea261b1f8d46f3b17786b2bb295dc` publicado sin force en dev y luego main.

- Dev: [Actions 43686593750](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43686593750), correcto. Recorrido publicado de siete sectores, CTA móvil visible de 44 px, Lectura con foco y un informe con siete tablas/geología/procedencia comprobados en `https://analogos-dev.vercel.app/`.
- Producción: [Actions 43686863876](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43686863876), correcto, incluida comprobación de la función empaquetada. `https://analogos.vercel.app/` responde HTTP 200; GET /api/ai devuelve 405 method_not_allowed, como corresponde.
- IA **real** en producción desde Chrome: elegir AR6 → Evaluar este sector → enviar brief sintético en el dock → proponer cuatro requisitos con Claude → revisar/confirmar explícitamente → evaluar **solo AR6** → CTA móvil → Lectura → explicación con geología. Resultado: 1 de 1 priorizado, 1 de 3 preferencias cumplida, 2 sin medición; la cartografía no las convierte en medidas.
- Borrador: `claude-sonnet-5-5`, `req_011Ch4GRLhf2qaDPw9s9n74t`, `2026-11-15T06:48:27.845Z`, tokens 2221/1107, end_turn.
- Explicación/geología: `claude-sonnet-5-5`, `req_011Ch4GYHwfPJwQELdTSRFD4`, `2026-11-15T06:49:57.535Z`, tokens 7174/332, end_turn. Tres referencias válidas de SEGEMAR: material superficial en dos unidades y contraste mapa-terreno en Galán.
- Exportación descargada desde la aplicación: `submission/evidence/m11-production-geology-export.json`, SHA-256 `15b6f1a374b1738fdd0efed4ff77c46e428f53a6dd599365f7f9a93cc54adaaa`. Validada con `validateAnyMissionExport` y reconstruida idéntica con `buildMissionGeologyExport`, usando snapshot v3 y contexto geológico oficiales. Solicitud `dbb1d0867b4fb6d6d08d9f40ea9a0b2111d653485d0fb90e78ee74ad9bb8a159`; evaluación `e6c8fbf94658b7447a1c64b3ae998c4f89bd3ff1659004248845d7bedf2f0174`.
- Captura real publicada: `submission/assets/m11-production-mobile.jpg`. Sin errores de consola en los recorridos local/dev/producción. Tamaño de prueba restablecido; márgenes/escala de impresión devueltos a las preferencias anteriores después de guardar la evidencia.
- El checkpoint posterior `[skip ci]` añade únicamente evidencia y continuidad, sin alterar el código ni el ZIP desplegados. El desarrollo queda en dev; Claude sin nueva asignación.
