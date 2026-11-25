// make-image.mjs — draws image-source/index.html to entry.png with headless Chromium.
//
// The 24 November 2026 front page is pure HTML + CSS + inline SVG: no raster art, no downloaded
// fonts (only the DejaVu families a bare Linux box has), nothing fetched. This script is the
// render step of the build, kept in the repository so the image can be drawn again:
//
//   node image-source/make-image.mjs
//
// It then reads the PNG back and reports what it is: byte size, dimensions, chunk list, the
// inflated image data against what IHDR describes, and the sha256 of the file it wrote.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const here = fileURLToPath(new URL('.', import.meta.url));
const PAGE = here + 'index.html';
const OUT = here + '..' + '/entry.png';
const CHROME = process.env.CHROME ?? '/root/.hermes/tools/chromium-1248/chrome-linux64/chrome';

if (!existsSync(CHROME)) {
  console.error(`no Chromium at ${CHROME} — set CHROME=/path/to/chrome`);
  process.exit(1);
}

rmSync(OUT, { force: true });

const chrome = spawnSync(CHROME, [
  '--headless',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1024,1024',
  '--virtual-time-budget=2000',
  `--screenshot=${OUT}`,
  `file://${PAGE}`,
], { encoding: 'utf8' });

if (chrome.status !== 0) {
  console.error(chrome.stderr || chrome.stdout);
  process.exit(chrome.status ?? 1);
}

/** PNG colour type -> samples per pixel. */
const SAMPLES = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

const png = readFileSync(OUT);
const file = {
  bytes: png.length,
  signature: png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  chunks: [],
  idat: [],
  width: 0,
  height: 0,
  bitDepth: 0,
  colourType: -1,
  interlaced: -1,
  ended: false,
};

let at = 8;
while (at + 12 <= png.length) {
  const size = png.readUInt32BE(at);
  const name = png.toString('latin1', at + 4, at + 8);
  const body = png.subarray(at + 8, at + 8 + size);
  let crc = 0xffffffff;
  for (const byte of Buffer.concat([Buffer.from(name, 'latin1'), body])) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  if ((crc ^ 0xffffffff) >>> 0 !== png.readUInt32BE(at + 8 + size)) {
    throw new Error(`${name} chunk checksum does not match`);
  }
  file.chunks.push(name);
  if (name === 'IHDR') {
    file.width = body.readUInt32BE(0);
    file.height = body.readUInt32BE(4);
    file.bitDepth = body[8];
    file.colourType = body[9];
    file.interlaced = body[12];
  }
  if (name === 'IDAT') file.idat.push(body);
  if (name === 'IEND') { file.ended = true; break; }
  at += size + 12;
}

const samples = SAMPLES[file.colourType];
const rowBytes = Math.ceil((file.width * samples * file.bitDepth) / 8);
const raw = inflateSync(Buffer.concat(file.idat));

console.log(`entry.png        ${file.bytes} bytes`);
console.log(`dimensions       ${file.width} x ${file.height} (bit depth ${file.bitDepth}, colour type ${file.colourType})`);
console.log(`chunks           ${file.chunks.length}: ${file.chunks[0]} ... ${file.chunks[file.chunks.length - 1]}`);
console.log(`image data       ${raw.length} bytes inflated, IHDR describes ${file.height * (rowBytes + 1)}`);
console.log(`whole PNG        ${file.signature && file.ended && file.idat.length > 0 ? 'yes' : 'NO'}`);
console.log(`inside the caps  ${file.bytes <= 1048576 && file.width <= 1024 && file.height <= 1024 ? 'yes' : 'NO'}`);
console.log(`sha256           ${createHash('sha256').update(png).digest('hex')}`);
