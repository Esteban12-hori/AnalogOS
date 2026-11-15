/**
 * Tesla lines catalog (area ui-core, docs/I18N.md §7): labels, honesty header, chip and the “Lines” switch. The layer is
 * aria-hidden (it duplicates the metrics rail) but its visible text follows the language. English verbatim; Spanish from
 * git 273e5f8 (features/leaders/*).
 */
import { defineMessages } from '../translate'

export const tLeaders = defineMessages({
  en: {
    'toggle': 'Lines',
    'toggle.on': 'on',
    'toggle.off': 'off',
    'header.wholeSector': 'Whole sector',
    'header.medians': 'medians',
    'header.mediansScale': 'medians {scale}',
    'header.withRequirements': 'with your requirements',
    'chip': 'Metrics in the panel',
    'tag.limiting': 'limiting',
    'rule': 'rule',
    'similarity': 'similarity',
    'noMars': 'Mars: no comparable measurement',
    'ruleSaturates': 'meets the rule · does not mean equal to Mars',
    'saturates': 'saturates',
    'noData': 'no data',
    'notYetCalculated': 'not yet calculated',
  },
  es: {
    'toggle': 'Líneas',
    'toggle.on': 'sí',
    'toggle.off': 'no',
    'header.wholeSector': 'Todo el sector',
    'header.medians': 'medianas',
    'header.mediansScale': 'medianas {scale}',
    'header.withRequirements': 'con tus requisitos',
    'chip': 'Métricas en el panel',
    'tag.limiting': 'limitante',
    'rule': 'regla',
    'similarity': 'similitud',
    'noMars': 'Marte: sin medición comparable',
    'ruleSaturates': 'cumple la regla · no significa igual a Marte',
    'saturates': 'satura',
    'noData': 'sin dato',
    'notYetCalculated': 'por calcular',
  },
})
