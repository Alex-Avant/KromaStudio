import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  HALFTONE_DEFAULTS,
  loadHalftoneSettings,
  saveHalftoneSettings,
  type HalftoneSettings,
} from './settings';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal('localStorage', storage);
});

describe('halftone settings', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(loadHalftoneSettings()).toEqual(HALFTONE_DEFAULTS);
  });

  it('round-trips a saved configuration', () => {
    const settings: HalftoneSettings = {
      ...HALFTONE_DEFAULTS,
      lpi: 55,
      polarity: 'dark',
      colorMode: 'mono',
      dotShape: 'line',
      choke: 2.5,
    };

    saveHalftoneSettings(settings);
    expect(loadHalftoneSettings()).toEqual(settings);
  });

  it('clamps restored values to the visible control ranges', () => {
    storage.setItem(
      'kroma.halftone.settings.v1',
      JSON.stringify({
        lpi: 500,
        angle: 300,
        contrast: 9,
        gamma: 9,
        minDot: 0.49,
        shadowPoint: 0.5,
        dpi: 1200,
        choke: 9,
        colorMode: 'mono',
        polarity: 'dark',
        blackPoint: 1.5,
        whitePoint: 0.05,
      }),
    );

    const settings = loadHalftoneSettings();
    expect(settings.lpi).toBe(120);
    expect(settings.angle).toBe(180);
    expect(settings.contrast).toBe(2.5);
    expect(settings.gamma).toBe(2.5);
    expect(settings.minDot).toBe(0.2);
    expect(settings.shadowPoint).toBe(0.8);
    expect(settings.dpi).toBe(600);
    expect(settings.choke).toBe(3);
    expect(settings.blackPoint).toBe(0.9);
    expect(settings.whitePoint).toBe(0.1);
  });

  it('ignores invalid enums and colors', () => {
    storage.setItem(
      'kroma.halftone.settings.v1',
      JSON.stringify({
        dotShape: 'triangle',
        underbaseStyle: 'noise',
        colorMode: 'cmyk',
        polarity: 'sideways',
        shirtColor: 'red',
      }),
    );

    const settings = loadHalftoneSettings();
    expect(settings.dotShape).toBe(HALFTONE_DEFAULTS.dotShape);
    expect(settings.underbaseStyle).toBe(HALFTONE_DEFAULTS.underbaseStyle);
    expect(settings.colorMode).toBe(HALFTONE_DEFAULTS.colorMode);
    expect(settings.polarity).toBe(HALFTONE_DEFAULTS.polarity);
    expect(settings.shirtColor).toBe(HALFTONE_DEFAULTS.shirtColor);
  });

  it('falls back to defaults for malformed JSON', () => {
    storage.setItem('kroma.halftone.settings.v1', '{not json');
    expect(loadHalftoneSettings()).toEqual(HALFTONE_DEFAULTS);
  });
});
