// Fait le portrait de dialogue d'un personnage à partir de son dessin en pied
// (un PNG sur fond transparent) : cadre le buste, du haut de la tête aux
// hanches, le réduit à la hauteur voulue et l'enregistre en PNG à palette
// (256 couleurs, fond transparent), quatre à huit fois plus léger qu'en RVBA.
// Le dessin en pied, lui, n'entre jamais dans le dépôt.
//
// Aucune dépendance (voir png.mjs). Un outil du poste, pas du jeu.
//
// Usage :
//   node outils/portrait.mjs dessin.png --sortie assets/portraits/ferrand.png
//     [--hauteur 560]   hauteur du portrait en pixels
//     [--cadrage 0.56]  part de la silhouette gardée depuis le haut (0,56 : jusqu'aux hanches)
//     [--marge 0.06]    marge autour, en part de la largeur du buste
//     [--couleurs 255]  couleurs de la palette (plus une entrée transparente)
//     [--fond 1b1a2e]   couleur sous les bords translucides, cuite dans le contour

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { decodePng, encodePalettePng } from './png.mjs';

const args = process.argv.slice(2);
const options = { sortie: '', hauteur: 560, cadrage: 0.56, marge: 0.06, couleurs: 255, fond: '1b1a2e' };
let input = '';
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    if (!(key in options)) fail(`Option inconnue : ${arg}`);
    options[key] = args[i + 1];
    i += 1;
  } else {
    input = arg;
  }
}
if (!input || !options.sortie) fail('Usage : node outils/portrait.mjs dessin.png --sortie assets/portraits/nom.png [...]');

const HEIGHT = Number(options.hauteur);
const FRAMING = Number(options.cadrage);
const MARGIN = Number(options.marge);
const COLORS = Math.min(255, Number(options.couleurs));
const BACKDROP = [0, 2, 4].map((i) => parseInt(options.fond.slice(i, i + 2), 16));

function fail(message) {
  console.error(message);
  process.exit(1);
}

// --- Cadrage -----------------------------------------------------------------

const image = decodePng(readFileSync(input));
const alphaAt = (x, y) => image.data[(y * image.width + x) * 4 + 3];

// Boîte de la silhouette entière.
let top = image.height;
let bottom = -1;
for (let y = 0; y < image.height; y += 1) {
  for (let x = 0; x < image.width; x += 1) {
    if (alphaAt(x, y) >= 128) {
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
}
if (bottom < 0) fail('Image vide.');
const figureHeight = bottom - top + 1;
const cropBottom = Math.min(image.height - 1, Math.round(top + figureHeight * FRAMING));
// Largeur du buste : les colonnes occupées entre le haut et le bas du cadre.
let left = image.width;
let right = -1;
for (let y = top; y <= cropBottom; y += 1) {
  for (let x = 0; x < image.width; x += 1) {
    if (alphaAt(x, y) >= 128) {
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
}
const bustWidth = right - left + 1;
const margin = Math.round(bustWidth * MARGIN);
const box = {
  x0: Math.max(0, left - margin),
  x1: Math.min(image.width - 1, right + margin),
  y0: Math.max(0, top - margin),
  y1: cropBottom,
};
console.log(`Silhouette ${figureHeight} px de haut ; buste ${box.x1 - box.x0 + 1} × ${box.y1 - box.y0 + 1} px.`);

// --- Réduction par moyenne de surface --------------------------------------

const scale = (box.y1 - box.y0 + 1) / HEIGHT;
const WIDTH = Math.round((box.x1 - box.x0 + 1) / scale);
const reduced = new Float32Array(WIDTH * HEIGHT * 4); // r, g, b prémultipliés, alpha
for (let ty = 0; ty < HEIGHT; ty += 1) {
  for (let tx = 0; tx < WIDTH; tx += 1) {
    const sx0 = box.x0 + tx * scale;
    const sx1 = sx0 + scale;
    const sy0 = box.y0 + ty * scale;
    const sy1 = sy0 + scale;
    let sumA = 0;
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let count = 0;
    for (let y = Math.floor(sy0); y < Math.ceil(sy1); y += 1) {
      for (let x = Math.floor(sx0); x < Math.ceil(sx1); x += 1) {
        if (y < 0 || x < 0 || y >= image.height || x >= image.width) continue;
        const w = (Math.min(x + 1, sx1) - Math.max(x, sx0)) * (Math.min(y + 1, sy1) - Math.max(y, sy0));
        if (w <= 0) continue;
        const o = (y * image.width + x) * 4;
        const a = (image.data[o + 3] / 255) * w;
        sumA += a;
        sumR += image.data[o] * a;
        sumG += image.data[o + 1] * a;
        sumB += image.data[o + 2] * a;
        count += w;
      }
    }
    const o = (ty * WIDTH + tx) * 4;
    const alpha = count ? sumA / count : 0;
    if (sumA > 0) {
      // Les bords translucides sont cuits sur la couleur de fond.
      reduced[o] = (sumR / sumA) * alpha + BACKDROP[0] * (1 - alpha);
      reduced[o + 1] = (sumG / sumA) * alpha + BACKDROP[1] * (1 - alpha);
      reduced[o + 2] = (sumB / sumA) * alpha + BACKDROP[2] * (1 - alpha);
    }
    reduced[o + 3] = alpha;
  }
}

// --- Palette : k-moyennes en RVB sur un échantillon ------------------------

const opaque = [];
for (let i = 0; i < WIDTH * HEIGHT; i += 1) if (reduced[i * 4 + 3] >= 0.5) opaque.push(i);
if (!opaque.length) fail('Aucun pixel opaque après cadrage.');
const sample = [];
const step = Math.max(1, Math.floor(opaque.length / 12000));
for (let k = 0; k < opaque.length; k += step) {
  const o = opaque[k] * 4;
  sample.push([reduced[o], reduced[o + 1], reduced[o + 2]]);
}
const distance2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
let centers = [sample[0]];
while (centers.length < Math.min(COLORS, sample.length)) {
  let total = 0;
  const weights = sample.map((p) => {
    let best = Infinity;
    for (const c of centers) best = Math.min(best, distance2(p, c));
    total += best;
    return best;
  });
  let pick = Math.random() * total;
  let index = 0;
  while (index < sample.length - 1 && (pick -= weights[index]) > 0) index += 1;
  centers.push(sample[index]);
}
for (let iteration = 0; iteration < 12; iteration += 1) {
  const sums = centers.map(() => [0, 0, 0, 0]);
  for (const p of sample) {
    let best = 0;
    let bestDistance = Infinity;
    centers.forEach((c, i) => {
      const d = distance2(p, c);
      if (d < bestDistance) { bestDistance = d; best = i; }
    });
    const s = sums[best];
    s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3] += 1;
  }
  centers = centers.map((c, i) => (sums[i][3] ? [sums[i][0] / sums[i][3], sums[i][1] / sums[i][3], sums[i][2] / sums[i][3]] : c));
}
const palette = [[0, 0, 0], ...centers.map((c) => c.map((v) => Math.max(0, Math.min(255, Math.round(v)))))];
const alphas = palette.map((_, i) => (i === 0 ? 0 : 255));

// --- Indices, avec une diffusion d'erreur légère (Floyd-Steinberg) ---------

const indices = new Uint8Array(WIDTH * HEIGHT);
const work = Float32Array.from(reduced);
const nearest = (r, g, b) => {
  let best = 1;
  let bestDistance = Infinity;
  for (let i = 1; i < palette.length; i += 1) {
    const c = palette[i];
    const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
    if (d < bestDistance) { bestDistance = d; best = i; }
  }
  return best;
};
for (let y = 0; y < HEIGHT; y += 1) {
  for (let x = 0; x < WIDTH; x += 1) {
    const o = (y * WIDTH + x) * 4;
    if (work[o + 3] < 0.5) { indices[y * WIDTH + x] = 0; continue; }
    const index = nearest(work[o], work[o + 1], work[o + 2]);
    indices[y * WIDTH + x] = index;
    const c = palette[index];
    const error = [work[o] - c[0], work[o + 1] - c[1], work[o + 2] - c[2]];
    const spread = (dx, dy, weight) => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= WIDTH || ny >= HEIGHT) return;
      const n = (ny * WIDTH + nx) * 4;
      if (work[n + 3] < 0.5) return;
      work[n] += error[0] * weight;
      work[n + 1] += error[1] * weight;
      work[n + 2] += error[2] * weight;
    };
    spread(1, 0, 7 / 16);
    spread(-1, 1, 3 / 16);
    spread(0, 1, 5 / 16);
    spread(1, 1, 1 / 16);
  }
}

mkdirSync(dirname(options.sortie), { recursive: true });
const png = encodePalettePng(WIDTH, HEIGHT, indices, palette, alphas);
writeFileSync(options.sortie, png);
console.log(`Portrait ${WIDTH} × ${HEIGHT}, ${palette.length - 1} couleurs, ${Math.round(png.length / 1024)} Ko : ${options.sortie}`);
