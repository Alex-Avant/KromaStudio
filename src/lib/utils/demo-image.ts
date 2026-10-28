/**
 * Genera un ImageBitmap de prueba con:
 * - un degradado continuo (para ver cómo cambia el tamaño del punto),
 * - un agujero transparente en el centro (para probar el choke),
 * - texto y un anillo con distintos niveles de luminancia.
 */
export async function createDemoImage(size = 1024): Promise<ImageBitmap> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo crear el canvas de demostración.');
  }

  ctx.clearRect(0, 0, size, size);

  const gradient = ctx.createLinearGradient(
    size * 0.1,
    size * 0.1,
    size * 0.9,
    size * 0.9,
  );
  gradient.addColorStop(0, '#fff8e7');
  gradient.addColorStop(0.25, '#f0c96a');
  gradient.addColorStop(0.55, '#b5542f');
  gradient.addColorStop(0.8, '#3a1a17');
  gradient.addColorStop(1, '#080808');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
  ctx.fill();

  // Agujero transparente: el underbase debe quedar erosionado en su borde.
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.16, 0, Math.PI * 2);
  ctx.fill();

  // Detalles claros y oscuros para comprobar la respuesta del semitono.
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.font = `700 ${size * 0.1}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DTF', size / 2, size * 0.72);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.3, 0, Math.PI * 2);
  ctx.stroke();

  return createImageBitmap(canvas);
}
