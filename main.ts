// main.ts — make.fun entry for "Sum up 24 November's world news in one image"
// (competition news-image-20261124).
//
// The image is a newspaper front page for Tuesday 24 November 2026, drawn as HTML + CSS + inline
// SVG by image-source/make-image.mjs and committed beside this program as entry.png. This program
// ships that image to the grader: it reads entry.png relative to import.meta.url, proves it is a
// whole PNG inside the gate's limits — signature, chunk lengths, every chunk checksum, IHDR
// dimensions, IEND, and image data that inflates to exactly the byte count IHDR describes — and
// writes it to ${MAKEFUN_OUTPUT_DIR ?? '/output'}/entry.png unchanged, through a temporary name and
// a rename so a reader never sees half a file, then reads it back to confirm. Both grader runs
// write the same bytes. No network, nothing read outside the repository and the output folder.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const LIMIT_BYTES = 1048576;
const LIMIT_SIDE = 1024;
const SAMPLES_PER_PIXEL: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

const imagePath = fileURLToPath(new URL('./entry.png', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const outPath = join(outDir, 'entry.png');

/** The CRC-32 that PNG stores at the end of every chunk. */
function pngCrc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

type Png = {
  bytes: number; width: number; height: number; chunkNames: string[];
  inflatedBytes: number; describedBytes: number;
};

/**
 * Read the whole PNG: every chunk's length and checksum, IHDR's dimensions and colour format, the
 * concatenated IDAT stream inflated and compared with the row size IHDR implies, and IEND's
 * presence. Anything wrong throws, so a damaged file is never written out.
 */
function readPng(file: Buffer): Png {
  if (file.length < 8 || !file.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error('entry.png is not a PNG: its first eight bytes are wrong');
  }

  const chunkNames: string[] = [];
  const idat: Buffer[] = [];
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colourType = -1;
  let sawEnd = false;
  let cursor = 8;

  while (cursor + 12 <= file.length) {
    const length = file.readUInt32BE(cursor);
    const name = file.toString('latin1', cursor + 4, cursor + 8);
    const stop = cursor + 8 + length;
    if (stop + 4 > file.length) throw new Error(`PNG chunk ${name} runs past the end of the file`);
    const body = file.subarray(cursor + 8, stop);
    const expected = pngCrc32(Buffer.concat([Buffer.from(name, 'latin1'), body]));
    if (file.readUInt32BE(stop) !== expected) throw new Error(`PNG chunk ${name} fails its checksum`);
    chunkNames.push(name);

    if (name === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      bitDepth = body[8];
      colourType = body[9];
      if (body[12] !== 0) throw new Error('an interlaced PNG is not expected here');
    }
    if (name === 'IDAT') idat.push(body);
    if (name === 'IEND') { sawEnd = true; break; }
    cursor = stop + 4;
  }

  if (!sawEnd) throw new Error('entry.png has no IEND: it is not a whole PNG');
  if (chunkNames[0] !== 'IHDR' || idat.length === 0) {
    throw new Error('entry.png needs IHDR first and IDAT data');
  }

  const samples = SAMPLES_PER_PIXEL[colourType];
  if (samples === undefined) throw new Error(`PNG colour type ${colourType} is not one this entry uses`);
  const rowBytes = Math.ceil((width * samples * bitDepth) / 8);

  return {
    bytes: file.length,
    width,
    height,
    chunkNames,
    inflatedBytes: inflateSync(Buffer.concat(idat)).length,
    describedBytes: height * (rowBytes + 1),
  };
}

const image = readFileSync(imagePath);
const png = readPng(image);

if (png.bytes > LIMIT_BYTES) throw new Error(`${png.bytes} bytes is over the ${LIMIT_BYTES}-byte cap`);
if (png.width > LIMIT_SIDE || png.height > LIMIT_SIDE) {
  throw new Error(`${png.width}x${png.height} is over the ${LIMIT_SIDE}x${LIMIT_SIDE} pixel cap`);
}
if (png.inflatedBytes !== png.describedBytes) {
  throw new Error(`image data inflates to ${png.inflatedBytes} bytes, but IHDR describes ${png.describedBytes}`);
}

// Write it through a temporary name in the same directory, then rename over the target.
mkdirSync(outDir, { recursive: true });
const staging = `${outPath}.part`;
rmSync(staging, { force: true });
writeFileSync(staging, image);
renameSync(staging, outPath);

const written = readFileSync(outPath);
if (!written.equals(image)) throw new Error('the entry.png that was written is not the source image');

const digest = createHash('sha256').update(written).digest('hex');
console.log(
  `entry.png ${png.bytes} bytes, ${png.width}x${png.height}, ${png.chunkNames.length} chunks, ` +
  `${png.inflatedBytes} bytes of image data — sha256 ${digest} — written to ${outPath}`,
);
