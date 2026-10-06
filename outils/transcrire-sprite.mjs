// Transcrit une fiche de personnage en pixel art (un PNG : trois silhouettes
// côte à côte, face, profil et dos, sur fond transparent) en grilles de
// caractères pour src/data/sprites/. Les couleurs de la fiche sont regroupées
// en une petite palette propre au sprite (du plus sombre au plus clair), et
// chaque pixel devient un index dans cette palette : le dessin reste du code
// lisible, retouchable à la main. La fiche elle-même n'entre jamais dans le
// dépôt.
//
// Aucune dépendance : le PNG est lu avec zlib de Node, et un aperçu PNG
// agrandi est écrit pour le contrôle à l'œil. Un outil du poste, pas du jeu.
//
// Usage :
//   node outils/transcrire-sprite.mjs fiche.png --nom heros
//     [--hauteur 56]          hauteur du personnage en pixels, pieds compris
//     [--cadre 48x72]         taille du cadre
//     [--pieds 69]            ligne du cadre où posent les pieds
//     [--vues face,profil,dos] ordre des silhouettes, de gauche à droite
//     [--decoupe 340,680]     colonnes de coupe, si les silhouettes se touchent
//     [--seuil 0.5]           couverture minimale pour qu'un pixel soit plein
//     [--noyau 0.6]           part centrale de la case lue pour sa couleur
//     [--couleurs 16]         nombre de couleurs de la palette
//     [--sortie src/data/sprites/heros.js]
//     [--apercu apercu.png]   aperçu agrandi : réduit en couleurs, puis en palette

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { decodePng, encodePng } from './png.mjs';

// --- Options ----------------------------------------------------------------

const args = process.argv.slice(2);
const options = { nom: '', hauteur: 56, cadre: '48x72', pieds: 69, vues: 'face,profil,dos', decoupe: '', seuil: 0.5, noyau: 0.6, couleurs: 16, sortie: '', apercu: '' };
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
if (!input || !options.nom) fail('Usage : node outils/transcrire-sprite.mjs fiche.png --nom heros [...]');

const HEIGHT = Number(options.hauteur);
const [FRAME_WIDTH, FRAME_HEIGHT] = options.cadre.split('x').map(Number);
const FEET_ROW = Number(options.pieds);
const VIEWS = options.vues.split(',').map((v) => v.trim()).filter(Boolean);
const THRESHOLD = Number(options.seuil);
const KERNEL = Number(options.noyau);
const COLORS = Number(options.couleurs);
const CUTS = options.decoupe ? options.decoupe.split(',').map(Number) : null;
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
if (COLORS > DIGITS.length) fail(`Au plus ${DIGITS.length} couleurs.`);

function fail(message) {
  console.error(message);
  process.exit(1);
}

// --- Couleurs ---------------------------------------------------------------

function toLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function toSrgb(v) {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.max(0, v) ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(c * 255)));
}

// Oklab : les distances y suivent l'œil bien mieux qu'en RVB.
function oklab(r, g, b) {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const hex = ([r, g, b]) => `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;

const distance2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;

// Regroupe les couleurs (en Oklab) en au plus COLORS groupes : k-moyennes avec
// un amorçage k-means++ ; les groupes trop proches sont fusionnés.
function cluster(points, count) {
  if (points.length === 0) return [];
  const centers = [points[0]];
  while (centers.length < Math.min(count, points.length)) {
    let total = 0;
    const weights = points.map((p) => {
      let best = Infinity;
      for (const c of centers) best = Math.min(best, distance2(p, c));
      total += best;
      return best;
    });
    let pick = Math.random() * total;
    let index = 0;
    while (index < points.length - 1 && (pick -= weights[index]) > 0) index += 1;
    centers.push(points[index]);
  }
  for (let iteration = 0; iteration < 30; iteration += 1) {
    const sums = centers.map(() => [0, 0, 0, 0]);
    for (const p of points) {
      let best = 0;
      let bestDistance = Infinity;
      centers.forEach((c, i) => {
        const d = distance2(p, c);
        if (d < bestDistance) { bestDistance = d; best = i; }
      });
      const s = sums[best];
      s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3] += 1;
    }
    let moved = 0;
    sums.forEach((s, i) => {
      if (!s[3]) return;
      const next = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
      moved += distance2(next, centers[i]);
      centers[i] = next;
    });
    if (moved < 1e-9) break;
  }
  // Fusion des presque doublons (écart Oklab < 0,03), tri du sombre au clair.
  const kept = [];
  for (const c of centers) {
    if (!kept.some((k) => distance2(k, c) < 0.03 ** 2)) kept.push(c);
  }
  return kept.sort((a, b) => a[0] - b[0]);
}

// --- Découpe des silhouettes ------------------------------------------------

// Les silhouettes sont séparées par des colonnes vides : on les cherche dans la
// projection de l'opacité sur les colonnes. --decoupe force les coupes.
function splitFigures(image) {
  const { width, height, data } = image;
  const columns = new Uint32Array(width);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) if (data[(y * width + x) * 4 + 3] >= 128) columns[x] += 1;
  }
  let ranges = [];
  if (CUTS) {
    const edges = [0, ...CUTS, width];
    for (let i = 0; i < edges.length - 1; i += 1) ranges.push([edges[i], edges[i + 1] - 1]);
  } else {
    const gapMin = Math.max(2, Math.round(width * 0.01));
    let start = -1;
    let last = -1;
    let gap = 0;
    for (let x = 0; x < width; x += 1) {
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
    // Les miettes (une plume détachée, une poussière) rejoignent la silhouette la plus proche.
    const minWidth = width * 0.04;
    const bodies = ranges.filter(([a, b]) => b - a + 1 >= minWidth);
    for (const crumb of ranges.filter(([a, b]) => b - a + 1 < minWidth)) {
      const center = (crumb[0] + crumb[1]) / 2;
      let nearestBody = null;
      let best = Infinity;
      for (const body of bodies) {
        const d = Math.min(Math.abs(center - body[0]), Math.abs(center - body[1]));
        if (d < best) { best = d; nearestBody = body; }
      }
      if (nearestBody) {
        nearestBody[0] = Math.min(nearestBody[0], crumb[0]);
        nearestBody[1] = Math.max(nearestBody[1], crumb[1]);
      }
    }
    ranges = bodies;
  }
  // Boîte de chaque silhouette.
  return ranges.map(([x0, x1]) => {
    let y0 = height;
    let y1 = -1;
    let left = width;
    let right = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        if (data[(y * width + x) * 4 + 3] >= 128) {
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

// --- Réduction ----------------------------------------------------------------

// Réduit la boîte à HEIGHT pixels de haut. La couverture d'une case est la part
// opaque de toute la case ; sa couleur est la moyenne (prémultipliée) de son
// noyau central seulement, pour ne pas mélanger les voisins.
function shrink(image, box) {
  const sourceHeight = box.y1 - box.y0 + 1;
  const sourceWidth = box.x1 - box.x0 + 1;
  const scale = sourceHeight / HEIGHT;
  const targetWidth = Math.max(1, Math.round(sourceWidth / scale));
  const inset = (scale * (1 - KERNEL)) / 2;
  const average = (sx0, sy0, sx1, sy1) => {
    let sumA = 0;
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let count = 0;
    for (let y = Math.floor(sy0); y < Math.ceil(sy1); y += 1) {
      for (let x = Math.floor(sx0); x < Math.ceil(sx1); x += 1) {
        if (y < 0 || x < 0 || y >= image.height || x >= image.width) continue;
        const wx = Math.min(x + 1, sx1) - Math.max(x, sx0);
        const wy = Math.min(y + 1, sy1) - Math.max(y, sy0);
        const w = wx * wy;
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
    return { coverage: count ? sumA / count : 0, rgb: sumA > 0 ? [sumR / sumA, sumG / sumA, sumB / sumA] : null };
  };
  const pixels = [];
  for (let ty = 0; ty < HEIGHT; ty += 1) {
    const row = [];
    for (let tx = 0; tx < targetWidth; tx += 1) {
      const sx0 = box.x0 + tx * scale;
      const sy0 = box.y0 + ty * scale;
      const whole = average(sx0, sy0, sx0 + scale, sy0 + scale);
      const core = average(sx0 + inset, sy0 + inset, sx0 + scale - inset, sy0 + scale - inset);
      row.push({ coverage: whole.coverage, rgb: core.rgb ?? whole.rgb });
    }
    pixels.push(row);
  }
  return { width: targetWidth, height: HEIGHT, pixels };
}

// Place la silhouette réduite dans le cadre : centrée, les pieds sur FEET_ROW.
// Renvoie une grille de couleurs (null : vide).
function toFrame(reduced) {
  const cells = Array.from({ length: FRAME_HEIGHT }, () => Array(FRAME_WIDTH).fill(null));
  const offsetX = Math.floor((FRAME_WIDTH - reduced.width) / 2);
  const offsetY = FEET_ROW - (reduced.height - 1);
  let clipped = 0;
  for (let y = 0; y < reduced.height; y += 1) {
    for (let x = 0; x < reduced.width; x += 1) {
      const pixel = reduced.pixels[y][x];
      if (pixel.coverage < THRESHOLD || !pixel.rgb) continue;
      const fx = x + offsetX;
      const fy = y + offsetY;
      if (fx < 0 || fy < 0 || fx >= FRAME_WIDTH || fy >= FRAME_HEIGHT) { clipped += 1; continue; }
      cells[fy][fx] = pixel.rgb;
    }
  }
  if (clipped) console.warn(`  ${clipped} pixel(s) hors du cadre : agrandir --cadre ou baisser --hauteur.`);
  return cells;
}

// --- Sortie -----------------------------------------------------------------

function moduleText(name, palette, grids) {
  const lines = [];
  lines.push('// Généré par outils/transcrire-sprite.mjs depuis une fiche dessinée, puis');
  lines.push('// retouché à la main. Chaque caractère des grilles est un index dans');
  lines.push('// « couleurs » (0 à 9 puis a à z, du plus sombre au plus clair), « . » un');
  lines.push('// pixel vide. « lumiere » : les index qui brillent même dans le noir.');
  lines.push('');
  lines.push(`export const ${name} = {`);
  lines.push(`  cadre: [${FRAME_WIDTH}, ${FRAME_HEIGHT}],`);
  lines.push(`  pieds: ${FEET_ROW},`);
  lines.push('  couleurs: [');
  palette.forEach((rgb, i) => lines.push(`    '${hex(rgb)}', // ${DIGITS[i]}`));
  lines.push('  ],');
  lines.push('  lumiere: [],');
  for (const [view, rows] of Object.entries(grids)) {
    lines.push(`  ${view}: [`);
    for (const row of rows) lines.push(`    '${row}',`);
    lines.push('  ],');
  }
  lines.push('};');
  lines.push('');
  return lines.join('\n');
}

// Aperçu : chaque vue en deux versions, la réduction en couleurs vraies et la
// version en palette, agrandies.
function preview(frames, palette, grids) {
  const SCALE = 6;
  const GAP = 8;
  const count = Object.keys(frames).length;
  const width = (FRAME_WIDTH * SCALE + GAP) * count + GAP;
  const height = (FRAME_HEIGHT * SCALE + GAP) * 2 + GAP;
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i += 1) { rgba[i * 4] = 40; rgba[i * 4 + 1] = 44; rgba[i * 4 + 2] = 52; rgba[i * 4 + 3] = 255; }
  Object.keys(frames).forEach((view, index) => {
    for (let pass = 0; pass < 2; pass += 1) {
      const ox = GAP + index * (FRAME_WIDTH * SCALE + GAP);
      const oy = GAP + pass * (FRAME_HEIGHT * SCALE + GAP);
      for (let y = 0; y < FRAME_HEIGHT; y += 1) {
        for (let x = 0; x < FRAME_WIDTH; x += 1) {
          const cell = frames[view][y][x];
          if (!cell) continue;
          const rgb = pass === 0 ? cell : palette[DIGITS.indexOf(grids[view][y][x])];
          for (let dy = 0; dy < SCALE; dy += 1) {
            for (let dx = 0; dx < SCALE; dx += 1) {
              const o = ((oy + y * SCALE + dy) * width + ox + x * SCALE + dx) * 4;
              rgba[o] = rgb[0]; rgba[o + 1] = rgb[1]; rgba[o + 2] = rgb[2]; rgba[o + 3] = 255;
            }
          }
        }
      }
    }
  });
  return encodePng(width, height, rgba);
}

// --- Programme --------------------------------------------------------------

const image = decodePng(readFileSync(input));
console.log(`Fiche ${image.width} × ${image.height}, sprite « ${options.nom} ».`);
const boxes = splitFigures(image);
console.log(`${boxes.length} silhouette(s) trouvée(s) :`);
boxes.forEach((b, i) => console.log(`  ${i}: x ${b.x0}-${b.x1}, y ${b.y0}-${b.y1} (${b.x1 - b.x0 + 1} × ${b.y1 - b.y0 + 1})`));
if (boxes.length < VIEWS.length) fail(`Il faut ${VIEWS.length} silhouettes (${VIEWS.join(', ')}) : utiliser --decoupe pour les séparer.`);

const frames = {};
VIEWS.forEach((view, i) => {
  const reduced = shrink(image, boxes[i]);
  frames[view] = toFrame(reduced);
  console.log(`  ${view} : ${reduced.width} × ${reduced.height} réduit.`);
});

// Une palette commune aux trois vues.
const points = [];
for (const cells of Object.values(frames)) for (const row of cells) for (const cell of row) if (cell) points.push(oklab(...cell));
const centers = cluster(points, COLORS);
const palette = centers.map(fromOklab);
console.log(`Palette : ${palette.length} couleurs (${palette.map(hex).join(' ')}).`);

const grids = {};
for (const [view, cells] of Object.entries(frames)) {
  grids[view] = cells.map((row) => row.map((cell) => {
    if (!cell) return '.';
    const lab = oklab(...cell);
    let best = 0;
    let bestDistance = Infinity;
    centers.forEach((c, i) => {
      const d = distance2(lab, c);
      if (d < bestDistance) { bestDistance = d; best = i; }
    });
    return DIGITS[best];
  }).join(''));
}

const exportName = options.nom.replace(/[^a-zA-Z0-9_]/g, '_');
if (options.sortie) {
  mkdirSync(dirname(options.sortie), { recursive: true });
  writeFileSync(options.sortie, moduleText(exportName, palette, grids));
  console.log(`Grilles écrites dans ${options.sortie}`);
} else {
  for (const [view, rows] of Object.entries(grids)) {
    console.log(`\n${view} :`);
    for (const row of rows) console.log(`  ${row}`);
  }
}
if (options.apercu) {
  mkdirSync(dirname(options.apercu), { recursive: true });
  writeFileSync(options.apercu, preview(frames, palette, grids));
  console.log(`Aperçu écrit dans ${options.apercu}`);
}
