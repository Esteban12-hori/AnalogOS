# Demo de 2 minutos

## Preparación

- Abrir la app antes de comenzar.
- Mantener zoom del navegador en 100 %.
- Seleccionar Pampa Yungay.
- Tener una segunda pestaña con `analysis-summary.json` por si preguntan por reproducibilidad.

## 0:00–0:20 — Enmarcar

Señalar el banner superior: “datos reales, screening preliminar, no autorización”. Decir: “La interfaz está diseñada para impedir una lectura más concluyente que la evidencia”.

Mostrar la pregunta de misión. No describir aún todas las funciones.

## 0:20–0:45 — Ranking y mapa

Mostrar el ranking y las llamadas conectadas a su posición en Chile. Decir:

“Pampa Yungay lidera con 75,67; Domeyko queda segundo con 71,60 y María Elena tercero con 49,99. Los números del mapa y del ranking coinciden. La app funciona offline y el mapa no requiere WebGL ni teselas externas”.

## 0:45–1:15 — Ficha de Yungay

Desplazarse a la ficha. Marcar cuatro valores:

- similitud 75,67;
- confianza 77,45;
- factibilidad “requiere revisión”;
- estabilidad del score ante pesos ±20 %.

Abrir “verificaciones pendientes”. Decir: “Un score alto no oculta que aún no evaluamos permisos, áreas sensibles, urbano ni obstáculos a escala de rueda. El agua permanente sí tiene un primer screening con NASADEM SWB”.

## 1:15–1:35 — Evidencia

Mostrar el desglose. Señalar que superficie no vegetada ahora está medida con doce intervalos mensuales Sentinel-2 y que geología permanece “sin calibrar”. Abrir una fuente MOLA, NASADEM o Sentinel-2 si hay internet; si no, mostrar que las URLs están en el snapshot.

Decir: “Los faltantes bajan la confianza; no se convierten arbitrariamente en similitud cero”.

## 1:35–1:50 — Comparación

Ir a “Comparación rápida” y elegir María Elena. Señalar que es más plana que la referencia MOLA y por eso baja en los tres criterios topográficos, aunque sigue siendo árida.

## 1:50–2:00 — Cierre

Mostrar “Método reproducible” y abrir el análisis auditable. Cerrar con:

“AnalogOS no elige el sitio final. Reduce y explica el espacio de búsqueda para que el siguiente peso invertido sea trabajo de campo, no intuición”.

## Respuestas rápidas

- **¿Por qué Jezero?** Es una referencia rover reconocible y permite demostrar el método; el perfil es reemplazable y no pretende representar todo Marte.
- **¿Por qué solo tres sectores?** Es el snapshot preliminar de hackathon. La arquitectura soporta una grilla nacional; preferimos tres resultados auditables a miles de celdas opacas.
- **¿Por qué subió la confianza?** Porque NASADEM autenticado corrigió el mosaico multitesela y Sentinel-2 convirtió la continuidad no vegetada de supuesto a evidencia; geología y restricciones territoriales siguen pendientes.
- **¿La estabilidad cercana a 100 prueba robustez científica?** No. Solo indica poca variación del score bajo perturbaciones univariadas de peso ±20 %; no cubre incertidumbre de datos ni modelos alternativos.
- **¿Puede usarse para ir a terreno?** No sin revisar capas oficiales, permisos, seguridad, accesos y resolución de campo.
