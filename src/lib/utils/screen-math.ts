import type { HalftonePolarity } from '../types/halftone';

export type ScreenShape = 'circle' | 'ellipse' | 'diamond' | 'square' | 'line';
export type ScreenApplicationMode = 'fades' | 'knockout' | 'full';

export interface GridSample {
  gridX: number;
  gridY: number;
  localX: number;
  localY: number;
}

const PI = Math.PI;
const ELLIPSE_ASPECT = 1.5;
const ELLIPSE_LUT_MAX = 1.75;

// Área de la elipse recortada por la celda en función del área sin recortar.
// Se generó por integración numérica para aspect = 1.5 y se interpola en WGSL.
const ELLIPSE_AREA_LUT = [
  0, 0.054683, 0.10938, 0.164065, 0.218749, 0.273431, 0.328129, 0.382813, 0.437486,
  0.492191, 0.544804, 0.589155, 0.62921, 0.666359, 0.70122, 0.734248, 0.765748,
  0.795908, 0.824888, 0.852852, 0.879887, 0.906079, 0.929983, 0.947584, 0.961531,
  0.972701, 0.981573, 0.988467, 0.99359, 0.997127, 0.999222, 0.999992, 1,
] as const;

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

export function ellipseCellArea(rawArea: number): number {
  const position = clamp01(rawArea / ELLIPSE_LUT_MAX) * (ELLIPSE_AREA_LUT.length - 1);
  const index = Math.floor(position);
  const next = Math.min(ELLIPSE_AREA_LUT.length - 1, index + 1);
  const fraction = position - index;
  return ELLIPSE_AREA_LUT[index] * (1 - fraction) + ELLIPSE_AREA_LUT[next] * fraction;
}

export function diamondCellArea(radius: number): number {
  const r = Math.min(1, Math.max(0, radius));
  if (r <= 0.5) return 2 * r * r;
  const remaining = 1 - r;
  return 1 - 2 * remaining * remaining;
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
    const rawArea = PI * (localX * localX / ELLIPSE_ASPECT + localY * localY * ELLIPSE_ASPECT);
    return ellipseCellArea(rawArea);
  }
  if (shape === 'diamond') {
    return diamondCellArea(Math.abs(localX) + Math.abs(localY));
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

/** Ajusta luminancia con la misma secuencia y escalas que coverage_from_source(). */
export function adjustedTone(
  luminance: number,
  options: {
    brightness: number;
    contrast: number;
    blackPoint: number;
    whitePoint: number;
    gamma: number;
    polarity: HalftonePolarity;
    alpha?: number;
    maxDot?: number;
  },
): number {
  const brightness = Math.min(100, Math.max(-100, options.brightness)) / 100;
  const contrast = Math.min(100, Math.max(-100, options.contrast));
  const shifted = clamp01(clamp01(luminance) + brightness);
  const contrasted = clamp01((shifted - 0.5) * (1 + contrast / 100) + 0.5);
  const black = Math.min(254, Math.max(0, options.blackPoint)) / 255;
  const white = Math.min(
    1,
    Math.max(black + 1 / 255, Math.min(255, options.whitePoint) / 255),
  );
  const normalized = clamp01((contrasted - black) / Math.max(white - black, 1 / 255));
  const coverage = toneCoverage(Math.pow(normalized, Math.min(2.5, Math.max(0.4, options.gamma))), options.polarity, options.alpha ?? 1);
  return Math.min(coverage, clamp01(options.maxDot ?? 1));
}

/** Máscara visible tras el modo; knockout perfora solo los tonos medios. */
export function applicationAlpha(
  sourceAlpha: number,
  coverage: number,
  threshold: number,
  mode: ScreenApplicationMode,
  aa = 0,
  minDot = 0,
  solidThresholdEnabled = false,
  solidThreshold = 0.98,
): number {
  const alpha = clamp01(sourceAlpha);
  const tone = clamp01(coverage);
  if (alpha === 0) return 0;

  if (mode === 'knockout') {
    const holeCoverage = Math.min(4 * tone * (1 - tone), 1);
    return alpha * (1 - screenInk(holeCoverage, threshold, aa) * smoothStep(minDot * 0.5, minDot, holeCoverage));
  }

  if (tone === 0) return 0;
  if (mode === 'fades' && alpha >= 0.999 && tone >= solidThreshold) return alpha;
  if (solidThresholdEnabled && alpha >= 0.999 && tone >= solidThreshold) return alpha;

  const minFade = smoothStep(minDot * 0.5, minDot, tone);
  return screenInk(tone, threshold, aa) * minFade;
}

function smoothStep(edge0: number, edge1: number, value: number): number {
  if (edge1 <= edge0) return value >= edge1 ? 1 : 0;
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Cálculo de la dilatación/erosión efectiva de underbase. */
export function underbaseOffset(choke: number, spread: number): { radius: number; operation: 'erode' | 'dilate' } {
  const signed = Math.min(3, Math.max(0, choke)) - Math.min(3, Math.max(0, spread));
  return { radius: Math.abs(signed), operation: signed >= 0 ? 'erode' : 'dilate' };
}
