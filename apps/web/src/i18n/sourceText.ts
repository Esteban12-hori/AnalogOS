/**
 * English DISPLAY translations of editorial text that the active artifacts carry in Spanish
 * (science-v3, visual-context-v3, geology-context-v1, basemaps, reference analogs).
 *
 * Pure display layer: nothing here mutates an artifact or the objects handed to the engine, validators or exports.
 * Audit JSON keeps the original wording; reports disclose that. Keys are the EXACT original strings, so a change in
 * the source data is caught by the coverage test (src/tests/sourceText.test.ts) instead of being silently mistranslated.
 *
 * - Official names (authorities, distributors, dataset titles, place/region names, bibliographic titles) are kept
 *   verbatim (KEEP_ORIGINAL) or glossed without inventing new titles.
 * - Text without an entry is never translated on the fly and never labeled by guessing its language:
 *   displaySource() returns it unchanged. Source-language labels come only from explicit provenance (for example
 *   SPANISH_SOURCE_TITLES or a known-Spanish official field such as a geology unit description).
 * - Long official geological unit descriptions have their own labeled glosses in ./geologyGloss.ts.
 */

/** Label appended ONLY to text whose Spanish provenance is known (official unit descriptions without a gloss). */
export const ORIGINAL_WORDING_MARK = ' [original Spanish wording]'

/** Bibliographic titles known to be Spanish (kept verbatim, shown with lang="es" and an explicit label). */
export const SPANISH_SOURCE_TITLES: ReadonlySet<string> = new Set([
  'Universidad Nacional de Catamarca, Facultad de Tecnología y Ciencias Aplicadas (2025-04-08). La puna catamarqueña, un sitio con similitudes al planeta Marte.',
  'Rojas, M. C. (2021). Estudio de las megaóndulas de la Puna Austral, y su relevancia para el planeta Marte. Tesis; ficha CONICET.',
])

/** Official names and titles intentionally shown as in the source. */
export const KEEP_ORIGINAL: ReadonlySet<string> = new Set([
  'Interior de Antofagasta',
  'Puna de Catamarca y Salta',
  'María Elena South (MES)',
  'SERNAGEOMIN (Servicio Nacional de Geología y Minería)',
  'SEGEMAR (Servicio Geológico Minero Argentino)',
  'Ministerio del Medio Ambiente de Chile (MMA), Líneas de base públicas',
  'Geología Base',
  'Unidades geológicas 1:250.000',
])

export const SOURCE_TEXT_EN: Readonly<Record<string, string>> = {
  // --- science-v3 · candidate-details: criterion explanations ---------------------------------------------------
  'Mediana de pendiente NASADEM mosaico, agregada 16×16 y comparada por razón con MOLA a escala equivalente.':
    'Median NASADEM mosaic slope, aggregated 16×16 and compared with MOLA as a ratio at an equivalent scale.',
  'Diferencia absoluta mediana entre celdas vecinas NASADEM y MOLA a escala aproximadamente equivalente.':
    'Median absolute difference between neighboring NASADEM cells and MOLA at an approximately equivalent scale.',
  'Relieve mediano 3×3 sobre NASADEM agregado comparado con la ventana regional MOLA.':
    'Median 3×3 relief on aggregated NASADEM compared with the regional MOLA window.',
  'Mediana de 12 mosaicos mensuales Sentinel-2 L2A: fracción SCL clase 5 dentro de píxeles válidos. La similitud usa directamente la continuidad no vegetada requerida por el perfil de prueba.':
    'Median of 12 monthly Sentinel-2 L2A mosaics: fraction of SCL class 5 within valid pixels. Similarity directly uses the non-vegetated continuity required by the test profile.',
  'Precipitación climatológica POWER como contexto regional; preferencia decreciente con escala de 25 mm/año heredada del perfil v1.':
    'POWER climatological precipitation as regional context; decreasing preference with a 25 mm/year scale inherited from profile v1.',
  'Proxy regional de estrés térmico: rango climatológico POWER, saturado a 45 °C como en el perfil v1.':
    'Regional thermal-stress proxy: POWER climatological range, saturated at 45 °C as in profile v1.',
  'Requiere cartografía geológica oficial (SERNAGEOMIN) y revisión experta; permanece fuera del score v3.':
    'Requires official geological mapping (SERNAGEOMIN) and expert review; it stays outside the v3 score.',
  'Requiere cartografía geológica oficial (SEGEMAR) y revisión experta; permanece fuera del score v3.':
    'Requires official geological mapping (SEGEMAR) and expert review; it stays outside the v3 score.',

  // --- candidate warnings ---------------------------------------------------------------------------------------
  'SCREENING CIENTÍFICO: prioriza reconocimiento; no aprueba el sitio, no garantiza seguridad y no autoriza acceso.':
    'SCIENTIFIC SCREENING: it prioritizes reconnaissance; it does not approve the site, guarantee safety or authorize access.',
  'OBSERVACIÓN VISUAL PRELIMINAR (Sentinel-2, diciembre de 2025; revisada el 2026-11-14): numerosas trazas lineales y una red sinuosa y ramificada de tono claro en el noreste. Es apariencia a contrastar: no identifica instalaciones, propietarios ni permisos, no cambia el score ni la factibilidad y requiere cruce territorial.':
    'PRELIMINARY VISUAL OBSERVATION (Sentinel-2, December 2025; reviewed 2026-11-14): numerous linear traces and a sinuous, branching light-toned network in the northeast. This is appearance to be checked: it does not identify facilities, owners or permits, does not change the score or feasibility, and requires territorial cross-checking.',
  'OBSERVACIÓN VISUAL PRELIMINAR (Sentinel-2, diciembre de 2025; revisada el 2026-11-14): relieve con abanicos, una franja clara ancha y sinuosa que cruza la ventana y trazas lineales. Es apariencia a contrastar: no identifica instalaciones, propietarios ni permisos, no cambia el score ni la factibilidad y requiere cruce territorial.':
    'PRELIMINARY VISUAL OBSERVATION (Sentinel-2, December 2025; reviewed 2026-11-14): relief with fans, a wide, sinuous light-toned strip crossing the window, and linear traces. This is appearance to be checked: it does not identify facilities, owners or permits, does not change the score or feasibility, and requires territorial cross-checking.',
  'OBSERVACIÓN VISUAL PRELIMINAR (Sentinel-2, diciembre de 2025; revisada el 2026-11-14): trazas rectilíneas y concentraciones geométricas de tono claro en el norte. Es apariencia a contrastar: no identifica instalaciones, propietarios ni permisos, no cambia el score ni la factibilidad y requiere cruce territorial.':
    'PRELIMINARY VISUAL OBSERVATION (Sentinel-2, December 2025; reviewed 2026-11-14): straight traces and geometric light-toned concentrations in the north. This is appearance to be checked: it does not identify facilities, owners or permits, does not change the score or feasibility, and requires territorial cross-checking.',
  'OBSERVACIÓN VISUAL PRELIMINAR (Sentinel-2, diciembre de 2025; revisada el 2026-11-14): campos oscuros en el centro y el este y una franja verde u oscura en el borde noreste. Es apariencia a contrastar: no identifica instalaciones, propietarios ni permisos, no cambia el score ni la factibilidad y requiere cruce territorial.':
    'PRELIMINARY VISUAL OBSERVATION (Sentinel-2, December 2025; reviewed 2026-11-14): dark fields in the center and east and a green or dark strip on the northeast edge. This is appearance to be checked: it does not identify facilities, owners or permits, does not change the score or feasibility, and requires territorial cross-checking.',
  'OBSERVACIÓN VISUAL PRELIMINAR (Sentinel-2, diciembre de 2025; revisada el 2026-11-14): una concentración densa de estructuras claras en el sur con una franja verde u oscura adyacente, compatible con intervención humana a contrastar. Es apariencia a contrastar: no identifica instalaciones, propietarios ni permisos, no cambia el score ni la factibilidad y requiere cruce territorial.':
    'PRELIMINARY VISUAL OBSERVATION (Sentinel-2, December 2025; reviewed 2026-11-14): a dense concentration of light-toned structures in the south with an adjacent green or dark strip, consistent with human intervention to be checked. This is appearance to be checked: it does not identify facilities, owners or permits, does not change the score or feasibility, and requires territorial cross-checking.',
  'OBSERVACIÓN VISUAL PRELIMINAR (Sentinel-2, diciembre de 2025; revisada el 2026-11-14): franjas verdes u oscuras ramificadas en el norte y el oeste. Es apariencia a contrastar: no identifica instalaciones, propietarios ni permisos, no cambia el score ni la factibilidad y requiere cruce territorial.':
    'PRELIMINARY VISUAL OBSERVATION (Sentinel-2, December 2025; reviewed 2026-11-14): branching green or dark strips in the north and west. This is appearance to be checked: it does not identify facilities, owners or permits, does not change the score or feasibility, and requires territorial cross-checking.',
  'OBSERVACIÓN VISUAL PRELIMINAR (Sentinel-2, diciembre de 2025; revisada el 2026-11-14): trazas rectilíneas y un conjunto de parches brillantes de contorno rectangular en el sureste. Es apariencia a contrastar: no identifica instalaciones, propietarios ni permisos, no cambia el score ni la factibilidad y requiere cruce territorial.':
    'PRELIMINARY VISUAL OBSERVATION (Sentinel-2, December 2025; reviewed 2026-11-14): straight traces and a group of bright, rectangular-outlined patches in the southeast. This is appearance to be checked: it does not identify facilities, owners or permits, does not change the score or feasibility, and requires territorial cross-checking.',
  'REVISIÓN PENDIENTE — protected_or_sensitive_area · IDE Chile y autoridad territorial competente: No se intersectó aún con el inventario oficial de áreas protegidas o sensibles. Fuente: https://www.ide.cl/':
    'PENDING REVIEW — protected_or_sensitive_area · IDE Chile and the competent territorial authority: not yet intersected with the official inventory of protected or sensitive areas. Source: https://www.ide.cl/',
  'REVISIÓN PENDIENTE — urban_area · IDE Chile y autoridad territorial competente: No se intersectó aún con límites urbanos e infraestructura oficial. Fuente: https://www.ide.cl/':
    'PENDING REVIEW — urban_area · IDE Chile and the competent territorial authority: not yet intersected with official urban boundaries and infrastructure. Source: https://www.ide.cl/',
  'REVISIÓN PENDIENTE — land_access · Autoridad territorial, propietarios y operadores: Propiedad, accesos, seguridad y permisos requieren verificación humana. Fuente: https://www.ide.cl/':
    'PENDING REVIEW — land_access · Territorial authority, owners and operators: ownership, access, safety and permits require human verification. Source: https://www.ide.cl/',
  'REVISIÓN PENDIENTE — field_scale_slope · Equipo de campaña de rover: NASADEM a 30 m no detecta obstáculos ni pendientes a escala de rueda. Fuente: https://lpdaac.usgs.gov/documents/2237/NASADEM_User_Guide_V13.pdf':
    'PENDING REVIEW — field_scale_slope · Rover campaign team: NASADEM at 30 m does not detect obstacles or slopes at wheel scale. Source: https://lpdaac.usgs.gov/documents/2237/NASADEM_User_Guide_V13.pdf',
  'REVISIÓN PENDIENTE — protected_or_sensitive_area · IDERA y autoridad territorial competente: No se intersectó aún con el inventario oficial de áreas protegidas o sensibles. Fuente: https://www.idera.gob.ar/':
    'PENDING REVIEW — protected_or_sensitive_area · IDERA and the competent territorial authority: not yet intersected with the official inventory of protected or sensitive areas. Source: https://www.idera.gob.ar/',
  'REVISIÓN PENDIENTE — urban_area · IDERA y autoridad territorial competente: No se intersectó aún con límites urbanos e infraestructura oficial. Fuente: https://www.idera.gob.ar/':
    'PENDING REVIEW — urban_area · IDERA and the competent territorial authority: not yet intersected with official urban boundaries and infrastructure. Source: https://www.idera.gob.ar/',
  'REVISIÓN PENDIENTE — land_access · Autoridad territorial, propietarios y operadores: Propiedad, accesos, seguridad y permisos requieren verificación humana. Fuente: https://www.idera.gob.ar/':
    'PENDING REVIEW — land_access · Territorial authority, owners and operators: ownership, access, safety and permits require human verification. Source: https://www.idera.gob.ar/',
  'ADVERTENCIA — valores de contexto POWER coincidentes con cl-win-s2520-w06950; posible celda compartida: no son observaciones climáticas independientes.':
    'WARNING — POWER context values identical to cl-win-s2520-w06950; possibly a shared cell: they are not independent climate observations.',
  'ADVERTENCIA — valores de contexto POWER coincidentes con cl-win-s2480-w06950; posible celda compartida: no son observaciones climáticas independientes.':
    'WARNING — POWER context values identical to cl-win-s2480-w06950; possibly a shared cell: they are not independent climate observations.',
  'ADVERTENCIA — permanent_water_trace · NASA LP DAAC — NASADEM SWB: NASADEM SWB detectó 0,10 % de agua permanente. El polígono se conserva, pero el trazado de campaña debe evitar esos píxeles. Fuente: https://doi.org/10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001':
    'WARNING — permanent_water_trace · NASA LP DAAC — NASADEM SWB: NASADEM SWB detected 0.10% permanent water. The polygon is kept, but the campaign route must avoid those pixels. Source: https://doi.org/10.5067/MEaSUREs/NASADEM/NASADEM_HGT.001',
  'REFERENCIA CONOCIDA: Yungay se muestra para comparar; no es un candidato de la búsqueda.':
    'KNOWN REFERENCE: Yungay is shown for comparison; it is not a candidate from the search.',

  // --- candidate / profile limitations ---------------------------------------------------------------------------
  'Screening de escritorio: no reemplaza inspección de terreno, evaluación de seguridad ni permisos.':
    'Desktop screening: it does not replace field inspection, safety assessment or permits.',
  'MOLA y NASADEM se comparan cerca de 460–480 m; NASADEM a 30 m solo sirve como screening y no describe obstáculos a escala de rueda.':
    'MOLA and NASADEM are compared at about 460–480 m; NASADEM at 30 m only serves for screening and does not describe wheel-scale obstacles.',
  'Sentinel-2 SCL clase 5 mide superficie no vegetada, no composición mineral, cohesión ni mecánica de suelo.':
    'Sentinel-2 SCL class 5 measures non-vegetated surface, not mineral composition, cohesion or soil mechanics.',
  'No representa gravedad, atmósfera, presión, radiación ni química exacta del regolito marciano.':
    'It does not represent the gravity, atmosphere, pressure, radiation or exact chemistry of Martian regolith.',
  'Geología, áreas protegidas, urbano, propiedad y acceso permanecen pendientes de evidencia oficial integrada en ambos países.':
    'Geology, protected areas, urban areas, ownership and access remain pending integrated official evidence in both countries.',
  'La confianza usa calidades asignadas por tipo de fuente (ADR-003), no incertidumbre medida; por eso casi no distingue entre sectores.':
    'Confidence uses qualities assigned by source type (ADR-003), not measured uncertainty; that is why it barely distinguishes between sectors.',
  'Los criterios «validated» están aprobados para screening por ADR-002 y ADR-003, sin validación experta externa ni de campo; la comparación topográfica es una razón de medianas, no una distancia entre distribuciones completas.':
    'The “validated” criteria are approved for screening by ADR-002 and ADR-003, without external expert or field validation; the topographic comparison is a ratio of medians, not a distance between full distributions.',
  'Piloto acotado: 50 ventanas de ~20 km en dos regiones de prueba de Chile y Argentina. No es una búsqueda nacional ni global, ni una muestra representativa.':
    'Bounded pilot: 50 windows of ~20 km in two test regions of Chile and Argentina. It is not a national or global search, nor a representative sample.',
  'La preselección usa solo prioridad topográfica; las ventanas no preseleccionadas no se evaluaron con Sentinel-2 ni POWER.':
    'Preselection uses only topographic priority; windows that were not preselected were not evaluated with Sentinel-2 or POWER.',
  'El catálogo de antecedentes es incompleto: ninguna ventana se declara nueva y no encontrar coincidencias no prueba novedad.':
    'The precedent catalog is incomplete: no window is declared new, and finding no match does not prove novelty.',
  'NASA POWER describe una celda MERRA-2 de 0,5° × 0,625°, mayor que la ventana: es contexto climático regional, no lluvia medida en el sitio, y ventanas vecinas pueden compartir la misma celda.':
    'NASA POWER describes a 0.5° × 0.625° MERRA-2 cell, larger than the window: it is regional climate context, not rain measured at the site, and neighboring windows may share the same cell.',

  // --- field checks ---------------------------------------------------------------------------------------------
  'Confirmar límites, propiedad, acceso, seguridad y permisos con autoridades y propietarios.':
    'Confirm boundaries, ownership, access, safety and permits with authorities and owners.',
  'Levantar obstáculos, pendiente y rugosidad a escala centimétrica/decimétrica.':
    'Survey obstacles, slope and roughness at centimeter/decimeter scale.',
  'Medir granulometría, cohesión, polvo, hundimiento y tracción del suelo para el rover.':
    'Measure grain size, cohesion, dust, sinkage and soil traction for the rover.',
  'Intersectar cartografía oficial de áreas protegidas, urbano e infraestructura antes de planificar campaña.':
    'Intersect official maps of protected areas, urban areas and infrastructure before planning a campaign.',
  'Solicitar revisión geológica de las unidades y afloramientos del polígono.':
    'Request a geological review of the units and outcrops in the polygon.',

  // --- evidence claims ------------------------------------------------------------------------------------------
  'Referencia marciana: topografía MOLA MEGDR del entorno regional de Jezero.':
    'Martian reference: MOLA MEGDR topography of the regional Jezero setting.',
  'Topografía terrestre: NASADEM_HGT.001 mosaico de 1 tile(s), agregado a ~468 m.': 'Terrestrial topography: NASADEM_HGT.001 mosaic of 1 tile(s), aggregated to ~468 m.',
  'Topografía terrestre: NASADEM_HGT.001 mosaico de 1 tile(s), agregado a ~469 m.': 'Terrestrial topography: NASADEM_HGT.001 mosaic of 1 tile(s), aggregated to ~469 m.',
  'Topografía terrestre: NASADEM_HGT.001 mosaico de 1 tile(s), agregado a ~471 m.': 'Terrestrial topography: NASADEM_HGT.001 mosaic of 1 tile(s), aggregated to ~471 m.',
  'Topografía terrestre: NASADEM_HGT.001 mosaico de 2 tile(s), agregado a ~470 m.': 'Terrestrial topography: NASADEM_HGT.001 mosaic of 2 tile(s), aggregated to ~470 m.',
  'Topografía terrestre: NASADEM_HGT.001 mosaico de 2 tile(s), agregado a ~471 m.': 'Terrestrial topography: NASADEM_HGT.001 mosaic of 2 tile(s), aggregated to ~471 m.',
  'Topografía terrestre: NASADEM_HGT.001 mosaico de 4 tile(s), agregado a ~473 m.': 'Terrestrial topography: NASADEM_HGT.001 mosaic of 4 tile(s), aggregated to ~473 m.',
  'Superficie: 100,0 % no vegetada, mediana de 12 de 12 mosaicos mensuales Sentinel-2 L2A de 2025.': 'Surface: 100.0% non-vegetated, median of 12 of 12 monthly Sentinel-2 L2A mosaics from 2025.',
  'Superficie: 99,4 % no vegetada, mediana de 12 de 12 mosaicos mensuales Sentinel-2 L2A de 2025.': 'Surface: 99.4% non-vegetated, median of 12 of 12 monthly Sentinel-2 L2A mosaics from 2025.',
  'Superficie: 98,4 % no vegetada, mediana de 12 de 12 mosaicos mensuales Sentinel-2 L2A de 2025.': 'Surface: 98.4% non-vegetated, median of 12 of 12 monthly Sentinel-2 L2A mosaics from 2025.',
  'Superficie: 99,6 % no vegetada, mediana de 12 de 12 mosaicos mensuales Sentinel-2 L2A de 2025.': 'Surface: 99.6% non-vegetated, median of 12 of 12 monthly Sentinel-2 L2A mosaics from 2025.',
  'Disponibilidad NASA independiente: 85 granules HLS Sentinel-2 intersectan el AOI en 2025; se registra como inventario, no entra al score.': 'Independent NASA availability: 85 HLS Sentinel-2 granules intersect the AOI in 2025; recorded as inventory, not part of the score.',
  'Disponibilidad NASA independiente: 88 granules HLS Sentinel-2 intersectan el AOI en 2025; se registra como inventario, no entra al score.': 'Independent NASA availability: 88 HLS Sentinel-2 granules intersect the AOI in 2025; recorded as inventory, not part of the score.',
  'Disponibilidad NASA independiente: 173 granules HLS Sentinel-2 intersectan el AOI en 2025; se registra como inventario, no entra al score.': 'Independent NASA availability: 173 HLS Sentinel-2 granules intersect the AOI in 2025; recorded as inventory, not part of the score.',
  'Disponibilidad NASA independiente: 174 granules HLS Sentinel-2 intersectan el AOI en 2025; se registra como inventario, no entra al score.': 'Independent NASA availability: 174 HLS Sentinel-2 granules intersect the AOI in 2025; recorded as inventory, not part of the score.',
  'Disponibilidad NASA independiente: 338 granules HLS Sentinel-2 intersectan el AOI en 2025; se registra como inventario, no entra al score.': 'Independent NASA availability: 338 HLS Sentinel-2 granules intersect the AOI in 2025; recorded as inventory, not part of the score.',
  'Contexto regional: climatología NASA POWER 2001–2025 de una celda MERRA-2 de 0,5° × 0,625°, mayor que la ventana; no es lluvia medida en el sitio y requiere contraste local.':
    'Regional context: NASA POWER 2001–2025 climatology of a 0.5° × 0.625° MERRA-2 cell, larger than the window; it is not rain measured at the site and requires local cross-checking.',
  'Antecedente (cercanía a una coordenada publicada (heurística de 25 km, no perímetro del estudio)): Transecto norte–sur de Atacama (24–28° S), con núcleo en Yungay.':
    'Precedent (near a published coordinate (25 km heuristic, not the study perimeter)): North–south Atacama transect (24–28° S), centered on Yungay.',
  'Antecedente (región con antecedentes publicados): Ensayos de rover «Life in the Atacama» (Hyperion 2003; Zoë 2004).':
    'Precedent (region with published precedents): “Life in the Atacama” rover trials (Hyperion 2003; Zoë 2004).',
  'Antecedente (región con antecedentes publicados): Transecto norte–sur de Atacama (24–28° S), con núcleo en Yungay.':
    'Precedent (region with published precedents): North–south Atacama transect (24–28° S), centered on Yungay.',
  'Antecedente (región con antecedentes publicados): Puna catamarqueña, entorno de Antofagasta de la Sierra.':
    'Precedent (region with published precedents): Catamarca Puna, around Antofagasta de la Sierra.',
  'Antecedente (contiene coordenadas de muestreo publicadas): Transecto norte–sur de Atacama (24–28° S), con núcleo en Yungay.':
    'Precedent (contains published sampling coordinates): North–south Atacama transect (24–28° S), centered on Yungay.',

  // --- discovery / literature notes -----------------------------------------------------------------------------
  'Preseleccionada por prioridad topográfica y separación mínima; no es un hallazgo validado.':
    'Preselected by topographic priority and minimum separation; it is not a validated finding.',
  'La región tiene antecedentes publicados como análogo. Las fuentes revisadas no ubican coordenadas de muestreo dentro de esta ventana; eso no prueba que sea nueva.':
    'The region has published precedents as an analog. The reviewed sources do not place sampling coordinates inside this window; that does not prove it is new.',
  'Ventana de screening v2; no es el perímetro exacto de cada campaña histórica en Yungay.':
    'Screening window v2; it is not the exact perimeter of each historical campaign at Yungay.',
  'Referencia conocida: se muestra para comparar y no participa en el ranking de candidatos.':
    'Known reference: shown for comparison; it does not take part in the candidate ranking.',

  // --- manifest datasets ----------------------------------------------------------------------------------------
  '128 píxeles/grado; ~463 m/píxel en latitud': '128 pixels/degree; ~463 m/pixel in latitude',
  '0,0003° nominal (~30 m)': '0.0003° nominal (~30 m)',
  'PRECTOTCORR ANN × 365,25': 'PRECTOTCORR ANN × 365.25',
  'recorte 0,2°': '0.2° crop',
  'Registro PubMed del artículo (PMID 14605363)': 'PubMed record of the article (PMID 14605363)',
  // Official organization and service names stay; only the descriptive suffix is translated.
  'SEGEMAR, Sistema de Información Geológica Ambiental Minera (SIGAM), servicio WFS público': 'SEGEMAR, Sistema de Información Geológica Ambiental Minera (SIGAM), public WFS service',
  'mosaico de misión': 'mission mosaic',
  'NASA PDS open data; atribución a MOLA y PDS': 'NASA PDS open data; attribution to MOLA and PDS',
  'Ventana regional alrededor de Jezero; no modela obstáculos a escala de rueda.': 'Regional window around Jezero; it does not model wheel-scale obstacles.',
  'métricas topográficas a escala planetaria': 'topographic metrics at planetary scale',
  'Sentinel-2 L2A Statistical API: SCL, NDVI y BSI': 'Sentinel-2 L2A Statistical API: SCL, NDVI and BSI',
  'mosaicos mensuales de menor nubosidad': 'monthly least-cloud mosaics',
  'fracciones 0–1 e índices adimensionales': '0–1 fractions and dimensionless indices',
  'Se excluyen SCL no-data, saturado, sombra, nubes, cirrus, no clasificado y nieve.': 'SCL no-data, saturated, shadow, cloud, cirrus, unclassified and snow are excluded.',
  'SCL clase 5 no distingue mineralogía, suelo consolidado ni infraestructura.': 'SCL class 5 does not distinguish mineralogy, consolidated soil or infrastructure.',
  'MGRS/UTM por tile': 'MGRS/UTM per tile',
  'metadatos de inventario; no entra al score': 'inventory metadata; not part of the score',
  'NASA open data; citar HLS y LP DAAC': 'NASA open data; cite HLS and LP DAAC',
  'Se valida disponibilidad de fuente NASA independiente; no se mezclan sus píxeles con Sentinel-2 en v2.': 'Availability of an independent NASA source is checked; its pixels are not mixed with Sentinel-2 in v2.',
  'Búsqueda CMR por AOI y periodo': 'CMR search by AOI and period',
  'conteo de granules': 'granule count',
  'celda climática regional más cercana': 'nearest regional climate cell',
  'climatología mensual y anual de 25 años': '25-year monthly and annual climatology',
  'mm/día y °C': 'mm/day and °C',
  'Contexto regional; no es una medición local de terreno.': 'Regional context; it is not a local ground measurement.',
  'NASA LP DAAC vía Earthdata Login': 'NASA LP DAAC via Earthdata Login',
  'metros y máscara agua 0/255': 'meters and 0/255 water mask',
  'NASA open data; citar NASADEM y LP DAAC': 'NASA open data; cite NASADEM and LP DAAC',
  'DEM void-filled; SWB 0=tierra y 255=agua según el User Guide NASADEM.': 'Void-filled DEM; SWB 0 = land and 255 = water according to the NASADEM User Guide.',
  'agregación 16×16': '16×16 aggregation',
  'métricas topográficas': 'topographic metrics',
  'Solo ventanas preseleccionadas; la completitud se mide contra los 12 meses configurados y se descartan intervalos duplicados, fuera de periodo, con error o no finitos.':
    'Preselected windows only; completeness is measured against the 12 configured months, and duplicate, out-of-period, failed or non-finite intervals are discarded.',
  'celda MERRA-2 de 0,5° × 0,625°, mayor que la ventana de ~20 km': '0.5° × 0.625° MERRA-2 cell, larger than the ~20 km window',
  'Contexto climático regional, no lluvia medida en el sitio; ventanas vecinas pueden compartir celda. Requiere contraste con datos locales.':
    'Regional climate context, not rain measured at the site; neighboring windows may share a cell. Requires cross-checking with local data.',
  'recorte 0,2° por ventana de la rejilla': '0.2° crop per grid window',
  'Admin 0 — Countries 1:50m (Chile y Argentina)': 'Admin 0 — Countries 1:50m (Chile and Argentina)',
  'estático': 'static',
  'Dominio público': 'Public domain',
  'Solo contexto visual; no es límite oficial ni autoridad territorial y no entra al score.': 'Visual context only; it is not an official boundary or territorial authority and is not part of the score.',
  'Extracción de Chile y Argentina desde world-atlas': 'Extraction of Chile and Argentina from world-atlas',
  'Código MIT; datos conservan licencias de origen': 'MIT code; data keep their original licenses',
  'Catálogo revisado de antecedentes de análogos': 'Reviewed catalog of analog precedents',
  'coordenadas publicadas o descripción regional, según la fuente': 'published coordinates or regional description, depending on the source',
  'no aplica': 'not applicable',
  'Catálogo incompleto; no encontrar coincidencias no prueba novedad.': 'Incomplete catalog; finding no match does not prove novelty.',
  'Transcripción literal de coordenadas publicadas': 'Literal transcription of published coordinates',
  'conversión a grados decimales': 'conversion to decimal degrees',
  'Resultados de la búsqueda por rejilla (50 ventanas)': 'Grid search results (50 windows)',
  'ventanas de 0,2° (~20 km); métricas a ~460–480 m': '0.2° windows (~20 km); metrics at ~460–480 m',
  'm, grados, fracciones y prioridad 0–100': 'm, degrees, fractions and priority 0–100',
  'La prioridad topográfica solo ordena la preselección; no es score final ni confianza.': 'Topographic priority only orders the preselection; it is not the final score or confidence.',
  'métricas NASADEM v2': 'NASADEM v2 metrics',
  'media geométrica topográfica': 'topographic geometric mean',
  'diversificación por distancia': 'diversification by distance',
  'Métricas topográficas, espectrales y climáticas derivadas': 'Derived topographic, spectral and climate metrics',
  '~30 m superficie; ~460–480 m comparación topográfica': '~30 m surface; ~460–480 m topographic comparison',
  'm, grados, fracciones, índices, mm/año y °C': 'm, degrees, fractions, indices, mm/year and °C',
  'Screening reproducible; geología y restricciones territoriales siguen pendientes en ambos países.': 'Reproducible screening; geology and territorial constraints remain pending in both countries.',
  'agregación espacial': 'spatial aggregation',
  'media geométrica': 'geometric mean',

  // --- mission profile ------------------------------------------------------------------------------------------
  'Screening multifuente para movilidad de rover — piloto Chile–Argentina': 'Multi-source screening for rover mobility — Chile–Argentina pilot',
  'Priorizar sectores del piloto Chile–Argentina para investigar pruebas de percepción, navegación, tracción y autonomía de rover, con las mismas fórmulas, pesos y tolerancias del perfil v2 y Yungay como referencia conocida.':
    'Prioritize sectors of the Chile–Argentina pilot to investigate rover perception, navigation, traction and autonomy tests, with the same formulas, weights and tolerances as profile v2 and Yungay as the known reference.',
  'Referencia regional de Jezero derivada de MOLA MEGDR. Sentinel-2 caracteriza la aptitud terrestre para pruebas; no afirma equivalencia espectral con Marte.':
    'Regional Jezero reference derived from MOLA MEGDR. Sentinel-2 characterizes terrestrial suitability for tests; it does not claim spectral equivalence with Mars.',
  'Pendiente a escala equivalente': 'Slope at equivalent scale',
  'Rugosidad a escala equivalente': 'Roughness at equivalent scale',
  'Relieve local a escala equivalente': 'Local relief at equivalent scale',
  'Continuidad de superficie no vegetada': 'Non-vegetated surface continuity',
  'Contexto de aridez': 'Aridity context',
  'Rango térmico superficial climatológico': 'Climatological surface thermal range',
  'Relevancia geológica': 'Geological relevance',

  // --- precedents -----------------------------------------------------------------------------------------------
  'Claude Code (revisión documental sin validación experta)': 'Claude Code (documentary review without expert validation)',
  'Catálogo incompleto y acotado a las fuentes listadas. No encontrar una coincidencia aquí no prueba que una ventana sea nueva. Un punto de muestreo no delimita toda una campaña.':
    'Incomplete catalog limited to the listed sources. Finding no match here does not prove that a window is new. A sampling point does not delimit a whole campaign.',
  'La ventana contiene al menos una coordenada de muestreo impresa en la fuente.': 'The window contains at least one sampling coordinate printed in the source.',
  'La fuente publica una geometría de área de estudio que se superpone a la ventana.': 'The source publishes a study-area geometry that overlaps the window.',
  'Hay una coordenada publicada a 25 km o menos del centro de la ventana. Es una heurística de cercanía, no el perímetro del estudio.':
    'There is a published coordinate 25 km or less from the window center. It is a proximity heuristic, not the study perimeter.',
  'La fuente describe actividad análoga en la región de búsqueda sin coordenadas utilizables.': 'The source describes analog activity in the search region without usable coordinates.',
  'Transecto norte–sur de Atacama (24–28° S), con núcleo en Yungay': 'North–south Atacama transect (24–28° S), centered on Yungay',
  'Muestreo de suelos (1997–2003) para materia orgánica, bacterias cultivables y ADN recuperable; describe suelos tipo Marte en el área de Yungay y el límite seco de la vida microbiana.':
    'Soil sampling (1997–2003) for organic matter, culturable bacteria and recoverable DNA; it describes Mars-like soils in the Yungay area and the dry limit of microbial life.',
  'Coordenadas de muestreo publicadas al segundo de arco. El área de estudio es un transecto centrado en ~70° W entre 24° S y 28° S, no un punto.':
    'Sampling coordinates published to the arcsecond. The study area is a transect centered on ~70° W between 24° S and 28° S, not a point.',
  'Transecto norte–sur centrado en ~70° W entre 24° S y 28° S': 'North–south transect centered on ~70° W between 24° S and 28° S',
  'Lista 30 sitios con coordenadas; 17 dentro de la ventana de referencia de Yungay y 5 dentro de la región de búsqueda chilena.':
    'Lists 30 sites with coordinates; 17 inside the Yungay reference window and 5 inside the Chilean search region.',
  'Referencia bibliográfica; la página no mostró contenido sin cookies en esta revisión.': 'Bibliographic reference; the page showed no content without cookies in this review.',
  'Ensayos de rover «Life in the Atacama» (Hyperion 2003; Zoë 2004)': '“Life in the Atacama” rover trials (Hyperion 2003; Zoë 2004)',
  'Programa ASTEP de la NASA para probar detección de vida con un rover operado por un equipo científico remoto.':
    'NASA ASTEP program to test life detection with a rover operated by a remote science team.',
  'Desierto de Atacama, sin coordenadas en la fuente revisada. No prueba ocupación continua del polígono de Yungay ni de ninguna ventana.':
    'Atacama Desert, without coordinates in the reviewed source. It does not prove continuous occupation of the Yungay polygon or of any window.',
  'Desierto de Atacama (sin localización en la fuente revisada)': 'Atacama Desert (no location in the reviewed source)',
  'Describe la temporada 2004 y la fase 2003 con Hyperion; no da coordenadas.': 'Describes the 2004 season and the 2003 phase with Hyperion; gives no coordinates.',
  'Sitio descrito como más seco que Yungay, con bacterias viables en el perfil de suelo; propuesto como modelo análogo de Marte.':
    'Site described as drier than Yungay, with viable bacteria in the soil profile; proposed as a Mars analog model.',
  'Topónimo; el resumen revisado no da coordenadas. No se asume que coincida con la ventana «Pampa María Elena» del snapshot v2.':
    'Place name; the reviewed abstract gives no coordinates. It is not assumed to match the “Pampa María Elena” window of snapshot v2.',
  'Entorno de María Elena, fuera de las dos regiones de búsqueda': 'Around María Elena, outside the two search regions',
  'Resumen leído; sin coordenadas.': 'Abstract read; no coordinates.',
  'Puna catamarqueña, entorno de Antofagasta de la Sierra': 'Catamarca Puna, around Antofagasta de la Sierra',
  'Geología planetaria comparada: yardangs, megaóndulas y crestas eólicas transversales (TAR), volcanismo; salidas de campo y vuelos de dron.':
    'Comparative planetary geology: yardangs, megaripples and transverse aeolian ridges (TARs), volcanism; field trips and drone flights.',
  'Topónimos sin coordenadas en las fuentes revisadas: Campo de Piedra Pómez, Dunas Blancas, campo de megaóndulas, volcán Carachi Pampa con su salar y laguna, y el entorno de Antofagasta de la Sierra. No se asignan coordenadas a esos nombres.':
    'Place names without coordinates in the reviewed sources: Campo de Piedra Pómez, Dunas Blancas, a megaripple field, the Carachi Pampa volcano with its salt flat and lagoon, and the area around Antofagasta de la Sierra. No coordinates are assigned to those names.',
  'Puna Austral / puna catamarqueña (sin geometría publicada en las fuentes revisadas)': 'Southern Puna / Catamarca Puna (no geometry published in the reviewed sources)',
  'Nombra los sitios visitados y cita estudios previos del IDEAN (CONICET–UBA); no da coordenadas.': 'Names the visited sites and cites earlier IDEAN (CONICET–UBA) studies; gives no coordinates.',
  'Resumen parcial sobre megaóndulas y TAR; no da coordenadas.': 'Partial abstract on megaripples and TARs; gives no coordinates.',
  'Estación Yungay — primera campaña ARADS (2017)': 'Yungay Station — first ARADS campaign (2017)',
  'Prueba de un taladro de detección de vida y transferencia robótica de muestras del proyecto Atacama Rover Astrobiology Drilling Studies.':
    'Test of a life-detection drill and robotic sample transfer by the Atacama Rover Astrobiology Drilling Studies project.',
  'Topónimo (Yungay Station); la nota revisada no da coordenadas. Refuerza a Yungay como referencia conocida; no delimita un polígono.':
    'Place name (Yungay Station); the reviewed note gives no coordinates. It reinforces Yungay as the known reference; it does not delimit a polygon.',
  'Estación Yungay, núcleo hiperárido de Atacama': 'Yungay Station, hyperarid core of the Atacama',
  'El trabajo de la campaña fue principalmente en Yungay Station; sin coordenadas.': 'The campaign work was mainly at Yungay Station; no coordinates.',
  'Lagos andinos de altura (HAAL) como laboratorios de astrobiología': 'High-altitude Andean lakes (HAAL) as astrobiology laboratories',
  'Depósitos sedimentarios y comunidades microbianas de lagos de altura propuestos como análogos para geología planetaria y astrobiología.':
    'Sedimentary deposits and microbial communities of high-altitude lakes proposed as analogs for planetary geology and astrobiology.',
  'Topónimos (Laguna Negra, Laguna de Alumbrea) sin coordenadas en los resúmenes revisados. Su posición respecto de la región de búsqueda no se verificó, así que no se asocia a ninguna ventana.':
    'Place names (Laguna Negra, Laguna de Alumbrea) without coordinates in the reviewed abstracts. Their position relative to the search region was not verified, so they are not associated with any window.',
  'Lagos de altura de los Andes argentinos; ubicación no verificada en esta revisión': 'High-altitude lakes of the Argentine Andes; location not verified in this review',
  'Presenta los lagos andinos de altura como análogos; sin coordenadas en el resumen.': 'Presents high-altitude Andean lakes as analogs; no coordinates in the abstract.',
  'Describe un sitio análogo de Marte de gran altitud; sin coordenadas en el resumen.': 'Describes a high-altitude Mars analog site; no coordinates in the abstract.',
  'Enunciado del desafío; no es un antecedente de sitio.': 'Challenge statement; not a site precedent.',
  'Señalada por Codex como fuente con coordenadas de muestreo; no se pudo leer en esta revisión, así que no aporta coordenadas al catálogo.':
    'Flagged by Codex as a source with sampling coordinates; it could not be read in this review, so it adds no coordinates to the catalog.',
  'Región argentina: megaóndulas y geoformas eólicas de la Puna cerca de las ventanas preseleccionadas': 'Argentine region: megaripples and aeolian landforms of the Puna near the preselected windows',
  'La búsqueda identificó literatura revisada por pares sobre megaóndulas de la Puna como análogo de Marte (de Silva et al. 2013, GSA Bulletin, doi:10.1130/B30916.1; Bridges et al. 2015, Aeolian Research, doi:10.1016/j.aeolia.2015.01.007; un estudio de 2020 en Icarus sobre Campo de Piedra Pómez; Zimbelman et al. 2023, PSJ, doi:10.3847/PSJ/accdd9). No se obtuvieron coordenadas: los resultados no las muestran y el registro ADS pidió verificación humana, que no se intentó sortear. Los textos completos quedan sin revisar.':
    'The search identified peer-reviewed literature on Puna megaripples as a Mars analog (de Silva et al. 2013, GSA Bulletin, doi:10.1130/B30916.1; Bridges et al. 2015, Aeolian Research, doi:10.1016/j.aeolia.2015.01.007; a 2020 Icarus study on Campo de Piedra Pómez; Zimbelman et al. 2023, PSJ, doi:10.3847/PSJ/accdd9). No coordinates were obtained: the results do not show them and the ADS record asked for human verification, which was not circumvented. The full texts remain unreviewed.',
  'Región argentina: lagunas de altura y astrobiología cerca de las ventanas preseleccionadas': 'Argentine region: high-altitude lagoons and astrobiology near the preselected windows',
  'Hay estudios de extremófilos en Laguna Diamante (caldera del Galán) y resúmenes EPSC 2022 que presentan lagos andinos de altura como análogos (Laguna Negra, Laguna de Alumbrea). Ninguna fuente revisada da coordenadas ni permite afirmar que esos lagos estén dentro de una ventana preseleccionada. Queda pendiente verificarlo con cartografía y textos completos.':
    'There are extremophile studies at Laguna Diamante (Galán caldera) and EPSC 2022 abstracts presenting high-altitude Andean lakes as analogs (Laguna Negra, Laguna de Alumbrea). No reviewed source gives coordinates or supports stating that those lakes lie inside a preselected window. Verifying this with maps and full texts is still pending.',
  'Región chilena: sitios análogos con coordenadas cerca de las tres ventanas preseleccionadas (24,7–25,3° S; 69,4–69,8° O)': 'Chilean region: analog sites with coordinates near the three preselected windows (24.7–25.3° S; 69.4–69.8° W)',
  'No apareció una fuente con coordenadas dentro de las tres ventanas. Aparecieron antecedentes del desierto en general: ARADS en Yungay Station (2017), el sitio Red Stone al sur de Antofagasta (2023) y el proyecto Life in the Atacama. Esto no prueba que las ventanas carezcan de antecedentes: el transecto de Navarro-González et al. (2003) pasa a menos de 25 km de una de ellas y cruza la región.':
    'No source with coordinates inside the three windows appeared. Precedents for the desert in general appeared: ARADS at Yungay Station (2017), the Red Stone site south of Antofagasta (2023) and the Life in the Atacama project. This does not prove that the windows lack precedents: the Navarro-González et al. (2003) transect passes within 25 km of one of them and crosses the region.',

  // --- search results / analysis summary ------------------------------------------------------------------------
  'Experimento regional acotado del piloto Chile–Argentina. Las dos regiones son una selección de prueba, no una muestra representativa nacional ni regiones garantizadas inéditas.':
    'Bounded regional experiment of the Chile–Argentina pilot. The two regions are a test selection, not a nationally representative sample or regions guaranteed to be unexplored.',
  'prioridad topográfica': 'topographic priority',
  'prioridad topográfica descendente; empate por window_id': 'topographic priority, descending; ties broken by window_id',
  'Entorno regional de Jezero, Marte': 'Regional Jezero setting, Mars',
  'Contiene coordenadas de muestreo o un área de estudio publicadas; se conserva como antecedente, no como candidato.':
    'Contains published sampling coordinates or a published study area; kept as a precedent, not as a candidate.',
  'El país ya tiene 3 ventanas con mayor prioridad topográfica.': 'The country already has 3 windows with higher topographic priority.',
  'Centro a menos de 25 km de cl-win-s2500-w06970, que tiene mayor prioridad.': 'Center less than 25 km from cl-win-s2500-w06970, which has higher priority.',
  'Centro a menos de 25 km de ar-win-s2620-w06750, que tiene mayor prioridad.': 'Center less than 25 km from ar-win-s2620-w06750, which has higher priority.',
  'Preseleccionada por prioridad topográfica y separación mínima entre centros.': 'Preselected by topographic priority and minimum separation between centers.',
  'Rejilla de 50 ventanas → prioridad topográfica NASADEM vs MOLA → hasta 6 ventanas con Sentinel-2 L2A mensual y POWER; fórmulas y pesos v2. Yungay recalculado como referencia.':
    'Grid of 50 windows → NASADEM vs MOLA topographic priority → up to 6 windows with monthly Sentinel-2 L2A and POWER; v2 formulas and weights. Yungay recalculated as the reference.',
  'numerosas trazas lineales y una red sinuosa y ramificada de tono claro en el noreste': 'numerous linear traces and a sinuous, branching light-toned network in the northeast',
  'relieve con abanicos, una franja clara ancha y sinuosa que cruza la ventana y trazas lineales': 'relief with fans, a wide, sinuous light-toned strip crossing the window, and linear traces',
  'trazas rectilíneas y concentraciones geométricas de tono claro en el norte': 'straight traces and geometric light-toned concentrations in the north',
  'campos oscuros en el centro y el este y una franja verde u oscura en el borde noreste': 'dark fields in the center and east and a green or dark strip on the northeast edge',
  'una concentración densa de estructuras claras en el sur con una franja verde u oscura adyacente, compatible con intervención humana a contrastar':
    'a dense concentration of light-toned structures in the south with an adjacent green or dark strip, consistent with human intervention to be checked',
  'franjas verdes u oscuras ramificadas en el norte y el oeste': 'branching green or dark strips in the north and west',
  'trazas rectilíneas y un conjunto de parches brillantes de contorno rectangular en el sureste': 'straight traces and a group of bright, rectangular-outlined patches in the southeast',

  // --- visual-context-v3 ----------------------------------------------------------------------------------------
  'OAuth2 client credentials; credenciales y token omitidos': 'OAuth2 client credentials; credentials and token omitted',
  'Contiene datos modificados de Copernicus Sentinel (2025), procesados con Sentinel Hub en Copernicus Data Space Ecosystem.':
    'Contains modified Copernicus Sentinel data (2025), processed with Sentinel Hub in the Copernicus Data Space Ecosystem.',
  'Mosaico de diciembre de 2025': 'December 2025 mosaic',
  'ORBIT con orden leastCC; por píxel, primera órbita con datos': 'ORBIT with leastCC ordering; per pixel, the first orbit with data',
  'RGB = reflectancia L2A × 2, recortada a [0, 1] y cuantizada a 8 bits; alfa 0 donde ninguna órbita tiene datos': 'RGB = L2A reflectance × 2, clipped to [0, 1] and quantized to 8 bits; alpha 0 where no orbit has data',
  'PNG RGBA de 8 bits, tal como lo devolvió el servicio': '8-bit RGBA PNG, as returned by the service',
  'Contexto visual preliminar: apoya la inspección; no valida el sitio ni cierra advertencias, restricciones territoriales o revisión experta.':
    'Preliminary visual context: it supports inspection; it does not validate the site or close warnings, territorial constraints or expert review.',
  'Es un mosaico de diciembre de 2025 (2025-12-01 a 2026-01-01 UTC), no una fecha única ni una imagen actual.': 'It is a December 2025 mosaic (2025-12-01 to 2026-01-01 UTC), not a single date or a current image.',
  'El límite de nubosidad (40 %) se aplica por escena, no por píxel: la vista puede contener nubes, sombras o bruma.': 'The cloud limit (40%) is applied per scene, not per pixel: the view may contain clouds, shadows or haze.',
  'Vista reducida: cada píxel cubre unos 29 m; las bandas B02–B04 son de 10 m en origen. No muestra obstáculos ni pendientes a escala de rover.':
    'Reduced view: each pixel covers about 29 m; bands B02–B04 are 10 m at source. It does not show obstacles or slopes at rover scale.',
  'Color natural con realce lineal simple; no es reflectancia calibrada para análisis ni indica composición mineral.': 'Natural color with a simple linear stretch; it is not calibrated reflectance for analysis and does not indicate mineral composition.',
  'La imagen no participa en similitud, confianza, estabilidad ni factibilidad.': 'The image takes no part in similarity, confidence, stability or feasibility.',

  // --- geology-context-v1 (editorial and processing text; unit names/descriptions are in geologyGloss.ts) ---------
  'Validez y reparación en lon/lat (CRS84); recorte y superposición en el plano EPSG:6933 (aristas rectas en ese plano)':
    'Validity and repair in lon/lat (CRS84); clipping and overlay in the EPSG:6933 plane (straight edges in that plane)',
  'Umbrales de ingeniería provisionales aprobados por Codex; no son un estándar científico.': 'Provisional engineering thresholds approved by Codex; they are not a scientific standard.',
  'Geología Base (distribuida por MMA)': 'Geología Base (distributed by MMA)',
  'Catálogo CKAN del MMA (campo license_id de package_show, leído en la adquisición)': 'MMA CKAN catalog (license_id field of package_show, read at acquisition)',
  'Declarada para el conjunto «geologia-base» distribuido por el MMA.': 'Declared for the “geologia-base” dataset distributed by the MMA.',
  'SERNAGEOMIN, distribuido por el Ministerio del Medio Ambiente de Chile.': 'SERNAGEOMIN, distributed by the Ministry of the Environment of Chile (Ministerio del Medio Ambiente).',
  'El catálogo no declara la fecha del levantamiento geológico; catalog_modified_at es solo la fecha de actualización del registro del catálogo.':
    'The catalog does not declare the date of the geological survey; catalog_modified_at is only the update date of the catalog record.',
  'Se inspeccionó el contenido real de los ZIP de CKAN: el recurso rotulado «SHP» (id b4196bd6-a094-4f1e-914e-118f07df9983) contenía GeoJSON y fue el usado. Los rótulos del catálogo no se dan por ciertos.':
    'The actual content of the CKAN ZIP files was inspected: the resource labeled “SHP” (id b4196bd6-a094-4f1e-914e-118f07df9983) contained GeoJSON and was the one used. Catalog labels are not taken as true.',
  'Validez y reparación se evalúan sobre las coordenadas originales lon/lat; luego los vértices se proyectan a EPSG:6933 (equivalente) y el recorte contra la geometría exacta del sector, la disolución y los solapes se hacen en ese plano, con aristas rectas en él (no es una integral geodésica exacta).':
    'Validity and repair are evaluated on the original lon/lat coordinates; then the vertices are projected to EPSG:6933 (equal-area), and clipping against the exact sector geometry, dissolving and overlaps are done in that plane, with straight edges in it (not an exact geodesic integral).',
  'Entidades agrupadas por la identidad de fuente indicada; sus partes se disuelven, de modo que duplicados no suman área.':
    'Features are grouped by the stated source identity; their parts are dissolved, so duplicates do not add area.',
  'Solape entre unidades distintas se informa como ambigüedad; no se reparte ni se normaliza a 100 %.':
    'Overlap between different units is reported as ambiguity; it is not split or normalized to 100%.',
  'Geometrías inválidas: make_valid contrastada con buffer(0); se rechaza la entidad si el área total original no es positiva y finita, si el área total reparada cambia más de 0,1 %, si alguno de los métodos no da polígonos válidos o si su diferencia simétrica recortada supera 0,1 % de la entidad o 0,05 % del sector. Una entidad rechazada resta su bbox∩sector de todas las unidades como cota superior de zona no utilizable.':
    'Invalid geometries: make_valid checked against buffer(0); the feature is rejected if its original total area is not positive and finite, if the repaired total area changes by more than 0.1%, if either method does not yield valid polygons, or if their clipped symmetric difference exceeds 0.1% of the feature or 0.05% of the sector. A rejected feature subtracts its bbox∩sector from all units as an upper bound of unusable area.',
  'Propiedades originales conservadas sin traducir ni clasificar; ningún campo vacío se completa.': 'Original properties kept without translation or classification; no empty field is filled in.',
  'Escala 1:1.000.000: unidades generalizadas; una unidad cartografiada puede incluir otras no representables.': 'Scale 1:1,000,000: generalized units; a mapped unit may include others that cannot be represented.',
  'Fecha del levantamiento desconocida (null); no se usa la fecha del catálogo como fecha del mapa.': 'Survey date unknown (null); the catalog date is not used as the map date.',
  'El archivo nacional trae entidades con geometría nula; no se atribuyen a ningún sector.': 'The national file includes features with null geometry; they are not attributed to any sector.',
  'Página de geoservicios de SIGAM/SEGEMAR': 'SIGAM/SEGEMAR geoservices page',
  'Declaración general de la página de geoservicios; no se verificó una licencia específica de la capa.': 'General statement on the geoservices page; no layer-specific license was verified.',
  'SEGEMAR / SIGAM, capa sigam:e250K_UnidadGeologica (CC BY 4.0 declarada por SIGAM).': 'SEGEMAR / SIGAM, layer sigam:e250K_UnidadGeologica (CC BY 4.0 as declared by SIGAM).',
  'Creative Commons Attribution 4.0 (CC BY 4.0), según lo declarado por SIGAM': 'Creative Commons Attribution 4.0 (CC BY 4.0), as declared by SIGAM',
  'El servicio no declara la fecha del levantamiento; cada hoja tiene su propia publicación que debe consultarse.': 'The service does not declare the survey date; each sheet has its own publication, which must be consulted.',
  'WFS 1.0.0 GetFeature en https://sigam.segemar.gov.ar/geoserver217/ows, GeoJSON, srsName EPSG:4326 explícito, una petición por sector con su bbox exacta; las respuestas se verificaron íntegras (numberMatched = numberReturned, sin alcanzar el límite).':
    'WFS 1.0.0 GetFeature at https://sigam.segemar.gov.ar/geoserver217/ows, GeoJSON, explicit srsName EPSG:4326, one request per sector with its exact bbox; responses were verified complete (numberMatched = numberReturned, without reaching the limit).',
  'BBOX devuelve polígonos completos que pueden extenderse fuera de la consulta; se recortan al sector.': 'BBOX returns whole polygons that may extend beyond the query; they are clipped to the sector.',
  'Escala 1:250.000, pero la capa no cubre todo el territorio: un sector puede quedar sin cobertura en esta capa.': 'Scale 1:250,000, but the layer does not cover the whole territory: a sector may have no coverage in this layer.',
  'Fecha del levantamiento desconocida (null); la edad por hoja requiere consultar su publicación.': 'Survey date unknown (null); the age of each sheet requires consulting its publication.',
  'Muchos campos de la capa vienen vacíos y se conservan vacíos.': 'Many fields of the layer are empty and are kept empty.',
  'make_valid (aceptación condicionada a contraste con buffer(0))': 'make_valid (acceptance conditional on a check against buffer(0))',
  '¿Qué unidades afloran realmente en el sector? Este mapa es regional (1:1.000.000): contrastar con la cartografía de detalle disponible y con observación en terreno.':
    'Which units actually crop out in the sector? This map is regional (1:1,000,000): compare it with the detailed mapping available and with field observation.',
  '¿Qué unidades afloran realmente en el sector? Este mapa es regional (1:250.000): contrastar con la cartografía de detalle disponible y con observación en terreno.':
    'Which units actually crop out in the sector? This map is regional (1:250,000): compare it with the detailed mapping available and with field observation.',
  '¿Qué hay en la parte sin polígono? La ausencia de cobertura en esta capa no indica ausencia de geología.': 'What is in the part without a polygon? Lack of coverage in this layer does not indicate lack of geology.',
  '¿Cuál de las unidades que se solapan rige? Consultar la fuente oficial para resolver la ambigüedad.': 'Which of the overlapping units applies? Consult the official source to resolve the ambiguity.',
  'Esta capa no cubre el sector: ¿existe cartografía oficial más detallada o de otro proveedor?': 'This layer does not cover the sector: is there more detailed official mapping, or mapping from another provider?',
  'Cartografía regional: describe qué unidades están cartografiadas, no qué material aflora ni su estado superficial.': 'Regional mapping: it describes which units are mapped, not which material crops out or its surface condition.',
  'Cobertura del mapa no es precisión, confianza, aptitud ni verificación de campo; 100 % cubierto no significa 100 % acertado.':
    'Map coverage is not precision, confidence, suitability or field verification; 100% covered does not mean 100% correct.',
  'Una fracción sin cobertura significa que esta capa no tiene polígono allí; no implica ausencia de geología ni descarta el sector.':
    'An unmapped fraction means this layer has no polygon there; it does not imply lack of geology or rule out the sector.',
  'No se mezclan escalas: no se rellenan huecos con capas más generales (1:1.000.000 o 1:2.500.000).': 'Scales are not mixed: gaps are not filled with more general layers (1:1,000,000 or 1:2,500,000).',
  'No se infieren tracción, granulometría, resistencia, composición química ni compatibilidad planetaria calibrada.':
    'Traction, grain size, strength, chemical composition and calibrated planetary compatibility are not inferred.',
  'El score del snapshot mantiene «Geología sin calibrar»: este paquete no lo modifica.': 'The snapshot score keeps “Geology not calibrated”: this package does not change it.',
  'Umbrales de reparación y de estado son criterios de ingeniería provisionales, no estándares científicos.': 'Repair and status thresholds are provisional engineering criteria, not scientific standards.',
  'Las áreas se miden con aristas rectas en el plano equivalente EPSG:6933 tras proyectar los vértices; no son mediciones geodésicas exactas.':
    'Areas are measured with straight edges in the EPSG:6933 equal-area plane after projecting the vertices; they are not exact geodesic measurements.',
  'Las preguntas de verificación son orientación editorial para preparar el reconocimiento, no mediciones ni resultados de campo.':
    'The verification questions are editorial guidance to prepare reconnaissance, not measurements or field results.',

  // --- basemaps -------------------------------------------------------------------------------------------------
  'Contexto visual del mapa 2D. No entra al score.': 'Visual context for the 2D map. Not part of the score.',
  'Web Mercator por filas (EPSG:3857), bounds en grados WGS84': 'Web Mercator by rows (EPSG:3857), bounds in WGS84 degrees',
  'Imágenes NASA GIBS: uso libre con atribución. HLS incluye datos Copernicus Sentinel-2 modificados.': 'NASA GIBS imagery: free use with attribution. HLS includes modified Copernicus Sentinel-2 data.',
  'NASA Blue Marble: Next Generation (MODIS, 2004) vía NASA GIBS · mundo de respaldo sin conexión': 'NASA Blue Marble: Next Generation (MODIS, 2004) via NASA GIBS · offline fallback world',
  'NASA Blue Marble: Next Generation (MODIS, 2004) vía NASA GIBS': 'NASA Blue Marble: Next Generation (MODIS, 2004) via NASA GIBS',
  'NASA HLS S30/L30 v2.0 · mediana de 14 fechas 2025 vía NASA GIBS': 'NASA HLS S30/L30 v2.0 · median of 14 dates in 2025 via NASA GIBS',
  'Norte de Chile': 'Northern Chile',
  'Pampa Yungay — sector de screening': 'Pampa Yungay — screening sector',
  'Pampa María Elena — sector de screening': 'Pampa María Elena — screening sector',
  'Cordón de Domeyko — sector interior': 'Cordón de Domeyko — interior sector',
  'Recompresión WebP con pérdida (calidad 82) del PNG original, mismas dimensiones y bbox': 'Lossy WebP recompression (quality 82) of the original PNG, same dimensions and bbox',

  // --- reference analogs (config/reference_analogs.json) --------------------------------------------------------
  'Desierto de Atacama · Yungay': 'Atacama Desert · Yungay',
  'Isla Devon · cráter Haughton': 'Devon Island · Haughton crater',
  'Islandia · Holuhraun': 'Iceland · Holuhraun',
  'Valles Secos de McMurdo': 'McMurdo Dry Valleys',
  'Río Tinto · nacimiento': 'Río Tinto · headwaters',
  'Svalbard · volcán Sverrefjell': 'Svalbard · Sverrefjell volcano',
  'Canadá': 'Canada',
  'Islandia': 'Iceland',
  'EE. UU.': 'USA',
  'Antártida': 'Antarctica',
  'España': 'Spain',
  'Noruega': 'Norway',
  'GPS citado; zona de 10 × 10 km.': 'GPS cited; 10 × 10 km area.',
  'Centro citado; zona de 30 × 30 km.': 'Center cited; 30 × 30 km area.',
  'Campo de lava de 83,5 km².': 'Lava field of 83.5 km².',
  'Citado «aprox. 77° S, 161° E».': 'Cited as “approx. 77° S, 161° E”.',
  'Afloramiento de unos 4 km.': 'Outcrop of about 4 km.',
  'Junto al nacimiento del río.': 'Next to the river headwaters.',
  'Zona AMASE de 3 × 3 km.': 'AMASE area of 3 × 3 km.',
  'Navarro-González y McKay (2011)': 'Navarro-González and McKay (2011)',
}

const SITE_NAME = /^(.+) · (\d+),(\d+)° S, (\d+),(\d+)° O$/
const SCALE_NOTE_MARK = ' Snapshot explanation (original source text, Spanish): '
const SPANISH_HINT = /[áéíóúñ¿¡«»]|\b(de|del|los|las|para|con|sin|por|que|una?|es|y|la|el|en)\b/i

/**
 * Coverage-test heuristic ONLY: selects artifact strings that must have an entry. It is never used at runtime to
 * decide or label the language of displayed text (English and user-authored text must never be marked Spanish).
 */
export const looksSpanish = (text: string): boolean => SPANISH_HINT.test(text) && !/^https?:\/\//.test(text)

/**
 * English rendering of an artifact string, or null when there is none. Handles exact entries, generated site
 * names (coordinates get an English decimal point and W for “O”) and the mixed 1.1.0 snapshot scale note.
 */
export function sourceTextEn(original: string): string | null {
  if (Object.prototype.hasOwnProperty.call(SOURCE_TEXT_EN, original)) return SOURCE_TEXT_EN[original]
  if (KEEP_ORIGINAL.has(original)) return original
  const name = SITE_NAME.exec(original)
  if (name) return `${sourceTextEn(name[1]) ?? name[1]} · ${name[2]}.${name[3]}° S, ${name[4]}.${name[5]}° W`
  // “Place · detail” labels: each part is rendered on its own (kept names stay, codes pass through).
  if (original.includes(' · ')) {
    const parts = original.split(' · ')
    // A part without an entry may stay only if it is a single token (a code or short label such as “B”).
    const rendered = parts.map((part) => sourceTextEn(part) ?? (/^\S+$/.test(part) ? part : null))
    if (rendered.every((part): part is string => part !== null)) return rendered.join(' · ')
  }
  const at = original.indexOf(SCALE_NOTE_MARK)
  if (at >= 0) {
    const tail = original.slice(at + SCALE_NOTE_MARK.length)
    const en = sourceTextEn(tail)
    return en === null ? null : `${original.slice(0, at)} Snapshot explanation (English translation of the Spanish source): ${en}`
  }
  return null
}

/**
 * Display text for an artifact string: the English rendering when one exists, otherwise the original unchanged.
 * No language is inferred; the coverage test guarantees an entry for every exposed Spanish string of the active data.
 */
export function displaySource(original: string): string {
  return sourceTextEn(original) ?? original
}

export const displaySources = (items: readonly string[]): string[] => items.map(displaySource)

/**
 * Display text of a verification item. Only snapshot field checks (`<site_id>|fc|<index>`, copied from the artifact)
 * are source text and go through the translation layer; generated instructions (`<site_id>|req|<requirement_id>`)
 * are already English and embed user-authored labels, which must stay exactly as written.
 */
export function verificationDisplayText(item: { id: string; site_id: string; text: string }): string {
  return item.id.startsWith(`${item.site_id}|fc|`) && /^\d+$/.test(item.id.slice(item.site_id.length + 4)) ? displaySource(item.text) : item.text
}
