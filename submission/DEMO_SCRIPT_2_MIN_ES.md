# Demo de 2 minutos

## Preparación

- Servir `submission/analogos-static.zip` descomprimido por HTTP, en la raíz o en `/AnalogOS/`, o ejecutar `npm run dev`.
- Ventana de al menos 1280 × 800. La interfaz abre en «Explorar», con el globo y el carrusel de lugares abajo.
- Guion actualizado a la interfaz integrada (rediseño Explorar/Misión sobre el planificador y la IA del equipo, ADR-013).
- Tener a mano `docs/DISCOVERY_REPORT.md` por si preguntan por una ventana concreta.

## 0:00–0:20 — Enmarcar

Mostrar el encabezado (snapshot v3, 6 candidatos, 1 REF) y la franja «Screening científico preliminar · no es autorización de terreno».

«Esto es AnalogOS, un piloto en Chile y Argentina. No es una búsqueda global: son dos regiones de prueba, 50 ventanas de unos 20 kilómetros y unos 22.000 kilómetros cuadrados. Lo que ven es un screening preliminar con datos reales, no una autorización de terreno.»

## 0:20–0:45 — Globo y carrusel

Señalar los marcadores ● del globo y el carrusel «Lugares»: seis candidatos con su puesto y, aparte, con borde discontinuo, Yungay como «REF».

«Cada tarjeta es una ventana preseleccionada, tres por país. Yungay la mostramos como referencia conocida, no como resultado: no tiene puesto.» (Las 50 ventanas y la rejilla están en «Ver ficha completa» → «Método».)

Pulsar el filtro «Argentina» del carrusel y volver a «Todos».

«El ranking conserva la posición global aunque filtre por país.»

## 0:45–1:15 — Ficha de un candidato

Seleccionar la tarjeta #1 del carrusel: se abre el riel con sus cifras y las líneas al globo. Pulsar «Ver ficha completa» y abrir la pestaña «Origen».

«Similitud 94,9, confianza 77,5 y factibilidad "requiere revisión", siempre por separado. En "Origen y antecedentes" se ve de dónde sale: una ventana de la rejilla, primera en prioridad topográfica. También dice que la región tiene antecedentes publicados y que hay una coordenada de un estudio de 2003 a unos 20 kilómetros del centro. No lo presentamos como nuevo.»

Abrir la pestaña «Fuentes» («Contexto satelital»).

«Esta es una imagen Sentinel-2 real de diciembre de 2025, guardada offline. Se ven trazas lineales: es una observación a contrastar, no una identificación.»

## 1:15–1:35 — Un candidato argentino

Volver al riel y seleccionar el candidato #4 en el carrusel o en el globo.

«Su topografía se parece a la de los chilenos, pero baja a 63,9. La causa principal está en el desglose: el contexto climático POWER le asigna cientos de milímetros de lluvia. Ese dato es de una celda mucho mayor que la ventana, y la ficha lo advierte. No tocamos los pesos para corregirlo.»

## 1:35–1:50 — Referencia y comparación

Seleccionar la tarjeta «REF» y abrir la pestaña «Comparar» de la ficha completa.

«Yungay obtiene 75,67, el mismo valor de nuestra versión anterior. Que un candidato puntúe más no lo hace mejor sitio: Yungay tiene dos décadas de trabajo de campo.»

## 1:50–2:00 — Cierre

Pulsar «Exportar ficha (JSON)» (cabecera de la ficha; «Descargar ficha (JSON)» en «Fuentes» exporta lo mismo) y, en la pestaña «Método», abrir «Abrir las 50 ventanas y sus motivos».

Opcional, si hay tiempo: pestaña «Misión» → «Tu misión» → «Cargar un ejemplo» → Siguiente → Confirmar → Evaluar; «Descargar JSON» e «Imprimir informe» en el resultado de «Tu misión».

«Todo es exportable y auditable: la ficha conserva el rol, el origen y los antecedentes, y cada ventana tiene registrado por qué quedó dentro o fuera.»

## Respuestas rápidas

- **¿Encontraron análogos nuevos?** No lo afirmamos. Encontramos ventanas que merecen revisión en regiones con antecedentes.
- **¿Por qué solo dos regiones?** Es un piloto acotado para demostrar el método con datos reales y límites de consulta explícitos.
- **¿Por qué los candidatos chilenos superan a Yungay?** Por topografía a ~480 m más parecida a la de Jezero. No mide suelo, acceso ni historia de campañas.
- **¿Se puede ir a esos sitios?** No lo sabemos. Propiedad, acceso, áreas protegidas y uso urbano no están evaluados en ningún país.
- **¿Usa IA para el ranking?** No. El score es una media geométrica ponderada, determinista. En «Misión», la IA solo propone requisitos (sin confirmar) o destaca motivos ya calculados cuando usted pulsa su botón; nunca produce cifras ni ordena.
- **¿Funciona sin internet?** Sí. Datos e imágenes están en el paquete; el flujo central no llama a ninguna API. La IA es opcional: sin clave, o en el ZIP, sus botones dicen «no disponible» y todo lo demás funciona.
