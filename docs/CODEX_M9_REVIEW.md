# Revisión Codex de M9

Estado: aceptado localmente por Codex; publicación y comprobación remota en dev en curso.

## Revisión A — 2026-11-14

Datos reales coherentes con la auditoría, 71 pruebas geológicas existentes correctas. Cinco casos independientes revelan brechas que deben corregirse antes de B:

| Prioridad | Evidencia reproducida | Corrección necesaria |
|---|---|---|
| P1 | MultiPolygon con dos copias del mismo cuadrado: las reparaciones coinciden, el área total baja 50 %, y `_diagnose` acepta. | Aplicar el límite de cambio total original/reparado además de la diferencia simétrica. |
| P1 | Una coordenada NaN interna pasa `parse_features` porque los bounds siguen siendo finitos. | Validar estructura y todos los vértices antes de Shapely y antes de instalar caché. |
| P1 | Refresh con Point en la capa chilena: falla el build, conserva el artefacto anterior pero reemplaza la caché válida. | Transacción raw+artefacto con validación completa en staging y rollback; mensajes veraces. |
| P1 | Un sitio argentino puede citar request_ids de otro sector argentino y pasar el validador. | Enlazar adquisición, site_id, bbox exacta y rol de fuente. |
| P2 | Un sitio chileno puede citar solo metadata CKAN en vez de la descarga de geometrías. | Exigir su adquisición de la capa; metadata puede ser adicional. |

Reproducciones independientes: `/tmp/analogos-m9-independent-review.py` y `/tmp/analogos-m9-provenance-checks.json`. Incorporar regresiones permanentes.

Otros ajustes: validar nombre/symlink antes de abrir archivos de caché; comprobar licencia CKAN antes de atribuir CC0; describir solo formatos realmente inspeccionados en esa adquisición; corregir SIGAM a «Sistema de Información Geológica Ambiental Minera»; alinear toda descripción del método con el código.

## Decisión técnica aprobada

Codex aprueba la superposición completa en EPSG:6933 tras validar/reparar originales. Hace aditiva la partición y difiere de la auditoría exploratoria menos de 0,00005 puntos porcentuales. Mantener la auditoría original y documentar las aristas rectas en el plano, sin afirmar una integral geodésica exacta.

Control independiente de siete AOI: diferencia relativa máxima de área proyectada/geodésica 5,13e-7. Cuatro geometrías inválidas reales: diferencias simétricas recortadas entre make_valid y buffer(0) iguales a cero. Eso no elimina el rechazo de otros casos materialmente diferentes.

## Pendientes de aceptación

Corregir A, revisar B (ficha, exportación, errores y paquete), navegador escritorio/móvil/teclado, ZIP offline /AnalogOS/, regresión de M8/IA y dev. El empaquetador rechaza actualmente el JSON nuevo porque B está pendiente; no publicar A por separado. Ciencia, imágenes y núcleo IA protegidos por baseline de 49 archivos.

## Revisión de correcciones — reconexión

Codex repitió los tres casos adversos de geometría/transacción y los dos de procedencia: 5/5 correctos. 120 pruebas geológicas pasan y los 49 hashes permanecen intactos. Revisión de código detecta dos bordes adicionales, asignados a Claude antes de B: fallo de restauración del mismo par en `publish` mal informado como restaurado; anillo GeoJSON no cerrado aceptado silenciosamente por Shapely. No afectan los datos reales actuales, pero deben cerrarse antes de release.

## Aceptación local de A y B — Codex, 2026-11-14

- Revisión independiente de código, contrato, geometrías, procedencia y recuperación ante errores; cinco hallazgos iniciales y dos bordes posteriores corregidos. Los 49 archivos protegidos de ciencia/visuales/perfiles/núcleo IA conservan sus hashes. Los datos geológicos coinciden con la auditoría exploratoria dentro de 0,00005 puntos porcentuales.
- `source .venv/bin/activate && npm run verify`: 316 Python, 246 web correctos; dos pruebas de IA real opt-in omitidas. Typecheck servidor y build correctos. Nuevas pruebas de ficha conservan snapshot y estado «Sin calibrar».
- Ajustes finales de Codex: texto geológico mínimo 12 px y controles más cómodos; mensajes de carga comprensibles; estado de descarga reiniciado al cambiar sector; advertencias visibles distinguen cartografía ya disponible de compatibilidad aún sin calibrar. Snapshot, puntuaciones y exportaciones previas intactos.
- ZIP repetido idéntico, 31 entradas y 13.221.264 bytes; SHA-256 `eed868335c5374d20b05415a8627be9ec3f035c1dc10668bbe08f21e03f6520c`. Cada entrada coincide con dist. Sin raw/credenciales/investigación en el ZIP.
- Navegador real sobre el ZIP extraído bajo `/AnalogOS/`, con conexiones externas bloqueadas: carga del globo, ficha geológica, estados de Chile ≈99 % y Argentina 50/0/100 %, detalles accesibles con Enter. Móvil 390×844 sin desborde horizontal (ancho documento 390; ficha geológica 326). Capturas en `submission/assets/analogos-m9-review.jpg` y `analogos-m9-mobile.jpg`.
- Geología ausente (404) e inválida (sector argentino citando adquisición ajena) muestran «no disponible». Sin geología, el ejemplo manual completo prioriza cuatro de siete áreas y conserva tracción desconocida y factibilidad pendiente.
- Descarga real en Chrome de `cl-win-s2500-w06970-geology-context.json`, validada en Python e idéntica al subconjunto reconstruido del paquete. Evidencia en `submission/evidence/m9-geology-export.json`. El observador de descargas no se utilizó; se leyó el archivo guardado por el navegador.
- La prueba inicial de navegador usó por error una CSP de QA que bloqueaba `unsafe-eval`, requerido por Ajv existente. Se corrigió solo el servidor temporal de QA, manteniendo `connect-src self`; no se cambió CSP del producto. La apertura inicial también demoró en el controlador; no se atribuye al código de la app.

La aceptación es de implementación y trazabilidad de cartografía regional. No valida el terreno, no calibra el criterio geológico ni habilita uso geológico en IA. Los hashes comprobados vinculan archivos de candidatos y peticiones; no constituyen una firma de autenticidad ni prueban por sí solos cada área calculada. El contraste espacial se realizó contra las fuentes y la auditoría.
