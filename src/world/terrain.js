// Le sol du village : chaque cellule de la carte devient un dessus à sa
// hauteur, et des flancs là où la voisine est plus basse (berges, murets,
// bords du socle). Toutes les faces d'une même matière sont fusionnées en une
// seule géométrie : un appel de dessin par matière, quelle que soit la carte.
//
// Occlusion ambiante cuite : chaque coin de cellule s'assombrit selon le
// nombre de voisines plus hautes (muret, bâtiment) qui le bordent, et le pied
// de chaque flanc est plus sombre que son sommet.

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
        const foot = neighbor ? BANK_FOOT_AO : BASE_FOOT_AO;
        const [[ax, az], [bx, bz]] = edge.corners(x, z);
        const ua = u(edge.along === 'x' ? ax : az);
        const ub = u(edge.along === 'x' ? bx : bz);
        pushPolygon(
          builderFor(cell.side),
          [[ax, low, az], [bx, low, bz], [bx, h, bz], [ax, h, az]],
          [[ua, u(low)], [ub, u(low)], [ub, u(h)], [ua, u(h)]],
          [foot, foot, 1, 1],
        );
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
