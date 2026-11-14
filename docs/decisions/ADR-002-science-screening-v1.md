# ADR-002 — Snapshot científico preliminar MOLA + SRTM + POWER

- Estado: aceptado para la entrega de hackathon
- Fecha: 2026-11-14

## Contexto

El producto necesitaba reemplazar fixtures por un resultado reproducible sin depender de credenciales Earthdata o Copernicus. Comparar SRTM de ~30 m directamente con MOLA de cientos de metros introduciría una diferencia de escala inaceptable.

## Decisión

1. Usar MOLA MEGDR `MEGT44N000HB` a 128 píxeles/grado como referencia del entorno regional de Jezero.
2. Agregar SRTM 1 arc-second en bloques 16×16 antes de calcular pendiente, diferencia entre celdas y relieve 3×3. La escala resultante es ~473–476 m, cercana a los ~451 m nominales de la ventana MOLA usada.
3. Usar NASA POWER 2001–2025 solo como contexto regional para precipitación y rango de temperatura de piel.
4. Mantener suelo expuesto y geología fuera del score v1; su peso faltante reduce la confianza.
5. Marcar agua, urbano, áreas sensibles, acceso y pendiente de campo como no evaluados, forzando `requires_review`.

## Interpretación

La salida prioriza sectores para investigar. No demuestra equivalencia con Marte, transitabilidad a escala de rueda, seguridad, permiso ni factibilidad legal.

## Consecuencias

- El peso válido es exactamente 0,70 y la confianza queda en 57,8/100.
- Existen tres candidatos reales y ningún fixture aparece en la vista final.
- La siguiente versión debe sumar clasificación óptica, geología SERNAGEOMIN y capas oficiales de restricciones.
