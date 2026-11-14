# Estado actual

**Última actualización:** 2026-11-14 14:15 America/Santiago
**Responsable del checkpoint:** Codex
**Milestone activo:** M6 — empaquetado y entrega
**Estado general:** producto funcional y presentable con snapshot científico v2 autenticado. NASADEM corrige el mosaico de borde y Sentinel-2 completa superficie no vegetada. Faltan acciones humanas/externas: video, URLs públicas, integrantes, capas territoriales y revisión experta.

## Modelo de trabajo activo

- Codex dirige producto, ciencia, arquitectura, prioridades, revisión y release.
- Claude implementa solo tareas asignadas en `project/NEXT_TASK.md` y entrega en estado `review`.
- La rama de implementación es `dev`; `main` queda reservada para entregas revisadas.
- Encargo `M6-RELEASE-REVIEW`: aceptado por Codex.
- Encargo `M6-PORTABLE-RELEASE`: implementado por Claude, corregido tras revisión y aceptado por Codex (12:44). Dan autorizó su commit y push a `dev` (12:48); Claude espera una nueva asignación.

- Encargo `M4-VISUAL-EVIDENCE`: implementado por Claude, corregido tras revisión y aceptado por Codex (13:54). Dan autorizó su commit y push a `dev` (14:15); Claude espera una nueva asignación.

## Resultado disponible

La vista final consume `artifacts/science-v2/`, no fixtures.

| Rank | Sector | Similitud | Confianza | Estabilidad | Factibilidad |
|---:|---|---:|---:|---:|---|
| 1 | Pampa Yungay | 75,67 | 77,45 | 99,03 | requiere revisión |
| 2 | Cordón de Domeyko | 71,60 | 77,41 | 98,89 | requiere revisión |
| 3 | Pampa María Elena | 49,99 | 77,44 | 98,41 | requiere revisión |

Interpretación obligatoria: es un screening de escritorio para ordenar investigación. No aprueba sitios ni autoriza acceso.

## Qué funciona

- Pipeline autenticado con Earthdata Login y OAuth Copernicus; ningún secreto se persiste en artefactos.
- NASADEM_HGT.001 mosaico multitesela; Yungay usa correctamente cuatro tiles antes de agregarse a ~473 m.
- Sentinel-2 L2A: 12 intervalos mensuales de 2025, ~30 m nominal, SCL, NDVI y BSI.
- Inventario HLS S30 v2.0: 338 granules en Yungay, 168 en Domeyko y 171 en María Elena.
- Comparación topográfica con escala igualada: NASADEM agregado ~473–476 m frente a MOLA ~451 m nominal.
- Media geométrica ponderada, confianza separada, mínimo 0,70 de peso válido y sensibilidad ±20 %.
- Restricciones trazables con autoridad, fuente, acción y razón; las no evaluadas fuerzan revisión.
- Manifiesto con URLs, versiones, periodo, resolución, CRS, unidades, licencia, NoData, transformaciones y SHA-256.
- App estática: ranking, mapa SVG offline, ficha, desglose, fuentes, advertencias, comparador, exportación JSON y metodología.
- Screening de agua permanente con NASADEM SWB; María Elena conserva advertencia por ~0,15 %.
- Snapshot fixture permanece en `artifacts/demo/` solo para probar estados límite y contratos.
- Paquete de entrega v2 en `submission/`, dos capturas verificadas en `submission/assets/` y checksum SHA-256 actualizado.
- Cerrado el saneamiento post-Claude: no quedan componentes ni hojas de estilo huérfanas de la implementación descartada.

## Cambios recientes

- Aceptado por Codex (13:54): contexto visual Sentinel-2 offline por candidato, tres PNG reales de diciembre de 2025 y procedencia completa. Verificados imágenes, selección, datos inválidos, archivo ausente y ZIP en subcarpeta. No cambia ciencia, score ni factibilidad. Detalle en `docs/VISUAL_REVIEW.md` y ADR-005 (`accepted`).

- Perfil v2 en `2.0.1-preliminary`: limitaciones nuevas sobre calidad asignada por fuente, significado de `validated` y razón de medianas. Los scores no cambian.
- Web: orden único con `rankCandidates`, área con dos cifras significativas y decimales con coma.
- `submission/analogos-chile-static.zip` y `SHA256SUMS.txt` regenerados; las capturas de `submission/assets/` ya reflejan los rótulos nuevos.
- `origin/main` apunta a `https://github.com/Esteban12-hori/AnalogOS`; el remoto local obsoleto fue retirado.
- La verificación reproducible pasa también sin `data/raw/`: 30 tests verdes y una integración NASADEM explícitamente omitida.
- Aceptado por Codex (12:44): `npm run release:package` genera el ZIP con lista explícita de archivos, bytes deterministas y SHA-256; el build carga en `/` o en `/AnalogOS/`. ADR-004 aceptado. Corregido un fallo de restauración detectado durante la revisión; pruebas independientes verdes.
- Ajuste visual final de Claude aceptado: el mapa SVG se alinea arriba en 16:9; captura principal, ZIP y checksum fueron regenerados.
- Integrados por avance directo los cambios remotos `6516743` y `3c1a014`: configuración de Vercel e ignorado de `.vercel`. Conservados junto con la entrega revisada.

## Fuentes reales del snapshot

- NASA PDS MOLA MEGDR `MEGT44N000HB`, entorno regional de Jezero.
- NASADEM HGT/SWB 1 arc-second: seis archives Earthdata; mosaico por AOI.
- Copernicus Sentinel-2 L2A Statistical API, enero–diciembre de 2025.
- NASA HLS S30 v2.0, inventario CMR 2025 sin mezclar píxeles en el score.
- NASA POWER Climatology Point API 2001–2025.
- Natural Earth 1:50m solo como contorno visual.

## Limitaciones abiertas

- No existe barrido nacional exhaustivo; se evaluaron tres sectores semilla de 0,2°.
- Geología sigue fuera del score por falta de revisión experta.
- No se intersectaron capas oficiales de urbano, áreas sensibles, propiedad o acceso; agua sí está screenada.
- La resolución ~460–480 m no evalúa obstáculos o tracción a escala de rueda.
- Falta inspección Worldview/imagen reciente y revisión experta, si el tiempo lo permite. El contexto Sentinel-2 de diciembre de 2025 es un avance parcial: muestra trazas rectilíneas y estructuras geométricas en Yungay y María Elena que son hipótesis a contrastar con capas oficiales, no hechos comprobados.
- La estabilidad mide cambio de score por un peso a la vez; no es incertidumbre científica total.

## Verificación ejecutada

| Comando | Resultado |
|---|---|
| `.venv/bin/python -m pytest -q` | 119 tests verdes (31 de ciencia y contratos, 39 del empaquetador, 49 del contexto visual); en un clon sin `data/raw/` se omite 1 integración NASADEM |
| `python -m pipelines.fetch_visual_context` | reutiliza el paquete visual local sin red ni credenciales |
| `npm run release:package` | build + validación + ZIP determinista; `shasum -a 256 -c SHA256SUMS.txt` OK; mismo SHA-256 en tres ejecuciones |
| HTTP local en `/AnalogOS/` y `/` | Claude comprobó respuestas HTTP; Codex verificó el ZIP extraído en navegador, ranking, mapa, selección, advertencia de agua y consola sin errores |
| `npm run test` | 24 tests verdes (10 del contexto visual) |
| `npm run build` | contratos + TypeScript + Vite verdes |
| revisión manual | snapshot v2, ranking, mapa, evidencia, layout y consola sin errores verificados |
| `npm audit` | 0 vulnerabilidades |

El build estático queda en `apps/web/dist/` (~4,1 MB), incluye `science-v2/` y `visual-context/`, sin llamadas externas obligatorias.

Codex repitió la suite y el empaquetado durante la aceptación de M4-VISUAL-EVIDENCE. Verificó las 12 entradas del ZIP contra dist, su determinismo y los seis hashes de snapshot/perfil contra la línea base; sin cambios científicos. El ZIP pesa 4.084.880 bytes y su SHA-256 es `97dc819efb7e0511e2b4a6e388eab5cf113db442006b3b01b415ae0db9f25f81`. También probó en navegador un PNG ausente y un índice con escenas inválidas: ambos conservan ranking y ficha.

## Comandos de reproducción

```bash
# Demo con artefactos incluidos
npm install
npm run dev

# Ciencia v2 desde fuentes autenticadas
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
python -m pipelines.fetch_precision_data
python -m pipelines.build_precision_snapshot

# Auditoría completa
npm run verify
```

## Archivos grandes/no versionables

- `data/raw/mola/megt44n000hb.img`: ~124 MiB.
- `data/raw/nasadem/*.zip`: seis archivos, ~61 MiB combinados.
- `data/raw/earthdata/cmr_inventory_v2.json`: inventario HLS/NASADEM, regenerable.
- `data/raw/copernicus/sentinel2_stats_2025.json`: estadísticas mensuales, regenerable.
- `data/raw/srtm/`: permanece solo para reproducir v1.

## Decisiones registradas

- `docs/decisions/ADR-001-offline-svg-map.md`
- `docs/decisions/ADR-002-science-screening-v1.md`
- `docs/decisions/ADR-003-authenticated-precision-snapshot-v2.md`
- `docs/decisions/ADR-004-portable-static-release.md`
- `docs/decisions/ADR-005-offline-visual-context.md`

## Acciones humanas antes de enviar

1. Grabar el video usando `submission/VIDEO_SHOT_LIST.md`.
2. Publicar `apps/web/dist/` o `submission/analogos-chile-static.zip`.
3. Probar demo/repositorio/video en incógnito y completar sus URLs.
4. Añadir integrantes y contribuciones del equipo.
5. Guardar el comprobante de envío.

## Aviso de Git

La carpeta tiene repositorio Git propio desde 2026-11-14 (ramas `main` y `dev`; el trabajo continúa en `dev`, creada desde `main` en `92053ea`), con único remoto `origin` en https://github.com/Esteban12-hori/AnalogOS (privado: para la entrega debe hacerse público o dar acceso a los jueces). `.env`, `data/raw/`, `node_modules/`, `dist/`, `.venv/`, `*.egg-info/` y `.claude/` quedan fuera por `.gitignore`. En un clon nuevo, la prueba que reprocesa NASADEM crudo se omite hasta ejecutar `python -m pipelines.fetch_precision_data`; el resto pasa sin `data/raw/` (comprobado en un clon limpio).
