// Le moteur de rendu WebGL2 et sa politique de résolution.
// Avec le post-traitement, three.js ne fait aucun étalonnage : la scène reste
// en HDR linéaire et la passe de composition s'en charge. En rendu direct
// (?nofx), three.js applique ACES et la même exposition.

import * as THREE from 'three';
import { EXPOSURE } from '../gfx/post/composite.js';

export const MAX_PIXEL_RATIO = 1.5;

export function createRenderer(canvas, { postProcessing = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = postProcessing ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = EXPOSURE;
  return renderer;
}
