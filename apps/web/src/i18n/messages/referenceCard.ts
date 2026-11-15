/**
 * ◆ reference card catalog (area ui-core, docs/I18N.md §7): the compact card of a selected world analog (deferred chunk
 * `ReferenceCardView`). Kept apart from places.ts so it does not weigh on the initial chunk. English verbatim; Spanish
 * from git 273e5f8 (features/places/ReferenceCardView.tsx).
 */
import { defineMessages } from '../translate'

export const tReferenceCard = defineMessages({
  en: {
    'ref.kicker': 'World reference · not yet calculated',
    'ref.catalogLoading': 'Loading the analog catalog…',
    'ref.catalogUnavailable': 'Catalog not available: {reason}',
    'ref.notInCatalog': 'This analog is not in the published catalog.',
    'ref.location': 'Location',
    'ref.point': 'Approximate area with a radius of ≈ {radius} km around the cited point ({point}). It is not an exact pin.',
    'ref.region': 'Approximate region between {from} and {to}.',
    'ref.figures': 'Similarity, confidence and ranking',
    'ref.figuresPending': 'Not yet calculated: this analog has not been measured with the profile, so it has no %.',
    'ref.matches': 'Matches',
    'ref.matchesText': '{names} (the cited point falls inside the sector)',
    'ref.contains': 'Contains',
    'ref.containsText': { one: '{count} evaluated sector: {names}', other: '{count} evaluated sectors: {names}' },
    'ref.sources': 'Sources',
  },
  es: {
    'ref.kicker': 'Referencia mundial · por calcular',
    'ref.catalogLoading': 'Cargando el catálogo de análogos…',
    'ref.catalogUnavailable': 'Catálogo no disponible: {reason}',
    'ref.notInCatalog': 'Este análogo no está en el catálogo publicado.',
    'ref.location': 'Ubicación',
    'ref.point': 'Zona aproximada de radio ≈ {radius} km en torno al punto citado ({point}). No es un pin exacto.',
    'ref.region': 'Región aproximada entre {from} y {to}.',
    'ref.figures': 'Similitud, confianza y ranking',
    'ref.figuresPending': 'Por calcular: este análogo no se ha medido con el perfil, así que no tiene %.',
    'ref.matches': 'Coincide con',
    'ref.matchesText': '{names} (el punto citado cae dentro del sector)',
    'ref.contains': 'Contiene',
    'ref.containsText': { one: '{count} sector evaluado: {names}', other: '{count} sectores evaluados: {names}' },
    'ref.sources': 'Fuentes',
  },
})
