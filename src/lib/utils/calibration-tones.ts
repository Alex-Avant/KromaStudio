import type { HalftonePolarity } from '../types/halftone';

/** Tonos de entrada de los parches (0 = negro, 1 = blanco). */
export const CALIBRATION_INPUT_TONES = [0, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 1] as const;

export function toneGray(tone: number): number {
  return Math.round(Math.min(1, Math.max(0, tone)) * 255);
}

export function toneLabel(tone: number): string {
  return `${Math.round(tone * 100)}%`;
}

/** Tono de fuente que produce tinta con la polaridad elegida. */
export function inkGray(polarity: HalftonePolarity): number {
  return polarity === 'light' ? 255 : 0;
}
