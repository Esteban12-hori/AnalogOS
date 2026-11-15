// Adaptadores de la Lectura en Misión (docs/INTEGRATION_PLAN.md §5.3): todas las cifras salen de
// MissionEvaluation; la selección (plantilla o IA) solo aporta IDs. La plantilla va rotulada y sin
// ✦; ✦ solo con la procedencia «anthropic». Evaluación real del equipo sobre el snapshot v3.
import { describe, expect, it } from 'vitest'
import { composeExplanation, deterministicSelection, type ExplanationSelection } from '../../mission'
import { evaluateExample, YUNGAY } from '../../tests/v3Support'
import { AI_LABEL, evidenceHref, explanationToReading, readingKey, requirementLine, snippetFor, TEMPLATE_LABEL } from './explanationToReading'

const { evaluation } = evaluateExample()
const template = composeExplanation(evaluation, deterministicSelection(evaluation), 'deterministic_template')
const provenance = { provider: 'anthropic' as const, model: 'claude-sonnet-5-5', request_id: 'req_fixture', created_at: '2026-11-14T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' }

describe('explanationToReading', () => {
  it('plantilla determinista: rotulada, sin ✦ y sin procedencia de IA', () => {
    const model = explanationToReading(template, evaluation, 1)
    expect(model.highlights.source).toBe('deterministic_template')
    expect(model.highlights.label).toBe(TEMPLATE_LABEL)
    expect(model.highlights.label).not.toContain('✦')
    expect(model.highlights.provenance).toBeNull()
    expect(model.result.label).toBe('Cálculo determinista · reglas mission-rules-1.0.0 · similitud v3 sin recalcular')
    expect(model.result.orderingRule).toBe(evaluation.ordering_rule)
  })

  it('✦ y procedencia solo cuando la selección viene de Anthropic', () => {
    const view = composeExplanation(evaluation, deterministicSelection(evaluation), 'anthropic')
    const model = explanationToReading(view, evaluation, 2, provenance)
    expect(model.highlights.label).toBe(AI_LABEL)
    expect(model.highlights.label.startsWith('✦')).toBe(true)
    expect(model.highlights.provenance).toBe('claude-sonnet-5-5 · 2026-11-14 · req_fixture')
  })

  it('las cifras salen de la evaluación: lo exigido y lo observado son los del motor, nunca de la selección', () => {
    const model = explanationToReading(template, evaluation, 1)
    for (const option of model.highlights.options) {
      const evaluated = evaluation.options.find((item) => item.site_id === option.siteId)!
      for (const line of option.lines) {
        const result = evaluated.requirement_results.find((item) => item.requirement_id === line.requirementId)!
        expect(line).toEqual(requirementLine(result, evaluation))
        expect(line.text.startsWith(result.required)).toBe(true)
        expect(line.reason).toBe(result.reason)
      }
    }
  })

  it('una selección solo puede destacar IDs; el texto se resuelve contra la evaluación', () => {
    const target = evaluation.options.find((option) => option.requirement_results.some((result) => result.status !== 'cumple'))!
    const id = target.requirement_results.find((result) => result.status !== 'cumple')!.requirement_id
    const selection: ExplanationSelection = { options: [{ site_id: target.site_id, key_requirement_ids: [id], evidence_ids: [] }], verification_ids: [] }
    const model = explanationToReading(composeExplanation(evaluation, selection, 'anthropic'), evaluation, 3, provenance)
    expect(model.highlights.options).toHaveLength(1)
    expect(model.highlights.options[0]?.lines.map((line) => line.requirementId)).toEqual([id])
  })

  it('grupos del resultado en el orden del equipo, con bloqueos y qué cambiaría', () => {
    const model = explanationToReading(template, evaluation, 1)
    const statuses = model.result.groups.map((group) => group.status)
    const order = ['priorizado_para_reconocimiento', 'no_cumple_requisitos', 'evidencia_insuficiente', 'objetivo_no_soportado']
    expect(statuses).toEqual(order.filter((status) => statuses.includes(status as never)))
    expect(model.result.groups.flatMap((group) => group.options).length).toBe(evaluation.options.length)
    expect(model.result.limits).toEqual(evaluation.limits)
  })

  it('readingKey cambia con la solicitud y con la revisión', () => {
    expect(readingKey(evaluation, 4)).toBe(`mission:${evaluation.request_fingerprint}:4`)
    expect(readingKey(evaluation, 5)).not.toBe(readingKey(evaluation, 4))
  })

  it('snippetFor: primer motivo destacado del sitio, con su marca; null sin explicación', () => {
    const site = template.options.find((option) => option.highlighted.length > 0)
    expect(site).toBeDefined()
    expect(snippetFor(template, evaluation, site!.site_id)).toMatch(/^[✓✕○] /)
    expect(snippetFor(null, evaluation, YUNGAY)).toBeNull()
    expect(snippetFor(template, evaluation, 'no-existe')).toBeNull()
  })

  it('evidenceHref: artefactos con URL https y datos derivados a la pestaña Fuentes', () => {
    const artifact = evaluation.evidence.find((item) => item.kind === 'artifact' && item.source_url?.startsWith('https://'))
    if (artifact) expect(evidenceHref(artifact.evidence_id, evaluation)).toEqual({ url: artifact.source_url })
    expect(evidenceHref('cl-a#site-record', evaluation)).toEqual({ tab: 'fuentes', anchor: 'site-record' })
  })
})
