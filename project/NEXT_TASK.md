# Encargo vigente

Codex asigna, Claude implementa y devuelve `review`, Codex revisa y acepta. M6-PORTABLE-RELEASE está aceptado y publicado en `dev` en `15398a8`; su reporte permanece en Git.

## Estado

- **Task ID:** M4-VISUAL-EVIDENCE
- **Owner:** Codex
- **Status:** accepted
- **Branch:** `dev`
- **Base commit:** `15398a83a798e762df5452a05e1880488c480403`

## Objetivo y decisión de producto de Codex

Añadir contexto satelital real, trazable y offline a los tres candidatos actuales. Al seleccionar un candidato se debe ver su sector en una imagen Sentinel-2, conocer el periodo y sus límites. Avanza la inspección visual de M4; NO cierra revisión experta, restricciones territoriales ni validación de campo.

## Corte vertical autorizado

1. Crear `pipelines/fetch_visual_context.py` que consulte Copernicus Sentinel Hub Process API y genere tres PNG RGB reales y un índice público bajo `artifacts/visual-context/`. No modificar ni regenerar `artifacts/science-v2/` ni el perfil.
2. Usar las credenciales Copernicus existentes solo mediante dotenv/variables de entorno y exclusivamente contra endpoints oficiales. No imprimir ni leer manualmente .env, no guardar tokens/cabeceras ni cuerpos de error que los expongan. No usar Earthdata para este encargo. Sin dependencias nuevas.
3. Bbox derivada de la geometría versionada de cada candidato, consistente con `config/science_snapshot_v2.json`. Colección sentinel-2-l2a, RGB B04/B03/B02, dataMask y alpha para zonas sin datos. Ventana fija diciembre 2025 (`2025-12-01T00:00:00Z` a `2026-01-01T00:00:00Z`), leastCC, nubosidad máxima 40 %. Rotular mosaico del periodo, no una única fecha ni imagen actual de 2026. Si no sirve la cobertura, informar antes de ampliar la ventana.
4. Vista previa de 512–768 px por lado, proporción espacial razonable para la latitud. Documentar CRS, bbox, dimensiones y escala aproximada sin atribuir resolución nativa a la vista reducida. Transformación de reflectancia sencilla y explícita, sin imágenes generadas. Obtener metadata de escenas mediante userdata/evalscript; distinguir consideradas de efectivamente usadas. No inventar identificadores ni fechas.
5. Procedencia verificable: site_id, snapshot_version asociado, colección, endpoint oficial, ventana, bbox/CRS, dimensiones, bandas/transformación, mosaico, metadata devuelta, hora real de consulta UTC, SHA-256 por PNG, limitaciones y atribución Copernicus. Guardar request/evalscript públicos sin secretos para reproducir. Reutilizar paquete local válido sin llamar API; --refresh explícito. Ante error conservar el paquete anterior sin mezclar generaciones. No extraer rutas arbitrarias de un TAR remoto.
6. Integrar panel pequeño y cuidado en ficha (`VisualContext.tsx`): imagen local, periodo, atribución, nota de contexto preliminar, enlace local para abrir imagen y procedencia legible. Cambiar candidato cambia su imagen. No cerrar advertencias ni modificar score/confianza/factibilidad. En fixtures, evidencia ausente o fallida, estado no disponible sin romper ranking/ficha. BASE_URL para raíz/subcarpeta; nunca API Copernicus en navegador. Responsive, teclado y alt.
7. Extender empaquetador con lista explícita para índice y tres imágenes exactas, más request/evalscript público si la UI lo consume. Mantener verificación de hashes y garantías de rollback. No admitir cualquier PNG/JSON por extensión. Actualizar tests y documentación del ZIP.
8. Tests proporcionales: identidad/bbox/hashes de tres PNG reales; petición sin red; errores preservan paquete previo; rutas/estados del loader/panel usando funciones puras o render estático con herramientas existentes; regresión de empaquetado. Suite sin credenciales ni red. Fixtures inequívocos y nunca sustituyen imágenes reales.
9. ADR-005 propuesto y `docs/VISUAL_REVIEW.md`: fuente, reproducción, qué inspeccionar y pendientes. Observaciones solo tras ver imágenes, separadas de hipótesis. Codex inspeccionará las tres antes de aceptar. No marcar revisión experta ni M4 completo.

## Fuentes oficiales

- https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Process.html
- https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Process/Examples/S2L2A.html
- https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html
- Autenticación local: `pipelines/fetch_precision_data.py` (leer código, no mostrar secretos).

## Archivos autorizados

- Nuevos `pipelines/fetch_visual_context.py`, `tests/test_visual_context.py`, `artifacts/visual-context/`, `docs/VISUAL_REVIEW.md`, `docs/decisions/ADR-005-offline-visual-context.md`.
- Nuevos `apps/web/src/components/VisualContext.tsx`, `apps/web/src/data/loadVisualContext.ts`, `apps/web/src/tests/visualContext.test.ts` (o .tsx).
- Integración mínima en `CandidateDetails.tsx`, `App.tsx` y CSS existentes de apps/web/src; sin rediseñar el resto.
- `scripts/package_release.py`, `tests/test_release_package.py`, `apps/web/scripts/prune-build.mjs` solo si necesario, `package.json` solo scripts.
- `README.md`, `submission/README.md`, `submission/ATTRIBUTIONS.md`, `submission/JUDGING_CHECKLIST.md`, ZIP y SHA256SUMS de submission.
- `project/NEXT_TASK.md` estado/reporte, `STATUS.md`, `CHANGELOG.md`, `BACKLOG.md` solo avance parcial correspondiente.

## Límites y coordinación

- Preservar ciencia, contratos, candidatos, ranking, dependencias y SVG. Sin backend, IA, SAR ni nuevo perfil.
- No AGENTS/CLAUDE, remotos, ramas, Vercel ni cuentas. No commit/push/publicación en este encargo; Codex decidirá tras revisar.
- No otros agentes. Servidores HTTP temporales permitidos, cerrarlos al acabar sin detener procesos ajenos.
- Tres imágenes, una solicitud inicial por sector, reintentos acotados por fallo transitorio. No barrido nacional/temporal ni red en cada build.
- Si API bloqueada por credenciales/cuota, reportar; no usar imágenes ficticias ni ocultar el fallo.
- Codex no edita tu alcance mientras trabajas; revisa y devuelve fallos. Claude implementa, Codex acepta.

## Aceptación

```bash
source .venv/bin/activate
python -m pipelines.fetch_visual_context
npm run verify
npm run release:package
(cd submission && shasum -a 256 -c SHA256SUMS.txt)
git diff --check
git status --short
```

Reportar archivos propios, comandos/resultados, tamaño/contenido ZIP, cache sin red, límites y hashes científicos intactos. Codex repetirá checks, verá tres imágenes y probará selección, metadata, error de imagen y /AnalogOS/ en navegador. Terminar con **Status: review**.

## Reporte de Claude

Entregado en `review` el 2026-11-14 a las 13:40 (America/Santiago). Solo Codex puede aceptar. Sin commit, push ni publicación.

### Archivos propios

- Nuevos: `pipelines/fetch_visual_context.py`, `tests/test_visual_context.py`, `artifacts/visual-context/` (`index.json` y tres PNG), `docs/VISUAL_REVIEW.md`, `docs/decisions/ADR-005-offline-visual-context.md`, `apps/web/src/components/VisualContext.tsx`, `apps/web/src/data/loadVisualContext.ts`, `apps/web/src/tests/visualContext.test.tsx`.
- Modificados: `apps/web/src/components/CandidateDetails.tsx` y `apps/web/src/App.tsx` (integración mínima), `apps/web/src/styles.css` (reglas del panel), `scripts/package_release.py`, `tests/test_release_package.py`, `README.md`, `submission/README.md`, `submission/ATTRIBUTIONS.md`, `submission/JUDGING_CHECKLIST.md`, `submission/analogos-chile-static.zip`, `submission/SHA256SUMS.txt`, `project/NEXT_TASK.md`, `project/STATUS.md`, `project/CHANGELOG.md`, `project/BACKLOG.md`.
- No hizo falta tocar `apps/web/scripts/prune-build.mjs` ni `package.json`.

### Imágenes reales

Consulta del 2026-11-14 entre las 16:16 y las 16:18 UTC, una petición por sector. La primera ejecución del comando falló por red al pedir el token (tres intentos, `ConnectionError`, sin escribir nada); la segunda funcionó.

| Sitio | Tamaño | Bytes | Órbitas consideradas | Órbita usada | SHA-256 |
|---|---|---:|---:|---|---|
| `cl-pampa-yungay-screening` | 705×768 | 1.205.517 | 15 | 2025-12-21, 100 % | `24f6a7b94f3f4f04989634723e68f189938b84b01d0e8a9fe5051012d8d4a9d0` |
| `cl-pampa-maria-elena-screening` | 714×768 | 1.220.784 | 15 | 2025-12-21, 100 % | `97a2c13e05eb38ab3f9daff006859ae82d9d771790a9e205cafacf6f9394d879` |
| `cl-domeyko-interior-screening` | 709×768 | 1.079.769 | 8 | 2025-12-03, 100 % | `697f1b809b8d6cae55bf92239b28488ae68e6cd020ac8cf80ee2d443c97df359` |

Las órbitas «usadas» salen de contadores del evalscript (patrón de variable global documentado en la guía oficial de metadata). Solo se publican porque suman exactamente ancho × alto en los tres casos; si no cuadraran, el índice dejaría `scenes_used: null`.

### Comandos y resultados

| Comando | Resultado |
|---|---|
| `python -m pipelines.fetch_visual_context` | «reutilizado sin red»; no lee credenciales ni llama a la API |
| `npm run verify` | 119 tests Python, 24 tests web, contratos + TypeScript + Vite verdes |
| `npm run release:package` | sha256 `97dc819efb7e0511e2b4a6e388eab5cf113db442006b3b01b415ae0db9f25f81`; repetido, mismo valor |
| `(cd submission && shasum -a 256 -c SHA256SUMS.txt)` | `analogos-chile-static.zip: OK` |
| `git diff --check` | sin salida, código 0 |
| `git diff --quiet HEAD -- artifacts/science-v2 config contracts pipelines/scoring.py pipelines/build_precision_snapshot.py pipelines/constraints.py` | código 0: ciencia, perfil, contratos y score idénticos al commit base |

ZIP: 12 archivos, 4.084.880 bytes: `index.html`, un JS, un CSS, los cinco `science-v2/`, `visual-context/index.json` y los tres PNG.

### Revisión de Codex atendida

- Validador del paquete: ahora compara cabecera (`kind`, `status`, `snapshot_version`, `source`, `product`, `limitations`) y campos de cada sitio (identidad, nombre, imagen, dimensiones, bbox, extensión, escala, petición, escenas) con el candidato, la petición vigente, el PNG y la metadata devuelta. 24 alteraciones parametrizadas, incluidas bbox `[0,0,1,1]` y periodo de noviembre de 2026, se rechazan sin llamar a la API.
- `_swap`: si falla la instalación y también la restauración, o si falla la limpieza posterior, lanza `PackageStateError` con el estado real y conserva el respaldo; `main` solo afirma que el paquete anterior no se modificó cuando es cierto. Cuatro tests.
- Web: `parseVisualContext` valida cada elemento de `scenes_used` y tipos y rangos de lo que el panel muestra, exige `image === site_id + ".png"` y `site_id` únicos. 18 casos de metadata malformada terminan en «no disponible» sin romper la ficha.
- Observaciones visuales: registradas en `docs/VISUAL_REVIEW.md` como apariencia a contrastar, separadas de las hipótesis; sin identidad, propiedad ni exclusión.

### Pruebas en navegador

Build servido por HTTP local: el panel muestra la imagen del candidato seleccionado; al elegir María Elena cambia la imagen y no cambian score ni advertencias; la procedencia es legible; un error de carga de imagen deja «no disponible» con ranking y ficha intactos; vista móvil sin desbordes; consola sin errores; todas las peticiones son locales. ZIP descomprimido en `/AnalogOS/` y cargado con Chrome sin interfaz: índice e imagen responden 200 con rutas relativas. Servidores temporales detenidos.

### Límites y decisiones para revisar

- Ganancia 2,0 elegida antes de consultar para no repetir peticiones; las vistas no se ven saturadas salvo en parches muy brillantes.
- Cada PNG pesa 1,1–1,2 MB; el ZIP sube de ~0,5 MB a ~4,1 MB.
- El validador es estricto: cambiar periodo, transformación, limitaciones o evalscript invalida el paquete y exige `--refresh` con credenciales.
- Un corte abrupto durante el intercambio puede dejar un directorio `.visual-context.*` en `artifacts/`; el empaquetador lo rechazaría como archivo inesperado.
- `scenes_used` depende de contadores globales del evalscript; se documenta como derivado y se omite si no cuadra.
- No se marcó revisión experta ni M4 completo.

### Credenciales y permisos

Las credenciales Copernicus se leyeron solo desde el programa (`.env` vía dotenv) y se enviaron únicamente a `identity.dataspace.copernicus.eu`; el token, solo a `sh.dataspace.copernicus.eu`. No se imprimieron ni guardaron valores, tokens, cabeceras ni cuerpos de error. No se usó Earthdata. Ningún permiso bloqueado.

## Aceptación independiente de Codex

Aceptado el 2026-11-14 a las 13:54 America/Santiago, tras revisar código, fuentes, imágenes y comportamiento del ZIP. Claude espera nueva asignación.

- Inspeccionados los tres PNG a tamaño completo y contrastados con sus bbox, fechas de adquisición devueltas, dimensiones y procedencia. Las observaciones geométricas permanecen como pistas a contrastar, no identificaciones de infraestructura ni permisos.
- Reproducidos y devueltos a Claude dos defectos: el validador aceptaba bbox/periodo incoherentes y el panel aceptaba escenas malformadas que podían romper la ficha. Correcciones y pruebas de regresión revisadas; también corregido el mensaje ante fallo de restauración del paquete.
- Reejecutados `npm run verify`: 119 tests Python y 24 web, contratos, TypeScript y build correctos. `npm run release:package`, checksum y `git diff --check` correctos.
- Verificada reutilización con un callback que falla ante cualquier intento de red; el paquete válido se reutiliza sin invocarlo. Confirmado rechazo de bbox y periodo adulterados, sin nuevas llamadas a la API.
- Comprobadas las 12 entradas del ZIP byte a byte contra dist; repetir empaquetado produce el mismo SHA-256 `97dc819efb7e0511e2b4a6e388eab5cf113db442006b3b01b415ae0db9f25f81` (4.084.880 bytes).
- Navegador: tres selecciones con su imagen, procedencia y raíz; ZIP extraído bajo `/AnalogOS/`; copias temporales con PNG ausente y `scenes_used: [null]` muestran no disponible y conservan ranking/ficha. Sin errores de consola en la vista normal; el 404 provocado pertenece solo a la prueba de fallo.
- Los cinco archivos de `science-v2` y el perfil de configuración conservan los seis SHA-256 de la línea base. Sin cambios de ciencia, ranking ni dependencias.
- ADR-005 aceptado como contexto visual histórico de diciembre de 2025. M4 continúa parcial: quedan imágenes recientes, restricciones territoriales y revisión experta.
- Cambios locales sobre `dev`/`15398a8`; sin commit, push ni publicación de este encargo.

## Autorización posterior de Git

El 2026-11-14, Dan pidió «subela» en respuesta a la entrega aprobada de M4-VISUAL-EVIDENCE. Codex queda autorizado para hacer commit y push de esta mejora a `origin/dev`, sustituyendo la restricción de la fase de implementación. La tarea sigue aceptada; Claude espera una nueva asignación.
