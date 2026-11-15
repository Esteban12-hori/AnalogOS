// ADR-017: Spanish display of record text. The engine itself is the oracle: for the same confirmed request, the
// Spanish wording that the frozen packs write (mission 1.0.0 / geology version 1) must be exactly what the display
// layer shows for the English record (1.1.0 / version 2). Records are never rebuilt or changed for display.
import { describe, expect, it } from 'vitest'
import { loadTrustedBundle } from '../../../../server/ai/facts'
import { loadTrustedGeology } from '../../../../server/ai/geology'
import { buildGeologyCatalog, composeGeologyGuidance, deterministicGeologyRefs, GEOLOGY_NOTICE, PURPOSE_LABEL } from '../../../../shared/geology/guidance'
import { LIMITS, ORDERING_RULE } from '../../../../shared/mission/catalog'
import { STATUS_DEFINITIONS } from '../../../../shared/mission/exportReport'
import { geologyText } from '../../../../shared/geology/text'
import { EN_TEXT } from '../../../../shared/mission/text/en'
import { ES_TEXT } from '../../../../shared/mission/text/es'
import {
  buildVerificationCatalog, composeExplanation, deterministicSelection, evaluateMission, type EvaluationVersion, type MissionRequest,
} from '../mission'
import { CASES } from '../tests/legacyCases'
import {
  CONSTANT_CONFLICTS, coverageEnToEs, displayGeologyPack, displayMissionPack, displayRecordText, displayRecordTexts, numberEnToEs, translateRecordText,
} from './recordText'

const bundle = loadTrustedBundle()
const geo = loadTrustedGeology(bundle)
if (geo.status !== 'ready') throw new Error('The official geology package must be present and valid for these tests.')
const { context, fingerprint: ctxFp } = geo

function records(request: MissionRequest, version: EvaluationVersion) {
  const evaluation = evaluateMission(request, bundle, { version })
  const catalog = buildGeologyCatalog(evaluation, context, ctxFp)
  const guidance = composeGeologyGuidance(catalog, deterministicGeologyRefs(catalog).ref_ids, 'deterministic_template')
  return {
    evaluation,
    verifications: buildVerificationCatalog(evaluation),
    explanation: composeExplanation(evaluation, deterministicSelection(evaluation), 'deterministic_template'),
    catalog,
    guidance,
  }
}

/** Version markers and hashes differ by design; every other string leaf is either the same fact or its wording. */
const SKIP_KEY = /fingerprint|_version$|^version$|sha256/

function pairs(en: unknown, es: unknown, path: string, out: Array<{ path: string; en: string; es: string }>): void {
  if (typeof en === 'string') {
    expect(typeof es, path).toBe('string')
    out.push({ path, en, es: es as string })
    return
  }
  if (Array.isArray(en)) {
    expect(Array.isArray(es) && es.length === en.length, `${path}: same length`).toBe(true)
    en.forEach((item, i) => pairs(item, (es as unknown[])[i], `${path}[${i}]`, out))
    return
  }
  if (en && typeof en === 'object') {
    for (const [key, value] of Object.entries(en)) {
      if (SKIP_KEY.test(key)) continue
      pairs(value, (es as Record<string, unknown>)[key], `${path}.${key}`, out)
    }
  }
}

describe('displayRecordText: Spanish display of English records equals the Spanish packs (engine as oracle)', () => {
  for (const [name, request] of Object.entries(CASES)) {
    it(`${name}: evaluation, verifications, explanation, geology catalog and guidance`, () => {
      const en = records(request, '1.1.0')
      const es = records(request, '1.0.0')
      const leaves: Array<{ path: string; en: string; es: string }> = []
      pairs(en, es, name, leaves)
      let translated = 0
      for (const leaf of leaves) {
        expect(displayRecordText(leaf.en, 'es'), leaf.path).toBe(leaf.es)
        // English is the record language: never altered.
        expect(displayRecordText(leaf.en, 'en'), leaf.path).toBe(leaf.en)
        if (leaf.en !== leaf.es) translated++
      }
      expect(translated).toBeGreaterThan(0)
    })
  }

  it('the pairing of pack constants has no ambiguity', () => {
    expect(CONSTANT_CONFLICTS).toEqual([])
  })

  it('user-authored text, source evidence and IDs are never translated (returned unchanged)', () => {
    for (const text of ['preference', 'Traction', 'Slope: whatever I want', 'cl-win-s2500-w06970', 'Mediana de pendiente NASADEM', '']) {
      expect(displayRecordText(text, 'es')).toBe(text)
    }
    expect(translateRecordText('Observed value 1.2.3° meets the condition ≤ 3°.')).toBeNull()
    // A user label shaped like a record string keeps its own wording inside the Spanish template.
    expect(displayRecordText(EN_TEXT.verification.measure('Observed value 3°'), 'es')).toBe(ES_TEXT.verification.measure('Observed value 3°'))
  })

  it('number formats are converted exactly as the frozen packs print them (no rounding)', () => {
    for (const x of [0, 1, -2.5, 3.14159, 1234.5, 12345.5, 1234567.891, 0.000001, 1e-7, 2.5e21, 95, 0.95]) {
      expect(numberEnToEs(EN_TEXT.fmtNumber(x)), String(x)).toBe(ES_TEXT.fmtNumber(x))
    }
    const geoEn = geologyText(2)
    const geoEs = geologyText(1)
    for (const f of [0, 0.0004, 0.123, 0.4567, 0.9995, 1]) expect(coverageEnToEs(geoEn.formatCoverage(f)), String(f)).toBe(geoEs.formatCoverage(f))
    expect(numberEnToEs('1234')).toBeNull()
  })

  it('UI constants bound to the English pack by ADR-016 map to the Spanish pack sentences', () => {
    const geoEs = geologyText(1)
    expect(displayRecordTexts(LIMITS, 'es')).toEqual(ES_TEXT.limits)
    expect(displayRecordText(ORDERING_RULE, 'es')).toBe(ES_TEXT.orderingRule)
    for (const [key, text] of Object.entries(STATUS_DEFINITIONS)) expect(displayRecordText(text, 'es'), key).toBe(ES_TEXT.statusDefinitions[key])
    for (const [key, text] of Object.entries(PURPOSE_LABEL)) expect(displayRecordText(text, 'es'), key).toBe(geoEs.purposeLabel[key as keyof typeof PURPOSE_LABEL])
    for (const [key, text] of Object.entries(GEOLOGY_NOTICE)) expect(displayRecordText(text, 'es'), key).toBe(geoEs.notice[key as keyof typeof GEOLOGY_NOTICE])
  })

  it('arrays and packs for formatting follow the language', () => {
    expect(displayRecordTexts(EN_TEXT.limits, 'es')).toEqual(ES_TEXT.limits)
    expect(displayRecordTexts(EN_TEXT.limits, 'en')).toEqual(EN_TEXT.limits)
    expect(displayMissionPack('es')).toBe(ES_TEXT)
    expect(displayMissionPack('en')).toBe(EN_TEXT)
    expect(displayGeologyPack('es').lang).toBe('es')
    expect(displayGeologyPack('en').lang).toBe('en')
  })
})
