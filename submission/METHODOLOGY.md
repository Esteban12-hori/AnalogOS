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
