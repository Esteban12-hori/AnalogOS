/**
 * Place details catalog (area ui-core, docs/I18N.md §7): full detail sheet (“ficha”) header and tabs, Origin, Method,
 * Sources, Compare, Signal (surface series and its card) and the satellite context panel. English verbatim; Spanish
 * from git 273e5f8 at the same places (shell/detail/*, components/*) or a faithful translation.
 */
import { defineMessages } from '../translate'

export const tDetail = defineMessages({
  en: {
    'tab.metricas': 'Metrics',
    'tab.lectura': 'Reading',
    'tab.mision': 'Your mission',
    'tab.origen': 'Origin',
    'tab.geologia': 'Geology',
    'tab.senal': 'Signal',
    'tab.comparar': 'Compare',
    'tab.metodo': 'Method',
    'tab.fuentes': 'Sources',
    'tabs': 'Place details',
    'loading': 'Loading…',
    'role.candidate': 'Candidate',
    'role.candidateRank': 'Candidate #{rank}',
    'export': 'Export site record (JSON source record)',

    'origin.screening': 'Screening',
    'origin.country': 'Country',
    'origin.area': 'Approximate area',
    'origin.feasibility': 'Territorial feasibility',
    'origin.feasibilityPending': 'Pending: permits, access, protected areas and ownership are not evaluated.',
    'origin.heading': 'Origin and precedents',
    'origin.origin': 'Origin',
    'origin.reference': 'Known reference, taken from snapshot {snapshot}. It does not come from the search.',
    'origin.previous': 'previous',
    'origin.grid': 'Grid search: window {window}, preselection no. {rank}.',
    'origin.priority': 'Topographic priority',
    'origin.priorityValue': '{value} / 100 · it only orders the preselection; it is not the score or the confidence.',
    'origin.note': 'Note',
    'origin.review': 'Literature review',
    'origin.reviewValue': '{note} Catalog {version}, reviewed on {date}.',
    'origin.points': ': {count} point(s)',
    'origin.distance': ': {km} km from the center ({point})',
    'origin.originalTitle': ' (original title, Spanish)',
    'origin.warnings': 'Snapshot warnings · {count}',





  },
  es: {
    'tab.metricas': 'Métricas',
    'tab.lectura': 'Lectura',
    'tab.mision': 'Tu misión',
    'tab.origen': 'Origen',
    'tab.geologia': 'Geología',
    'tab.senal': 'Señal',
    'tab.comparar': 'Comparar',
    'tab.metodo': 'Método',
    'tab.fuentes': 'Fuentes',
    'tabs': 'Ficha del lugar',
    'loading': 'Cargando…',
    'role.candidate': 'Candidato',
    'role.candidateRank': 'Candidato #{rank}',
    'export': 'Exportar ficha (JSON)',

    'origin.screening': 'Screening',
    'origin.country': 'País',
    'origin.area': 'Área aproximada',
    'origin.feasibility': 'Factibilidad territorial',
    'origin.feasibilityPending': 'Pendiente: permisos, acceso, áreas protegidas y propiedad no están evaluados.',
    'origin.heading': 'Origen y antecedentes',
    'origin.origin': 'Origen',
    'origin.reference': 'Referencia conocida, tomada del snapshot {snapshot}. No sale de la búsqueda.',
    'origin.previous': 'anterior',
    'origin.grid': 'Búsqueda por rejilla: ventana {window}, preselección n.º {rank}.',
    'origin.priority': 'Prioridad topográfica',
    'origin.priorityValue': '{value} / 100 · solo ordena la preselección; no es el score ni la confianza.',
    'origin.note': 'Nota',
    'origin.review': 'Revisión bibliográfica',
    'origin.reviewValue': '{note} Catálogo {version}, revisado el {date}.',
    'origin.points': ': {count} punto(s)',
    'origin.distance': ': {km} km al centro ({point})',
    'origin.originalTitle': ' (título original)',
    'origin.warnings': 'Advertencias del snapshot · {count}',





  },
})
