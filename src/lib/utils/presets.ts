import type { HalftoneSettings } from './settings';
import { HALFTONE_DEFAULTS } from './settings';

export const HALFTONE_PRESETS = {
  dtfStandard: {
    id: 'dtfStandard',
    label: 'DTF Standard',
    description: 'Trama equilibrada para uso general.',
    settings: {
      ...HALFTONE_DEFAULTS,
      lpi: 35,
      angle: 22.5,
      dotShape: 'circle',
      minDot: 0.08,
      maxDot: 1,
      dpi: 300,
      applicationMode: 'fades',
    },
  },
  fineDetail: {
    id: 'fineDetail',
    label: 'Fine Detail',
    description: 'Mayor frecuencia para detalles finos.',
    settings: {
      ...HALFTONE_DEFAULTS,
      lpi: 45,
      angle: 22.5,
      dotShape: 'ellipse',
      minDot: 0.05,
      maxDot: 1,
      dpi: 300,
      applicationMode: 'fades',
    },
  },
  vintage: {
    id: 'vintage',
    label: 'Vintage',
    description: 'Puntos amplios con knockout tonal.',
    settings: {
      ...HALFTONE_DEFAULTS,
      lpi: 25,
      angle: 22.5,
      dotShape: 'circle',
      minDot: 0.1,
      maxDot: 1,
      dpi: 300,
      applicationMode: 'knockout',
    },
  },
  softFade: {
    id: 'softFade',
    label: 'Soft Fade',
    description: 'Transiciones suaves con punto elíptico.',
    settings: {
      ...HALFTONE_DEFAULTS,
      lpi: 35,
      angle: 22.5,
      dotShape: 'ellipse',
      minDot: 0.08,
      maxDot: 1,
      dpi: 300,
      applicationMode: 'fades',
    },
  },
} as const satisfies Record<
  string,
  { id: string; label: string; description: string; settings: HalftoneSettings }
>;

export type HalftonePresetId = keyof typeof HALFTONE_PRESETS;

export function getHalftonePreset(id: HalftonePresetId): HalftoneSettings {
  return { ...HALFTONE_PRESETS[id].settings };
}

export function detectHalftonePreset(settings: HalftoneSettings): HalftonePresetId | null {
  for (const [id, preset] of Object.entries(HALFTONE_PRESETS) as [
    HalftonePresetId,
    (typeof HALFTONE_PRESETS)[HalftonePresetId],
  ][]) {
    if (settingsMatch(settings, preset.settings)) return id;
  }
  return null;
}

export function settingsMatch(a: HalftoneSettings, b: HalftoneSettings): boolean {
  return Object.keys(HALFTONE_DEFAULTS).every((key) => {
    const setting = key as keyof HalftoneSettings;
    return a[setting] === b[setting];
  });
}
