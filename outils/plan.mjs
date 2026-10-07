// Dessine le plan du village vu d'en haut, en PNG : les cases de la carte
// (world/map.js) dans les couleurs de la minimap (data/palette.js), l'emprise
// des maisons, tours et chantier (world/layout.js) et les couronnes des
// arbres. C'est la référence donnée au générateur d'images pour peindre la
// carte illustrée (assets/ui/carte.png, version 2.3) : la géographie doit
// rester exacte, les repères du jeu se posent par-dessus en coordonnées de
// la grille (game/minimap.js). Aucune dépendance (png.mjs). Un outil du
// poste, pas du jeu.
//
// Usage : node outils/plan.mjs --sortie plan.png [--case 16]

import { writeFileSync } from 'node:fs';
import { encodePng } from './png.mjs';
import { createMap } from '../src/world/map.js';
import { HOUSES, ORCHARD, SITE, TOWERS, TREES, WASHHOUSE } from '../src/world/layout.js';
import { mapColors } from '../src/data/palette.js';

const args = process.argv.slice(2);
const options = { sortie: 'plan.png', case: 16 };
for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace(/^--/, '');
  if (!(key in options)) throw new Error(`Option inconnue : ${args[i]}`);
  options[key] = args[i + 1];
}
const CELL = Number(options.case);

const map = createMap();
for (const house of Object.values(HOUSES)) map.build(house.x, house.z, house.sizeX, house.sizeZ);
for (const tower of Object.values(TOWERS)) map.build(tower.x, tower.z, tower.size, tower.size);
map.build(SITE.x, SITE.z, SITE.sizeX, SITE.sizeZ);

const width = map.width * CELL;
const height = map.depth * CELL;
const data = new Uint8Array(width * height * 4);
const hex = (color) => [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
const put = (x, y, [r, g, b]) => {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const i = (y * width + x) * 4;
  data[i] = r;
  data[i + 1] = g;
  data[i + 2] = b;
  data[i + 3] = 255;
};
const rect = (x0, y0, x1, y1, color) => {
  for (let y = Math.round(y0); y < Math.round(y1); y += 1) for (let x = Math.round(x0); x < Math.round(x1); x += 1) put(x, y, color);
};
const disc = (cx, cy, radius, color) => {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= radius) put(x, y, color);
    }
  }
};

// Les cases, puis les bâtiments avec un liseré sombre, puis les arbres.
for (let z = 0; z < map.depth; z += 1) {
  for (let x = 0; x < map.width; x += 1) {
    const color = map.isBuilt(x, z) ? mapColors.toit : mapColors.cases[map.charAt(x, z)] ?? mapColors.fond;
    rect(x * CELL, z * CELL, (x + 1) * CELL, (z + 1) * CELL, hex(color));
  }
}
const edge = hex(mapColors.toitBord);
for (let z = 0; z < map.depth; z += 1) {
  for (let x = 0; x < map.width; x += 1) {
    if (!map.isBuilt(x, z)) continue;
    if (!map.isBuilt(x, z - 1)) rect(x * CELL, z * CELL, (x + 1) * CELL, z * CELL + 2, edge);
    if (!map.isBuilt(x, z + 1)) rect(x * CELL, (z + 1) * CELL - 3, (x + 1) * CELL, (z + 1) * CELL, edge);
    if (!map.isBuilt(x - 1, z)) rect(x * CELL, z * CELL, x * CELL + 2, (z + 1) * CELL, edge);
    if (!map.isBuilt(x + 1, z)) rect((x + 1) * CELL - 2, z * CELL, (x + 1) * CELL, (z + 1) * CELL, edge);
  }
}
// Le lavoir : son toit, sur son emprise.
rect(WASHHOUSE.x * CELL, WASHHOUSE.z * CELL, (WASHHOUSE.x + 4) * CELL, (WASHHOUSE.z + 4) * CELL, hex(mapColors.lavoir ?? '#5a5a6a'));
const tree = hex(mapColors.arbre);
for (const [x, z, size = 1] of TREES) disc(x * CELL, z * CELL, CELL * 0.75 * size, tree);
for (const [x, z, size = 1] of ORCHARD.trees) disc(x * CELL, z * CELL, CELL * 0.75 * size, hex(mapColors.verger ?? mapColors.arbre));

writeFileSync(options.sortie, encodePng(width, height, data));
console.log(`Écrit : ${options.sortie} (${width} × ${height})`);
