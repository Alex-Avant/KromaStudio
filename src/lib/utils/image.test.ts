import { describe, expect, it } from 'vitest';
import { analyzePackedRgba } from './image';

function packed(r: number, g: number, b: number, a: number): number {
  return (r | (g << 8) | (b << 16) | (a << 24)) >>> 0;
}

function makePixels(
  width: number,
  height: number,
  fill: (x: number, y: number) => number,
): Uint32Array<ArrayBuffer> {
  const pixels = new Uint32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) pixels[y * width + x] = fill(x, y);
  }
  return pixels;
}

describe('image preflight stats', () => {
  it('detects fully transparent images', () => {
    const stats = analyzePackedRgba(
      makePixels(4, 4, () => packed(0, 0, 0, 0)),
      4,
      4,
      8,
      8,
    );
    expect(stats.width).toBe(8);
    expect(stats.height).toBe(8);
    expect(stats.transparentRatio).toBe(1);
    expect(stats.hasTransparency).toBe(true);
    expect(stats.darkOpaqueBorder).toBe(false);
  });

  it('detects opaque white and opaque black borders', () => {
    const white = analyzePackedRgba(
      makePixels(4, 4, () => packed(255, 255, 255, 255)),
      4,
      4,
      4,
      4,
    );
    expect(white.hasTransparency).toBe(false);
    expect(white.borderMeanLuma).toBeCloseTo(1, 4);
    expect(white.darkOpaqueBorder).toBe(false);

    const black = analyzePackedRgba(
      makePixels(4, 4, (x, y) =>
        x >= 1 && x <= 2 && y >= 1 && y <= 2
          ? packed(255, 255, 255, 255)
          : packed(0, 0, 0, 255),
      ),
      4,
      4,
      4,
      4,
    );
    expect(black.borderOpaqueRatio).toBe(1);
    expect(black.borderMeanLuma).toBe(0);
    expect(black.darkOpaqueBorder).toBe(true);
  });

  it('does not flag a transparent border with dark artwork inside', () => {
    const stats = analyzePackedRgba(
      makePixels(4, 4, (x, y) =>
        x >= 1 && x <= 2 && y >= 1 && y <= 2
          ? packed(0, 0, 0, 255)
          : packed(0, 0, 0, 0),
      ),
      4,
      4,
      4,
      4,
    );
    expect(stats.hasTransparency).toBe(true);
    expect(stats.borderOpaqueRatio).toBe(0);
    expect(stats.darkOpaqueBorder).toBe(false);
  });

  it('counts partial alpha separately from opaque pixels', () => {
    const stats = analyzePackedRgba(
      makePixels(4, 4, () => packed(255, 255, 255, 128)),
      4,
      4,
      4,
      4,
    );
    expect(stats.partialAlphaRatio).toBe(1);
    expect(stats.opaqueRatio).toBe(0);
    expect(stats.hasTransparency).toBe(true);
    expect(stats.borderOpaqueRatio).toBe(0);
  });
});
