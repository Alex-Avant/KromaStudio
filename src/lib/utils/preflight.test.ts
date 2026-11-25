import { describe, expect, it } from 'vitest';
import type { HalftoneImageStats } from '../types/halftone';
import { buildPreflightWarnings, preflightSummary } from './preflight';

function stats(overrides: Partial<HalftoneImageStats> = {}): HalftoneImageStats {
  return {
    width: 1200,
    height: 1600,
    transparentRatio: 0,
    partialAlphaRatio: 0,
    opaqueRatio: 1,
    borderOpaqueRatio: 1,
    borderMeanLuma: 0.5,
    darkOpaqueBorder: false,
    hasTransparency: false,
    ...overrides,
  };
}

describe('preflight warnings', () => {
  it('warns about an opaque dark border in dark polarity', () => {
    const warnings = buildPreflightWarnings(
      stats({ darkOpaqueBorder: true, borderMeanLuma: 0 }),
      'dark',
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0].level).toBe('warning');
    expect(warnings[0].text).toContain('Sombras imprimen');
  });

  it('informs about an opaque dark border in light polarity', () => {
    const warnings = buildPreflightWarnings(
      stats({ darkOpaqueBorder: true, borderMeanLuma: 0 }),
      'light',
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0].level).toBe('info');
    expect(warnings[0].text).toContain('Luces imprimen');
  });

  it('warns about partial alpha because the RIP decides its treatment', () => {
    const warnings = buildPreflightWarnings(
      stats({ partialAlphaRatio: 0.1, hasTransparency: true }),
      'light',
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0].level).toBe('warning');
    expect(warnings[0].text).toContain('semitransparentes');
  });

  it('stays quiet for a clean transparent source', () => {
    expect(
      buildPreflightWarnings(
        stats({
          transparentRatio: 0.4,
          partialAlphaRatio: 0.01,
          hasTransparency: true,
          borderOpaqueRatio: 0.2,
        }),
        'light',
      ),
    ).toEqual([]);
  });
});

describe('preflight summary', () => {
  it('reports physical dimensions and alpha percentages', () => {
    const summary = preflightSummary(
      stats({ width: 1200, height: 1600, transparentRatio: 0.25, partialAlphaRatio: 0.05 }),
      300,
    );
    expect(summary).toContain('1200 × 1600 px');
    expect(summary).toContain('4.00 × 5.33 in');
    expect(summary).toContain('300 DPI');
    expect(summary).toContain('alfa 25.0 %');
    expect(summary).toContain('parcial 5.0 %');
  });

  it('reports configured output pixels when physical dimensions differ from source', () => {
    const summary = preflightSummary(stats({ width: 1200, height: 1600 }), 300, 4, 6);
    expect(summary).toContain('Fuente 1200 × 1600 px');
    expect(summary).toContain('Salida 1200 × 1800 px');
    expect(summary).toContain('4.00 × 6.00 in');
  });
});
