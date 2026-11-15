import { describe, expect, it } from 'vitest';
import { QA_FIXTURES, QA_TONE_LADDER, QA_TONE_VALUES, toneLadderRegions } from './qa-fixtures';

describe('QA fixtures', () => {
  it('defines unique, drawable fixtures with positive dimensions', () => {
    const ids = new Set<string>();
    for (const fixture of QA_FIXTURES) {
      expect(fixture.id.length).toBeGreaterThan(0);
      expect(ids.has(fixture.id)).toBe(false);
      ids.add(fixture.id);
      expect(fixture.width).toBeGreaterThan(0);
      expect(fixture.height).toBeGreaterThan(0);
      expect(typeof fixture.draw).toBe('function');
    }
  });

  it('keeps the tone ladder ordered and evenly divided', () => {
    for (let index = 1; index < QA_TONE_VALUES.length; index++) {
      expect(QA_TONE_VALUES[index]).toBeGreaterThan(QA_TONE_VALUES[index - 1]);
    }

    const regions = toneLadderRegions(QA_TONE_LADDER.width);
    expect(regions).toHaveLength(QA_TONE_VALUES.length);
    expect(regions[0].x).toBe(0);
    expect(regions.at(-1)!.x + regions.at(-1)!.width).toBe(QA_TONE_LADDER.width);
  });
});
