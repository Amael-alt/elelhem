// Découpe une image à fond transparent en plusieurs images : chaque sujet
// séparé des autres par des colonnes vides (une ligne d'icônes, des ornements)
// devient un PNG rogné à ses bords, réduit si on le demande. Sert aux éléments
// d'interface dessinés d'un coup (assets/ui/). Aucune dépendance (png.mjs).
//
// Usage :
//   node outils/decouper.mjs planche.png --noms parchemin,token,epee,livre --dossier assets/ui
//     [--hauteur 128]   hauteur de chaque image, en pixels (0 : taille d'origine)
//     [--marge 4]       pixels transparents gardés autour du sujet, après réduction
//     [--seuil 24]      opacité minimale (0 à 255) pour qu'un pixel compte comme plein
//     [--halo 0]        1 : garde les pixels translucides tels quels ; 0 : les bords
//                       translucides au-dessous du seuil deviennent transparents
//     [--decoupe 300,700] colonnes de coupe, si les sujets se touchent

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { decodePng, encodePng } from './png.mjs';

const args = process.argv.slice(2);
const options = { noms: '', dossier: 'assets/ui', hauteur: 0, marge: 4, seuil: 24, halo: 0, decoupe: '' };
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
if (!input || !options.noms) fail('Usage : node outils/decouper.mjs planche.png --noms a,b,c --dossier assets/ui [...]');

const NAMES = options.noms.split(',').map((n) => n.trim()).filter(Boolean);
const HEIGHT = Number(options.hauteur);
const MARGIN = Number(options.marge);
const THRESHOLD = Number(options.seuil);
const KEEP_HALO = Number(options.halo) === 1;
const CUTS = options.decoupe ? options.decoupe.split(',').map(Number) : null;

function fail(message) {
  console.error(message);
  process.exit(1);
}

const image = decodePng(readFileSync(input));
const alphaAt = (x, y) => image.data[(y * image.width + x) * 4 + 3];

// --- Découpe par les colonnes vides ----------------------------------------

function splitSubjects() {
  const columns = new Uint32Array(image.width);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) if (alphaAt(x, y) >= THRESHOLD) columns[x] += 1;
  }
  let ranges = [];
  if (CUTS) {
    const edges = [0, ...CUTS, image.width];
    for (let i = 0; i < edges.length - 1; i += 1) ranges.push([edges[i], edges[i + 1] - 1]);
  } else {
    const gapMin = Math.max(2, Math.round(image.width * 0.01));
    let start = -1;
    let last = -1;
    let gap = 0;
    for (let x = 0; x < image.width; x += 1) {
      if (columns[x] > 0) {
        if (start < 0) start = x;
        last = x;
        gap = 0;
      } else if (start >= 0) {
        gap += 1;
        if (gap >= gapMin) {
          ranges.push([start, last]);
          start = -1;
        }
      }
    }
    if (start >= 0) ranges.push([start, last]);
    const minWidth = image.width * 0.03;
    const bodies = ranges.filter(([a, b]) => b - a + 1 >= minWidth);
    for (const crumb of ranges.filter(([a, b]) => b - a + 1 < minWidth)) {
      const center = (crumb[0] + crumb[1]) / 2;
      let nearest = null;
      let best = Infinity;
      for (const body of bodies) {
        const d = Math.min(Math.abs(center - body[0]), Math.abs(center - body[1]));
        if (d < best) { best = d; nearest = body; }
      }
      if (nearest) {
        nearest[0] = Math.min(nearest[0], crumb[0]);
        nearest[1] = Math.max(nearest[1], crumb[1]);
      }
    }
    ranges = bodies;
  }
  return ranges.map(([x0, x1]) => {
    let y0 = image.height;
    let y1 = -1;
    let left = image.width;
    let right = -1;
    for (let y = 0; y < image.height; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        if (alphaAt(x, y) >= THRESHOLD) {
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
          if (x < left) left = x;
          if (x > right) right = x;
        }
      }
    }
    return { x0: left, x1: right, y0, y1 };
  });
}

// --- Réduction par moyenne de surface, alpha prémultiplié ------------------

function shrink(box, targetHeight) {
  const sourceWidth = box.x1 - box.x0 + 1;
  const sourceHeight = box.y1 - box.y0 + 1;
  const scale = targetHeight ? sourceHeight / targetHeight : 1;
  const width = Math.max(1, Math.round(sourceWidth / scale));
  const height = targetHeight || sourceHeight;
  const out = new Uint8Array((width + 2 * MARGIN) * (height + 2 * MARGIN) * 4);
  const outWidth = width + 2 * MARGIN;
  for (let ty = 0; ty < height; ty += 1) {
    for (let tx = 0; tx < width; tx += 1) {
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
          let a = image.data[o + 3];
          if (!KEEP_HALO && a < THRESHOLD) a = 0;
          const wa = (a / 255) * w;
          sumA += wa;
          sumR += image.data[o] * wa;
          sumG += image.data[o + 1] * wa;
          sumB += image.data[o + 2] * wa;
          count += w;
        }
      }
      const o = ((ty + MARGIN) * outWidth + tx + MARGIN) * 4;
      if (sumA > 0) {
        out[o] = Math.round(sumR / sumA);
        out[o + 1] = Math.round(sumG / sumA);
        out[o + 2] = Math.round(sumB / sumA);
        out[o + 3] = Math.round((255 * sumA) / count);
      }
    }
  }
  return { width: outWidth, height: height + 2 * MARGIN, data: out };
}

const boxes = splitSubjects();
console.log(`${boxes.length} sujet(s) trouvé(s) pour ${NAMES.length} nom(s).`);
if (boxes.length < NAMES.length) fail('Pas assez de sujets : utiliser --decoupe pour les séparer.');
mkdirSync(options.dossier, { recursive: true });
NAMES.forEach((name, i) => {
  const result = shrink(boxes[i], HEIGHT);
  const png = encodePng(result.width, result.height, result.data);
  const path = join(options.dossier, `${name}.png`);
  writeFileSync(path, png);
  console.log(`  ${name} : ${result.width} × ${result.height}, ${Math.round(png.length / 1024)} Ko (${path})`);
});
