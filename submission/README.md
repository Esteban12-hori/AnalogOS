# Paquete de presentación — AnalogOS Chile

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
- `assets/analogos-chile-overview.jpg`: captura principal.
- `assets/analogos-chile-comparison.jpg`: captura de evidencia, comparación y método.
- `analogos-chile-static.zip`: build estático listo para publicar.
- `SHA256SUMS.txt`: checksum del ZIP de despliegue.

## Mensaje central

> AnalogOS no dice “este lugar es Marte”. Dice “este lugar merece ser investigado para esta prueba, por estas razones, con estas limitaciones”.

## Resultado que se puede afirmar

Con el perfil preliminar de movilidad de rover y el snapshot autenticado `science-screening-v2`, Pampa Yungay obtiene la mayor similitud de los tres sectores evaluados: 75,67/100. La confianza de evidencia es 77,45/100 y la factibilidad sigue en `requiere revisión`; no es autorización ni validación de terreno.

## Inicio de la demo

```bash
cd analogos-chile
npm install
npm run dev
```

Abrir `http://127.0.0.1:5173/`. Para una demo sin herramientas de desarrollo, descomprimir `analogos-chile-static.zip` en cualquier hosting estático, en la raíz o en un subdirectorio como `/AnalogOS/`: el build usa rutas relativas.

## Regenerar y comprobar el ZIP

Desde la raíz del repositorio, con `npm install` hecho y el entorno Python activo:

```bash
npm run release:package
(cd submission && shasum -a 256 -c SHA256SUMS.txt)
```

El ZIP contiene únicamente `index.html`, el JS/CSS compilado, los cinco archivos `science-v2/` y el contexto visual (`visual-context/index.json` y tres PNG Sentinel-2, uno por candidato); son 12 archivos y unos 4,1 MB. Es determinista para un mismo build. Las imágenes son contexto preliminar de diciembre de 2025: no validan los sitios ni cambian el ranking. Prueba por HTTP local en un subdirectorio:

```bash
mkdir -p /tmp/analogos-demo/AnalogOS
unzip -o -q submission/analogos-chile-static.zip -d /tmp/analogos-demo/AnalogOS
python3 -m http.server 8080 --bind 127.0.0.1 --directory /tmp/analogos-demo
```

Abrir `http://127.0.0.1:8080/AnalogOS/`. No se garantiza abrir `index.html` con `file://`; la demo necesita un servidor HTTP, aunque sea local.
