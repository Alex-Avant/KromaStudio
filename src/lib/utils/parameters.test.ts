import { describe, expect, it } from 'vitest';
import type { SvaderParameter } from '../types/halftone';
import {
  buildHalftoneParameters,
  COLOR_MODE,
  MASK_MODE,
  UNDERBASE_MODE,
  type HalftoneParameterValues,
} from './parameters';

function values(overrides: Partial<HalftoneParameterValues> = {}): HalftoneParameterValues {
  return {
    imageWidth: 8,
    imageHeight: 8,
    outputWidth: 8,
    outputHeight: 8,
    pixels: new Uint32Array(64),
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
    ...overrides,
  };
}

function binding(parameters: SvaderParameter[], number: number): number[] {
  const parameter = parameters.find((entry) => entry.binding === number);
  if (!parameter || typeof parameter.value === 'string') {
    throw new Error(`Binding ${number} no encontrado.`);
  }
  return [...(parameter.value as Float32Array)];
}

function uintBinding(parameters: SvaderParameter[], number: number): number[] {
  const parameter = parameters.find((entry) => entry.binding === number);
  if (!parameter || typeof parameter.value === 'string') {
    throw new Error(`Binding ${number} no encontrado.`);
  }
  return [...(parameter.value as Uint32Array)];
}

describe('halftone parameters', () => {
  it('encodes pass mode independently from polarity and base style', () => {
    const parameters = values({ polarity: 'dark', underbaseStyle: 'solid' });
    expect(uintBinding(buildHalftoneParameters(parameters, COLOR_MODE), 6)).toEqual([0]);
    expect(uintBinding(buildHalftoneParameters(parameters, UNDERBASE_MODE), 6)).toEqual([1]);
    expect(uintBinding(buildHalftoneParameters(parameters, MASK_MODE), 6)).toEqual([2]);
  });

  it('packs light/dot flags as 0 and dark/solid as 3', () => {
    expect(binding(buildHalftoneParameters(values(), COLOR_MODE), 12)[3]).toBe(0);
    expect(
      binding(
        buildHalftoneParameters(values({ polarity: 'dark', underbaseStyle: 'solid' }), COLOR_MODE),
        12,
      )[3],
    ).toBe(3);
    expect(
      binding(
        buildHalftoneParameters(values({ polarity: 'dark', underbaseStyle: 'dot' }), COLOR_MODE),
        12,
      )[3],
    ).toBe(2);
  });

  it('maps every dot shape to its shader id', () => {
    const shapes = [
      ['circle', 0],
      ['ellipse', 1],
      ['diamond', 2],
      ['square', 3],
      ['line', 4],
    ] as const;

    for (const [dotShape, id] of shapes) {
      expect(binding(buildHalftoneParameters(values({ dotShape }), COLOR_MODE), 12)[2]).toBe(id);
    }
  });

  it('keeps choke and solid-base limits valid', () => {
    const parameters = buildHalftoneParameters(values({ choke: 9 }), COLOR_MODE);
    expect(binding(parameters, 4)[0]).toBe(3);
  });

  it('returns no bindings for an empty image', () => {
    expect(buildHalftoneParameters(values({ imageWidth: 0, pixels: new Uint32Array() }), COLOR_MODE)).toEqual([]);
  });
});
