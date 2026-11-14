# features/analysis · Lectura de la comparativa (incremento 10)

Hechos deterministas primero; encima, texto validado de la IA (lktron) o un análisis
pregenerado rotulado **no científico**. La IA nunca puntúa ni escribe cifras: escribe
marcadores `{{id}}` y la UI los reemplaza por el texto que formateó el motor.
Especificación: `docs/UX_REDESIGN.md` §3.7, §4.2, §5 y ADR-010.

## Piezas

| Archivo | Chunk | Qué hace |
|---|---|---|
| `index.ts` | principal | Interfaz estable; arranca el controlador en el navegador |
| `controller.ts` | principal | Escucha `ui.missionPhase`: en `analysis` arma la lectura de la misión y cierra con `done` (también si solo hay hechos o la IA falla). `interpreting`/`cancelled`/`error`/`idle` cancelan el stream |
| `readingStore.ts` | principal | Ranuras `base` (Explorar) y `mission`; clave `mission:<perfil>:<revisión>` para «Desactualizado» |
| `ReadingPanel.tsx`, `ReadingPill.tsx`, `ReadingSnippet.tsx`, `TokenText.tsx`, `factIds.ts`, `pill.css` | principal | Envoltorio con esqueleto estático, píldora (disclosure), fragmento ✦ |
| `lktron.ts`, `lktronConfig.ts` | principal | Flag `VITE_LKTRON_URL` y `interpretWithLktron` (descarga el cliente al usarse) |
| `deferred.ts` | diferido | Única entrada diferida: vista + runtime en un chunk |
| `runtime.ts` | diferido | `buildReading` (vistas de métricas, robustez, paquete), pregenerado y stream de lktron |
| `evidencePacket.ts` | diferido | `evidence-packet/1` + capa de hechos (mismos textos que puede citar la IA) |
| `fnv.ts` | diferido | Forma canónica y FNV-1a 64 sin BigInt ni `crypto.subtle` |
| `robustness.ts` | diferido | Insumos de `sensitivity` (misma regla que `scoreMission`) y escenarios que cambian el orden |
| `analysisTokens.ts` | diferido | Marcadores y filtro adversarial del texto |
| `eventGate.ts` | diferido | Validación de cada evento `ai-analysis/1` (§5.5) |
| `ndjson.ts`, `lktronClient.ts` | diferido | Lector NDJSON con topes; `POST /interpret` y `POST /analyze` |
| `pregenerated.ts` | diferido | Carga `analysis/ai-analysis.default.json` y elige por huella |
| `ReadingView.tsx`, `analysis.css` | diferido | Panel completo |

## Huella del paquete

`packet_hash = "fnv1a64:" + hex16(FNV-1a-64(utf8(canonical(packet sin packet_hash))))`.
Forma canónica: JSON sin espacios, claves ordenadas por unidades UTF-16 en todos los niveles,
escalares con `JSON.stringify`, solo números finitos. Vectores: `""` → `cbf29ce484222325`,
`"a"` → `af63dc4c8601ec8c`. lktron debe devolver la misma huella en su `meta`; si no coincide,
el contenido queda «Desactualizado» y el stream se cancela.

## Filtro del texto (fuera de los marcadores)

Se rechaza: dígitos Unicode (`\p{N}`: «3», «３», «²», «½»), `%` y variantes, símbolos numéricos
(«×», «±», «≈»), números escritos («uno…cien», «doscientos», «mitad», «doble», «triple»,
«tercio», «veces», «porcentaje», «por ciento»), vocabulario de veredicto («seguro»,
«aprobado», «garantiza», «ideal», «apto», «puntaje», «score», «el mejor», «óptimo»…), lo que el
snapshot no mide (hielo, mineral, radiación, regolito, química), caracteres invisibles o bidi y
letras de otros alfabetos (homóglifos). Palabras completas, normalizadas (NFKC, minúsculas, sin
tildes). Lo descartado se avisa: «1 frase descartada: citaba un dato que no existe».

## lktron (opcional, ADR-010)

```sh
VITE_LKTRON_URL=https://lktron.ejemplo.org/api npm run build
```

- Solo https (o http en localhost). Sin usuario/contraseña, query ni fragmento: todo `VITE_*`
  queda en el bundle público, así que la URL nunca lleva secretos. Si el servicio necesita una
  credencial, va en un proxy del lado del servidor.
- Peticiones con `credentials: 'omit'`, sin referrer ni redirecciones; tiempo agotado a los 20 s
  sin respuesta o sin una línea nueva.
- Sin la variable: interpretación «DEMO · sin IA» (composer) y lectura con hechos + pregenerado.

## Análisis pregenerado

`artifacts/analysis/ai-analysis.default.json` (≤10 KB, servido como
`analysis/ai-analysis.default.json`). Redactado de antemano sobre el paquete del perfil base de
`science-screening-v2`; se muestra solo si su huella coincide y cada evento pasa la compuerta.
`integration.test.ts` falla si el paquete cambia (metrics, engine o snapshot): entonces hay que
revisar el texto contra el paquete nuevo y regenerarlo con su `packet_hash` usando
`scripts/make_pregenerated_analysis.py <packet_hash> artifacts/analysis/ai-analysis.default.json`.

## Tests

`*.test.ts(x)` en esta carpeta. `testSupport.ts` trae un doble FIXTURE de `buildMetricViews`;
`integration.test.ts` usa las implementaciones reales de metrics y engine, y falla si alguna
vuelve a ser un stub.
