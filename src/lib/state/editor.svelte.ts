import type {
  HalftoneColorMode,
  HalftoneDotShape,
  HalftonePolarity,
  HalftonePreviewMode,
  HalftonePreviewView,
  HalftoneUnderbaseStyle,
} from '../types/halftone';
import { HALFTONE_DEFAULTS, type HalftoneSettings } from '../utils/settings';

/**
 * Estado del editor: parámetros del motor de semitono y preferencias de
 * vista. Usa runes de Svelte 5, sin librerías externas de estado.
 */
export class EditorState {
  // Trama.
  lpi = $state(HALFTONE_DEFAULTS.lpi);
  angle = $state(HALFTONE_DEFAULTS.angle);
  contrast = $state(HALFTONE_DEFAULTS.contrast);
  gamma = $state(HALFTONE_DEFAULTS.gamma);
  minDot = $state(HALFTONE_DEFAULTS.minDot);
  shadowPoint = $state(HALFTONE_DEFAULTS.shadowPoint);
  dotShape = $state<HalftoneDotShape>(HALFTONE_DEFAULTS.dotShape);
  dpi = $state(HALFTONE_DEFAULTS.dpi);

  // Color y base blanca.
  underbase = $state(HALFTONE_DEFAULTS.underbase);
  choke = $state(HALFTONE_DEFAULTS.choke);
  underbaseStyle = $state<HalftoneUnderbaseStyle>(HALFTONE_DEFAULTS.underbaseStyle);
  colorMode = $state<HalftoneColorMode>(HALFTONE_DEFAULTS.colorMode);
  polarity = $state<HalftonePolarity>(HALFTONE_DEFAULTS.polarity);
  blackPoint = $state(HALFTONE_DEFAULTS.blackPoint);
  whitePoint = $state(HALFTONE_DEFAULTS.whitePoint);

  // Preferencia de vista y simulación de camiseta.
  showUnderbase = $state(HALFTONE_DEFAULTS.showUnderbase);
  shirtColor = $state(HALFTONE_DEFAULTS.shirtColor);
  customShirtColor = $state(HALFTONE_DEFAULTS.shirtColor);
  previewMode = $state<HalftonePreviewMode>('fit');
  previewView = $state<HalftonePreviewView>('result');
  previewBackground = $state<'checkerboard' | 'black' | 'white' | 'shirt'>('checkerboard');

  cellPitch = $derived(this.dpi / Math.max(this.lpi, 1));
  safeWhitePoint = $derived(
    Math.min(1, Math.max(0.1, this.whitePoint, this.blackPoint + 0.01)),
  );

  constructor(settings: HalftoneSettings = HALFTONE_DEFAULTS) {
    this.apply(settings);
  }

  apply(settings: HalftoneSettings): void {
    this.lpi = settings.lpi;
    this.angle = settings.angle;
    this.contrast = settings.contrast;
    this.gamma = settings.gamma;
    this.minDot = settings.minDot;
    this.shadowPoint = settings.shadowPoint;
    this.dotShape = settings.dotShape;
    this.dpi = settings.dpi;
    this.underbase = settings.underbase;
    this.choke = settings.choke;
    this.underbaseStyle = settings.underbaseStyle;
    this.colorMode = settings.colorMode;
    this.polarity = settings.polarity;
    this.blackPoint = settings.blackPoint;
    this.whitePoint = settings.whitePoint;
    this.showUnderbase = settings.showUnderbase;
    this.shirtColor = settings.shirtColor;
    this.customShirtColor = settings.shirtColor;
  }

  reset(): void {
    this.apply(HALFTONE_DEFAULTS);
  }

  toSettings(): HalftoneSettings {
    return {
      lpi: this.lpi,
      angle: this.angle,
      contrast: this.contrast,
      gamma: this.gamma,
      minDot: this.minDot,
      shadowPoint: this.shadowPoint,
      dotShape: this.dotShape,
      dpi: this.dpi,
      underbase: this.underbase,
      choke: this.choke,
      underbaseStyle: this.underbaseStyle,
      colorMode: this.colorMode,
      polarity: this.polarity,
      blackPoint: this.blackPoint,
      whitePoint: this.whitePoint,
      showUnderbase: this.showUnderbase,
      shirtColor: this.shirtColor,
    };
  }
}
