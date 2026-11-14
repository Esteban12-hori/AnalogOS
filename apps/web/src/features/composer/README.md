# features/composer · incremento 9

Composer de misión, tarjeta «Tu misión» (niveles, Deshacer, historial) y la parte del composer
en la coreografía de resultados. Especificación: `docs/UX_REDESIGN.md` §3.2, §2.3 C/D y §5.1;
contrato del paralelo: `docs/BUILD_CONTRACTS.md` §2.7.

## Qué hace

1. **Interpreta** el texto: `analysis.interpretWithLktron` si `LKTRON_ENABLED`; si no (o si lktron
   no está disponible o devuelve algo inválido), `engine.matchMissionDemo`, rotulado «DEMO · sin IA».
2. **Valida** (fase `profile`): `checkMissionInterpretation` (Ajv precompilado) más las reglas que el
   esquema no expresa (ids del perfil base sin repetir, ausentes = 0 «no mencionado», sin criterios de
   terreno → error neutro). Arma el perfil con `engine.profileFromLevels` (needs_calibration).
3. **Puntúa** (fase `scoring`): `engine.scoreMission`. El orden y el % son del motor.
4. **Publica** en T0: `missionStore` (`revision + 1`), el #1 en vista previa
   (`uiActions.select(id, 'evaluated', true)`), fase `analysis` y **un solo** `announce()`:
   «3 lugares ordenados para tu misión. Primero: ‹nombre›, ‹%› de similitud».

Es el único escritor de `state/mission.ts`. `analysis` cierra la fase con `done`.

## Espera (§2.3 C)

Enviar → Detener al instante (también mientras carga el chunk de misión). Desde 300 ms: órbita de
`boot` (`OrbitLoader`, alrededor del globo si la vista global está en pantalla, por portal en
`stage.overlay`) y luz del borde del composer, en fase, 2 vueltas de 2,4 s y luego fija. 3 s:
contador. 10 s: «Está tardando más de lo normal» con Cancelar y Usar perfil base. 20 s: tiempo
agotado con Reintentar. Esc, Detener o un envío nuevo cancelan o reemplazan la corrida
(`AbortController`). Los temporizadores usan `engine.PHASE_THRESHOLDS`; nunca hay estado por cuadro.

## «Tu misión»

Panel izquierdo ≥1440 (`left.mission`), popover del composer <1440 y pestaña de S2
(`full.mission`). Muestra el texto con los resaltados DEMO, el resumen de la IA (✦ + regla de hielo),
los 7 criterios con nivel y peso (nivel ÷ suma) frente al perfil base, la cobertura del motor, lo
pedido sin datos y los supuestos. Editar niveles (radios nativos) recalcula sin IA; Deshacer
restaura el estado anterior; los perfiles predefinidos del motor aparecen como chips «Refinar» y en
la tarjeta. El historial vive en `localStorage` de este navegador (comodidad local, en try/catch) y
guarda niveles, no cifras: al restaurar, el motor vuelve a calcular.

## Peso

Chunk principal: `Composer`, `MissionComposer`, `MissionCard` (enlace diferido), store privado y
rótulos. Chunk de misión: `missionRun` (motor, contratos), `MissionPanel`, `ComposerExtras`.
Un formulario diferido hacía que rolldown partiera React y el armazón en chunks comunes (más
peticiones y más bytes al arrancar), por eso el formulario va en el chunk principal. Desde la
integración, `vite.config.ts` agrupa todo lo estático en un único chunk inicial (`$initial`), así
que ese reparto ya no ocurre; diferir el formulario volvería a ser una opción para ahorrar peso.

## Pruebas

`model.test.ts`, `history.test.ts`, `missionRun.test.ts` (dobles del motor y de lktron con reloj
falso, más un caso con el motor real de `features/engine`) y `Composer.test.tsx` (SSR).
