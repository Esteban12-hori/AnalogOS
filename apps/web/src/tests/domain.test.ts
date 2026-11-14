import { describe, expect, it } from 'vitest';
import type { CandidateSite, ScoreItem } from '../domain/contracts';
import { formatArea, formatRawValue, formatScore } from '../domain/formatting';
import { rankCandidates, validWeight } from '../domain/scoring';

const site = (site_id: string, similarity: number | null, confidence = 50) =>
  ({ site_id, similarity, confidence }) as CandidateSite;

describe('rankCandidates', () => {
  it('ordena por similitud descendente y deja los insuficientes al final', () => {
    const ranked = rankCandidates([site('cl-a', 40), site('cl-b', null), site('cl-c', 90)]);
    expect(ranked.map((c) => c.site_id)).toEqual(['cl-c', 'cl-a', 'cl-b']);
  });

  it('es estable ante empates: desempata por site_id sin importar el orden de entrada', () => {
    const tied = [site('cl-z', 70), site('cl-a', 70), site('cl-m', 70), site('cl-q', null), site('cl-b', null)];
    const expected = ['cl-a', 'cl-m', 'cl-z', 'cl-b', 'cl-q'];
    expect(rankCandidates(tied).map((c) => c.site_id)).toEqual(expected);
    expect(rankCandidates([...tied].reverse()).map((c) => c.site_id)).toEqual(expected);
  });

  it('no usa la confianza para ordenar y no muta la entrada', () => {
    const input = [site('cl-a', 60, 10), site('cl-b', 50, 99)];
    expect(rankCandidates(input).map((c) => c.site_id)).toEqual(['cl-a', 'cl-b']);
    expect(input.map((c) => c.site_id)).toEqual(['cl-a', 'cl-b']);
  });
});

describe('validWeight', () => {
  it('suma solo criterios válidos', () => {
    const items = [
      { weight: 0.5, status: 'valid' },
      { weight: 0.3, status: 'missing' },
      { weight: 0.2, status: 'needs_calibration' },
    ] as ScoreItem[];
    expect(validWeight(items)).toBe(0.5);
  });
});

describe('formatting', () => {
  it('usa formato chileno y unidades', () => {
    expect(formatScore(77.83)).toBe('77,8');
    expect(formatArea(1945.5)).toBe('≈ 1.900 km²');
    expect(formatRawValue({ raw_value: 6.5, unit: 'degree' })).toBe('6,5°');
    expect(formatRawValue({ raw_value: null, unit: 'meter' })).toBe('sin valor bruto');
    expect(formatRawValue({ raw_value: 'clase-x', unit: 'category' })).toBe('clase-x');
  });
});
