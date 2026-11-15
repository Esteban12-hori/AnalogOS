# Criterios de aceptación de la demo

## En 30 segundos

El jurado entiende:

- qué problema resolvemos;
- para quién;
- por qué “parecido a Marte” no basta;
- qué diferencia a AnalogOS.

## Flujo de 90–120 segundos

1. Seleccionar o presentar el perfil P0.
2. Mostrar 3–5 zonas en Chile.
3. Abrir la primera.
4. Separar similitud, confianza y factibilidad.
5. Enseñar el desglose y una fuente.
6. Comparar con otro candidato.
7. Mostrar una limitación y una verificación de terreno.
8. Cerrar con reproducibilidad y próximo paso.

## Aceptación funcional

- El mapa carga sin servicios externos.
- Los candidatos son polígonos o celdas, no pins falsamente exactos.
- El ranking y la ficha usan el mismo snapshot/versiones.
- La UI diferencia claramente fixture de resultado científico.
- Las fuentes son accesibles desde la ficha.
- Los datos faltantes son visibles.
- La comparación usa unidades consistentes.
- Existe un estado de error legible.
- La app se usa con teclado para acciones principales.

## Aceptación científica

- La referencia planetaria está identificada.
- Atacama actúa como control, no etiqueta de entrenamiento.
- Cada criterio explica cálculo y unidad.
- El top 3 pasó inspección visual.
- Existe al menos un resultado de sensibilidad.
- Cada candidato declara dónde falla la analogía.

## Aceptación operativa

- Build estático guardado.
- Video de respaldo grabado.
- Links probados en incógnito.
- README, licencia elegida, atribuciones y limitaciones completos.
- No hay secretos en el repositorio.

## Recorridos M8 (guía para el equipo)

Interfaz integrada (ADR-013): el planificador del equipo vive en «Tu misión» (pestaña «Misión»: panel izquierdo ≥1440 px, popover desde el composer <1440 px, pestaña «Tu misión» de la hoja en móvil).

1. La pestaña «Misión» abre «Tu misión» con «Definir una prueba» y «Evaluar un sector». El riel y la ficha de cada sector tienen «Evaluar este sector». «Enviar» del composer carga el texto en «Tu misión» (nunca llama a la IA).
2. Definir una prueba: «Cargar un ejemplo» (valores de muestra editables) → revisar/editar requisitos → Siguiente (elegir qué comparar) → Confirmar → Evaluar. Probar: pendiente ≤ 0,001 ⇒ ninguna área priorizada; «tracción» imprescindible ⇒ evidencia insuficiente en todas. Los estados aparecen en el carrusel, el globo, el riel y la Lectura.
3. Evaluar un sector: elegir un área (Yungay aparece como REF), un punto (-69,7 / -25) o un rectángulo; comprobar que un subrectángulo exige elegir la ventana completa y que un punto fuera de cobertura produce informe exportable.
4. Cambiar cualquier dato después de evaluar deja el resultado anterior atenuado y exige confirmar de nuevo. «Descargar JSON» e «Imprimir informe» desde el resultado de «Tu misión».
5. IA opcional (requiere `.env`, ver `docs/AI_SETUP.md`): «Proponer requisitos con IA» (en «Tu misión») y «Destacar motivos con IA» (en la Lectura, tras evaluar). Sin clave, o en el ZIP, aparece un mensaje amable y todo lo demás sigue funcionando.
   Orientación geológica (M10): tras evaluar, «Tu misión» lleva, después de «Descargar JSON», «Imprimir informe» y «Volver a editar», el pliegue «Orientación geológica para esta prueba · Orientación general sin IA · N sectores» (cerrado por defecto); al abrirlo, límites, fuente oficial y «Descargar JSON con orientación geológica». En la Lectura, la casilla «Incluir orientación geológica de la prueba» (activa por defecto) cambia el aviso de envío; con IA, el resumen del pliegue y la sección pasan a «Selección por IA» sin cambiar estados, orden ni cifras. Si el servidor no tiene el mismo contexto, la Lectura ofrece «Reintentar sin geología».
7. Explorar: carrusel con filtro de país; seleccionar un lugar → «Ver ficha completa» → Origen, Geología (contexto geológico oficial con cobertura, escala, procedencia y «Descargar contexto geológico (JSON)»), Señal, Comparar, Método (50 ventanas y «Abrir las 50 ventanas y sus motivos») y Fuentes (contexto satelital). «Exportar ficha (JSON)» en la cabecera de la ficha.
6. Sin WebGL, móvil de 390 px y teclado: el planificador usa controles nativos y un esquema SVG local.
