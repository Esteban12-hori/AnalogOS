// Geology text packs (ENGLISH-DEFAULT, Phase A). Every authored string that enters a fingerprinted geology record
// (per-site export export_info, guidance catalog limits/reference texts, composed guidance, wrapper metadata)
// comes from the pack of the record's version:
// - version 1: FROZEN Spanish wording of the historical records. Do not edit or translate.
// - version 2: English wording (default for new records).
// Mission evaluation 1.0.0 pairs with geology version 1; 1.1.0 pairs with version 2. Facts (fractions, units,
// sources, geometry) and IDs (purposes, ref_ids) are identical in both.
import type { EvaluationVersion, OptionStatus } from '../mission/types'

export type GeologyTextVersion = 1 | 2
export type GeologyAvailabilityKey = 'available' | 'partial' | 'no_coverage' | 'unavailable'
export type GeologyPurposeKey =
  | 'verificar_hueco_cartografico' | 'resolver_ambiguedad' | 'confirmar_descripcion_ausente' | 'correspondencia_mapa_terreno'
  | 'caracterizar_material_superficial' | 'diversidad_litologica_muestreo' | 'contrastar_escala'

export interface UnitIdentity { code: string | null; name: string | null; fraction_in_ambiguity?: number }
export interface PurposeContext { gapFraction: number; unitCount: number; scaleDenominator: number }

export interface GeologyText {
  lang: 'es' | 'en'
  formatCoverage: (fraction: number) => string
  formatScaleLabel: (denominator: number) => string
  availabilityLabel: Record<GeologyAvailabilityKey, string>
  purposeLabel: Record<GeologyPurposeKey, string>
  purposeText: (purpose: GeologyPurposeKey, unit: UnitIdentity | null, ctx: PurposeContext) => string
  limits: {
    regional: (scale: string, authority: string) => string
    status: (label: string) => string
    noCoverage: string
    unmapped: (pct: string) => string
    ambiguous: (pct: string) => string
    unusable: (pct: string) => string
    withoutDescription: (pct: string) => string
    mapDateUnknown: string
    unitsNote: string
    windowContext: string
  }
  excludedReason: Partial<Record<OptionStatus, string>>
  missingSite: string
  noFullEvaluation: string
  notice: Record<'anthropic' | 'deterministic_template', string>
  scopeNote: string
  exportDescription: string
  exportHowToRead: string[]
  wrapper: { description: string; howToRead: string[]; fingerprintMethod: string; subsetFingerprintMethod: string; identityNote: string }
}

// --- Version 1: FROZEN Spanish -----------------------------------------------------------------------------------

const decimalEs = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/**
 * Percentage of a fraction with honest rounding: never shows 100 % unless coverage is exact, and distinguishes
 * “<0,1 %” and “>99,9 %” instead of rounding to 0 % or 100 % (frozen es-CL output: decimal comma kept).
 */
export function formatCoverageEs(fraction: number): string {
  const percent = fraction * 100
  if (percent === 0) return '0 %'
  if (percent >= 100 - 1e-6) return '100 %'
  if (percent < 0.1) return '<0,1 %'
  if (percent > 99.9) return '>99,9 %'
  return `${decimalEs.format(percent)} %`
}

export function formatScaleLabelEs(denominator: number): string {
  return `1:${new Intl.NumberFormat('es-CL').format(denominator)}`
}

const unitLabelEs = (u: UnitIdentity): string => `«${u.name ?? u.code ?? 'unidad sin nombre'}»${u.code ? ` (código ${u.code})` : ''}`

const GEOLOGY_TEXT_ES: GeologyText = {
  lang: 'es',
  formatCoverage: formatCoverageEs,
  formatScaleLabel: formatScaleLabelEs,
  availabilityLabel: {
    available: 'Cobertura cartográfica completa',
    partial: 'Cobertura parcial',
    no_coverage: 'Sin cobertura en esta capa',
    unavailable: 'Evidencia no utilizable',
  },
  purposeLabel: {
    verificar_hueco_cartografico: 'Verificar zona sin polígono',
    resolver_ambiguedad: 'Resolver solape entre unidades',
    confirmar_descripcion_ausente: 'Confirmar descripción ausente',
    correspondencia_mapa_terreno: 'Comprobar correspondencia mapa-terreno',
    caracterizar_material_superficial: 'Caracterizar material superficial (a medir)',
    diversidad_litologica_muestreo: 'Reconocer diversidad litológica',
    contrastar_escala: 'Contrastar la escala del mapa',
  },
  purposeText(purpose, unit, ctx) {
    const u = unit ? unitLabelEs(unit) : ''
    switch (purpose) {
      case 'verificar_hueco_cartografico':
        return `Comprobar qué hay en la parte del sector sin polígono o no utilizable en esta capa (${formatCoverageEs(ctx.gapFraction)} del área). Ausencia de cobertura no es ausencia de geología. Orientación editorial, no medición.`
      case 'resolver_ambiguedad':
        return `Resolver con la fuente oficial qué unidad rige donde ${u} se solapa con otra (${formatCoverageEs(unit?.fraction_in_ambiguity ?? 0)} del sector es solape de esta unidad con otras). Orientación editorial, no medición.`
      case 'confirmar_descripcion_ausente':
        return `Obtener la descripción de ${u}, que la fuente no trae, antes de usarla para planificar. Orientación editorial, no medición.`
      case 'correspondencia_mapa_terreno':
        return `Comprobar en terreno si lo observado donde se cartografió ${u} coincide con su descripción oficial. Orientación editorial, no medición.`
      case 'caracterizar_material_superficial':
        return `Medir en terreno granulometría, compactación y fricción del material superficial donde se cartografió ${u}; el mapa no los informa y no deben inferirse de su nombre. Orientación editorial, no medición.`
      case 'diversidad_litologica_muestreo':
        return `Reconocer en terreno ${u} entre las ${ctx.unitCount} unidades cartografiadas para planificar muestreo o instrumentación. Orientación editorial, no medición.`
      case 'contrastar_escala':
        return `Contrastar esta cartografía regional (${formatScaleLabelEs(ctx.scaleDenominator)}) con cartografía de mayor detalle antes de planificar un ensayo. Orientación editorial, no medición.`
    }
  },
  limits: {
    regional: (scale, authority) => `Cartografía regional ${scale} (${authority}): no es medición de campo ni prueba de tracción, mecánica de suelos, equivalencia marciana, seguridad ni permisos.`,
    status: (label) => `Estado de evidencia: ${label}. Cobertura no es precisión ni aptitud.`,
    noCoverage: 'Esta capa no cubre el sector: no hay unidades que citar. No significa que no haya geología ni descarta el sector.',
    unmapped: (pct) => `${pct} del sector no tiene polígono en esta capa; no se localizan unidades dentro de ese hueco ni se completa con otras capas.`,
    ambiguous: (pct) => `${pct} del sector tiene solape entre unidades distintas; no se afirma cuál rige allí.`,
    unusable: (pct) => `Hasta ${pct} del sector corresponde a geometrías de la fuente no utilizables (cota superior).`,
    withoutDescription: (pct) => `${pct} del sector está cubierto por unidades sin descripción original.`,
    mapDateUnknown: 'La fecha del levantamiento geológico no está informada por la fuente.',
    unitsNote: 'Las unidades se listan por su fracción del sector; la capa no localiza dónde está cada una dentro de la ventana en esta ficha ni atribuye unidades al hueco. Los porcentajes de unidades no se suman: el solape cuenta en cada una.',
    windowContext: 'Contexto de la ventana completa del snapshot; no describe el punto o área pedidos ni se hereda a esa geometría.',
  },
  excludedReason: {
    no_cumple_requisitos: 'Descartado por requisitos imprescindibles incumplidos: la geología no lo rehabilita y no se le orienta reconocimiento geológico.',
    objetivo_no_soportado: 'El objetivo no corresponde al perfil soportado: no se orienta reconocimiento geológico.',
  },
  missingSite: 'El paquete geológico no trae este sector; no se emite contexto geológico.',
  noFullEvaluation: 'Sin evaluación completa de ventana: no se emiten unidades geológicas.',
  notice: {
    anthropic: 'Selección asistida por IA (Anthropic) entre referencias que calcula la app a partir de la cartografía oficial y de su objetivo confirmado. La IA no escribe hechos geológicos: cada punto es orientación editorial, no una medición.',
    deterministic_template: 'Orientación general sin IA: prioriza los límites del mapa y la unidad principal; no depende de su objetivo. Es orientación editorial, no una medición.',
  },
  scopeNote: 'Su geometría es un punto o área: lo que sigue es geología de la ventana completa elegida, no del punto o área pedidos.',
  exportDescription:
    'Contexto geológico cartográfico de un sector de AnalogOS, exportado de forma independiente. Describe qué '
    + 'unidades están cartografiadas en la capa oficial citada y qué parte del sector no tiene cobertura; no mide '
    + 'el terreno ni expresa aptitud, confianza ni compatibilidad planetaria.',
  exportHowToRead: [
    'availability describe evidencia cartográfica, nunca aptitud: available = cobertura completa de esta capa sin '
    + 'ambigüedad ni descripciones ausentes; partial = hay huecos, solapes o descripciones ausentes; no_coverage = '
    + 'esta capa no cubre el sector; unavailable = hay evidencia no utilizable.',
    'area_fractions son fracciones del área del sector y suman 1 sin renormalizar: unmapped + covered_unambiguous + '
    + 'covered_ambiguous + unusable_upper_bound. Cobertura no es precisión.',
    'Este archivo es un subconjunto: contiene un solo sector y las peticiones que lo respaldan. '
    + 'full_candidates_file_sha256 es el hash del archivo completo candidate-details.json del que salió el paquete; '
    + 'este subconjunto no es ese archivo.',
    'Las verification_questions son orientación editorial, no mediciones.',
  ],
  wrapper: {
    description:
      'Recomendación de AnalogOS con orientación geológica para la prueba. Contiene, sin cambios, la exportación de recomendación M8 1.0 '
      + '(resultado determinista) y, aparte, la orientación geológica efectivamente usada con sus fuentes y límites.',
    howToRead: [
      'mission_export es la exportación M8 1.0 íntegra: el resultado determinista de requisitos no cambia por la geología.',
      'geology_guidance es una capa separada: cartografía regional oficial (no medición de campo) y orientación editorial para reconocimiento y validación; no prueba tracción, mecánica de suelos, equivalencia marciana, seguridad ni permisos, y un sector descartado no se rehabilita por su geología.',
      'mode = ai: la IA solo eligió referencias (unidad + propósito) de un catálogo calculado a partir de la cartografía; no escribió hechos. mode = deterministic: orientación general sin IA que no depende del objetivo.',
      'context_identity declara la identidad del paquete geológico completo (no verificable desde este archivo) y la huella exacta de los subconjuntos incluidos (subset_fingerprint, recalculable). geology_exports son subconjuntos validables por sector; con el snapshot confiable también se contrasta su geometría. El catálogo y la guía se recalculan al validar.',
    ],
    fingerprintMethod: 'SHA-256 del JSON canónico COMPLETO del contexto geológico validado (shared/mission/fingerprint.ts); no es el hash de los bytes del archivo.',
    subsetFingerprintMethod: 'SHA-256 del JSON canónico de la lista de subconjuntos geology-export incluidos en este archivo (cubre geometría, unidades, fuentes, citas, peticiones y metadatos de cada sector usado). Se recalcula aquí.',
    identityNote: 'Este archivo trae solo los sectores usados (cada uno validable por sí solo); la identidad del paquete completo está DECLARADA y no puede recalcularse aquí, porque se omiten los demás sectores.',
  },
}

// --- Version 2: English ------------------------------------------------------------------------------------------

const decimalEn = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** Same honest boundaries as version 1: never 100% unless exact, and “<0.1%” / “>99.9%” instead of 0% / 100%. */
function formatCoverageEn(fraction: number): string {
  const percent = fraction * 100
  if (percent === 0) return '0%'
  if (percent >= 100 - 1e-6) return '100%'
  if (percent < 0.1) return '<0.1%'
  if (percent > 99.9) return '>99.9%'
  return `${decimalEn.format(percent)}%`
}

function formatScaleLabelEn(denominator: number): string {
  return `1:${new Intl.NumberFormat('en-US').format(denominator)}`
}

const unitLabelEn = (u: UnitIdentity): string => `“${u.name ?? u.code ?? 'unnamed unit'}”${u.code ? ` (code ${u.code})` : ''}`

const SOURCE_LANGUAGE_NOTE =
  'Language: authored text is English. Values copied verbatim from the official sources and the stored geology package '
  + '(unit names, codes and descriptions, source and dataset titles, attribution, license, transformations, limitations, '
  + 'editorial_note and verification_questions) keep their original wording, mostly Spanish; they are source evidence and are not translated.'

const GEOLOGY_TEXT_EN: GeologyText = {
  lang: 'en',
  formatCoverage: formatCoverageEn,
  formatScaleLabel: formatScaleLabelEn,
  availabilityLabel: {
    available: 'Complete map coverage',
    partial: 'Partial coverage',
    no_coverage: 'No coverage in this layer',
    unavailable: 'Unusable evidence',
  },
  purposeLabel: {
    verificar_hueco_cartografico: 'Check the area without a polygon',
    resolver_ambiguedad: 'Resolve overlap between units',
    confirmar_descripcion_ausente: 'Confirm the missing description',
    correspondencia_mapa_terreno: 'Check map-to-ground correspondence',
    caracterizar_material_superficial: 'Characterize surface material (to be measured)',
    diversidad_litologica_muestreo: 'Recognize lithological diversity',
    contrastar_escala: 'Compare the map scale',
  },
  purposeText(purpose, unit, ctx) {
    const u = unit ? unitLabelEn(unit) : ''
    switch (purpose) {
      case 'verificar_hueco_cartografico':
        return `Check what is in the part of the sector without a polygon or unusable in this layer (${formatCoverageEn(ctx.gapFraction)} of the area). Lack of coverage is not lack of geology. Editorial guidance, not a measurement.`
      case 'resolver_ambiguedad':
        return `Resolve with the official source which unit applies where ${u} overlaps another (${formatCoverageEn(unit?.fraction_in_ambiguity ?? 0)} of the sector is overlap of this unit with others). Editorial guidance, not a measurement.`
      case 'confirmar_descripcion_ausente':
        return `Obtain the description of ${u}, which the source does not provide, before using it for planning. Editorial guidance, not a measurement.`
      case 'correspondencia_mapa_terreno':
        return `Check in the field whether what is observed where ${u} was mapped matches its official description. Editorial guidance, not a measurement.`
      case 'caracterizar_material_superficial':
        return `Measure in the field the grain size, compaction and friction of the surface material where ${u} was mapped; the map does not report them and they must not be inferred from its name. Editorial guidance, not a measurement.`
      case 'diversidad_litologica_muestreo':
        return `Recognize ${u} in the field among the ${ctx.unitCount} mapped units to plan sampling or instrumentation. Editorial guidance, not a measurement.`
      case 'contrastar_escala':
        return `Compare this regional mapping (${formatScaleLabelEn(ctx.scaleDenominator)}) with more detailed mapping before planning a test. Editorial guidance, not a measurement.`
    }
  },
  limits: {
    regional: (scale, authority) => `Regional mapping ${scale} (${authority}): not a field measurement, and not proof of traction, soil mechanics, Martian equivalence, safety or permits.`,
    status: (label) => `Evidence status: ${label}. Coverage is not precision or suitability.`,
    noCoverage: 'This layer does not cover the sector: there are no units to cite. It does not mean there is no geology, and it does not rule out the sector.',
    unmapped: (pct) => `${pct} of the sector has no polygon in this layer; no units are located inside that gap and it is not filled from other layers.`,
    ambiguous: (pct) => `${pct} of the sector has overlap between different units; which one applies there is not stated.`,
    unusable: (pct) => `Up to ${pct} of the sector corresponds to source geometries that could not be used (upper bound).`,
    withoutDescription: (pct) => `${pct} of the sector is covered by units without an original description.`,
    mapDateUnknown: 'The date of the geological survey is not reported by the source.',
    unitsNote: 'Units are listed by their fraction of the sector; this sheet does not locate where each one lies within the window and does not attribute units to the gap. Unit percentages do not add up: overlap counts in each one.',
    windowContext: 'Context of the full snapshot window; it does not describe the requested point or area and is not inherited by that geometry.',
  },
  excludedReason: {
    no_cumple_requisitos: 'Discarded for failed must-have requirements: geology does not rehabilitate it, and no geological reconnaissance is suggested for it.',
    objetivo_no_soportado: 'The objective does not match the supported profile: no geological reconnaissance is suggested.',
  },
  missingSite: 'The geology package does not include this sector; no geological context is issued.',
  noFullEvaluation: 'No complete window evaluation: no geological units are issued.',
  notice: {
    anthropic: 'AI-assisted selection (Anthropic) among references that the app computes from the official mapping and your confirmed objective. The AI does not write geological facts: each item is editorial guidance, not a measurement.',
    deterministic_template: 'General guidance without AI: it prioritizes the map limits and the main unit; it does not depend on your objective. It is editorial guidance, not a measurement.',
  },
  scopeNote: 'Your geometry is a point or area: what follows is the geology of the full chosen window, not of the requested point or area.',
  exportDescription:
    'Map-based geological context for one AnalogOS sector, exported on its own. It describes which units are mapped in the '
    + 'cited official layer and which part of the sector has no coverage; it does not measure the terrain or express suitability, '
    + 'confidence or planetary compatibility.',
  exportHowToRead: [
    'availability describes map evidence, never suitability: available = complete coverage by this layer with no ambiguity '
    + 'or missing descriptions; partial = there are gaps, overlaps or missing descriptions; no_coverage = this layer does not '
    + 'cover the sector; unavailable = there is unusable evidence.',
    'area_fractions are fractions of the sector area and add up to 1 without renormalization: unmapped + covered_unambiguous + '
    + 'covered_ambiguous + unusable_upper_bound. Coverage is not precision.',
    'This file is a subset: it contains a single sector and the requests that support it. full_candidates_file_sha256 is the '
    + 'hash of the complete candidate-details.json file the package came from; this subset is not that file.',
    'The verification_questions are editorial guidance, not measurements.',
    SOURCE_LANGUAGE_NOTE,
  ],
  wrapper: {
    description:
      'AnalogOS recommendation with geological guidance for the test. It contains, unchanged, the mission recommendation export 1.1.0 '
      + '(deterministic result) and, separately, the geological guidance actually used, with its sources and limits.',
    howToRead: [
      'mission_export is the complete mission recommendation export 1.1.0: the deterministic requirements result does not change because of geology.',
      'geology_guidance is a separate layer: official regional mapping (not a field measurement) and editorial guidance for reconnaissance and validation; it does not prove traction, soil mechanics, Martian equivalence, safety or permits, and a discarded sector is not rehabilitated by its geology.',
      'mode = ai: the AI only chose references (unit + purpose) from a catalog computed from the mapping; it did not write facts. mode = deterministic: general guidance without AI that does not depend on the objective.',
      'context_identity declares the identity of the complete geology package (not verifiable from this file) and the exact fingerprint of the included subsets (subset_fingerprint, recomputable). geology_exports are subsets that can be validated per sector; with the trusted snapshot their geometry is also checked. The catalog and the guidance are recomputed on validation.',
      'Language: authored text (descriptions, limits, guidance, reasons and labels) is English. Values copied verbatim from the snapshot and the official geology sources (site names, field_checks, limitations, warnings, evidence claims and explanations, unit names and descriptions, source titles, editorial notes and verification questions) keep their original wording, mostly Spanish; they are source evidence and are not translated. Identifiers and enum values (for example priorizado_para_reconocimiento or verificar_hueco_cartografico) are stable codes, not prose.',
    ],
    fingerprintMethod: 'SHA-256 of the canonical JSON of the COMPLETE validated geology context (shared/mission/fingerprint.ts); it is not the hash of the file bytes.',
    subsetFingerprintMethod: 'SHA-256 of the canonical JSON of the list of geology-export subsets included in this file (covers geometry, units, sources, citations, requests and metadata of each sector used). Recomputed here.',
    identityNote: 'This file carries only the sectors used (each one can be validated on its own); the identity of the complete package is DECLARED and cannot be recomputed here, because the other sectors are omitted.',
  },
}

const GEOLOGY_PACKS: Record<GeologyTextVersion, GeologyText> = { 1: GEOLOGY_TEXT_ES, 2: GEOLOGY_TEXT_EN }

export const LEGACY_GEOLOGY_EXPORT_VERSION = 1 as const
export const DEFAULT_GEOLOGY_EXPORT_VERSION = 2 as const

export class UnsupportedGeologyVersionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UnsupportedGeologyVersionError'
  }
}

export function isGeologyTextVersion(value: unknown): value is GeologyTextVersion {
  return value === 1 || value === 2
}

/** Text pack of a geology export/wrapper version. Throws for anything unknown; never falls back. */
export function geologyText(version: unknown): GeologyText {
  if (!isGeologyTextVersion(version)) throw new UnsupportedGeologyVersionError(`Unsupported geology record version: ${String(version).slice(0, 40)}.`)
  return GEOLOGY_PACKS[version]
}

/** Explicit pairing: mission evaluation/export 1.0.0 ↔ geology version 1; 1.1.0 ↔ 2. */
export function geologyVersionFor(evaluationVersion: unknown): GeologyTextVersion {
  if (evaluationVersion === '1.0.0') return 1
  if (evaluationVersion === '1.1.0') return 2
  throw new UnsupportedGeologyVersionError(`Unsupported mission record version for geology: ${String(evaluationVersion).slice(0, 40)}.`)
}

export function evaluationVersionFor(geologyVersion: GeologyTextVersion): EvaluationVersion {
  return geologyVersion === 1 ? '1.0.0' : '1.1.0'
}
