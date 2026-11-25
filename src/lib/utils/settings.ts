import type {
  HalftoneApplicationMode,
  HalftoneColorMode,
  HalftoneDotShape,
  HalftonePolarity,
  HalftoneUnderbaseStyle,
} from '../types/halftone';
import {
  BOOLEAN_PARAMETER_REGISTRY,
  ENUM_PARAMETER_REGISTRY,
  HALFTONE_PARAMETER_REGISTRY,
  validateBooleanParameter,
  validateEnumParameter,
  validateNumericParameter,
} from './parameter-registry';

/** Configuración persistida de procesamiento y previsualización. */
export interface HalftoneSettings {
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
  showUnderbase: boolean;
  shirtColor: string;
}

export const HALFTONE_DEFAULTS: HalftoneSettings = {
  lpi: HALFTONE_PARAMETER_REGISTRY.lpi.defaultValue,
  angle: HALFTONE_PARAMETER_REGISTRY.angle.defaultValue,
  brightness: HALFTONE_PARAMETER_REGISTRY.brightness.defaultValue,
  contrast: HALFTONE_PARAMETER_REGISTRY.contrast.defaultValue,
  gamma: HALFTONE_PARAMETER_REGISTRY.gamma.defaultValue,
  minDot: HALFTONE_PARAMETER_REGISTRY.minDot.defaultValue,
  maxDot: HALFTONE_PARAMETER_REGISTRY.maxDot.defaultValue,
  solidThreshold: HALFTONE_PARAMETER_REGISTRY.solidThreshold.defaultValue,
  solidEnabled: BOOLEAN_PARAMETER_REGISTRY.solidEnabled.defaultValue,
  edgeSmooth: BOOLEAN_PARAMETER_REGISTRY.edgeSmooth.defaultValue,
  edgeProtect: BOOLEAN_PARAMETER_REGISTRY.edgeProtect.defaultValue,
  applicationMode: ENUM_PARAMETER_REGISTRY.applicationMode.defaultValue,
  dotShape: ENUM_PARAMETER_REGISTRY.dotShape.defaultValue,
  dpi: HALFTONE_PARAMETER_REGISTRY.dpi.defaultValue,
  underbase: BOOLEAN_PARAMETER_REGISTRY.underbase.defaultValue,
  choke: HALFTONE_PARAMETER_REGISTRY.choke.defaultValue,
  spread: HALFTONE_PARAMETER_REGISTRY.spread.defaultValue,
  underbaseStyle: ENUM_PARAMETER_REGISTRY.underbaseStyle.defaultValue,
  colorMode: ENUM_PARAMETER_REGISTRY.colorMode.defaultValue,
  polarity: ENUM_PARAMETER_REGISTRY.polarity.defaultValue,
  blackPoint: HALFTONE_PARAMETER_REGISTRY.blackPoint.defaultValue,
  whitePoint: HALFTONE_PARAMETER_REGISTRY.whitePoint.defaultValue,
  showUnderbase: BOOLEAN_PARAMETER_REGISTRY.showUnderbase.defaultValue,
  shirtColor: '#111111',
};

// v2 inicia con los defaults profesionales nuevos; los valores v1 se conservan
// en localStorage pero no se interpretan bajo una semántica distinta.
const STORAGE_KEY = 'kroma.halftone.settings.v2';
const SHIRT_PATTERN = /^#[0-9a-f]{6}$/i;

function validateSettingNumber<K extends keyof typeof HALFTONE_PARAMETER_REGISTRY>(
  id: K,
  value: unknown,
): number {
  return validateNumericParameter(
    id,
    typeof value === 'number' ? value : Number.NaN,
  );
}

export function loadHalftoneSettings(): HalftoneSettings {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...HALFTONE_DEFAULTS };

    const data = JSON.parse(raw) as Partial<HalftoneSettings>;
    const blackPoint = Math.min(254, validateSettingNumber('blackPoint', data.blackPoint));
    const whitePoint = Math.min(
      255,
      Math.max(blackPoint + 1, validateSettingNumber('whitePoint', data.whitePoint)),
    );

    return {
      lpi: validateSettingNumber('lpi', data.lpi),
      angle: validateSettingNumber('angle', data.angle),
      brightness: validateSettingNumber('brightness', data.brightness),
      contrast: validateSettingNumber('contrast', data.contrast),
      gamma: validateSettingNumber('gamma', data.gamma),
      minDot: validateSettingNumber('minDot', data.minDot),
      maxDot: validateSettingNumber('maxDot', data.maxDot),
      solidThreshold: validateSettingNumber('solidThreshold', data.solidThreshold),
      solidEnabled: validateBooleanParameter('solidEnabled', data.solidEnabled),
      edgeSmooth: validateBooleanParameter('edgeSmooth', data.edgeSmooth),
      edgeProtect: validateBooleanParameter('edgeProtect', data.edgeProtect),
      applicationMode: validateEnumParameter('applicationMode', data.applicationMode),
      dotShape: validateEnumParameter('dotShape', data.dotShape),
      dpi: validateSettingNumber('dpi', data.dpi),
      underbase: validateBooleanParameter('underbase', data.underbase),
      choke: validateSettingNumber('choke', data.choke),
      spread: validateSettingNumber('spread', data.spread),
      underbaseStyle: validateEnumParameter('underbaseStyle', data.underbaseStyle),
      colorMode: validateEnumParameter('colorMode', data.colorMode),
      polarity: validateEnumParameter('polarity', data.polarity),
      blackPoint,
      whitePoint,
      showUnderbase: validateBooleanParameter('showUnderbase', data.showUnderbase),
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
