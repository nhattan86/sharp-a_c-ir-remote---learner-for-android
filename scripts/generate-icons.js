import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

// Generate a valid uncompressed / deflate PNG file of dimension WxH with RGBA pixels
function createPng(width, height, r, g, b, a = 255) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data with filter byte 0 per scanline
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // Draw remote shape: rounded rect in center
      const inRemote =
        x > width * 0.25 &&
        x < width * 0.75 &&
        y > height * 0.15 &&
        y < height * 0.85;

      const inLcd =
        x > width * 0.32 &&
        x < width * 0.68 &&
        y > height * 0.22 &&
        y < height * 0.42;

      const inPower =
        Math.hypot(x - width * 0.58, y - height * 0.52) < width * 0.08;

      if (inPower) {
        rawData[pxOffset] = 239;     // R
        rawData[pxOffset + 1] = 68;  // G
        rawData[pxOffset + 2] = 68;  // B
        rawData[pxOffset + 3] = 255;
      } else if (inLcd) {
        rawData[pxOffset] = 163;     // R
        rawData[pxOffset + 1] = 184; // G
        rawData[pxOffset + 2] = 153; // B
        rawData[pxOffset + 3] = 255;
      } else if (inRemote) {
        rawData[pxOffset] = 241;     // R
        rawData[pxOffset + 1] = 245; // G
        rawData[pxOffset + 2] = 249; // B
        rawData[pxOffset + 3] = 255;
      } else {
        // Background dark indigo
        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
        rawData[pxOffset + 3] = a;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 192x192
const pwa192 = createPng(192, 192, 30, 27, 75);
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);

// 512x512
const pwa512 = createPng(512, 512, 30, 27, 75);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);

// Maskable 512x512 (with padded background)
const pwaMaskable = createPng(512, 512, 15, 23, 42);
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);

// Apple touch icon 180x180
const appleIcon = createPng(180, 180, 30, 27, 75);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);

console.log('Successfully generated PWA PNG icons in /public!');
