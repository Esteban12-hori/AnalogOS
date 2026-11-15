# Geología oficial en AnalogOS: valor, esfuerzo y decisión propuesta

Fecha de evaluación: 14 de noviembre de 2026. Responsable: Codex.
Base inspeccionada: `dev`, `92392f1181133ee2b86fb6b13c97ec9b10de021d`.
Estado: evaluación terminada; integración de producto pendiente de asignación. No se han modificado la web, el motor, la IA ni los snapshots científicos.

## Dictamen

**Sí conviene incorporar geología oficial como contexto de reconocimiento. No conviene activar todavía un puntaje geológico ni inferir propiedades mecánicas del suelo.** El primer corte recomendado requiere aproximadamente **20–32 horas de ingeniería y revisión**, distribuidas en 3–5 jornadas según disponibilidad del equipo. Es una estimación, no una promesa de calendario ni de validación científica.

La utilidad para el usuario actual —responsable de una campaña de robótica planetaria— es moderada y concreta: distinguir ambientes geológicos dentro de áreas que ya parecen favorables por relieve y superficie no vegetada; preparar qué inspeccionar, muestrear y contrastar en terreno. Para objetivos de muestreo o selección de análogos geológicos el potencial es mayor, pero esos perfiles aún no están soportados por AnalogOS.

No resuelve hoy la pregunta «¿puede circular este rover?». Las capas inspeccionadas no contienen resistencia, cohesión, granulometría de superficie, profundidad de arena, tamaño de obstáculos ni tracción medida. Tampoco resuelven acceso, propiedad o permisos. Si el objetivo inmediato fuera organizar una campaña real, resolver acceso y restricciones territoriales tendría más impacto operativo que una explicación geológica más elaborada.

## Lo comprobado con datos reales

No se evaluó solo la existencia de un visor. Se descargaron datos públicos, se cruzaron con los siete polígonos exactos de `science-v3` y se comprobaron consultas independientes para Argentina. No se usaron credenciales ni se llamó a Anthropic.

| Sector del producto | Fuente inicial | Escala cartográfica | Área cubierta por polígonos geológicos | Hallazgo útil |
|---|---|---:|---:|---|
| Chile 1 · 25,0° S / 69,7° O | SERNAGEOMIN vía MMA | 1:1.000.000 | 99,4 % | Depósitos aluviales y unidades volcánicas; 5 unidades diferenciadas |
| Chile 2 · 24,8° S / 69,5° O | SERNAGEOMIN vía MMA | 1:1.000.000 | 99,2 % | Predominio cartográfico de depósitos aluviales; 6 unidades |
| Chile 3 · 25,2° S / 69,5° O | SERNAGEOMIN vía MMA | 1:1.000.000 | 99,3 % | Depósitos aluviales, secuencias sedimentarias y volcánicas; 6 unidades |
| Argentina 4 · 26,2° S / 67,5° O | SEGEMAR, unidades 250K | 1:250.000 | 50,0 % | Descripciones utilizables en la mitad cubierta; 7 unidades |
| Argentina 5 · 26,4° S / 67,3° O | SEGEMAR, unidades 250K | 1:250.000 | 0 % | Falta cobertura de esta capa; no implica ausencia de geología |
| Argentina 6 · 25,8° S / 67,1° O | SEGEMAR, unidades 250K | 1:250.000 | 100 % aprox. | Unidades del complejo volcánico Galán y otras; 7 unidades |
| Yungay · ventana de referencia | SERNAGEOMIN vía MMA | 1:1.000.000 | 99,1 % | Ventana mixta con unidades plutónicas y depósitos; 6 unidades |

Los porcentajes expresan cobertura del mapa, **no precisión, confianza, aptitud ni porcentaje del terreno confirmado en campo**. El recuadro de Yungay representa una ventana de unos 20 km y no el perímetro exacto de una campaña histórica.

Ejemplo del valor adicional: la unidad cartográfica aluvial `Qa` ocupa aproximadamente 43–56 % de las tres ventanas chilenas; en Argentina 6 una unidad del complejo Galán descrita como ignimbrita dacítica ocupa aproximadamente 46 %. Es información distinta de pendiente o NDVI y permite preparar preguntas de reconocimiento diferentes. No demuestra que esos materiales estén expuestos en toda esa superficie.

### Alternativas para los huecos argentinos

Se probaron dos capas adicionales por separado:

| Capa SEGEMAR | Argentina 4 | Argentina 5 | Argentina 6 | Decisión propuesta |
|---|---:|---:|---:|---|
| `sigam:e1M.NOA.Geol`, 1:1.000.000 | 100 % | 47,6 % | 97,8 % | No priorizar en el primer corte: cobertura incompleta y textos con problemas de codificación |
| `sigam:e2.5M.UnidadesGeologicas`, 1:2.500.000 | 100 % | 100 % | 100 % | Disponible como contexto nacional separado, sin rellenar silenciosamente la capa 250K |

El mapa 1:2.500.000 es diez veces más general en escala lineal que el 1:250.000. Cubrir el mismo polígono con ambos no los convierte en evidencia de igual detalle. El MVP puede mostrar el hueco de la capa 250K y un enlace al contexto nacional; no necesita incorporar tres capas ni inventar una cobertura homogénea.

## Fuentes, acceso y problemas reales

### Chile

- [Catálogo MMA: Geología Base](https://lineasdebasepublicas.mma.gob.cl/datos_abiertos/dataset/geologia-base). Declara fuente SERNAGEOMIN, escala 1:1.000.000, EPSG:4326 y licencia CC0. La actualización del catálogo es del 21 de abril de 2026; **no se debe presentar esa fecha como fecha de levantamiento geológico**.
- [Metadatos CKAN JSON](https://lineasdebasepublicas.mma.gob.cl/datos_abiertos/api/3/action/package_show?id=geologia-base).
- [Recurso rotulado SHP](https://lineasdebasepublicas.mma.gob.cl/datos_abiertos/dataset/fe09e3df-c26e-41c8-bd7d-ac9605b1b0aa/resource/b4196bd6-a094-4f1e-914e-118f07df9983/download/geologia-base_shapefile.zip): descarga comprobada, **su contenido real es GeoJSON**, 5.995.050 bytes comprimidos.
- [Recurso rotulado GeoJSON](https://lineasdebasepublicas.mma.gob.cl/datos_abiertos/dataset/fe09e3df-c26e-41c8-bd7d-ac9605b1b0aa/resource/44d0cc33-0059-4b65-88b0-f73bc46a3fdb/download/geologia-base_geojson.zip): descarga comprobada, **su contenido real es Shapefile**, 5.653.045 bytes. Las etiquetas están intercambiadas en lo descargado durante esta auditoría. Los adaptadores deben inspeccionar contenido y esquema.
- Las geometrías de 306 registros próximos al piloto coinciden entre ambos formatos. Hay 115 geometrías nulas en el archivo nacional; no se atribuyen esas 115 a nuestros sectores.
- En las cuatro ventanas chilenas hay aproximadamente 0,6–1,2 % de solapamiento entre unidades, además de huecos. El procesamiento debe separar área sin datos y área ambigua; sumar porcentajes de unidades sin tratar los solapamientos produce una distribución engañosa.
- [Catálogo directo SERNAGEOMIN](https://portalsdnmext.sernageomin.cl/publicacionesgeologicas): incluye cartografía más detallada, pero no se verificó aquí una descarga vectorial directa y completa para los cuatro polígonos. El acceso directo presentó errores durante la consulta. La vía MMA sí funcionó.

### Argentina

- [Geoservicios SIGAM/SEGEMAR](https://sigam.segemar.gov.ar/sigam/geoservicios/): WFS para objetos vectoriales, WMS para visualización y CSW para metadatos. La página declara CC BY 4.0; conservar atribución y registrar condiciones de la capa al empaquetar la integración.
- [WFS GetCapabilities](https://sigam.segemar.gov.ar/geoserver217/ows?SERVICE=WFS&REQUEST=GetCapabilities).
- Petición comprobada: base `https://sigam.segemar.gov.ar/geoserver217/ows`, `service=WFS`, `version=1.0.0`, `request=GetFeature`, `typeName=sigam:e250K_UnidadGeologica`, `bbox=-67.8,-26.5,-66.8,-25.5,EPSG:4326`, `srsName=EPSG:4326`, `outputFormat=application/json`, `maxFeatures=2000`.
- Resultado regional: 700 entidades, `numberMatched=numberReturned=700`; no se alcanzó el límite. Campos útiles: hoja, código y nombre de unidad, descripción litológica, edades y génesis. Muchas otras columnas están vacías: no se deben convertir en hechos mediante IA.
- Las consultas individuales devolvieron 46, 0 y 28 entidades; al recortar geometrías con área positiva quedan 44, 0 y 27. La cobertura geométrica coincide exactamente con el cruce de la consulta regional.
- Una prueba exploratoria `resultType=hits` con WFS 1.0 devolvió cero incluso en áreas con entidades. **No usar esa respuesta para decidir ausencia**; se comprobaron las entidades GeoJSON reales y su geometría. Un conector de producción debe fijar versión, orden de ejes y controles de completitud explícitos.
- Referencias para contrastar unidades: [Hoja Cachi](https://repositorio.segemar.gov.ar/handle/308849217/99), [Hoja Paso San Francisco](https://repositorio.segemar.gov.ar/handle/308849217/167) y [Hoja Antofalla](https://repositorio.segemar.gov.ar/handle/308849217/97). No confundir fecha de incorporación al repositorio con fecha de la publicación o del levantamiento.

## Valor para el producto y la IA

1. **Contexto geológico: valor claro.** Una ficha puede mostrar qué unidades cartografiadas atraviesan la ventana, qué superficie carece de cobertura, escala, fuente y preguntas para el reconocimiento. Ayuda a justificar por qué estudiar un área.
2. **Requisitos del ensayo: valor condicionado.** Un futuro requisito «presencia cartografiada de unidades volcánicas» sería distinto de «roca basáltica expuesta y transitable». Requiere vocabulario controlado, procedencia, escala aceptada por el usuario y reglas explícitas para cobertura parcial. No traducir uno al otro automáticamente.
3. **Explicación con IA: mejora posterior.** Anthropic podría explicar hechos geológicos previamente validados y citar sus IDs. No debe completar huecos, convertir una categoría regional en suelo superficial, ni declarar semejanza con Jezero sin referencia planetaria compatible.
4. **Score de analogía geológica: no habilitar ahora.** Actualmente `geologic_relevance` pesa 0,10 en el perfil, pero es `needs_calibration`, tiene calidad cero y no entra en similitud; el peso válido es 0,90. Introducir datos terrestres no basta para calibrar compatibilidad con Marte. Añadirlo exigiría otra versión científica y revisión experta; no garantiza que el ranking mejore.

## Alcance recomendado y esfuerzo

Estimación de ingeniería con Claude implementando y Codex revisando; incluye correcciones normales, no adquisición de cartografía de pago ni revisión científica externa.

| Trabajo del primer corte | Estimación | Resultado |
|---|---:|---|
| Adaptadores de descarga y caché, metadatos y comprobación de contenido | 4–6 h | Dos fuentes públicas reproducibles, sin API en el navegador |
| Recorte, geometrías inválidas, huecos, solapamientos y contrato separado | 6–10 h | Contexto por sector con estados explícitos y hashes |
| Ficha geológica y exportación propia | 4–6 h | Unidades, cobertura, escala y fuente legibles; sin tocar scores |
| Revisión independiente, pruebas de datos, modo offline y paquete | 6–10 h | Entrega revisada sin regresiones en M8 |
| **Total** | **20–32 h** | **Primer corte útil y acotado** |

Una capa coloreada sobre el mapa sumaría aproximadamente 6–10 h. Incorporar geología al contexto de IA y a requisitos estructurados sería otro corte de aproximadamente 8–16 h de ingeniería, una vez revisado el vocabulario y su interpretación; el tiempo del especialista se estima aparte. No son necesarios para probar el valor inicial.

No presupuestar todavía un score planetario: el trabajo decisivo sería elegir referencias de Marte, homologar escala y variables, definir compatibilidad y contrastarla con expertos. Más código o más credenciales no sustituyen ese trabajo.

## Integración técnica propuesta para Claude

Esta sección es un alcance preparado para una futura asignación, **no una orden de iniciar implementación**.

- Crear un artefacto independiente de contexto geológico, con contrato propio y vínculo al hash exacto de la geometría de cada sitio. Mantener `science-v2`, `science-v3`, perfiles, pesos y rankings byte a byte.
- Procesar por lotes en Python. `requests` y `pyproj` ya están disponibles; probablemente basta añadir Shapely a las dependencias del pipeline. El GeoJSON chileno comprobado permite evitar GDAL/GeoPandas y un lector Shapefile en el corte inicial.
- Datos por sitio: proveedor original y distribuidor; capa/hoja/versión; código y nombre originales; descripción original; fecha de consulta y fecha del mapa separadas; escala; cobertura, huecos y ambigüedad; geometría solicitada/procesada; transformaciones, licencia, URL y hash. Desconocidos siguen siendo nulos.
- No usar IA para clasificar litologías en esta fase. Conservar los nombres de fuente; no presentar un vocabulario homologado como revisado por un geólogo cuando no lo está.
- Geometrías inválidas: registrar IDs, método y efecto de reparación. Si la reparación altera de forma material el área o no produce polígonos coherentes, marcar esa evidencia como no utilizable hasta revisión. La auditoría actual es exploratoria, no aceptación automática de reparaciones.
- Mostrar la ficha solo para su geometría exacta. Un punto dentro de una ventana o un subpolígono no hereda porcentajes agregados. Cobertura 0 es «esta capa no cubre el sector», no «sin rocas» ni «descartado».
- Crear estado disponible/parcial/sin cobertura/error de fuente separado del estado de aptitud del ensayo. No dar una ventaja de ranking al país con cartografía más detallada.
- Mantener la tarjeta «Geología sin calibrar» del score, explicando que puede existir contexto cartográfico sin compatibilidad planetaria calibrada.
- Adaptar carga opcional en web, lista permitida del empaquetador y exportación geológica; si falta o falla el contexto, M8 continúa funcionando. No cambiar el esquema del informe de recomendación sin versionarlo.
- Archivos existentes a revisar: `apps/web/src/data/loadDemoSnapshot.ts`, `apps/web/src/components/CandidateDetails.tsx`, `scripts/package_release.py` y sus pruebas. La IA quedaría para otro corte: `server/ai/facts.ts`, contratos compartidos, validación de evidencia y exportación.
- Criterios de aceptación: siete estados honestos; fuentes y escala visibles; huecos y conflictos no sumados como material conocido; sin cambios de scores; reproducibilidad desde caché; respuesta truncada rechazada; errores de fuente tolerados; exportación trazable; pantalla móvil y offline revisadas.

## Evidencia y reproducción

- Resultados detallados y hashes: `docs/research/geology/measurements.json`.
- Cálculo offline: `docs/research/geology/audit.py`. Intersección en lon/lat, áreas en la proyección equivalente EPSG:6933, conservación de huecos, disolución por unidad y cálculo separado de superposición entre unidades. No se normalizan las unidades para forzar 100 %.
- Caché pública local ignorada: `data/raw/geology-feasibility-20261114/`, 13 archivos, 20.873.381 bytes. Contiene ambos ZIP chilenos, metadatos CKAN, capacidades WFS, tres capas argentinas, consultas individuales y controles independientes. No se redistribuye esa caché en el build.
- Para una reproducción nueva hay que obtener las respuestas desde los enlaces y parámetros anteriores, registrar sus hashes y repetir las comprobaciones individuales; las fuentes pueden cambiar. El script offline no descarga datos ni garantiza que una consulta futura sea idéntica.
- Entorno de la auditoría: Shapely 2.2.0 y pyshp 2.4.2 instalados exclusivamente en `/tmp/analogos-geology-audit-libs`; pyshp se usó para contrastar formatos, no es necesario para volver a ejecutar el cálculo GeoJSON. `pyproj` proviene del entorno existente del proyecto.

Comando ejecutado desde la raíz del repositorio:

```sh
PYTHONPATH=/tmp/analogos-geology-audit-libs .venv/bin/python docs/research/geology/audit.py \
  --raw-dir data/raw/geology-feasibility-20261114 \
  --candidates artifacts/science-v3/candidate-details.json \
  --output docs/research/geology/measurements.json
```

Verificación del producto existente: `source .venv/bin/activate && npm run verify` → 177 pruebas Python y 196 web pasan; 2 pruebas de IA real omitidas por ser opt-in; typecheck y build correctos. Esa comprobación valida que el estado actual sigue funcionando, **no que la geología ya esté integrada**.

## Decisión pendiente de producto

Recomiendo autorizar el primer corte descrito y medir su utilidad con un responsable de campañas: que pueda explicar qué ambiente está cartografiado en un sector, qué parte se desconoce y qué necesita verificar en terreno. Si el usuario solo necesita la misma información que ya obtiene del relieve y las imágenes, no ampliar hacia filtros o IA geológica.

Hasta una asignación nueva, M8 continúa aceptado y publicado; Claude espera. Esta evaluación no autoriza un cambio de ranking, una afirmación de aptitud ni una publicación a dev.
