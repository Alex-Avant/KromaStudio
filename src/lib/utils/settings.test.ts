import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HALFTONE_DEFAULTS, loadHalftoneSettings, saveHalftoneSettings, type HalftoneSettings } from './settings';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
  clear(): void { this.values.clear(); }
}

let storage: MemoryStorage;
beforeEach(() => {
  storage = new MemoryStorage();
  vi.stubGlobal('localStorage', storage);
});

describe('halftone settings v2', () => {
  it('returns professional defaults when nothing is stored', () => {
    expect(loadHalftoneSettings()).toEqual(HALFTONE_DEFAULTS);
    expect(HALFTONE_DEFAULTS.lpi).toBe(35);
    expect(HALFTONE_DEFAULTS.angle).toBe(22.5);
    expect(HALFTONE_DEFAULTS.minDot).toBe(0.08);
  });

  it('round-trips a complete configuration', () => {
    const settings: HalftoneSettings = {
      ...HALFTONE_DEFAULTS,
      lpi: 55,
      polarity: 'dark',
      colorMode: 'mono',
      dotShape: 'line',
      choke: 2.5,
      spread: 1,
      brightness: -12,
      contrast: 30,
      applicationMode: 'knockout',
      blackPoint: 16,
      whitePoint: 242,
    };
    saveHalftoneSettings(settings);
    expect(loadHalftoneSettings()).toEqual(settings);
  });

  it('clamps restored values to registry ranges and preserves a valid levels interval', () => {
    storage.setItem('kroma.halftone.settings.v2', JSON.stringify({
      lpi: 500,
      angle: 300,
      brightness: -500,
      contrast: 500,
      gamma: 9,
      minDot: 0.49,
      maxDot: 0.2,
      solidThreshold: 1.5,
      dpi: 1200,
      choke: 9,
      spread: -1,
      blackPoint: 999,
      whitePoint: 0,
    }));
    const settings = loadHalftoneSettings();
    expect(settings.lpi).toBe(60);
    expect(settings.angle).toBe(180);
    expect(settings.brightness).toBe(-100);
    expect(settings.contrast).toBe(100);
    expect(settings.gamma).toBe(2.5);
    expect(settings.minDot).toBe(0.2);
    expect(settings.maxDot).toBe(0.8);
    expect(settings.solidThreshold).toBe(1);
    expect(settings.dpi).toBe(600);
    expect(settings.choke).toBe(3);
    expect(settings.spread).toBe(0);
    expect(settings.blackPoint).toBe(254);
    expect(settings.whitePoint).toBe(255);
  });

  it('ignores legacy v1 settings rather than reinterpreting their multiplier contrast', () => {
    storage.setItem('kroma.halftone.settings.v1', JSON.stringify({ lpi: 45, contrast: 1.5 }));
    expect(loadHalftoneSettings()).toEqual(HALFTONE_DEFAULTS);
  });

  it('ignores invalid enums and colors', () => {
    storage.setItem('kroma.halftone.settings.v2', JSON.stringify({
      dotShape: 'triangle',
      underbaseStyle: 'noise',
      colorMode: 'cmyk',
      polarity: 'sideways',
      applicationMode: 'dither',
      shirtColor: 'red',
    }));
    const settings = loadHalftoneSettings();
    expect(settings.dotShape).toBe(HALFTONE_DEFAULTS.dotShape);
    expect(settings.underbaseStyle).toBe(HALFTONE_DEFAULTS.underbaseStyle);
    expect(settings.colorMode).toBe(HALFTONE_DEFAULTS.colorMode);
    expect(settings.polarity).toBe(HALFTONE_DEFAULTS.polarity);
    expect(settings.applicationMode).toBe(HALFTONE_DEFAULTS.applicationMode);
    expect(settings.shirtColor).toBe(HALFTONE_DEFAULTS.shirtColor);
  });

  it('falls back to defaults for malformed JSON', () => {
    storage.setItem('kroma.halftone.settings.v2', '{not json');
    expect(loadHalftoneSettings()).toEqual(HALFTONE_DEFAULTS);
  });
});
