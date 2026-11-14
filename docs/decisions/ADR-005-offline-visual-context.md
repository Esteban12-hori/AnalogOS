# ADR-005 — Contexto visual Sentinel-2 offline por candidato

- Estado: accepted por Codex tras revisión independiente de código, imágenes, pruebas y demo
- Fecha: 2026-11-14

## Contexto

M4 pide inspeccionar visualmente los candidatos. Hasta ahora la ficha mostraba números y un mapa esquemático, pero ninguna imagen del terreno. La demo debe seguir funcionando offline, sin APIs en el navegador, y el snapshot científico v2 no debe cambiar.

## Decisión

1. `pipelines/fetch_visual_context.py` pide a la Process API de Copernicus Sentinel Hub una vista RGB (B04/B03/B02) por candidato y escribe `artifacts/visual-context/`: tres PNG tal como los devuelve el servicio y un `index.json` público.
2. La bbox sale de la geometría versionada del candidato y se contrasta con `config/science_snapshot_v2.json`. Ventana fija: 2025-12-01 a 2026-01-01 UTC, `sentinel-2-l2a`, orden `leastCC`, nubosidad máxima 40 % por escena.
3. Vista de 768 px de alto y ancho proporcional a la latitud (705–714 px), unos 28,8 m por píxel. Se documenta como vista reducida, no como resolución nativa.
4. Transformación única y explícita: reflectancia × 2,0 recortada a [0, 1]; alfa 0 donde no hay datos.
5. El evalscript usa mosaico `ORBIT`, devuelve en `userdata` las órbitas consideradas y cuenta los píxeles que aporta cada una. Las órbitas «usadas» solo se publican si esos contadores suman exactamente la rejilla pedida; si no, quedan solo las consideradas.
6. El índice guarda la petición completa y el evalscript (sin credenciales), la metadata devuelta, la hora real de consulta y el SHA-256 de cada PNG. Todo lo que presenta se valida contra el candidato, la petición, el archivo o la metadata devuelta.
7. Un paquete local válido se reutiliza sin red ni credenciales; `--refresh` fuerza la consulta. Una generación nueva se arma completa en un directorio temporal y se intercambia entera; ante error se conserva la anterior.
8. La web lee solo archivos locales (`BASE_URL`), muestra el panel en la ficha y cae a «no disponible» si falta el índice, es inválido, el candidato es un fixture o la imagen no abre. No toca similitud, confianza, estabilidad ni factibilidad.
9. El empaquetador admite `visual-context/index.json` y exactamente tres PNG con nombre fijo, y exige que su SHA-256 coincida con el índice.

## Consecuencias

- El ZIP de entrega pasa de ~0,5 MB a ~4,1 MB; cada PNG pesa 1,1–1,2 MB.
- Cambiar cualquier constante que el índice presenta (periodo, transformación, limitaciones, evalscript) invalida el paquete local y exige una consulta nueva con credenciales.
- Añadir o quitar candidatos obliga a actualizar la lista explícita del empaquetador.
- Credenciales Copernicus solo vía entorno o `.env`, enviadas únicamente a `identity.dataspace.copernicus.eu`; el token solo a `sh.dataspace.copernicus.eu`. No se registran cabeceras ni cuerpos de respuesta.

## Límites

- Es contexto para inspección, no evidencia que cierre advertencias, restricciones territoriales, revisión experta ni M4.
- Mosaico de un mes de 2025: no es una fecha única ni una imagen actual.
- El filtro de nubes es por escena; la vista puede tener nubes, sombras o bruma.
- El reemplazo del paquete no es atómico frente a un corte abrupto; si tampoco puede restaurarse o limpiarse, el comando informa el estado real y conserva el respaldo.
