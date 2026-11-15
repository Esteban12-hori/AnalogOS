# Demo de 2 minutos

## Preparación

- Servir `submission/analogos-static.zip` descomprimido por HTTP, en la raíz o en `/AnalogOS/`, o ejecutar `npm run dev`.
- Ventana de al menos 1280 × 800. Dejar seleccionado el candidato 1 (se selecciona solo al abrir).
- Tener a mano `docs/DISCOVERY_REPORT.md` por si preguntan por una ventana concreta.

## 0:00–0:20 — Enmarcar

Mostrar el encabezado y la franja «Alcance de la búsqueda».

«Esto es AnalogOS, un piloto en Chile y Argentina. No es una búsqueda global: son dos regiones de prueba, 50 ventanas de unos 20 kilómetros y unos 22.000 kilómetros cuadrados. Lo que ven es un screening preliminar con datos reales, no una autorización de terreno.»

## 0:20–0:45 — Mapa y ranking

Señalar el mapa: las dos rejillas, las celdas azules y las naranjas.

«Cada celda es una ventana evaluada. Las azules contienen coordenadas de muestreo ya publicadas y quedaron fuera del ranking. Las naranjas son las seis preseleccionadas, tres por país. Arriba, con borde discontinuo, está Yungay: la mostramos como referencia conocida, no como resultado.»

Pulsar el filtro «Argentina» y volver a «Todos».

«El ranking conserva la posición global aunque filtre por país.»

## 0:45–1:15 — Ficha de un candidato

Con el candidato 1 seleccionado, recorrer la ficha.

«Similitud 94,9, confianza 77,5 y factibilidad "requiere revisión", siempre por separado. En "Origen y antecedentes" se ve de dónde sale: una ventana de la rejilla, primera en prioridad topográfica. También dice que la región tiene antecedentes publicados y que hay una coordenada de un estudio de 2003 a unos 20 kilómetros del centro. No lo presentamos como nuevo.»

Bajar a «Contexto satelital».

«Esta es una imagen Sentinel-2 real de diciembre de 2025, guardada offline. Se ven trazas lineales: es una observación a contrastar, no una identificación.»

## 1:15–1:35 — Un candidato argentino

Seleccionar el candidato 4 en el mapa.

«Su topografía se parece a la de los chilenos, pero baja a 63,9. La causa principal está en el desglose: el contexto climático POWER le asigna cientos de milímetros de lluvia. Ese dato es de una celda mucho mayor que la ventana, y la ficha lo advierte. No tocamos los pesos para corregirlo.»

## 1:35–1:50 — Referencia y comparación

Seleccionar la tarjeta «REF» y bajar a la comparación rápida.

«Yungay obtiene 75,67, el mismo valor de nuestra versión anterior. Que un candidato puntúe más no lo hace mejor sitio: Yungay tiene dos décadas de trabajo de campo.»

## 1:50–2:00 — Cierre

Pulsar «Descargar ficha» y abrir «Abrir las 50 ventanas y sus motivos».

«Todo es exportable y auditable: la ficha conserva el rol, el origen y los antecedentes, y cada ventana tiene registrado por qué quedó dentro o fuera.»

## Respuestas rápidas

- **¿Encontraron análogos nuevos?** No lo afirmamos. Encontramos ventanas que merecen revisión en regiones con antecedentes.
- **¿Por qué solo dos regiones?** Es un piloto acotado para demostrar el método con datos reales y límites de consulta explícitos.
- **¿Por qué los candidatos chilenos superan a Yungay?** Por topografía a ~480 m más parecida a la de Jezero. No mide suelo, acceso ni historia de campañas.
- **¿Se puede ir a esos sitios?** No lo sabemos. Propiedad, acceso, áreas protegidas y uso urbano no están evaluados en ningún país.
- **¿Usa IA para el ranking?** No. El score es una media geométrica ponderada, determinista.
- **¿Funciona sin internet?** Sí. Datos e imágenes están en el paquete; la web no llama a ninguna API.
