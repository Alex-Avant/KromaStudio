import type { HalftonePolarity } from '../types/halftone';
import { getCalibrationGeometry, type CalibrationRect } from './calibration-layout';
import { CALIBRATION_INPUT_TONES, inkGray, toneGray, toneLabel } from './calibration-tones';

export interface CalibrationLabel {
  text: string;
  x: number;
  y: number;
  size: number;
  align?: CanvasTextAlign;
  weight?: number;
  /** Etiqueta sin fondo, usada para títulos compactos entre filas. */
  plain?: boolean;
}

export interface CalibrationImage {
  bitmap: ImageBitmap;
  labels: CalibrationLabel[];
}

/**
 * Genera una lámina de prueba DTF sin textos rasterizados en la fuente. Las
 * etiquetas se devuelven aparte para dibujarlas después del semitono, de modo
 * que permanezcan legibles y no alteren la medición de los patrones.
 */
export async function createCalibrationImage(
  width = 1200,
  height = 1600,
  polarity: HalftonePolarity = 'light',
): Promise<CalibrationImage> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear la imagen de calibración.');

  const layout = getCalibrationGeometry(width);
  const labels: CalibrationLabel[] = [];
  const { margin } = layout;
  const labelY = (band: CalibrationRect) => band.y + Math.round(band.height * 0.72);
  const sectionSize = Math.round(width * 0.0258);
  const valueSize = Math.round(width * 0.0217);
  const toneTitleSize = Math.round(width * 0.0183);
  const ink = inkGray(polarity);
  const inkCss = `rgb(${ink}, ${ink}, ${ink})`;
  const section = (text: string, band: CalibrationRect) => {
    labels.push({ text, x: margin, y: labelY(band), size: sectionSize, weight: 600 });
  };

  ctx.clearRect(0, 0, width, height);

  // 1) Degradado continuo de tono de entrada: negro a blanco.
  const ramp = ctx.createLinearGradient(
    layout.ramp.x,
    0,
    layout.ramp.x + layout.ramp.width,
    0,
  );
  ramp.addColorStop(0, '#000000');
  ramp.addColorStop(1, '#ffffff');
  ctx.fillStyle = ramp;
  ctx.fillRect(layout.ramp.x, layout.ramp.y, layout.ramp.width, layout.ramp.height);
  section('Degradado', layout.labelBands.ramp);

  // 2) Escala de tono de entrada; el motor decide la cobertura resultante.
  labels.push({
    text: 'Tono de entrada (%)',
    x: margin,
    y: labelY(layout.labelBands.toneTitle),
    size: toneTitleSize,
    weight: 600,
    plain: true,
  });
  layout.coveragePatches.forEach((patch, index) => {
    const tone = CALIBRATION_INPUT_TONES[index];
    const value = toneGray(tone);
    ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
    ctx.fillRect(patch.x, patch.y, patch.width, patch.height);
    labels.push({
      text: toneLabel(tone),
      x: patch.x + patch.width / 2,
      y: labelY(layout.labelBands.coverage),
      size: valueSize,
      align: 'center',
      weight: 500,
    });
  });

  // 3) Círculos y líneas finas para evaluar contornos y mínimo imprimible.
  section('Círculos y líneas', layout.labelBands.geometry);
  layout.circles.forEach((circle, index) => {
    ctx.fillStyle = index === 1 ? '#808080' : inkCss;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  layout.lines.forEach((line) => {
    ctx.fillStyle = inkCss;
    ctx.fillRect(line.x, line.y, line.width, line.height);
  });

  // 4) Tipografía: los rótulos de prueba sí forman parte de la trama.
  section('Tipografía y detalle', layout.labelBands.typography);
  ctx.fillStyle = inkCss;
  ctx.textBaseline = 'alphabetic';
  const serifSize = Math.round(width * 0.07);
  const mainBaseline = layout.textRow.y + Math.round(layout.textRow.height * 0.54);
  ctx.font = `700 ${serifSize}px Georgia, serif`;
  ctx.fillText('Aa Serif', margin, mainBaseline);
  ctx.font = `700 ${serifSize}px system-ui, sans-serif`;
  ctx.fillText('Aa Sans', margin + layout.contentWidth * 0.52, mainBaseline);
  ctx.font = `500 ${Math.round(width * 0.028)}px system-ui, sans-serif`;
  ctx.fillText(
    'Texto pequeño 1234567890',
    margin,
    layout.textRow.y + layout.textRow.height - 10,
  );

  // 5) Color sólido para verificar que el modo Color conserva los RGB.
  section('Color sólido', layout.labelBands.color);
  const colors = ['#d9272e', '#1e5bc6', '#f0b45f'];
  layout.colorBlocks.forEach((block, index) => {
    ctx.fillStyle = colors[index];
    ctx.fillRect(block.x, block.y, block.width, block.height);
  });

  // 6) Rampa de alfa sobre negro: el área imprimible debe seguir el canal alfa.
  section('Transparencia', layout.labelBands.alpha);
  const alphaRamp = ctx.createLinearGradient(
    layout.alphaRamp.x,
    0,
    layout.alphaRamp.x + layout.alphaRamp.width,
    0,
  );
  alphaRamp.addColorStop(0, `rgba(${ink}, ${ink}, ${ink}, 0)`);
  alphaRamp.addColorStop(1, `rgba(${ink}, ${ink}, ${ink}, 1)`);
  ctx.fillStyle = alphaRamp;
  ctx.fillRect(
    layout.alphaRamp.x,
    layout.alphaRamp.y,
    layout.alphaRamp.width,
    layout.alphaRamp.height,
  );

  // Un bloque con agujero transparente permite revisar halos y choke.
  ctx.fillStyle = inkCss;
  ctx.fillRect(
    layout.holeBlock.x,
    layout.holeBlock.y,
    layout.holeBlock.width,
    layout.holeBlock.height,
  );
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(
    layout.holeBlock.x + layout.holeBlock.width / 2,
    layout.holeBlock.y + layout.holeBlock.height / 2,
    layout.holeBlock.height * 0.28,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  return { bitmap: await createImageBitmap(canvas), labels };
}
