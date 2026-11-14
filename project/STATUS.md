# Estado actual

**Última actualización:** 2026-11-14 11:45 America/Santiago  
**Responsable del checkpoint:** Codex  
**Milestone activo:** M6 — empaquetado y entrega  
**Estado general:** producto funcional y presentable con snapshot científico v2 autenticado. NASADEM corrige el mosaico de borde y Sentinel-2 completa superficie no vegetada. Faltan acciones humanas/externas: video, URLs públicas, integrantes, capas territoriales y revisión experta.

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
- Falta inspección Worldview/imagen reciente y revisión experta, si el tiempo lo permite.
- La estabilidad mide cambio de score por un peso a la vez; no es incertidumbre científica total.

## Verificación ejecutada

| Comando | Resultado |
|---|---|
| `.venv/bin/python -m pytest -q` | 30 tests verdes |
| `npm run test` | 14 tests verdes |
| `npm run build` | contratos + TypeScript + Vite verdes |
| revisión manual | snapshot v2, ranking, mapa, evidencia, layout y consola sin errores verificados |
| `npm audit` | 0 vulnerabilidades |

El build estático queda en `apps/web/dist/` (~520 KiB), incluye solo `science-v2/` y no hace llamadas externas.

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

## Acciones humanas antes de enviar

1. Grabar el video usando `submission/VIDEO_SHOT_LIST.md`.
2. Publicar `apps/web/dist/` o `submission/analogos-chile-static.zip`.
3. Probar demo/repositorio/video en incógnito y completar sus URLs.
4. Añadir integrantes y contribuciones del equipo.
5. Guardar el comprobante de envío.

## Aviso de Git

La carpeta tiene repositorio Git propio desde 2026-11-14 (rama `main`), con remoto `origin` en https://github.com/hori0729/AnalogOS (público). `.env`, `data/raw/`, `node_modules/`, `dist/`, `.venv/`, `*.egg-info/` y `.claude/` quedan fuera por `.gitignore`. En un clon nuevo, `tests/test_precision_artifacts.py` necesita `data/raw/` (ejecutar antes `python -m pipelines.fetch_precision_data`).
