// The web app does not calculate scores: they are produced by pipelines/scoring.py. Here we only sort and summarize.
import type { CandidateSite, ScoreItem } from './contracts';

/**
 * Deterministic ranking: similarity descending; items without similarity (insufficient data) at the end;
 * ties broken by site_id. Confidence and feasibility do not take part: they are not mixed with similarity.
 */
export function rankCandidates(candidates: readonly CandidateSite[]): CandidateSite[] {
  return [...candidates].sort((a, b) => {
    if (a.similarity !== b.similarity) {
      if (a.similarity === null) return 1;
      if (b.similarity === null) return -1;
      return b.similarity - a.similarity;
    }
    return a.site_id < b.site_id ? -1 : a.site_id > b.site_id ? 1 : 0;
  });
}

/** Sum of the weights of the criteria that did enter the score. */
export function validWeight(breakdown: readonly ScoreItem[]): number {
  return breakdown.reduce((sum, item) => sum + (item.status === 'valid' ? item.weight : 0), 0);
}
