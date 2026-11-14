# AnalogOS Chile

## Descripción breve

AnalogOS Chile es un sistema de decisión geoespacial explicable que prioriza sectores terrestres para investigar pruebas de movilidad, percepción, navegación y autonomía de rovers marcianos. Combina topografía de Marte y Chile a escala comparable, contexto climático y trazabilidad completa de fuentes; mantiene similitud, confianza y factibilidad como decisiones separadas.

## El problema

Decir que un lugar “parece Marte” no basta para planificar una prueba. Un equipo necesita saber qué propiedad es análoga, para qué experimento sirve, qué evidencia la respalda, qué datos faltan y qué debe verificarse en terreno. Las listas de análogos suelen mezclar parecido visual, relevancia científica y viabilidad operacional.

## Nuestra solución

AnalogOS convierte una pregunta de misión en un perfil medible. Para el MVP preguntamos: ¿qué sector reproduce mejor condiciones relevantes para probar percepción, tracción, navegación y autonomía de un rover?

El sistema:

1. Deriva una referencia topográfica regional alrededor de Jezero con NASA PDS MOLA.
2. Descarga NASADEM desde Earthdata, mosaica todos los tiles y agrega la topografía a una escala equivalente.
3. Mide superficie no vegetada, vegetación, agua, NDVI y BSI en doce mosaicos mensuales Sentinel-2 L2A.
4. Añade contexto regional de aridez y variación térmica con NASA POWER.
5. Calcula una similitud explicable mediante media geométrica ponderada.
6. Muestra confianza, datos faltantes, estabilidad y factibilidad sin mezclarlos con el score.
7. Exporta una ficha auditable por candidato y funciona completamente offline con un snapshot versionado.

## Resultado preliminar

Evaluamos tres sectores de screening de 0,2° en el norte de Chile. Pampa Yungay quedó primero con 75,67/100, seguido por el sector interior del Cordón de Domeyko con 71,60 y Pampa María Elena con 49,99. La confianza es aproximadamente 77,4/100 y los tres requieren revisión de terreno.

Yungay no gana por una etiqueta previa: combina topografía NASADEM comparable con MOLA, 100 % de superficie no vegetada en la mediana mensual Sentinel-2 y contexto hiperárido. El desglose permite comprobarlo criterio por criterio.

## Innovación

- Compara Tierra y Marte a una escala espacial similar, evitando el falso detalle de enfrentar NASADEM de 30 m con MOLA de cientos de metros.
- Separa explícitamente similitud, calidad de evidencia y factibilidad operacional.
- Penaliza la evidencia faltante en la confianza sin convertirla artificialmente en similitud cero.
- Conserva URLs, versiones, periodos, unidades, transformaciones y checksums en un manifiesto reproducible.
- No usa IA para decidir el ranking; el score es determinista y auditable.

## Datos de NASA utilizados

- Mars Global Surveyor MOLA MEGDR, NASA Planetary Data System.
- NASADEM_HGT.001 mediante NASA Earthdata Login.
- HLS Sentinel-2 v2.0 mediante CMR, usado como inventario independiente.
- NASA POWER Climatology API, periodo 2001–2025.

Datos asociados: Copernicus Sentinel-2 L2A mediante Statistical API.

## Limitaciones y próximos pasos

Este es un screening de escritorio, no una selección oficial. No representa gravedad, atmósfera, radiación ni mecánica de suelo marcianas; la comparación topográfica de ~460–480 m no detecta obstáculos a escala de rueda. Agua permanente ya se examina, pero geología, urbano, áreas sensibles, acceso y permisos permanecen pendientes.

La siguiente versión añadirá cartografía SERNAGEOMIN, capas oficiales de IDE Chile, inspección Worldview y levantamiento de campo. También ampliará el screening desde tres sectores semilla a una grilla nacional.

## Impacto

El enfoque puede reducir el espacio de búsqueda y hacer defendible la planificación inicial de campañas robóticas, educación, investigación geológica y pruebas de sistemas autónomos. El mismo motor admite perfiles lunares o terrestres distintos sin cambiar el contrato de datos ni la interfaz de decisión.

## Tecnologías

Python, earthaccess, Sentinel Hub Statistical API, NumPy, PyProj, JSON Schema, React, TypeScript, Vite y SVG. El frontend es estático, accesible por teclado y no depende de servicios externos durante la demo.
