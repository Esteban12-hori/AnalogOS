# ADR-006 — Globo de fondo con paso automático a mapa 2D y fuentes oficiales por zoom

- Estado: aceptado por el equipo humano (2026-11-14, decisión directa del usuario, sin revisión de Codex).
- Fecha: 2026-11-14
- Relación: amplía ADR-007 (globo three.js) y reutiliza ADR-005 (contexto Sentinel-2). Contradice la línea «mapa SVG, no MapLibre ni WebGL» de `CLAUDE.md`; el equipo humano la acepta igualmente y `CLAUDE.md` queda pendiente de actualizar.

## Contexto

El equipo pidió: el planeta como fondo y centro del sitio, sin columna de candidatos, sin información repetida, sin selector 3D/2D, la ficha flotando en liquid glass y que al hacer zoom se pase solo a un mapa 2D con la mejor imagen oficial disponible, con la fuente visible. Blue Marble del globo (~10 km/píxel) se pixela al acercarse.

## Decisión

1. **Escenario de fondo** (`MapStage`): globo three.js a pantalla completa. Al cruzar el zoom Mercator equivalente 5,6 pasa a un mapa MapLibre 2D con el mismo centro y escala; bajo 4,9 vuelve al globo (histéresis). Las equivalencias son funciones puras con tests (`domain/mapZoom.ts`).
2. **Capas 2D, de abajo hacia arriba por calidad**:
   - Blue Marble NG ~500 m del norte de Chile, copia local (`artifacts/basemaps/`, NASA GIBS).
   - HLS S30 ~30 m en línea (NASA GIBS WMTS, varias fechas apiladas): solo mejora si hay conexión.
   - Mediana HLS S30/L30 2025 ~30 m por sector con margen de 0,12°, local, sin nubes ni huecos (`pipelines/fetch_basemaps.py`).
   - Sentinel-2 L2A de ADR-005 sobre cada polígono, local: la más nítida y la ya revisada.
3. **Leyenda**: muestra la fuente principal visible según encuadre y zoom, más una línea con las que quedan debajo. Siempre dice que las imágenes no entran al score.
4. **Sin WebGL** (ADR-001): se usa automáticamente el mapa SVG local, sin selector.
5. La ficha flota en liquid glass, con un selector compacto 1·2·3 en lugar de la columna de ranking. El panel de ADR-005 cambia la miniatura por «Ver el sector en el mapa 2D» para no repetir la imagen.

## Consecuencias

- La demo central sigue offline: globo, Blue Marble regional, medianas HLS y Sentinel-2 son locales. Las teselas en línea son solo mejora; GIBS devuelve 500 intermitentes en teselas vacías, que el mapa tolera.
- Se añaden `maplibre-gl` (chunk diferido de ~1,1 MB y worker propio) y ~1 MB de imágenes en `artifacts/basemaps/`.
- `scripts/package_release.py` rechaza este build: su lista explícita no incluye los chunks diferidos, las texturas, el worker ni `basemaps/`. Hay que extenderla antes de empaquetar.
- La mediana HLS que entrega GIBS se ve menos contrastada que la Sentinel-2 de ADR-005; se nota el borde del polígono, que además está dibujado.
