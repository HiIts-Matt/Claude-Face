// Renders the first frame of the idle crab animation to images/icon.png.
// Run with: node scripts/generate-icon.js
// Pure Node.js — no extra dependencies.

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const W = 36, H = 36, SCALE = 8;
const OW = W * SCALE, OH = H * SCALE;

// Palette matches panel.ts — theme slots use their fallback values.
// Index 0 → fully transparent.
const PAL_HEX = [
  null,      '#1a0a00', '#3d1f00', '#c85000', '#ff6b1a',
  '#ff9955', '#ffddbb', '#2d2d30', '#000000', '#ff2222',
  '#ffee44', '#44aaff', '#001133', '#88ccff', '#cccccc',
  '#00cc44', '#aaffcc', '#884400', '#552200', '#ffcc00',
  '#ffaacc',
];

function hexToRgba(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
    255,
  ];
}

// ─── Pixel helpers (mirrors panel.ts) ────────────────────────────────────────

function px(buf, x, y, c) {
  if (x < 0 || x >= W || y < 0 || y >= H) { return; }
  buf[y * W + x] = c;
}

function fillRect(buf, x, y, w, h, c) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      px(buf, x + dx, y + dy, c);
    }
  }
}

// ─── First idle frame: makeCrab(0) ───────────────────────────────────────────

function makeCrab(oy) {
  const buf = new Uint8Array(W * H);
  const lx = 9;
  const ty = 8 + oy;

  fillRect(buf, lx, ty, 18, 12, 3);
  fillRect(buf, lx, ty, 18,  2, 4);

  fillRect(buf, lx + 3,  ty + 3, 3, 3, 8); px(buf, lx + 3,  ty + 3, 13);
  fillRect(buf, lx + 12, ty + 3, 3, 3, 8); px(buf, lx + 12, ty + 3, 13);

  px(buf, lx + 6,  ty + 8, 8); px(buf, lx + 7,  ty + 9, 8);
  px(buf, lx + 8,  ty + 9, 8); px(buf, lx + 9,  ty + 9, 8);
  px(buf, lx + 10, ty + 9, 8); px(buf, lx + 11, ty + 8, 8);

  fillRect(buf, lx - 2,  ty + 5, 2, 4, 3); fillRect(buf, lx - 2,  ty + 8, 2, 1, 2);
  fillRect(buf, lx + 18, ty + 5, 2, 4, 3); fillRect(buf, lx + 18, ty + 8, 2, 1, 2);

  for (const legX of [lx, lx + 4, lx + 12, lx + 16]) {
    fillRect(buf, legX, ty + 12, 2, 4, 3);
    fillRect(buf, legX, ty + 15, 2, 1, 2);
  }

  return buf;
}

// ─── Scale up ────────────────────────────────────────────────────────────────

function scaleUp(indexBuf) {
  const rgba = new Uint8Array(OW * OH * 4);
  for (let ly = 0; ly < H; ly++) {
    for (let lx = 0; lx < W; lx++) {
      const idx = indexBuf[ly * W + lx];
      const color = idx === 0 ? [0, 0, 0, 0] : hexToRgba(PAL_HEX[idx]);
      for (let sy = 0; sy < SCALE; sy++) {
        for (let sx = 0; sx < SCALE; sx++) {
          const px = (ly * SCALE + sy) * OW + (lx * SCALE + sx);
          rgba[px * 4 + 0] = color[0];
          rgba[px * 4 + 1] = color[1];
          rgba[px * 4 + 2] = color[2];
          rgba[px * 4 + 3] = color[3];
        }
      }
    }
  }
  return rgba;
}

// ─── PNG encoder ─────────────────────────────────────────────────────────────

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) { c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const byte of buf) { crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8); }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf    = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length);
  const crcBuf    = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  // Filter byte 0 (None) before each row
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = y * (1 + width * 4) + 1 + x * 4;
      raw[dst]     = rgba[src];
      raw[dst + 1] = rgba[src + 1];
      raw[dst + 2] = rgba[src + 2];
      raw[dst + 3] = rgba[src + 3];
    }
  }

  const idat = zlib.deflateSync(raw, { level: 9 });
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const indexBuf = makeCrab(0);
const rgba     = scaleUp(indexBuf);
const png      = encodePng(OW, OH, rgba);

const outPath = path.join(__dirname, '..', 'images', 'icon.png');
fs.writeFileSync(outPath, png);
console.log(`Written: ${outPath} (${OW}x${OH})`);
