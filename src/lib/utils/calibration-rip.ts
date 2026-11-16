import type { HalftoneExportResult } from '../types/halftone';
import { createCalibrationImage } from './calibration-image';
import { exportHalftonePng, type HalftoneExportOptions } from './export';
import { addPngDpi } from './png';

export const RIP_SHEET_INCHES = { width: 4, height: 5.33 } as const;

export function ripCalibrationSize(dpi: number): { width: number; height: number } {
  const safeDpi = Number.isFinite(dpi) && dpi > 0 ? dpi : 300;
  return {
    width: Math.max(1, Math.round(safeDpi * RIP_SHEET_INCHES.width)),
    height: Math.max(1, Math.round(safeDpi * RIP_SHEET_INCHES.height)),
  };
}

function formatAngle(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function ripCalibrationFilename(
  options: HalftoneExportOptions,
  metrics?: { requestedDpi: number; effectiveDpi: number; downscaled: boolean },
): string {
  const dpiPart = metrics?.downscaled
    ? `${Math.round(metrics.requestedDpi)}DPI_eff${Math.round(metrics.effectiveDpi)}DPI`
    : `${Math.round(options.dpi)}DPI`;
  return (
    `kroma_calibracion_rip_${options.dotShape}_LPI${Math.round(options.lpi)}` +
    `_ANG${formatAngle(options.angle)}_${dpiPart}_4x5.33in_` +
    `${options.polarity}.png`
  );
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('No se pudo generar la hoja para RIP.'));
    }, 'image/png');
  });
}

/**
 * Hoja transparente para un RIP que genera la base blanca desde el alfa.
 * Contiene solo la placa de color y etiquetas sólidas; no incluye fondos de
 * simulación ni el panel Composite.
 */
export async function exportCalibrationForRip(
  options: HalftoneExportOptions,
): Promise<HalftoneExportResult> {
  const startedAt = performance.now();
  const { width, height } = ripCalibrationSize(options.dpi);
  const { bitmap, labels } = await createCalibrationImage(width, height, options.polarity);

  try {
    const rendered = await exportHalftonePng(bitmap, options, 'color', bitmap);
    const colorBitmap = await createImageBitmap(rendered.blob);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = rendered.width;
      canvas.height = rendered.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo componer la hoja para RIP.');

      ctx.drawImage(colorBitmap, 0, 0);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.lineJoin = 'round';

      const requestedDpi = rendered.requestedDpi ?? options.dpi;
      const effectiveDpi = rendered.effectiveDpi ?? options.dpi;
      const downscaled = rendered.downscaled ?? false;
      const outputWidth = rendered.width;
      const outputHeight = rendered.height;
      const headerSize = Math.max(12, Math.round(outputWidth * 0.018));
      const headerX = Math.round(outputWidth * 0.065);
      const headerY = Math.round(outputWidth * 0.038);
      const dpiText = downscaled
        ? `${Math.round(requestedDpi)} DPI → ${Math.round(effectiveDpi)} eff`
        : `${Math.round(options.dpi)} DPI`;
      const header =
        `KromaStudio · ${options.lpi} LPI · ${options.angle}° · ${options.dotShape}` +
        ` · ${dpiText} · ${options.polarity === 'light' ? 'Luces' : 'Sombras'}` +
        ' · Color para RIP';
      ctx.font = `600 ${headerSize}px ui-monospace, monospace`;
      ctx.lineWidth = Math.max(2, Math.round(headerSize * 0.14));
      ctx.strokeStyle = '#111111';
      ctx.fillStyle = '#ffffff';
      ctx.strokeText(header, headerX, headerY);
      ctx.fillText(header, headerX, headerY);

      // Etiquetas sólidas después del semitono, con contorno para que se lean
      // tanto sobre prendas claras como oscuras.
      const labelScaleX = outputWidth / width;
      const labelScaleY = outputHeight / height;
      const labelScale = Math.min(labelScaleX, labelScaleY);
      for (const label of labels) {
        const fontSize = label.size * labelScale;
        ctx.font = `${label.weight ?? 500} ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = label.align ?? 'left';
        ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.14));
        ctx.strokeStyle = '#111111';
        ctx.fillStyle = '#ffffff';
        const labelX = label.x * labelScaleX;
        const labelY = label.y * labelScaleY;
        ctx.strokeText(label.text, labelX, labelY);
        ctx.fillText(label.text, labelX, labelY);
      }
      ctx.textAlign = 'left';

      const blob = await canvasToPngBlob(canvas);
      return {
        blob: await addPngDpi(blob, effectiveDpi),
        filename: ripCalibrationFilename(options, {
          requestedDpi,
          effectiveDpi,
          downscaled,
        }),
        width: outputWidth,
        height: outputHeight,
        requestedDpi,
        effectiveDpi,
        downscaled,
        durationMs: performance.now() - startedAt,
      };
    } finally {
      colorBitmap.close();
    }
  } finally {
    bitmap.close();
  }
}
