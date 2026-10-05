// Guirlandes de fanions au-dessus de la place : une corde qui pend entre
// deux points d'attache, des fanions triangulaires de couleurs alternées qui
// flottent un peu au vent. Tout tient dans une seule géométrie (un appel de
// dessin) ; les couleurs sont des couleurs de sommets.

import * as THREE from 'three';
import { buntingColors, outlineColor } from '../data/palette.js';

const SPACING = 0.42; // entre deux fanions
const FLAG_WIDTH = 0.26;
const FLAG_HEIGHT = 0.32;
const ROPE = 0.025;
const FLUTTER = 0.06; // amplitude du vent à la pointe
const FLUTTER_RATE = 3.1;

// lines : liste de { from: [x, y, z], to: [x, y, z], sag } ; time : uniforme
// de temps partagé des effets.
export function createBunting(lines, time) {
  const positions = [];
  const colors = [];
  const sway = [];
  const color = new THREE.Color();
  const rope = new THREE.Color(outlineColor);
  const push = (p, c, s) => {
    positions.push(p.x, p.y, p.z);
    colors.push(c.r, c.g, c.b);
    sway.push(s);
  };
  const quad = (a, b, c, d, col, sa = 0, sb = 0, sc = 0, sd = 0) => {
    push(a, col, sa); push(b, col, sb); push(c, col, sc);
    push(a, col, sa); push(c, col, sc); push(d, col, sd);
  };
  let flagIndex = 0;
  for (const { from, to, sag } of lines) {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const length = a.distanceTo(b);
    const along = b.clone().sub(a).normalize();
    // Point de la corde à la fraction t : la pente d'une parabole qui pend.
    const at = (t) => a.clone().lerp(b, t).add(new THREE.Vector3(0, -4 * sag * t * (1 - t), 0));
    const steps = Math.max(2, Math.ceil(length / 0.25));
    for (let i = 0; i < steps; i += 1) {
      const p = at(i / steps);
      const q = at((i + 1) / steps);
      const up = new THREE.Vector3(0, ROPE, 0);
      quad(p, q, q.clone().add(up), p.clone().add(up), rope);
    }
    const count = Math.floor(length / SPACING);
    for (let i = 1; i < count; i += 1) {
      const t = i / count;
      const center = at(t);
      const half = along.clone().multiplyScalar(FLAG_WIDTH / 2);
      const left = center.clone().sub(half);
      const right = center.clone().add(half);
      const tip = center.clone().add(new THREE.Vector3(0, -FLAG_HEIGHT, 0));
      color.set(buntingColors[flagIndex % buntingColors.length]);
      flagIndex += 1;
      // Deux faces, pour être vus des deux côtés.
      push(left, color, 0); push(right, color, 0); push(tip, color, 1);
      push(right, color, 0); push(left, color, 0); push(tip, color, 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('aSway', new THREE.Float32BufferAttribute(sway, 1));
  geometry.computeVertexNormals();

  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float aSway;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = vec3( 0.0, 0.6, 0.8 );')
      .replace('#include <begin_vertex>', /* glsl */`
        #include <begin_vertex>
        float flutter = sin( uTime * ${FLUTTER_RATE.toFixed(2)} + position.x * 1.7 + position.z * 1.3 );
        transformed += vec3( flutter, 0.0, flutter * 0.6 ) * ${FLUTTER.toFixed(3)} * aSway;
      `);
  };
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'fanions';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  return mesh;
}
