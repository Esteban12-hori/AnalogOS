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

1. En el primer pantallazo, «Definir una prueba» y «Evaluar un sector» abren el planificador. La ficha de cada sector tiene «Evaluar este sector».
2. Definir una prueba: «Cargar un ejemplo» (valores de muestra editables) → revisar/editar requisitos → Siguiente (elegir qué comparar) → Confirmar → Evaluar. Probar: pendiente ≤ 0,001 ⇒ ninguna área priorizada; «tracción» imprescindible ⇒ evidencia insuficiente en todas.
3. Evaluar un sector: elegir un área (Yungay aparece como REF), un punto (-69,7 / -25) o un rectángulo; comprobar que un subrectángulo exige elegir la ventana completa y que un punto fuera de cobertura produce informe exportable.
4. Cambiar cualquier dato después de evaluar borra el resultado y exige confirmar de nuevo. Descargar JSON e imprimir informe desde el resultado.
5. IA opcional (requiere `.env`, ver `docs/AI_SETUP.md`): «Proponer requisitos con IA» y «Destacar motivos con IA». Sin clave, o en el ZIP, aparece un mensaje amable y todo lo demás sigue funcionando.
6. Sin WebGL, móvil de 390 px y teclado: el planificador usa controles nativos y un esquema SVG local.
