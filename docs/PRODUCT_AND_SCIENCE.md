# Producto y ciencia

## Problema

“Parecido a Marte” no es una especificación de prueba. Equipos científicos y de ingeniería necesitan saber qué sitio terrestre reproduce condiciones relevantes para una actividad concreta, con qué evidencia, qué incertidumbre y qué debe validarse en terreno.

## Propuesta

AnalogOS Chile prioriza zonas terrestres para una prueba de movilidad, navegación y autonomía de rover marciano. Convierte datos planetarios, satelitales y nacionales en una recomendación auditable.

## Usuario principal

Responsable de planificar una campaña de pruebas que debe elegir dónde realizar reconocimiento sin confundir una preselección geoespacial con autorización, seguridad o aptitud definitiva.

## Flujo P0

1. Ver el perfil `Mars Rover Screening v2` y sus límites.
2. Explorar 3–5 zonas candidatas en Chile.
3. Revisar similitud, confianza y factibilidad por separado.
4. Abrir el desglose por criterio y sus fuentes.
5. Comparar hasta tres candidatos.
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
