// Le curseur du jeu (version 2.8, refait en 2.9) : un gantelet d'acier qui
// pointe, dans l'esprit des grands jeux de rôle en ligne. Le dessin vient du
// générateur d'images (gantelet de plates vu de dos, index tendu vers le haut
// à gauche, fond vert uni), détouré par detourer.mjs ; ce script en fait les
// fichiers que la page charge : il retire le voile vert des bords, réduit le
// dessin par moyenne de surface en 32 px (assets/ui/curseur.png) et 64 px
// (curseur-2x.png, écrans à haute densité), ajoute une ombre portée douce,
// repère le bout de l'index (le point chaud, à recopier dans styles.css), et
// écrit la variante des boutons et des liens, un éclat d'or dessiné en
// vectoriel à côté du doigt (curseur-actif.png, curseur-actif-2x.png).
// Aucune dépendance (png.mjs).
// Usage : node outils/curseur.mjs gantelet-detoure.png [--apercu dossier]
//   (--apercu écrit des agrandissements, nullement chargés par le jeu, pour
//   le contrôle à l'œil.)

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { decodePng, encodePng } from './png.mjs';

// --- Réglages -------------------------------------------------------------

const SIZE = 32; // côté du curseur, en pixels CSS
const MARGIN = 1; // pixels CSS libres en haut et à gauche (le bout de l'index y touche presque)
const SHADOW_ROOM = 2; // pixels CSS gardés en bas et à droite pour l'ombre
const SHADOW_OFFSET = [1, 1]; // en pixels CSS
const SHADOW_BLUR = 1; // rayon du flou de l'ombre, en pixels CSS
const SHADOW_ALPHA = 0.55;
const SPILL = 18; // au-delà de cet excès de vert sur rouge et bleu, le pixel est « dévoilé »

const OUTLINE = [22, 18, 16];
const WHITE = [255, 255, 255];
const GOLD = { hi: [255, 247, 200], mid: [242, 198, 76], lo: [172, 108, 20] };
const LIGHT = normalize([-0.55, -0.83]);

// L'éclat d'or de la variante active : deux étoiles en haut à droite du doigt,
// dans le vide, en pixels CSS.
const SPARK = [
  { poly: star(22.5, 3.6, 3.3, 1.05), tone: GOLD, bevel: 0.6, spec: [[22.5, 3.6, 1.1, 0.9]] },
  { poly: star(27.6, 8.0, 1.6, 0.6), tone: GOLD, bevel: 0.4 },
];
const SHARPEN = 0.35; // netteté rendue après la réduction (masque flou), 0 pour aucune

// --- Lecture des arguments -------------------------------------------------

const args = process.argv.slice(2);
let input = '';
let apercuDir = null;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--apercu') { apercuDir = args[i + 1]; i += 1; } else input = args[i];
}
if (!input) {
  console.error('Usage : node outils/curseur.mjs gantelet-detoure.png [--apercu dossier]');
  process.exit(1);
}

// --- Petite géométrie, pour l'éclat ---------------------------------------

function normalize([x, y]) {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}

function star(cx, cy, outer, inner) {
  const pts = [];
  for (let k = 0; k < 8; k += 1) {
    const a = -Math.PI / 2 + (Math.PI / 4) * k;
    const r = k % 2 === 0 ? outer : inner;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

// Distance signée d'un point à un polygone (négative dedans) et normale sortante.
function polygonSdf(poly, px, py) {
  let best = Infinity;
  let nx = 0;
  let ny = 0;
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i, i += 1) {
    const [ax, ay] = poly[j];
    const [bx, by] = poly[i];
    const ex = bx - ax;
    const ey = by - ay;
    const l2 = ex * ex + ey * ey || 1e-9;
    let t = ((px - ax) * ex + (py - ay) * ey) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = px - (ax + ex * t);
    const dy = py - (ay + ey * t);
    const d2 = dx * dx + dy * dy;
    if (d2 < best) { best = d2; nx = dx; ny = dy; }
    if ((ay > py) !== (by > py) && px < ax + ((py - ay) * ex) / (ey || 1e-9)) inside = !inside;
  }
  const d = Math.sqrt(best);
  const s = inside ? -1 : 1;
  return { d: s * d, nx: (s * nx) / (d || 1), ny: (s * ny) / (d || 1), inside };
}

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

// Couleur d'une étoile en un point : dégradé du centre, biseau éclairé, reflet.
function shadeStar(shape, px, py, sdf) {
  const { tone } = shape;
  const [cx, cy] = shape.center;
  const t = ((px - cx) + (py - cy)) / (shape.radius * 1.4) + 0.2;
  let color = t < 0 ? mix(tone.mid, tone.hi, clamp01(-t)) : mix(tone.mid, tone.lo, clamp01(t));
  const depth = -sdf.d;
  if (depth < shape.bevel) {
    const f = 1 - depth / shape.bevel;
    const facing = sdf.nx * LIGHT[0] + sdf.ny * LIGHT[1];
    color = facing > 0 ? mix(color, tone.hi, f * f * facing * 0.9) : mix(color, tone.lo, f * f * -facing * 0.8);
  }
  if (depth < 0.22) color = mix(color, OUTLINE, (1 - depth / 0.22) * 0.6);
  for (const [sx, sy, r, k] of shape.spec ?? []) {
    const g = Math.exp(-((px - sx) ** 2 + (py - sy) ** 2) / (2 * (r * 0.5) ** 2));
    color = mix(color, WHITE, g * k);
  }
  return color;
}

// Dessine l'éclat par-dessus une image de `size` pixels de côté (prémultipliée,
// Float32), avec un contour sombre et seize échantillons par pixel.
function drawSpark(img, size) {
  const k = size / SIZE;
  const shapes = SPARK.map((s) => {
    const xs = s.poly.map((p) => p[0]);
    const ys = s.poly.map((p) => p[1]);
    const center = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    return { ...s, center, radius: (Math.max(...xs) - Math.min(...xs)) / 2 };
  });
  const SS = 4;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const px = (x + (sx + 0.5) / SS) / k;
          const py = (y + (sy + 0.5) / SS) / k;
          let union = Infinity;
          let hit = null;
          for (const shape of shapes) {
            const sdf = polygonSdf(shape.poly, px, py);
            if (sdf.d < union) union = sdf.d;
            if (!hit && sdf.inside) hit = shadeStar(shape, px, py, sdf);
          }
          const color = hit ?? (union <= 0.45 ? OUTLINE : null);
          if (color) { r += color[0] / 255; g += color[1] / 255; b += color[2] / 255; a += 1; }
        }
      }
      if (a === 0) continue;
      const cov = a / (SS * SS);
      const at = (y * size + x) * 4;
      // L'éclat passe devant : composition « source over » en prémultiplié.
      img[at] = (r / (SS * SS)) + img[at] * (1 - cov);
      img[at + 1] = (g / (SS * SS)) + img[at + 1] * (1 - cov);
      img[at + 2] = (b / (SS * SS)) + img[at + 2] * (1 - cov);
      img[at + 3] = cov + img[at + 3] * (1 - cov);
    }
  }
}

// --- Le gantelet : voile vert, réduction, ombre -----------------------------

const source = decodePng(readFileSync(input));
const src = Float32Array.from(source.data, (v) => v / 255);

// Le voile vert : sur les bords détourés, le vert du fond déteint sur le
// contour. On ramène le vert au plus fort du rouge et du bleu.
for (let i = 0; i < src.length; i += 4) {
  if (src[i + 3] === 0) continue;
  const cap = Math.max(src[i], src[i + 2]) + SPILL / 255;
  if (src[i + 1] > cap) src[i + 1] = cap;
}

// Boîte des pixels opaques.
let x0 = source.width;
let y0 = source.height;
let x1 = -1;
let y1 = -1;
for (let y = 0; y < source.height; y += 1) {
  for (let x = 0; x < source.width; x += 1) {
    if (src[(y * source.width + x) * 4 + 3] > 0.02) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
}
const boxW = x1 - x0 + 1;
const boxH = y1 - y0 + 1;

// Réduit la boîte par moyenne de surface exacte (prémultipliée) en une image
// de `size` pixels de côté, le dessin calé en haut à gauche après la marge.
function reduce(size) {
  const k = size / SIZE;
  const inner = size - (MARGIN + SHADOW_ROOM) * k;
  const scale = inner / Math.max(boxW, boxH); // pixels de sortie par pixel source
  const img = new Float32Array(size * size * 4);
  const ox = MARGIN * k;
  const oy = MARGIN * k;
  for (let y = 0; y < size; y += 1) {
    const sy0 = y0 + (y - oy) / scale;
    const sy1 = y0 + (y + 1 - oy) / scale;
    if (sy1 <= y0 || sy0 >= y1 + 1) continue;
    for (let x = 0; x < size; x += 1) {
      const sx0 = x0 + (x - ox) / scale;
      const sx1 = x0 + (x + 1 - ox) / scale;
      if (sx1 <= x0 || sx0 >= x1 + 1) continue;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let w = 0;
      for (let sy = Math.max(Math.floor(sy0), 0); sy < Math.min(Math.ceil(sy1), source.height); sy += 1) {
        const wy = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
        for (let sx = Math.max(Math.floor(sx0), 0); sx < Math.min(Math.ceil(sx1), source.width); sx += 1) {
          const wx = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
          const weight = wx * wy;
          const at = (sy * source.width + sx) * 4;
          const alpha = src[at + 3];
          r += src[at] * alpha * weight;
          g += src[at + 1] * alpha * weight;
          b += src[at + 2] * alpha * weight;
          a += alpha * weight;
          w += weight;
        }
      }
      if (w === 0) continue;
      const at = (y * size + x) * 4;
      img[at] = r / w; img[at + 1] = g / w; img[at + 2] = b / w; img[at + 3] = a / w;
    }
  }
  return img;
}

// Un masque flou léger : la réduction par moyenne adoucit les plaques, on
// rend un peu de netteté à la couleur (pas à la couverture, qui resterait
// crénelée sinon).
function sharpen(img, size) {
  if (SHARPEN <= 0) return img;
  const out = Float32Array.from(img);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const at = (y * size + x) * 4;
      const a = img[at + 3];
      if (a <= 0) continue;
      for (let c = 0; c < 3; c += 1) {
        let sum = 0;
        let n = 0;
        for (let j = -1; j <= 1; j += 1) {
          for (let i = -1; i <= 1; i += 1) {
            const xx = x + i;
            const yy = y + j;
            if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
            const o = (yy * size + xx) * 4;
            if (img[o + 3] <= 0) continue;
            sum += img[o + c] / img[o + 3];
            n += 1;
          }
        }
        const value = img[at + c] / a;
        const blurred = n ? sum / n : value;
        out[at + c] = clamp01(value + SHARPEN * (value - blurred)) * a;
      }
    }
  }
  return out;
}

// L'ombre portée : la couverture décalée et floutée (flou en boîte, deux
// passes), posée sous le dessin.
function addShadow(img, size) {
  const k = size / SIZE;
  const radius = Math.round(SHADOW_BLUR * k);
  const dx = Math.round(SHADOW_OFFSET[0] * k);
  const dy = Math.round(SHADOW_OFFSET[1] * k);
  let mask = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sx = x - dx;
      const sy = y - dy;
      if (sx >= 0 && sy >= 0) mask[y * size + x] = img[(sy * size + sx) * 4 + 3];
    }
  }
  for (let pass = 0; pass < 2; pass += 1) {
    const next = new Float32Array(size * size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        let sum = 0;
        let n = 0;
        for (let j = -radius; j <= radius; j += 1) {
          for (let i = -radius; i <= radius; i += 1) {
            const xx = x + i;
            const yy = y + j;
            if (xx >= 0 && yy >= 0 && xx < size && yy < size) sum += mask[yy * size + xx];
            n += 1;
          }
        }
        next[y * size + x] = sum / n;
      }
    }
    mask = next;
  }
  const out = new Float32Array(img.length);
  for (let p = 0; p < size * size; p += 1) {
    const at = p * 4;
    const shadow = mask[p] * SHADOW_ALPHA;
    const a = img[at + 3];
    // Dessin devant, ombre noire derrière (prémultiplié : le noir n'ajoute rien à la couleur).
    out[at] = img[at];
    out[at + 1] = img[at + 1];
    out[at + 2] = img[at + 2];
    out[at + 3] = a + shadow * (1 - a);
  }
  return out;
}

function toBytes(img, size) {
  const rgba = new Uint8Array(size * size * 4);
  for (let p = 0; p < size * size; p += 1) {
    const at = p * 4;
    const a = img[at + 3];
    if (a <= 0) continue;
    rgba[at] = Math.round(clamp01(img[at] / a) * 255);
    rgba[at + 1] = Math.round(clamp01(img[at + 1] / a) * 255);
    rgba[at + 2] = Math.round(clamp01(img[at + 2] / a) * 255);
    rgba[at + 3] = Math.round(clamp01(a) * 255);
  }
  return rgba;
}

// Le point chaud : le pixel franc le plus haut à gauche de l'image en 32 px
// (le bout de l'index, qui pointe dans cette direction).
function hotspot(img, size) {
  let best = null;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (img[(y * size + x) * 4 + 3] < 0.6) continue;
      if (!best || x + y < best[0] + best[1]) best = [x, y];
    }
  }
  return best;
}

function upscale(rgba, size, factor) {
  const big = new Uint8Array(size * factor * size * factor * 4);
  for (let y = 0; y < size * factor; y += 1) {
    for (let x = 0; x < size * factor; x += 1) {
      const from = (Math.floor(y / factor) * size + Math.floor(x / factor)) * 4;
      big.set(rgba.subarray(from, from + 4), (y * size * factor + x) * 4);
    }
  }
  return big;
}

const outputs = [];
for (const [name, spark] of [['curseur', false], ['curseur-actif', true]]) {
  for (const size of [SIZE, SIZE * 2]) {
    const base = sharpen(reduce(size), size);
    const img = addShadow(base, size);
    if (spark) drawSpark(img, size);
    const rgba = toBytes(img, size);
    const file = size === SIZE ? `${name}.png` : `${name}-2x.png`;
    writeFileSync(`assets/ui/${file}`, encodePng(size, size, rgba));
    if (apercuDir) {
      const factor = (SIZE * 8) / size;
      writeFileSync(join(apercuDir, `${name}-${size}.png`), encodePng(size * factor, size * factor, upscale(rgba, size, factor)));
    }
    if (size === SIZE && !spark) outputs.push(hotspot(base, size));
  }
}
const [hx, hy] = outputs[0];
console.log(`Curseur écrit : assets/ui/curseur.png et curseur-actif.png (${SIZE} × ${SIZE}), curseur-2x.png et curseur-actif-2x.png (${SIZE * 2} × ${SIZE * 2}).`);
console.log(`Point chaud (bout de l'index) : ${hx} ${hy}, à reporter dans styles.css.`);
