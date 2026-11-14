# ADR-001 — Mapa SVG local para la entrega

- Estado: aceptado
- Fecha: 2026-11-14

## Contexto

La primera implementación usó MapLibre con un estilo local. En la revisión sobre el navegador de presentación, WebGL no renderizó el contenido geográfico y dejó el panel vacío. La demo debe funcionar offline y en equipos desconocidos.

## Decisión

La entrega usa un mapa SVG de Chile generado desde el GeoJSON local de Natural Earth. Los candidatos se dibujan como llamadas interactivas conectadas a su ubicación. No hay teselas, servicios remotos ni dependencia de aceleración gráfica.

## Consecuencias

- La demo funciona en navegadores sin WebGL y el bundle baja de ~1,45 MB a menos de 400 kB de JavaScript.
- El mapa sirve para el ranking nacional y la comunicación del resultado, no para navegación cartográfica detallada.
- MapLibre puede volver en una versión posterior como modo de exploración, manteniendo SVG como fallback.
