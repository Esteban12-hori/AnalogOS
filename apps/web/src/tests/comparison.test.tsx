// Compare from the sheet (team signature: ranked, references, rankOf): candidates in their overall position,
// the known reference listed separately and without a position, and always the figures from the v3 snapshot.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CandidateComparison, comparisonRows } from '../components/CandidateComparison'
import type { CandidateSite } from '../domain/contracts'
import { rankMap, splitByRole } from '../domain/discovery'

const root = resolve(__dirname, '../../../..')
const candidates = JSON.parse(readFileSync(resolve(root, 'artifacts/science-v3/candidate-details.json'), 'utf8')) as CandidateSite[]
const { ranked, references } = splitByRole(candidates)
const rankOf = rankMap(ranked)

describe('Comparar', () => {
  it('candidates with their global rank and the known reference last, without rank', () => {
    const rows = comparisonRows(ranked, references, rankOf)
    expect(rows).toHaveLength(candidates.length)
    expect(rows.slice(0, ranked.length).map((row) => row.rank)).toEqual(ranked.map((_, index) => index + 1))
    const reference = rows.at(-1)
    expect(reference?.candidate.site_id).toBe('cl-pampa-yungay-screening')
    expect(reference?.reference).toBe(true)
    expect(reference?.rank).toBeNull()
  })

  it('figures are the snapshot ones, not recalculated', () => {
    for (const row of comparisonRows(ranked, references, rankOf)) {
      expect(row.similarity).toBe(row.candidate.similarity)
      expect(row.confidence).toBe(row.candidate.confidence)
      expect(row.stability).toBe(row.candidate.stability)
    }
  })

  it('the REF card says “Known reference” and never shows a rank number', () => {
    const html = renderToStaticMarkup(
      <CandidateComparison ranked={ranked} references={references} rankOf={rankOf} selectedId={ranked[0]!.site_id} onSelect={() => undefined} />,
    )
    expect(html).toContain('REF · Known reference')
    expect(html).toContain('>01<')
    expect(html).toContain('Argentina')
    expect(html).not.toContain('motor v')
  })
})
