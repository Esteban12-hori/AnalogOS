# Pitch de 3 minutos

## 0:00–0:25 — Problema

“Este lugar parece Marte” suena atractivo, pero no es una especificación de ingeniería. Si un equipo quiere probar un rover necesita responder algo mucho más concreto: ¿qué sitio reproduce las condiciones relevantes para percepción, tracción y navegación, con qué evidencia, y qué todavía debe validarse?

## 0:25–0:50 — Solución

Creamos AnalogOS Chile, un sistema de decisión geoespacial explicable. No declara que un lugar sea Marte. Prioriza dónde conviene investigar para una prueba definida y separa tres preguntas que normalmente se mezclan: similitud física, confianza de la evidencia y factibilidad de terreno.

## 0:50–1:30 — Ciencia

Tomamos una ventana regional alrededor de Jezero usando MOLA de NASA PDS. Como MOLA está a cientos de metros por píxel, no la comparamos directamente con NASADEM a 30 metros: primero construimos el mosaico completo y luego lo agregamos hasta aproximadamente 480 metros. Así calculamos, a la misma escala, pendiente, diferencia entre celdas vecinas y relieve local.

Luego usamos doce mosaicos mensuales Sentinel-2 L2A para medir superficie no vegetada, vegetación, agua, NDVI y BSI con máscara de nubes. NASA POWER añade contexto regional. Geología sigue fuera del score: no inventamos valores para completar una pantalla.

## 1:30–2:15 — Resultado y demo

El ranking preliminar coloca a Pampa Yungay primero con 75,67 de similitud, seguido por un sector interior del Cordón de Domeyko con 71,60 y Pampa María Elena con 49,99. Yungay lidera por la combinación de terreno comparable, aridez y continuidad no vegetada.

La confianza ahora ronda 77,4 porque el suelo expuesto dejó de ser un supuesto. La factibilidad, sin embargo, sigue requiriendo revisión. El sistema deja visibles geología, restricciones territoriales y verificaciones de campo. Cada fuente abre su URL y cada artefacto guarda versión, transformación y checksum.

## 2:15–2:45 — Diferenciador

El score es determinista: una media geométrica ponderada que penaliza criterios débiles. La confianza nunca altera la similitud. La factibilidad nunca se deduce del parecido con Marte. Además, perturbamos los pesos ±20 % y mostramos estabilidad. La app funciona offline con un snapshot estático validado por contratos.

## 2:45–3:00 — Cierre

Nuestro siguiente paso es ampliar el screening a todo Chile e incorporar geología SERNAGEOMIN, restricciones oficiales de IDE Chile y validación de campo. AnalogOS transforma una impresión visual en una hipótesis medible, auditable y lista para validación. No dice “este lugar es Marte”; dice “investiguemos este lugar, por estas razones y con estos límites”.
