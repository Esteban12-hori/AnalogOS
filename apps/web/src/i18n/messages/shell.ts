/**
 * Shell catalog (area ui-core, docs/I18N.md §7): top bar, mode tabs, language selector, sheet head, static shell and
 * the app-level states of App.tsx. English is the current product text verbatim; Spanish is the wording the product
 * used before ADR-016 at the same places (git 273e5f8) or its faithful translation.
 */
import { defineMessages } from '../translate'

export const tShell = defineMessages({
  en: {
    'brand.tagline': 'Chile–Argentina pilot',
    'meta.description': 'AnalogOS explores planetary analogs on Earth. Chile–Argentina pilot for Mars rover mobility and autonomy tests.',
    'scienceNote': 'PRELIMINARY SCIENTIFIC SCREENING · REAL DATA · NOT A TERRAIN AUTHORIZATION',
    'scienceNoteShort': 'PRELIMINARY · NOT A TERRAIN AUTHORIZATION',
    'fixtureNote': 'TECHNICAL DEMO · SYNTHETIC DATA · NOT A SCIENTIFIC RESULT',
    'fixtureNoteShort': 'DEMO · SYNTHETIC DATA',
    'composerPrompt': 'Describe the Mars test you want to run…',
    'credit': 'Data: {sources}',
    'mode.label': 'Mode',
    'mode.explore': 'Explore',
    'mode.mission': 'Mission',
    'mode.missionUnseen': 'Mission, new results available',
    'lang.group': 'Language',
    'lang.changed': 'Language: {name}',
    'aria.leftPanel': 'Your mission and reading',
    'sheet.reading': 'Reading',
    'sheet.places': 'Places',
    'sheet.back': '← Back',
    'sheet.closeReading': 'Close Reading',
    'sheet.worldReference': 'World reference',
    'sheet.details': 'Details',
    'sheet.closePlace': 'Close the place',
    'sheet.backToTray': 'Back to the tray',
    'app.promise':
      'Prioritizes which sectors deserve reconnaissance for a rover test, with regional measurements and pending field checks. It does not measure traction or approve terrain.',
    'app.errorKicker': '✕ Data error',
    'app.errorTitle': 'We could not open the demo.',
    'app.retry': 'Retry',
  },
  es: {
    'brand.tagline': 'Piloto Chile–Argentina',
    'meta.description': 'AnalogOS explora análogos planetarios en la Tierra. Piloto Chile–Argentina para pruebas de movilidad y autonomía de rover marciano.',
    'scienceNote': 'SCREENING CIENTÍFICO PRELIMINAR · DATOS REALES · NO ES AUTORIZACIÓN DE TERRENO',
    'scienceNoteShort': 'PRELIMINAR · NO AUTORIZA TERRENO',
    'fixtureNote': 'DEMOSTRACIÓN TÉCNICA · DATOS SINTÉTICOS · NO ES UN RESULTADO CIENTÍFICO',
    'fixtureNoteShort': 'DEMO · DATOS SINTÉTICOS',
    'composerPrompt': 'Describe la prueba que quieres hacer para Marte…',
    'credit': 'Datos: {sources}',
    'mode.label': 'Modo',
    'mode.explore': 'Explorar',
    'mode.mission': 'Misión',
    'mode.missionUnseen': 'Misión, hay resultados nuevos',
    'lang.group': 'Idioma',
    'lang.changed': 'Idioma: {name}',
    'aria.leftPanel': 'Tu misión y lectura',
    'sheet.reading': 'Lectura',
    'sheet.places': 'Lugares',
    'sheet.back': '← Volver',
    'sheet.closeReading': 'Cerrar la Lectura',
    'sheet.worldReference': 'Referencia mundial',
    'sheet.details': 'Ficha',
    'sheet.closePlace': 'Cerrar el lugar',
    'sheet.backToTray': 'Volver a la bandeja',
    'app.promise':
      'Prioriza qué sectores merecen reconocimiento para un ensayo de rover, con medidas regionales y verificaciones de campo pendientes. No mide tracción ni aprueba terreno.',
    'app.errorKicker': '✕ Error de datos',
    'app.errorTitle': 'No pudimos abrir la demostración.',
    'app.retry': 'Reintentar',
  },
})
