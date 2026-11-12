import { describe, expect, it } from 'vitest';
import { addPngDpi } from './png';

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: number[]): number[] {
  const bytes = new Uint8Array(12 + data.length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, data.length, false);
  for (let index = 0; index < 4; index++) bytes[4 + index] = type.charCodeAt(index);
  bytes.set(data, 8);
  view.setUint32(8 + data.length, crc32(bytes.subarray(4, 8 + data.length)), false);
  return [...bytes];
}

function makePng(): Uint8Array<ArrayBuffer> {
  const ihdr = new Array(13).fill(0);
  ihdr[3] = 2;
  ihdr[7] = 2;
  ihdr[8] = 8;
  ihdr[9] = 6;
  return new Uint8Array([
    ...SIGNATURE,
    ...chunk('IHDR', ihdr),
    ...chunk('IDAT', [0, 0, 0]),
  ]);
}

interface ParsedChunk {
  type: string;
  data: Uint8Array;
  crc: number;
  expectedCrc: number;
}

function parseChunks(bytes: Uint8Array): ParsedChunk[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: ParsedChunk[] = [];
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    chunks.push({
      type,
      data,
      crc: view.getUint32(offset + 8 + length, false),
      expectedCrc: crc32(bytes.subarray(offset + 4, offset + 8 + length)),
    });
    offset += 12 + length;
  }
  return chunks;
}

describe('PNG DPI metadata', () => {
  it('inserts a valid pHYs chunk after IHDR', async () => {
    const original = new Blob([makePng()], { type: 'image/png' });
    const withDpi = await addPngDpi(original, 300);
    const chunks = parseChunks(new Uint8Array(await withDpi.arrayBuffer()));

    expect(chunks.map((entry) => entry.type)).toEqual(['IHDR', 'pHYs', 'IDAT']);
    const phys = chunks.find((entry) => entry.type === 'pHYs');
    if (!phys) throw new Error('pHYs no encontrado.');

    const view = new DataView(phys.data.buffer, phys.data.byteOffset, phys.data.byteLength);
    expect(view.getUint32(0, false)).toBe(11811);
    expect(view.getUint32(4, false)).toBe(11811);
    expect(phys.data[8]).toBe(1);
    expect(phys.crc).toBe(phys.expectedCrc);
  });

  it('keeps non-PNG data untouched', async () => {
    const original = new Blob([new Uint8Array([1, 2, 3, 4])]);
    const result = await addPngDpi(original, 300);
    expect([...new Uint8Array(await result.arrayBuffer())]).toEqual([1, 2, 3, 4]);
  });
});
