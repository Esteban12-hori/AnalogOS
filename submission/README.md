# Paquete de presentación — AnalogOS (piloto Chile–Argentina)

## Archivos para entregar

- `PROJECT_PAGE_ES.md`: texto principal en español.
- `PROJECT_PAGE_EN.md`: versión en inglés para evaluación global.
- `PITCH_3_MIN_ES.md`: guion hablado de tres minutos.
- `DEMO_SCRIPT_2_MIN_ES.md`: recorrido exacto del producto.
- `METHODOLOGY.md`: método, fórmulas, fuentes y límites.
- `RESULTS_AND_LIMITATIONS.md`: tabla final y lectura correcta.
- `ATTRIBUTIONS.md`: créditos y licencias de datos/software.
- `TEAM.md`: plantilla para integrantes, contribuciones y declaración de IA.
- `VIDEO_SHOT_LIST.md`: plan de grabación de respaldo.
- `JUDGING_CHECKLIST.md`: auditoría antes de enviar.
- `assets/analogos-pilot-overview.jpg`: captura del piloto (alcance, ranking, mapa y ficha).
- `analogos-static.zip`: build estático v3 listo para publicar.
- `analogos-static.zip.sha256`: checksum del ZIP v3.
- Históricos v2, que no se regeneran: `analogos-chile-static.zip`, `SHA256SUMS.txt` y las capturas `assets/analogos-chile-*.jpg`.

## Mensaje central

> AnalogOS no dice “este lugar es Marte”. Dice “este lugar merece ser investigado para esta prueba, por estas razones, con estas limitaciones”.

## Resultado que se puede afirmar

Con el perfil preliminar de movilidad de rover y el snapshot `science-screening-v3`, una búsqueda sobre 50 ventanas en dos regiones de prueba de Chile y Argentina preseleccionó seis candidatos. Los tres chilenos obtienen entre 90,35 y 94,87 de similitud y los tres argentinos entre 49,43 y 63,85; Yungay, recalculado como referencia conocida, obtiene 75,67 y queda fuera del ranking. La confianza ronda 77/100 y la factibilidad sigue en `requiere revisión` para todos.

No se puede afirmar que algún candidato sea un análogo nuevo, que sea mejor sitio que Yungay ni que el terreno esté disponible: ambas regiones tienen antecedentes publicados y falta el cruce territorial.

## Inicio de la demo

```bash
cd analogos-chile
npm install
npm run dev
```

Abrir `http://127.0.0.1:5173/`. Para una demo sin herramientas de desarrollo, descomprimir `analogos-static.zip` en cualquier hosting estático, en la raíz o en un subdirectorio como `/AnalogOS/`: el build usa rutas relativas.

## Regenerar y comprobar el ZIP

Desde la raíz del repositorio, con `npm install` hecho y el entorno Python activo:

```bash
npm run release:package
(cd submission && shasum -a 256 -c analogos-static.zip.sha256)
```

El ZIP contiene únicamente `index.html`, el JS/CSS compilado, los siete archivos `science-v3/` y el contexto visual (`visual-context-v3/index.json` y siete PNG Sentinel-2, uno por sitio); son 18 archivos y unos 9,0 MB. Es determinista para un mismo build. Las imágenes son contexto preliminar de diciembre de 2025: no validan los sitios ni cambian el ranking. Descomprimir `analogos-static.zip` sirve para una demo sin herramientas de desarrollo. Prueba por HTTP local en un subdirectorio:

```bash
mkdir -p /tmp/analogos-demo/AnalogOS
unzip -o -q submission/analogos-static.zip -d /tmp/analogos-demo/AnalogOS
python3 -m http.server 8080 --bind 127.0.0.1 --directory /tmp/analogos-demo
```

Abrir `http://127.0.0.1:8080/AnalogOS/`. No se garantiza abrir `index.html` con `file://`; la demo necesita un servidor HTTP, aunque sea local.
