/**
 * Genera una imagen de diagnóstico con rampas tonal y de alfa, parches de
 * cobertura, color, texto, detalles finos y un agujero transparente.
 */
export async function createDemoImage(size = 1024): Promise<ImageBitmap> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo crear el canvas de demostración.');
  }

  const margin = size * 0.06;
  const contentWidth = size - margin * 2;
  ctx.clearRect(0, 0, size, size);

  // Rampa de grises para comprobar monotonía y los extremos de la trama.
  const grayRamp = ctx.createLinearGradient(margin, 0, margin + contentWidth, 0);
  grayRamp.addColorStop(0, '#ffffff');
  grayRamp.addColorStop(1, '#000000');
  ctx.fillStyle = grayRamp;
  ctx.fillRect(margin, size * 0.04, contentWidth, size * 0.09);

  // Color y detalles para detectar puntos cortados por la imagen fuente.
  const centerX = size * 0.5;
  const centerY = size * 0.38;
  const colorGradient = ctx.createLinearGradient(
    size * 0.2,
    size * 0.15,
    size * 0.8,
    size * 0.62,
  );
  colorGradient.addColorStop(0, '#fff8e7');
  colorGradient.addColorStop(0.25, '#f0c96a');
  colorGradient.addColorStop(0.55, '#b5542f');
  colorGradient.addColorStop(0.8, '#3a1a17');
  colorGradient.addColorStop(1, '#080808');
  ctx.fillStyle = colorGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = size * 0.012;
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.18, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.font = `700 ${size * 0.09}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DTF', centerX, size * 0.51);

  // Agujero transparente: el underbase debe erosionar el mismo borde que color.
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.075, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  // Rampa de alfa sobre negro: debe cambiar el área de los puntos, no crear
  // grandes regiones de tinta semitransparente.
  const alphaRamp = ctx.createLinearGradient(margin, 0, margin + contentWidth, 0);
  alphaRamp.addColorStop(0, 'rgba(0, 0, 0, 0)');
  alphaRamp.addColorStop(1, 'rgba(0, 0, 0, 1)');
  ctx.fillStyle = alphaRamp;
  ctx.fillRect(margin, size * 0.69, contentWidth, size * 0.08);

  // Parches con cobertura nominal 0, 1, 5, 25, 50, 75, 95, 99 y 100 %.
  const coverages = [0, 0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99, 1];
  const gap = size * 0.008;
  const patchSize = (contentWidth - gap * (coverages.length - 1)) / coverages.length;
  coverages.forEach((coverage, index) => {
    const value = Math.round((1 - coverage) * 255);
    ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
    ctx.fillRect(margin + index * (patchSize + gap), size * 0.84, patchSize, patchSize);
  });

  return createImageBitmap(canvas);
}
