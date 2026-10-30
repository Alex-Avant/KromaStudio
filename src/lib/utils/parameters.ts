import type { HalftoneColorMode, HalftoneDotShape, SvaderParameter } from '../types/halftone';

export const COLOR_MODE = 0;
export const UNDERBASE_MODE = 1;

export interface HalftoneParameterValues {
  imageWidth: number;
  imageHeight: number;
  outputWidth: number;
  outputHeight: number;
  pixels: Uint32Array<ArrayBuffer>;
  lpi: number;
  angle: number;
  contrast: number;
  gamma: number;
  minDot: number;
  shadowPoint: number;
  dotShape: HalftoneDotShape;
  dpi: number;
  underbase: boolean;
  choke: number;
  colorMode: HalftoneColorMode;
  blackPoint: number;
  whitePoint: number;
}

/**
 * Construye los parámetros del shader en el orden exacto de sus bindings.
 * Se usa tanto en el preview (svader) como en el exportador WebGPU.
 */
export function buildHalftoneParameters(
  input: HalftoneParameterValues,
  mode: number,
): SvaderParameter[] {
  if (input.imageWidth <= 0 || input.imageHeight <= 0 || input.pixels.length === 0) {
    return [];
  }

  const safeLpi = Math.max(1, input.lpi);
  const safeDpi = Math.max(1, input.dpi);
  const safeContrast = Math.max(0, input.contrast);
  const safeGamma = Math.min(5, Math.max(0.1, input.gamma));
  const safeShadow = Math.min(1, Math.max(0.5, input.shadowPoint));
  const safeMinDot = Math.min(
    0.49,
    Math.max(0, input.minDot),
    Math.max(0, safeShadow - 0.01),
  );
  const safeChoke = Math.min(3, Math.max(0, input.choke));
  const safeBlack = Math.min(0.9, Math.max(0, input.blackPoint));
  const requestedWhite = Math.min(1, Math.max(0.1, input.whitePoint));
  const safeWhite = Math.min(1, Math.max(requestedWhite, safeBlack + 0.01));
  const safeOutputWidth = Math.max(1, input.outputWidth);
  const safeOutputHeight = Math.max(1, input.outputHeight);
  const colorMode = input.colorMode === 'color' ? 0 : 1;
  const dotShape = input.dotShape === 'ellipse' ? 1 : input.dotShape === 'diamond' ? 2 : 0;

  return [
    { label: 'Resolución', binding: 0, value: 'resolution' },
    { label: 'LPI', binding: 1, value: new Float32Array([safeLpi]) },
    {
      label: 'Ángulo',
      binding: 2,
      value: new Float32Array([(input.angle * Math.PI) / 180]),
    },
    {
      label: 'Contraste, gamma y límites de punto',
      binding: 3,
      value: new Float32Array([safeContrast, safeGamma, safeMinDot, safeShadow]),
    },
    { label: 'Choke', binding: 4, value: new Float32Array([safeChoke]) },
    {
      label: 'Underbase activo',
      binding: 5,
      value: new Uint32Array([input.underbase ? 1 : 0]),
    },
    { label: 'Modo de pasada', binding: 6, value: new Uint32Array([mode]) },
    {
      label: 'Tamaño de buffer y salida lógica',
      binding: 7,
      value: new Float32Array([
        input.imageWidth,
        input.imageHeight,
        safeOutputWidth,
        safeOutputHeight,
      ]),
    },
    { label: 'DPI de salida', binding: 8, value: new Float32Array([safeDpi]) },
    { label: 'Píxeles RGBA', binding: 9, value: input.pixels, storage: true },
    { label: 'Offset', binding: 10, value: 'offset' },
    {
      label: 'Modo de color',
      binding: 11,
      value: new Uint32Array([colorMode]),
    },
    {
      label: 'Niveles y forma de punto',
      binding: 12,
      value: new Float32Array([safeBlack, safeWhite, dotShape, 0]),
    },
  ];
}
