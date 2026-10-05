// Le sol du village : chaque cellule de la carte devient un dessus à sa
// hauteur, et des flancs là où la voisine est plus basse (berges, murets,
// bords du socle). Toutes les faces d'une même matière sont fusionnées en une
// seule géométrie : un appel de dessin par matière, quelle que soit la carte.

import * as THREE from 'three';
import { BASE_HEIGHT } from './map.js';
import { TILE_UNITS } from '../gfx/textures.js';

// Les quatre bords d'une cellule : décalage vers la voisine et sommets du flanc
// (bas à gauche, bas à droite, haut à droite, haut à gauche vus de l'extérieur).
const EDGES = [
  { dx: 0, dz: -1, normal: [0, 0, -1], corners: (x, z) => [[x + 1, z], [x, z]], along: 'x' },
  { dx: 0, dz: 1, normal: [0, 0, 1], corners: (x, z) => [[x, z + 1], [x + 1, z + 1]], along: 'x' },
  { dx: -1, dz: 0, normal: [-1, 0, 0], corners: (x, z) => [[x, z], [x, z + 1]], along: 'z' },
  { dx: 1, dz: 0, normal: [1, 0, 0], corners: (x, z) => [[x + 1, z + 1], [x + 1, z]], along: 'z' },
];

function createBuilder() {
  return { positions: [], normals: [], uvs: [], indices: [] };
}

function pushQuad(builder, vertices, normal, uvs) {
  const start = builder.positions.length / 3;
  for (let i = 0; i < 4; i += 1) {
    builder.positions.push(...vertices[i]);
    builder.normals.push(...normal);
    builder.uvs.push(...uvs[i]);
  }
  builder.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
}

function toGeometry(builder) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(builder.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(builder.normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(builder.uvs, 2));
  geometry.setIndex(builder.indices);
  geometry.computeBoundingSphere();
  return geometry;
}

// materials : une matière de la carte (grass, dirt, cobble, water) vers son
// matériau. Renvoie un groupe de maillages, un par matière utilisée.
export function createTerrain(map, materials) {
  const builders = {};
  const builderFor = (matter) => (builders[matter] ??= createBuilder());
  const u = (value) => value / TILE_UNITS;

  for (let z = 0; z < map.depth; z += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const cell = map.cellAt(x, z);
      const h = cell.height;

      // Dessus, la texture suit les coordonnées du monde : aucune couture
      // d'une cellule à l'autre.
      pushQuad(
        builderFor(cell.matter),
        [[x, h, z], [x, h, z + 1], [x + 1, h, z + 1], [x + 1, h, z]],
        [0, 1, 0],
        [[u(x), -u(z)], [u(x), -u(z + 1)], [u(x + 1), -u(z + 1)], [u(x + 1), -u(z)]],
      );

      for (const edge of EDGES) {
        const neighbor = map.cellAt(x + edge.dx, z + edge.dz);
        const low = neighbor ? neighbor.height : BASE_HEIGHT;
        if (low >= h) continue;
        const [[ax, az], [bx, bz]] = edge.corners(x, z);
        const ua = u(edge.along === 'x' ? ax : az);
        const ub = u(edge.along === 'x' ? bx : bz);
        pushQuad(
          builderFor(cell.side),
          [[ax, low, az], [bx, low, bz], [bx, h, bz], [ax, h, az]],
          edge.normal,
          [[ua, u(low)], [ub, u(low)], [ub, u(h)], [ua, u(h)]],
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
