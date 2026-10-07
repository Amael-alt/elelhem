// Le support de toutes les passes de post-traitement : un seul triangle qui
// déborde de l'écran et le couvre entier (moins de travail qu'un quad, aucune
// diagonale au milieu de l'image). Version 2.10.2 : ce fichier s'appelait
// fullscreen.js, un nom que les bloqueurs de Brave et d'uBlock refusent sur
// github.io (les pages d'arnaque au faux support technique l'emploient).

import * as THREE from 'three';

export const FULLSCREEN_VERTEX = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`;

export function createFullscreenTriangle() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const mesh = new THREE.Mesh(geometry);
  mesh.frustumCulled = false;
  return mesh;
}
