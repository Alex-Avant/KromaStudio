export interface CalibrationLabel {
  text: string;
  x: number;
  y: number;
  size: number;
  align?: CanvasTextAlign;
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
): Promise<CalibrationImage> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear la imagen de calibración.');

  const labels: CalibrationLabel[] = [];
  const margin = Math.round(width * 0.065);
  const contentWidth = width - margin * 2;
  const section = (text: string, y: number) => {
    labels.push({ text, x: margin, y, size: Math.round(width * 0.026) });
  };

  ctx.clearRect(0, 0, width, height);

  // 1) Degradado continuo para revisar la transición tonal.
  const rampY = Math.round(height * 0.055);
  const rampH = Math.round(height * 0.075);
  const ramp = ctx.createLinearGradient(margin, 0, margin + contentWidth, 0);
  ramp.addColorStop(0, '#ffffff');
  ramp.addColorStop(1, '#000000');
  ctx.fillStyle = ramp;
  ctx.fillRect(margin, rampY, contentWidth, rampH);
  section('Degradado', rampY + rampH + Math.round(height * 0.032));

  // 2) Parches de cobertura nominal; sus porcentajes se rotulan después.
  const coverages = [0, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 1];
  const patchY = Math.round(height * 0.19);
  const patchGap = Math.round(width * 0.008);
  const patchWidth = (contentWidth - patchGap * (coverages.length - 1)) / coverages.length;
  const patchHeight = Math.round(height * 0.07);

  coverages.forEach((coverage, index) => {
    const value = Math.round((1 - coverage) * 255);
    const x = margin + index * (patchWidth + patchGap);
    ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
    ctx.fillRect(x, patchY, patchWidth, patchHeight);
    labels.push({
      text: `${Math.round(coverage * 100)}%`,
      x: x + patchWidth / 2,
      y: patchY + patchHeight + Math.round(height * 0.028),
      size: Math.round(width * 0.022),
      align: 'center',
    });
  });

  // 3) Círculos y líneas finas para evaluar contornos y mínimo imprimible.
  const geometryY = Math.round(height * 0.32);
  section('Círculos y líneas', geometryY - Math.round(height * 0.018));

  const circleY = geometryY + Math.round(height * 0.06);
  const radii = [0.06, 0.09, 0.12].map((ratio) => width * ratio);
  radii.forEach((radius, index) => {
    const x = margin + contentWidth * (0.18 + index * 0.31);
    ctx.fillStyle = index === 1 ? '#808080' : '#ffffff';
    ctx.beginPath();
    ctx.arc(x, circleY, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  const lineWidths = [1, 2, 4, 8].map((value) => Math.max(1, Math.round((width / 1200) * value)));
  lineWidths.forEach((lineWidth, index) => {
    const y = geometryY + Math.round(height * (0.13 + index * 0.025));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(margin + contentWidth, y);
    ctx.stroke();
  });

  // 4) Tipografía: los rótulos de prueba sí forman parte de la trama.
  const textY = Math.round(height * 0.52);
  section('Tipografía y detalle', textY - Math.round(height * 0.018));
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 ${Math.round(width * 0.07)}px Georgia, serif`;
  ctx.fillText('Aa Serif', margin, textY + Math.round(height * 0.06));
  ctx.font = `700 ${Math.round(width * 0.07)}px system-ui, sans-serif`;
  ctx.fillText('Aa Sans', margin + contentWidth * 0.52, textY + Math.round(height * 0.06));
  ctx.font = `500 ${Math.round(width * 0.028)}px system-ui, sans-serif`;
  ctx.fillText('Texto pequeño 1234567890', margin, textY + Math.round(height * 0.105));

  // 5) Color sólido para verificar que el modo Color conserva los RGB.
  const colorY = Math.round(height * 0.67);
  const colorH = Math.round(height * 0.09);
  section('Color sólido', colorY - Math.round(height * 0.018));
  const colors = ['#d9272e', '#1e5bc6', '#f0b45f'];
  const colorWidth = contentWidth / colors.length;
  colors.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(margin + index * colorWidth, colorY, colorWidth, colorH);
  });

  // 6) Rampa de alfa sobre negro: el área imprimible debe seguir el canal alfa.
  const alphaY = Math.round(height * 0.81);
  const alphaH = Math.round(height * 0.075);
  section('Transparencia', alphaY - Math.round(height * 0.018));
  const alphaRamp = ctx.createLinearGradient(margin, 0, margin + contentWidth, 0);
  alphaRamp.addColorStop(0, 'rgba(255,255,255,0)');
  alphaRamp.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = alphaRamp;
  ctx.fillRect(margin, alphaY, contentWidth, alphaH);

  // Un bloque con agujero transparente permite revisar halos y choke.
  const holeY = Math.round(height * 0.91);
  const holeSize = Math.round(height * 0.07);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(margin, holeY, holeSize * 2, holeSize);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(margin + holeSize, holeY + holeSize / 2, holeSize * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  return { bitmap: await createImageBitmap(canvas), labels };
}
