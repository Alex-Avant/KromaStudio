import { describe, expect, it } from 'vitest';
import {
  getCalibrationGeometry,
  type CalibrationGeometry,
  type CalibrationRect,
} from './calibration-layout';

function overlaps(a: CalibrationRect, b: CalibrationRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function patternsFor(geometry: CalibrationGeometry): Array<{ name: string; rect: CalibrationRect }> {
  return [
    { name: 'degradado', rect: geometry.ramp },
    ...geometry.coveragePatches.map((rect, index) => ({ name: `parche ${index}`, rect })),
    ...geometry.circles.map((circle, index) => ({
      name: `círculo ${index}`,
      rect: {
        x: circle.x - circle.radius,
        y: circle.y - circle.radius,
        width: circle.radius * 2,
        height: circle.radius * 2,
      },
    })),
    ...geometry.lines.map((rect, index) => ({ name: `línea ${index}`, rect })),
    { name: 'tipografía', rect: geometry.textRow },
    ...geometry.colorBlocks.map((rect, index) => ({ name: `color ${index}`, rect })),
    { name: 'transparencia', rect: geometry.alphaRamp },
    { name: 'agujero', rect: geometry.holeBlock },
  ];
}

function expectValidLayout(geometry: CalibrationGeometry, canvasWidth: number, canvasHeight: number) {
  const patterns = patternsFor(geometry);

  for (const [bandName, band] of Object.entries(geometry.labelBands)) {
    for (const pattern of patterns) {
      expect(
        overlaps(band, pattern.rect),
        `${bandName} se cruza con ${pattern.name}`,
      ).toBe(false);
    }
  }

  for (const pattern of patterns) {
    expect(pattern.rect.x).toBeGreaterThanOrEqual(0);
    expect(pattern.rect.y).toBeGreaterThanOrEqual(0);
    expect(pattern.rect.x + pattern.rect.width).toBeLessThanOrEqual(canvasWidth);
    expect(pattern.rect.y + pattern.rect.height).toBeLessThanOrEqual(canvasHeight);
  }

  for (let first = 0; first < patterns.length; first++) {
    for (let second = first + 1; second < patterns.length; second++) {
      expect(
        overlaps(patterns[first].rect, patterns[second].rect),
        `${patterns[first].name} se cruza con ${patterns[second].name}`,
      ).toBe(false);
    }
  }
}

describe('calibration layout', () => {
  it('keeps label bands and patterns separated on the visual sheet', () => {
    expectValidLayout(getCalibrationGeometry(), 1200, 1600);
  });

  it('scales geometrically for the 300 and 600 DPI RIP sheets', () => {
    const base = getCalibrationGeometry();
    const doubled = getCalibrationGeometry(2400);

    expect(doubled.margin).toBe(base.margin * 2);
    expect(doubled.coveragePatches[0].width).toBeGreaterThan(
      base.coveragePatches[0].width * 1.9,
    );
    expect(doubled.circles[2].radius).toBe(base.circles[2].radius * 2);
    expectValidLayout(doubled, 2400, 3198);
  });
});
