import type {
  HalftoneColorMode,
  HalftoneDotShape,
  HalftonePolarity,
  HalftoneUnderbaseStyle,
} from '../types/halftone';

/** Ajustes del motor que se conservan en el navegador entre sesiones. */
export interface HalftoneSettings {
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
  underbaseStyle: HalftoneUnderbaseStyle;
  colorMode: HalftoneColorMode;
  polarity: HalftonePolarity;
  blackPoint: number;
  whitePoint: number;
  showUnderbase: boolean;
  shirtColor: string;
}

export const HALFTONE_DEFAULTS: HalftoneSettings = {
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
  showUnderbase: true,
  shirtColor: '#111111',
};

const STORAGE_KEY = 'kroma.halftone.settings.v1';
const SHIRT_PATTERN = /^#[0-9a-f]{6}$/i;

function numberIn(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function oneOf<T extends string>(
  value: unknown,
  fallback: T,
  options: readonly T[],
): T {
  return typeof value === 'string' && options.includes(value as T) ? (value as T) : fallback;
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function loadHalftoneSettings(): HalftoneSettings {
  try {
    const raw =
      typeof localStorage === 'undefined'
        ? null
        : localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...HALFTONE_DEFAULTS };

    const data = JSON.parse(raw) as Partial<HalftoneSettings>;
    return {
      // Los límites coinciden con los controles visibles para que un valor
      // restaurado nunca quede fuera del rango que muestra la interfaz.
      lpi: numberIn(data.lpi, HALFTONE_DEFAULTS.lpi, 10, 120),
      angle: numberIn(data.angle, HALFTONE_DEFAULTS.angle, 0, 180),
      contrast: numberIn(data.contrast, HALFTONE_DEFAULTS.contrast, 0.5, 2.5),
      gamma: numberIn(data.gamma, HALFTONE_DEFAULTS.gamma, 0.4, 2.5),
      minDot: numberIn(data.minDot, HALFTONE_DEFAULTS.minDot, 0, 0.2),
      shadowPoint: numberIn(data.shadowPoint, HALFTONE_DEFAULTS.shadowPoint, 0.8, 1),
      dotShape: oneOf(data.dotShape, HALFTONE_DEFAULTS.dotShape, [
        'circle',
        'ellipse',
        'diamond',
        'square',
        'line',
      ]),
      dpi: numberIn(data.dpi, HALFTONE_DEFAULTS.dpi, 72, 600),
      underbase: booleanOr(data.underbase, HALFTONE_DEFAULTS.underbase),
      choke: numberIn(data.choke, HALFTONE_DEFAULTS.choke, 0, 3),
      underbaseStyle: oneOf(data.underbaseStyle, HALFTONE_DEFAULTS.underbaseStyle, [
        'dot',
        'solid',
      ]),
      colorMode: oneOf(data.colorMode, HALFTONE_DEFAULTS.colorMode, ['color', 'mono']),
      polarity: oneOf(data.polarity, HALFTONE_DEFAULTS.polarity, ['light', 'dark']),
      blackPoint: numberIn(data.blackPoint, HALFTONE_DEFAULTS.blackPoint, 0, 0.9),
      whitePoint: numberIn(data.whitePoint, HALFTONE_DEFAULTS.whitePoint, 0.1, 1),
      showUnderbase: booleanOr(data.showUnderbase, HALFTONE_DEFAULTS.showUnderbase),
      shirtColor:
        typeof data.shirtColor === 'string' && SHIRT_PATTERN.test(data.shirtColor)
          ? data.shirtColor
          : HALFTONE_DEFAULTS.shirtColor,
    };
  } catch {
    return { ...HALFTONE_DEFAULTS };
  }
}

export function saveHalftoneSettings(settings: HalftoneSettings): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // El almacenamiento puede estar bloqueado (modo privado); no es crítico.
  }
}
