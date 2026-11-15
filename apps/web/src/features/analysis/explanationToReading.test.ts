// Mission Reading adapters (docs/INTEGRATION_PLAN.md §5.3): all figures come from
// MissionEvaluation; the selection (template or AI) only provides IDs. The template is labeled and has no
// ✦; ✦ only with the provenance «anthropic». Real evaluation by the team on the v3 snapshot.
import { describe, expect, it } from 'vitest'
import { composeExplanation, deterministicSelection, type ExplanationSelection } from '../../mission'
import { evaluateExample, YUNGAY } from '../../tests/v3Support'
import { AI_LABEL, emptyNote, evidenceHref, explanationToReading, readingKey, requirementLine, snippetFor, TEMPLATE_LABEL } from './explanationToReading'

const { evaluation } = evaluateExample()
const template = composeExplanation(evaluation, deterministicSelection(evaluation), 'deterministic_template')
const provenance = { provider: 'anthropic' as const, model: 'claude-sonnet-5-5', request_id: 'req_fixture', created_at: '2026-11-14T00:00:00.000Z', usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' }

describe('explanationToReading', () => {
  it('deterministic template: labeled, without ✦ and without AI provenance', () => {
    const model = explanationToReading(template, evaluation, 1)
    expect(model.highlights.source).toBe('deterministic_template')
    expect(model.highlights.label).toBe(TEMPLATE_LABEL)
    expect(model.highlights.label).not.toContain('✦')
    expect(model.highlights.provenance).toBeNull()
    expect(model.result.label).toBe('Deterministic calculation · rules mission-rules-1.0.0 · v3 similarity not recalculated')
    expect(model.result.orderingRule).toBe(evaluation.ordering_rule)
  })

  it('AI label and provenance only when the selection comes from Anthropic (the view adds the ✦, once)', () => {
    const view = composeExplanation(evaluation, deterministicSelection(evaluation), 'anthropic')
    const model = explanationToReading(view, evaluation, 2, provenance)
    expect(model.highlights.source).toBe('anthropic')
    expect(model.highlights.label).toBe(AI_LABEL)
    expect(model.highlights.label).not.toContain('✦')
    expect(model.highlights.provenance).toBe('claude-sonnet-5-5 · 2026-11-14 · req_fixture')
  })

  it('AI does not rank: with the selection reversed, places follow the evaluation order', () => {
    const forward = deterministicSelection(evaluation)
    const inverted: ExplanationSelection = { options: [...forward.options].reverse(), verification_ids: [...forward.verification_ids].reverse() }
    const model = explanationToReading(composeExplanation(evaluation, inverted, 'anthropic'), evaluation, 2, provenance)
    const order = evaluation.options.map((option) => option.site_id)
    expect(model.highlights.options.map((option) => option.siteId)).toEqual(order)
    // The checks do follow the AI's order: the view says so («in the order the AI suggests»).
    expect(model.highlights.verifications.map((item) => item.id)).toEqual(inverted.verification_ids)
  })

  it('empty AI selection: does not claim everything is met; names the omitted places', () => {
    const unmet = evaluation.options.filter((option) => option.requirement_results.some((result) => result.status !== 'cumple'))
    expect(unmet.length).toBeGreaterThan(0)
    const empty: ExplanationSelection = { options: [], verification_ids: [] }
    const model = explanationToReading(composeExplanation(evaluation, empty, 'anthropic'), evaluation, 2, provenance)
    expect(model.highlights.emptyNote).toBe(`The AI did not highlight reasons for ${unmet.length} places; the calculation blockers are in “Result”.`)
    expect(model.highlights.emptyNote).not.toContain('Todos los requisitos se cumplen')
    expect(model.highlights.omitted.map((option) => option.siteId)).toEqual(unmet.map((option) => option.site_id))
    // Options present but with no highlighted requirements: same treatment.
    const noKeys: ExplanationSelection = { options: unmet.map((option) => ({ site_id: option.site_id, key_requirement_ids: [], evidence_ids: [] })), verification_ids: [] }
    const keyless = explanationToReading(composeExplanation(evaluation, noKeys, 'anthropic'), evaluation, 2, provenance)
    expect(keyless.highlights.omitted).toHaveLength(unmet.length)
    expect(keyless.highlights.emptyNote).toContain('The AI did not highlight reasons')
  })

  it('“all requirements are met” only when the evaluation says so', () => {
    expect(explanationToReading(template, evaluation, 1).highlights.emptyNote).toBeNull()
    expect(explanationToReading(template, evaluation, 1).highlights.omitted).toEqual([])
    const allMet = { ...evaluation, options: evaluation.options.map((option) => ({ ...option, requirement_results: option.requirement_results.map((result) => ({ ...result, status: 'cumple' as const })) })) }
    const model = explanationToReading(composeExplanation(allMet, { options: [], verification_ids: [] }, 'anthropic'), allMet, 1, provenance)
    expect(model.highlights.emptyNote).toBe('Every requirement is met where there is evidence: there are no reasons to highlight.')
    expect(emptyNote({ ...evaluation, outcome: 'insufficient_coverage' }, 0, 0, true)).toContain('the diagnosis is in “Result”')
  })

  it('figures come from the evaluation: required and observed are the engine values, never from the selection', () => {
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

  it('a selection can only highlight IDs; the text is resolved against the evaluation', () => {
    const target = evaluation.options.find((option) => option.requirement_results.some((result) => result.status !== 'cumple'))!
    const id = target.requirement_results.find((result) => result.status !== 'cumple')!.requirement_id
    const selection: ExplanationSelection = { options: [{ site_id: target.site_id, key_requirement_ids: [id], evidence_ids: [] }], verification_ids: [] }
    const model = explanationToReading(composeExplanation(evaluation, selection, 'anthropic'), evaluation, 3, provenance)
    expect(model.highlights.options).toHaveLength(1)
    expect(model.highlights.options[0]?.lines.map((line) => line.requirementId)).toEqual([id])
  })

  it('result groups in the team order, with blockers and what would change', () => {
    const model = explanationToReading(template, evaluation, 1)
    const statuses = model.result.groups.map((group) => group.status)
    const order = ['priorizado_para_reconocimiento', 'no_cumple_requisitos', 'evidencia_insuficiente', 'objetivo_no_soportado']
    expect(statuses).toEqual(order.filter((status) => statuses.includes(status as never)))
    expect(model.result.groups.flatMap((group) => group.options).length).toBe(evaluation.options.length)
    expect(model.result.limits).toEqual(evaluation.limits)
  })

  it('readingKey changes with the request and with the revision', () => {
    expect(readingKey(evaluation, 4)).toBe(`mission:${evaluation.request_fingerprint}:4`)
    expect(readingKey(evaluation, 5)).not.toBe(readingKey(evaluation, 4))
  })

  it('snippetFor: first highlighted reason of the site, with its mark; null without explanation', () => {
    const site = template.options.find((option) => option.highlighted.length > 0)
    expect(site).toBeDefined()
    expect(snippetFor(template, evaluation, site!.site_id)).toMatch(/^[✓✕○] /)
    expect(snippetFor(null, evaluation, YUNGAY)).toBeNull()
    expect(snippetFor(template, evaluation, 'no-existe')).toBeNull()
  })

  it('evidenceHref: artifacts with https URL and derived data to the Sources tab', () => {
    const artifact = evaluation.evidence.find((item) => item.kind === 'artifact' && item.source_url?.startsWith('https://'))
    if (artifact) expect(evidenceHref(artifact.evidence_id, evaluation)).toEqual({ url: artifact.source_url })
    expect(evidenceHref('cl-a#site-record', evaluation)).toEqual({ tab: 'fuentes', anchor: 'site-record' })
  })
})
