# Encargo vigente

Este archivo es la única cola autorizada para trabajo de implementación entre Codex y Claude. Codex asigna; Claude ejecuta; Codex acepta.

## Estado

- **Task ID:** M6-PORTABLE-RELEASE
- **Owner:** Codex
- **Status:** accepted
- **Branch:** `dev`
- **Base commit:** `92053ead92ebd526f8c01e1c75a6bd97cb0da6da`

## Objetivo

Implementar un empaquetado repetible de la demo estática. Un único comando debe reconstruir el frontend, validar el contenido permitido, producir `submission/analogos-chile-static.zip` y actualizar su SHA-256. La misma demo debe cargar desde `/` o desde un subdirectorio como `/AnalogOS/` sin pedir credenciales.

## Alcance autorizado por Codex

1. Añadir `npm run release:package`, encadenando el build actual con un empaquetador local sin dependencias nuevas (Python estándar es aceptable).
2. Cambiar `base` de Vite a relativo si hace falta. Revisar la carga de JSON y el enlace al análisis auditable para que el build funcione en raíz y subdirectorio.
3. Empaquetar mediante una lista explícita de archivos permitidos: `index.html`, assets compilados JS/CSS y los cinco archivos `science-v2/` actuales. Rechazar archivos adicionales, enlaces simbólicos, referencias ausentes o archivos requeridos faltantes. No publicar demo, science-v1, secretos, mapas fuente, data/raw ni fuentes del proyecto.
4. El ZIP debe ser determinista para un mismo dist (orden y timestamps internos fijos), y checksum coherente. Una validación fallida debe preservar el ZIP/checksum anterior y terminar con error explicativo. Escribir primero en archivos temporales junto al destino y reemplazar solo tras validación.
5. Añadir tests reales del empaquetador: determinismo, conjunto exacto, faltantes, archivo inesperado/symlink y preservación de entrega previa ante error. Usar directorios temporales; nunca renombrar/borrar data/raw del equipo para probar.
6. Documentar comandos de instalación, empaquetado y prueba por HTTP local; aclarar que no se garantiza abrir index.html por file://. No publicar a ningún hosting.
7. Regenerar ZIP/checksum con el comando nuevo y devolver la tarea en `review` para revisión independiente de Codex.

## Archivos permitidos

- `package.json` (scripts únicamente)
- `apps/web/vite.config.ts` (base relativa únicamente)
- `apps/web/src/data/loadDemoSnapshot.ts` y `apps/web/src/App.tsx` (solo rutas de recursos si hace falta)
- nuevo `scripts/package_release.py` y `tests/test_release_package.py`
- `README.md`, `submission/README.md`, `submission/SHA256SUMS.txt`, `submission/analogos-chile-static.zip`
- `project/NEXT_TASK.md` (estado/reporte), `project/STATUS.md`, `project/CHANGELOG.md`
- `docs/decisions/ADR-004-portable-static-release.md` en estado `proposed` si documentas la decisión de empaquetado.

Hay cambios locales previos de Codex y Claude. Respétalos; solo modifica los segmentos relevantes. No hacer commits ni incluir cambios ajenos. Codex no editará estos archivos mientras trabajes.

## Restricciones activas

- No alterar ciencia, contratos, perfil, snapshot ni ranking.
- No añadir dependencias o infraestructura.
- No hacer push, merge, tag o release.
- Preservar los cambios locales visibles en `git status`.
- No leer ni transmitir `.env`, credenciales, cookies ni datos crudos. Esta tarea usa únicamente artefactos públicos procesados.
- No cambiar `AGENTS.md`, `CLAUDE.md`, remotos o ramas. No lanzar otros agentes ni procesos persistentes.

## Aceptación y comandos exactos

```bash
source .venv/bin/activate
npm run verify
npm run release:package
(cd submission && shasum -a 256 -c SHA256SUMS.txt)
git diff --check
git status --short
```

Comprueba dos ejecuciones del empaquetador sobre el mismo dist. Demuestra que el ZIP solo contiene la lista permitida y que sus bytes coinciden con dist. Codex hará la prueba visual por HTTP en `/AnalogOS/` y revisará la implementación y la preservación del trabajo previo.

## Reporte de Claude

Entregado en `review` el 2026-11-14 a las 12:41 (America/Santiago). Solo Codex puede aceptar.

### Archivos propios de este encargo

- Nuevos: `scripts/package_release.py`, `tests/test_release_package.py`, `docs/decisions/ADR-004-portable-static-release.md` (estado `proposed`).
- Modificados: `package.json` (script `release:package`), `apps/web/vite.config.ts` (`base: './'`), `README.md` y `submission/README.md` (solo las secciones de empaquetado y prueba), `submission/analogos-chile-static.zip`, `submission/SHA256SUMS.txt`, `project/NEXT_TASK.md`, `project/STATUS.md`, `project/CHANGELOG.md`.
- No hizo falta tocar `apps/web/src/data/loadDemoSnapshot.ts` ni `apps/web/src/App.tsx`: ya resolvían JSON y el enlace al análisis con `import.meta.env.BASE_URL`.
- No se modificó ningún otro archivo; los cambios locales previos de Codex y Claude siguen en el árbol de trabajo.

### Comandos ejecutados y resultados

| Comando | Resultado |
|---|---|
| `npm run verify` | 60 tests Python, 14 tests web, contratos + TypeScript + Vite verdes |
| `npm run release:package` | ZIP escrito; sha256 `beb83736ea9508808ce832c6e707e96c5103935ff03330ff9b15b4301468ac14` |
| `(cd submission && shasum -a 256 -c SHA256SUMS.txt)` | `analogos-chile-static.zip: OK` |
| `python scripts/package_release.py` dos veces más sobre el mismo dist | mismo SHA-256 las tres veces |
| `git diff --check` | sin salida, código 0 |
| `git status --short` | solo archivos del alcance, más los cambios previos ya presentes |

Contenido del ZIP (8 archivos, 513.994 bytes, sin compresión, fecha interna 1980-01-01): `assets/index-BCA2TVIl.js`, `assets/index-DwJK4FAQ.css`, `index.html` y los cinco `science-v2/`. La lista coincide con los archivos de `apps/web/dist/` y cada entrada es idéntica byte a byte a su archivo.

Errores reales por línea de comandos, todos con código 1, mensaje explicativo y entrega previa intacta: archivo extra en una copia de dist (`science-v2/extra.json`), `--zip` igual a `--checksum`, y `--zip` dentro de `apps/web/dist/`.

### Revisión de Codex atendida

- Fallo del segundo `os.replace`: ahora se restaura el ZIP anterior (o se elimina el nuevo si no había entrega previa). Tests: `test_checksum_replace_failure_rolls_back_to_the_previous_pair` y `test_checksum_replace_failure_without_previous_delivery_leaves_nothing`.
- Si además falla la restauración, se lanza `InconsistentDelivery`, el mensaje no afirma que la entrega se conserva e indica dónde quedó la copia del ZIP anterior. Test: `test_failed_rollback_is_reported_as_inconsistent_and_keeps_the_backup`.
- Temporales únicos con `tempfile.mkstemp` en la carpeta del destino; ya no hay nombres fijos `.tmp`. Test: `test_temporaries_are_unique_and_do_not_clobber_existing_tmp_files`.
- Destinos rechazados antes de escribir: `--zip` igual a `--checksum` (misma ruta, distinta capitalización o enlace duro), destino dentro del build, destino que es el build o una carpeta que lo contiene. Tests: `test_zip_and_checksum_must_be_different_files`, `test_checksum_linked_to_the_zip_is_rejected`, `test_destinations_overlapping_dist_are_rejected_before_writing`.

### Prueba por HTTP (adicional a la visual de Codex)

ZIP descomprimido en un directorio temporal y servido con `python3 -m http.server` en un puerto libre, cargado con Chrome sin interfaz. En `/AnalogOS/` y en `/` la app renderiza el ranking; `index.html`, JS, CSS y los JSON de `science-v2/` responden 200, incluido `analysis-summary.json` desde el enlace relativo. Solo `favicon.ico` da 404, como antes. Los servidores temporales quedaron detenidos.

### Límites y decisiones para revisar

- ZIP sin compresión (`ZIP_STORED`): pesa ~514 kB en vez de ~146 kB, a cambio de que los bytes no dependan de la versión de zlib. Si se prefiere tamaño, es una línea.
- Sin atomicidad frente a un corte de energía o `kill` entre los dos renombrados; `shasum -c` detecta el desajuste. Un proceso interrumpido puede dejar temporales `.analogos-chile-static.zip.*.tmp` en `submission/`.
- La lista permitida cubre el build de una sola entrada. Si Vite emite más chunks, imágenes o fuentes, el empaquetador falla a propósito y hay que ampliarla.
- La URL en subdirectorio debe terminar en barra. No se garantiza `file://`.
- `npm run release:package` usa `python`, así que requiere el entorno `.venv` activo, igual que `npm run verify`.
- Incidencia: en la primera prueba HTTP el puerto 8765 ya estaba ocupado por un proceso Python ajeno (PID 40963). No lo toqué; repetí la prueba en un puerto libre.

### Permisos bloqueados

Ninguno. No hubo commit, push, publicación, cambios de remotos o ramas, ni lectura de `.env` o datos crudos durante este encargo.

## Aceptación independiente de Codex

Aceptado el 2026-11-14 a las 12:44 (America/Santiago), después del handoff de Claude. El encargo queda cerrado; Claude espera una nueva asignación antes de editar más archivos.

- Revisados implementación, tests, diff y ADR-004. La primera implementación fue devuelta por dejar ZIP/checksum desincronizados si fallaba el segundo reemplazo; la corrección y sus pruebas quedaron aceptadas.
- Reejecutados por Codex `npm run verify` (60 Python + 14 web, contratos, TypeScript y build), `npm run release:package`, checksum y `git diff --check`: correctos.
- Repetido el empaquetado: mismo SHA-256 `beb83736ea9508808ce832c6e707e96c5103935ff03330ff9b15b4301468ac14`. Las ocho entradas coinciden byte a byte con dist y con la copia probada en navegador.
- Verificada la copia extraída del ZIP por HTTP en `/` y `/AnalogOS/`: ranking, mapa, selección de María Elena, advertencia de agua del 0,15 % y enlace relativo al análisis. Sin errores o advertencias de consola observados.
- Los cinco archivos del snapshot v2 y el perfil de configuración conservan sus seis hashes de la línea base. Sin cambios nuevos en ciencia, contratos ni dependencias; preservados los cambios previos del equipo.
- ADR-004 aceptado con sus límites: ZIP sin compresión (~514 kB), HTTP requerido y sin atomicidad ante interrupciones abruptas. Esta aceptación corresponde al empaquetado, no a una validación científica de campo.
- HEAD permanece en `92053ea`, rama `dev`; no hubo commit, push, merge ni publicación.

## Autorización posterior de Git

El 2026-11-14, Dan pidió explícitamente «subelos a dev». Codex queda autorizado para versionar y subir los cambios aceptados a `origin/dev`; esta instrucción sustituye la restricción de commit/push de la fase de implementación. Se integraron antes por avance directo los commits remotos `6516743` y `3c1a014` (Vercel), sin conflictos. La tarea sigue aceptada y Claude no tiene un nuevo encargo de implementación.
