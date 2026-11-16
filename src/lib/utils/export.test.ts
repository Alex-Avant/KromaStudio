import { describe, expect, it } from 'vitest';
import type { HalftoneExportOptions } from './export';
import { exportFilename, exportMetricsFor, requiredPasses } from './export';

const options: HalftoneExportOptions = {
  lpi: 45,
  angle: 22.5,
  contrast: 1.2,
  gamma: 1.1,
  minDot: 0.01,
  shadowPoint: 0.97,
  dotShape: 'circle',
  dpi: 300,
  underbase: true,
  choke: 2.5,
  underbaseStyle: 'solid',
  colorMode: 'color',
  polarity: 'light',
  blackPoint: 0,
  whitePoint: 1,
  shirtColor: '#111111',
};

describe('export filenames', () => {
  it('describes tonal settings and polarity for the color separation', () => {
    const filename = exportFilename('color', options);
    expect(filename).toContain('kroma_circle_LPI45_ANG22.5_300DPI');
    expect(filename).toContain('_C1.2_G1.1_MD1.0_SH97_BP0_WP100_light_color.png');
    expect(filename).not.toContain('_CHK');
    expect(filename).not.toContain('_solid_');
  });

  it('includes choke and base style for the white separation', () => {
    const filename = exportFilename('underbase', options);
    expect(filename).toContain('_CHK2.5_solid_light_white.png');
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
      downscaled: true,
    });
    expect(filename).toContain('300DPI_eff150DPI');
    expect(filename).not.toContain('_CHK');
  });
});

describe('export metrics', () => {
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
