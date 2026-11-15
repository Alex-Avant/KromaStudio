import { describe, expect, it } from 'vitest';
import {
  cellCenterCanvas,
  cellSizePx,
  circleCellArea,
  gridSampleAt,
  screenInk,
  screenThreshold,
  toneCoverage,
  type ScreenShape,
} from './screen-math';

describe('AM screen geometry', () => {
  it('derives the physical cell size from DPI and LPI', () => {
    expect(cellSizePx(300, 45)).toBeCloseTo(6.6667, 3);
    expect(cellSizePx(600, 25)).toBeCloseTo(24, 6);
    expect(cellSizePx(0, 45)).toBeCloseTo(0.0001, 4);
  });

  it('keeps a constant distance between cell centers at 45 degrees', () => {
    const cell = 6.6667;
    const angle = Math.PI / 4;
    const first = cellCenterCanvas(0, 0, 1200, 1200, angle, cell);
    const right = cellCenterCanvas(1, 0, 1200, 1200, angle, cell);
    const down = cellCenterCanvas(0, 1, 1200, 1200, angle, cell);

    expect(Math.hypot(right.x - first.x, right.y - first.y)).toBeCloseTo(cell, 6);
    expect(Math.hypot(down.x - first.x, down.y - first.y)).toBeCloseTo(cell, 6);
  });

  it('places the center of a cell at local (0, 0)', () => {
    const cell = 10;
    const angle = Math.PI / 4;
    const center = cellCenterCanvas(3, -2, 800, 600, angle, cell);
    const sample = gridSampleAt(center.x, center.y, 800, 600, angle, cell);

    expect(sample.localX).toBeCloseTo(0, 6);
    expect(sample.localY).toBeCloseTo(0, 6);
  });

  it('produces a circular threshold whose area matches the requested coverage', () => {
    const samples = 400;
    const thresholds = new Map<number, number>();
    const coverages = [0.1, 0.25, 0.5, 0.75, 0.9];
    for (const coverage of coverages) thresholds.set(coverage, 0);

    for (let row = 0; row < samples; row++) {
      for (let column = 0; column < samples; column++) {
        const localX = (column + 0.5) / samples - 0.5;
        const localY = (row + 0.5) / samples - 0.5;
        const threshold = screenThreshold(localX, localY, 'circle');
        for (const coverage of coverages) {
          if (threshold <= coverage) {
            thresholds.set(coverage, (thresholds.get(coverage) ?? 0) + 1);
          }
        }
      }
    }

    for (const coverage of coverages) {
      const area = (thresholds.get(coverage) ?? 0) / (samples * samples);
      expect(area).toBeCloseTo(coverage, 2);
    }
  });

  it('compensates the clipped circle area above half a cell', () => {
    expect(circleCellArea(0.5)).toBeCloseTo(Math.PI / 4, 6);
    expect(circleCellArea(0.6)).toBeLessThan(Math.PI * 0.6 * 0.6);
    expect(circleCellArea(0.6)).toBeGreaterThan(0.9);
    expect(circleCellArea(0.70710678)).toBeCloseTo(1, 5);
  });

  it('keeps all shape thresholds ordered and inside the expected bounds', () => {
    const shapes: ScreenShape[] = ['circle', 'ellipse', 'diamond', 'square', 'line'];
    for (const shape of shapes) {
      expect(screenThreshold(0, 0, shape)).toBeCloseTo(0, 6);
      const corner = screenThreshold(0.5, 0.5, shape);
      expect(corner).toBeGreaterThanOrEqual(0.999);
    }
  });
});

describe('tone polarity and coverage', () => {
  it('prints light artwork in light polarity and dark artwork in dark polarity', () => {
    expect(toneCoverage(0, 'light')).toBe(0);
    expect(toneCoverage(1, 'light')).toBe(1);
    expect(toneCoverage(0, 'dark')).toBe(1);
    expect(toneCoverage(1, 'dark')).toBe(0);
  });

  it('never prints transparent pixels', () => {
    expect(toneCoverage(1, 'light', 0)).toBe(0);
    expect(toneCoverage(0, 'dark', 0)).toBe(0);
  });

  it('keeps the screen mask monotonic with antialiasing', () => {
    const threshold = screenThreshold(0.2, 0.1, 'circle');
    const low = screenInk(threshold - 0.1, threshold, 0.05);
    const middle = screenInk(threshold, threshold, 0.05);
    const high = screenInk(threshold + 0.1, threshold, 0.05);

    expect(low).toBeLessThan(middle);
    expect(middle).toBeLessThan(high);
    expect(high).toBe(1);
  });
});
