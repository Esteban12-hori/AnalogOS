# Datos y modelo de puntuación

## Fuentes P0

| Necesidad | Fuente prioritaria | Uso |
|---|---|---|
| Topografía terrestre | NASA Earthdata NASADEM_HGT.001 | elevación, pendiente, rugosidad, relieve local y máscara de agua |
| Superficie | Copernicus Sentinel-2 L2A | SCL clase 5, NDVI, BSI, vegetación y agua mensual |
| Validación de disponibilidad | NASA HLS S30 v2.0 / CMR | inventario independiente; no entra al score v2/v3 |
| Clima regional | NASA POWER | aridez y contexto; no precisión local |
| Temperatura superficial | MODIS LST | opcional si el periodo y calidad son defendibles |
| Geología | SERNAGEOMIN (Chile) / SEGEMAR (Argentina) | pendiente de integración y calibración; no puntúa |
| Restricciones | IDE Chile / IDERA (Argentina) | cruce oficial pendiente; no se infiere permiso ni ausencia de restricciones |
| Marte | NASA PDS MOLA | firma planetaria topográfica |

## Manifiesto obligatorio

Cada dataset debe registrar:

- proveedor y producto;
- URL de landing y acceso;
- colección/versión;
- fecha de descarga;
- periodo temporal;
- resolución espacial y temporal;
- CRS y unidades;
- licencia/atribución;
- checksum;
- valores NoData y banderas de calidad;
- transformaciones;
- limitaciones conocidas.

## Unidad de análisis

- Screening nacional: grilla aproximada de 5 km o la más gruesa que permita terminar.
- Refinamiento: top 3–5 regiones con productos de 30–250 m según disponibilidad.
- No interpolar una fuente climática gruesa para afirmar diferencias locales.
- Las áreas y distancias se calculan en una proyección apropiada, no en grados.

## Corte v2 implementado

- NASADEM se mosaica antes del recorte; Yungay requiere cuatro tiles.
- La comparación topográfica conserva bloques 16×16 (~473–476 m).
- Sentinel-2 usa 12 mosaicos mensuales de 2025 a ~30 m, orden `leastCC` y `maxCloudCoverage=40`.
- Son válidas las clases SCL 2, 4, 5 y 6. Nubes, cirrus, sombras, saturado, no clasificado, nieve y NoData quedan enmascarados.
- La fracción no vegetada es la media espacial de SCL 5 por mes y luego la mediana de los 12 meses.
- Su calidad máxima es 0,90 y disminuye por cobertura o intervalos faltantes.
- HLS se consulta para demostrar disponibilidad NASA independiente, pero no se promedian sus píxeles con Sentinel-2.

## Función por criterio

Cada criterio produce `s_i` entre 0 y 1 y debe declarar el método:

- rango ideal con tolerancias;
- distancia a distribución de referencia;
- compatibilidad categórica;
- restricción dura.

No se permiten rangos inventados. Una variable sin calibración queda con `status: needs_calibration` y fuera del score final hasta ser aprobada.

## Similitud agregada

```text
S = 100 × exp(Σ w_i × ln(max(s_i, ε)))
```

- `w_i ≥ 0` y la suma es 1.
- `ε = 0.01` por defecto y debe quedar versionado.
- Se calcula solo con criterios habilitados y calibrados.
- Si el peso válido disponible es menor que `0.70`, el candidato queda `insufficient_data`.
- Si hay criterios faltantes pero se supera 0.70, se renormalizan pesos disponibles y la confianza recibe la penalización.

## Confianza

```text
C = 100 × Σ w_i × q_i
```

`q_i` combina, con reglas explícitas:

- cobertura válida;
- adecuación de resolución;
- actualidad/periodo;
- calidad del proveedor;
- coherencia entre fuentes;
- complejidad de transformación.

Datos ausentes no equivalen automáticamente a similitud cero.

## Restricciones

Una restricción tiene una autoridad, una fuente y una acción:

- `exclude`: no puede ser candidato;
- `warn`: permanece con advertencia;
- `review`: requiere revisión humana.

P0 considera al menos cuerpos de agua, zonas urbanas, superficie mínima, pendiente incompatible y áreas sensibles cuando exista fuente defendible.

## Candidatos

1. Aplicar restricciones.
2. Calcular similitud y confianza.
3. Seleccionar celdas sobre el umbral versionado.
4. Agrupar celdas contiguas.
5. Eliminar áreas demasiado pequeñas.
6. Generalizar geometría para la escala real.
7. Calcular estadísticas del polígono.
8. Rankear y conservar razones de exclusión.

## Sensibilidad

Perturbar pesos ±20 %, renormalizar y registrar:

- frecuencia en top 3;
- cambio de posición promedio;
- criterio responsable de mayor inestabilidad.

## Tests mínimos

- pesos suman 1;
- score conocido para un caso sintético;
- epsilon evita logaritmo de cero;
- criterio muy bajo penaliza media geométrica;
- faltantes reducen confianza;
- peso válido bajo 0.70 produce `insufficient_data`;
- ranking estable ante empate;
- restricciones excluyen con razón trazable;
- score y confianza no se mezclan.

## Corte v3 implementado

- Configuración: `config/discovery_search_v3.json` (regiones, umbrales, límites) y `config/analog_precedents_v1.json` (antecedentes).
- Etapa 1 (`pipelines.discover_candidates`): métricas NASADEM de 50 ventanas con el código v2; rechazo por cobertura < 95 %, agua > 5 %, fallo de datos o coordenadas publicadas; prioridad topográfica con pesos relativos 0,20/0,20/0,15; hasta 3 ventanas por país con centros a ≥ 25 km.
- Etapa 2 (`pipelines.fetch_discovery_data --stage sources` y `pipelines.build_discovery_snapshot`): Sentinel-2, POWER e inventario HLS solo para la preselección; mismas fórmulas, pesos y mínimo de 0,70 de peso válido.
- La prioridad topográfica no es un score ni una confianza y no relaja el mínimo del score multifuente.
- Calidad: completitud Sentinel-2 contra los 12 meses configurados; calidad topográfica × cobertura NASADEM válida; POWER validado contra unidades, relleno y rangos. Ninguno de estos cambios altera los valores v2.
- Caché: cada dato crudo guarda la huella de su petición (bbox, periodo, producto, transformación). El build falla si un dato pertenece a otra petición.
- Contratos: `candidate-site` admite `cl-`/`ar-` y exige en v3 `country`, `role`, `discovery` y `literature_review`; nuevos `discovery-search` y `precedent-catalog`.
- Una búsqueda sin preselección produce un snapshot con solo la referencia y sin datasets de etapa 2.
