# Changelog de trabajo

## 2026-11-14 Codex

- Creado paquete de handoff para Claude Code.
- Congelado stack P0.
- Añadidos contratos de perfil, candidato y manifiesto.
- Añadido backlog con gates M0–M6.
- Añadido protocolo de continuidad para retomar con Codex.
- No se inició todavía la implementación competitiva en esta carpeta.

## 2026-11-14 Claude Code

- M0 cerrado: monorepo npm + paquete Python `pipelines`, Vitest y pytest configurados.
- M1 cerrado: snapshot fixture NO científico en `artifacts/demo/` y web con mapa, ranking, ficha y desglose.
- Validación de contratos en Python (jsonschema) y en la web (Ajv), con los mismos schemas.
- Agregación determinista en `pipelines/scoring.py` (adelanta parte de M2): media geométrica ponderada, epsilon, peso válido mínimo 0,70 y confianza separada.
- `python -m pipelines.build_demo` genera el snapshot; un test detecta si queda desfasado.
- Contorno de Chile local (Natural Earth, dominio público) para que el mapa no dependa de servicios externos.
- Verificado: `npm run test` (11), `npm run build`, `python -m pytest` (15) y revisión manual en navegador.
- Sin cambios en `contracts/`, perfil P0 ni decisiones congeladas; no hubo ADR. Detalle de decisiones en `project/STATUS.md`.
- Pendiente de M2: restricciones con razón trazable y sensibilidad.

## 2026-11-14 Codex — retomado después de Claude

- Resuelto el conflicto de las dos implementaciones web; se conservó e integró una sola app compilable.
- Sustituido MapLibre por un mapa SVG local tras detectar un panel vacío en un navegador sin WebGL confiable; decisión registrada en ADR-001.
- Cerrado M2: restricciones trazables `exclude/review/warn`, sensibilidad de pesos ±20 % y tests de exclusión.
- Añadido pipeline reproducible sin credenciales para NASA PDS MOLA, NASA SRTM vía Terrain Tiles y NASA POWER.
- Generado `artifacts/science-v1/` con tres candidatos reales de screening; decisión científica registrada en ADR-002.
- Resultado: Yungay 73,65; Domeyko 65,11; María Elena 40,70. Confianza 57,8 y factibilidad `requires_review` para los tres.
- La app final usa el snapshot científico; fixtures se conservan solo para tests.
- Añadidos comparador, estabilidad, advertencias expandibles, descarga de ficha y metodología dentro de la app.
- Creado paquete de presentación bilingüe, pitch, demo, metodología, resultados, atribuciones, captura y checklist.
- Verificado: 25 tests Python, 12 tests web, TypeScript estricto y build Vite estático de ~552 kB.

## 2026-11-14 Codex — cierre post-Claude

- Auditado el árbol completo y confirmado que no hubo cambios posteriores al checkpoint de las 10:30.
- Eliminados tres restos no importados de la primera implementación de Claude: `ScoreBreakdown.tsx`, `DataProvenance.tsx` y `styles/app.css`.
- Reejecutado `npm run verify`: 25 tests Python, 12 tests web, contratos, TypeScript y build verdes.
- Verificados nuevamente el ZIP estático y su checksum SHA-256; el contenido desplegable no cambió.

## 2026-11-14 Codex — snapshot autenticado v2

- Probadas correctamente las credenciales Earthdata Login y OAuth Client Credentials de Copernicus.
- Añadidas dependencias reproducibles `earthaccess`, `requests` y `python-dotenv`.
- Detectado y corregido un error de borde: Pampa Yungay cruza cuatro tiles NASADEM; v1 analizaba solo un tile SRTM.
- Descargados seis granules `NASADEM_HGT.001` con HGT y máscara SWB.
- Consultados 677 granules HLS S30 v2.0 en total como inventario NASA independiente, sin doble conteo espectral.
- Procesados 12 mosaicos mensuales Sentinel-2 L2A por sitio mediante Statistical API con SCL, NDVI y BSI.
- Generado `artifacts/science-v2/`: Yungay 75,67; Domeyko 71,60; María Elena 49,99; confianza ~77,4.
- Añadido screening de agua permanente; María Elena conserva advertencia por ~0,15 %.
- La web final ahora carga `science-v2`; documentación, pitch, metodología y atribuciones actualizados.
- Añadido ADR-003 y tests de mosaico multitesela, fuentes autenticadas, ranking y ausencia de secretos.
- Verificado: 30 tests Python, 14 tests web y build Vite estático verdes.

## 2026-11-14 Codex — empaquetado final v2

- Alineados `submission/README.md` y `submission/DEMO_SCRIPT_2_MIN_ES.md` con los resultados v2; no quedan cifras v1 en el material de presentación activo.
- Actualizadas las versiones del paquete Python, monorepo y frontend a `0.2.0`.
- Añadidas anclas de comparación y método para navegación y captura reproducible.
- Regeneradas las dos capturas de presentación con el snapshot v2 y verificada visualmente la app compilada sin errores de consola.
- Regenerado `submission/analogos-chile-static.zip`, comprobada su integridad y actualizado `submission/SHA256SUMS.txt`.
- Excluidos `demo/` y `science-v1/` del build desplegable para mantener `science-v2/` como única fuente de verdad entregada.
- Confirmado que `.env` y `data/raw/` están ignorados y que ninguna credencial aparece en código o artefactos entregables.
