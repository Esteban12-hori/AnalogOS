# Resultados y lectura correcta

## Búsqueda del piloto (`science-screening-v3`)

| Etapa | Resultado |
|---|---|
| Regiones de prueba | Interior de Antofagasta (Chile) y Puna de Catamarca y Salta (Argentina) |
| Ventanas de 0,2° evaluadas | 50 de 50 (≈ 22.274 km²) |
| Excluidas por contener coordenadas de muestreo publicadas | 4 |
| Descartadas por cercanía a una ventana mejor | 2 |
| Preseleccionadas y caracterizadas con todas las fuentes | 6 (3 por país) |

## Ranking de candidatos

| Rank | Candidato | Similitud | Confianza | Estabilidad | Estado |
|---:|---|---:|---:|---:|---|
| 1 | Interior de Antofagasta · 25,0° S, 69,7° O | 94,87 | 77,45 | 99,33 | requiere revisión |
| 2 | Interior de Antofagasta · 24,8° S, 69,5° O | 91,87 | 77,45 | 99,03 | requiere revisión |
| 3 | Interior de Antofagasta · 25,2° S, 69,5° O | 90,35 | 77,36 | 99,08 | requiere revisión |
| 4 | Puna de Catamarca y Salta · 26,2° S, 67,5° O | 63,85 | 77,00 | 95,88 | requiere revisión |
| 5 | Puna de Catamarca y Salta · 26,4° S, 67,3° O | 53,68 | 77,25 | 96,81 | requiere revisión |
| 6 | Puna de Catamarca y Salta · 25,8° S, 67,1° O | 49,43 | 77,40 | 96,81 | requiere revisión |

Referencia conocida, fuera del ranking: Pampa Yungay, 75,67 / 77,45 / 99,03, idéntica al snapshot v2.

La estabilidad mide solo el peor cambio del score al perturbar un peso por vez ±20 %. No cubre incertidumbre de datos, perfiles alternativos ni perturbaciones simultáneas.

## Por qué el orden es el que es

| Variable | MOLA Jezero | Candidato 1 (Chile) | Candidato 4 (Argentina) | Yungay (referencia) |
|---|---:|---:|---:|---:|
| Pendiente mediana | 2,226° | 2,169° | 2,568° | 3,207° |
| Diferencia vecina mediana | 11,0 m | 11,291 m | 12,654 m | 16,564 m |
| Relieve local 3×3 mediano | 47,0 m | 46,797 m | 55,867 m | 75,125 m |
| Superficie no vegetada | requisito terrestre | 100,0 % | 99,4 % | 100,0 % |
| Precipitación de contexto (POWER) | no aplica | 10,96 mm/año | 588,05 mm/año | 7,30 mm/año |

- Los candidatos chilenos superan a Yungay porque su topografía a ~480 m se parece más a la del entorno de Jezero.
- El mejor candidato argentino tiene topografía comparable a la de los chilenos, pero el contexto climático POWER le asigna 588 mm/año. Ese valor es de una celda MERRA-2 de 0,5° × 0,625°, mayor que la ventana: no es lluvia medida en el sitio y requiere contraste local. No se ajustaron pesos ni valores para compensarlo.
- Dos candidatos chilenos tienen valores POWER coincidentes: posible celda compartida, no observaciones independientes.

## Qué no demuestra el resultado

- No hay análogos nuevos confirmados. Ambas regiones tienen antecedentes publicados y el catálogo revisado es incompleto.
- No demuestra que un candidato sea mejor sitio que Yungay, que tiene dos décadas de trabajo de campo.
- No evalúa obstáculos, granulometría o tracción a escala de rueda.
- No reproduce gravedad, atmósfera, presión, radiación o química marcianas.
- No evalúa propiedad, permisos, accesos, seguridad o impacto ambiental en ninguno de los dos países.
- No completa relevancia geológica ni composición o mecánica de suelo.
- Una ventana de ~440 km² no es un terreno íntegramente libre ni apto: las imágenes muestran trazas lineales y estructuras que deben contrastarse con cartografía oficial.
- No es una búsqueda nacional ni global: son dos regiones de prueba.

El detalle de cada ventana, los antecedentes y las búsquedas bibliográficas están en `docs/DISCOVERY_REPORT.md`. El ranking histórico del snapshot v2 (Yungay, Domeyko, María Elena) se conserva en `artifacts/science-v2/`.
