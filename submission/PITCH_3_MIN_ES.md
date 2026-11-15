# Pitch de 3 minutos

[English](PITCH_3_MIN_EN.md) · **Español**

## 0:00–0:25 — Problema

«Este lugar parece Marte» suena atractivo, pero no es una especificación de ingeniería. Un equipo que quiere probar un rover necesita algo más concreto: qué sitio reproduce las condiciones relevantes para percepción, tracción y navegación, con qué evidencia y qué falta validar. Y señalar análogos ya famosos, como Yungay, no demuestra que sepamos buscar.

## 0:25–0:50 — Solución

Creamos AnalogOS, un sistema de exploración de análogos planetarios. No declara que un lugar sea Marte. Busca dónde conviene investigar para una prueba definida y separa tres preguntas que suelen mezclarse: similitud física, confianza de la evidencia y factibilidad de terreno. La visión es global; hoy mostramos un piloto acotado en Chile y Argentina.

## 0:50–1:30 — Ciencia

Tomamos como referencia el entorno de Jezero con MOLA de NASA PDS. Recorrimos una rejilla de 50 ventanas de unos 20 kilómetros en dos regiones de prueba y calculamos su topografía NASADEM a la misma escala que MOLA, cerca de 480 metros. Con eso ordenamos la preselección.

Después contrastamos cada ventana con antecedentes publicados. Cuatro contenían coordenadas de muestreo de un estudio de 2003 y quedaron fuera del ranking, a la vista. Solo las seis preseleccionadas recibieron doce mosaicos mensuales Sentinel-2 y contexto climático NASA POWER. La cartografía geológica oficial ya orienta preguntas de reconocimiento, pero la geología sigue fuera del score: no inventamos valores calibrados.

## 1:30–2:15 — Resultado y demo

Los tres candidatos chilenos obtienen entre 90 y 95 de similitud, por encima de Yungay, que recalculamos como referencia conocida con 75,67. Los tres argentinos quedan entre 49 y 64.

Hay que leerlo bien. Ningún candidato es un análogo nuevo confirmado: ambas regiones tienen antecedentes y todos requieren revisión. Los argentinos bajan sobre todo por un dato climático de resolución gruesa, que describe una celda mayor que la ventana, y lo decimos en la ficha. Las imágenes satelitales muestran trazas y estructuras que hay que contrastar con cartografía oficial.

## 2:15–2:45 — Diferenciador

El sistema busca en lugar de listar: la rejilla sale de un algoritmo y cada descarte queda registrado con su motivo. Nunca oculta un antecedente para aparentar un descubrimiento. El score es determinista, la confianza no altera la similitud y la factibilidad no se deduce del parecido con Marte. El flujo manual funciona offline con un snapshot validado por contratos. La IA opcional propone requisitos y destaca evidencia existente; el usuario confirma los requisitos y el motor los evalúa.

## 2:45–3:00 — Cierre

Los siguientes pasos son el reconocimiento en terreno, la calibración geológica, las comprobaciones territoriales, la verificación del clima con datos locales y la ampliación a más regiones. AnalogOS transforma una impresión visual en una hipótesis medible y auditable. No dice «este lugar es Marte»; dice «investiguemos este lugar, por estas razones y con estos límites».
