// Lecture et écriture de fichiers PNG sans dépendance, pour les outils du
// poste (transcrire-sprite.mjs, portrait.mjs) : zlib de Node fait la
// compression, le reste est le format PNG lui-même (en-tête, filtres de
// ligne, CRC). Rien d'ici n'est chargé par le jeu.

import zlib from 'node:zlib';

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

const readU32 = (bytes, at) => ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;

// Décode un PNG non entrelacé (8 ou 16 bits, gris, couleur, palette, avec ou
// sans alpha) en pixels RVBA 8 bits : { width, height, data: Uint8Array }.
export function decodePng(bytes) {
  SIGNATURE.forEach((v, i) => { if (bytes[i] !== v) throw new Error('Le fichier n\'est pas un PNG.'); });
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  let interlace = 0;
  let palette = null;
  let transparency = null;
  const idat = [];
  while (pos < bytes.length) {
    const length = readU32(bytes, pos);
    const type = String.fromCharCode(bytes[pos + 4], bytes[pos + 5], bytes[pos + 6], bytes[pos + 7]);
    const data = bytes.subarray(pos + 8, pos + 8 + length);
    pos += 12 + length;
    if (type === 'IHDR') {
      width = readU32(data, 0);
      height = readU32(data, 4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') transparency = data;
    else if (type === 'IDAT') idat.push(Buffer.from(data));
    else if (type === 'IEND') break;
  }
  if (interlace) throw new Error('PNG entrelacé : non géré.');
  if (bitDepth !== 8 && bitDepth !== 16) throw new Error(`PNG à ${bitDepth} bits par échantillon : non géré.`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const bytesPerSample = bitDepth / 8;
  const bpp = channels * bytesPerSample;
  const stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = new Uint8Array(width * height * 4);
  let previous = new Uint8Array(stride);
  let current = new Uint8Array(stride);
  let p = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[p];
    p += 1;
    for (let i = 0; i < stride; i += 1) {
      const x = raw[p];
      p += 1;
      const a = i >= bpp ? current[i - bpp] : 0;
      const b = previous[i];
      const c = i >= bpp ? previous[i - bpp] : 0;
      let v;
      if (filter === 0) v = x;
      else if (filter === 1) v = x + a;
      else if (filter === 2) v = x + b;
      else if (filter === 3) v = x + ((a + b) >> 1);
      else if (filter === 4) {
        const pr = a + b - c;
        const pa = Math.abs(pr - a);
        const pb = Math.abs(pr - b);
        const pc = Math.abs(pr - c);
        v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      } else throw new Error(`Filtre PNG inconnu : ${filter}`);
      current[i] = v & 255;
    }
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4;
      const s = x * bpp;
      const sample = (k) => current[s + k * bytesPerSample];
      if (colorType === 6) {
        out[o] = sample(0); out[o + 1] = sample(1); out[o + 2] = sample(2); out[o + 3] = sample(3);
      } else if (colorType === 2) {
        out[o] = sample(0); out[o + 1] = sample(1); out[o + 2] = sample(2); out[o + 3] = 255;
      } else if (colorType === 0) {
        out[o] = out[o + 1] = out[o + 2] = sample(0); out[o + 3] = 255;
      } else if (colorType === 4) {
        out[o] = out[o + 1] = out[o + 2] = sample(0); out[o + 3] = sample(1);
      } else {
        const index = current[s];
        out[o] = palette[index * 3]; out[o + 1] = palette[index * 3 + 1]; out[o + 2] = palette[index * 3 + 2];
        out[o + 3] = transparency && index < transparency.length ? transparency[index] : 255;
      }
    }
    [previous, current] = [current, previous];
  }
  return { width, height, data: out };
}

// --- Écriture ----------------------------------------------------------------

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

function header(width, height, colorType) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = colorType; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return ihdr;
}

// Lignes sans filtre, précédées de l'octet 0 du filtre.
function rawRows(width, height, bytesPerPixel, pixels) {
  const stride = width * bytesPerPixel;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  return raw;
}

// PNG RVBA 8 bits.
export function encodePng(width, height, rgba) {
  return Buffer.concat([
    Buffer.from(SIGNATURE),
    chunk('IHDR', header(width, height, 6)),
    chunk('IDAT', zlib.deflateSync(rawRows(width, height, 4, rgba), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// PNG à palette (au plus 256 couleurs) : indices (Uint8Array, un par pixel),
// palette [[r, g, b], ...] et, si donnée, l'opacité de chaque entrée (0 à 255).
// Quatre à huit fois plus léger qu'un RVBA pour une illustration.
export function encodePalettePng(width, height, indices, palette, alphas = null) {
  const plte = Buffer.alloc(palette.length * 3);
  palette.forEach(([r, g, b], i) => { plte[i * 3] = r; plte[i * 3 + 1] = g; plte[i * 3 + 2] = b; });
  const chunks = [Buffer.from(SIGNATURE), chunk('IHDR', header(width, height, 3)), chunk('PLTE', plte)];
  if (alphas) chunks.push(chunk('tRNS', Buffer.from(alphas)));
  chunks.push(chunk('IDAT', zlib.deflateSync(rawRows(width, height, 1, indices), { level: 9 })));
  chunks.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(chunks);
}
