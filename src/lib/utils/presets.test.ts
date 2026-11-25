import { describe, expect, it } from 'vitest';
import { detectHalftonePreset, HALFTONE_PRESETS, getHalftonePreset } from './presets';

describe('professional halftone presets', () => {
  it('contains the four reproducible configurations from the brief', () => {
    expect(HALFTONE_PRESETS.dtfStandard.settings).toMatchObject({
      lpi: 35, angle: 22.5, dotShape: 'circle', minDot: 0.08, maxDot: 1, dpi: 300, applicationMode: 'fades',
    });
    expect(HALFTONE_PRESETS.fineDetail.settings).toMatchObject({
      lpi: 45, angle: 22.5, dotShape: 'ellipse', minDot: 0.05, maxDot: 1, dpi: 300, applicationMode: 'fades',
    });
    expect(HALFTONE_PRESETS.vintage.settings).toMatchObject({
      lpi: 25, angle: 22.5, dotShape: 'circle', minDot: 0.1, maxDot: 1, dpi: 300, applicationMode: 'knockout',
    });
    expect(HALFTONE_PRESETS.softFade.settings).toMatchObject({
      lpi: 35, angle: 22.5, dotShape: 'ellipse', minDot: 0.08, maxDot: 1, dpi: 300, applicationMode: 'fades',
    });
  });

  it('returns a fresh full configuration and detects exact preset matches', () => {
    const first = getHalftonePreset('dtfStandard');
    const second = getHalftonePreset('dtfStandard');
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(detectHalftonePreset(first)).toBe('dtfStandard');
    expect(detectHalftonePreset({ ...first, lpi: 36 })).toBeNull();
  });
});
