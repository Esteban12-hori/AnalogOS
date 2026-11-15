/**
 * Metrics catalog (area ui-core, docs/I18N.md §7): place figures, per-criterion rail/cards/carousel, mini
 * visualizations and the texts of the metric views (also read by the Tesla lines). English verbatim; Spanish from git
 * 273e5f8 at the same places (features/metrics/*) or a faithful translation. Criterion names live in common.ts.
 */
import { defineMessages } from '../translate'

export const tMetrics = defineMessages({
  en: {

    'coverage': '{valid} of {total} criteria with data',
    'coverage.weight': '{text} · {percent} of the weight',

    'detail.loadError': 'The per-criterion detail could not be loaded. The place figures are still valid; reload the page to try again.',
    'detail.loading': 'Loading the per-criterion detail…',
    'profile.line': 'Base profile v{version}{calibration} · snapshot v3 similarity',
    'profile.calibration': ' · needs calibration',
    'profile.label': 'base profile v{version}',
    'requirement.line': 'Required: {required}',
    'requirement.observed': ' · observed: {observed}',
    'mission.aria': 'Your mission result',
    'mission.stale': 'You edited the test: this status belongs to the previous evaluation until you confirm and evaluate again.',
    'mission.rowsAria': 'Site requirements and unmeasured ones',
    'mission.coverage': 'Deterministic calculation · rules {rules} · the rail weights are the snapshot ones',
    'summary.aria': 'Place figures',
    'summary.rank': ' · #{rank} of {count}',
    'summary.unsupported': ' · Mars rover profile · does not apply to this objective',
    'summary.notRecalculated': ' · not recalculated',
    'summary.insufficient': 'Valid weight below the profile minimum ({percent}): no % is calculated for this place.',
    'figure.confidence': 'Confidence',
    'figure.stability': 'Stability',
    'figure.feasibility': 'Feasibility',
    'figure.notCalculated': 'not calculated',
    'figure.confidenceValue': 'Confidence {value}',
    'figure.stabilityValue': 'Stability {value}',
    'sheet.announce': '{name}, place {position} of {total}',
    'sheet.changePlace': 'Change place',
    'sheet.previous': 'Previous place: {name}',
    'sheet.noPrevious': 'No previous place',
    'sheet.next': 'Next place: {name}',
    'sheet.noNext': 'No next place',
    'sheet.rankOf': ' of {count}',
    'sheet.base': 'v3 similarity · base profile',


  },
  es: {

    'coverage': '{valid} de {total} criterios con dato',
    'coverage.weight': '{text} · {percent} del peso',

    'detail.loadError': 'No se pudo cargar el detalle por criterio. Las cifras del lugar siguen siendo válidas; recarga la página para reintentar.',
    'detail.loading': 'Cargando el detalle por criterio…',
    'profile.line': 'Perfil base v{version}{calibration} · similitud v3 del snapshot',
    'profile.calibration': ' · necesita calibración',
    'profile.label': 'perfil base v{version}',
    'requirement.line': 'Exigido: {required}',
    'requirement.observed': ' · observado: {observed}',
    'mission.aria': 'Resultado de tu misión',
    'mission.stale': 'Editó la prueba: este estado es de la evaluación anterior hasta que confirme y evalúe de nuevo.',
    'mission.rowsAria': 'Requisitos del sitio y sin medición',
    'mission.coverage': 'Cálculo determinista · reglas {rules} · los pesos del riel son los del snapshot',
    'summary.aria': 'Cifras del lugar',
    'summary.rank': ' · #{rank} de {count}',
    'summary.unsupported': ' · perfil rover Marte · no aplica a este objetivo',
    'summary.notRecalculated': ' · sin recalcular',
    'summary.insufficient': 'Peso válido bajo el mínimo del perfil ({percent}): no se calcula un % para este lugar.',
    'figure.confidence': 'Confianza',
    'figure.stability': 'Estabilidad',
    'figure.feasibility': 'Factibilidad',
    'figure.notCalculated': 'sin calcular',
    'figure.confidenceValue': 'Confianza {value}',
    'figure.stabilityValue': 'Estabilidad {value}',
    'sheet.announce': '{name}, lugar {position} de {total}',
    'sheet.changePlace': 'Cambiar de lugar',
    'sheet.previous': 'Lugar anterior: {name}',
    'sheet.noPrevious': 'No hay lugar anterior',
    'sheet.next': 'Lugar siguiente: {name}',
    'sheet.noNext': 'No hay lugar siguiente',
    'sheet.rankOf': ' de {count}',
    'sheet.base': 'similitud v3 · perfil base',


  },
})
