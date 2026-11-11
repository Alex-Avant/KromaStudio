import type { HalftoneExportKind, HalftoneExportResult } from '../types/halftone';
import type { CalibrationLabel } from './calibration-image';
import { createCalibrationImage } from './calibration-image';
import { exportHalftonePng, type HalftoneExportOptions } from './export';
import { addPngDpi } from './png';

interface CalibrationPanel {
  kind: HalftoneExportKind;
  title: string;
  result: HalftoneExportResult;
}

function isLightColor(hex: string): boolean {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return false;

  const value = Number.parseInt(match[1], 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  return r * 0.299 + g * 0.587 + b * 0.114 > 0.55;
}

export async function composeCalibrationSheet(
  panels: CalibrationPanel[],
  labels: CalibrationLabel[],
  options: HalftoneExportOptions,
): Promise<HalftoneExportResult> {
  const rendered: ImageBitmap[] = [];
  try {
    for (const panel of panels) {
      rendered.push(await createImageBitmap(panel.result.blob));
    }

    const panelWidth = panels[0].result.width;
    const panelHeight = panels[0].result.height;
    const margin = Math.round(panelWidth * 0.065);
    const gap = Math.round(panelWidth * 0.05);
    const header = Math.round(panelWidth * 0.24);
    const titleHeight = Math.round(panelWidth * 0.075);
    const footer = Math.round(panelWidth * 0.15);
    const width = margin * 2 + panels.length * panelWidth + (panels.length - 1) * gap;
    const height = header + titleHeight + panelHeight + footer;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo componer la hoja de calibración.');

    ctx.fillStyle = '#f4f1ea';
    ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#18110a';

    ctx.font = `700 ${Math.round(panelWidth * 0.038)}px system-ui, sans-serif`;
    ctx.fillText('KromaStudio · Calibración DTF', margin, margin + 10);

    const summaryFont = Math.round(panelWidth * 0.024);
    ctx.font = `${summaryFont}px ui-monospace, monospace`;
    ctx.fillText(
      `${options.lpi} LPI · ${options.angle}° · ${options.dotShape} · ${options.dpi} DPI · ` +
        `${options.colorMode === 'color' ? 'Color Original' : 'Monocromo'} · ` +
        `${options.polarity === 'light' ? 'Luces imprimen' : 'Sombras imprimen'}`,
      margin,
      margin + summaryFont * 2.2,
    );
    ctx.fillText(
      `Contraste ${options.contrast} · Gamma ${options.gamma} · ` +
        `Punto mínimo ${(options.minDot * 100).toFixed(1)} % · ` +
        `Sombras ${(options.shadowPoint * 100).toFixed(0)} % · ` +
        `Niveles ${(options.blackPoint * 100).toFixed(0)}/${(options.whitePoint * 100).toFixed(0)} %`,
      margin,
      margin + summaryFont * 4,
    );
    ctx.fillText(
      options.underbase
        ? `Underbase ${options.underbaseStyle === 'solid' ? 'sólida' : 'tramada'} · choke ${options.choke} px`
        : 'Underbase desactivado',
      margin,
      margin + summaryFont * 5.8,
    );

    panels.forEach((panel, index) => {
      const x = margin + index * (panelWidth + gap);
      const imageY = header + titleHeight;
      const titleY = header + Math.round(titleHeight * 0.62);
      const bitmap = rendered[index];

      ctx.fillStyle = '#18110a';
      ctx.font = `600 ${Math.round(panelWidth * 0.026)}px system-ui, sans-serif`;
      ctx.fillText(panel.title, x, titleY);

      // El color y el blanco salen con transparencia; el fondo negro permite
      // inspeccionar las zonas sin impresión antes de montar la lámina.
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, imageY, panelWidth, panelHeight);
      ctx.drawImage(bitmap, x, imageY, panelWidth, panelHeight);

      // Las etiquetas se dibujan después del semitono para no rasterizarlas.
      const textColor =
        panel.kind === 'composite'
          ? isLightColor(options.shirtColor)
            ? '#18110a'
            : '#f5f0e8'
          : '#f5f0e8';
      ctx.fillStyle = textColor;
      for (const label of labels) {
        ctx.font = `${label.size}px system-ui, sans-serif`;
        ctx.textAlign = label.align ?? 'left';
        ctx.fillText(label.text, x + label.x, imageY + label.y);
      }
      ctx.textAlign = 'left';
    });

    ctx.fillStyle = '#18110a';
    ctx.font = `${Math.round(panelWidth * 0.022)}px system-ui, sans-serif`;
    ctx.fillText(
      'Revisa pérdida de puntos en luces, cierre de sombras y legibilidad. Valida con polvo, curado, prensado y lavado.',
      margin,
      header + titleHeight + panelHeight + Math.round(footer * 0.48),
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error('No se pudo generar el PNG de calibración.'));
      }, 'image/png');
    });

    return {
      blob: await addPngDpi(blob, options.dpi),
      filename:
        `kroma_calibracion_${options.dotShape}_LPI${Math.round(options.lpi)}` +
        `_ANG${options.angle}_${Math.round(options.dpi)}DPI_${options.polarity}.png`,
      width,
      height,
    };
  } finally {
    rendered.forEach((bitmap) => bitmap.close());
  }
}

/** Genera una hoja de prueba con las separaciones Color/Blanco/Composite. */
export async function exportCalibrationSheet(
  options: HalftoneExportOptions,
): Promise<HalftoneExportResult> {
  const { bitmap, labels } = await createCalibrationImage();
  try {
    const kinds: Array<{ kind: HalftoneExportKind; title: string }> = [
      { kind: 'color', title: 'Color (separación)' },
    ];
    if (options.underbase) kinds.push({ kind: 'underbase', title: 'Base blanca' });
    kinds.push({ kind: 'composite', title: 'Composite' });

    const panels: CalibrationPanel[] = [];
    for (const { kind, title } of kinds) {
      const result = await exportHalftonePng(bitmap, options, kind, bitmap);
      panels.push({ kind, title, result });
    }
    return await composeCalibrationSheet(panels, labels, options);
  } finally {
    bitmap.close();
  }
}
