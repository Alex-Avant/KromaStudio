import type {
  HalftoneApplicationMode,
  HalftoneColorMode,
  HalftoneDotShape,
  HalftonePolarity,
  HalftoneUnderbaseStyle,
  SvaderParameter,
} from '../types/halftone';
import { validateNumericParameter } from './parameter-registry';

export const COLOR_MODE = 0;
export const UNDERBASE_MODE = 1;
export const MASK_MODE = 2;

export const APPLICATION_MODE_ID: Record<HalftoneApplicationMode, number> = {
  fades: 0,
  knockout: 1,
  full: 2,
};

export interface HalftoneParameterValues {
  imageWidth: number;
  imageHeight: number;
  outputWidth: number;
  outputHeight: number;
  pixels: Uint32Array<ArrayBuffer>;
  lpi: number;
  angle: number;
  brightness: number;
  contrast: number;
  gamma: number;
  minDot: number;
  maxDot: number;
  solidThreshold: number;
  solidEnabled: boolean;
  edgeSmooth: boolean;
  edgeProtect: boolean;
  applicationMode: HalftoneApplicationMode;
  dotShape: HalftoneDotShape;
  dpi: number;
  underbase: boolean;
  choke: number;
  spread: number;
  underbaseStyle: HalftoneUnderbaseStyle;
  colorMode: HalftoneColorMode;
  polarity: HalftonePolarity;
  blackPoint: number;
  whitePoint: number;
  mirror?: boolean;
}

/**
 * Uniform layout estable: conserva 12 uniforms en el fragment stage y empaqueta
 * los parámetros nuevos dentro de vec4 existentes, sin crear bindings extra.
 */
export function buildHalftoneParameters(
  input: HalftoneParameterValues,
  mode: number,
): SvaderParameter[] {
  if (input.imageWidth <= 0 || input.imageHeight <= 0 || input.pixels.length === 0) {
    return [];
  }

  const lpi = validateNumericParameter('lpi', input.lpi);
  const dpi = validateNumericParameter('dpi', input.dpi);
  const brightness = validateNumericParameter('brightness', input.brightness) / 100;
  const contrast = validateNumericParameter('contrast', input.contrast);
  const gamma = validateNumericParameter('gamma', input.gamma);
  const maxDot = validateNumericParameter('maxDot', input.maxDot);
  const minDot = Math.min(
    validateNumericParameter('minDot', input.minDot),
    maxDot,
  );
  const solidThreshold = validateNumericParameter('solidThreshold', input.solidThreshold);
  const choke = validateNumericParameter('choke', input.choke);
  const spread = validateNumericParameter('spread', input.spread);
  const blackPoint = Math.min(254, validateNumericParameter('blackPoint', input.blackPoint)) / 255;
  const whitePoint = Math.min(
    1,
    Math.max(
      blackPoint + 1 / 255,
      validateNumericParameter('whitePoint', input.whitePoint) / 255,
    ),
  );
  const outputWidth = Math.max(1, input.outputWidth);
  const outputHeight = Math.max(1, input.outputHeight);
  const colorMode = input.colorMode === 'color' ? 0 : 1;
  const underbaseSolid = input.underbaseStyle === 'solid';
  const darkPolarity = input.polarity === 'dark';
  const dotShape = input.dotShape === 'ellipse'
    ? 1
    : input.dotShape === 'diamond'
      ? 2
      : input.dotShape === 'square'
        ? 3
        : input.dotShape === 'line'
          ? 4
          : 0;

  // Binding 12.w: bit0=base sólida, bit1=polaridad dark, bit2=AA,
  // bit3=protección de bordes, bit4=umbral sólido; bits 5..6=modo;
  // bit7=espejo horizontal (solo exportación).
  const flags =
    (underbaseSolid ? 1 : 0) |
    (darkPolarity ? 2 : 0) |
    (input.edgeSmooth ? 4 : 0) |
    (input.edgeProtect ? 8 : 0) |
    (input.solidEnabled ? 16 : 0) |
    (APPLICATION_MODE_ID[input.applicationMode] << 5) |
    (input.mirror ? 128 : 0);

  return [
    { label: 'Resolución', binding: 0, value: 'resolution' },
    { label: 'LPI', binding: 1, value: new Float32Array([lpi]) },
    { label: 'Ángulo', binding: 2, value: new Float32Array([(input.angle * Math.PI) / 180]) },
    {
      label: 'Tono, brillo, contraste, gamma y punto mínimo',
      binding: 3,
      value: new Float32Array([brightness, contrast, gamma, minDot]),
    },
    {
      label: 'Choke, spread, punto máximo y umbral sólido',
      binding: 4,
      value: new Float32Array([choke, spread, maxDot, solidThreshold]),
    },
    { label: 'Underbase activo', binding: 5, value: new Uint32Array([input.underbase ? 1 : 0]) },
    { label: 'Modo de pasada', binding: 6, value: new Uint32Array([mode]) },
    {
      label: 'Tamaño de buffer y salida lógica',
      binding: 7,
      value: new Float32Array([input.imageWidth, input.imageHeight, outputWidth, outputHeight]),
    },
    { label: 'DPI de salida', binding: 8, value: new Float32Array([dpi]) },
    { label: 'Píxeles RGBA', binding: 9, value: input.pixels, storage: true },
    { label: 'Offset', binding: 10, value: 'offset' },
    { label: 'Modo de color', binding: 11, value: new Uint32Array([colorMode]) },
    {
      label: 'Niveles, forma y flags empaquetados',
      binding: 12,
      value: new Float32Array([blackPoint, whitePoint, dotShape, flags]),
    },
  ];
}
