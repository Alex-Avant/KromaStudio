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
    lpi: 35,
    angle: 22.5,
    brightness: 0,
    contrast: 0,
    gamma: 1,
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
    choke: 1,
    spread: 0,
    underbaseStyle: 'dot',
    colorMode: 'color',
    polarity: 'light',
    blackPoint: 0,
    whitePoint: 255,
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

  it('packs style, polarity, quality toggles and application mode in uniform flags', () => {
    expect(binding(buildHalftoneParameters(values(), COLOR_MODE), 12)[3]).toBe(12);
    expect(
      binding(
        buildHalftoneParameters(values({ polarity: 'dark', underbaseStyle: 'solid' }), COLOR_MODE),
        12,
      )[3],
      ).toBe(15);
    expect(
      binding(
        buildHalftoneParameters(values({ polarity: 'dark', underbaseStyle: 'dot' }), COLOR_MODE),
        12,
      )[3],
      ).toBe(14);
    expect(
      binding(buildHalftoneParameters(values({ applicationMode: 'knockout' }), COLOR_MODE), 12)[3],
    ).toBe(44);
    expect(
      binding(buildHalftoneParameters(values({ applicationMode: 'full' }), COLOR_MODE), 12)[3],
    ).toBe(76);
    expect(binding(buildHalftoneParameters(values({ mirror: true }), COLOR_MODE), 12)[3]).toBe(140);
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

  it('packs choke, spread, max dot and solid threshold into one vec4', () => {
    const parameters = buildHalftoneParameters(
      values({ choke: 9, spread: 1.5, maxDot: 1, solidThreshold: 0.95 }),
      COLOR_MODE,
    );
    expect(binding(parameters, 4).map((value) => Number(value.toFixed(3)))).toEqual([3, 1.5, 1, 0.95]);
  });

  it('packs brightness, additive contrast, gamma and min dot into tone vec4', () => {
    const parameters = buildHalftoneParameters(
      values({ brightness: -20, contrast: 30, gamma: 1.2, minDot: 0.08 }),
      COLOR_MODE,
    );
    expect(binding(parameters, 3).map((value) => Number(value.toFixed(2)))).toEqual([-0.2, 30, 1.2, 0.08]);
  });

  it('returns no bindings for an empty image', () => {
    expect(buildHalftoneParameters(values({ imageWidth: 0, pixels: new Uint32Array() }), COLOR_MODE)).toEqual([]);
  });
});
