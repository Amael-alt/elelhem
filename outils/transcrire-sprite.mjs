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
//     [--couleurs 16]         nombre de couleurs de la palette (avec --reference :
//                             nombre de tons ajoutés pour les matières nouvelles)
//     [--sortie src/data/sprites/heros.js]
//     [--apercu apercu.png]   aperçu agrandi : réduit en couleurs, puis en palette
//
// Poses d'un personnage déjà transcrit (les coups d'épée du héros) : la fiche
// reprend sa palette et se cale sur lui, pour que la tête garde sa taille et
// sa place d'une pose à l'autre.
//     --reference src/data/sprites/heros.js [--export heros]
//                             module du sprite de référence : sa palette est
//                             reprise telle quelle (mêmes index), seules les
//                             couleurs nouvelles (l'acier d'une lame) s'ajoutent
//     [--repere 479b]         index de palette d'une matière repère (le chapeau) :
//                             l'échelle de chaque vue vient de la largeur de cette
//                             matière dans la fiche et dans la grille de référence,
//                             plus de --hauteur
//     [--ancre repere]        « repere » : le centre du repère est posé à la
//                             colonne qu'il occupe dans la référence (décalée si le
//                             cadre est plus large) ; « boite » (défaut) : la
//                             silhouette est centrée dans le cadre
//     [--fiche-reference ref.png] la fiche d'où vient la référence : le repère y
//                             est mesuré de la même façon que dans la nouvelle
//                             fiche, et l'échelle de chaque vue en découle
//                             (hauteur de la silhouette de référence / --hauteur,
//                             corrigée du rapport des deux repères). Plus juste
//                             que la grille, où une mèche coupe parfois le chapeau.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { decodePng, encodePng } from './png.mjs';

// --- Options ----------------------------------------------------------------

const args = process.argv.slice(2);
const options = {
  nom: '', hauteur: 56, cadre: '48x72', pieds: 69, vues: 'face,profil,dos', decoupe: '', seuil: 0.5, noyau: 0.6, couleurs: 16, sortie: '', apercu: '',
  reference: '', export: '', repere: '', ancre: 'boite', 'fiche-reference': '', echelles: '', hauteurs: '', 'repere-part': '0.6', decalages: '',
};
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
const ANCHOR = options.ancre;
// --echelles face=10.5,profil=10.5 : une échelle imposée pour ces vues (pixels
// de la fiche par pixel du sprite), quand le repère y trompe (des bras levés
// devant le chapeau, un chapeau vu de biais dans une fente).
const perView = (text) => Object.fromEntries(text.split(',').filter(Boolean).map((pair) => {
  const [view, value] = pair.split('=');
  return [view.trim(), Number(value)];
}));
const FORCED_SCALES = perView(options.echelles);
// --hauteurs face=47,profil=46,dos=46 : la hauteur voulue de chaque vue, en
// pixels du sprite, quand on la connaît d'une autre transcription (la même
// pose du héros, pour une tenue) : l'échelle en découle, sans repère.
const FORCED_HEIGHTS = perView(options.hauteurs);
// --decalages face=2,profil=-1 : un décalage horizontal de plus, en pixels
// du sprite, par vue.
const SHIFTS = perView(options.decalages);
if (!['boite', 'repere'].includes(ANCHOR)) fail('--ancre vaut « boite » ou « repere ».');
if (ANCHOR === 'repere' && !options.repere) fail('--ancre repere demande --repere.');
if (options.repere && !options.reference) fail('--repere demande --reference.');
// Les tons de la fiche assez proches d'une couleur de la référence (écart
// Oklab) lui sont attribués ; au-delà, c'est une matière nouvelle.
const NEW_COLOR_GAP = 0.07;
// Le repère se cherche dans le haut de la silhouette (le chapeau, pas
// l'écharpe) : cette part de sa hauteur, réglable (--repere-part) quand la
// même matière habille aussi le corps (une cape rouge sous un chapeau rouge).
const LANDMARK_SHARE = Number(options['repere-part']);

function fail(message) {
  console.error(message);
  process.exit(1);
}

// --- Référence ---------------------------------------------------------------

// Le sprite de référence : sa palette, et pour chaque vue la largeur et le
// centre de la matière repère dans sa grille.
async function loadReference() {
  if (!options.reference) return null;
  const module = await import(pathToFileURL(resolve(options.reference)).href);
  const name = options.export || Object.keys(module)[0];
  const data = module[name];
  if (!data) fail(`Export « ${name} » introuvable dans ${options.reference}.`);
  const palette = data.couleurs.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  // Le repère : des index de la palette (« 479b »), ou des couleurs en hexa
  // séparées par des virgules (« 661112,cf2726 »), chacune ramenée à l'index
  // le plus proche de la palette de référence.
  const tokens = options.repere.includes(',') || /^[0-9a-f]{6}$/i.test(options.repere) ? options.repere.split(',').filter(Boolean) : options.repere.split('');
  const marks = new Set();
  const markColors = [];
  for (const token of tokens) {
    if (/^[0-9a-f]{6}$/i.test(token)) {
      const rgb = [0, 2, 4].map((i) => parseInt(token.slice(i, i + 2), 16));
      markColors.push(rgb);
      const lab = oklab(...rgb);
      let best = 0;
      let bestDistance = Infinity;
      palette.forEach((c, i) => {
        const d = distance2(oklab(...c), lab);
        if (d < bestDistance) { bestDistance = d; best = i; }
      });
      marks.add(DIGITS[best]);
    } else {
      marks.add(token);
      if (palette[DIGITS.indexOf(token)]) markColors.push(palette[DIGITS.indexOf(token)]);
    }
  }
  const landmarks = {};
  for (const view of VIEWS) {
    const rows = data[view];
    if (!rows) continue;
    const filled = rows.map((row, y) => (/[^.]/.test(row) ? y : -1)).filter((y) => y >= 0);
    if (!filled.length) continue;
    const top = filled[0];
    const bottom = filled[filled.length - 1];
    const limit = top + (bottom - top) * LANDMARK_SHARE;
    let best = { width: 0, center: 0 };
    rows.forEach((row, y) => {
      if (y > limit) return;
      const hits = [];
      for (let x = 0; x < row.length; x += 1) if (marks.has(row[x])) hits.push(x);
      const span = widestSpan(hits);
      if (span.width > best.width) best = span;
    });
    landmarks[view] = best;
  }
  return { name, palette, frameWidth: data.cadre[0], landmarks, marks, markColors };
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
// projection de l'opacité sur les colonnes. --decoupe force les coupes (cuts :
// les colonnes de coupe, null pour la recherche automatique).
function splitFigures(image, cuts = CUTS) {
  const { width, height, data } = image;
  const columns = new Uint32Array(width);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) if (data[(y * width + x) * 4 + 3] >= 128) columns[x] += 1;
  }
  let ranges = [];
  if (cuts) {
    const edges = [0, ...cuts, width];
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

// Teinte, saturation et valeur (0 à 360, 0 à 1, 0 à 1) : la matière repère se
// reconnaît à sa teinte, plus tolérante que la distance à la palette (le
// dessinateur éclaircit ou assombrit le chapeau d'une fiche à l'autre).
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
const LANDMARK_HUE = 14; // degrés de teinte autour des couleurs du repère

// La matière repère dans une silhouette de la fiche : largeur et centre (en
// pixels de la fiche) de sa plus longue ligne, dans le haut de la boîte.
function findLandmark(image, box, reference) {
  const marks = reference.markColors.map((rgb) => hsv(...rgb));
  if (!marks.length) return { width: 0, center: 0 };
  const satMin = Math.min(...marks.map((m) => m.s)) * 0.6;
  const valMin = Math.min(...marks.map((m) => m.v)) * 0.6;
  const limit = box.y0 + (box.y1 - box.y0) * LANDMARK_SHARE;
  let best = { width: 0, center: 0 };
  for (let y = box.y0; y <= limit; y += 1) {
    const hits = [];
    for (let x = box.x0; x <= box.x1; x += 1) {
      const o = (y * image.width + x) * 4;
      if (image.data[o + 3] < 128) continue;
      const px = hsv(image.data[o], image.data[o + 1], image.data[o + 2]);
      if (px.s >= satMin && px.v >= valMin && marks.some((m) => hueGap(m.h, px.h) <= LANDMARK_HUE)) hits.push(x);
    }
    const span = widestSpan(hits);
    if (span.width > best.width) best = span;
  }
  return best;
}

// L'envergure d'une ligne de repère : du premier au dernier pixel de la
// matière, pourvu qu'elle en fasse au moins la moitié (la plume ou une main
// qui coupe le bord du chapeau ne raccourcit pas la mesure). hits : colonnes
// des pixels de la matière, croissantes.
function widestSpan(hits) {
  if (!hits.length) return { width: 0, center: 0 };
  const first = hits[0];
  const last = hits[hits.length - 1];
  const width = last - first + 1;
  if (hits.length < width * 0.5) return { width: 0, center: 0 };
  return { width, center: (first + last + 1) / 2 };
}

// Réduit la boîte : à HEIGHT pixels de haut, ou selon une échelle donnée
// (pixels de la fiche par pixel du sprite). La couverture d'une case est la
// part opaque de toute la case ; sa couleur est la moyenne (prémultipliée) de
// son noyau central seulement, pour ne pas mélanger les voisins.
function shrink(image, box, forcedScale = null) {
  const sourceHeight = box.y1 - box.y0 + 1;
  const sourceWidth = box.x1 - box.x0 + 1;
  const scale = forcedScale ?? sourceHeight / HEIGHT;
  const height = Math.max(1, Math.round(sourceHeight / scale));
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
  for (let ty = 0; ty < height; ty += 1) {
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
  return { width: targetWidth, height, pixels, scale };
}

// Place la silhouette réduite dans le cadre, les pieds sur FEET_ROW : centrée,
// ou (anchorX donné) de sorte que la colonne anchorX de la silhouette réduite
// tombe sur la colonne targetX du cadre. Renvoie une grille de couleurs
// (null : vide).
function toFrame(reduced, anchor = null) {
  const cells = Array.from({ length: FRAME_HEIGHT }, () => Array(FRAME_WIDTH).fill(null));
  const offsetX = anchor ? Math.round(anchor.targetX - anchor.anchorX) : Math.floor((FRAME_WIDTH - reduced.width) / 2);
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

function moduleText(name, palette, grids, reference) {
  const lines = [];
  lines.push('// Généré par outils/transcrire-sprite.mjs depuis une fiche dessinée, puis');
  lines.push('// retouché à la main. Chaque caractère des grilles est un index dans');
  if (reference) {
    lines.push(`// « couleurs » : la palette de ${reference.name}, complétée en fin de liste par`);
    lines.push('// les matières propres à cette pose. « . » : un pixel vide.');
  } else {
    lines.push('// « couleurs » (0 à 9 puis a à z, du plus sombre au plus clair), « . » un');
    lines.push('// pixel vide. « lumiere » : les index qui brillent même dans le noir.');
  }
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

const reference = await loadReference();
// La fiche de référence, s'il y en a une : par vue, l'échelle de sa silhouette
// (pixels de fiche par pixel de sprite, à --hauteur) et la largeur de son repère.
const referenceSheet = {};
if (options['fiche-reference']) {
  if (!reference || !options.repere) fail('--fiche-reference demande --reference et --repere.');
  const refImage = decodePng(readFileSync(options['fiche-reference']));
  const savedCuts = CUTS;
  const refBoxes = splitFigures(refImage, null);
  if (refBoxes.length < VIEWS.length) fail(`La fiche de référence n'a que ${refBoxes.length} silhouette(s).`);
  VIEWS.forEach((view, i) => {
    const box = refBoxes[i];
    const mark = findLandmark(refImage, box, reference);
    referenceSheet[view] = { scale: (box.y1 - box.y0 + 1) / HEIGHT, mark: mark.width };
    console.log(`  référence ${view} : ${box.y1 - box.y0 + 1} px de haut, repère ${mark.width} px.`);
  });
  void savedCuts;
}
const frames = {};
VIEWS.forEach((view, i) => {
  const box = boxes[i];
  // Avec un repère : l'échelle de la vue vient de la largeur du repère, ici et
  // dans la référence (sa fiche, sinon sa grille) ; l'ancre, de son centre.
  let scale = null;
  let anchor = null;
  if (reference && options.repere) {
    const mark = findLandmark(image, box, reference);
    const ref = reference.landmarks[view];
    const sheet = referenceSheet[view];
    const found = mark.width > 0 && ref?.width > 0;
    if (FORCED_SCALES[view]) scale = FORCED_SCALES[view];
    else if (FORCED_HEIGHTS[view]) scale = (box.y1 - box.y0 + 1) / FORCED_HEIGHTS[view];
    else if (found) scale = sheet ? sheet.scale * (mark.width / sheet.mark) : mark.width / ref.width;
    else fail(`  ${view} : repère introuvable (fiche ${mark.width} px, référence ${ref?.width ?? 0} px) ; donner --hauteurs ou --echelles pour cette vue.`);
    // L'ancre : le centre du repère, à sa colonne de référence ; sans repère
    // trouvé, la silhouette est centrée, avec un avertissement.
    if (ANCHOR === 'repere' && found) {
      anchor = { anchorX: (mark.center - box.x0) / scale, targetX: ref.center + (FRAME_WIDTH - reference.frameWidth) / 2 + (SHIFTS[view] ?? 0) };
    } else if (ANCHOR === 'repere') {
      console.warn(`  ${view} : repère introuvable, silhouette centrée (ajuster avec --decalages).`);
    }
    console.log(`  ${view} : repère ${mark.width} px dans la fiche, ${sheet ? `${sheet.mark} px dans la fiche de référence` : `${ref?.width ?? 0} px dans la grille`}, échelle ${scale.toFixed(2)}${FORCED_HEIGHTS[view] ? ` (hauteur imposée ${FORCED_HEIGHTS[view]})` : ''}.`);
  }
  const reduced = shrink(image, box, scale);
  if (!anchor && SHIFTS[view]) anchor = { anchorX: reduced.width / 2, targetX: FRAME_WIDTH / 2 + SHIFTS[view] };
  frames[view] = toFrame(reduced, anchor);
  console.log(`  ${view} : ${reduced.width} × ${reduced.height} réduit.`);
});

// Une palette commune aux trois vues. Avec une référence : sa palette d'abord,
// aux mêmes index, puis les tons que la fiche apporte (une lame d'acier).
const points = [];
for (const cells of Object.values(frames)) for (const row of cells) for (const cell of row) if (cell) points.push(oklab(...cell));
let centers;
if (reference) {
  const base = reference.palette.map((rgb) => oklab(...rgb));
  const fresh = points.filter((p) => !base.some((c) => distance2(p, c) < NEW_COLOR_GAP ** 2));
  const extra = COLORS > 0 && fresh.length ? cluster(fresh, COLORS) : [];
  centers = [...base, ...extra];
  if (centers.length > DIGITS.length) fail(`Palette trop longue : ${centers.length} couleurs, au plus ${DIGITS.length}.`);
  console.log(`Palette : ${base.length} couleurs de ${reference.name}, ${extra.length} ajoutée(s) pour ${fresh.length} pixel(s) nouveaux.`);
} else {
  centers = cluster(points, COLORS);
}
// La palette de référence est recopiée telle quelle (pas de passage par Oklab).
const palette = centers.map((c, i) => (reference && i < reference.palette.length ? reference.palette[i] : fromOklab(c)));
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
  writeFileSync(options.sortie, moduleText(exportName, palette, grids, reference));
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
