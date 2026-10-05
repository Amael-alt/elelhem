// Générateurs de tuiles du décor. Chaque tuile fait 64 × 64 pixels et couvre
// 4 × 4 unités du monde (16 texels par unité). Elles sont périodiques : posées
// côte à côte, aucune couture ne se voit. Chaque générateur rend une texture
// de couleur et, quand le relief compte, une texture de normales.

import { terrainRamps } from '../data/palette.js';
import {
  createPixelBuffer, createRamp, createRng, fbm, hash2, rampIndex, setPixel, sobelNormals, toDataTexture, voronoi,
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
