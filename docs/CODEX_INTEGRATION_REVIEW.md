# Revisión Codex — integración Explorar/Misión

Fecha: 2026-11-15 (America/Santiago). Base revisada: `dd625b4626bb39a0f920eca816b6353c25667203`, rama `dev`. Integración de Gus/Claude, revisión y corrección de Codex bajo la dirección delegada por Dan.

## Dictamen

**Integración aceptada para el piloto, con los pendientes acotados de abajo.** ADR-013 y ADR-014 aceptados. Se conserva Yungay como alternativa conocida en Misión y fuera del ranking de descubrimiento. No hay cambios de fórmulas, datos ni comportamiento del servidor de IA.

La integración base se publicó correctamente en [Actions 43678787020](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43678787020). La corrección está publicada en **`9c183fb8cc5d8adbc717f931efd64bf877ddb0b0`**, [Actions 43681551867 correcto](https://github.com/Esteban12-hori/AnalogOS/actions/runs/43681551867), función y alias incluidos. Se repitió el recorrido completo desde una pestaña nueva de dev: sector preservado, borrador real, confirmación, evaluación, explicación y geología reales. Evidencia final validada/reconstruida: `submission/evidence/integration-final-dev-geology-export.json`; procedencia en DEV_AI_VERIFICATION. El checkpoint posterior de documentos/evidencia usa `[skip ci]`.

## IA real desde la interfaz integrada

Se usó Chrome con sesión autorizada de Vercel en `https://analogos-dev.vercel.app/`. No se cambiaron secretos ni protección. Brief sintético explícitamente rotulado, sin datos personales: reconocimiento regional de movilidad de rover y contexto geológico de AR6, mediana regional de pendiente ≤9°, preferencia no vegetada ≥95 %, tracción/seguridad/permisos/acceso pendientes de terreno. Son umbrales de prueba, no estándares operacionales.

1. «Proponer requisitos con IA» devolvió **6 requisitos sin confirmar**: dos medibles y cuatro sin medición. La interfaz permitió revisarlos y requirió confirmación antes de evaluar. La propuesta preguntó si los pendientes eran imprescindibles o preferencias: debe revisarlo el usuario; no es autorización de terreno.
2. Se seleccionó explícitamente la ventana AR6 en el paso de alcance. El único sector evaluado quedó priorizado para reconocimiento, con **1 de 5 preferencias y 4 sin dato**. Similitud v3 49,43, pendiente regional 3,563° (presentada según la vista), sin recalcular el snapshot.
3. «Destacar motivos con IA», con geología activada, respondió realmente desde Anthropic. Seleccionó evidencia calculada y **tres referencias geológicas válidas**: caracterizar material superficial del Complejo volcánico Galán y de depósitos aluviales/coluviales; comprobar correspondencia mapa–terreno de Galán. La UI muestra SEGEMAR 1:250.000, cobertura completa, enlaces oficiales y límites. Cobertura no es precisión ni aptitud.
4. Se descargó `submission/evidence/integration-dev-geology-export.json`. `validateAnyMissionExport` lo aceptó sin incidencias y `buildMissionGeologyExport` lo reconstruyó idéntico con el snapshot y contexto oficiales. Esto contrasta el cálculo y las huellas; no valida el terreno ni la exactitud científica de las fuentes.

| Operación | Procedencia de la respuesta aceptada |
|---|---|
| Borrador | `claude-sonnet-5-5`, `req_011Ch49r2xSqLrAHSpZDFz6w`, `2026-11-15T05:22:19.635Z`, 2229 tokens de entrada / 1842 de salida |
| Explicación y geología | `claude-sonnet-5-5`, `req_011Ch49vXptJHdQhMzJSRTMq`, `2026-11-15T05:23:11.255Z`, 7536 / 374 tokens |

Ambas respuestas terminaron en `end_turn`. La procedencia registra la respuesta aceptada; no permite inferir si hubo un reintento interno ni su consumo. Captura: `submission/assets/analogos-integration-dev.png`.

## Regresión encontrada y corregida

**Repro:** Explorar → AR6 → «Evaluar este sector» → escribir en el dock → «Enviar». `submitBrief` imponía `journey: test`, cuyo reductor restablece `scope.mode: catalog`. El usuario pasaba de una ventana a siete sin pedirlo. Se observó en dev antes de corregir.

**Cambio:** inicializar el recorrido solo cuando es `null`; si ya existe, conservarlo junto con su geometría. El reductor sigue invalidando una evaluación cuando cambia el brief. No se evalúa ni llama a IA automáticamente.

**Prueba:** caso añadido a `MissionController.test.ts`, primero rojo (scope `catalog` en lugar de `sector`) y después verde; verifica hasta la evaluación que `options` contiene exclusivamente AR6 y que no hubo llamadas a IA. En el build local (puerto 4188), el mismo recorrido mantuvo «Evaluar un sector» y el nombre de AR6 después de Enviar.

## Yungay y aceptación de los ADR

- **Explorar:** seis candidatos, Yungay REF aparte, sin puesto de descubrimiento.
- **Misión:** cumple ADR-009 §5: la referencia conocida puede ser útil para un ensayo. Se conserva su evaluación y, si cumple, su puesto entre las alternativas evaluadas, siempre con REF. El titular de candidatos la excluye y la comunica aparte. No modificar `shared/mission/evaluate.ts` ni fabricar un segundo orden exclusivo de la UI/exportación.
- **ADR-013:** aceptado tras contrastar un solo motor y la ruta real de IA/exportación. Se agrega explícitamente la decisión sobre REF y conservación del alcance al enviar el brief.
- **ADR-014:** aceptado como arquitectura del piloto. Revisado en escritorio y a 390×844: la hoja S2 permite abrir Lectura y Tu misión con la misma evaluación/IA. No certifica Safari/iOS real.
- `CLAUDE.md` referencia ahora ADR-006/007/014. Los planes de integración y reparto quedan marcados como antecedentes, sin activar asignaciones nuevas.

## Verificación e invariantes

- `source .venv/bin/activate && npm run verify`: **333 Python**, **784 web**, 3 casos web omitidos por ser opt-in; tipos del servidor y build correctos. La revisión base tenía 783 web; el caso nuevo reproduce la pérdida de alcance. Los cinco Python adicionales frente al reporte de Gus disponen aquí de datos locales y no se omiten.
- `python scripts/package_release.py`: **73 entradas, 14.792.109 bytes**, SHA-256 `d977f0adf4f9e7e3d2ee4e9b780ee7f00d7124def36b24e1369a7270e8e12393`. Checksum y CRC del ZIP correctos.
- Comparación `e074762..dd625b4` vacía en `shared/`, `server/`, `api/`, `vercel.json`, `.github/`, `package.json` raíz, `package-lock.json`, `apps/web/src/mission/` y los artefactos `science-v3`, `geology-context-v1`, `visual-context-v3`. Esas rutas tampoco se editan en esta corrección. El script de build de `apps/web/package.json` sí había cambiado durante el rediseño; no afirmar que todos los archivos package.json son idénticos.
- No se modifican main, credenciales, scopes del proveedor ni datos científicos. `outputs/` preexistente permanece sin incluir en la entrega.

## Pendientes concretos

1. Navegación directa «Ir a la Lectura» desde el popover móvil: sigue como texto orientativo. Alternativa comprobada: Ficha → Lectura. Requiere unificar la acción entre panel izquierdo, riel intermedio y pestaña de hoja.
2. Teselas GIBS sin red: sigue el límite documentado por Gus; las imágenes locales son el respaldo. No se repitió su prueba de bloqueo de red en esta revisión.
3. Impresión nativa con `PrintGeology`: el contenido tiene pruebas de render, pero el intento de abrir la impresión con automatización de Chrome agotó el tiempo de interacción y no permitió inspeccionar la salida. **No se declara validada la paginación ni el PDF.** No se envió nada a una impresora.
4. Gestos, teclado virtual y navegación Atrás en dispositivo iOS real siguen pendientes; la emulación de tamaño en Chrome no los sustituye.

Son límites de aceptación del piloto, no evidencia de validación de campo. No hay nueva tarea asignada a Claude.
