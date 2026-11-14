# Producto y ciencia

## Problema

“Parecido a Marte” no es una especificación de prueba. Equipos científicos y de ingeniería necesitan saber qué sitio terrestre reproduce condiciones relevantes para una actividad concreta, con qué evidencia, qué incertidumbre y qué debe validarse en terreno.

## Propuesta

AnalogOS prioriza zonas terrestres para una prueba de movilidad, navegación y autonomía de rover marciano. Convierte datos planetarios y satelitales en una preselección auditable. Tiene visión global y un piloto ejecutado en dos regiones de Chile y Argentina; las restricciones territoriales siguen pendientes de cruce oficial.

## Usuario principal

Responsable de planificar una campaña de pruebas que debe elegir dónde realizar reconocimiento sin confundir una preselección geoespacial con autorización, seguridad o aptitud definitiva.

## Flujo P0

1. Ver el perfil `mars-rover-screening-v3` y sus límites (mismas fórmulas y pesos v2).
2. Entender el barrido de 50 ventanas y explorar seis candidatos, filtrando Chile o Argentina. Yungay se mantiene como referencia conocida aparte.
3. Revisar similitud, confianza y factibilidad por separado.
4. Abrir el desglose por criterio y sus fuentes.
5. Comparar candidatos y referencia, conservando sus roles y antecedentes.
6. Entender dónde falla la analogía.
7. Exportar una ficha con verificaciones de terreno.

## Perfil científico P0

El perfil intenta representar condiciones relevantes para percepción, tracción, navegación y autonomía:

- pendiente;
- rugosidad y variabilidad de relieve;
- fracción de suelo expuesto;
- baja cobertura vegetal;
- aridez como contexto;
- variabilidad térmica superficial, si existe un producto defendible;
- clase geológica simplificada y trazable;
- continuidad espacial suficiente.

La referencia marciana se deriva de PDS/MOLA. Las variables terrestres deben documentar producto, periodo, resolución, CRS, unidades y transformaciones.

## Lo que sí representa

- terreno y obstáculos a la escala disponible;
- exposición superficial;
- aislamiento y algunos desafíos operacionales;
- condiciones ambientales terrestres que sirven como proxy de prueba.

## Lo que no representa

- gravedad marciana;
- atmósfera o presión;
- radiación espacial;
- química exacta del regolito;
- temperatura marciana completa;
- permisos, seguridad o aptitud oficial.

## Salidas independientes

### Similitud

Ajuste físico al perfil de prueba. Rango 0–100.

### Confianza

Calidad y suficiencia de la evidencia. Rango 0–100. Debe disminuir por NoData, resolución inadecuada, antigüedad, transformaciones excesivas o inconsistencias.

### Factibilidad

Clasificación preliminar, nunca promesa: `unknown`, `requires_review`, `potentially_feasible`, `excluded`.

### Estabilidad

Indicador 0–100 calculado como `100 − peor cambio absoluto del score` al perturbar cada peso individualmente ±20 % y renormalizar. No representa incertidumbre total ni validación científica.

## Resultado mínimo por candidato

- polígono generalizado;
- área aproximada;
- similitud y desglose;
- confianza y datos faltantes;
- factibilidad preliminar y advertencias;
- qué es análogo;
- dónde falla;
- para qué prueba sirve;
- qué verificar en terreno;
- evidencias y fuentes.

## Criterio de novedad

Atacama es un benchmark. Un candidato “nuevo” debe estar fuera de la lista de análogos obvios o aportar una caracterización/uso de prueba que no sea trivial. La novedad se explica; no se fuerza con el score.

## Mensaje de producto

AnalogOS no dice “este lugar es Marte”. Dice “este lugar merece ser investigado para esta prueba, por estas razones, con estas limitaciones”.

## Piloto Chile–Argentina (v3)

Desde el snapshot v3 la marca visible es **AnalogOS** y el producto busca en lugar de listar. La visión es global; lo ejecutado es un piloto acotado.

- **Qué hace:** recorre una rejilla de 50 ventanas de ~20 km en dos regiones de prueba, las ordena por prioridad topográfica, excluye las que contienen coordenadas de muestreo publicadas y caracteriza hasta seis con todas las fuentes.
- **Roles:** cada sitio es `candidate` (sale de la búsqueda) o `reference` (análogo conocido, fuera del ranking). Yungay es la referencia.
- **Novedad:** el criterio ya no es «encontrar un sitio nuevo». El sistema registra antecedentes y nunca declara una ventana como nueva; el estado de revisión bibliográfica va separado del rol.
- **Lo que no representa:** una búsqueda nacional o global, un terreno libre o apto, ni una comparación de calidad entre un candidato y un sitio con décadas de trabajo de campo.

Decisión en `docs/decisions/ADR-008-global-discovery-pilot.md`; resultados en `docs/DISCOVERY_REPORT.md`.

## Planificador de pruebas (M8)

Usuario: responsable de una campaña de robótica planetaria. Decisión: «para este ensayo, ¿qué sector merece reconocimiento, por qué, qué lo descarta y qué falta medir?».

- **Definir una prueba**: texto opcional + requisitos editables (pendiente mediana regional, rugosidad, relieve, fracción no vegetada, área del polígono, país) o pedidos sin medición (tracción, tamaño de roca, permisos, coste, lluvia local, cobertura móvil, pendiente puntual…). El usuario confirma y recién entonces se evalúa.
- **Evaluar un sector**: una de las siete áreas con evidencia, un punto o un rectángulo. Un punto solo sugiere la ventana que lo contiene; un rectángulo distinto de la ventana, o fuera de ellas, produce un informe de evidencia insuficiente con la solicitud exportable. No hay vecino más cercano ni adquisición nueva.
- **Resultado**: priorizado para reconocimiento, no cumple requisitos, evidencia insuficiente u objetivo no soportado; por requisito, valor observado, escala, periodo y evidencia. Similitud, confianza y estabilidad son las del snapshot v3, sin recalcular; la factibilidad territorial permanece pendiente. Es válido que ninguna área quede priorizada. Yungay aparece como referencia conocida.
- **Lo que no dice**: no aprueba, autoriza ni garantiza seguridad; el área es la extensión del polígono, no superficie libre; SCL no prueba tracción; POWER no aprueba lluvia local. Los requisitos son condiciones del ensayo del usuario, no estándares de NASA.
- **Primer perfil soportado**: rover marciano con referencia Jezero. «Otro objetivo» conserva el pedido sin calcular ni recomendar.
