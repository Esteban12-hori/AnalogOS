// Render del panel «Lectura de la comparativa» (renderToStaticMarkup, sin jsdom): hechos primero,
// rótulos fijos, estados de espera, «Desactualizado» y avisos de descarte.
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import type { AppData } from '../../shell/public'
import { INITIAL_MISSION_STATE, missionStore } from '../../state/mission'
import { uiActions, uiStore } from '../../state/ui'
import { ReadingPill } from './ReadingPill'
import { readingStore } from './readingStore'
import { ReadingSnippet } from './ReadingSnippet'
import ReadingView, { discardSummary } from './ReadingView'
import { applyOutcome, buildReading } from './runtime'
import { loadScienceSnapshot, YUNGAY } from './testSupport'
import type { Reading, ReadingBlock } from './types'

const snapshot = loadScienceSnapshot()
const ready: AppData = { status: 'ready', snapshot, visual: { status: 'loading' }, error: null }
const base = buildReading({ snapshot, context: 'base', mission: null })
const sim = `site:${YUNGAY}:similarity`

const summary: ReadingBlock = {
  key: 'summary:y',
  type: 'summary',
  order: 0,
  siteId: YUNGAY,
  siteIds: [],
  criterionId: null,
  factKind: null,
  checkRef: null,
  analogId: null,
  segments: [{ kind: 'text', text: 'Tiene una similitud de ' }, { kind: 'fact', id: sim, text: '75,7 %', criterionId: null, siteId: YUNGAY }, { kind: 'text', text: '.' }],
}

function withAi(patch: Partial<Reading['ai']>): Reading {
  return { ...base, ai: { ...base.ai, ...patch } }
}

afterEach(() => {
  readingStore.reset()
  uiStore.reset()
  missionStore.reset()
})

describe('ReadingView', () => {
  it('muestra los hechos del motor al instante, sin IA, con su rótulo', () => {
    readingStore.setSlot('base', { status: 'ready', reading: withAi({ status: 'facts_only', message: 'Sin análisis pregenerado disponible: se muestran solo los hechos.' }), error: null })
    const html = renderToStaticMarkup(<ReadingView data={ready} placement="panel" />)
    expect(html).toContain('Lectura de la comparativa')
    expect(html).toContain('Solo hechos del motor · sin IA')
    expect(html).toContain('Sin análisis pregenerado disponible')
    expect(html).toContain('75,7 %')
    expect(html).toContain('Pampa Yungay')
    expect(html).toContain('Este lugar')
    expect(html).toContain('Comparativa')
    expect(html).toContain('¿Qué cambiaría el ranking?')
    expect(html).toContain('Checklist de terreno')
    expect(html).toContain('Cifras: motor determinista')
    expect(html).toContain(base.packet.packet_hash)
    expect(html).toContain('role="tablist"')
  })

  it('el texto pregenerado se rotula «no científico» y sus fichas muestran la cifra del motor', () => {
    readingStore.setSlot('base', { status: 'ready', reading: withAi({ source: 'pregenerated', status: 'done', blocks: [summary] }), error: null })
    const html = renderToStaticMarkup(<ReadingView data={ready} placement="full" />)
    expect(html).toContain('Análisis pregenerado · no científico')
    expect(html).toContain('Redacción: texto pregenerado, no científico')
    // Cada bloque redactado se anuncia como tal (el ✦ es aria-hidden).
    expect(html).toContain('<span class="sr-only">Texto pregenerado, no científico: </span>')
    expect(html).toContain(`data-fact="${sim}"`)
    expect(html).toContain('Tiene una similitud de')
  })

  it('la IA en vivo lleva «interpreta, no puntúa» y avisa lo descartado', () => {
    const reading = withAi({ source: 'lktron', status: 'done', blocks: [summary], discards: [{ reason: 'unknown_ref', message: 'citaba un dato que no existe' }] })
    readingStore.setSlot('base', { status: 'ready', reading, error: null })
    const html = renderToStaticMarkup(<ReadingView data={ready} placement="rail" />)
    expect(html).toContain('Interpretación de IA · interpreta, no puntúa')
    expect(html).toContain('<span class="sr-only">Texto de IA: </span>')
    expect(html).toContain('1 frase descartada: citaba un dato que no existe')
  })

  it('huella distinta → «Desactualizado» y ningún texto de la IA', () => {
    const stale = { ...base, ai: applyOutcome({ ...base.ai, source: 'lktron', status: 'streaming', blocks: [summary] }, { kind: 'stale' }) }
    readingStore.setSlot('base', { status: 'ready', reading: stale, error: null })
    const html = renderToStaticMarkup(<ReadingView data={ready} placement="panel" />)
    expect(html).toContain('<strong>Desactualizado</strong> · el análisis recibido corresponde a otros datos')
    expect(html).not.toContain('Tiene una similitud de')
    // Sin texto de la IA a la vista, el rótulo no dice «IA».
    expect(html).toContain('Solo hechos del motor · sin IA')
    expect(html).not.toContain('Interpretación de IA')
  })

  it('una lectura de una misión anterior queda «Desactualizado»', () => {
    const profile = { id: 'mission:0a1b2c3d', origin: 'mission' as const, label: 'Perfil de misión', status: 'needs_calibration' as const, levels: {} as never, weights: {} as never, baseProfileId: 'mars-rover-screening-v2', baseProfileVersion: 'x' }
    const scoring = { profileId: profile.id, engineVersion: 'fixture', sites: [] }
    missionStore.setState({ ...INITIAL_MISSION_STATE, profile, scoring, revision: 2 })
    uiActions.setMode('mision')
    readingStore.setSlot('mission', { status: 'ready', reading: { ...base, key: 'mission:mission:0a1b2c3d:1', context: 'mission' }, error: null })
    const html = renderToStaticMarkup(<ReadingView data={ready} placement="panel" />)
    expect(html).toContain('Desactualizado')
    expect(html).toContain('misión anterior')
  })

  it('en Misión, mientras el motor trabaja: espera estática con el paso real', () => {
    uiActions.setMode('mision')
    uiActions.setMissionPhase('scoring')
    const html = renderToStaticMarkup(<ReadingView data={ready} placement="panel" />)
    expect(html).toContain('Esperando al motor (paso 3 de 4)')
    expect(html).toContain('la IA redacta en el paso 4')
    expect(html).toContain('aria-busy="true"')
  })

  it('cargando y error de datos', () => {
    expect(renderToStaticMarkup(<ReadingView data={{ ...ready, status: 'loading', snapshot: null }} placement="panel" />)).toContain('Cargando snapshot validado')
    expect(renderToStaticMarkup(<ReadingView data={{ ...ready, status: 'error', snapshot: null, error: 'x' }} placement="panel" />)).toContain('Sin snapshot validado')
  })

  it('resumen de descartes en plural', () => {
    expect(discardSummary({ ...base.ai, discards: [{ reason: 'cap', message: 'a' }, { reason: 'cap', message: 'a' }, { reason: 'digits', message: 'b' }] })).toBe('3 frases descartadas: a; b')
  })
})

describe('ReadingPill y ReadingSnippet', () => {
  it('la píldora es un disclosure con su estado; dice «pregenerada» cuando corresponde', () => {
    expect(renderToStaticMarkup(<ReadingPill data={ready} />)).toContain('aria-expanded="false"')
    readingStore.setSlot('base', { status: 'ready', reading: withAi({ source: 'pregenerated', status: 'done' }), error: null })
    expect(renderToStaticMarkup(<ReadingPill data={ready} />)).toContain('· pregenerada')
    expect(renderToStaticMarkup(<ReadingPill data={{ ...ready, status: 'loading', snapshot: null }} />)).toContain('disabled=""')
  })

  it('el fragmento no ocupa espacio sin texto validado', () => {
    readingStore.setSlot('base', { status: 'ready', reading: base, error: null })
    expect(renderToStaticMarkup(<ReadingSnippet siteId={YUNGAY} />)).toBe('')
    readingStore.setSlot('base', { status: 'ready', reading: withAi({ source: 'pregenerated', status: 'done', blocks: [summary] }), error: null })
    const html = renderToStaticMarkup(<ReadingSnippet siteId={YUNGAY} />)
    expect(html).toContain('Texto pregenerado · no científico')
    expect(html).toContain('75,7 %')
  })
})
