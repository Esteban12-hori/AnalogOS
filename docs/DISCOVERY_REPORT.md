# Reporte de búsqueda y antecedentes — piloto Chile–Argentina (v3)

Este reporte permite reconstruir por qué cada ventana fue evaluada, descartada o seleccionada. Los datos completos están en `artifacts/science-v3/search-results.json`; el catálogo de antecedentes, en `config/analog_precedents_v1.json`.

## Resumen

| Etapa | Resultado |
|---|---|
| Ventanas intentadas / con métricas válidas | 50 / 50 |
| Área explorada | ≈ 22.274 km² (25 ventanas de 442–449 km² por región) |
| Rechazadas por cobertura o agua | 0 |
| Excluidas por contener coordenadas de muestreo publicadas | 4 (todas en Chile) |
| Descartadas por cercanía a una ventana mejor | 2 |
| Elegibles fuera del cupo de 3 por país | 38 |
| Preseleccionadas y caracterizadas con todas las fuentes | 6 (3 por país) |
| Fallos de API o meses rechazados en la etapa 2 | 0 |

Es un experimento acotado en dos regiones de prueba. No es una búsqueda nacional ni global y no declara ninguna ventana como nueva.

## Reproducción

```bash
source .venv/bin/activate
python -m pipelines.fetch_discovery_data --stage tiles     # teselas NASADEM que falten (Earthdata)
python -m pipelines.discover_candidates                    # etapa 1: 50 ventanas y preselección
python -m pipelines.fetch_discovery_data --stage sources   # Sentinel-2, POWER y HLS de la preselección
python -m pipelines.build_context_outline                  # contornos Natural Earth de ambos países
python -m pipelines.build_discovery_snapshot               # snapshot v3 completo
python -m pipelines.fetch_visual_context --snapshot v3     # imágenes; reutiliza el paquete local sin red
```

Las etapas de descarga usan credenciales desde el entorno o `.env` y solo contra hosts oficiales. Todo lo ya obtenido se reutiliza; la caché está ligada a la petición exacta (bbox, periodo, producto y transformación).

## Resultado por país

Similitud, confianza y estabilidad con las fórmulas y pesos v2. Todos quedan en «requiere revisión».

| Rol | Ventana | Prioridad topográfica | Similitud | Confianza | Estabilidad |
|---|---|---:|---:|---:|---:|
| Candidato | `cl-win-s2500-w06970` · 25,0° S, 69,7° O | 98,01 | 94,87 | 77,45 | 99,33 |
| Candidato | `cl-win-s2480-w06950` · 24,8° S, 69,5° O | 96,16 | 91,87 | 77,45 | 99,03 |
| Candidato | `cl-win-s2520-w06950` · 25,2° S, 69,5° O | 93,58 | 90,35 | 77,36 | 99,08 |
| Candidato | `ar-win-s2620-w06750` · 26,2° S, 67,5° O | 86,07 | 63,85 | 77,00 | 95,88 |
| Candidato | `ar-win-s2640-w06730` · 26,4° S, 67,3° O | 64,53 | 53,68 | 77,25 | 96,81 |
| Candidato | `ar-win-s2580-w06710` · 25,8° S, 67,1° O | 59,26 | 49,43 | 77,40 | 96,81 |
| Referencia | `cl-pampa-yungay-screening` (fuera del ranking) | 66,40 | 75,67 | 77,45 | 99,03 |

Lectura correcta:

- Los candidatos chilenos puntúan más que Yungay porque su topografía a ~480 m se parece más a la del entorno de Jezero. Eso no los hace mejores sitios: Yungay tiene dos décadas de trabajo de campo y ellos, ninguna verificación.
- Los argentinos bajan sobre todo por el contexto climático: POWER da 562–767 mm/año. Ese valor es de una celda MERRA-2 de 0,5° × 0,625°, mayor que la ventana; no es lluvia medida en el sitio y necesita contraste local. No se ajustaron pesos ni valores.
- Dos candidatos chilenos (24,8° S y 25,2° S) tienen valores POWER coincidentes: posible celda compartida, no observaciones independientes.
- La confianza casi no distingue entre sitios porque usa calidades asignadas por tipo de fuente.

## Ventanas excluidas por antecedentes

| Ventana | Prioridad topográfica | Coordenadas publicadas que contiene |
|---|---:|---|
| `cl-win-s2500-w06990` | 97,15 | AT02-26, AT02-27 |
| `cl-win-s2480-w06970` | 96,45 | AT02-28 |
| `cl-win-s2540-w06990` | 90,49 | AT01-16 / AT02-16 |
| `cl-win-s2460-w06970` | 50,14 | AT02-29 |

Se conservan evaluadas y visibles en el mapa; no se ocultan para aparentar descubrimientos. Otras dos ventanas (`cl-win-s2520-w06970` y `ar-win-s2600-w06750`) quedaron fuera por estar a menos de 25 km de una seleccionada con mayor prioridad.

## Antecedentes revisados

Revisión documental del 2026-11-14, sin validación experta. Coordenadas solo cuando la fuente las imprime.

| Antecedente | Qué aporta | Precisión espacial |
|---|---|---|
| Navarro-González et al. (2003), Science 302, material suplementario | 30 sitios de muestreo en un transecto norte–sur centrado en ~70° O entre 24° S y 28° S; 17 caen en la ventana de Yungay y 5 en la región chilena de búsqueda | Coordenadas al segundo de arco; el área de estudio es un transecto, no un punto |
| NASA Astrobiology (2005), «Dry Signs of Life» | Ensayos de rover Hyperion (2003) y Zoë (2004) en Atacama | Sin coordenadas en la fuente |
| NASA Astrobiology (2017), campaña ARADS | Taladro de detección de vida en Yungay Station | Topónimo |
| Azua-Bustos et al. (2015), María Elena South | Sitio más seco que Yungay con bacterias viables | Topónimo; fuera de las regiones de búsqueda |
| UNCA (2025) y tesis CONICET (2021) | Puna catamarqueña como análogo: Campo de Piedra Pómez, Dunas Blancas, megaóndulas, volcán Carachi Pampa, entorno de Antofagasta de la Sierra | Topónimos sin coordenadas |
| Resúmenes EPSC 2022 (Laguna Negra, Laguna de Alumbrea) | Lagos andinos de altura como análogos para astrobiología | Topónimos; posición respecto de las ventanas no verificada |

Relación con los seis candidatos:

- Los tres chilenos están en una región con antecedentes (transecto y ensayos de rover). Uno (`cl-win-s2500-w06970`) tiene una coordenada publicada a 20,4 km de su centro; esa cercanía es una heurística, no el perímetro del estudio.
- Los tres argentinos están en la Puna catamarqueña, descrita como análogo en las fuentes revisadas. No se asignaron coordenadas a los topónimos, así que no se sabe si alguna ventana contiene uno de esos sitios.
- Estado de los seis: `regional_precedent`. Ninguno es `no_match_in_reviewed_sources`.

## Búsquedas dirigidas

| Alcance | Hallazgo |
|---|---|
| Megaóndulas de la Puna cerca de las ventanas argentinas | Hay literatura revisada por pares (de Silva et al. 2013; Bridges et al. 2015; un estudio de 2020 en Icarus sobre Campo de Piedra Pómez; Zimbelman et al. 2023). No se obtuvieron coordenadas; los textos completos quedan sin revisar |
| Lagunas de altura y astrobiología | Estudios de extremófilos en Laguna Diamante (caldera del Galán) y resúmenes EPSC 2022. Ninguna fuente revisada permite ubicar esos lagos dentro de una ventana |
| Sitios análogos con coordenadas cerca de las ventanas chilenas | No apareció una fuente con coordenadas dentro de las tres ventanas; sí antecedentes generales del desierto (ARADS, Red Stone, Life in the Atacama) |

Lo que falta: leer los textos completos de la literatura de la Puna, cruzar los topónimos argentinos con cartografía oficial y revisar el artículo de 2010 en JGR que Codex señaló, que no se pudo abrir.

## Observaciones visuales preliminares

Hechas por Codex y Claude sobre los mosaicos Sentinel-2 de diciembre de 2025 (`artifacts/visual-context-v3/`). Describen apariencia: no identifican instalaciones, propietarios ni permisos, no cambian ningún score y no producen exclusiones.

| Ventana | Observación |
|---|---|
| `cl-win-s2500-w06970` | Numerosas trazas lineales y una red sinuosa y ramificada de tono claro en el noreste |
| `cl-win-s2480-w06950` | Relieve con abanicos, una franja clara ancha y sinuosa que cruza la ventana y trazas lineales |
| `cl-win-s2520-w06950` | Trazas rectilíneas y concentraciones geométricas de tono claro en el norte |
| `ar-win-s2620-w06750` | Campos oscuros en el centro y el este y una franja verde u oscura en el borde noreste |
| `ar-win-s2640-w06730` | Concentración densa de estructuras claras en el sur con una franja verde u oscura adyacente, compatible con intervención humana a contrastar |
| `ar-win-s2580-w06710` | Franjas verdes u oscuras ramificadas en el norte y el oeste |

Una ventana de ~440 km² no es un terreno íntegramente libre ni apto. Todas necesitan cruce con capas territoriales oficiales.

## Datos crudos no versionados

En `data/raw/` (ignorado por Git): siete teselas NASADEM nuevas (~102 MB), `copernicus/sentinel2_stats_2025_v3.json`, `power/climatology_points_v3.json`, `earthdata/cmr_inventory_v3.json`, `discovery/acquisition_v3.json` (horas reales de adquisición) y `naturalearth/world-atlas-2.0.2-countries-50m.json`. El manifiesto v3 guarda sus checksums y horas.
