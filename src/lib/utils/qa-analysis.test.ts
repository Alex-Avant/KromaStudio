import { describe, expect, it } from 'vitest';
import { estimatePeriod } from './qa-analysis';
import { screenThreshold } from './screen-math';

function sine(period: number, length = 128): number[] {
  return Array.from({ length }, (_, index) => Math.sin((2 * Math.PI * index) / period));
}

function square(period: number, length = 128): number[] {
  return Array.from({ length }, (_, index) => (index % period < period / 2 ? 1 : 0));
}

function lineScreenSignal(lpi: number, length = 256): number[] {
  const cell = 300 / lpi;
  return Array.from({ length }, (_, index) => {
    const gridY = (index + 0.5) / cell;
    const localY = gridY - Math.floor(gridY) - 0.5;
    return 0.5 >= screenThreshold(0, localY, 'line') ? 1 : 0;
  });
}

describe('QA period estimation', () => {
  it('finds the period of a sampled sine wave', () => {
    expect(estimatePeriod(sine(8), 2, 20)).toBeCloseTo(8, 1);
    expect(estimatePeriod(sine(10), 2, 20)).toBeCloseTo(10, 1);
  });

  it('finds the first period of a square wave', () => {
    expect(estimatePeriod(square(10), 2, 20)).toBeCloseTo(10, 0);
  });

  it('estimates a non-integer period within a fraction of a pixel', () => {
    const measured = estimatePeriod(sine(6.6667), 2, 20);
    expect(Math.abs(measured - 6.6667)).toBeLessThan(0.5);
  });

  it('recovers the pitch of a rasterized line screen', () => {
    for (const lpi of [25, 35, 45]) {
      const expected = 300 / lpi;
      const measured = estimatePeriod(
        lineScreenSignal(lpi),
        Math.max(2, Math.floor(expected) - 3),
        Math.ceil(expected) + 3,
      );
      expect(Math.abs(measured - expected)).toBeLessThan(0.75);
    }
  });
});
