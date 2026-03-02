// PNG encoder from scratch — zero dependencies
// PNG spec: http://www.w3.org/TR/PNG/
// Uses only Node.js built-in zlib for DEFLATE compression

import { deflateSync } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);

  const body = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));

  return Buffer.concat([length, body, crc]);
}

function makeIHDR(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);      // width
  data.writeUInt32BE(height, 4);     // height
  data.writeUInt8(8, 8);             // bit depth: 8
  data.writeUInt8(6, 9);             // color type: 6 = RGBA
  data.writeUInt8(0, 10);            // compression: deflate
  data.writeUInt8(0, 11);            // filter: adaptive
  data.writeUInt8(0, 12);            // interlace: none
  return makeChunk('IHDR', data);
}

function makeIDAT(pixels, width, height) {
  // Each row: 1 filter byte (0 = None) + width * 4 bytes (RGBA)
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // filter type: None
    for (let x = 0; x < width; x++) {
      const pi = (y * width + x) * 4;
      const ri = rowOffset + 1 + x * 4;
      raw[ri] = pixels[pi];       // R
      raw[ri + 1] = pixels[pi + 1]; // G
      raw[ri + 2] = pixels[pi + 2]; // B
      raw[ri + 3] = pixels[pi + 3]; // A
    }
  }

  const compressed = deflateSync(raw);
  return makeChunk('IDAT', compressed);
}

function makeIEND() {
  return makeChunk('IEND', Buffer.alloc(0));
}

/**
 * Encode RGBA pixel data into a PNG buffer.
 * @param {Uint8Array|Buffer} pixels - RGBA pixel data (width * height * 4 bytes)
 * @param {number} width
 * @param {number} height
 * @returns {Buffer} Complete PNG file buffer
 */
export function encodePNG(pixels, width, height) {
  return Buffer.concat([
    PNG_SIGNATURE,
    makeIHDR(width, height),
    makeIDAT(pixels, width, height),
    makeIEND(),
  ]);
}

/**
 * Create a scaled-up version of pixel data (nearest neighbor).
 * @param {Uint8Array|Buffer} pixels - Original RGBA pixels
 * @param {number} width - Original width
 * @param {number} height - Original height
 * @param {number} scale - Scale factor (e.g., 2 = double size)
 * @returns {{ pixels: Buffer, width: number, height: number }}
 */
export function scalePixels(pixels, width, height, scale) {
  const newW = width * scale;
  const newH = height * scale;
  const out = Buffer.alloc(newW * newH * 4);

  for (let y = 0; y < newH; y++) {
    for (let x = 0; x < newW; x++) {
      const srcX = Math.floor(x / scale);
      const srcY = Math.floor(y / scale);
      const si = (srcY * width + srcX) * 4;
      const di = (y * newW + x) * 4;
      out[di] = pixels[si];
      out[di + 1] = pixels[si + 1];
      out[di + 2] = pixels[si + 2];
      out[di + 3] = pixels[si + 3];
    }
  }

  return { pixels: out, width: newW, height: newH };
}
