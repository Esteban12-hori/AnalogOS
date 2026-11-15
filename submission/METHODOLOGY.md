# Metodología reproducible

## Perfil

Objetivo P0: priorizar sectores para investigar pruebas terrestres de percepción, tracción, navegación y autonomía de rover. La salida no evalúa un sitio de base permanente ni autoriza una campaña.

## Referencia planetaria

- Producto: MGS MOLA MEGDR `MEGT44N000HB`.
- Archivo: 128 píxeles/grado, enteros big-endian de 16 bits.
- Ventana: centro 18,38° N, 77,58° E; 1,6° × 1,6° alrededor del entorno regional de Jezero.
- Escala nominal usada: ~451 m promedio entre el tamaño latitudinal y longitudinal de celda.

Métricas derivadas:

- mediana de pendiente: 2,226°;
- diferencia absoluta mediana entre celdas vecinas: 11,0 m;
- relieve local mediano en ventana 3×3: 47,0 m.

## Terreno terrestre v2

- Producto: NASADEM_HGT.001 de NASA LP DAAC, descargado con Earthdata Login.
- Ventanas: 0,2° × 0,2° centradas en cada sector.
- Transformación: mosaico de todos los tiles intersectados, recorte y media de bloques 16×16 antes de derivar métricas.
- Escala de análisis resultante: ~473–476 m según latitud.

Yungay cruza cuatro tiles. El mosaico previo al recorte corrige el truncamiento de borde presente en v1. La máscara SWB de NASADEM se usa para screening de agua permanente.

La similitud de cada variable topográfica es la razón entre el menor y el mayor de los valores Tierra/Marte:

```text
s = min(valor_tierra, valor_marte) / max(valor_tierra, valor_marte)
```

Esto entrega 1 cuando las métricas coinciden y decrece de forma simétrica para valores mayores o menores. Es una métrica de screening, no una distribución de error físico.

## Superficie Sentinel-2

- Producto: Copernicus Sentinel-2 L2A mediante Statistical API.
- Periodo: doce intervalos mensuales, enero–diciembre de 2025.
- Resolución solicitada: 0,0003° (~30 m nominal).
- Mosaico: menor nubosidad, con máximo 40 % de nube por escena.
- Máscara válida: SCL 2, 4, 5 y 6; se excluyen NoData, saturado, sombra, nubes, cirrus, no clasificado y nieve.

La fracción no vegetada es la media espacial de SCL clase 5 por mes y luego la mediana temporal. Su similitud es esa misma fracción porque el perfil de prueba requiere continuidad de superficie expuesta; no se presenta como analogía mineralógica con Marte. También se conservan NDVI y BSI para auditoría.

NASA HLS S30 v2.0 se consulta mediante CMR como inventario independiente. Sus píxeles no entran al score para evitar doble conteo de observaciones Sentinel-2.

## Contexto climático

NASA POWER Climatology Point API, 2001–2025:

- precipitación anual aproximada = `PRECTOTCORR.ANN × 365,25`;
- rango térmico superficial = `TS_MAX.ANN − TS_MIN.ANN`.

La precipitación usa una preferencia decreciente con escala de 25 mm/año:

```text
s_aridez = 1 / (1 + precipitación_anual / 25)
```

El rango térmico satura a 45 °C:

```text
s_térmica = min(rango_térmico / 45, 1)
```

Ambos son requisitos de ingeniería versionados, no equivalencias climáticas completas con Marte. POWER representa la celda regional más cercana, no una estación local.

## Agregación

Para criterios válidos:

```text
S = 100 × exp(Σ w′ᵢ × ln(max(sᵢ, 0,01)))
```

Los pesos válidos se renormalizan. Si suman menos de 0,70, no se publica similitud. En v2 el peso válido es 0,90; solo geología permanece fuera del score.

Confianza:

```text
C = 100 × Σ wᵢ × qᵢ
```

Los datos faltantes aportan calidad cero. Confianza y similitud nunca se combinan.

Las calidades `qᵢ` son valores asignados por tipo de fuente (ADR-003), no incertidumbres medidas. Por eso la confianza casi no distingue entre los tres sectores (77,41–77,45): indica cuánta evidencia entró al score, no qué sector está mejor medido.

En el perfil, `validated` significa «aprobado para screening por ADR-002 y ADR-003»; no hubo validación experta externa ni de campo. El campo `method: reference_distribution_distance` se implementa en v2 como la razón de medianas descrita arriba, no como una distancia entre distribuciones completas.

## Factibilidad

Cada restricción declara autoridad, fuente, acción y razón. En v2 se completa el screening de agua permanente con NASADEM SWB y Sentinel-2. Áreas protegidas, urbano, acceso, propiedad y peligros a escala de rueda siguen pendientes; por ello todos los candidatos quedan `requires_review`.

## Sensibilidad

Cada peso se perturba individualmente −20 % y +20 %, renormalizando el conjunto. La estabilidad publicada es `100 − peor cambio absoluto del score`. No mide incertidumbre del raster, selección del perfil ni sensibilidad conjunta.

## Reproducibilidad

```bash
python -m pipelines.fetch_precision_data
python -m pipelines.build_precision_snapshot
npm run verify
```

El manifiesto guarda proveedor, producto, versión, URL, fecha, periodo, resolución, CRS, unidades, licencia, NoData, transformaciones y checksum SHA-256. Credenciales y tokens se omiten deliberadamente.

## Búsqueda del piloto v3

Lo anterior describe las fórmulas, que no cambian. El snapshot `science-screening-v3` las aplica a una búsqueda en lugar de a sectores elegidos de antemano.

1. **Rejilla.** Dos regiones de prueba de 1° × 1° (interior de Antofagasta y Puna de Catamarca y Salta) divididas en 25 ventanas de 0,2° cada una: 50 ventanas de 442–449 km², con identificadores derivados del centro. Son una selección de prueba, no una muestra representativa.
2. **Prioridad topográfica.** Para cada ventana se calculan pendiente, rugosidad y relieve con NASADEM agregado, y se ordena por la media geométrica de sus tres similitudes con pesos relativos 0,20/0,20/0,15. Solo ordena la preselección: no es el score ni la confianza.
3. **Rechazos registrados.** Cobertura NASADEM < 95 %, agua permanente > 5 %, fallo de datos o presencia de coordenadas de muestreo publicadas dentro de la ventana. Cada ventana guarda su motivo.
4. **Diversificación.** Hasta tres ventanas por país, con centros separados al menos 25 km y desempate por identificador. No se completa la lista a mano.
5. **Caracterización.** Solo la preselección recibe Sentinel-2 mensual, POWER e inventario HLS, y se puntúa con las mismas fórmulas y pesos.
6. **Referencia.** Yungay se recalcula con sus datos v2 y las mismas reglas; conserva 75,67 / 77,45 / 99,03 y queda fuera del ranking.

Correcciones para no generar confianza falsa, sin cambiar los valores v2:

- la completitud Sentinel-2 se mide contra los 12 meses configurados y se descartan meses duplicados, fuera de periodo, incompletos, con error o con valores no finitos o fuera de rango;
- la calidad topográfica se multiplica por la cobertura NASADEM válida;
- POWER se valida (unidades, valor de relleno, rangos) antes de puntuar;
- cada dato crudo se liga a su petición exacta; un dato de otra configuración detiene el build.

NASA POWER entrega la celda MERRA-2 de 0,5° × 0,625° que contiene el punto. Esa celda es mayor que la ventana, así que el contexto climático no es lluvia medida en el sitio, puede coincidir entre ventanas vecinas y necesita contraste local. En la Puna da 562–767 mm/año y explica la mayor parte de la diferencia de los candidatos argentinos.

Antecedentes: un catálogo versionado distingue «contiene coordenada de muestreo publicada», «se superpone a un área de estudio», «cercanía (heurística de 25 km al centro)» y «antecedente regional». Ninguna ventana se declara nueva y no encontrar coincidencias no prueba novedad. Detalle en `docs/DISCOVERY_REPORT.md`.

```bash
python -m pipelines.fetch_discovery_data --stage tiles
python -m pipelines.discover_candidates
python -m pipelines.fetch_discovery_data --stage sources
python -m pipelines.build_discovery_snapshot
npm run verify
```
