import { describe, expect, it } from 'vitest';
import { inkGray, toneGray, toneLabel } from './calibration-tones';

describe('calibration tone scale', () => {
  it('maps input tone black to white without inverting it', () => {
    expect(toneGray(0)).toBe(0);
    expect(toneGray(0.05)).toBe(13);
    expect(toneGray(0.5)).toBe(128);
    expect(toneGray(1)).toBe(255);
  });

  it('clamps out-of-range tones', () => {
    expect(toneGray(-1)).toBe(0);
    expect(toneGray(2)).toBe(255);
  });

  it('labels the source tone, not an assumed printed coverage', () => {
    expect(toneLabel(0)).toBe('0%');
    expect(toneLabel(0.25)).toBe('25%');
    expect(toneLabel(1)).toBe('100%');
  });

  it('uses the source extreme that actually produces ink for each polarity', () => {
    expect(inkGray('light')).toBe(255);
    expect(inkGray('dark')).toBe(0);
  });
});
