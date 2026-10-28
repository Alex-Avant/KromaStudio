import type { HalftoneColorMode, SvaderParameter } from '../types/halftone';

export const COLOR_MODE = 0;
export const UNDERBASE_MODE = 1;

export interface HalftoneParameterValues {
  imageWidth: number;
  imageHeight: number;
  pixels: Uint32Array<ArrayBuffer>;
  lpi: number;
  angle: number;
  contrast: number;
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
  const safeChoke = Math.min(3, Math.max(0, input.choke));
  const safeBlack = Math.min(0.9, Math.max(0, input.blackPoint));
  const requestedWhite = Math.min(1, Math.max(0.1, input.whitePoint));
  const safeWhite = Math.min(1, Math.max(requestedWhite, safeBlack + 0.01));
  const colorMode = input.colorMode === 'color' ? 0 : 1;

  return [
    { label: 'Resolución', binding: 0, value: 'resolution' },
    { label: 'LPI', binding: 1, value: new Float32Array([safeLpi]) },
    {
      label: 'Ángulo',
      binding: 2,
      value: new Float32Array([(input.angle * Math.PI) / 180]),
    },
    { label: 'Contraste', binding: 3, value: new Float32Array([safeContrast]) },
    { label: 'Choke', binding: 4, value: new Float32Array([safeChoke]) },
    {
      label: 'Underbase activo',
      binding: 5,
      value: new Uint32Array([input.underbase ? 1 : 0]),
    },
    { label: 'Modo de pasada', binding: 6, value: new Uint32Array([mode]) },
    {
      label: 'Tamaño de imagen',
      binding: 7,
      value: new Float32Array([input.imageWidth, input.imageHeight]),
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
      label: 'Niveles de negro y blanco',
      binding: 12,
      value: new Float32Array([safeBlack, safeWhite]),
    },
  ];
}
