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

// Boîte inclinée : un parallélépipède donné par son origine et ses trois
// arêtes (vecteurs), faces tournées vers l'extérieur quel que soit le sens des
// arêtes. Pour une planche penchée, une échelle, une flèche fichée. Le pied
// s'assombrit s'il touche le sol, comme pushBox.
export function pushSkewBox(frame, origin, [ex, ey, ez], { groundAo = 0.75 } = {}) {
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const p000 = origin;
  const p100 = add(p000, ex);
  const p010 = add(p000, ey);
  const p001 = add(p000, ez);
  const p110 = add(p100, ey);
  const p101 = add(p100, ez);
  const p011 = add(p010, ez);
  const p111 = add(p110, ez);
  // Le volume est-il direct (ex, ey, ez en main droite) ? Sinon on retourne chaque face.
  const cross = [ex[1] * ey[2] - ex[2] * ey[1], ex[2] * ey[0] - ex[0] * ey[2], ex[0] * ey[1] - ex[1] * ey[0]];
  const direct = cross[0] * ez[0] + cross[1] * ez[1] + cross[2] * ez[2] >= 0;
  const lowest = Math.min(p000[1], p100[1], p010[1], p001[1], p110[1], p101[1], p011[1], p111[1]);
  const foot = lowest < 0.05 ? groundAo : 1;
  const shade = (p) => (p[1] <= lowest + 0.01 ? foot : 1);
  const face = (quad, uv) => {
    const points = direct ? quad : [...quad].reverse();
    const uvs = direct ? uv : [...uv].reverse();
    frame.polygon(points, uvs, points.map(shade));
  };
  const len = (v) => Math.hypot(v[0], v[1], v[2]) / TILE_UNITS;
  const [lx, ly, lz] = [len(ex), len(ey), len(ez)];
  face([p001, p101, p111, p011], [[0, 0], [lx, 0], [lx, ly], [0, ly]]); // avant (+ez)
  face([p100, p000, p010, p110], [[0, 0], [lx, 0], [lx, ly], [0, ly]]); // arrière
  face([p000, p001, p011, p010], [[0, 0], [lz, 0], [lz, ly], [0, ly]]); // gauche
  face([p101, p100, p110, p111], [[0, 0], [lz, 0], [lz, ly], [0, ly]]); // droite
  face([p010, p011, p111, p110], [[0, 0], [lz, 0], [lz, lx], [0, lx]]); // dessus
  face([p001, p000, p100, p101], [[0, 0], [lx, 0], [lx, lz], [0, lz]]); // dessous
}

// Barre de section carrée entre deux points : une planche inclinée, un
// montant d'échelle, une croix de colombage. L'axe dominant de la barre fixe
// l'orientation de sa section.
export function pushBar(frame, from, to, section, options) {
  let d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  let start = from;
  const sizes = d.map(Math.abs);
  const axis = sizes.indexOf(Math.max(...sizes));
  if (d[axis] < 0) {
    start = to;
    d = d.map((v) => -v);
  }
  const h = section / 2;
  const across = [[h, 0, 0], [0, h, 0], [0, 0, h]].filter((_, i) => i !== axis);
  const origin = [
    start[0] - across[0][0] - across[1][0],
    start[1] - across[0][1] - across[1][1],
    start[2] - across[0][2] - across[1][2],
  ];
  const edges = [[section, 0, 0], [0, section, 0], [0, 0, section]];
  edges[axis] = d;
  pushSkewBox(frame, origin, edges, options);
}

// Une surface de révolution à n pans : rings est une liste [y, rayon] du bas
// vers le haut ; chaque pan est un quad entre deux anneaux. Les faces sont
// tournées vers l'extérieur (vérifié sur la normale), l'ombre au pied si le
// bas touche le sol. Pour un tonneau, un pot, un pilier rond. inward : les
// faces regardent l'axe, pour la paroi intérieure d'un puits.
export function pushRevolution(frame, rings, { sides = 10, groundAo = 0.75, phase = 0, inward = false } = {}) {
  for (let r = 0; r + 1 < rings.length; r += 1) {
    const [y0, r0] = rings[r];
    const [y1, r1] = rings[r + 1];
    for (let k = 0; k < sides; k += 1) {
      const a0 = phase + (k / sides) * Math.PI * 2;
      const a1 = phase + ((k + 1) / sides) * Math.PI * 2;
      const quad = [
        [Math.cos(a0) * r0, y0, Math.sin(a0) * r0], [Math.cos(a1) * r0, y0, Math.sin(a1) * r0],
        [Math.cos(a1) * r1, y1, Math.sin(a1) * r1], [Math.cos(a0) * r1, y1, Math.sin(a0) * r1],
      ];
      const u0 = (k / sides) * 0.5;
      const u1 = ((k + 1) / sides) * 0.5;
      let uvs = [[u0, y0 / TILE_UNITS], [u1, y0 / TILE_UNITS], [u1, y1 / TILE_UNITS], [u0, y1 / TILE_UNITS]];
      const foot = y0 < 0.05 ? groundAo : 1;
      let ao = [foot, foot, 1, 1];
      // La normale du quad doit regarder vers l'extérieur (vers son milieu radial).
      const [p0, p1, p2] = quad;
      const ux = p1[0] - p0[0]; const uy = p1[1] - p0[1]; const uz = p1[2] - p0[2];
      const vx = p2[0] - p0[0]; const vy = p2[1] - p0[1]; const vz = p2[2] - p0[2];
      const nx = uy * vz - uz * vy;
      const nz = ux * vy - uy * vx;
      const mid = (a0 + a1) / 2;
      let points = quad;
      if ((nx * Math.cos(mid) + nz * Math.sin(mid) < 0) !== inward) {
        points = [...quad].reverse();
        uvs = [...uvs].reverse();
        ao = [...ao].reverse();
      }
      // À la pointe (rayon nul), deux sommets se confondent : un triangle, pas
      // un quad dégénéré, dont la normale serait invalide.
      const keep = points.map((pt, i) => i === 0 || Math.hypot(pt[0] - points[i - 1][0], pt[1] - points[i - 1][1], pt[2] - points[i - 1][2]) > 1e-6);
      if (Math.hypot(points[0][0] - points[3][0], points[0][1] - points[3][1], points[0][2] - points[3][2]) <= 1e-6) keep[3] = false;
      frame.polygon(points.filter((_, i) => keep[i]), uvs.filter((_, i) => keep[i]), ao.filter((_, i) => keep[i]));
    }
  }
}

// Un disque horizontal à n pans (le couvercle d'un tonneau), tourné vers le haut.
export function pushDisc(frame, y, radius, { sides = 10, phase = 0 } = {}) {
  for (let k = 0; k < sides; k += 1) {
    const a0 = phase + (k / sides) * Math.PI * 2;
    const a1 = phase + ((k + 1) / sides) * Math.PI * 2;
    const tri = [[0, y, 0], [Math.cos(a1) * radius, y, Math.sin(a1) * radius], [Math.cos(a0) * radius, y, Math.sin(a0) * radius]];
    const uvs = tri.map(([px, , pz]) => [px / TILE_UNITS, -pz / TILE_UNITS]);
    frame.polygon(tri, uvs);
  }
}

// Un anneau horizontal entre deux rayons (la margelle d'un puits, le dessus
// d'une bordure ronde), tourné vers le haut.
export function pushAnnulus(frame, y, inner, outer, { sides = 12, phase = 0 } = {}) {
  for (let k = 0; k < sides; k += 1) {
    const a0 = phase + (k / sides) * Math.PI * 2;
    const a1 = phase + ((k + 1) / sides) * Math.PI * 2;
    const quad = [
      [Math.cos(a0) * inner, y, Math.sin(a0) * inner], [Math.cos(a1) * inner, y, Math.sin(a1) * inner],
      [Math.cos(a1) * outer, y, Math.sin(a1) * outer], [Math.cos(a0) * outer, y, Math.sin(a0) * outer],
    ];
    frame.polygon(quad, quad.map(([px, , pz]) => [px / TILE_UNITS, -pz / TILE_UNITS]));
  }
}
