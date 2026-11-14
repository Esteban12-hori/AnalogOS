# ADR-003 — Snapshot v2 autenticado con NASADEM y Sentinel-2

- Estado: aceptado para la entrega de hackathon
- Fecha: 2026-11-14

## Contexto

El snapshot v1 usaba un único tile SRTM por sector y no medía superficie expuesta. Al habilitar Earthdata Login se comprobó que la ventana de Pampa Yungay cruza cuatro tiles; analizar solo `S25W070` truncaba parte del AOI. También se habilitaron credenciales OAuth de Copernicus, lo que permite calcular estadísticas Sentinel-2 sin descargar escenas completas.

## Decisión

1. Sustituir SRTM vía espejo por `NASADEM_HGT.001` descargado desde NASA Earthdata.
2. Construir primero un mosaico multitesela y después recortar cada ventana de 0,2°.
3. Conservar la agregación 16×16 para comparar NASADEM (~30 m) con MOLA a ~460–480 m.
4. Usar la máscara `swb` de NASADEM para screening de agua permanente.
5. Consultar Sentinel-2 L2A mediante Copernicus Statistical API en doce intervalos mensuales de 2025, resolución nominal ~30 m y mosaico de menor nubosidad.
6. Definir píxeles válidos con SCL 2, 4, 5 y 6; derivar superficie no vegetada con SCL 5, además de NDVI y BSI auditables.
7. Usar la mediana mensual de fracción no vegetada directamente como similitud del criterio `bare_ground_fraction`. Esto mide continuidad de superficie útil para la prueba terrestre, no parecido espectral con Marte.
8. Consultar HLS S30 v2.0 en CMR como inventario NASA independiente. Sus píxeles no entran al score v2 para evitar doble conteo de observaciones Sentinel-2.
9. Mantener geología, urbano, áreas sensibles, propiedad y acceso fuera de cualquier afirmación resuelta.

## Calidad y confianza

- Topografía NASADEM: calidad 0,93 para pendiente y 0,91 para rugosidad/relieve.
- Superficie Sentinel-2: calidad máxima 0,90, multiplicada por cobertura válida y completitud temporal.
- POWER conserva calidad 0,60 porque es contexto climático regional.
- Geología aporta calidad cero y permanece fuera del score.

La confianza resultante (~77,4) es mayor que v1 porque ahora existe evidencia superficial, pero no implica validación de campo.

## Consecuencias

- Yungay usa cuatro tiles y deja de sufrir truncamiento de borde.
- El peso válido sube de 0,70 a 0,90.
- El ranking se mantiene, pero cambian los valores: Yungay 75,67; Domeyko 71,60; María Elena 49,99.
- María Elena conserva una advertencia por ~0,15 % de agua permanente detectada en el polígono.
- La reproducción completa requiere cuentas gratuitas Earthdata y Copernicus; la demo final sigue funcionando offline con el snapshot versionado.
