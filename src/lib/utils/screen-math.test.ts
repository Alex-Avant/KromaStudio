import { describe, expect, it } from 'vitest';
import {
  cellCenterCanvas,
  cellSizePx,
  adjustedTone,
  applicationAlpha,
  circleCellArea,
  diamondCellArea,
  ellipseCellArea,
  gridSampleAt,
  screenInk,
  screenThreshold,
  toneCoverage,
  underbaseOffset,
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

  it('compensates clipped ellipse and diamond areas', () => {
    expect(ellipseCellArea(0.5)).toBeCloseTo(0.5, 3);
    expect(ellipseCellArea(1)).toBeLessThan(1);
    expect(ellipseCellArea(1.75)).toBeCloseTo(1, 5);

    expect(diamondCellArea(0.5)).toBeCloseTo(0.5, 6);
    expect(diamondCellArea(0.75)).toBeCloseTo(0.875, 6);
    expect(diamondCellArea(1)).toBeCloseTo(1, 6);
  });

  it('keeps every shape at the requested coverage', () => {
    const samples = 400;
    const coverages = [0.5, 0.75, 0.9];
    const shapes: ScreenShape[] = ['circle', 'ellipse', 'diamond', 'square', 'line'];

    for (const shape of shapes) {
      const counts = new Map<number, number>(coverages.map((coverage) => [coverage, 0]));
      for (let row = 0; row < samples; row++) {
        for (let column = 0; column < samples; column++) {
          const localX = (column + 0.5) / samples - 0.5;
          const localY = (row + 0.5) / samples - 0.5;
          const threshold = screenThreshold(localX, localY, shape);
          for (const coverage of coverages) {
            if (threshold <= coverage) counts.set(coverage, (counts.get(coverage) ?? 0) + 1);
          }
        }
      }

      for (const coverage of coverages) {
        const area = (counts.get(coverage) ?? 0) / (samples * samples);
        expect(
          Math.abs(area - coverage),
          `${shape} con cobertura ${coverage} midió ${area.toFixed(4)}`,
        ).toBeLessThan(0.02);
      }
    }
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

describe('professional tone and mode semantics', () => {
  const neutralTone = {
    brightness: 0,
    contrast: 0,
    blackPoint: 0,
    whitePoint: 255,
    gamma: 1,
    polarity: 'light' as const,
  };

  it('applies brightness and centered additive contrast before the screen', () => {
    expect(adjustedTone(0.25, neutralTone)).toBeCloseTo(0.25, 6);
    expect(adjustedTone(0.25, { ...neutralTone, brightness: 50 })).toBeCloseTo(0.75, 6);
    expect(adjustedTone(0.25, { ...neutralTone, contrast: -100 })).toBeCloseTo(0.5, 6);
    expect(adjustedTone(0.25, { ...neutralTone, contrast: 100 })).toBeCloseTo(0, 6);
  });

  it('maps 8-bit levels, polarity and maximum dot coverage', () => {
    const mid = adjustedTone(128 / 255, {
      ...neutralTone,
      blackPoint: 64,
      whitePoint: 192,
      maxDot: 0.6,
    });
    expect(mid).toBeCloseTo(0.5, 2);
    expect(adjustedTone(0.5, { ...neutralTone, polarity: 'dark' })).toBeCloseTo(0.5, 6);
    expect(adjustedTone(1, { ...neutralTone, maxDot: 0.7 })).toBeCloseTo(0.7, 6);
  });

  it('distinguishes fades-only solids, full screens and midtone knockout alpha', () => {
    expect(applicationAlpha(1, 0.99, 0.995, 'fades', 0, 0.08, false, 0.98)).toBe(1);
    expect(applicationAlpha(1, 0.99, 0.995, 'full', 0, 0.08, false, 0.98)).toBe(0);
    expect(applicationAlpha(1, 0.5, 0.5, 'knockout', 0, 0.08)).toBe(0);
    expect(applicationAlpha(1, 0, 0.5, 'knockout', 0, 0.08)).toBe(1);
    expect(applicationAlpha(1, 1, 0.5, 'knockout', 0, 0.08)).toBe(1);
  });

  it('combines choke and spread as a deterministic net morphology operation', () => {
    expect(underbaseOffset(1, 0.5)).toEqual({ radius: 0.5, operation: 'erode' });
    expect(underbaseOffset(1, 2)).toEqual({ radius: 1, operation: 'dilate' });
    expect(underbaseOffset(2, 2)).toEqual({ radius: 0, operation: 'erode' });
  });
});
