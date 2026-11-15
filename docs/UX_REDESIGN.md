<!-- Generado por el workflow analogos-ux-components, 2026-11-14. Integración publicada en dev; ADR-013/014 aceptados por Codex el 2026-11-15. Ver CODEX_INTEGRATION_REVIEW.md para el alcance y los pendientes. -->

# AnalogOS Chile · Decisión final de diseño (rediseño Explorar / Misión)

Este documento sintetiza las 8 propuestas. Las cifras están verificadas contra `artifacts/science-v2/candidate-details.json`, `artifacts/science-v2/analysis-summary.json` y `config/mission_profiles/mars-rover-screening-v2.json` (rama dev, 857b05f).

Las URLs de 21st son las que citan las propuestas. Sus `.md` públicos solo traen metadatos, porque el código exige API key. Por eso se adoptan patrones, no código.

> **Integración con dev (2026-11-14, ADR-013).** La interfaz descrita aquí (escenario fijo, globo con
> paso a 2D, ●◆○, carrusel, líneas Tesla, riel, composer, Lectura, «Órbita honesta», hoja móvil) es la
> interfaz vigente, ahora sobre el snapshot científico **v3 Chile–Argentina** del equipo (ADR-008:
> Yungay es referencia conocida, «REF», fuera del ranking) y sobre su **planificador** (ADR-009:
> requisitos confirmados, `evaluateMission`, exportación JSON, IA de Anthropic solo en el servidor).
> Quedan **sustituidos**: el recálculo por pesos en el cliente (ADR-015, antes ADR-011 y ADR-009), el canal lktron
> y los contratos de §5 (ADR-012, antes ADR-010), los perfiles predefinidos, la coincidencia «DEMO · sin
> IA» y la prosa pregenerada. Misión ya no calcula ningún %: muestra estados, puestos de la evaluación,
> preferencias cumplidas y la similitud v3 sin recalcular. El detalle de la integración está en
> `docs/INTEGRATION_PLAN.md`; las secciones afectadas llevan una nota.

---

## 0. Decisiones principales

1. **Escenario fijo** (100dvh, sin scroll del documento). La Tierra queda siempre al fondo y se gira con un dedo.
2. **Una regla espacial para todo el sitio:**
   - centro = dónde (globo y líneas);
   - derecha = el lugar (métricas);
   - izquierda = tu misión y por qué (solo desde 1440 px);
   - abajo = elegir y escribir, en un único dock.
3. **Por debajo de 1100 px hay una sola hoja con 3 detents:** S0 bandeja, S1 lugar, S2 ficha. No se apilan hojas.
4. **Un solo sistema de movimiento** (6 curvas, 6 duraciones, 2 escalonados). Coreografía de resultados: globo → líneas → riel → análisis IA. Los datos nunca esperan a la animación decorativa.
5. **Loading WOW = «Órbita honesta».** El planeta es el loader y solo marca hitos reales. La misma órbita vuelve mientras la IA interpreta.
6. **Color con significado fijo.** Naranja = Marte como dato (Jezero). Selección = hielo + azul. Error = neutro con ✕. Glifos: ■ = Jezero, ◆ = análogo emblemático.
7. **Ningún bucle dura más de 4,8 s.** Ningún número se interpola ni cuenta.
8. **La IA nunca produce cifras ni ordena.** *(Tras ADR-013: la IA del equipo solo propone requisitos sin confirmar o selecciona IDs de la evaluación; el motor determinista del equipo produce toda cifra, todo orden y todo estado.)*
9. **Misión funciona sin red.** *(Tras ADR-013: requisitos manuales o «Usar ejemplo», confirmación y evaluación determinista locales; la IA es una mejora opcional con botón explícito. Ya no hay perfiles predefinidos, «DEMO · sin IA» ni prosa pregenerada.)*
10. **0 dependencias npm nuevas.** Presupuesto: +≤12 KB gz en el chunk principal, ≤2 KB gz en línea en el HTML, el resto diferido.
11. **ADR** en `docs/decisions/` (renumerados al integrar con dev, que ya ocupaba ADR-008 y ADR-009):
    - ADR-014: escenario fijo y hoja (antes ADR-010 y ADR-008; propuesto).
    - ADR-015: recálculo determinista en cliente para perfiles de misión (antes ADR-011 y ADR-009; **sustituido por ADR-009 del equipo**).
    - ADR-012: IA opcional, fuera del flujo central (antes ADR-010; **sustituido por ADR-009 §7–9**).
    - ADR-013: integración del rediseño con el planificador, los datos v3 y la IA del equipo (propuesto).
    - (propuesta) MapLibre globe como motor único, después de la hackatón.

---

## 1. Contradicciones entre propuestas y cómo se resuelven

| # | Choque | Entre | Resolución |
|---|---|---|---|
| 1 | ¿El chat va encima o debajo del carrusel de lugares? | Globo, Carrusel y Loading lo ponen encima; Barra, Layout e IA, debajo | Un solo dock de vidrio: carrusel arriba y composer pegado al borde inferior (cerca del pulgar y del teclado). Los resultados aparecen sobre lo que se escribió. |
| 2 | Columna izquierda pedida por tres piezas: tarjeta «Tu misión», panel «Lectura IA» y columna de etiquetas Tesla. Además, Loading ponía perfil y análisis a la derecha | Barra, IA, Tesla, Loading | Desde 1440 px: un panel izquierdo «Misión» con dos secciones. Entre 1100 y 1439 px no hay panel izquierdo: «Tu misión» es un popover del composer y la Lectura es una pestaña del riel. Las etiquetas Tesla eligen el lado con más espacio dentro del área segura. |
| 3 | Ocho breakpoints distintos (560, 760, 768, 900, 1024, 1100, 1280…) | Todas | Tres tramos: ≥1440, 1100–1439 y <1100. Con alto <860 px se usan variantes compactas. La densidad del carrusel se ajusta con container query. |
| 4 | Cinco hojas distintas en móvil | Layout, Carrusel, Métricas, IA, Barra | Una sola hoja (S0/S1/S2). IA y Tu misión son secciones de S2. «Ver lista» cambia el contenido de la hoja en vez de abrir otra. |
| 5 | Líneas Tesla en móvil: hasta 3 etiquetas o una sola línea al slot | Layout frente a Tesla y Métricas | Una sola línea. Termina en el borde superior de la hoja, alineada con el slot activo, y no cruza contenido. |
| 6 | Al llegar resultados: ¿volar al #1 o no mover la cámara? | Globo frente a Loading | El #1 queda en selección de vista previa, sin mover el foco. Solo se vuela si el usuario no tocó la cámara durante la espera. Si la tocó, aparece el chip «Centrar en ‹#1›». |
| 7 | Números que «ruedan» del valor anterior al nuevo | Métricas frente a las demás | Prohibido interpolar cifras. Se usa un fundido con desplazamiento de 4 px que indica si subió o bajó. Arcos y barras sí pueden transicionar. |
| 8 | Esqueletos y anillo de carga en bucle infinito, contra WCAG 2.2.2 | Carrusel, Métricas, IA, Barra | Regla global: ningún bucle supera 4,8 s. Durante la espera de la IA hay un solo latido (órbita + luz del composer, en fase). Los esqueletos son estáticos. |
| 9 | El naranja significaba a la vez selección (código actual y Globo), Jezero (Métricas y ScoreBreakdown) y error (Barra) | Varias | Naranja solo para Marte como dato, más el acento del logo. Selección = anillo #EAF4FA + borde azul. Error = neutro + ✕ + texto. |
| 10 | ◆ significaba análogo emblemático y también Jezero | Globo y Carrusel frente a Métricas | ◆ = emblemático; ■ = Jezero. |
| 11 | «Limitante» (contribución más negativa) frente a «punto más débil» (similitud más baja). Con los datos reales no coinciden: en Yungay el limitante por contribución es Rugosidad (−0,091) y la similitud más baja es Relieve (63 %) | Métricas frente a IA | Un solo concepto: **Limitante = campo `contribution` del pipeline.** El tipo de hecho de la IA pasa de `weakest_in_site` a `limiting_factor`. |
| 12 | Pulsos en cuatro sitios (×3 al seleccionar, halo de aterrizaje, pulso por hover, anillo Tesla) | Globo, Loading, Carrusel, Tesla | Aterrizaje: un halo. Selección: el anillo del lugar emite un pulso y queda estático. Hover desde el carrusel: escala 1,2, sin pulso. |
| 13 | El carrusel entra al final del WOW o en cuanto el snapshot se valida | Carrusel frente a Loading | En cuanto el snapshot se valida: es la ruta accesible y no se retrasa contenido real. |
| 14 | Atenuación durante la espera: 35, 40, 45, 50 o 60 %, con o sin `inert` | Varias | Token `--o-busy: .45` con `aria-busy` y sin `inert`, para que el usuario mantenga el control. |
| 15 | Al seleccionar un ◆: tarjeta sobre el globo, riel o línea discontinua | Globo, Métricas/Carrusel, Tesla | Riel en estado compacto «Referencia mundial · por calcular», con su fuente. Sin líneas Tesla y con anillo discontinuo «zona aproximada». |
| 16 | «Desierto de Atacama»: ¿insignia sobre un ● o tarjeta propia «contiene los 3 sectores»? | Globo frente a Carrusel | Lo decide la geometría. Si el punto citado cae dentro de un polígono → insignia «coincide con». Si es una región → ◆ propio. La frase «contiene N sectores» solo se muestra si la respalda un test punto-en-polígono. |
| 17 | Contrato de la IA: validar `numbers_cited[]` o usar marcadores. También había dos juegos de fases | Métricas y Loading frente a IA | Marcadores (§5). Dos llamadas separadas. Las fases visibles las define la máquina de estados del cliente. |
| 18 | Sin red: ¿composer deshabilitado o modo demo? | Loading y Layout frente a Barra | Modo «DEMO · sin IA» activo, con coincidencias resaltadas. Así lo exige CLAUDE.md: el flujo central no depende de APIs externas. |
| 19 | Cinco formas distintas de pasar márgenes al escenario (`rightInset`, `--stage-inset-*`, `--rail-h`, `useStageInsets`, `padding-left`) | Globo, Layout, Carrusel, Tesla, IA | Un único store `stageLayout` (§2.1), aplicado cuando el layout se asienta. |
| 20 | Color del foco: #FF9A7C, «#fff» o #3FB4EC | Globo, Layout, resto | Se mantiene el token real de `styles.css`: `outline: 2px solid var(--blue-bright); outline-offset: 3px`. Dentro de contenedores con overflow, offset −2 px. |
| 21 | Barra y Tesla piden pausar la autorrotación | Barra, Tesla | No existe giro perpetuo, así que esas dependencias se eliminan. |
| 22 | Bocetos ASCII con cifras inventadas: «4,1° vs 3,8° · 92 %» (Layout), «2,1° · 81 %» (Carrusel) y confianza de Yungay «77,4» | Layout, Carrusel | Se usan datos reales: 3,2° vs 2,2° · 69 %, y la confianza de Yungay (77,45) se muestra como 77,5. Además, `formatScore` usa `maximumFractionDigits: 1`, por lo que María Elena (49,99) aparece hoy como «50». Hay que añadir `minimumFractionDigits: 1` a la similitud del lugar. |
| 23 | Ancho del riel derecho | Métricas, Layout, IA | `clamp(340px, 26vw, 380px)`. «Ver ficha completa» lo amplía a 520 px con pestañas: Métricas · Lectura IA · Señal · Método · Fuentes. |
| 24 | Cada componente traía su propia región `aria-live` | Todas | Una sola región `role=status` global con debounce de 300–600 ms, más `role=alert` para errores. Excepción: el carrusel de métricas en móvil, como indica el patrón APG. |
| 25 | ¿Hay un lugar seleccionado al entrar? | Carrusel, Layout, app actual | No. Explorar arranca sin selección: el globo es el protagonista y el riel queda cerrado. |

---

## 2. Sistema único

### 2.1 Espacio, breakpoints y estado compartido

| Tramo | Izquierda | Centro | Derecha | Abajo |
|---|---|---|---|---|
| ≥1440 | Panel «Misión» de 360 px (Tu misión + Lectura IA). En Explorar se ve solo la píldora «✦ Lectura». | Globo + líneas Tesla | Riel de métricas, solo con un lugar seleccionado | Dock entre los dos paneles |
| 1100–1439 | Sin panel; Tu misión es un popover del composer | Globo + líneas | Riel con pestañas «Métricas \| Lectura IA» | Dock |
| <1100 | — | Globo en el área libre | — | Hoja S0/S1/S2 (entre 760 y 1099 px, máximo 720 px de ancho y centrada). En horizontal con alto ≤500 px, hoja lateral de 360 px. |

- Los paneles laterales ocupan toda la altura y el dock vive entre ellos.
- Con alto <860 px: tarjetas de 112 px, filas de 44 px y 3 etiquetas Tesla.

**Store externo** (`useSyncExternalStore`), fuera del árbol de R3F para no re-renderizar el globo:

```ts
type UiState = {
  mode: 'explorar' | 'mision'
  selection: { siteId: string; kind: 'evaluated' | 'reference'; preview: boolean } | null
  hoverSiteId: string | null                  // canal ligero carrusel → globo
  activeCriterionId: string | null            // riel ↔ líneas ↔ fichas de la IA
  previewCriterionId: string | null
  stageInsets: { top: number; right: number; bottom: number; left: number } // solo al asentarse
  obstacles: readonly DOMRectReadOnly[]       // rects cacheados con ResizeObserver, para layoutLeaders
  missionPhase: 'idle'|'interpreting'|'profile'|'scoring'|'analysis'|'done'|'error'|'cancelled'
  introPhase: 'pending' | 'play' | 'done'
  cameraTouchedAt: number | null              // decide si los resultados pueden volar al #1
}
// stageAnchor {x, y, visible, mode} cambia en cada cuadro: se escribe por ref o variable CSS, no en el store.
```

`MapStage` pasa de `rightInset` a `insets {right, bottom}`. El globo aplica `setViewOffset` en x e y, y MapLibre aplica `setPadding`. Ambos se actualizan en `transitionend`, nunca en cada cuadro.

### 2.2 Movimiento: tokens y reglas

```css
:root {
  --ease-standard: cubic-bezier(.2, 0, 0, 1);    /* estado, hover, pestañas, atenuación */
  --ease-enter:    cubic-bezier(.2, .8, .2, 1);  /* entradas de UI (el riseIn actual) */
  --ease-emph:     cubic-bezier(.05, .7, .1, 1); /* entradas principales: arranque, aterrizaje, líneas */
  --ease-exit:     cubic-bezier(.4, 0, 1, 1);    /* salidas */
  --ease-sheet:    cubic-bezier(.32, .72, 0, 1); /* hoja, ficha 380→520, popovers */
  --ease-spring:   cubic-bezier(.3, 1.4, .5, 1); /* solo el pop de selección (liquid actual) */
  /* cámara (en JS): easeInOutCubic ≡ cubic-bezier(.65, 0, .35, 1) */
  --dur-1: 120ms; /* micro: hover, press */
  --dur-2: 200ms; /* estado: fundidos, chips, colapsos, pulgar del modo */
  --dur-3: 280ms; /* paneles, tarjetas, acordeón, cambio de modo */
  --dur-4: 400ms; /* hoja, dock, FLIP, pop de selección */
  --dur-5: 700ms; /* coreografía: onda de la órbita, líneas completas */
  --dur-6: 900ms; /* revelado: halo, anillo de similitud, atmósfera */
  --stagger-list: 50ms;  /* listas de 7 elementos como máximo */
  --stagger-rank: 120ms; /* aterrizaje 1→2→3: deja leer el orden */
  --loop-orbit: 2400ms;  /* 2 vueltas como máximo */
  --o-busy: .45;
  --o-dim: .5;
}
```

**Reglas:**

1. Solo se animan `transform` y `opacity`. En SVG pequeños también `stroke-dashoffset` y `clip-path`. Nunca `filter`, `blur`, `box-shadow`, `width` ni `height`. Excepción: `grid-template-rows` en acordeones dentro de `contain: layout paint`.
2. Ningún bucle dura más de 4,8 s. Después queda un estado estático con texto (fase y tiempo transcurrido).
3. Ninguna cifra se anima: aparece directamente con su valor final.
4. **Cámara:**
   - Duración = `clamp(650 + 7·Δθ° + 250·|log2(h1/h0)|, 650, 1800)` ms.
   - Arco de altitud si Δθ > 25°.
   - Cualquier input del usuario la cancela.
   - Durante el vuelo se suspenden `ZoomWatcher` y `onApproach`.
5. La manipulación directa (hoja, rotación, seguimiento de líneas) no lleva transición.
6. Un solo latido a la vez. Durante la espera de la IA solo se mueven la órbita, la luz del composer y un brillo de texto de 3 pasadas como máximo.
7. `prefers-reduced-motion` (en CSS y con `matchMedia` + listener):
   - sin translate, scale ni rotate;
   - opacidad en ≤150 ms o cambio instantáneo;
   - cámara en corte;
   - sin bucles, halos, pulsos ni trazos progresivos.
8. `will-change` solo mientras dura cada animación. Todo se pausa con `document.hidden`.

### 2.3 Coreografías

**A · Arranque.** Completa una vez por sesión; `?intro=full` la fuerza para grabar el video.

| Momento | Qué pasa | Duración / curva |
|---|---|---|
| t = 0 (solo HTML) | Aparece el anillo orbital alrededor del póster (escritorio) o de la silueta CSS (móvil). El satélite gira. La bitácora muestra sus 3 líneas. | 600 ms emph; satélite 2400 ms lineal ×2 |
| Snapshot validado | La bitácora marca ✓. El dock sube, las tarjetas entran y se dibujan los anillos de similitud. | Dock 400 enter; escalonado 50 ms (máx. 6); anillos 900 ms |
| `onReady` del globo (`intro: play`) | El anillo hace una onda (escala 1→1,06 y se apaga). La atmósfera brilla 0,6→1,0→0,6 con `invalidate` acotado. Fundido del póster al 3D (450 ms, ya existe). | 700 emph / 900 |
| +150 ms | Se traza el contorno de Chile | 900 ms standard |
| +300 ms | Aterrizan los ● en orden 1→2→3, cada uno con un halo de zona. Después aparecen los ◆, sin halo. | 320 ms emph, escalonado 120 ms; halo 900 ms |
| ~1,6 s o primera interacción | La bitácora se pliega en el chip «● Snapshot v2 · 3 evaluados · 8 por calcular» | 280 ms standard |

- La cámara no se mueve: así se respeta el póster pixel-perfect.
- Cualquier pointerdown, rueda o tecla salta al estado final.
- Si todo carga desde caché en <300 ms: sin órbita ni bitácora, solo el aterrizaje.

**B · Selección manual de un lugar.**
- En 0 ms: pop de la tarjeta (400 ms spring) y el riel abre con los datos (280 ms enter, filas cada 50 ms).
- En paralelo vuela la cámara.
- Al llegar: el anillo del lugar aparece (200 ms) con un pulso (900 ms), luego se trazan las líneas (360 ms emph, cada 50 ms) y entran las etiquetas (220 ms).
- Los otros lugares bajan a `--o-dim`.

**C · Espera de la IA.**
- 0–300 ms: nada, para evitar parpadeo. Solo el botón pasa de Enviar a Detener (150 ms).
- Desde 300 ms: la órbita (solo si la vista global está en pantalla) y la luz del borde del composer, ambas de 2400 ms ×2 y en fase.
- Línea de estado con la fase real. Los resultados previos quedan a `--o-busy` con `aria-busy`.
- 3 s: aparece el contador.
- 10 s: «Está tardando más de lo normal» con [Cancelar] y [Usar perfil base].
- 20 s: tiempo agotado con [Reintentar].

**D · Resultados.** Los datos aparecen primero; la animación decorativa los sigue.

| Orden | Qué | Cuándo |
|---|---|---|
| 1 · Globo | La órbita se cierra. Halos en el orden nuevo (cada 120 ms). El #1 queda en vista previa. Vuelo al #1 solo si `cameraTouchedAt` es null. | T0 (vuelo de 650–1100 ms) |
| Datos | El carrusel se reordena con FLIP y redibuja los anillos. El % aparece ya final. | T0 (400 / 700 ms) |
| 2 · Líneas | Anillo, pulso, líneas y etiquetas | Al llegar la cámara (≤700 ms) |
| 3 · Riel | Métricas del #1 y capa de hechos de la Lectura | Al terminar las líneas |
| 4 · Análisis IA | Cada bloque validado entra con 240 ms, cada 50 ms, con cola de 6 como máximo. Al terminar, un pulso del ✦. | Cuando responde lktron |

Si no hay vuelo (el usuario movió la cámara, o hay reduced motion), todo aparece en T0 solo por opacidad. Hay un único anuncio: «3 lugares ordenados para tu misión. Primero: ‹nombre›, ‹%› de similitud».

**E · Cambio de modo.**
- El pulgar CSS se desliza en 200 ms.
- El contenido del dock sale en 120 ms y el nuevo entra en 200 ms, 60 ms después.
- El escenario nunca se vuelve a montar.

### 2.4 Color, glifos, líneas, tipografía y vidrio

| Rol | Valor | Uso | Prohibido |
|---|---|---|---|
| Tierra / sector / similitud | `--blue #0297DE`, `--blue-bright #3FB4EC` | valores del sector, anillos de similitud, líneas Tesla, foco | — |
| Marte (Jezero, MOLA) | `--orange #FC734D` (trazos), `--orange-bright #FF9A7C` (texto) | el valor marciano; acento del logo | selección, error, alerta |
| Confianza | `--ice #CFE9F7` | barra de confianza | — |
| Selección | anillo `#EAF4FA` + `--blue-line` + acento superior de 2 px + «◉ en el globo» | el lugar elegido | naranja |
| Pendiente / sin datos | `--muted-2 #6F889A`, trazo discontinuo | por calcular, sin datos, zona aproximada | números de relleno |
| Error | `--text` + ✕ + borde `--muted`, `role=alert` | — | rojo o naranja |
| IA | ✦ + rótulo «Interpretación de IA» + regla lateral de 2 px `--ice` al 50 % | texto generado | aparecer junto a un % como si la IA lo hubiera calculado |

**Glifos:**

| Glifo | Significado |
|---|---|
| ● | lugar evaluado / valor del sector |
| ◆ | análogo emblemático, por calcular |
| ○ | datos insuficientes |
| ■ | Jezero |
| ┆ | regla del perfil |
| ✦ | solo IA |
| ◉ | en el globo |
| ⬡ | sector (área, no pin) |
| ↗ / ↘ | más / menos exigente que Jezero |
| ↑ / ↓ | cambio de peso |
| ✓ / ✕ | hito cumplido / fallido |

**Líneas.** Sólida = dato. Discontinua = sin datos, por calcular o zona aproximada, en todo el sitio. Los rótulos de ranking actuales, que usan línea discontinua, pasan a sólidos.

**Tipografía.**
- Familia actual, más `var(--mono)` para bitácora y fichas de cifras.
- Escala: 10 (mínimo en escritorio; 11 en móvil), 11 en versalitas +0,08em, 12, 13, 15 (cuerpo), 18 (valor de métrica), 23 (% del lugar).
- Todas las cifras con `tabular-nums` y formato es-CL.
- Similitud del lugar con 1 decimal fijo. Similitud del criterio en entero; el valor exacto solo en «Método».
- Se eliminan los textos de 8–9 px (`.globe-label`, `.sb-note`, `.marker-score`).

**Vidrio.**
- Escritorio: como máximo 3 superficies con `backdrop-filter` (panel izquierdo, riel, dock).
- Móvil: solo 1 (la hoja), con blur ≤12 px y tinte ≥ .86. `data-lowfx` la cambia a tinte sólido.
- Marcadores, etiquetas, tarjetas y chips: fondo `rgba(2,7,10,.84–.92)` sin blur.
- Nada de `url(#lg-refract)` sobre el escenario. La barra superior lleva tinte sin blur.

---

## 3. Decisión final por componente

### 3.1 Globo y Explorar: opción A (capa única de marcadores sobre R3F, con paso a MapLibre)

**Qué se construye:**
- Una capa de marcadores que se proyecta en `useFrame` con frameloop `demand`.
- Visibilidad continua según la orientación (`smoothstep(.05, .25)`).
- Agrupación cuando los marcadores quedan a menos de 36 px: un chip con conteos por tipo, nunca promedios.
- Presupuesto de rótulos y `stageAnchor` publicado para las líneas.
- En el 2D, agrupación nativa (`cluster:true`) con el mismo estilo de marcador.
- Vuelo con arco de altitud.
- Teclado: flechas 10°, Shift 30°, + / −, Inicio. Botones + − ⌂ y doble clic.

**Ajustes:**
- Brillo de atmósfera 0,6→1→0,6 (y no 0→0,6, para no saltar desde el póster).
- Selección en hielo y azul.
- Un pulso al seleccionar, no tres.
- Hover desde el carrusel = escala, no pulso.
- Rótulos de ranking con línea sólida.

**Descartado:** cobe, react-globe.gl y el giro perpetuo.

**21st:** [cobe-globe](https://21st.dev/@shuding/components/cobe-globe.md) · [cobe-globe-pulse](https://21st.dev/@shuding/components/cobe-globe-pulse.md) · [cobe-globe-interactive](https://21st.dev/@shuding/components/cobe-globe-interactive.md) · [interactive-globe-explorer](https://21st.dev/@support_596fe4b8/components/interactive-globe-explorer.md) · [flag-globe](https://21st.dev/@dhxwhy/components/flag-globe.md) · [mapcn-marker-label](https://21st.dev/@mapcn/components/mapcn-marker-label.md) · [3d-globe](https://21st.dev/@manuarora700/components/3d-globe.md)

### 3.2 Barra de misión: opción A (dock con perfil estructurado y editable)

> **Tras ADR-013.** El dock es una capa sobre el planificador del equipo: «Enviar» abre «Tu misión» en
> el paso de requisitos con el brief cargado (hasta 3000 caracteres) y **no llama a la IA**. «Tu misión»
> monta `RequirementEditor`, `ScopePicker`, `ConfirmSummary` y `ResultView` compacto del equipo. Los
> chips «Refinar» son «Usar ejemplo», «Añadir requisito: pendiente / rugosidad / relieve / suelo
> desnudo / área / país» (sin valor) y «Evaluar un sector…». La espera solo existe con «Proponer
> requisitos con IA»: órbita, contador a los 3 s, aviso a los 10 s y «Cancelar» (corte del cliente a
> los 45 s). Lo que sigue describe la versión anterior con niveles y pesos, ya sustituida.

**Qué se construye:**
- Es la fila inferior del dock.
- **En Explorar:** una píldora «✦ Describe el trabajo que quieres probar para Marte…», que también se abre con la tecla «/».
- **En Misión:**
  - textarea de 1 a 4 líneas;
  - recientes (⟲);
  - botón Enviar/Detener;
  - pastilla con el perfil activo.
- **«Tu misión»:**
  - Ubicación según el tramo: panel desde 1440 px, popover entre 1100 y 1439 px, sección de S2 en móvil.
  - Cuatro niveles por criterio: Clave 3 / Importante 2 / Menor 1 / Excluir 0. El peso es nivel ÷ suma de niveles.
  - Botón Deshacer.

**Ajustes:**
- Error en tono neutro.
- La luz del borde da 2 vueltas como máximo, en fase con la órbita.
- Los chips «Refinar» aparecen al enfocar el composer o en el panel; el dock no crece.
- «¿Por qué este orden?» abre la Lectura.
- Sin red, modo «DEMO · sin IA».

**Si no se aprueba ADR-009:** solo perfiles precalculados, y la edición de pesos queda desactivada con «por calcular».

**21st:** [ai-input-with-suggestions](https://21st.dev/@kokonutd/components/ai-input-with-suggestions.md) · [ai-input-with-loading](https://21st.dev/@kokonutd/components/ai-input-with-loading.md) · [ai-composer](https://21st.dev/@aakashmehra/components/ai-composer.md) · [prompt-suggestion](https://21st.dev/@ibelick/components/prompt-suggestion.md) · [plan](https://21st.dev/@aadixc0de/components/plan.md) · [prompt-composer](https://21st.dev/@cult-ui/components/prompt-composer.md) (solo el borde) · [agent-chat/error](https://21st.dev/@serafimcloud/components/agent-chat/error.md)

### 3.3 Loading WOW: opción B, «Órbita honesta»

**Qué se construye:**
- **Arranque.** El plugin `loadingHints` pinta en el HTML el anillo, el satélite y la bitácora de hitos reales. Luego hay un revelado de ~1,6 s.
- **Espera de la IA.** Vuelve la misma órbita, junto con la luz del composer, las fases reales, el contador y la opción de cancelar.

**Lo que se incorpora de otras propuestas:**
- el contorno de Chile;
- el aterrizaje unificado con el Globo;
- el carrusel que entra en cuanto el snapshot se valida;
- el parámetro `?intro=full` para grabar el video.

**Descartado:** radar, cortina de preloader y orbe de partículas.

**21st:** [satellite-ring](https://21st.dev/@loading-ui/components/satellite-ring.md) · [logo-trace-loader](https://21st.dev/@dqnamo/components/logo-trace-loader.md) · [staged-progress-bar](https://21st.dev/@dhxwhy/components/staged-progress-bar.md) · [loading-state](https://21st.dev/@theshanelevine/components/loading-state.md) · [busy](https://21st.dev/@zweiundeins/components/busy/skeleton-lines.md) (300 ms de retraso / 600 ms mínimo) · [gradient-shimmer](https://21st.dev/@zanwei/components/gradient-shimmer.md) (≤3 pasadas) · [cobe-globe-pulse](https://21st.dev/@shuding/components/cobe-globe-pulse.md)

### 3.4 Líneas de métricas estilo Tesla: opción B (capa en espacio de pantalla); en móvil, una sola línea

**Funciones puras:**
- `pickPrincipalMetrics`: las 4 métricas de mayor peso; los empates se resuelven por el orden canónico.
- `layoutLeaders`:
  - columna de etiquetas sin cruces y dentro del área segura;
  - se degrada de 4 a 3, 2 y 0 etiquetas; con 0 muestra el chip «Métricas en el panel →»;
  - histéresis para que la columna no salte de lado;
  - modo acoplado sin líneas cuando el polígono ocupa más del 45 % del ancho.

**Honestidad visual:**
- Todas las líneas salen de un mismo punto del borde del anillo.
- Encabezado: «Todo el sector · ≈450 km² · medianas ~470 m · vs Jezero (MOLA)».

**Ajustes:**
- El lado se elige según el espacio libre.
- Jezero con ■.
- Curva `--ease-emph`.
- % en entero.
- Sin blur.
- Interruptor «Líneas» junto a los controles.
- Para suelo expuesto, aridez y rango térmico: «Marte: sin medición comparable» o «┆ regla».

**21st:** [animated-beam](https://21st.dev/@dillionverma/components/animated-beam.md) · [line-draw-svg](https://21st.dev/@pulkitxm/components/line-draw-svg.md) (técnica `pathLength`, sin GSAP) · [cobe-globe](https://21st.dev/@shuding/components/cobe-globe.md) · [annotation](https://21st.dev/@airbnb-visx/components/annotation.md) · [mapcn-marker-label](https://21st.dev/@mapcn/components/mapcn-marker-label.md) · [product-tour](https://21st.dev/@laziekiki/components/product-tour.md)

### 3.5 Carrusel de lugares: opción A (scroll-snap nativo, varias tarjetas visibles)

**Estructura:**
- Un `listbox` horizontal con roving tabindex.
- Dos grupos: «Sectores evaluados» y «◆ Emblemáticos · por calcular». Los emblemáticos van en orden alfabético, sin anillo ni ranking.
- Contador «1–4 de 11» y flechas fuera de las tarjetas.
- «Ver lista»: en móvil cambia el contenido de la hoja.
- `scrollToId` para que el globo lleve el carrusel a la tarjeta elegida.

**Tarjeta:**
- anillo de similitud con la palabra «similitud» siempre visible;
- barra de confianza aparte;
- chip de factibilidad;
- área «⬡ ≈ 450 km²»;
- etiqueta del perfil junto al %.

**Ajustes:**
- Durante la espera de la IA, las tarjetas se atenúan y no hay esqueleto animado.
- En móvil, el swipe solo selecciona con entrada táctil (`pointerType` touch).

**21st:** [coverflow-carousel](https://21st.dev/@ruixen.ui/components/coverflow-carousel.md) · [cover-flow](https://21st.dev/@louisstudios/components/cover-flow.md) · [glassy-coverflow-carousel](https://21st.dev/@automate_flows/components/glassy-coverflow-carousel.md) · [shadcn carousel](https://21st.dev/@shadcn/components/carousel.md) · [motion-primitives carousel](https://21st.dev/@ibelick/components/carousel/with-custom-indicators.md) · [reshaped-carousel](https://21st.dev/@reshaped/components/reshaped-carousel.md) · [appica carousel/progress](https://21st.dev/@appica-dev/components/carousel/progress.md) (como contraejemplo de peso)

### 3.6 Riel de métricas: opción A (acordeón-carrusel en escritorio; pestañas + pista deslizable en móvil)

**`buildMetricViews` (función pura, con Vitest):**
- Orden por el peso del perfil activo.
- El valor de Jezero (■) solo existe para pendiente, rugosidad y relieve.
- Para los criterios de tipo `bounded_preference` se muestra «┆ Regla del perfil», con un chequeo de consistencia.
- El limitante sale del campo `contribution`.
- Insignias «satura» y «cumple la regla · no significa igual a Marte».
- Aviso cuando dos sectores comparten un valor regional: Domeyko y María Elena tienen la misma aridez (14,61 mm/año, misma fuente POWER).

**Ajustes:**
- El riel aparece desde 1100 px y se abre al instante con una selección manual.
- Las cifras no se interpolan.
- En móvil, la cabecera es «‹ ● lugar · % ›».
- El espacio «✦ Lectura para tu misión» de cada tarjeta muestra el primer `insight` de ese criterio.

**21st:** [kpi-tile](https://21st.dev/@konsstepnov/components/kpi-tile.md) · [stat-card](https://21st.dev/@aadixc0de/components/stat-card.md) · [insight-cards](https://21st.dev/@arihantcodes_1f7b8c4d/components/insight-cards.md) · [financial-score-cards](https://21st.dev/@designali-in/components/financial-score-cards.md) · [orbit-ring-stats](https://21st.dev/@ham7a311/components/orbit-ring-stats.md) · [paired-bars](https://21st.dev/@eugeneshilow/components/paired-bars.md) · [spec-sheet](https://21st.dev/@isaiahbjork/components/spec-sheet.md) · [energy-meter](https://21st.dev/@thegridcn/components/energy-meter.md) · [interfaces-carousel/vertical](https://21st.dev/@jshguo/components/interfaces-carousel/vertical.md)

### 3.7 Análisis IA: opción B («Hechos primero + texto citado»), con la opción C como superficie secundaria

> **Tras ADR-013.** La Lectura tiene tres capas separadas: **resultado** (`MissionEvaluation`, «Cálculo
> determinista · reglas mission-rules-1.0.0 · similitud v3 sin recalcular»), **motivos destacados**
> (plantilla determinista sin ✦; con «✦ Destacar motivos con IA», la selección de Anthropic validada por
> el reductor) y **hechos del snapshot** (dirección frente a Jezero, limitante, satura, valor compartido,
> mejor de N sin la REF, robustez de `analysis-summary.json`). En Explorar es «Lectura determinista», sin
> IA. No hay llamadas automáticas, tokens `{{id}}` ni texto pregenerado.

**Cómo funciona.** Primero aparece al instante una capa de hechos, determinista y sin red. Encima llega el texto de la IA, con fichas cuyas cifras resuelve la UI.

**Qué aporta:**
- **Dirección respecto de Jezero:**
  - Yungay es más exigente: 1,4× en pendiente, 1,5× en rugosidad y 1,6× en relieve.
  - Domeyko está en torno a 0,6–0,7×.
  - María Elena está en torno a 0,35×, casi plana.
- **Qué no distingue entre lugares:**
  - rango térmico: 100 % en los tres;
  - suelo expuesto: ≈100 % en los tres;
  - aridez: valor compartido entre Domeyko y María Elena.
- **Más contenido:** limitante, robustez del orden y cobertura (90 % del peso, porque la geología está por calcular).
- **Recomendaciones y alcance:** prueba sugerida, compromisos entre lugares, checklist priorizada y «No medimos esto».

**Ajustes:**
- `limiting_factor` reemplaza a `weakest_in_site`.
- En móvil es una sección de S2.
- El esqueleto de carga es estático.
- La interpretación de la misión vive en «Tu misión» y no se repite aquí.

**21st:** [source-citation-rail](https://21st.dev/@rmahammad/components/source-citation-rail.md) · [ai-citations](https://21st.dev/@kokonutd/components/ai-citations.md) (toggletip, no solo hover) · [cited-answer](https://21st.dev/@ham7a311/components/cited-answer.md) · [research-report](https://21st.dev/@aadixc0de/components/research-report.md) · [ai-response](https://21st.dev/@educalvolpz/components/ai-response.md) (por bloque) · [ai-reasoning-block](https://21st.dev/@laziekiki/components/ai-reasoning-block.md) · [text-shimmer](https://21st.dev/@serafimcloud/components/text-shimmer.md) · [motion-accordion](https://21st.dev/@motiondotdev/components/motion-accordion.md) (rehecho en CSS)

### 3.8 Layout y navegación: opción A (escenario fijo + hoja con 3 detents)

**Hoja:**
- Función pura `resolveDetent(y, vy, detents)`.
- Solo se arrastra desde la manija o la cabecera.
- La manija es un `<button>`: un toque o las flechas cambian de detent.
- S2 usa `pushState`; Atrás y Esc vuelven a S1.
- `inert` en lo que queda fuera de vista en cada detent.
- Teclado virtual con VisualViewport y `--kb-inset`, sin `interactive-widget`.

**Modos:**
- Explorar | Misión son pestañas según el patrón APG, con pulgar CSS. En el nuevo armazón se retira el shader WebGL de `LiquidNav`.
- `?modo=` se escribe con `replaceState`.
- Un punto en «Misión» avisa de resultados nuevos.

**Secciones actuales.** Señal, Comparar y Método pasan a pestañas de la ficha completa (S2 en móvil, riel de 520 px en escritorio).

**«Ir a la Lectura» (M11).** El resultado compacto de «Tu misión» lleva la acción «Ir a la Lectura» (también sin áreas priorizadas). Es una acción única, junto al resumen inicial: después de la frase principal y antes de los chips y los grupos, con un objetivo táctil de 44 px (ronda 2). `uiActions.requestReading()` fija Misión y aumenta `ui.readingRequest`; el armazón elige la superficie con la función pura `shell/readingRoute.ts`:
- ≥1440: enfoca la Lectura del panel izquierdo.
- 1100–1439: abre la píldora de Lectura, que en Misión se muestra con el rótulo «Lectura». El riel y la selección no cambian.
- <1100 con un ● del snapshot: S2 en la pestaña «Lectura» de su ficha.
- <1100 sin selección o con un ◆: S2 con la vista «Lectura» (slot `sheet.reading`). Atrás, Esc, «← Volver» y ✕ vuelven a S0 (sin selección) o a S1, sin borrar la selección.

Antes de navegar se cierran los popovers abiertos. El foco va al título de la Lectura con un reintento acotado (2,5 s) que se cancela si el usuario pulsa una tecla o toca la pantalla. No hay focus trap nuevo. Navegar no cambia selección, brief, requisitos, alcance ni ranking, y no llama a la IA.

**Impresión (M11).** En `@media print` el escenario fijo vuelve al flujo normal (`html`/`body`/`#root`/`.app` sin alto fijo ni `overflow`), y solo se ve `.mission-print`. Las secciones largas se parten entre páginas, las tablas repiten encabezado y los enlaces imprimen su URL. Sin informe vigente (carga inicial, prueba editada o informe aún en camino) se imprime un aviso. «Imprimir informe» queda deshabilitado con «Preparando informe…» hasta que el informe de la evaluación vigente (`planner.result`, única fuente) está montado; el clic imprime en el acto, sin impresión diferida.

**21st:** [drawer/snap-points](https://21st.dev/@coss.com/components/drawer/snap-points.md) · [beui-bottom-sheet](https://21st.dev/@starc007/components/beui-bottom-sheet.md) · [bottom-sheet](https://21st.dev/@f0rextasy/components/bottom-sheet.md) · [segmented-control](https://21st.dev/@halaska-studio/components/segmented-control.md) · [glass-tabs](https://21st.dev/@deepraj21/components/glass-tabs.md) · [tabbar-v2](https://21st.dev/@f0rextasy/components/tabbar-v2.md) · [prompt-input-dynamic-grow](https://21st.dev/@zochory/components/prompt-input-dynamic-grow.md)

---

## 4. Pantallas finales

En las pantallas de Misión, los % aparecen como `nn,n` porque el motor los calcula con el perfil de la misión. El orden y el limitante del ejemplo también los fija el motor. Las cifras por criterio no dependen del perfil y son reales.

### 4.1 Escritorio ≥1440 · Explorar, sin selección

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◐ AnalogOS Chile            ⟨ Explorar ● │ Misión ⟩            ● Snapshot v2 · 3 evaluados · 8 por calcular  ⓘ     │
│ SCREENING CIENTÍFICO PRELIMINAR · DATOS REALES · NO ES AUTORIZACIÓN DE TERRENO                                     │
│ [✦ Lectura de la comparativa · pregenerada ⌄]                                                                      │
│                                   ◆ Devon Island · por calcular  (atenuado: cerca del horizonte)                   │
│                              ╭──────────────────────────────────╮                                                  │
│                         ╭────╯                                  ╰────╮                                             │
│                       ╭─╯                 ◆ MDRS Utah                ╰─╮    ◆ Río Tinto (borde)                    │
│                       │                                                │                                           │
│                       │                 ●●◆────┐                       │                                           │
│                       │                 ┌──────┴───────────────┐       │                                           │
│                       │                 │ Atacama · 3 ● · 1 ◆ ▸│       │    ← chip de grupo: conteos por tipo,     │
│                       │                 └──────────────────────┘       │      nunca promedios ni %                 │
│                       │                                                │                            ┌───┐          │
│                       ╰─╮                                            ╭─╯                            │ + │          │
│                         ╰────╮                                  ╭────╯                              │ − │          │
│                              ╰──────────────────────────────────╯                                   │ ⌂ │          │
│                                  ◆ Valles Secos McMurdo (borde)                                     └───┘          │
│ ● evaluado · ◆ referencia por calcular · ○ datos insuficientes                                                     │
│ Globo: NASA Blue Marble · imágenes = contexto, no entran al score                                 [Líneas: sí]     │
│ ╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮ │
│ │ LUGARES · Explorar    ● 3 evaluados  ◆ 8 por calcular                 1–4 de 11   [Ver lista]   [‹] [›]        │ │
│ │ ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐  ┆ ┌──────────────────────┐  ┌────│ │
│ │ │● Evaluado   #1 de 3  │  │● Evaluado   #2 de 3  │  │● Evaluado   #3 de 3  │  ┆ │◆ Análogo emblemático │  │◆ Is│ │
│ │ │Pampa Yungay   ╭────╮ │  │Cordón de      ╭────╮ │  │Pampa María    ╭────╮ │  ┆ │Devon Island          │       │ │
│ │ │Chile          │75,7│ │  │Domeyko        │71,6│ │  │Elena          │50,0│ │  ┆ │Canadá · región aprox.│       │ │
│ │ │⬡ ≈ 450 km²    ╰────╯ │  │⬡ ≈ 450 km²    ╰────╯ │  │⬡ ≈ 460 km²    ╰────╯ │  ┆ │                      │       │ │
│ │ │           similitud  │  │           similitud  │  │           similitud  │  ┆ │ ◇  —   por calcular  │       │ │
│ │ │Confianza ▮▮▮▮▯ 77,5  │  │Confianza ▮▮▮▮▯ 77,4  │  │Confianza ▮▮▮▮▯ 77,4  │  ┆ │ sin %, sin ranking   │       │ │
│ │ │[Requiere revisión]   │  │[Requiere revisión]   │  │[Requiere revisión]   │  ┆ │                      │       │ │
│ │ │                      │  │                      │  │                      │  ┆ │                      │       │ │
│ │ └──────────────────────┘  └──────────────────────┘  └──────────────────────┘  ┆ └──────────────────────┘       │ │
│ │ ✦ Describe el trabajo que quieres probar para Marte…                                             [ / ]         │ │
│ ╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯ │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Escritorio ≥1440 · Misión con resultados (#1 en vista previa, líneas Tesla, riel y análisis IA)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◐ AnalogOS Chile            ⟨ Explorar │ Misión ● ⟩            ● Snapshot v2 · 3 evaluados · 8 por calcular  ⓘ     │
│ SCREENING CIENTÍFICO PRELIMINAR · DATOS REALES · NO ES AUTORIZACIÓN DE TERRENO                                     │
│ ╭─ TU MISIÓN · Interpretación IA ╮  TODO EL SECTOR · ≈450 km² · medianas            ╭─ Pampa Yungay vs Jezero ───╮ │
│ │ «probar navegación autónoma de │  ~470 m · vs Jezero (MOLA) · según tu perfil     │ 6/7 válidos · tu perfil    │ │
│ │  un rover en terreno rocoso»   │  ┌────────────────┐                              │ ● Sector ■ Jezero ┆ Regla  │ │
│ │ Perfil personalizado  [Editar] │  │PENDIENTE       ├──────┐                       │ [⌃][⌄]              2 de 7 │ │
│ │ ⚠ needs_calibration  Supuestos▸│  │3,2°   ■ 2,2°   │      │                       │ Pendiente ◔69 ●3,2° ■2,2°  │ │
│ │ Pendiente     Clave       27 % │  │▰▰▰▰▰▰▰▱▱▱  69 %│      │                       │┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓│ │
│ │ Rugosidad     Clave       27 % │  └────────────────┘      │                       │┃ Rugosidad      LIMITANTE ┃│ │
│ │ Relieve       Importante  18 % │  ┌────────────────┐      │                       │┃  ╭──╮ ● Sector  16,6 m   ┃│ │
│ │ Suelo exp.    Importante  18 % │  │RUGOSIDAD       ├──────┤                       │┃  │66│ ■ Jezero  11,0 m   ┃│ │
│ │ Aridez        Menor        9 % │  │16,6 m ■ 11,0 m │      │                       │┃  ╰──╯ ↗ 1,5× más rugoso  ┃│ │
│ │ Var. térmica  Excluir       —  │  │▰▰▰▰▰▰▱▱▱▱  66 %│      │   ╭─────╮             │┃  similitud del criterio  ┃│ │
│ │ Geología: revisión experta     │  └────────────────┘      ├──◁│░░░░░│             │┃ Peso 27 % · base 20 %    ┃│ │
│ │   · fuera del score            │  ┌────────────────┐      │   │░░░░░│             │┃ Calidad ▮▮▮▮▮▮▮▮▮▯ 0,91  ┃│ │
│ │ Pediste, sin datos aún:        │  │RELIEVE LOCAL   ├──────┤   ╰─────╯             │┃ NASADEM 480 m + MOLA ↗   ┃│ │
│ │  obstáculos a escala de rueda  │  │75 m   ■ 47 m   │      │  Pampa Yungay         │┃ ✦ IA · interpreta, no    ┃│ │
│ │ La IA propone pesos; el % lo   │  │▰▰▰▰▰▰▱▱▱▱  63 %│      │  ◉ #1 (vista previa)  │┃   puntúa: ‹lectura›      ┃│ │
│ │ calcula el motor.   [Deshacer] │  └────────────────┘      │                       │┃ [Método, escala, fuentes]┃│ │
│ ├─ LECTURA DE LA COMPARATIVA ────┤  ┌────────────────┐      │  ◁ origen único en    │┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛│ │
│ │ [✦ Interpretación de IA ⓘ]     │  │SUELO EXPUESTO  ├──────┘  el borde del anillo  │ Relieve    ◔63 ●75 m ■47 m │ │
│ │ Cobertura 90 % del peso   ⧉ ↻  │  │100 %   ┆ regla │         (zona, no pin)       │ Suelo exp. ◔100 ●100 % ┆ ✓ │ │
│ │ [Este lugar] [Comparativa]     │  │▰▰▰▰▰▰▰▰▰▰ 100 %│                              │ Aridez     ◔77 ●7,3 ┆regla │ │
│ │ ‹veredicto IA, ≤2 frases›      │  │cumple la regla │                     ┌───┐    │ R. térmico  excluido (0 %) │ │
│ │  [1,4× Jezero] [1,5× Jezero]   │  └────────────────┘                     │ + │    │ Geología   —  por calcular │ │
│ │ ┌ LIMITANTE · Rugosidad ─────┐ │  ● evaluado ◆ por calcular ○ sin datos  │ − │    │ Conf. nn,n · Estab. nn,n   │ │
│ │ │ ‹frase IA con fichas›      │ │  Blue Marble · imágenes = contexto, no  │ ⌂ │    │ Factibilidad: requiere rev.│ │
│ │ │ cita [16,6 m · ■ 11,0 m]   │ │  entran al score · [Líneas: sí]         └───┘    │ [Ver ficha completa →]     │ │
│ │ └────────────────────────────┘ │  ╭────────────────────────────────────────────╮  ╰────────────────────────────╯ │
│ │ ▸ ¿Qué cambiaría el ranking?   │  │TU MISIÓN · % del motor determinista vX     │                                 │
│ │ ▸ Incertidumbre y faltantes    │  │Perfil personalizado · no es el snapshot    │                                 │
│ │ ▸ Checklist de terreno         │  │┌─────────────┐┌─────────────┐┌──────────── │                                 │
│ │ Cifras: motor · Redacción: IA  │  ││● #1 P.Yungay││● #2 Domeyko ││● #3 P. M.ª  │                                 │
│ ╰────────────────────────────────╯  ││    nn,n %   ││    nn,n %   ││   nn,n %    │                                 │
│                                     ││◉ en el globo││ similitud   ││ similitud   │                                 │
│                                     │└─────────────┘└─────────────┘└──────────── │                                 │
│                                     │ ◆ 8 emblemáticos aún sin calcular ›        │                                 │
│                                     │✦ [Tu perfil · 5 ▾] Refina tu misión… ⟲ [↑] │                                 │
│                                     ╰────────────────────────────────────────────╯                                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Entre 1100 y 1439 px no hay panel izquierdo. «Tu misión» es un popover sobre la pastilla del perfil y se cierra solo cuando llegan los resultados. El riel muestra las pestañas «Métricas | Lectura IA».

### 4.3 Loading WOW · arranque (escritorio, t ≈ 0,3 s, solo HTML + CSS)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◐ AnalogOS Chile            ⟨ Explorar │ Misión ⟩            ● Cargando snapshot validado…                         │
│ SCREENING CIENTÍFICO PRELIMINAR · DATOS REALES · NO ES AUTORIZACIÓN DE TERRENO                                     │
│                                                                                                                    │
│                                     ·  ─  ─  ─  ─  ─  ─  ─  ─  ·                                                   │
│                               ·                                   ●  ← satélite 2,4 s × 2, luego quieto            │
│                            ·       ░░▒▒▓▓▓▓▓▓▓▓▒▒░░         ·                                                      │
│                           │      ░▒▓  PÓSTER DEL   ▓▒░       │   anillo SVG 1 px #3FB4EC 55 %                      │
│                           │      ░▒▓  GLOBO (64 KB) ▓▒░      │   móvil: silueta CSS (0 bytes)                      │
│                            ·       ░░▒▒▓▓▓▓▓▓▓▓▒▒░░         ·                                                      │
│                               ·                                   ·                                                │
│                                     ·  ─  ─  ─  ─  ─  ─  ─  ─  ·                                                   │
│                            ╭──────────────────────────────────────╮                                                │
│                            │ ✓ Snapshot científico v2 · validado  │  ← bitácora: hitos reales; solo cambia         │
│                            │ • Globo 3D · cargando                │    el glifo; aria-hidden (anuncia el           │
│                            │ · Imagen NASA Blue Marble nítida     │    role=status del armazón)                    │
│                            ╰──────────────────────────────────────╯                                                │
│                                                                                                                    │
│ ╭────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮ │
│ │ LUGARES · Explorar   ● 3 evaluados  ◆ 8 por calcular    ← entra al validarse el snapshot, sin esperar al globo │ │
│ │ [● #1 Pampa Yungay 75,7 %] [● #2 Cordón de Domeyko 71,6 %] [● #3 Pampa María Elena 50,0 %] ┆ [◆ Devon…] ›      │ │
│ │                                                                                                                │ │
│ │ ✦ Describe el trabajo que quieres probar para Marte…   (operable desde el primer cuadro; nada bloquea)         │ │
│ │                                                                                                                │ │
│ ╰────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯ │
│ Datos: NASADEM · Copernicus Sentinel-2 · MOLA (Jezero) · NASA POWER · Globo: NASA Blue Marble                      │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

El revelado posterior sigue la coreografía A: onda, atmósfera, contorno de Chile, aterrizaje 1→2→3 con halo y pliegue de la bitácora en el chip.

### 4.4 Loading WOW · la IA interpreta (escritorio ≥1440, fase 2 de 4)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◐ AnalogOS Chile            ⟨ Explorar │ Misión ● ⟩            ● Snapshot v2 · 3 evaluados · 8 por calcular  ⓘ     │
│ ╭─ TU MISIÓN · Interpretación IA ╮                                                                                 │
│ │ «probar navegación autónoma de │                                                                                 │
│ │  un rover en terreno rocoso»   │              ·  ─  ─  ─  ─  ─  ─  ─  ─  ●  ← misma órbita del arranque          │
│ │                                │        ·                                   ·    (en fase con la barra)          │
│ │ ✦ Perfil recibido · validado   │      │        ╭────────────╮         │                                          │
│ │ Pendiente     Clave       27 % │      │     ╭──╯  ◆   ●●◆    ╰──╮      │   se puede seguir girando               │
│ │ Rugosidad     Clave       27 % │      │     │      GLOBO         │      │   o acercando: la cámara               │
│ │ Relieve       Importante  18 % │      │     ╰──╮              ╭──╯      │   NO se mueve sola                     │
│ │ Suelo exp.    Importante  18 % │      │        ╰────────────╯         │                                          │
│ │ Aridez        Menor        9 % │        ·                                   ·                                    │
│ │ Var. térmica  Excluir       —  │              ·  ─  ─  ─  ─  ─  ─  ─  ─  ·                                       │
│ │ Geología: revisión experta     │                                                                                 │
│ │                                │                                                                                 │
│ ├─ LECTURA DE LA COMPARATIVA ────┤                                                                                 │
│ │ Esperando al motor (paso 3).   │                                                                                 │
│ │ La IA redacta en el paso 4.    │                                                                                 │
│ │ ░░░░░░░░░░░░░░░░░░░░░░         │  ╭────────────────────────────────────────────────────────────────────────────╮ │
│ │ ░░░░░░░░░░░░░░                 │  │ LUGARES · resultados previos al 45 % · aria-busy (no inert)                │ │
│ │ esqueleto estático, sin barrido│  │ [● Yungay 75,7 %]  [● Domeyko 71,6 %]  [● M. Elena 50,0 %]  ┆ [◆ …]        │ │
│ │                                │  │ % del perfil base · se reemplaza cuando el motor termine                   │ │
│ │                                │  │                                                                            │ │
│ │                                │  ╰────────────────────────────────────────────────────────────────────────────╯ │
│ ╰────────────────────────────────╯  ✦ Perfil recibido · validado contra el contrato · paso 2 de 4 · 4 s            │
│                                     ╔══════════════════════════════════════════════════╗  ╭─────────────╮          │
│                                     ║ probar navegación autónoma de un rover en terr…  ║  │ ■ Detener   │          │
│                                     ╚═ luz orbital en el borde: 2,4 s × 2, luego fija ═╝  ╰─────────────╯          │
│                                     Esc cancela · desde 10 s: «Está tardando más de lo normal»                     │
│                                     [Cancelar] [Usar perfil base] · 20 s: tiempo agotado + [Reintentar]            │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Móvil 390×844 · S0 Explorar | S1 resultados de Misión | S2 ficha

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◐ AnalogOS ⟨Explorar│Misión⟩ ⓘ     ◐ AnalogOS ⟨Explorar│Misión●⟩ⓘ     ◐ AnalogOS ⟨Explorar│Misión●⟩ⓘ  │
│                [Preliminar ▾]                                         ───────────── ═══ ───────────── │
│                                            ╭─────╮                    ← Volver        Pampa Yungay    │
│      ╭───────────╮       ┌─┐               │░░░░░│  Pampa Yungay      nn,n % · tu perfil · vs Jezero  │
│    ╭─╯  ◆ Utah    ╰─╮    │+│               ╰──┬──╯  sector ≈450 km²   [Confianza] [Estab.] [Factib.]  │
│    │  ●●◆ ⟨Atacama·4⟩    │−│                  ╲                       ── Lectura de la comparativa ── │
│    ╰─╮            ╭─╯    │⌂│                   ╲   1 sola línea:      [✦ Interpretación de IA ⓘ]      │
│      ╰───────────╯       └─┘                    │  anillo → borde     [Este lugar | Comparativa]      │
│                                                 │  de la hoja         ‹veredicto› [1,4× Jezero]       │
│ ● ◆ ○ · NASA Blue Marble    ⓘ                   │  Blue Marble·S-2 ⓘ  LIMITANTE · Rugosidad           │
│ ───────────── ═══ ─────────────    ─────────────▼── ═══ ──────────     ‹frase› [16,6 m · ■ 11,0 m] ▾  │
│ LUGARES     1 de 11 · Ver lista    ‹ ● #1 Pampa Yungay nn,n % › ✕       └ toggletip en línea:         │
│ ┌─────────────────────────┐┌──     % del motor · tu perfil (IA)           calidad 0,91 · fuente ↗     │
│ │● Evaluado  #1 de 3      ││●      Conf. nn,n · Estab. nn,n · Rev.    ── Tu misión (perfil IA) ─────  │
│ │Pampa Yungay      ╭────╮ ││Co     ✦ IA · ‹veredicto, 1 línea›  ⌃     Pendiente · Clave · 27 % …      │
│ │Chile · ⬡≈450 km² │75,7│ ││       ◔69 ◔66 ◔63 ◔100 ◔77 excl  —       [Editar] [Deshacer]             │
│ │        similitud ╰────╯ ││       Pen Rug Rel Sue  Ari  Tér  Geo     ── 7 métricas vs Jezero ──────  │
│ │Confianza ▮▮▮▮▯ 77,5 %   ││       ‾‾‾                                ── Señal · Método · Fuentes ──  │
│ │[Requiere revisión]      ││       ┌─────────────────────────┐┌─              ↕ scroll interno        │
│ │Toca para ver métricas   ││       │PENDIENTE                ││R                                      │
│ └─────────────────────────┘└──     │╭──╮ ● 3,2°    ■ 2,2°    ││                                       │
│     [‹]  ━━━━━─────────  [›]       ││69│ ↗ 1,4× más inclinado ││                                      │
│ ✦ Describe tu misión…              │╰──╯ todo el sector      ││                                       │
│ ▒▒▒▒▒▒▒ área segura ▒▒▒▒▒▒▒        │Peso 27 % · Calidad 0,93 ││                                       │
│                                    └─────────────────────────┘└─                                      │
│                                       [◀]      1 de 7      [▶]                                        │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**S0 (bandeja):** su altura se mide por el contenido. El composer está en la bandeja; al abrir el teclado, el carrusel se pliega y el composer sube con `--kb-inset`.

**S1 (lugar, 54dvh):**
- La línea termina en el borde de la hoja, alineada con el slot activo, que está centrado.
- El composer se reduce al botón «✦ Refinar» de la cabecera.

**S2 (ficha):**
- El escenario queda `inert` y en pausa.
- Atrás y Esc vuelven a S1.

---

## 5. Contrato de la IA para lktron y reparto entre motor e IA

> **Sustituido (ADR-012 → ADR-009 §7–9, integración ADR-013).** Los contratos de esta sección
> (`mission-interpretation/1`, `evidence-packet/1`, `ai-analysis/1`) y el canal lktron se retiraron.
> El contrato vigente es `contracts/mission-ai.schema.json` del equipo, con `server/ai` (Anthropic,
> clave solo en el servidor) y `apps/web/src/mission/aiClient.ts`: la IA propone requisitos sin
> confirmar o elige IDs de una evaluación ya calculada; el cliente acepta la selección solo si las
> huellas coinciden y `checkSelection` pasa. Se conserva el texto como registro.

### 5.1 Flujo

1. **Interpretar.** `POST /interpret` → `mission-interpretation/1`, un solo objeto JSON.
2. **Calcular en el cliente:**
   - valida con Ajv precompilado;
   - normaliza los pesos;
   - recalcula con el motor TypeScript (ADR-009) y ordena;
   - arma `evidence-packet/1`.
3. **Analizar.** `POST /analyze` → `ai-analysis/1` en NDJSON, un objeto completo por línea.

**Fases visibles.** Las define la máquina de estados del cliente (`domain/missionPhase.ts`):
- interpreting (lktron)
- profile (el cliente valida)
- scoring (motor, sin IA)
- analysis (lktron)
- y como cierre: done, error o cancelled.

**Sin red o sin endpoint:**
- El paso 1 se resuelve por palabras clave («DEMO · sin IA»), con las coincidencias resaltadas.
- El paso 3 usa `artifacts/science-v2/ai-analysis.default.json` si su huella coincide. Si no coincide, solo se muestran los hechos.

### 5.2 `mission-interpretation/1` (lktron → cliente)

```json
{
  "schema": "mission-interpretation/1",
  "engine": "lktron", "model": "<id>", "prompt_version": "<semver>",
  "base_profile": { "id": "mars-rover-screening-v2", "version": "<del perfil>" },
  "status": "ok",
  "mission_summary": "Prueba de navegación autónoma de un rover en terreno rocoso",
  "criteria": [
    { "id": "slope",                           "level": 3, "rationale": "texto sin cifras" },
    { "id": "terrain_roughness",               "level": 3, "rationale": "…" },
    { "id": "local_relief",                    "level": 2, "rationale": "…" },
    { "id": "bare_ground_fraction",            "level": 2, "rationale": "…" },
    { "id": "aridity_context",                 "level": 1, "rationale": "…" },
    { "id": "surface_temperature_variability", "level": 0, "rationale": "…" }
  ],
  "assumptions": ["texto sin cifras"],
  "unsupported": [{ "phrase": "obstáculos a escala de rueda", "reason": "not_measured" }]
}
```

**Reglas de validación:**
- `status` es `ok` o `no_terrain_criteria`.
- Cada `id` pertenece a los 7 criterios del perfil base y no se repite.
- Los criterios ausentes valen nivel 0 y se muestran como «no mencionado», editables.
- `level` ∈ {0, 1, 2, 3}.
- `geologic_relevance` se puede pedir, pero queda «por calcular» y resta cobertura. Si la cobertura baja de 0,70 (`minimum_valid_weight`), se muestra «Datos insuficientes para este perfil» en vez del %.
- Ningún texto contiene dígitos ni números escritos, y cada uno tiene 280 caracteres como máximo.
- `additionalProperties: false`: el esquema no tiene dónde poner un %, una confianza o un ranking.

**Petición** (`mission-interpret-request/1`): `{ text, locale: "es-CL", catalog: [{ id, label, has_data, status }], base_profile_id, current_profile | null }`. `current_profile` se usa al refinar.

### 5.3 `evidence-packet/1` (cliente → lktron)

Es la única fuente de la que la IA puede citar.

```json
{
  "schema": "evidence-packet/1",
  "packet_hash": "fnv1a64:…",
  "snapshot": "science-screening-v2",
  "profile": { "id": "mission:<hash>", "origin": "mission", "status": "needs_calibration",
               "weights": { "slope": 0.27, "terrain_roughness": 0.27, "local_relief": 0.18 } },
  "mission_summary": "…",
  "sites": ["cl-pampa-yungay-screening", "cl-domeyko-interior-screening", "cl-pampa-maria-elena-screening"],
  "facts": {
    "site:cl-pampa-yungay-screening:slope:raw": "3,2°",
    "site:cl-pampa-yungay-screening:slope:sim": "69 %",
    "site:cl-pampa-yungay-screening:slope:ratio": "1,4× Jezero",
    "site:cl-pampa-yungay-screening:slope:vs_mars": "más inclinado que Jezero",
    "mars:slope": "2,2°",
    "site:cl-pampa-yungay-screening:similarity": "‹motor›",
    "site:cl-pampa-yungay-screening:confidence": "‹motor›",
    "coverage:cl-pampa-yungay-screening": "90 % del peso",
    "rank:gap:1:2": "‹motor›",
    "sens:flips": "‹motor›"
  },
  "fact_kinds": [
    { "kind": "limiting_factor", "site_id": "cl-pampa-yungay-screening", "criterion_id": "terrain_roughness" },
    { "kind": "no_discrimination", "criterion_id": "surface_temperature_variability" },
    { "kind": "shared_regional_value", "criterion_id": "aridity_context",
      "site_ids": ["cl-domeyko-interior-screening", "cl-pampa-maria-elena-screening"] },
    { "kind": "direction_vs_mars", "site_id": "cl-pampa-yungay-screening", "criterion_id": "slope", "direction": "more_demanding" },
    { "kind": "best_of_n", "site_id": "…", "criterion_id": "…" },
    { "kind": "saturates_rule", "site_id": "…", "criterion_id": "surface_temperature_variability" }
  ],
  "checks": { "check:cl-pampa-yungay-screening:1": "‹field_check del snapshot›" },
  "unsupported": [{ "phrase": "…", "reason": "not_measured" }]
}
```

La huella se calcula con FNV-1a de 64 bits en JS puro, porque `crypto.subtle` puede no estar disponible cuando el ZIP se abre desde `file://`.

### 5.4 `ai-analysis/1` (lktron → cliente, NDJSON)

```text
{"type":"meta","schema":"ai-analysis/1","engine":"lktron","model":"…","prompt_version":"…","packet_hash":"…"}
{"type":"stage","stage":"selecting_facts"|"writing"}
{"type":"summary","site_id":"…"|null,"text":"… {{site:…:slope:ratio}} …","refs":["…"]}
{"type":"insight","id":"i1","site_id":"…","criterion_id":"terrain_roughness","fact_kind":"limiting_factor","text":"…","refs":["…"]}
{"type":"test_suggestion","site_id":"…","text":"…","refs":["…"]}
{"type":"tradeoff","site_ids":["…","…"],"text":"…","refs":["…"]}
{"type":"robustness_note","text":"…","refs":["sens:flips","rank:gap:1:2"]}
{"type":"uncertainty","text":"…","refs":["…"],"resolves_check":"check:…"}
{"type":"field_priority","site_id":"…","check_ref":"check:…:1","why":"…","refs":["…"]}
{"type":"analog_note","analog_id":"devon-island","status":"por_calcular","text":"…"}
{"type":"done","counts":{"insight":5,"tradeoff":1}}
{"type":"error","code":"timeout"|"invalid"|"unavailable","message":"…"}
```

Topes: 6 `insight` por lugar, 4 `tradeoff` y 280 caracteres por texto.

**Dónde se muestra cada evento:**

| Evento | Lugar en la UI |
|---|---|
| `summary` | veredicto del panel, píldora y línea ✦ de S1 |
| `insight` | tarjeta de hallazgo; además, el primero de cada criterio va a «✦ Lectura para tu misión» en el riel |
| `tradeoff` | pestaña «Comparativa» |
| `robustness_note` | bajo las barras de robustez (que son deterministas) |
| `uncertainty` | acordeón de incertidumbre, con «Resolver en terreno →» |
| `field_priority` | solo el orden de la checklist; los ítems salen del snapshot |
| `test_suggestion` | «Prueba sugerida (IA)» |
| `analog_note` | «Otros análogos · por calcular» |

### 5.5 Validación de cada evento antes de mostrarlo

1. Esquema validado con Ajv precompilado (`scripts/build-validators.mjs`).
2. `packet_hash` igual a la huella actual. Si no coincide, el contenido queda «Desactualizado» y el stream se cancela con AbortController.
3. Cada `{{id}}` existe en `facts` y está declarado en `refs`.
4. Fuera de los marcadores no hay dígitos, %, ni números escritos («uno…cien», «mitad», «doble», «triple», «tercio», «veces»).
5. El `fact_kind` de un `insight` coincide con una entrada de `fact_kinds`, y el texto cita su propio criterio.
6. Filtro de vocabulario: se rechazan «seguro», «aprobado», «garantiza», «ideal», «apto», «puntaje», «score» y «el mejor». Los criterios que no se miden (hielo, mineral, radiación, regolito, química) solo pueden aparecer en `unsupported`.
7. Lo que no pasa se descarta y el descarte se avisa: «1 frase descartada: citaba un dato que no existe». Nunca se muestra texto sin validar.

### 5.6 Quién calcula qué

| Resultado | Lo calcula / redacta | Dónde |
|---|---|---|
| Similitud por criterio (`normalized_similarity`) | Pipeline Python | snapshot |
| Similitud del lugar, perfil base | Pipeline | snapshot |
| Similitud del lugar, perfil de misión | Motor TS, port de `aggregate()` con test de paridad | `domain/aggregate.ts` (ADR-009) |
| Confianza, estabilidad, factibilidad | Pipeline. Con perfil de misión: motor TS si ADR-009 lo cubre; si no, «por calcular con tu perfil» | — |
| Ranking | `rankCandidates` | `domain/scoring.ts` |
| Pesos normalizados, cobertura | Cliente (nivel ÷ suma de niveles) | `domain/missionProfile.ts` |
| Dirección y razón respecto de Jezero; «no distingue»; valor regional compartido; «satura / cumple la regla»; las 4 métricas principales | Cliente, por comparación de valores | `metricModel.ts`, `evidencePacket.ts` |
| Limitante | `contribution` del pipeline (perfil base) o motor TS (perfil de misión) | — |
| Robustez (brecha 1–2, escenarios que cambian el orden, criterio más sensible) | `sensitivity` del pipeline (perfil base) o port TS (perfil de misión) | `domain/robustness.ts` |
| Criterios, niveles, supuestos, lo pedido sin datos, resumen de la misión | IA | `mission-interpretation/1` |
| Qué hechos importan para la misión y por qué; prueba sugerida; compromisos entre lugares; orden de la checklist | IA, citando hechos | `ai-analysis/1` |

---

## 6. Rendimiento y dependencias

### 6.1 Presupuesto

| Ítem | Límite |
|---|---|
| Chunk principal | +≤12 KB gz de JS y +≤5 KB gz de CSS: armazón, hoja, pestañas, PlaceRail, composer mínimo, store |
| HTML en línea | +≤2 KB gz: anillo, silueta y bitácora |
| Chunks diferidos | Marcadores del globo +≤4 KB (en el chunk del globo); líneas ≤4; riel ≤10; misión ≤8 (tarjeta, historial, matcher, aggregate); análisis + validadores ≤10 |
| Datos | `reference_analogs.json` ≤3 KB; `ai-analysis.default.json` ≤10 KB, cargado en diferido |
| LCP, TBT, CLS | Sin regresión frente a 857b05f: mediana de 5 corridas de Lighthouse con el método de `docs/PERFORMANCE.md`. CLS 0 (el armazón reserva el dock y la hoja). En móvil, si la bitácora se convierte en LCP tardío, aparece después de 1 s y el wordmark queda como LCP. |
| INP | <200 ms al tocar una tarjeta, cambiar de modo, abrir una fila o enviar |
| Arrastre de la hoja | ≤16 ms por cuadro con CPU ×4 |
| WebGL | 0 dibujos en reposo; `never` en S2 y con la pestaña oculta. Solo dibuja de forma continua durante vuelos (≤1,8 s), inercia, intro y el brillo de 900 ms. |
| Vidrio | ≤3 superficies con blur en escritorio y ≤1 en móvil |
| Sin conexión | Todo funciona salvo la llamada a lktron |

### 6.2 Dependencias

**Aprobadas (ya instaladas):**
- three, @react-three/fiber y drei (OrbitControls, Line);
- maplibre-gl (`cluster:true`, Marker);
- Ajv precompilado;
- APIs de plataforma: Pointer Events, VisualViewport, `inert`, ResizeObserver, IntersectionObserver, scroll-snap, Web Animations, dvh y `env(safe-area-inset-*)`.

**Rechazadas:**

| Paquete | Peso / motivo |
|---|---|
| motion / framer-motion | 50,0 KB gz medidos |
| Embla | 7,7 KB gz |
| vaul | 22,4 KB gz y sin mantenimiento |
| @base-ui Drawer | 38,6 KB gz |
| cobe | segundo contexto WebGL y sin Tierra real |
| react-globe.gl / three-globe | duplican three |
| supercluster (directo) | MapLibre ya lo trae internamente |
| GSAP, @visx/annotation, parser de Markdown, lucide-react, Tailwind, Radix Tabs | innecesarios; se resuelven con CSS, SVG y código propio |
| Shader WebGL de `LiquidNav` en el nuevo armazón | segundo contexto WebGL |

---

## 7. Orden de construcción, riesgos y decisiones pendientes

### 7.1 Incrementos verificables

En todos los incrementos, `npm run build` y `npm run test` quedan en verde y se actualiza `project/STATUS.md`.

| # | Entrega | Hecho cuando |
|---|---|---|
| 0 | ADR-008/009/010 en estado proposed. Schemas `reference_analog`, `mission-interpretation`, `evidence-packet` y `ai-analysis`, con validadores precompilados | Los fixtures válidos e inválidos se comportan como se espera |
| 1 | Tokens de §2.2 y §2.4. Store `ui`. Hook `useReducedMotion` con listener. `formatScore` con 1 decimal fijo | Tests del store; «50,0» se muestra bien |
| 2 | Armazón: escenario fijo, pestañas de modo, dock, riel vacío, hoja S0/S1/S2 (`resolveDetent`, `useKeyboardInset`), `insets {right, bottom}` | Tests de `resolveDetent` (umbrales, histéresis, cancelación). En móvil, un dedo gira el globo sin hacer scroll |
| 3 | PlaceRail + `config/reference_analogs.json`: solo los ◆ que tengan fuente citada | Orden estable, nulos al final, ◆ sin %. Teclado según APG. Sincronía globo ↔ carrusel |
| 4 | Capa de marcadores del globo, vuelo, agrupación, teclado, ◆ y ○ | Tests de agrupación, fórmula de vuelo, `smoothstep` y punto-en-polígono. 0 dibujos en reposo |
| 5 | MetricRail + `buildMetricViews`; S1 en móvil | Orden por peso, nada de Marte inventado, limitante por `contribution`, «satura», valor regional compartido |
| 6 | Líneas Tesla (`pickPrincipalMetrics`, `layoutLeaders`, proyector globo/2D) | Sin cruces, dentro del área segura, degradación, histéresis, modo acoplado. Sin `setState` por cuadro |
| 7 | Loading WOW de arranque (`loadingHints`, `bootMilestone`, intro). `posterLayout`, `mapZoom` y `boot.test` ajustados a los nuevos márgenes | `boot.test` al píxel. Lighthouse sin regresión. `?intro=full` funciona |
| 8 | Motor de misión: port TS de `aggregate` (y de `sensitivity` si cabe), perfiles predefinidos (Movilidad + parciales `needs_calibration`), matcher DEMO, `missionPhase` | Paridad con `pipelines/scoring.py` (tolerancia ≤1e-6). Umbrales de 3, 10 y 20 s. Cancelar y reemplazar |
| 9 | Composer, «Tu misión» (niveles, Deshacer, historial) y coreografía de resultados | Misión → resultados sin red en modo DEMO. El orden lo pone el motor. Un solo anuncio |
| 10 | `evidencePacket`, `analysisTokens`, `robustness`, panel de Lectura con hechos, análisis pregenerado, cliente lktron NDJSON detrás de un flag | Tests adversariales del filtro (dígitos, «el doble», vocabulario). Huella FNV. Estado «Desactualizado» |
| 11 | QA: VoiceOver y TalkBack, teclado, reduced motion y reduced transparency, CPU ×4, ZIP sin conexión. `docs/`, `CHANGELOG` y `DEMO_ACCEPTANCE` | Checklist completo |

**Corte mínimo si falta tiempo:** incrementos 0–7; el 8 solo con perfiles predefinidos (sin editar pesos); el 10 solo con hechos y análisis pregenerado.

### 7.2 Riesgos

| Riesgo | Mitigación |
|---|---|
| ADR-009 no se aprueba o falla la paridad con Python | Perfiles precalculados por el pipeline; la IA solo elige entre ellos; edición de pesos desactivada con «por calcular» |
| lktron no entrega salida estructurada ni NDJSON | Modo «solo hechos» + matcher DEMO; nunca se muestra texto sin validar |
| `backdrop-filter` sobre WebGL en gama media | ≤1 blur en móvil; `data-lowfx` con tinte sólido si el arrastre pasa de 16 ms con CPU ×4 |
| Gestos propios de la hoja en iOS (pointercancel, scrollend en Safari) | Arrastre solo desde la manija; todo detent alcanzable con botones; tests de `resolveDetent`; QA en dispositivo real |
| LCP móvil empeora por la bitácora | Bitácora de tamaño fijo y visible desde el HTML; si empeora, aparece después de 1 s |
| Póster desalineado por los nuevos márgenes | `boot.test` lo detecta al píxel; actualizar `posterLayout`, `mapZoom` y el test en el mismo commit |
| Los ◆ sin coordenadas ni fuente | No se muestran (regla de datos); el carrusel queda solo con los sectores evaluados |
| Saturación entre 1100 y 1439 px (líneas, riel y dock) | Degradación 4→3→2→0 con chip; un solo panel lateral |
| Frase de la IA plausible pero falsa, sin cifras | Postura fijada por el motor, filtro de vocabulario, rótulo fijo, checklist a un clic. El riesgo residual se reconoce en la UI |
| Coreografía Tesla sin validar (tesla.com devolvió 403) | Validarla con una captura del usuario antes del incremento 6 |

### 7.3 Decisiones que necesita el equipo

1. **Datos de los 8 ◆.** ¿Quién los aporta y cómo? Hace falta coordenada o región y una fuente citada para cada uno. En particular, ¿«Atacama» es un punto en la zona de Yungay o el desierto completo?
2. **lktron:** ¿tendrá salida estructurada (JSON Schema), NDJSON por objeto y soporte de AbortController? ¿Dónde corre y cómo se configura el endpoint sin subir secretos al repositorio?
3. **Aprobaciones:** ADR-009 (de niveles a pesos y recálculo en cliente; hoy ADR-015, sustituido) por parte del equipo científico, y ADR-010 (hoy ADR-012, sustituido; excepción a «sin LLM en la demo central»: solo como mejora opcional, con el análisis pregenerado rotulado como no científico).
4. **Secciones actuales:** ¿se acepta mover Señal, Comparar y Método a pestañas de la ficha? Es la recomendación.
5. **Rango térmico de Jezero:** ¿incorporar una medición marciana (MEDA) mediante ADR y fuente citada, o mantener «┆ Regla del perfil»?
6. **Dispositivo de referencia:** ¿qué Android de gama media se usará para cerrar los valores de blur y tinte?

Archivos de los bocetos ASCII (solo trabajo intermedio, fuera del repositorio): /tmp/analogos_ascii/all.txt
