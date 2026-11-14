# ADR-008 — Escenario fijo (100dvh) con dock, riel y una sola hoja de 3 detents

- Estado: propuesto (2026-11-14). Pendiente de aceptación del equipo humano.
- Fecha: 2026-11-14
- Relación: aplica `docs/UX_REDESIGN.md` §0–§2 y §3.8. Reemplaza el layout de ADR-006 punto 5 (ficha flotante y hero con scroll). Mantiene ADR-006/007 (globo con paso a 2D) y ADR-001 (SVG sin WebGL).

## Contexto

El sitio actual es un documento con scroll: hero «No buscamos…», ficha flotante de 480 px a la derecha y secciones Señal, Comparar y Método debajo. En móvil hay cinco hojas distintas propuestas y ocho breakpoints. El globo pierde el gesto de un dedo porque el documento se desplaza, y cada componente pasaba sus márgenes al escenario de una forma distinta (`rightInset`, `--stage-inset-*`, `--rail-h`…).

## Decisión

1. **Escenario fijo**: `html`/`body` sin scroll; el escenario (globo o mapa 2D) ocupa todo el viewport y se gira con un dedo. Todo lo demás flota encima.
2. **Una regla espacial**: centro = dónde (globo y líneas); derecha = el lugar (riel de métricas `clamp(340px, 26vw, 380px)`, 520 px en «ficha completa»); izquierda = tu misión y su lectura (solo ≥1440 px y en Misión); abajo = elegir y escribir (un único dock: lugares arriba, composer abajo).
3. **Tres tramos**: ≥1440, 1100–1439 y <1100 px. Alto <860 px usa variantes compactas. Por debajo de 1100 px hay **una sola hoja** con detents S0 (bandeja), S1 (lugar, 54dvh) y S2 (ficha). Horizontal con alto ≤500 px: hoja lateral de 360 px.
4. **Hoja**: se arrastra solo desde la manija o la cabecera; la manija es un `<button>` (toque o flechas cambian de detent). El destino lo decide la función pura `resolveDetent` (umbral de velocidad, histéresis a favor del detent de origen, cancelación). S2 usa `pushState`; Atrás y Esc vuelven a S1; el escenario queda `inert` y en pausa en S2. El teclado virtual se compensa con VisualViewport y `--kb-inset`.
5. **Márgenes del escenario**: un solo canal. El armazón calcula `insets {top, right, bottom, left}` desde el layout y los publica en el store `ui` cuando el layout se asienta. El globo los aplica con `setViewOffset(x, y)` y MapLibre con `setPadding`. El encuadre global, los umbrales globo↔2D y el póster previo a React usan los márgenes **base** del tramo (`shell/stageGeometry.js`), que no cambian al abrir el riel o la hoja, para que la cámara no salte.
6. **Modos** Explorar | Misión como pestañas APG con pulgar CSS (`?modo=` con `replaceState`). Se retira el shader WebGL de `LiquidNav`. Señal, Comparar y Método pasan a pestañas de la ficha completa (riel de 520 px o S2).
7. **Estado de UI** en un store externo (`useSyncExternalStore`) fuera del árbol de R3F, para no re-renderizar el globo.

## Consecuencias

- Se elimina el hero y la ficha flotante; el contenido existente se reubica sin perderse (Métricas, Señal, Comparar, Método y Fuentes como pestañas).
- El póster del globo y su prueba al píxel (`boot.test`) se alinean con los nuevos márgenes base; cambiar la altura del dock exige actualizar `stageGeometry.js` y `shell.css` juntos (lo verifica un test).
- Riesgo iOS (pointercancel, scrollend): todo detent es alcanzable con botones y teclado; QA en dispositivo real pendiente (incremento 11).
- Si no se acepta: se vuelve al layout de ADR-006 revirtiendo el armazón; los contratos y el store no dependen de esta decisión.
