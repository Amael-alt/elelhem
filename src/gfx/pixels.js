// Outils de pixel art procédural : tampon de pixels, rampes de couleurs,
// tramage de Bayer, bruits périodiques (pour des tuiles qui se raccordent
// sans couture), normales tirées d'une carte de hauteur, export en texture.

import * as THREE from 'three';

// Générateur pseudo-aléatoire à graine (mulberry32) : le même village à
// chaque chargement, et des textures reproductibles.
export function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hachage entier vers [0, 1) : une valeur stable par point de grille.
export function hash2(x, y, seed) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// Tampon RGBA, origine en haut à gauche comme une image.
export function createPixelBuffer(width, height) {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

export function setPixel(buffer, x, y, rgb, alpha = 255) {
  const i = (y * buffer.width + x) * 4;
  buffer.data[i] = rgb[0];
  buffer.data[i + 1] = rgb[1];
  buffer.data[i + 2] = rgb[2];
  buffer.data[i + 3] = alpha;
}

// Rampe : liste de couleurs du plus sombre au plus clair, convertie une fois.
export function createRamp(hexColors) {
  return hexColors.map(hexToRgb);
}

// Matrice de Bayer 4×4 : seuils réguliers qui donnent le tramage pixel art.
const BAYER_4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

export function bayer4(x, y) {
  return (BAYER_4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

// Choisit un ton de la rampe pour une valeur t entre 0 et 1. Entre deux tons,
// le seuil de Bayer décide pixel par pixel : le dégradé devient une trame.
export function rampIndex(t, levels, x, y) {
  const scaled = Math.min(Math.max(t, 0), 1) * (levels - 1);
  const base = Math.floor(scaled);
  return Math.min(levels - 1, base + (scaled - base > bayer4(x, y) ? 1 : 0));
}

const smooth = (t) => t * t * (3 - 2 * t);
const wrap = (v, period) => ((v % period) + period) % period;

// Bruit de valeur périodique : une grille de period × period valeurs, lue en
// boucle. Coordonnées en unités de grille.
export function valueNoise(seed, period) {
  return (x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const v = (ix, iy) => hash2(wrap(ix, period), wrap(iy, period), seed);
    const top = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * fx;
    const bottom = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * fx;
    return top + (bottom - top) * fy;
  };
}

// Somme d'octaves de bruit périodique, pour une tuile de size pixels.
// Chaque octave double la période : elle divise toujours size, donc la tuile
// se raccorde à ses voisines.
export function fbm(seed, size, basePeriod, octaves, gain = 0.5) {
  const layers = [];
  for (let i = 0; i < octaves; i += 1) {
    const period = basePeriod * 2 ** i;
    layers.push({ noise: valueNoise(seed + i * 101, period), scale: period / size, amplitude: gain ** i });
  }
  const total = layers.reduce((sum, layer) => sum + layer.amplitude, 0);
  return (px, py) => {
    let value = 0;
    for (const layer of layers) value += layer.noise(px * layer.scale, py * layer.scale) * layer.amplitude;
    return value / total;
  };
}

// Voronoï périodique : cells × cells cellules sur une tuile de size pixels,
// un point par cellule. Renvoie la distance au plus proche (f1), au second
// (f2) et l'identifiant de la cellule la plus proche, en unités de cellule.
export function voronoi(seed, size, cells, jitter = 0.8) {
  const points = [];
  for (let cy = 0; cy < cells; cy += 1) {
    for (let cx = 0; cx < cells; cx += 1) {
      points.push([
        0.5 + (hash2(cx, cy, seed) - 0.5) * jitter,
        0.5 + (hash2(cx, cy, seed + 7) - 0.5) * jitter,
      ]);
    }
  }
  return (px, py) => {
    const x = (px / size) * cells;
    const y = (py / size) * cells;
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    let f1 = Infinity;
    let f2 = Infinity;
    let id = 0;
    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        const nx = cx + ox;
        const ny = cy + oy;
        const index = wrap(ny, cells) * cells + wrap(nx, cells);
        const [jx, jy] = points[index];
        const d = Math.hypot(nx + jx - x, ny + jy - y);
        if (d < f1) {
          f2 = f1;
          f1 = d;
          id = index;
        } else if (d < f2) {
          f2 = d;
        }
      }
    }
    return { f1, f2, id };
  };
}

// Normales en espace tangent tirées d'une carte de hauteur par l'opérateur de
// Sobel, avec raccord périodique. strength règle le relief apparent.
export function sobelNormals(heights, size, strength) {
  const buffer = createPixelBuffer(size, size);
  const h = (x, y) => heights[wrap(y, size) * size + wrap(x, size)];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1))
        - (h(x - 1, y - 1) + 2 * h(x - 1, y) + h(x - 1, y + 1));
      const dy = (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1))
        - (h(x - 1, y - 1) + 2 * h(x, y - 1) + h(x + 1, y - 1));
      // Ligne 0 de l'image = haut de la tuile, et v monte vers le haut : on
      // inverse dy pour rester dans le repère de la texture.
      const nx = -dx * strength;
      const ny = dy * strength;
      const length = Math.hypot(nx, ny, 1);
      setPixel(buffer, x, y, [
        Math.round(((nx / length) * 0.5 + 0.5) * 255),
        Math.round(((ny / length) * 0.5 + 0.5) * 255),
        Math.round(((1 / length) * 0.5 + 0.5) * 255),
      ]);
    }
  }
  return buffer;
}

// Envoie un tampon vers le GPU. Les lignes sont retournées ici (le haut de
// l'image devient v = 1) plutôt que par flipY, qui ne vaut pas pour tous les
// formats de données.
export function toDataTexture(buffer, { color = true, repeat = true, mipmaps = true } = {}) {
  const { width, height, data } = buffer;
  const flipped = new Uint8Array(data.length);
  const row = width * 4;
  for (let y = 0; y < height; y += 1) {
    flipped.set(data.subarray(y * row, (y + 1) * row), (height - 1 - y) * row);
  }
  const texture = new THREE.DataTexture(flipped, width, height, THREE.RGBAFormat);
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  texture.generateMipmaps = mipmaps;
  texture.needsUpdate = true;
  return texture;
}
