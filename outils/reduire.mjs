// Réduit une image générée (la carte illustrée du village, version 2.3) à
// une largeur donnée, par moyenne de surface, puis en PNG à palette de 255
// couleurs (coupe médiane, puis une légère diffusion d'erreur) : la page ne
// charge pas dix mégaoctets pour une carte. Aucune dépendance (png.mjs). Un
// outil du poste, pas du jeu.
//
// Usage :
//   node outils/reduire.mjs image.png --sortie assets/ui/carte.png [--largeur 1120] [--couleurs 255]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { decodePng, encodePalettePng } from './png.mjs';

const args = process.argv.slice(2);
const options = { sortie: '', largeur: 1120, couleurs: 255 };
let input = '';
for (let i = 0; i < args.length; i += 1) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2);
    if (!(key in options)) throw new Error(`Option inconnue : ${args[i]}`);
    options[key] = args[i + 1];
    i += 1;
  } else input = args[i];
}
if (!input || !options.sortie) throw new Error('Usage : node outils/reduire.mjs image.png --sortie assets/ui/carte.png [...]');

const source = decodePng(readFileSync(input));
const width = Number(options.largeur);
const height = Math.round((source.height * width) / source.width);
const COLORS = Number(options.couleurs);

// --- Réduction par moyenne de surface -----------------------------------------
const rgb = new Float32Array(width * height * 3);
const sx = source.width / width;
const sy = source.height / height;
for (let y = 0; y < height; y += 1) {
  const y0 = Math.floor(y * sy);
  const y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
  for (let x = 0; x < width; x += 1) {
    const x0 = Math.floor(x * sx);
    const x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let yy = y0; yy < y1; yy += 1) {
      for (let xx = x0; xx < x1; xx += 1) {
        const i = (yy * source.width + xx) * 4;
        r += source.data[i];
        g += source.data[i + 1];
        b += source.data[i + 2];
        n += 1;
      }
    }
    const o = (y * width + x) * 3;
    rgb[o] = r / n;
    rgb[o + 1] = g / n;
    rgb[o + 2] = b / n;
  }
}

// --- Palette par coupe médiane ---------------------------------------------------
const pixels = [];
for (let i = 0; i < width * height; i += 1) pixels.push([rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]]);
function split(box) {
  const ranges = [0, 1, 2].map((c) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of box) {
      if (p[c] < lo) lo = p[c];
      if (p[c] > hi) hi = p[c];
    }
    return hi - lo;
  });
  const axis = ranges.indexOf(Math.max(...ranges));
  box.sort((a, b) => a[axis] - b[axis]);
  const mid = box.length >> 1;
  return [box.slice(0, mid), box.slice(mid)];
}
let boxes = [pixels];
while (boxes.length < COLORS) {
  boxes.sort((a, b) => b.length - a.length);
  const biggest = boxes.shift();
  if (biggest.length < 2) {
    boxes.push(biggest);
    break;
  }
  boxes.push(...split(biggest));
}
const palette = boxes.map((box) => {
  const sum = [0, 0, 0];
  for (const p of box) {
    sum[0] += p[0];
    sum[1] += p[1];
    sum[2] += p[2];
  }
  return sum.map((v) => Math.round(v / box.length));
});
const nearest = (r, g, b) => {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < palette.length; i += 1) {
    const [pr, pg, pb] = palette[i];
    const d = (pr - r) ** 2 + (pg - g) ** 2 + (pb - b) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  return best;
};

// --- Indexation avec une diffusion d'erreur légère (Floyd-Steinberg à moitié) ---
const indices = new Uint8Array(width * height);
const work = Float32Array.from(rgb);
const spread = (x, y, dr, dg, db, part) => {
  if (x < 0 || x >= width || y >= height) return;
  const o = (y * width + x) * 3;
  work[o] += dr * part;
  work[o + 1] += dg * part;
  work[o + 2] += db * part;
};
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const o = (y * width + x) * 3;
    const r = work[o];
    const g = work[o + 1];
    const b = work[o + 2];
    const index = nearest(r, g, b);
    indices[y * width + x] = index;
    const [pr, pg, pb] = palette[index];
    const dr = (r - pr) * 0.5;
    const dg = (g - pg) * 0.5;
    const db = (b - pb) * 0.5;
    spread(x + 1, y, dr, dg, db, 7 / 16);
    spread(x - 1, y + 1, dr, dg, db, 3 / 16);
    spread(x, y + 1, dr, dg, db, 5 / 16);
    spread(x + 1, y + 1, dr, dg, db, 1 / 16);
  }
}

mkdirSync(dirname(options.sortie), { recursive: true });
const bytes = encodePalettePng(width, height, indices, palette);
writeFileSync(options.sortie, bytes);
console.log(`Écrit : ${options.sortie} (${width} × ${height}, ${palette.length} couleurs, ${Math.round(bytes.length / 1024)} Ko)`);
