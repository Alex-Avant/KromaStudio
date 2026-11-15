import { describe, expect, it } from 'vitest';
import type { HalftoneExportOptions } from './export';
import { ripCalibrationFilename, ripCalibrationSize } from './calibration-rip';

const options: HalftoneExportOptions = {
  lpi: 45,
  angle: 45,
  contrast: 1,
  gamma: 1,
  minDot: 0.01,
  shadowPoint: 0.97,
  dotShape: 'circle',
  dpi: 300,
  underbase: true,
  choke: 1,
  underbaseStyle: 'dot',
  colorMode: 'color',
  polarity: 'light',
  blackPoint: 0,
  whitePoint: 1,
  shirtColor: '#111111',
};

describe('RIP calibration sheet', () => {
  it('keeps a 4 × 5.33 inch physical size at the chosen DPI', () => {
    expect(ripCalibrationSize(300)).toEqual({ width: 1200, height: 1599 });
    expect(ripCalibrationSize(600)).toEqual({ width: 2400, height: 3198 });
  });

  it('falls back to 300 DPI for invalid values', () => {
    expect(ripCalibrationSize(0)).toEqual({ width: 1200, height: 1599 });
  });

  it('names the transparent plate independently from the visual sheet', () => {
    const name = ripCalibrationFilename(options);
    expect(name).toContain('kroma_calibracion_rip_circle_LPI45_ANG45_300DPI_4x5.33in_light.png');
    expect(name).not.toContain('composite');
  });
});
