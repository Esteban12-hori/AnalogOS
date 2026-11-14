// La web no calcula scores: los produce pipelines/scoring.py. Aquí solo se ordena y resume.
import type { CandidateSite, ScoreItem } from './contracts';

/**
 * Ranking determinista: similitud descendente; sin similitud (datos insuficientes) al final;
 * empates por site_id. La confianza y la factibilidad no participan: no se mezclan con la similitud.
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

/** Suma de pesos de los criterios que sí entraron al score. */
export function validWeight(breakdown: readonly ScoreItem[]): number {
  return breakdown.reduce((sum, item) => sum + (item.status === 'valid' ? item.weight : 0), 0);
}
