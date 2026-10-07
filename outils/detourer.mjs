// Rend transparent le fond d'une image générée qui aurait dû l'être : un
// cadre d'interface dessiné sur un fond doré uni ou en dégradé. Le fond se
// reconnaît à sa couleur, lue sur la bordure de l'image, et se remplit depuis
// les bords : tout pixel voisin de même famille (teinte, saturation et
// valeur proches) part avec lui, jusqu'aux contours sombres du dessin, qui
// l'arrêtent. L'intérieur du cadre, séparé du fond par ses filets, reste.
// Aucune dépendance (png.mjs). Un outil du poste, pas du jeu.
//
// Usage :
//   node outils/detourer.mjs image.png --sortie assets/ui/cadre.png
//     [--teinte 12]     écart de teinte toléré, en degrés
//     [--ecart 0.28]    écart toléré de saturation et de valeur (0 à 1)
//     [--bord 12]       épaisseur de la bordure où lire la couleur du fond
//     [--rogner 1]      1 : rogne l'image aux pixels restants (une marge de --marge)
//     [--marge 2]       pixels transparents gardés autour, après rognage
//     [--creux 1]       1 : retire aussi les poches de fond enfermées dans la
//                       silhouette (entre un bâton et le corps), version 2.5

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { decodePng, encodePng } from './png.mjs';

const args = process.argv.slice(2);
const options = { sortie: '', teinte: 12, ecart: 0.28, bord: 12, rogner: 1, marge: 2 , creux: 0 };
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
if (!input || !options.sortie) fail('Usage : node outils/detourer.mjs image.png --sortie assets/ui/cadre.png [...]');

const HUE = Number(options.teinte);
const GAP = Number(options.ecart);
const BORDER = Number(options.bord);
const CROP = Number(options.rogner) === 1;
const MARGIN = Number(options.marge);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function hsv(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return { h: (h + 360) % 360, s: max ? d / max : 0, v: max / 255 };
}
const hueGap = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

const image = decodePng(readFileSync(input));
const { width, height, data } = image;
const pixel = (x, y) => {
  const o = (y * width + x) * 4;
  return hsv(data[o], data[o + 1], data[o + 2]);
};

// La couleur du fond : la médiane des pixels opaques de la bordure. Si la
// bordure est déjà transparente (un fond qui s'efface vers les bords), on lit
// les pixels opaques qui touchent cette zone transparente.
const alphaAt = (x, y) => data[(y * width + x) * 4 + 3];
const samples = [];
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    if (x >= BORDER && x < width - BORDER && y >= BORDER && y < height - BORDER) continue;
    if (alphaAt(x, y) < 128) continue;
    samples.push(pixel(x, y));
  }
}
if (!samples.length) {
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (alphaAt(x, y) < 128) continue;
      if (alphaAt(x - 1, y) < 8 || alphaAt(x + 1, y) < 8 || alphaAt(x, y - 1) < 8 || alphaAt(x, y + 1) < 8) samples.push(pixel(x, y));
    }
  }
  console.log('Bordure transparente : couleur du fond lue au bord de la zone transparente.');
}
if (!samples.length) fail('Aucun fond opaque trouvé : rien à détourer.');
const median = (key) => samples.map((p) => p[key]).sort((a, b) => a - b)[Math.floor(samples.length / 2)];
const background = { h: median('h'), s: median('s'), v: median('v') };
console.log(`Fond lu sur la bordure : teinte ${background.h.toFixed(0)}°, saturation ${background.s.toFixed(2)}, valeur ${background.v.toFixed(2)} (${samples.length} pixels).`);

// Un fond gris ou blanc n'a pas de teinte : il se reconnaît à sa faible
// saturation et à sa valeur.
const neutral = background.s < 0.12;
const isBackground = (x, y) => {
  const o = (y * width + x) * 4;
  if (data[o + 3] < 8) return true; // déjà transparent
  const p = pixel(x, y);
  if (neutral) return p.s <= 0.12 + GAP * 0.3 && Math.abs(p.v - background.v) <= GAP;
  return hueGap(p.h, background.h) <= HUE && Math.abs(p.s - background.s) <= GAP && Math.abs(p.v - background.v) <= GAP;
};

// Remplissage depuis les bords.
const removed = new Uint8Array(width * height);
const stack = [];
for (let x = 0; x < width; x += 1) stack.push([x, 0], [x, height - 1]);
for (let y = 0; y < height; y += 1) stack.push([0, y], [width - 1, y]);
let count = 0;
while (stack.length) {
  const [x, y] = stack.pop();
  if (x < 0 || y < 0 || x >= width || y >= height) continue;
  const i = y * width + x;
  if (removed[i] || !isBackground(x, y)) continue;
  removed[i] = 1;
  count += 1;
  stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}
console.log(`${count} pixels de fond retirés (${((100 * count) / (width * height)).toFixed(1)} %).`);
if (Number(options.creux) === 1) {
  let pockets = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      if (removed[i] || !isBackground(x, y)) continue;
      removed[i] = 1;
      pockets += 1;
    }
  }
  console.log(`${pockets} pixels de fond retirés dans les creux.`);
}

// Les pixels de bord qui restent, voisins du fond retiré, sont adoucis : leur
// opacité suit leur distance à la couleur du fond, pour un contour sans frange.
const out = new Uint8Array(data);
let left = width;
let right = -1;
let top = height;
let bottom = -1;
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const i = y * width + x;
    const o = i * 4;
    if (removed[i]) {
      out[o + 3] = 0;
      continue;
    }
    if (out[o + 3] < 8) continue;
    const touching = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < width && ny < height && removed[ny * width + nx];
    });
    if (touching) {
      const p = pixel(x, y);
      const hue = neutral ? 0 : hueGap(p.h, background.h) / (HUE * 2);
      const closeness = Math.max(0, 1 - Math.hypot(hue, (p.s - background.s) / (GAP * 2), (p.v - background.v) / (GAP * 2)));
      out[o + 3] = Math.round(out[o + 3] * (1 - closeness * 0.6));
    }
    if (x < left) left = x;
    if (x > right) right = x;
    if (y < top) top = y;
    if (y > bottom) bottom = y;
  }
}

let result;
if (CROP && right >= left) {
  const x0 = Math.max(0, left - MARGIN);
  const y0 = Math.max(0, top - MARGIN);
  const x1 = Math.min(width - 1, right + MARGIN);
  const y1 = Math.min(height - 1, bottom + MARGIN);
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const cropped = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y += 1) cropped.set(out.subarray(((y0 + y) * width + x0) * 4, ((y0 + y) * width + x1 + 1) * 4), y * w * 4);
  result = { width: w, height: h, data: cropped };
  console.log(`Rogné à ${w} × ${h}.`);
} else {
  result = { width, height, data: out };
}
mkdirSync(dirname(options.sortie), { recursive: true });
const png = encodePng(result.width, result.height, result.data);
writeFileSync(options.sortie, png);
console.log(`Écrit : ${options.sortie} (${Math.round(png.length / 1024)} Ko).`);
