// Générateurs de tuiles du décor. Chaque tuile fait 64 × 64 pixels et couvre
// 4 × 4 unités du monde (16 texels par unité). Elles sont périodiques : posées
// côte à côte, aucune couture ne se voit. Chaque générateur rend une texture
// de couleur et, quand le relief compte, une texture de normales.

import { buildingRamps, interiorRamps, ironColor, natureRamps, paintingColors, rugColors, terrainRamps } from '../data/palette.js';
import {
  createPixelBuffer, createRamp, createRng, fbm, hash2, hexToRgb, rampIndex, setPixel, sobelNormals, toDataTexture, voronoi,
} from './pixels.js';

export const TILE_PIXELS = 64;
export const TILE_UNITS = 4;

const SIZE = TILE_PIXELS;
const wrap = (v) => ((v % SIZE) + SIZE) % SIZE;

// Peint la tuile à partir d'une fonction qui donne, pour chaque pixel, une
// valeur de ton entre 0 et 1. Le tramage de Bayer choisit le ton de la rampe.
function paint(rampHex, tones) {
  const ramp = createRamp(rampHex);
  const buffer = createPixelBuffer(SIZE, SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      setPixel(buffer, x, y, ramp[rampIndex(tones[y * SIZE + x], ramp.length, x, y)]);
    }
  }
  return buffer;
}

function finish(rampHex, tones, heights, strength) {
  return {
    map: toDataTexture(paint(rampHex, tones)),
    normalMap: heights ? toDataTexture(sobelNormals(heights, SIZE, strength), { color: false }) : null,
  };
}

// Herbe : grandes taches de tons, grain fin, et des brins courts plus clairs
// à la pointe, plus sombres au pied.
export function createGrassTextures(seed) {
  const patches = fbm(seed, SIZE, 4, 4, 0.55);
  const grain = fbm(seed + 50, SIZE, 16, 2);
  const rng = createRng(seed + 9);
  const tones = new Float32Array(SIZE * SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const p = patches(x, y);
      const g = grain(x, y);
      tones[y * SIZE + x] = 0.24 + p * 0.5 + (g - 0.5) * 0.16;
      heights[y * SIZE + x] = p * 0.5 + g * 0.5;
    }
  }
  for (let n = 0; n < 170; n += 1) {
    const x = Math.floor(rng() * SIZE);
    const y = Math.floor(rng() * SIZE);
    const length = 2 + Math.floor(rng() * 2);
    tones[wrap(y + 1) * SIZE + x] -= 0.1;
    for (let k = 0; k < length; k += 1) {
      const i = wrap(y - k) * SIZE + x;
      tones[i] += k === length - 1 ? 0.22 : 0.1;
      heights[i] += 0.25;
    }
  }
  return finish(terrainRamps.herbe, tones, heights, 1.1);
}

// Terre battue : taches, grain, petits cailloux plus clairs et en relief.
export function createDirtTextures(seed) {
  const patches = fbm(seed, SIZE, 4, 4, 0.55);
  const grain = fbm(seed + 31, SIZE, 16, 2);
  const pebbles = voronoi(seed + 3, SIZE, 16, 0.9);
  const tones = new Float32Array(SIZE * SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const i = y * SIZE + x;
      const { f1, id } = pebbles(x, y);
      const pebble = f1 < 0.2 && hash2(id, 0, seed) > 0.45 ? 1 - f1 / 0.2 : 0;
      tones[i] = 0.22 + patches(x, y) * 0.5 + (grain(x, y) - 0.5) * 0.25 + pebble * 0.35;
      heights[i] = grain(x, y) * 0.4 + pebble * 0.8;
    }
  }
  return finish(terrainRamps.terre, tones, heights, 1.3);
}

// Pavés : un Voronoï de 8 × 8 pierres par tuile (une demi-unité chacune),
// joints sombres, chaque pierre son ton, bombée au centre.
export function createCobbleTextures(seed) {
  const stones = voronoi(seed, SIZE, 8, 0.5);
  const grain = fbm(seed + 17, SIZE, 16, 2);
  const tones = new Float32Array(SIZE * SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  const JOINT = 0.11;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const i = y * SIZE + x;
      const { f1, f2, id } = stones(x, y);
      const edge = f2 - f1;
      if (edge < JOINT) {
        tones[i] = 0.08 + grain(x, y) * 0.08;
        heights[i] = 0;
        continue;
      }
      const dome = Math.min(1, (edge - JOINT) / 0.4);
      tones[i] = 0.36 + hash2(id, 3, seed) * 0.22 + dome * 0.14 + (grain(x, y) - 0.5) * 0.12;
      heights[i] = Math.sqrt(dome) * 0.9 + grain(x, y) * 0.1;
    }
  }
  return finish(terrainRamps.paves, tones, heights, 1.2);
}

// Pavés en éventail (version 2.5, le parvis de l'auberge) : des arcs de petits
// pavés posés en écailles, comme sur les places des villes anciennes. Chaque
// éventail est un demi-disque d'une unité de rayon (16 pixels), ouvert vers
// le nord ; ils se chevauchent en rangées décalées, le plus au sud par-dessus.
// Dans un éventail, quatre anneaux de pavés, chacun découpé en pierres de
// longueur égale. Période de 32 pixels : la tuile de 64 se raccorde.
export function createFanCobbleTextures(seed) {
  const grain = fbm(seed + 17, SIZE, 16, 2);
  const tones = new Float32Array(SIZE * SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  const R = 16;
  const RING = 4;
  const JOINT = 0.9;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const i = y * SIZE + x;
      const px = x + 0.5;
      const py = y + 0.5;
      // L'éventail qui couvre le pixel : celui dont le centre est le plus au sud.
      let best = null;
      const row0 = Math.floor(py / R);
      for (let row = row0; row <= row0 + 2; row += 1) {
        const cy = row * R;
        const offset = ((row % 2) + 2) % 2 ? R : 0;
        for (let k = -1; k <= SIZE / (2 * R) + 1; k += 1) {
          const cx = k * 2 * R + offset;
          const d = Math.hypot(px - cx, py - cy);
          if (d > R * 1.06 || py > cy + 0.01) continue;
          if (!best || cy > best.cy) best = { cx, cy, d, row, k };
        }
      }
      if (!best) {
        tones[i] = 0.1;
        continue;
      }
      const ring = Math.min(3, Math.floor(best.d / RING));
      const inRing = best.d - ring * RING;
      const angle = Math.atan2(best.cy - py, px - best.cx); // 0 à droite, π à gauche
      const count = Math.max(2, Math.round((Math.PI * (ring + 0.5) * RING) / 4.6));
      const along = (angle / Math.PI) * count;
      const stone = Math.floor(along);
      const arc = (along - stone) * ((Math.PI * (ring + 0.5) * RING) / count);
      const arcLength = (Math.PI * (ring + 0.5) * RING) / count;
      const edge = Math.min(inRing, RING - inRing, arc, arcLength - arc, R * 1.06 - best.d + 0.4);
      if (edge < JOINT) {
        tones[i] = 0.08 + grain(x, y) * 0.08;
        heights[i] = 0;
        continue;
      }
      const id = hash2(((best.k % 2) + 2) % 2 * 97 + ((best.row % 2) + 2) % 2 * 31 + ring * 7, stone, seed);
      const dome = Math.min(1, (edge - JOINT) / 1.4);
      tones[i] = 0.4 + id * 0.3 + dome * 0.16 + (grain(x, y) - 0.5) * 0.1;
      heights[i] = Math.sqrt(dome) * 0.9 + grain(x, y) * 0.1;
    }
  }
  return finish(terrainRamps.parvis, tones, heights, 1.2);
}

// Eau : bandes de vaguelettes étirées à l'horizontale, quelques reflets clairs.
export function createWaterTextures(seed) {
  const waves = fbm(seed, SIZE, 4, 3, 0.6);
  const grain = fbm(seed + 5, SIZE, 16, 1);
  const tones = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const w = waves(x, y);
      const band = Math.sin(((y / SIZE) * 10 + w * 3 + (grain(x, y) - 0.5) * 0.6) * Math.PI * 2);
      tones[y * SIZE + x] = 0.28 + (w - 0.5) * 0.45 + (band > 0.9 ? 0.4 : band > 0.7 ? 0.15 : 0);
    }
  }
  return finish(terrainRamps.eau, tones, null, 0);
}

// --- Maisons ----------------------------------------------------------------

// Enduit : blanc cassé, quelques taches douces et un grain fin. Avec une autre
// rampe, la chaux ocre des intérieurs.
export function createPlasterTextures(seed, ramp = buildingRamps.enduit) {
  const stains = fbm(seed, SIZE, 2, 4, 0.6);
  const grain = fbm(seed + 3, SIZE, 32, 1);
  const tones = new Float32Array(SIZE * SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const s = stains(x, y);
      const g = grain(x, y);
      tones[y * SIZE + x] = 0.62 + (s - 0.5) * 0.45 + (g - 0.5) * 0.18;
      heights[y * SIZE + x] = g * 0.6 + s * 0.4;
    }
  }
  return finish(ramp, tones, heights, 0.5);
}

// Bois : des fibres verticales, chaque colonne de pixels son ton. Sert aux
// colombages (rouge) et, avec une autre rampe, à l'écorce des arbres.
export function createWoodTextures(seed, ramp = buildingRamps.bois) {
  const grain = fbm(seed + 1, SIZE, 8, 3);
  const tones = new Float32Array(SIZE * SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const fiber = (hash2(x, 0, seed) + hash2(x, 1, seed) * 0.5) / 1.5;
      tones[y * SIZE + x] = 0.38 + (fiber - 0.5) * 0.45 + (grain(x, y) - 0.5) * 0.3;
      heights[y * SIZE + x] = fiber;
    }
  }
  return finish(ramp, tones, heights, 0.8);
}

// Tuiles canal : colonnes de 4 pixels qui descendent la pente, alternance de
// tuiles bombées (couvert) et creuses (courant), décalées d'une colonne à
// l'autre ; le bas de chaque tuile fait une ombre sur la suivante.
export function createRoofTextures(seed) {
  const grain = fbm(seed + 1, SIZE, 16, 2);
  const tones = new Float32Array(SIZE * SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const column = Math.floor(x / 4);
      const across = ((x % 4) + 0.5) / 4;
      const cover = column % 2 === 1;
      const offset = (column * 3) % 8;
      const along = ((y + offset) % 8) / 8;
      const row = Math.floor((y + offset) / 8) % 8;
      const bulge = Math.sin(Math.PI * across);
      const relief = cover ? bulge : 0.35 * (1 - bulge);
      const lip = along > 0.8 ? 1 : 0;
      const i = y * SIZE + x;
      tones[i] = 0.2 + relief * 0.42 + hash2(column, row, seed) * 0.22 - lip * 0.22
        + (grain(x, y) - 0.5) * 0.12 + (cover ? 0.08 : -0.05);
      heights[i] = relief * 0.9 + (1 - along) * 0.25 + (cover ? 0.3 : 0);
    }
  }
  return finish(buildingRamps.tuiles, tones, heights, 1.4);
}

// Ardoise : rangs de 6 pixels, plaques de 5 à 8 de large décalées d'un rang
// à l'autre, chaque plaque d'un ton à elle, bord bas plus clair (il accroche
// la lumière), joints sombres.
export function createSlateTextures(seed) {
  const grain = fbm(seed + 3, SIZE, 16, 2);
  const tones = new Float32Array(SIZE * SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  const ROW = 6;
  for (let y = 0; y < SIZE; y += 1) {
    const row = Math.floor(y / ROW);
    const inRow = y % ROW;
    for (let x = 0; x < SIZE; x += 1) {
      const width = 8;
      const shifted = wrap(x + (row % 2) * 4 + (row % 3));
      const plate = Math.floor(shifted / width);
      const seam = shifted % width === 0;
      const i = y * SIZE + x;
      const edge = inRow === 0 ? 1 : 0; // bas de la plaque (v croît vers le faîtage)
      tones[i] = seam ? 0.08 : 0.28 + hash2(plate, row, seed) * 0.32 + edge * 0.18 - (inRow / ROW) * 0.12 + (grain(x, y) - 0.5) * 0.1;
      heights[i] = seam ? 0 : 0.6 + edge * 0.4 - (inRow / ROW) * 0.3;
    }
  }
  return finish(buildingRamps.ardoise, tones, heights, 1.3);
}

// Chaume : brins de paille verticaux, couches qui se recouvrent tous les 10
// pixels (le bas de chaque couche plus sombre), quelques mèches claires.
export function createThatchTextures(seed) {
  const strands = fbm(seed, SIZE, 32, 2);
  const patches = fbm(seed + 7, SIZE, 4, 3);
  const tones = new Float32Array(SIZE * SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  const LAYER = 10;
  for (let y = 0; y < SIZE; y += 1) {
    const inLayer = y % LAYER;
    for (let x = 0; x < SIZE; x += 1) {
      const i = y * SIZE + x;
      const strand = Math.abs(Math.sin((x + strands(x, y) * 6) * 1.9));
      const shade = inLayer < 2 ? -0.22 : 0;
      tones[i] = 0.3 + strand * 0.3 + (patches(x, y) - 0.5) * 0.3 + shade + (inLayer / LAYER) * 0.12;
      heights[i] = strand * 0.5 + inLayer / LAYER * 0.5;
    }
  }
  return finish(buildingRamps.chaume, tones, heights, 1.2);
}

// Pierre de taille des murs : assises de 8 pixels, blocs de 10 à 14, joints
// clairs de mortier, grain fin.
export function createStoneWallTextures(seed) {
  const grain = fbm(seed + 5, SIZE, 16, 3);
  const tones = new Float32Array(SIZE * SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    const course = Math.floor(y / 8);
    for (let x = 0; x < SIZE; x += 1) {
      const shifted = wrap(x + (course % 2) * 6);
      const block = Math.floor(shifted / 16);
      const joint = y % 8 === 0 || shifted % 16 === 0;
      const i = y * SIZE + x;
      tones[i] = joint ? 0.72 : 0.22 + hash2(block, course, seed) * 0.3 + (grain(x, y) - 0.5) * 0.25;
      heights[i] = joint ? 0 : 0.6 + grain(x, y) * 0.4;
    }
  }
  return finish(buildingRamps.pierre, tones, heights, 1.2);
}

// Toile d'auvent : bandes alternées de 8 pixels (rouge et crème), plis doux.
export function createAwningTexture() {
  const buffer = createPixelBuffer(SIZE, SIZE);
  const red = createRamp(buildingRamps.toileRouge);
  const cream = createRamp(buildingRamps.toileCreme);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const stripe = Math.floor(x / 8) % 2 === 0 ? red : cream;
      const fold = 0.5 + 0.5 * Math.cos(((x % 8) / 8) * Math.PI * 2);
      const tone = 0.35 + fold * 0.45 + (y / SIZE) * 0.15;
      setPixel(buffer, x, y, stripe[rampIndex(tone, stripe.length, x, y)]);
    }
  }
  return { map: toDataTexture(buffer) };
}

// Briques des cheminées : rangs de 4 pixels, briques de 8, joints sombres.
export function createBrickTextures(seed) {
  const grain = fbm(seed + 2, SIZE, 16, 2);
  const tones = new Float32Array(SIZE * SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const course = Math.floor(y / 4);
      const shift = course % 2 ? 4 : 0;
      const brick = Math.floor((x + shift) / 8) % 8;
      const joint = y % 4 === 3 || (x + shift) % 8 === 7;
      const i = y * SIZE + x;
      tones[i] = joint
        ? 0.05 + grain(x, y) * 0.08
        : 0.3 + hash2(brick, course, seed) * 0.35 + (grain(x, y) - 0.5) * 0.15 + (y % 4 === 0 ? 0.1 : 0);
      heights[i] = joint ? 0 : 0.8;
    }
  }
  return finish(buildingRamps.briques, tones, heights, 1.2);
}

// Porte : 16 × 32 pixels pour 1 × 2 unités. Planches vertes, deux pentures,
// une poignée, un arc en plein cintre découpé dans l'enduit.
export function createDoorTexture() {
  const width = 16;
  const height = 32;
  const wood = createRamp(buildingRamps.porte);
  const frame = createRamp(buildingRamps.bois);
  const plaster = createRamp(buildingRamps.enduit);
  const iron = hexToRgb(ironColor);
  const buffer = createPixelBuffer(width, height);
  const archY = 7;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = x + 0.5 - width / 2;
      const dy = y + 0.5 - archY;
      const inArch = y >= archY || dx * dx + dy * dy <= 7.5 * 7.5;
      let rgb;
      if (!inArch) rgb = plaster[3];
      else if (x === 0 || x === width - 1 || (y < archY && dx * dx + dy * dy > 6.3 * 6.3)) rgb = frame[1];
      else if (y === 10 || y === 24) rgb = iron;
      else if ((x === 11 || x === 12) && y === 17) rgb = iron;
      else if ((x - 1) % 4 === 0) rgb = wood[0];
      else rgb = wood[(x - 1) % 4 === 1 ? 3 : 2 - (hash2(x, y >> 2, 5) > 0.75 ? 1 : 0)];
      setPixel(buffer, x, y, rgb);
    }
  }
  return toDataTexture(buffer, { repeat: false, mipmaps: false });
}

// Fenêtre : 16 × 16 pixels pour une unité. Cadre de bois, croisée, quatre
// carreaux éclairés de l'intérieur, appui d'enduit. La texture d'émission
// reprend les carreaux seuls : c'est elle qui fera briller la fenêtre.
export function createWindowTextures() {
  const size = 16;
  const frame = createRamp(buildingRamps.bois);
  const glass = createRamp(buildingRamps.vitre);
  const plaster = createRamp(buildingRamps.enduit);
  const map = createPixelBuffer(size, size);
  const glow = createPixelBuffer(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const border = x < 2 || x > 13 || y < 2 || y > 13;
      const mullion = x === 7 || x === 8 || y === 7 || y === 8;
      if (y === size - 1) {
        setPixel(map, x, y, plaster[4]);
        setPixel(glow, x, y, [0, 0, 0]);
      } else if (border || mullion) {
        const lit = x === 0 || y === 0 || x === 9 || y === 9;
        const dark = x === 13 || y === 13 || x === 6 || y === 6;
        setPixel(map, x, y, frame[lit ? 3 : dark ? 1 : 2]);
        setPixel(glow, x, y, [0, 0, 0]);
      } else {
        const reflection = x - y > 3 && x - y < 6 ? 0.18 : 0;
        const t = 0.3 + (y / 15) * 0.35 + (1 - Math.abs(x - 7.5) / 6) * 0.25 + reflection;
        const rgb = glass[rampIndex(t, glass.length, x, y)];
        setPixel(map, x, y, rgb);
        setPixel(glow, x, y, rgb);
      }
    }
  }
  return {
    map: toDataTexture(map, { repeat: false, mipmaps: false }),
    emissiveMap: toDataTexture(glow, { repeat: false, mipmaps: false }),
  };
}

// --- Nature et socle --------------------------------------------------------

// Feuillage : des touffes (Voronoï de 8 × 8 par tuile), bombées et éclairées
// par le haut, séparées par des creux sombres.
export function createLeafTextures(seed) {
  const clumps = voronoi(seed, SIZE, 8, 0.9);
  const grain = fbm(seed + 4, SIZE, 16, 2);
  const tones = new Float32Array(SIZE * SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const i = y * SIZE + x;
      const { f1, f2, id } = clumps(x, y);
      const edge = f2 - f1;
      const dome = Math.max(0, 1 - f1 / 0.75);
      tones[i] = edge < 0.06
        ? 0.05 + grain(x, y) * 0.1
        : 0.18 + dome * 0.42 + hash2(id, 9, seed) * 0.2 + (grain(x, y) - 0.5) * 0.18;
      heights[i] = edge < 0.06 ? 0 : Math.sqrt(dome);
    }
  }
  return finish(natureRamps.feuillage, tones, heights, 1.3);
}

// Roche du socle : des strates horizontales irrégulières et quelques fissures.
export function createRockTextures(seed) {
  const grain = fbm(seed, SIZE, 8, 3);
  const cracks = voronoi(seed + 2, SIZE, 4, 0.9);
  const tones = new Float32Array(SIZE * SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const i = y * SIZE + x;
      const g = grain(x, y);
      const strata = Math.sin(((y + g * 6) / SIZE) * Math.PI * 2 * 4);
      const { f1, f2 } = cracks(x, y);
      const crack = f2 - f1 < 0.05 ? 1 : 0;
      tones[i] = 0.3 + strata * 0.15 + (g - 0.5) * 0.35 - crack * 0.25;
      heights[i] = 0.5 + strata * 0.3 + g * 0.3 - crack * 0.5;
    }
  }
  return finish(natureRamps.roche, tones, heights, 1.1);
}

// --- Intérieurs (version 1.3) ------------------------------------------------

// Partitions de 64 pixels en lattes de 16 à 48 : une par rangée, pour que la
// tuile se raccorde à sa voisine.
const PLANK_RUNS = [[24, 40], [40, 24], [32, 32], [16, 48], [48, 16], [24, 16, 24], [16, 24, 24], [24, 24, 16]];

// Plancher : des lattes de 8 pixels de large (une demi-unité) qui courent
// d'est en ouest, longues d'une à trois unités, décalées d'une rangée à
// l'autre. Un joint sombre entre deux lattes, un chanfrein clair sur le bord
// haut et une ombre sur le bord bas, des fibres dans le sens de la latte, un
// nœud sur une latte sur quatre, un clou près de chaque bout.
export function createPlankTextures(seed, ramp = interiorRamps.plancher) {
  const fibers = fbm(seed + 2, SIZE, 4, 2, 0.5);
  const tones = new Float32Array(SIZE * SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  const ROW = 8;
  for (let y = 0; y < SIZE; y += 1) {
    const row = Math.floor(y / ROW);
    const ly = y % ROW;
    const runs = PLANK_RUNS[Math.floor(hash2(row, 1, seed) * PLANK_RUNS.length)];
    const offset = Math.floor(hash2(row, 2, seed) * SIZE);
    for (let x = 0; x < SIZE; x += 1) {
      const i = y * SIZE + x;
      // Où est-on dans la suite des lattes de la rangée ?
      let along = wrap(x - offset);
      let plank = 0;
      while (along >= runs[plank]) {
        along -= runs[plank];
        plank += 1;
      }
      const length = runs[plank];
      if (ly === 0 || along === 0) {
        tones[i] = 0.04 + hash2(x, y, seed) * 0.06;
        heights[i] = 0;
        continue;
      }
      const id = row * 7 + plank;
      // Les fibres : une teinte par ligne de la latte, étirée en longueur.
      const fiber = fibers(x, (y * 4) % SIZE) * 0.6 + hash2(ly, id, seed) * 0.4;
      let tone = 0.22 + hash2(id, 3, seed) * 0.3 + (fiber - 0.5) * 0.3;
      let height = 0.65 + fiber * 0.25;
      if (ly === 1) {
        tone += 0.12;
        height += 0.1;
      }
      if (ly === ROW - 1) {
        tone -= 0.1;
        height -= 0.15;
      }
      if (along === 1) tone += 0.06;
      if (along === length - 1) tone -= 0.08;
      if (hash2(id, 4, seed) < 0.25) {
        const kx = 6 + Math.floor(hash2(id, 5, seed) * (length - 12));
        const ky = 2 + Math.floor(hash2(id, 6, seed) * 4);
        const d = Math.hypot((along - kx) / 2.5, (ly - ky) / 1.5);
        if (d < 1) {
          tone -= 0.3;
          height -= 0.3;
        } else if (d < 1.5) {
          tone += 0.05;
        }
      }
      if ((along === 2 || along === length - 3) && ly === 4) {
        tone -= 0.35;
        height -= 0.2;
      }
      tones[i] = tone;
      heights[i] = height;
    }
  }
  return finish(ramp, tones, heights, 0.9);
}

// Dalles de pierre : des pierres irrégulières d'une unité (Voronoï de 4 × 4),
// joints larges et sombres, chaque dalle son ton et son léger bombé, quelques
// éclats.
export function createFlagstoneTextures(seed, ramp = interiorRamps.dalles) {
  const slabs = voronoi(seed, SIZE, 4, 0.65);
  const grain = fbm(seed + 11, SIZE, 16, 2);
  const tones = new Float32Array(SIZE * SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  const JOINT = 0.12;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const i = y * SIZE + x;
      const { f1, f2, id } = slabs(x, y);
      const edge = f2 - f1;
      const g = grain(x, y);
      if (edge < JOINT) {
        tones[i] = 0.08 + g * 0.1;
        heights[i] = 0;
        continue;
      }
      const dome = Math.min(1, (edge - JOINT) / 0.45);
      const chip = hash2(x, y, seed + 3) > 0.985 ? 0.18 : 0;
      tones[i] = 0.28 + hash2(id, 5, seed) * 0.32 + dome * 0.12 + (g - 0.5) * 0.22 - chip;
      heights[i] = 0.45 + Math.sqrt(dome) * 0.4 + g * 0.15 - chip;
    }
  }
  return finish(ramp, tones, heights, 1.1);
}

// Lambris : des planches verticales de 8 pixels (une demi-unité), un joint
// sombre entre deux, un chanfrein clair à gauche et une ombre à droite, des
// fibres dans la hauteur.
export function createPanelTextures(seed, ramp = interiorRamps.lambris) {
  const grain = fbm(seed + 1, SIZE, 8, 3);
  const tones = new Float32Array(SIZE * SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const i = y * SIZE + x;
      const lx = x % 8;
      const board = Math.floor(x / 8);
      if (lx === 0) {
        tones[i] = 0.05 + grain(x, y) * 0.06;
        heights[i] = 0;
        continue;
      }
      const fiber = (hash2(x, 0, seed) + hash2(x, 1, seed) * 0.5) / 1.5;
      let tone = 0.26 + hash2(board, 2, seed) * 0.22 + (fiber - 0.5) * 0.3 + (grain(x, y) - 0.5) * 0.2;
      let height = 0.6 + fiber * 0.3;
      if (lx === 1) {
        tone += 0.12;
        height += 0.1;
      }
      if (lx === 7) {
        tone -= 0.1;
        height -= 0.15;
      }
      tones[i] = tone;
      heights[i] = height;
    }
  }
  return finish(ramp, tones, heights, 0.8);
}

export const RUG_PIXELS_PER_UNIT = 16;

// Tapis : une seule image à la taille du tapis (pas de répétition), 16 pixels
// par unité. Fond de laine rouge chiné, bordure crème entre deux filets
// sombres, un losange d'or par largeur de tapis le long du tapis, franges aux
// deux bouts.
export function createRugTexture(width, depth, seed = 7) {
  const buffer = createPixelBuffer(width, depth);
  const c = Object.fromEntries(Object.entries(rugColors).map(([key, hex]) => [key, hexToRgb(hex)]));
  const FRINGE = 2;
  const y0 = FRINGE;
  const y1 = depth - 1 - FRINGE;
  const count = Math.max(1, Math.round((depth - 2 * FRINGE) / width));
  const span = (depth - 2 * FRINGE) / count;
  const radius = Math.min(width, span) * 0.26;
  for (let y = 0; y < depth; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let rgb;
      if (y < y0 || y > y1) {
        rgb = x % 2 === 0 ? c.frange : c.filet;
      } else {
        const b = Math.min(x, width - 1 - x, y - y0, y1 - y);
        if (b === 0 || b === 4) rgb = c.filet;
        else if (b < 4) rgb = c.bordure;
        else {
          rgb = hash2(x, y, seed) > 0.8 ? c.fondClair : c.fond;
          for (let n = 0; n < count; n += 1) {
            const cy = y0 + span * (n + 0.5);
            const d = Math.abs(x + 0.5 - width / 2) / radius + Math.abs(y + 0.5 - cy) / radius;
            if (d < 0.35 || (d > 0.85 && d < 1.15)) rgb = c.motif;
            else if (d >= 1.15 && d < 1.35) rgb = c.filet;
          }
        }
      }
      setPixel(buffer, x, y, rgb);
    }
  }
  return toDataTexture(buffer, { repeat: false, mipmaps: false });
}

// Un petit tableau : 20 × 14 pixels, un paysage naïf, ciel du soir en dégradé,
// le soleil, deux collines, un arbre.
export function createPaintingTexture(seed) {
  const width = 20;
  const height = 14;
  const c = Object.fromEntries(Object.entries(paintingColors).map(([key, hex]) => [key, hexToRgb(hex)]));
  const buffer = createPixelBuffer(width, height);
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const far = 8 + Math.round(Math.sin(x * 0.5 + seed) * 1.2);
      const near = 10 + Math.round(Math.cos(x * 0.7 + seed) * 1.2);
      let rgb = mix(c.cielHaut, c.cielBas, Math.min(1, y / 8));
      const sun = Math.abs(x - 15) + Math.abs(y - 3);
      if (sun <= 1) rgb = c.soleil;
      if (y >= far) rgb = c.collineLoin;
      if (y >= near) rgb = c.collinePres;
      if (x === 5 && y >= 6 && y < 11) rgb = c.tronc;
      if (Math.hypot(x - 5, (y - 5) * 1.3) < 2.6) rgb = c.arbre;
      setPixel(buffer, x, y, rgb);
    }
  }
  return toDataTexture(buffer, { repeat: false, mipmaps: false });
}
