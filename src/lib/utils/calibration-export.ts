import type { HalftoneExportKind, HalftoneExportResult } from '../types/halftone';
import type { CalibrationLabel } from './calibration-image';
import { createCalibrationImage } from './calibration-image';
import { exportHalftoneLayers, type HalftoneExportOptions } from './export';
import { addPngDpi } from './png';

interface CalibrationPanel {
  kind: HalftoneExportKind;
  title: string;
  result: HalftoneExportResult;
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
      // Cada una lleva un fondo oscuro para conservar contraste en cualquier
      // panel, incluida la base blanca.
      for (const label of labels) {
        ctx.font = `${label.weight ?? 500} ${label.size}px system-ui, sans-serif`;
        ctx.textAlign = label.align ?? 'left';
        const textWidth = ctx.measureText(label.text).width;
        const anchorX = x + label.x;
        const baseline = imageY + label.y;
        const left =
          label.align === 'center'
            ? anchorX - textWidth / 2
            : label.align === 'right'
              ? anchorX - textWidth
              : anchorX;
        const top = baseline - label.size * 0.82;

        ctx.fillStyle = 'rgba(10, 11, 14, 0.82)';
        ctx.fillRect(
          left - 8,
          top - 5,
          textWidth + 16,
          label.size * 1.12 + 10,
        );
        ctx.fillStyle = '#f5f0e8';
        ctx.fillText(label.text, anchorX, baseline);
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
  const startedAt = performance.now();
  const { bitmap, labels } = await createCalibrationImage();
  try {
    const kinds: Array<{ kind: HalftoneExportKind; title: string }> = [
      { kind: 'color', title: 'Color (separación)' },
    ];
    if (options.underbase) kinds.push({ kind: 'underbase', title: 'Base blanca' });
    kinds.push({ kind: 'composite', title: 'Composite' });

    // Una sola sesión WebGPU: dispositivo, pipeline, imagen y pasadas se
    // comparten entre los tres paneles.
    const results = await exportHalftoneLayers(
      bitmap,
      options,
      kinds.map((entry) => entry.kind),
      bitmap,
    );

    const panels: CalibrationPanel[] = kinds.map(({ kind, title }) => {
      const result = results[kind];
      if (!result) {
        throw new Error(`No se pudo generar la capa ${kind} de la calibración.`);
      }
      return { kind, title, result };
    });

    const sheet = await composeCalibrationSheet(panels, labels, options);
    sheet.durationMs = performance.now() - startedAt;
    return sheet;
  } finally {
    bitmap.close();
  }
}
