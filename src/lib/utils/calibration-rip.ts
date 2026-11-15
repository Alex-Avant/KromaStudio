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

export function ripCalibrationFilename(options: HalftoneExportOptions): string {
  return (
    `kroma_calibracion_rip_${options.dotShape}_LPI${Math.round(options.lpi)}` +
    `_ANG${formatAngle(options.angle)}_${Math.round(options.dpi)}DPI_4x5.33in_` +
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
  const { bitmap, labels } = await createCalibrationImage(width, height);

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

      const headerSize = Math.max(12, Math.round(width * 0.018));
      const headerX = Math.round(width * 0.065);
      const headerY = Math.round(width * 0.038);
      const header =
        `KromaStudio · ${options.lpi} LPI · ${options.angle}° · ${options.dotShape}` +
        ` · ${options.dpi} DPI · ${options.polarity === 'light' ? 'Luces' : 'Sombras'}` +
        ' · Color para RIP';
      ctx.font = `600 ${headerSize}px ui-monospace, monospace`;
      ctx.lineWidth = Math.max(2, Math.round(headerSize * 0.14));
      ctx.strokeStyle = '#111111';
      ctx.fillStyle = '#ffffff';
      ctx.strokeText(header, headerX, headerY);
      ctx.fillText(header, headerX, headerY);

      // Etiquetas sólidas después del semitono, con contorno para que se lean
      // tanto sobre prendas claras como oscuras.
      for (const label of labels) {
        ctx.font = `${label.weight ?? 500} ${label.size}px system-ui, sans-serif`;
        ctx.textAlign = label.align ?? 'left';
        ctx.lineWidth = Math.max(2, Math.round(label.size * 0.14));
        ctx.strokeStyle = '#111111';
        ctx.fillStyle = '#ffffff';
        ctx.strokeText(label.text, label.x, label.y);
        ctx.fillText(label.text, label.x, label.y);
      }
      ctx.textAlign = 'left';

      const blob = await canvasToPngBlob(canvas);
      return {
        blob: await addPngDpi(blob, options.dpi),
        filename: ripCalibrationFilename(options),
        width: rendered.width,
        height: rendered.height,
        durationMs: performance.now() - startedAt,
      };
    } finally {
      colorBitmap.close();
    }
  } finally {
    bitmap.close();
  }
}
