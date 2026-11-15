# Revisión visual de los candidatos (M4, avance parcial)

Este documento acompaña a `artifacts/visual-context/`. Registra de dónde salen las tres imágenes, cómo reproducirlas, qué conviene mirar y qué se observó al verlas. No es una revisión experta y no cierra M4.

## Qué es y qué no es

- Es una vista Sentinel-2 L2A en color natural por candidato, guardada offline con su procedencia.
- No modifica similitud, confianza, estabilidad ni factibilidad.
- No valida un sitio, no evalúa propiedad, acceso ni restricciones, y no sustituye una imagen reciente ni una visita.

## Fuente

| Campo | Valor |
|---|---|
| Servicio | Copernicus Data Space Ecosystem — Sentinel Hub Process API (`https://sh.dataspace.copernicus.eu/process/v1`) |
| Colección | `sentinel-2-l2a`, bandas B04, B03, B02 y `dataMask` |
| Ventana | 2025-12-01T00:00:00Z a 2026-01-01T00:00:00Z |
| Mosaico | `ORBIT`, orden `leastCC`, nubosidad máxima 40 % por escena; por píxel, primera órbita con datos |
| Transformación | reflectancia × 2,0 recortada a [0, 1], 8 bits; alfa 0 sin datos |
| Encuadre | bbox del polígono versionado de cada candidato (0,2° × 0,2°), CRS84 |
| Tamaño | 705–714 × 768 px, unos 28,8 m por píxel (las bandas son de 10 m en origen) |
| Atribución | Contiene datos modificados de Copernicus Sentinel (2025), procesados con Sentinel Hub |

Consulta realizada el 2026-11-14 entre las 16:16 y las 16:18 UTC. Órbitas según la metadata devuelta por el servicio:

| Candidato | Órbitas consideradas | Órbita que aportó los píxeles | Píxeles válidos |
|---|---:|---|---:|
| Pampa Yungay | 15 | 2025-12-21 (100 %) | 100 % |
| Pampa María Elena | 15 | 2025-12-21 (100 %) | 100 % |
| Cordón de Domeyko | 8 | 2025-12-03 (100 %) | 100 % |

Aunque cada vista proviene de una sola órbita, el producto se rotula como mosaico del periodo: es el resultado de aplicar la regla a diciembre de 2025, no la elección de una fecha.

## Reproducción

```bash
source .venv/bin/activate
python -m pipelines.fetch_visual_context            # reutiliza el paquete local; sin red ni credenciales
python -m pipelines.fetch_visual_context --refresh  # consulta de nuevo; requiere COPERNICUS_CLIENT_ID y COPERNICUS_CLIENT_SECRET
```

`artifacts/visual-context/index.json` guarda, por sitio, la petición exacta (incluido el evalscript), la metadata devuelta, la hora de consulta y el SHA-256 del PNG. Una consulta nueva puede devolver bytes distintos si el servicio cambia de versión o reprocesa escenas.

## Qué inspeccionar

1. Trazas rectilíneas, estructuras geométricas y cualquier indicio de infraestructura o actividad dentro del polígono.
2. Cauces, superficies brillantes y cambios bruscos de tono que sugieran agua, sales o materiales distintos.
3. Continuidad de superficies amplias sin obstáculos aparentes a esta escala.
4. Nubes, sombras o bruma que alteren la lectura.
5. Coherencia con los criterios del score (relieve, superficie no vegetada), sin usar la imagen para corregirlos.

## Observaciones tras ver las imágenes

Hechas por Claude sobre los tres PNG a tamaño completo el 2026-11-14; Codex las inspeccionó de forma independiente. Son descripciones de lo que aparece en la vista, no identificaciones.

### Pampa Yungay

- Sin vegetación ni nubes apreciables.
- Red de formas ramificadas más oscuras en la mitad norte y en el suroeste; franja más clara y lisa que cruza de oeste a este por el centro.
- Trazas rectilíneas finas en varias direcciones, incluida una diagonal larga en el suroeste.
- Conjunto de parches brillantes de contorno rectangular en el cuadrante sureste, y algunos más pequeños cerca del centro-este.

### Pampa María Elena

- Superficie mayormente llana, sin vegetación ni nubes apreciables.
- Trazas rectilíneas largas norte–sur y este–oeste que forman una retícula.
- Franja oscura y sinuosa a lo largo del borde este.
- Dos conjuntos oscuros de contorno rectangular (arriba al centro y al este), una estructura ovalada oscura cerca del centro con un patrón denso a su lado, un área rectangular muy brillante al este y un conjunto brillante con parches rojizos al sur del centro.

### Cordón de Domeyko

- Sin vegetación ni nubes apreciables.
- Relieve de tonos más oscuros en la mitad oeste; superficies más claras en abanico en la mitad este.
- Numerosas trazas rectilíneas finas que se cruzan en la mitad este.
- Parche blanco en el noroeste y una estructura rectangular en el borde este.

## Hipótesis a contrastar (no comprobadas)

Las trazas rectilíneas y las estructuras geométricas, especialmente visibles en Yungay y María Elena, son compatibles con caminos, instalaciones o actividad industrial. Esto es una apariencia a contrastar:

- No se ha comprobado qué son, a quién pertenecen ni si implican restricciones de acceso.
- No producen una exclusión automática ni cambian la factibilidad, que sigue en «requiere revisión».
- La franja sinuosa de María Elena podría ser un cauce; el parche blanco de Domeyko, una superficie salina. Ninguna de las dos lecturas está verificada.

Para contrastarlas hacen falta las capas oficiales de áreas urbanas, infraestructura, propiedad y áreas protegidas, que siguen sin intersectar.

## Pendientes

- Intersección con capas territoriales oficiales (urbano, infraestructura, propiedad, áreas sensibles).
- Imagen reciente (2026) o NASA Worldview para detectar cambios posteriores a diciembre de 2025.
- Revisión de una persona con experiencia geológica o en campañas de rover.
- Registro de falsos positivos y correcciones.

## Paquete v3 (piloto Chile–Argentina)

`artifacts/visual-context-v3/` contiene una vista por sitio del snapshot v3: seis candidatos consultados el 2026-11-14 hacia las 18:00 UTC y la referencia Yungay, reutilizada sin cambios del paquete v2. Misma colección, ventana, mosaico y transformación descritos arriba.

```bash
python -m pipelines.fetch_visual_context --snapshot v3            # reutiliza el paquete local
python -m pipelines.fetch_visual_context --snapshot v3 --refresh  # hasta 6 consultas nuevas; requiere credenciales
```

Observaciones preliminares de Codex y Claude, hechas tras ver cada imagen. Describen apariencia; no identifican instalaciones, propietarios ni permisos y no cambian ningún score.

| Ventana | Observación |
|---|---|
| `cl-win-s2500-w06970` | Numerosas trazas lineales y una red sinuosa y ramificada de tono claro en el noreste |
| `cl-win-s2480-w06950` | Relieve con abanicos, una franja clara ancha y sinuosa y trazas lineales |
| `cl-win-s2520-w06950` | Trazas rectilíneas y concentraciones geométricas de tono claro en el norte |
| `ar-win-s2620-w06750` | Campos oscuros en el centro y el este y una franja verde u oscura en el borde noreste |
| `ar-win-s2640-w06730` | Concentración densa de estructuras claras en el sur con una franja verde u oscura adyacente, compatible con intervención humana a contrastar |
| `ar-win-s2580-w06710` | Franjas verdes u oscuras ramificadas en el norte y el oeste |

Estas observaciones aparecen como advertencia en cada ficha. Una ventana de ~440 km² no es un terreno íntegramente libre ni apto; todas siguen en «requiere revisión» y necesitan cruce con capas territoriales oficiales de Chile y Argentina.
