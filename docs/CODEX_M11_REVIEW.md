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

Pendiente: publicar dev, comprobar la entrega remota, avanzar main sin force y verificar producción/IA real. No se considera terminado el objetivo de publicación hasta registrar esos resultados.
