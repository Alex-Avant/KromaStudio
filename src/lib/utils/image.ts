import type { HalftoneImageSource } from '../types/halftone';

export interface LoadedImage {
  bitmap: ImageBitmap;
  /** true sólo si el bitmap fue creado aquí y debemos liberarlo. */
  owned: boolean;
}

export interface PackedImage {
  pixels: Uint32Array<ArrayBuffer>;
  /** Dimensiones del buffer reducido que se sube a la GPU. */
  width: number;
  height: number;
  /** Dimensiones lógicas de salida antes de reducir el buffer. */
  logicalWidth: number;
  logicalHeight: number;
}

// Deja margen para dos storage buffers (color y underbase) en GPUs móviles.
const MAX_IMAGE_DIMENSION = 2048;

async function decodeImage(blob: Blob, name?: string): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob);
  } catch {
    try {
      return await decodeWithImageElement(blob);
    } catch {
      const detail = name ? ` «${name}»` : '';
      throw new Error(
        `No se pudo decodificar la imagen${detail}. Usa un PNG, JPG o WebP válido.`,
      );
    }
  }
}

// Respaldo para archivos que createImageBitmap rechaza pero el navegador sí
// sabe mostrar (algunos pickers de Android, JPEG con perfiles atípicos, etc.).
// Decodifica con un <img> y convierte el resultado a ImageBitmap por canvas.
async function decodeWithImageElement(blob: Blob): Promise<ImageBitmap> {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<ImageBitmap>((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('No se pudo crear el contexto 2D para decodificar.'));
          return;
        }
        context.drawImage(image, 0, 0);
        createImageBitmap(canvas).then(resolve, reject);
      };
      image.onerror = () => reject(new Error('El navegador no pudo mostrar la imagen.'));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Carga una imagen desde una URL, un archivo/Blob o un ImageBitmap existente.
 * Las URLs necesitan CORS porque después leemos sus píxeles.
 */
export async function loadImage(source: HalftoneImageSource): Promise<LoadedImage> {
  if (typeof source === 'string') {
    const response = await fetch(source, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`No se pudo cargar la imagen (HTTP ${response.status}).`);
    }

    const blob = await response.blob();
    return { bitmap: await decodeImage(blob), owned: true };
  }

  if (source instanceof ImageBitmap) {
    return { bitmap: source, owned: false };
  }

  if (source instanceof Blob) {
    const name = source instanceof File ? source.name : undefined;
    return { bitmap: await decodeImage(source, name), owned: true };
  }

  throw new Error('La fuente debe ser una URL, un archivo o un ImageBitmap válido.');
}

/**
 * Extrae los píxeles RGBA y los empaqueta como u32 little-endian:
 * R en bits 0-7, G en 8-15, B en 16-23 y A en 24-31.
 * Las imágenes grandes se reducen proporcionalmente antes de leerlas.
 */
export function bitmapToPackedRgba(
  bitmap: ImageBitmap,
  maxDimension = MAX_IMAGE_DIMENSION,
): PackedImage {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('No se pudo crear el contexto 2D para leer la imagen.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  return {
    // ImageData siempre está respaldado por un ArrayBuffer (nunca SharedArrayBuffer).
    pixels: new Uint32Array(data.buffer as ArrayBuffer, data.byteOffset, width * height),
    width,
    height,
    logicalWidth: bitmap.width,
    logicalHeight: bitmap.height,
  };
}
