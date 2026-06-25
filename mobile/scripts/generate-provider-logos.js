/**
 * Generates branded placeholder PNG logos for providers.
 * Run: node scripts/generate-provider-logos.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '../src/assets/logos');

const PROVIDERS = [
  { file: 'mtn.png', color: [255, 204, 0] },
  { file: 'airtel.png', color: [237, 28, 36] },
  { file: 'glo.png', color: [0, 177, 64] },
  { file: '9mobile.png', color: [0, 102, 51] },
  { file: 'dstv.png', color: [0, 56, 130] },
  { file: 'gotv.png', color: [0, 166, 81] },
  { file: 'startimes.png', color: [244, 121, 32] },
  { file: 'waec.png', color: [4, 120, 87] },
  { file: 'neco.png', color: [29, 78, 216] },
  { file: 'jamb.png', color: [15, 118, 110] },
  { file: 'bet9ja.png', color: [21, 128, 61] },
  { file: 'sportybet.png', color: [220, 38, 38] },
  { file: 'betking.png', color: [30, 64, 175] },
  { file: '1xbet.png', color: [30, 58, 138] },
];

const SIZE = 128;

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createSolidPng(width, height, [r, g, b]) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const px = rowStart + 1 + x * 3;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(raw);
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

PROVIDERS.forEach(({ file, color }) => {
  const png = createSolidPng(SIZE, SIZE, color);
  fs.writeFileSync(path.join(OUT_DIR, file), png);
  console.log(`Created ${file}`);
});

console.log(`Done — ${PROVIDERS.length} logos in src/assets/logos/`);
