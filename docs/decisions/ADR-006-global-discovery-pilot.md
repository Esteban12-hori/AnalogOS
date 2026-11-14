# ADR-006 — AnalogOS global: piloto de búsqueda Chile–Argentina

- Estado: accepted por Codex (2026-11-14; revisión independiente en `../CODEX_M7_REVIEW.md`)
- Fecha: 2026-11-14
- Autorización: Dan aprobó el cambio de alcance el 2026-11-14; Codex aprobó el checkpoint de método el mismo día.

## Contexto

Hasta el snapshot v2 el producto evaluaba tres sectores elegidos de antemano en Chile, con Yungay en primer lugar. Yungay es un análogo publicado desde hace más de veinte años: presentarlo como resultado no demuestra capacidad de búsqueda. El producto pasa a llamarse AnalogOS, con visión global, y debe encontrar sectores mediante un procedimiento documentado en lugar de listar puntos conocidos.

## Decisión

1. **Marca y alcance.** La marca visible es «AnalogOS» con el subtítulo «Exploración de análogos planetarios · Piloto Chile–Argentina». No se renombra carpeta, remoto, paquetes ni hosting. No se afirma cobertura mundial ejecutada.
2. **Experimento acotado.** Dos regiones de prueba de 1° × 1° en CRS84: interior de Antofagasta `[-70.0, -25.5, -69.0, -24.5]` y Puna de Catamarca y Salta `[-67.8, -26.5, -66.8, -25.5]`. Rejilla regular de 25 ventanas de 0,2° por región (442–449 km² cada una). Son una selección de prueba, no una muestra representativa ni regiones garantizadas inéditas.
3. **Etapa 1, prioridad topográfica.** Métricas NASADEM con el código v2 para las 50 ventanas. Se rechazan con registro las de cobertura < 95 %, agua permanente > 5 % o que contengan coordenadas o un área de estudio publicadas. El orden es la media geométrica de pendiente, rugosidad y relieve con pesos relativos 0,20/0,20/0,15. Solo ordena: no es el score ni la confianza.
4. **Diversificación.** Selección voraz y determinista: hasta 3 ventanas por país, centros a ≥ 25 km (geodésica), desempate por identificador. Nunca se completa la lista a mano.
5. **Etapa 2.** Hasta 6 ventanas reciben Sentinel-2 mensual 2025, POWER e inventario HLS, con fórmulas, pesos y tolerancias v2. Geología sigue sin calibrar.
6. **Yungay como referencia.** Se recalcula con sus datos v2 y las mismas reglas, conserva 75,67 / 77,45 / 99,03, lleva `role: reference` y queda fuera del ranking. Su ventana no es el perímetro de cada campaña histórica.
7. **Antecedentes.** Catálogo versionado con fuentes, fecha de revisión y coordenadas solo cuando la publicación las da. Se distingue «contiene coordenada de muestreo publicada», «se superpone a un área de estudio», «cercanía (heurística de 25 km al centro, no perímetro del estudio)» y «antecedente regional». Ninguna ventana se declara nueva; no encontrar coincidencias no prueba novedad.
8. **Contratos.** `candidate-site` admite `cl-` y `ar-`, añade `country`, `role`, `discovery` y `literature_review` (obligatorios en v3) y el estado `reference`. Nuevos contratos `discovery-search` y `precedent-catalog`. Los snapshots históricos siguen validando.
9. **Calidad sin confianza falsa** (aprobado por Codex, sin cambiar v2):
   - la completitud Sentinel-2 se mide contra los 12 meses configurados; se descartan meses duplicados, fuera de periodo, incompletos, con error, con conteos incoherentes o con valores no finitos o fuera de rango;
   - la calidad topográfica se multiplica por la cobertura NASADEM válida;
   - POWER se valida (unidades, valor de relleno, finitud, rangos) antes de puntuar;
   - cada dato crudo se liga a su petición exacta; un dato de otra configuración detiene el build.
10. **Autoridades por país.** Las restricciones no evaluadas citan IDE Chile o IDERA según corresponda y siguen pendientes. No se infiere permiso ni terreno libre.
11. **Entrega.** `artifacts/science-v3/` y `artifacts/visual-context-v3/` son nuevos; v2 se conserva byte a byte. El empaquetador genera `submission/analogos-static.zip` con su checksum; el ZIP v2 queda como histórico.

## Límites autorizados y usados

| Recurso | Límite | Usado |
|---|---:|---:|
| Ventanas topográficas | 50 | 50 |
| Teselas NASADEM nuevas | 20 | 7 |
| Ventanas multifuente nuevas | 6 | 6 |
| Imágenes RGB nuevas | 6 | 6 (Yungay se reutilizó del paquete v2) |

## Consecuencias

- El resultado puede ser incómodo y se muestra igual: los tres candidatos chilenos puntúan más que Yungay y los argentinos, menos.
- La diferencia de los argentinos se debe sobre todo al contexto climático POWER (562–767 mm/año), que describe una celda MERRA-2 de 0,5° × 0,625° y no lluvia medida en el sitio. No se cambiaron pesos ni valores para corregirlo.
- Cuatro ventanas chilenas con muy alta prioridad topográfica quedaron fuera por contener coordenadas del transecto de Navarro-González et al. (2003).
- El ZIP de entrega pasa a ~9,0 MB por las siete imágenes.
- Cambiar regiones, periodo, producto o transformación invalida la caché y exige nuevas consultas con credenciales.

## Qué no afirma esta decisión

- No hay análogos nuevos confirmados ni validación de campo, geológica o territorial.
- Una ventana de ~440 km² no es un terreno íntegramente libre ni apto: las imágenes muestran trazas y estructuras que deben contrastarse.
- Los tests verdes validan el software, no la equivalencia planetaria.
