// Le sol du village : chaque cellule de la carte devient un dessus à sa
// hauteur, et des flancs là où la voisine est plus basse (berges, murets,
// bords du socle). Toutes les faces d'une même matière sont fusionnées en une
// seule géométrie : un appel de dessin par matière, quelle que soit la carte.
//
// Occlusion ambiante cuite : chaque coin de cellule s'assombrit selon le
// nombre de voisines plus hautes (muret, bâtiment) qui le bordent, et le pied
// de chaque flanc est plus sombre que son sommet. Au bord du socle, le flanc
// montre une couche de terre puis la roche.

import * as THREE from 'three';
import { BASE_HEIGHT } from './map.js';
import { TILE_UNITS } from '../gfx/textures.js';
import { createMeshBuilder, pushPolygon, toGeometry } from './builder.js';

// Les quatre bords d'une cellule : décalage vers la voisine et extrémités du
// flanc, de gauche à droite vu de l'extérieur.
const EDGES = [
  { dx: 0, dz: -1, corners: (x, z) => [[x + 1, z], [x, z]], along: 'x' },
  { dx: 0, dz: 1, corners: (x, z) => [[x, z + 1], [x + 1, z + 1]], along: 'x' },
  { dx: -1, dz: 0, corners: (x, z) => [[x, z], [x, z + 1]], along: 'z' },
  { dx: 1, dz: 0, corners: (x, z) => [[x + 1, z + 1], [x + 1, z]], along: 'z' },
];

const CORNER_AO = [1, 0.7, 0.58, 0.5];
const BANK_FOOT_AO = 0.7;
const BASE_FOOT_AO = 0.45;
const TALLER = 0.25;
const SOIL_DEPTH = 0.55; // épaisseur de terre au bord du socle, la roche dessous
const LIP_DEPTH = 0.2; // l'herbe déborde sur le haut des flancs (falaises, socle)
const LIP_OUT = 0.025; // juste devant le flanc, pour ne pas le traverser

export function createTerrain(map, materials) {
  const builders = {};
  const builderFor = (matter) => (builders[matter] ??= createMeshBuilder());
  const u = (value) => value / TILE_UNITS;

  // Coin (cx, cz) d'une cellule de hauteur h : combien de cellules voisines
  // de ce coin le dominent ?
  function cornerAo(cx, cz, h) {
    let count = 0;
    for (const [nx, nz] of [[cx - 1, cz - 1], [cx, cz - 1], [cx - 1, cz], [cx, cz]]) {
      const cell = map.cellAt(nx, nz);
      if (cell && (cell.height > h + TALLER || map.isBuilt(nx, nz))) count += 1;
    }
    return CORNER_AO[Math.min(count, 3)];
  }

  for (let z = 0; z < map.depth; z += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const cell = map.cellAt(x, z);
      const h = cell.height;

      // Dessus, la texture suit les coordonnées du monde : aucune couture
      // d'une cellule à l'autre.
      const corners = [[x, z], [x, z + 1], [x + 1, z + 1], [x + 1, z]];
      pushPolygon(
        builderFor(cell.matter),
        corners.map(([cx, cz]) => [cx, h, cz]),
        corners.map(([cx, cz]) => [u(cx), -u(cz)]),
        corners.map(([cx, cz]) => cornerAo(cx, cz, h)),
      );

      for (const edge of EDGES) {
        const neighbor = map.cellAt(x + edge.dx, z + edge.dz);
        const low = neighbor ? neighbor.height : BASE_HEIGHT;
        if (low >= h) continue;
        const [[ax, az], [bx, bz]] = edge.corners(x, z);
        const ua = u(edge.along === 'x' ? ax : az);
        const ub = u(edge.along === 'x' ? bx : bz);
        const band = (matter, y0, y1, ao0, ao1) => pushPolygon(
          builderFor(matter),
          [[ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az]],
          [[ua, u(y0)], [ub, u(y0)], [ub, u(y1)], [ua, u(y1)]],
          [ao0, ao0, ao1, ao1],
        );
        // Lèvre d'herbe : sur les flancs hauts sous de l'herbe, une bande d'herbe
        // pend par-dessus la terre ou la roche.
        if (cell.matter === 'grass' && h - low > 0.4) {
          const ox = edge.dx * LIP_OUT;
          const oz = edge.dz * LIP_OUT;
          pushPolygon(
            builderFor('grass'),
            [[ax + ox, h - LIP_DEPTH, az + oz], [bx + ox, h - LIP_DEPTH, bz + oz], [bx + ox, h, bz + oz], [ax + ox, h, az + oz]],
            [[ua, u(h - LIP_DEPTH)], [ub, u(h - LIP_DEPTH)], [ub, u(h)], [ua, u(h)]],
            [0.8, 0.8, 1, 1],
          );
        }
        if (neighbor) {
          band(cell.side, low, h, BANK_FOOT_AO, 1);
        } else {
          // Bord du socle : une couche de terre, puis la roche jusqu'en bas.
          const soil = h - SOIL_DEPTH;
          band(cell.side, soil, h, 0.85, 1);
          band('rock', low, soil, BASE_FOOT_AO, 0.85);
        }
      }
    }
  }

  const group = new THREE.Group();
  group.name = 'terrain';
  for (const [matter, builder] of Object.entries(builders)) {
    const mesh = new THREE.Mesh(toGeometry(builder), materials[matter]);
    mesh.name = `terrain-${matter}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  return group;
}
