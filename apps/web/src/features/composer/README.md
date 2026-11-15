# features/composer · composer y «Tu misión»

Capa del rediseño sobre el planificador del equipo (ADR-009 y ADR-013). Un único controlador
(`missionController.ts`, chunk diferido) usa sin cambios `plannerReducer`, `buildRequest`,
`evaluateMission`, `composeExplanation`, `buildMissionExport` y el cliente de IA (`mission/aiClient.ts`)
sobre un store externo, y publica en `state/mission.ts` (único escritor) y `ui.missionPhase`.

Flujo:

1. **Enviar** (dock): abre «Tu misión» en el recorrido «Definir una prueba» con el brief cargado.
   Nunca llama a la IA.
2. **Requisitos**: a mano, «Usar ejemplo» o «✦ Proponer requisitos con IA» (botón explícito, con el
   aviso de envío del equipo). El borrador llega sin confirmar.
3. **Confirmar y evaluar** con los botones del equipo. La evaluación es síncrona y determinista.
4. **Resultado** en el carrusel, el globo, el riel, las líneas y la Lectura; en «Tu misión», el
   `ResultView` compacto con «Ir a la Lectura» (M11, solo navega), «Descargar JSON», «Imprimir
   informe» y «Volver a editar». «Imprimir informe» queda deshabilitado («Preparando informe…»)
   hasta que `PrintContent` monta el informe de la evaluación vigente (`printState.ts`). Sin
   evaluación vigente, `MissionPrintHost` imprime un aviso en lugar del informe.

Editar tras evaluar invalida el resultado (reductor del equipo) y aborta en red la petición en
curso; los resultados anteriores quedan a `--o-busy` hasta reevaluar.

| Archivo | Chunk | Qué hace |
|---|---|---|
| `index.ts`, `Composer.tsx`, `MissionComposer.tsx`, `MissionCard.tsx`, `printHost.tsx` | principal | Vista del dock y enlaces diferidos |
| `composerStore.ts`, `labels.ts`, `model.ts`, `focus.ts`, `popover.ts`, `runLoader.ts` | principal | Estado privado, rótulos y umbrales de espera (3 s, 10 s), línea de resultado |
| `missionController.ts`, `MissionPanel.tsx`, `ComposerExtras.tsx`, `PrintContent.tsx`, `history.ts` | diferido | Controlador, «Tu misión» (PlannerView del equipo), sugerencias, informe, historial v2 |

Historial (`analogos.composer.history.v2`): brief, alcance y requisitos del usuario. Nunca se
guardan propuestas intactas de la IA, su procedencia ni resultados.
