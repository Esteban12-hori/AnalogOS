/**
 * AI client catalog (area ai-science, docs/I18N.md §7): the friendly messages of `mission/aiClient.ts` for every
 * failure path of the optional AI. English verbatim (current product text); Spanish from git 273e5f8 (same file).
 * Error CODES are never translated (they travel in `result.code`); only the message shown to the reader is.
 */
import { defineMessages } from '../translate'

export const tAi = defineMessages({
  en: {
    'error.ai_unavailable': 'AI assistance is not available right now or in this version.',
    'error.ai_timeout': 'The AI took too long to respond.',
    'error.ai_rate_limited': 'The AI provider rate-limited the requests; try again later.',
    'error.ai_refused': 'The AI could not process this content.',
    'error.ai_truncated': 'The AI response was incomplete and was discarded.',
    'error.ai_invalid_output': 'The AI response did not have the expected format and was discarded.',
    'error.ai_upstream_error': 'The AI service returned an error.',
    'error.rate_limited': 'Too many requests in a row; wait a minute.',
    'error.origin_not_allowed': 'This page is not authorized to use the AI.',
    'error.stale_request': 'The content changed; confirm again before asking for the explanation.',
    'error.invalid_request': 'The request is not valid; check the requirements.',
    'error.nothing_to_explain': 'There are no evaluated options to explain.',
    'error.geology_context_unavailable': 'The server has no valid geology context for this version, so no geological guidance was requested.',
    'error.geology_context_stale': 'The server geology context is a different version from the one this page shows, so no geological guidance was requested.',
    'error.generic': 'The AI returned an error.',
    'error.languageRejected': 'The AI server did not accept a draft in Spanish (it may be an earlier version). Switch the interface to English to request the draft in English.',
    noAi: 'The AI could not be used. You can continue manually: nothing you already did was lost.',
    offline: 'The AI is not available in this version or offline.',
    noResponse: 'The AI did not respond in time or there is no connection.',
    canceled: 'Request canceled.',
    invalidResponse: 'The AI response does not have the expected format and was discarded.',
  },
  es: {
    'error.ai_unavailable': 'La asistencia de IA no está disponible en este momento o en esta versión.',
    'error.ai_timeout': 'La IA tardó demasiado en responder.',
    'error.ai_rate_limited': 'El proveedor de IA limitó las solicitudes; reintente más tarde.',
    'error.ai_refused': 'La IA no pudo procesar este contenido.',
    'error.ai_truncated': 'La respuesta de la IA quedó incompleta y se descartó.',
    'error.ai_invalid_output': 'La respuesta de la IA no cumplió el formato esperado y se descartó.',
    'error.ai_upstream_error': 'El servicio de IA devolvió un error.',
    'error.rate_limited': 'Demasiadas solicitudes seguidas; espere un minuto.',
    'error.origin_not_allowed': 'Esta página no está autorizada para usar la IA.',
    'error.stale_request': 'El contenido cambió; vuelva a confirmar antes de pedir la explicación.',
    'error.invalid_request': 'La solicitud no es válida; revise los requisitos.',
    'error.nothing_to_explain': 'No hay opciones evaluadas que explicar.',
    'error.geology_context_unavailable': 'El servidor no tiene un contexto geológico válido para esta versión, así que no se pidió orientación geológica.',
    'error.geology_context_stale': 'El contexto geológico del servidor es de otra versión que el que muestra esta página, así que no se pidió orientación geológica.',
    'error.generic': 'La IA devolvió un error.',
    'error.languageRejected': 'El servidor de IA no aceptó un borrador en español (puede ser una versión anterior). Cambie la interfaz a inglés para pedir el borrador en inglés.',
    noAi: 'No se pudo usar la IA. Puede continuar manualmente: nada de lo que ya hizo se perdió.',
    offline: 'La IA no está disponible en esta versión o sin conexión.',
    noResponse: 'La IA no respondió a tiempo o no hay conexión.',
    canceled: 'Solicitud cancelada.',
    invalidResponse: 'La respuesta de la IA no tiene el formato esperado y se descartó.',
  },
})
