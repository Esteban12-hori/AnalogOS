# AnalogOS

Exploración de análogos planetarios · Piloto Chile–Argentina

## Descripción breve

AnalogOS es un sistema de decisión geoespacial explicable que busca y prioriza sectores terrestres para investigar pruebas de movilidad, percepción, navegación y autonomía de rovers marcianos. Combina topografía de Marte y de la Tierra a escala comparable, superficie observada por satélite, contexto climático y antecedentes publicados, y mantiene similitud, confianza y factibilidad como decisiones separadas. La visión es global; lo ejecutado es un piloto acotado en Chile y Argentina.

## El problema

Decir que un lugar «parece Marte» no basta para planificar una prueba. Un equipo necesita saber qué propiedad es análoga, para qué experimento sirve, qué evidencia la respalda, qué datos faltan y qué debe verificarse en terreno. Además, señalar análogos ya famosos no demuestra capacidad de búsqueda: Yungay, en Atacama, se estudia desde hace más de veinte años.

## Nuestra solución

AnalogOS convierte una pregunta de misión en un perfil medible y lo aplica a una búsqueda documentada. Para el piloto preguntamos: ¿qué sector reproduce mejor condiciones relevantes para probar percepción, tracción, navegación y autonomía de un rover?

El sistema:

1. Deriva una referencia topográfica regional alrededor de Jezero con NASA PDS MOLA.
2. Recorre una rejilla regular de ventanas de ~20 km en dos regiones de prueba y calcula para cada una la topografía NASADEM a la misma escala que MOLA.
3. Registra por qué cada ventana se rechaza, se descarta o se preselecciona; nunca completa la lista a mano.
4. Contrasta cada ventana con un catálogo de antecedentes: si contiene coordenadas de muestreo publicadas, queda fuera del ranking y visible como antecedente.
5. Caracteriza la preselección con doce mosaicos mensuales Sentinel-2 L2A y contexto climático NASA POWER.
6. Calcula una similitud explicable mediante media geométrica ponderada y muestra confianza, datos faltantes, estabilidad y factibilidad sin mezclarlos.
7. Muestra una imagen satelital real por sitio, exporta una ficha auditable y funciona offline con un snapshot versionado.

## Resultado preliminar

El piloto evaluó 50 ventanas (unos 22.000 km²) en el interior de Antofagasta, Chile, y en la Puna de Catamarca y Salta, Argentina. Cuatro ventanas chilenas quedaron excluidas por contener coordenadas de muestreo ya publicadas. Seis se preseleccionaron, tres por país:

| Candidato | Similitud | Confianza |
|---|---:|---:|
| Interior de Antofagasta · 25,0° S, 69,7° O | 94,87 | 77,45 |
| Interior de Antofagasta · 24,8° S, 69,5° O | 91,87 | 77,45 |
| Interior de Antofagasta · 25,2° S, 69,5° O | 90,35 | 77,36 |
| Puna de Catamarca y Salta · 26,2° S, 67,5° O | 63,85 | 77,00 |
| Puna de Catamarca y Salta · 26,4° S, 67,3° O | 53,68 | 77,25 |
| Puna de Catamarca y Salta · 25,8° S, 67,1° O | 49,43 | 77,40 |

Yungay se recalculó con las mismas reglas como referencia conocida (75,67) y queda fuera del ranking.

Lo que este resultado no dice: ningún candidato es un análogo nuevo confirmado. Ambas regiones tienen antecedentes publicados, todos los sitios requieren revisión y las imágenes muestran trazas y estructuras que deben contrastarse con cartografía oficial. Los candidatos argentinos bajan sobre todo por un contexto climático de resolución gruesa, no por una medición local.

## Innovación

- Busca en lugar de listar: rejilla derivada por algoritmo, criterio de preselección versionado y registro de cada descarte.
- Separa el rol del sitio (candidato o referencia) del estado de su revisión bibliográfica, y nunca oculta un antecedente.
- Compara Tierra y Marte a una escala espacial similar, evitando el falso detalle de enfrentar 30 m con cientos de metros.
- Separa similitud, calidad de evidencia y factibilidad operacional.
- No convierte fallos en datos: meses incompletos, valores de relleno o peticiones de otra configuración quedan como faltantes o detienen el proceso.
- No usa IA para decidir el ranking; el score es determinista y auditable.

## Datos de NASA utilizados

- Mars Global Surveyor MOLA MEGDR, NASA Planetary Data System.
- NASADEM_HGT.001 mediante NASA Earthdata Login.
- HLS Sentinel-2 v2.0 mediante CMR, usado como inventario independiente.
- NASA POWER Climatology API, periodo 2001–2025.

Datos asociados: Copernicus Sentinel-2 L2A mediante Statistical API y Process API; contornos Natural Earth.

## Limitaciones y próximos pasos

Es un screening de escritorio, no una selección oficial. No representa gravedad, atmósfera, radiación ni mecánica de suelo marcianas; la comparación topográfica de ~460–480 m no detecta obstáculos a escala de rueda. Geología, áreas protegidas, urbano, propiedad y acceso siguen pendientes en ambos países. NASA POWER describe una celda de 0,5° × 0,625°, mayor que cada ventana. El catálogo de antecedentes es incompleto.

Los siguientes pasos son cruzar los candidatos con capas oficiales de IDE Chile e IDERA, incorporar geología de SERNAGEOMIN y SEGEMAR, contrastar el clima con datos locales, completar la revisión bibliográfica y ampliar la búsqueda a más regiones.

## Impacto

El enfoque reduce el espacio de búsqueda y hace defendible la planificación inicial de campañas robóticas, educación, investigación geológica y pruebas de sistemas autónomos. El mismo motor admite otras regiones y otros perfiles sin cambiar el contrato de datos ni la interfaz de decisión.

## Tecnologías

Python, earthaccess, Sentinel Hub Statistical y Process API, NumPy, PyProj, JSON Schema, React, TypeScript, Vite y SVG. El frontend es estático, accesible por teclado y no depende de servicios externos durante la demo.
