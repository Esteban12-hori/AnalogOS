/**
 * Composer catalog (area mission-ui, docs/I18N.md §7): the dock composer, its phases and result line, the “Your
 * mission” card placeholder, the print host, the main-chunk entry points of the Reading (pill and skeleton) and the
 * two notices the main chunk writes. It travels in the main chunk, so it holds ONLY what the main chunk draws; the rest
 * of the mission interface (including “Your mission” history and suggestions) lives in the deferred `planner`,
 * `reading` and `mission` catalogs.
 *
 * English is the current product text verbatim; Spanish is the wording used before ADR-016 (git 273e5f8) at the same
 * place or the reviewed feature/i18n translation. The composer prompt is `tShell('composerPrompt')` (static shell).
 */
import { defineMessages } from '../translate'

export const tComposer = defineMessages({
  en: {
    'refine': 'Refine',
    'proposing': 'Proposing…',
    'proposingRequirements': 'Proposing requirements…',
    'form.promptShort': 'Describe your test…',
    'form.fieldLabel': 'Describe your test',
    'form.send': 'Send',
    'form.cancel': 'Cancel',
    'profile.title': 'Your mission',
    'profile.count': { one: 'Your mission · {count} requirement', other: 'Your mission · {count} requirements' },
    'profile.short': 'Mission',
    'profile.shortCount': 'Mission · {count}',
    'status.noSnapshot': 'No snapshot: the mission cannot be evaluated.',
    'status.waitingSnapshot': 'Waiting for the validated snapshot…',
    'status.slow': 'The AI is taking longer than usual · {seconds} s',
    'status.sent': 'Text loaded in “Your mission”: review the requirements, confirm and evaluate.',
    'status.stale': 'You edited the test: confirm and evaluate again in “Your mission”.',
    'status.requirementCount': { one: ' · {count} requirement', other: ' · {count} requirements' },
    'status.idle': 'Send opens “Your mission”: you define and confirm the requirements; the AI is optional.',
    'popover.loading': 'Your mission · loading…',

    'phase.interpreting': 'The AI proposes editable requirements · you confirm',
    'phase.review': 'Review the requirements and confirm in “Your mission”',
    'phase.scoring': 'Deterministic calculation in progress',
    'phase.analysis': 'Results ready · the AI highlights reasons in Reading',
    'phase.done': 'Results ready',
    'phase.error': 'Could not be completed',
    'phase.cancelled': 'Request canceled',

    'outcome.needs_window_selection': 'There is evidence for a window, not for the point: it still needs to be chosen',
    'outcome.insufficient_coverage': 'Insufficient evidence for this geometry: exportable diagnostic',
    'outcome.unsupported_target': 'Unsupported objective: the request is kept without calculation',
    'line.none': 'No option prioritized out of {total}',
    'line.prioritized': { one: '{prioritized} of {count} candidate prioritized', other: '{prioritized} of {count} candidates prioritized' },
    'line.refAlso': 'REF also prioritized',
    'line.ref': 'REF prioritized',
    'line.noSimilarity': 'no v3 similarity',
    'line.similarity': 'v3 similarity {score} (not recalculated)',
    'line.announcement': 'Evaluation ready. {line}. Territorial feasibility pending.',

    'card.loading': 'Loading the mission card…',

    'print.title': 'AnalogOS · Recommendation report for a test',
    'print.loading_data': 'There is no report to print: the validated data are still loading.',
    'print.no_result': 'There is no current report. Define the test in “Your mission”, confirm the requirements and evaluate; then use “Print report”.',
    'print.stale': 'You edited the test: the previous report no longer matches what you are writing. Confirm and evaluate again in “Your mission” to print the current report.',
    'print.preparing': 'The current report is being prepared. Close this print view and use “Print report” when the button is available.',

    'reading.title': 'Reading',
    'reading.deterministic': 'Deterministic reading',
    'reading.preparing': 'Preparing the reading…',

    // Canonical notices written by the main chunk (shown with mission/messageDisplay.ts).
    'notice.loadFailed': 'The planner could not be loaded. Reload the page to try again.',
    'notice.geologyLoading': 'The geology context is still loading.',
  },
  es: {
    'refine': 'Refinar',
    'proposing': 'Proponiendo…',
    'proposingRequirements': 'Proponiendo requisitos…',
    'form.promptShort': 'Describe tu prueba…',
    'form.fieldLabel': 'Describa su prueba',
    'form.send': 'Enviar',
    'form.cancel': 'Cancelar',
    'profile.title': 'Tu misión',
    'profile.count': { one: 'Tu misión · {count} requisito', other: 'Tu misión · {count} requisitos' },
    'profile.short': 'Misión',
    'profile.shortCount': 'Misión · {count}',
    'status.noSnapshot': 'Sin snapshot: la misión no puede evaluarse.',
    'status.waitingSnapshot': 'Esperando el snapshot validado…',
    'status.slow': 'La IA está tardando más de lo normal · {seconds} s',
    'status.sent': 'Texto cargado en «Tu misión»: revise los requisitos, confirme y evalúe.',
    'status.stale': 'Editó la prueba: confirme y evalúe de nuevo en «Tu misión».',
    'status.requirementCount': { one: ' · {count} requisito', other: ' · {count} requisitos' },
    'status.idle': 'Enviar abre «Tu misión»: usted define y confirma los requisitos; la IA es opcional.',
    'popover.loading': 'Tu misión · cargando…',

    'phase.interpreting': 'La IA propone requisitos editables · usted confirma',
    'phase.review': 'Revise los requisitos y confirme en «Tu misión»',
    'phase.scoring': 'Cálculo determinista en curso',
    'phase.analysis': 'Resultados listos · la IA destaca motivos en la Lectura',
    'phase.done': 'Resultados listos',
    'phase.error': 'No se pudo completar',
    'phase.cancelled': 'Solicitud cancelada',

    'outcome.needs_window_selection': 'Hay evidencia de una ventana, no del punto: falta elegirla',
    'outcome.insufficient_coverage': 'Evidencia insuficiente para esta geometría: diagnóstico exportable',
    'outcome.unsupported_target': 'Objetivo no soportado: se conserva el pedido sin cálculo',
    'line.none': 'Ninguna opción priorizada de {total}',
    'line.prioritized': { one: '{prioritized} de {count} candidato priorizado', other: '{prioritized} de {count} candidatos priorizados' },
    'line.refAlso': 'REF también priorizada',
    'line.ref': 'REF priorizada',
    'line.noSimilarity': 'sin similitud v3',
    'line.similarity': 'similitud v3 {score} (sin recalcular)',
    'line.announcement': 'Evaluación lista. {line}. Factibilidad territorial pendiente.',

    'card.loading': 'Cargando la tarjeta de misión…',

    'print.title': 'AnalogOS · Informe de recomendación para una prueba',
    'print.loading_data': 'No hay un informe para imprimir: los datos validados todavía se están cargando.',
    'print.no_result': 'No hay un informe vigente. Defina la prueba en «Tu misión», confirme los requisitos y evalúe; después use «Imprimir informe».',
    'print.stale': 'Editó la prueba: el informe anterior ya no corresponde a lo que está escribiendo. Confirme y evalúe de nuevo en «Tu misión» para imprimir el informe vigente.',
    'print.preparing': 'El informe vigente se está preparando. Cierre esta vista de impresión y use «Imprimir informe» cuando el botón esté disponible.',

    'reading.title': 'Lectura',
    'reading.deterministic': 'Lectura determinista',
    'reading.preparing': 'Preparando la lectura…',

    'notice.loadFailed': 'No se pudo cargar el planificador. Recargue la página para reintentar.',
    'notice.geologyLoading': 'El contexto geológico todavía se está cargando.',
  },
})
