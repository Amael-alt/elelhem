// Fabrique de géométries fusionnées. On y empile des faces (quads, triangles,
// boîtes) avec leurs coordonnées de texture et une occlusion ambiante par
// sommet (1 : à découvert, moins : dans un coin, au pied d'un mur). Une seule
// géométrie par matière à la fin : un seul appel de dessin.

import * as THREE from 'three';
import { TILE_UNITS } from '../gfx/textures.js';

export function createMeshBuilder() {
  return { positions: [], normals: [], uvs: [], colors: [], indices: [] };
}

// Polygone convexe plan (3 ou 4 sommets), dans le sens trigonométrique vu de
// l'extérieur. La normale est tirée des sommets eux-mêmes.
export function pushPolygon(builder, vertices, uvs, ao = null) {
  const [a, b, c] = vertices;
  const normal = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2])
    .cross(new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]))
    .normalize();
  const start = builder.positions.length / 3;
  vertices.forEach((vertex, i) => {
    builder.positions.push(...vertex);
    builder.normals.push(normal.x, normal.y, normal.z);
    builder.uvs.push(...uvs[i]);
    const shade = ao ? ao[i] : 1;
    builder.colors.push(shade, shade, shade);
  });
  for (let i = 1; i < vertices.length - 1; i += 1) builder.indices.push(start, start + i, start + i + 1);
}

export function toGeometry(builder) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(builder.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(builder.normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(builder.uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(builder.colors, 3));
  geometry.setIndex(builder.indices);
  geometry.computeBoundingSphere();
  return geometry;
}

// Un repère local (u, y, w) posé dans le monde. Quand il échange x et z, c'est
// un miroir : on inverse l'ordre des sommets pour garder les faces vers
// l'extérieur.
export function createFrame(builder, origin, swapXZ = false) {
  const toWorld = ([u, y, w]) => (swapXZ ? [origin[0] + w, y, origin[2] + u] : [origin[0] + u, y, origin[2] + w]);
  return {
    polygon(vertices, uvs, ao = null) {
      const world = vertices.map(toWorld);
      if (swapXZ) {
        pushPolygon(builder, world.reverse(), [...uvs].reverse(), ao ? [...ao].reverse() : null);
      } else {
        pushPolygon(builder, world, uvs, ao);
      }
    },
  };
}

const tile = (value) => value / TILE_UNITS;

// Boîte alignée sur les axes du repère, sans face du dessous. Textures en
// coordonnées locales ; le pied s'assombrit s'il touche le sol.
export function pushBox(frame, [x0, y0, z0], [x1, y1, z1], { groundAo = 0.75 } = {}) {
  const foot = y0 < 0.05 ? groundAo : 1;
  const sideAo = [foot, foot, 1, 1];
  frame.polygon([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]],
    [[tile(x0), -tile(z1)], [tile(x1), -tile(z1)], [tile(x1), -tile(z0)], [tile(x0), -tile(z0)]]);
  frame.polygon([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
    [[tile(x0), tile(y0)], [tile(x1), tile(y0)], [tile(x1), tile(y1)], [tile(x0), tile(y1)]], sideAo);
  frame.polygon([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]],
    [[tile(-x1), tile(y0)], [tile(-x0), tile(y0)], [tile(-x0), tile(y1)], [tile(-x1), tile(y1)]], sideAo);
  frame.polygon([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]],
    [[tile(-z1), tile(y0)], [tile(-z0), tile(y0)], [tile(-z0), tile(y1)], [tile(-z1), tile(y1)]], sideAo);
  frame.polygon([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]],
    [[tile(z0), tile(y0)], [tile(z1), tile(y0)], [tile(z1), tile(y1)], [tile(z0), tile(y1)]], sideAo);
}
