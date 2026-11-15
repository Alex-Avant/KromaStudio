import type { HalftonePolarity } from '../types/halftone';

export type ScreenShape = 'circle' | 'ellipse' | 'diamond' | 'square' | 'line';

export interface GridSample {
  gridX: number;
  gridY: number;
  localX: number;
  localY: number;
}

const PI = Math.PI;
const ELLIPSE_ASPECT = 1.5;

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function cellSizePx(dpi: number, lpi: number): number {
  return Math.max(0.0001, dpi / Math.max(1, lpi));
}

export function rotatePoint(x: number, y: number, angle: number): { x: number; y: number } {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: c * x - s * y, y: s * x + c * y };
}

export function cellCenterCanvas(
  gridX: number,
  gridY: number,
  canvasWidth: number,
  canvasHeight: number,
  angle: number,
  cell: number,
): { x: number; y: number } {
  const rotated = rotatePoint((gridX + 0.5) * cell, (gridY + 0.5) * cell, -angle);
  return {
    x: rotated.x + canvasWidth / 2,
    y: rotated.y + canvasHeight / 2,
  };
}

export function gridSampleAt(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
  angle: number,
  cell: number,
): GridSample {
  const rotated = rotatePoint(x - canvasWidth / 2, y - canvasHeight / 2, angle);
  const gridX = rotated.x / cell;
  const gridY = rotated.y / cell;
  return {
    gridX,
    gridY,
    localX: gridX - Math.floor(gridX) - 0.5,
    localY: gridY - Math.floor(gridY) - 0.5,
  };
}

/**
 * Área del disco de radio `radius` recortada por la celda cuadrada [-0.5, 0.5]².
 * Por encima de r = 0.5 el círculo sobresale de la celda; devolver su área
 * recortada mantiene la cobertura impresa igual al tono pedido.
 */
export function circleCellArea(radius: number): number {
  const r = Math.min(0.70710678, Math.max(0, radius));
  if (r <= 0.5) return PI * r * r;

  const cap = r * r * Math.acos(0.5 / r) - 0.5 * Math.sqrt(Math.max(0, r * r - 0.25));
  return Math.min(1, Math.max(0, PI * r * r - 4 * cap));
}

/**
 * Umbral periódico del screen, equivalente al spot function escalar del WGSL.
 * Devuelve la fracción de área necesaria para que ese punto reciba tinta.
 */
export function screenThreshold(
  localX: number,
  localY: number,
  shape: ScreenShape,
): number {
  if (shape === 'ellipse') {
    return PI * (localX * localX / ELLIPSE_ASPECT + localY * localY * ELLIPSE_ASPECT);
  }
  if (shape === 'diamond') {
    const radius = Math.abs(localX) + Math.abs(localY);
    return 2 * radius * radius;
  }
  if (shape === 'square') {
    const radius = Math.max(Math.abs(localX), Math.abs(localY));
    return 4 * radius * radius;
  }
  if (shape === 'line') {
    return 2 * Math.abs(localY);
  }
  return circleCellArea(Math.hypot(localX, localY));
}

export function toneCoverage(
  tone: number,
  polarity: HalftonePolarity,
  alpha = 1,
): number {
  const clampedTone = clamp01(tone);
  const polarityTone = polarity === 'light' ? clampedTone : 1 - clampedTone;
  return clamp01(polarityTone * clamp01(alpha));
}

export function screenInk(coverage: number, threshold: number, aa = 0): number {
  if (aa <= 0) return coverage >= threshold ? 1 : 0;
  const start = threshold - aa;
  const end = threshold + aa;
  const normalized = clamp01((coverage - start) / (end - start));
  return normalized * normalized * (3 - 2 * normalized);
}
