// Text the SERVER adds to an AI draft (clarification questions, safety-net questions, warnings and fallback labels), in
// the requested draft language (ADR-017). Fixed templates: they only interpolate the literal quote, a catalog name or a
// count, never provider text outside the quote. English is the current wording verbatim (absent language = English,
// byte-identical); Spanish is the wording the server used before ADR-016 (git 273e5f8, server/ai/operations.ts).
// This is draft text the user reviews and confirms (like anything typed in the composer); it is not record text.
import type { AiLanguage } from '../../shared/mission/aiSchemas'
import { METRICS, UNMEASURED_TOPICS } from '../../shared/mission/catalog'
import { ES_TEXT } from '../../shared/mission/text/es'
import type { MetricId } from '../../shared/mission/types'

export interface DraftText {
  /** Clarification question built from a reason and the literal quote. */
  quoted: (why: string, quote: string) => string
  threshold: string
  country: string
  figure: string
  requirement: string
  scaleQuestion: (metricLabel: string) => string
  metricLabel: (id: MetricId) => string
  topicLabel: (id: string) => string | undefined
  unmeasuredFallback: string
  discarded: (count: number) => string
  tooManyRequirements: string
  pendingSpecify: (text: string) => string
  mention: (matched: string, topicLabel: string) => string
  tooManyQuestions: string
}

/** Spanish metric names as the catalog had them before ADR-016 (git 273e5f8, shared/mission/catalog.ts). */
export const METRIC_LABEL_ES: Readonly<Record<MetricId, string>> = {
  median_slope_degree: 'Mediana de pendiente regional',
  terrain_roughness_meter: 'Rugosidad mediana',
  local_relief_meter: 'Relieve local mediano',
  nonvegetated_fraction: 'Fracción no vegetada',
  polygon_area_km2: 'Área del polígono completo',
  country: 'País',
}

const own = (map: Readonly<Record<string, string>>, key: string): string | undefined =>
  Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined

export const DRAFT_TEXT: Readonly<Record<AiLanguage, DraftText>> = {
  en: {
    quoted: (why, quote) => `${why}: “${quote}”`,
    threshold: 'Threshold still to be specified',
    country: 'Country still to be specified',
    figure: 'Figure still to be clarified (it does not appear in the quoted text)',
    requirement: 'Requirement still to be specified',
    scaleQuestion: (label) => `Does “${label}” refer to the regional median over the full window or to a point value? The text does not say; it was left at point scale (not assessable) until you specify it.`,
    metricLabel: (id) => METRICS[id].label,
    topicLabel: (id) => UNMEASURED_TOPICS.find((t) => t.id === id)?.label,
    unmeasuredFallback: 'Unmeasured request',
    discarded: (count) => `The AI proposed ${count} item(s) that could not be anchored in the text or do not match the catalog; they were discarded and are not part of the draft.`,
    tooManyRequirements: 'The maximum of 20 requirements was exceeded; the rest were kept as open questions.',
    pendingSpecify: (text) => `Still to be specified: “${text}”`,
    mention: (matched, label) => `The brief mentions “${matched}”: “${label}” is not measured in the v3 snapshot; if it matters, add it as a pending requirement.`,
    tooManyQuestions: 'There are more than 20 open questions; the first 20 are shown.',
  },
  es: {
    quoted: (why, quote) => `${why}: «${quote}»`,
    threshold: 'Pendiente de precisar el umbral',
    country: 'Pendiente de precisar el país',
    figure: 'Pendiente de aclarar la cifra (no aparece en el texto citado)',
    requirement: 'Pendiente de precisar el requisito',
    scaleQuestion: (label) => `¿«${label}» se refiere a la mediana regional de la ventana completa o a un valor puntual? El texto no lo dice; se dejó como escala puntual (no evaluable) hasta que lo precise.`,
    metricLabel: (id) => METRIC_LABEL_ES[id],
    // Topic names from the frozen Spanish pack (identical to the pre-ADR-016 catalog); only known topics, no fallback.
    topicLabel: (id) => own(ES_TEXT.topicLabel, id),
    unmeasuredFallback: 'Pedido no medido',
    discarded: (count) => `La IA propuso ${count} elemento(s) que no se pudieron anclar en el texto o no corresponden al catálogo; se descartaron y no forman parte del borrador.`,
    tooManyRequirements: 'Se superó el máximo de 20 requisitos; el resto quedó como preguntas abiertas.',
    pendingSpecify: (text) => `Pendiente de precisar: «${text}»`,
    mention: (matched, label) => `El brief menciona «${matched}»: «${label}» no está medido en el snapshot v3; si es relevante, agréguelo como requisito pendiente.`,
    tooManyQuestions: 'Hay más de 20 preguntas abiertas; se muestran las primeras 20.',
  },
}
