const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const IHDR = [73, 72, 68, 82];
const PHYS = [112, 72, 89, 115];

let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;

  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) {
      value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  crcTable = table;
  return table;
}

function crc32(bytes: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function matches(bytes: Uint8Array, offset: number, expected: number[]): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

/**
 * Inserta un chunk pHYs en un PNG para que conserve el DPI físico. El chunk se
 * coloca justo después de IHDR y expresa píxeles por metro (unidad 1).
 */
export async function addPngDpi(blob: Blob, dpi: number): Promise<Blob> {
  const safeDpi = Number.isFinite(dpi) && dpi > 0 ? dpi : 300;
  const bytes = new Uint8Array(await blob.arrayBuffer());

  if (bytes.length < 33 || !matches(bytes, 0, PNG_SIGNATURE) || !matches(bytes, 12, IHDR)) {
    return blob;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ihdrLength = view.getUint32(8, false);
  const insertAt = 8 + 12 + ihdrLength;
  if (insertAt > bytes.length) return blob;

  const pixelsPerMeter = Math.max(1, Math.round(safeDpi / 0.0254));
  const chunk = new Uint8Array(21);
  const chunkView = new DataView(chunk.buffer);
  chunkView.setUint32(0, 9, false);
  chunk.set(PHYS, 4);
  chunkView.setUint32(8, pixelsPerMeter, false);
  chunkView.setUint32(12, pixelsPerMeter, false);
  chunk[16] = 1;
  chunkView.setUint32(17, crc32(chunk.subarray(4, 17)), false);

  const output = new Uint8Array(bytes.length + chunk.length);
  output.set(bytes.subarray(0, insertAt), 0);
  output.set(chunk, insertAt);
  output.set(bytes.subarray(insertAt), insertAt + chunk.length);
  return new Blob([output], { type: 'image/png' });
}
