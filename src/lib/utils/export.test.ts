import { describe, expect, it } from 'vitest';
import type { HalftoneExportOptions } from './export';
import {
  exportFilename,
  exportMetricsFor,
  outputPixelDimensions,
  requiredPasses,
} from './export';

const options: HalftoneExportOptions = {
  lpi: 45,
  angle: 22.5,
  brightness: 0,
  contrast: 20,
  gamma: 1.1,
  minDot: 0.08,
  maxDot: 1,
  solidThreshold: 0.98,
  solidEnabled: false,
  edgeSmooth: true,
  edgeProtect: true,
  applicationMode: 'fades',
  dotShape: 'circle',
  dpi: 300,
  underbase: true,
  choke: 2.5,
  spread: 0,
  underbaseStyle: 'solid',
  colorMode: 'color',
  polarity: 'light',
  blackPoint: 0,
  whitePoint: 255,
  shirtColor: '#111111',
};

describe('export filenames', () => {
  it('describes tonal settings and polarity for the color separation', () => {
    const filename = exportFilename('color', options);
    expect(filename).toContain('kroma_circle_LPI45_ANG22.5_300DPI');
    expect(filename).toContain('_BR0_C20_G1.1_MD8.0_XD100_BP0_WP255_MODEfades_light_color.png');
    expect(filename).not.toContain('_CHK');
    expect(filename).not.toContain('_solid_');
  });

  it('includes choke and base style for the white separation', () => {
    const filename = exportFilename('underbase', options);
    expect(filename).toContain('_CHK2.5_SPR0_solid_light_white.png');
  });

  it('omits base details from composite when the underbase is disabled', () => {
    const filename = exportFilename('composite', { ...options, underbase: false });
    expect(filename).not.toContain('_CHK');
    expect(filename).toContain('_light_composite.png');
  });

  it('reflects dark polarity in the filename', () => {
    expect(exportFilename('color', { ...options, polarity: 'dark' })).toContain('_dark_color.png');
  });

  it('declares requested and effective DPI when the GPU reduces pixels', () => {
    const filename = exportFilename('color', options, {
      requestedDpi: 300,
      effectiveDpi: 150,
      exportScale: 0.5,
      exportPitch: 5,
      physicalWidthIn: 3.4,
      physicalHeightIn: 6.7,
      downscaled: true,
    });
    expect(filename).toContain('300DPI_eff150DPI');
    expect(filename).toContain('SIZE3.4x6.7in');
    expect(filename).not.toContain('_CHK');
  });
});

describe('export metrics', () => {
  it('derives true output pixels from physical dimensions and DPI', () => {
    expect(outputPixelDimensions(1200, 600, 300)).toEqual({
      width: 1200,
      height: 600,
      widthIn: 4,
      heightIn: 2,
    });
    expect(outputPixelDimensions(1200, 600, 300, { widthIn: 5 })).toEqual({
      width: 1500,
      height: 750,
      widthIn: 5,
      heightIn: 2.5,
    });
    expect(outputPixelDimensions(1200, 600, 300, { widthIn: 5, heightIn: 2, mirror: true })).toMatchObject({
      width: 1500,
      height: 600,
    });
    expect(outputPixelDimensions(1200, 600, 300, { widthIn: 5, keepAspect: false })).toMatchObject({
      width: 1500,
      height: 600,
    });
  });

  it('keeps the requested DPI when no reduction is needed', () => {
    const metrics = exportMetricsFor(
      { width: 1024, height: 512, logicalWidth: 1024, logicalHeight: 512 },
      300,
      30,
    );
    expect(metrics.downscaled).toBe(false);
    expect(metrics.exportScale).toBe(1);
    expect(metrics.effectiveDpi).toBe(300);
    expect(metrics.exportPitch).toBeCloseTo(10, 6);
  });

  it('preserves physical size and LPI by lowering the effective DPI', () => {
    const logicalWidth = 1024;
    const metrics = exportMetricsFor(
      { width: 512, height: 256, logicalWidth, logicalHeight: 512 },
      300,
      30,
    );
    expect(metrics.downscaled).toBe(true);
    expect(metrics.exportScale).toBe(0.5);
    expect(metrics.effectiveDpi).toBe(150);
    expect(metrics.exportPitch).toBeCloseTo(5, 6);

    const physicalWidth = 512 / metrics.effectiveDpi;
    expect(physicalWidth).toBeCloseTo(logicalWidth / 300, 6);
  });
});

describe('export passes', () => {
  it('renders only the requested color pass', () => {
    expect(requiredPasses(['color'], { underbase: true })).toEqual({
      color: true,
      underbase: false,
    });
  });

  it('renders only the white pass for the underbase export', () => {
    expect(requiredPasses(['underbase'], { underbase: true })).toEqual({
      color: false,
      underbase: true,
    });
  });

  it('renders both passes for a composite with underbase', () => {
    expect(requiredPasses(['composite'], { underbase: true })).toEqual({
      color: true,
      underbase: true,
    });
  });

  it('skips the white pass for a composite without underbase', () => {
    expect(requiredPasses(['composite'], { underbase: false })).toEqual({
      color: true,
      underbase: false,
    });
  });

  it('shares both passes across a full calibration sheet', () => {
    expect(requiredPasses(['color', 'underbase', 'composite'], { underbase: true })).toEqual({
      color: true,
      underbase: true,
    });
  });
});
