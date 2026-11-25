import type {
  HalftoneApplicationMode,
  HalftoneColorMode,
  HalftoneDotShape,
  HalftonePolarity,
  HalftonePreviewMode,
  HalftonePreviewView,
  HalftoneUnderbaseStyle,
} from '../types/halftone';
import { HALFTONE_DEFAULTS, type HalftoneSettings } from '../utils/settings';
import {
  detectHalftonePreset,
  getHalftonePreset,
  settingsMatch,
  type HalftonePresetId,
} from '../utils/presets';

/** Estado central de parámetros del motor, documento visual y preset actual. */
export class EditorState {
  // Screen AM y cobertura tonal.
  lpi = $state(HALFTONE_DEFAULTS.lpi);
  angle = $state(HALFTONE_DEFAULTS.angle);
  brightness = $state(HALFTONE_DEFAULTS.brightness);
  contrast = $state(HALFTONE_DEFAULTS.contrast);
  gamma = $state(HALFTONE_DEFAULTS.gamma);
  minDot = $state(HALFTONE_DEFAULTS.minDot);
  maxDot = $state(HALFTONE_DEFAULTS.maxDot);
  solidThreshold = $state(HALFTONE_DEFAULTS.solidThreshold);
  solidEnabled = $state(HALFTONE_DEFAULTS.solidEnabled);
  edgeSmooth = $state(HALFTONE_DEFAULTS.edgeSmooth);
  edgeProtect = $state(HALFTONE_DEFAULTS.edgeProtect);
  applicationMode = $state<HalftoneApplicationMode>(HALFTONE_DEFAULTS.applicationMode);
  dotShape = $state<HalftoneDotShape>(HALFTONE_DEFAULTS.dotShape);
  dpi = $state(HALFTONE_DEFAULTS.dpi);

  // Separaciones y tono.
  underbase = $state(HALFTONE_DEFAULTS.underbase);
  choke = $state(HALFTONE_DEFAULTS.choke);
  spread = $state(HALFTONE_DEFAULTS.spread);
  underbaseStyle = $state<HalftoneUnderbaseStyle>(HALFTONE_DEFAULTS.underbaseStyle);
  colorMode = $state<HalftoneColorMode>(HALFTONE_DEFAULTS.colorMode);
  polarity = $state<HalftonePolarity>(HALFTONE_DEFAULTS.polarity);
  blackPoint = $state(HALFTONE_DEFAULTS.blackPoint);
  whitePoint = $state(HALFTONE_DEFAULTS.whitePoint);

  // Preferencias solo de vista, no afectan la generación del PNG.
  showUnderbase = $state(HALFTONE_DEFAULTS.showUnderbase);
  shirtColor = $state(HALFTONE_DEFAULTS.shirtColor);
  customShirtColor = $state(HALFTONE_DEFAULTS.shirtColor);
  previewMode = $state<HalftonePreviewMode>('fit');
  previewView = $state<HalftonePreviewView>('result');
  previewBackground = $state<'checkerboard' | 'black' | 'white' | 'shirt'>('checkerboard');

  activePresetId = $state<HalftonePresetId | null>(null);

  cellPitch = $derived(this.dpi / Math.max(this.lpi, 1));
  safeWhitePoint = $derived(Math.min(255, Math.max(this.whitePoint, this.blackPoint + 1)));
  presetModified = $derived.by(() => {
    if (!this.activePresetId) return false;
    return !settingsMatch(this.toSettings(), getHalftonePreset(this.activePresetId));
  });

  constructor(settings: HalftoneSettings = HALFTONE_DEFAULTS) {
    this.apply(settings);
    this.activePresetId = detectHalftonePreset(this.toSettings());
  }

  apply(settings: HalftoneSettings): void {
    this.lpi = settings.lpi;
    this.angle = settings.angle;
    this.brightness = settings.brightness;
    this.contrast = settings.contrast;
    this.gamma = settings.gamma;
    this.minDot = settings.minDot;
    this.maxDot = settings.maxDot;
    this.solidThreshold = settings.solidThreshold;
    this.solidEnabled = settings.solidEnabled;
    this.edgeSmooth = settings.edgeSmooth;
    this.edgeProtect = settings.edgeProtect;
    this.applicationMode = settings.applicationMode;
    this.dotShape = settings.dotShape;
    this.dpi = settings.dpi;
    this.underbase = settings.underbase;
    this.choke = settings.choke;
    this.spread = settings.spread;
    this.underbaseStyle = settings.underbaseStyle;
    this.colorMode = settings.colorMode;
    this.polarity = settings.polarity;
    this.blackPoint = settings.blackPoint;
    this.whitePoint = settings.whitePoint;
    this.showUnderbase = settings.showUnderbase;
    this.shirtColor = settings.shirtColor;
    this.customShirtColor = settings.shirtColor;
  }

  applyPreset(id: HalftonePresetId): void {
    this.apply(getHalftonePreset(id));
    this.activePresetId = id;
  }

  reset(): void {
    this.apply(HALFTONE_DEFAULTS);
    this.activePresetId = detectHalftonePreset(this.toSettings());
  }

  toSettings(): HalftoneSettings {
    return {
      lpi: this.lpi,
      angle: this.angle,
      brightness: this.brightness,
      contrast: this.contrast,
      gamma: this.gamma,
      minDot: this.minDot,
      maxDot: this.maxDot,
      solidThreshold: this.solidThreshold,
      solidEnabled: this.solidEnabled,
      edgeSmooth: this.edgeSmooth,
      edgeProtect: this.edgeProtect,
      applicationMode: this.applicationMode,
      dotShape: this.dotShape,
      dpi: this.dpi,
      underbase: this.underbase,
      choke: this.choke,
      spread: this.spread,
      underbaseStyle: this.underbaseStyle,
      colorMode: this.colorMode,
      polarity: this.polarity,
      blackPoint: this.blackPoint,
      whitePoint: this.safeWhitePoint,
      showUnderbase: this.showUnderbase,
      shirtColor: this.shirtColor,
    };
  }
}
