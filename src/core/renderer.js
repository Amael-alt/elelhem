// Le moteur de rendu WebGL2 et sa politique de résolution.
// Étape 1a : rendu direct, sans post-traitement. L'étalonnage (ACES) est fait
// ici en attendant la passe de composition de l'étape 1c.

import * as THREE from 'three';

export const MAX_PIXEL_RATIO = 1.5;
const EXPOSURE = 1.2;

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = EXPOSURE;
  return renderer;
}
