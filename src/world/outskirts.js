// Le monde autour du village : le socle ne flotte plus dans le vide. Au nord
// et à l'est, le plateau continue au niveau du haut des falaises ; à l'ouest
// et au sud, la plaine continue au niveau du village. La rivière vient du
// plateau (elle tombe en cascade dans le village, voir gfx/fx/waterfall.js) et
// repart vers le sud ; les routes de l'ouest et du sud filent vers l'horizon.
// Une forêt en lisière, puis la brume : la scène se lit comme un morceau d'un
// monde, comme dans un vrai jeu HD-2D.
//
// Tout est fusionné par matière (herbe, terre, eau, roche, écorce) : cinq
// appels de dessin au plus, quel que soit le nombre d'arbres. Les couronnes
// rejoignent le feuillage instancié du village.

import * as THREE from 'three';
import { createMeshBuilder, pushPolygon, toGeometry } from './builder.js';
import { TILE_UNITS } from '../gfx/textures.js';
import { createRng } from '../gfx/pixels.js';
import { crownClumps } from '../gfx/foliage.js';
import { FIRST_FLOWER_VARIANT, FLOWER_VARIANTS } from '../gfx/grass.js';

const REACH = 36; // jusqu'où s'étend le monde autour du village
const FOREST_DEPTH = 15; // largeur de la lisière boisée, au-delà la brume suffit
const FOREST_DEPTH_LIGHT = 9; // sur téléphone : la caméra voit moins loin, autant épargner le GPU
const TREE_SPACING = 2.4;
const PLATEAU = 1.8; // hauteur du plateau, celle des falaises
const RIVER_HIGH = 1.55; // la rivière sur le plateau, avant la cascade
const RIVER_LOW = -0.35; // la rivière dans la plaine, comme dans le village
const TUFT_BAND = 3.5; // touffes d'herbe sur cette largeur, pour fondre la jointure

const u = (value) => value / TILE_UNITS;

// Dessus horizontal, texture en coordonnées du monde (comme le sol du village :
// aucune couture à la jointure).
function top(builder, x0, z0, x1, z1, y) {
  const corners = [[x0, z0], [x0, z1], [x1, z1], [x1, z0]];
  pushPolygon(builder, corners.map(([x, z]) => [x, y, z]), corners.map(([x, z]) => [u(x), -u(z)]));
}

// Paroi verticale de a à b, tournée vers outward ([nx, nz]).
function wall(builder, a, b, y0, y1, outward) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  // La normale d'un quad (a, b, b haut, a haut) vaut (-dz, 0, dx) : on inverse
  // le sens si elle ne regarde pas du bon côté.
  const [p, q] = -dz * outward[0] + dx * outward[1] >= 0 ? [a, b] : [b, a];
  const along = Math.hypot(dx, dz);
  pushPolygon(
    builder,
    [[p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]]],
    [[0, u(y0)], [u(along), u(y0)], [u(along), u(y1)], [0, u(y1)]],
    [0.6, 0.6, 1, 1],
  );
}

// map : la carte (pour ses dimensions) ; materials : les matières du village.
// Renvoie le groupe à ajouter à la scène, les grappes des arbres et les
// touffes d'herbe de la jointure.
// light : version allégée pour les écrans étroits (téléphones).
export function createOutskirts(map, materials, { tints, treeKinds = ['vert', 'vert', 'vert', 'automne'], light = false } = {}) {
  const forestDepth = light ? FOREST_DEPTH_LIGHT : FOREST_DEPTH;
  const W = map.width;
  const D = map.depth;
  const R = REACH;
  const b = { grass: createMeshBuilder(), dirt: createMeshBuilder(), water: createMeshBuilder(), rock: createMeshBuilder(), bark: createMeshBuilder() };

  // Rivière : sur le plateau au nord (x 30 à 33), dans la plaine au sud (31 à 34).
  const north = { x0: 30, x1: 33 };
  const south = { x0: 31, x1: 34 };
  // Routes : à l'ouest (z 14 à 16), au sud (x 19 à 21).
  const westRoad = { z0: 14, z1: 16 };
  const southRoad = { x0: 19, x1: 21 };

  // Plateau nord, de part et d'autre de la rivière haute.
  top(b.grass, -R, -R, north.x0, 0, PLATEAU);
  top(b.grass, north.x1, -R, W + R, 0, PLATEAU);
  top(b.water, north.x0, -R, north.x1, 0, RIVER_HIGH);
  wall(b.rock, [north.x0, -R], [north.x0, 0], RIVER_HIGH, PLATEAU, [1, 0]);
  wall(b.rock, [north.x1, -R], [north.x1, 0], RIVER_HIGH, PLATEAU, [-1, 0]);
  // Plateau est.
  top(b.grass, W, 0, W + R, D + R, PLATEAU);
  // Plaine ouest, coupée par la route.
  top(b.grass, -R, 0, 0, westRoad.z0, 0);
  top(b.dirt, -R, westRoad.z0, 0, westRoad.z1, 0);
  top(b.grass, -R, westRoad.z1, 0, D + R, 0);
  // Plaine sud, coupée par la route et la rivière basse.
  top(b.grass, 0, D, southRoad.x0, D + R, 0);
  top(b.dirt, southRoad.x0, D, southRoad.x1, D + R, 0);
  top(b.grass, southRoad.x1, D, south.x0, D + R, 0);
  top(b.water, south.x0, D, south.x1, D + R, RIVER_LOW);
  top(b.grass, south.x1, D, W, D + R, 0);
  wall(b.dirt, [south.x0, D], [south.x0, D + R], RIVER_LOW, 0, [1, 0]);
  wall(b.dirt, [south.x1, D], [south.x1, D + R], RIVER_LOW, 0, [-1, 0]);
  // Marches entre plaine et plateau : à l'ouest au nord du village, au sud à
  // l'est du village.
  wall(b.rock, [-R, 0], [0, 0], 0, PLATEAU, [0, 1]);
  wall(b.rock, [W, D], [W, D + R], 0, PLATEAU, [-1, 0]);

  // Lisière boisée : des arbres sur une grille irrégulière, hors des routes,
  // de la rivière et d'une bande libre au ras du village.
  const rng = createRng(77);
  const clumps = [];
  const autumnCrowns = []; // les roux du premier rang, d'où tombent des feuilles
  const tufts = [];
  const groundAt = (x, z) => (z < 0 || x > W ? PLATEAU : 0);
  const blocked = (x, z) => {
    if (z < 0 && x > north.x0 - 1 && x < north.x1 + 1) return true;
    if (z > D && x > south.x0 - 1 && x < south.x1 + 1) return true;
    if (x < 0 && z > westRoad.z0 - 1.2 && z < westRoad.z1 + 1.2) return true;
    if (z > D && x > southRoad.x0 - 1.2 && x < southRoad.x1 + 1.2) return true;
    return false;
  };
  // Distance au rectangle du village (0 dedans).
  const outside = (x, z) => Math.hypot(Math.max(0, -x, x - W), Math.max(0, -z, z - D));
  let index = 0;
  for (let z = -forestDepth; z < D + forestDepth; z += TREE_SPACING) {
    for (let x = -forestDepth; x < W + forestDepth; x += TREE_SPACING) {
      const px = x + (rng() - 0.5) * TREE_SPACING * 0.9;
      const pz = z + (rng() - 0.5) * TREE_SPACING * 0.9;
      const d = outside(px, pz);
      if (d < 1.4 || d > forestDepth || blocked(px, pz)) continue;
      // Plus clairsemé au ras du village, dense ensuite.
      if (d < 4 && rng() < 0.45) continue;
      const size = 0.9 + rng() * 0.55;
      const ground = groundAt(px, pz);
      const trunk = 0.14 * size;
      const crownBase = 1.25 * size;
      const tx = px;
      const tz = pz;
      // Tronc : une boîte d'écorce, assez pour les arbres du premier rang.
      top(b.bark, tx - trunk, tz - trunk, tx + trunk, tz + trunk, ground + crownBase + 0.4);
      wall(b.bark, [tx - trunk, tz + trunk], [tx + trunk, tz + trunk], ground, ground + crownBase + 0.4, [0, 1]);
      wall(b.bark, [tx + trunk, tz - trunk], [tx + trunk, tz + trunk], ground, ground + crownBase + 0.4, [1, 0]);
      wall(b.bark, [tx - trunk, tz - trunk], [tx - trunk, tz + trunk], ground, ground + crownBase + 0.4, [-1, 0]);
      const kind = treeKinds[Math.floor(rng() * treeKinds.length)];
      const palette = tints[kind];
      const center = { x: tx, y: ground + crownBase + 0.95 * size, z: tz };
      const tint = palette[index % palette.length];
      clumps.push(...crownClumps(center, 1.05 * size, tint, 500 + index));
      if (kind === 'automne' && d < 6) autumnCrowns.push({ ...center, radius: 1.05 * size, tint });
      index += 1;
    }
  }

  // Touffes d'herbe sur la jointure, pour que le bord du village se fonde.
  const tuftCount = Math.round((2 * (W + D) + 4 * TUFT_BAND) * TUFT_BAND * 2.6);
  for (let i = 0; i < tuftCount; i += 1) {
    const side = Math.floor(rng() * 4);
    const along = rng();
    const depth = rng() * TUFT_BAND;
    let x;
    let z;
    if (side === 0) [x, z] = [-TUFT_BAND + along * (W + 2 * TUFT_BAND), -depth - 0.05];
    else if (side === 1) [x, z] = [-TUFT_BAND + along * (W + 2 * TUFT_BAND), D + depth + 0.05];
    else if (side === 2) [x, z] = [-depth - 0.05, along * D];
    else [x, z] = [W + depth + 0.05, along * D];
    if (blocked(x, z)) continue;
    tufts.push({ x, y: groundAt(x, z), z, variant: rng() < 0.12 ? FIRST_FLOWER_VARIANT + Math.floor(rng() * FLOWER_VARIANTS) : Math.floor(rng() * FIRST_FLOWER_VARIANT) });
  }

  const group = new THREE.Group();
  group.name = 'alentours';
  for (const [key, builder] of Object.entries(b)) {
    if (builder.indices.length === 0) continue;
    const mesh = new THREE.Mesh(toGeometry(builder), materials[key]);
    mesh.name = `alentours-${key}`;
    mesh.receiveShadow = true;
    mesh.castShadow = key === 'bark';
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  return { group, clumps, tufts, autumnCrowns };
}
