// Démarrage du Village de LIA : vérifie WebGL2, crée le rendu, lance la boucle.
// Étape 0 du chantier : la scène n'est qu'un cube éclairé qui tourne, pour
// valider la chaîne complète (carte d'import, three.js vendu, GitHub Pages).

import * as THREE from 'three';
import { createLoadGate } from './core/input.js';
import { createDebugPanel, isDebugEnabled } from './game/debug.js';

// Installée avant tout le reste, pour que rien ne passe avant elle.
const gate = createLoadGate(6);

const MAX_PIXEL_RATIO = 1.5;
const MAX_FRAME_SECONDS = 0.1; // au retour d'un onglet en veille, pas de saut

// Lumière de fin de journée : soleil bas et chaud, ciel froid.
const SUN_COLOR = 0xffc07a;
const SUN_INTENSITY = 4;
const SUN_ELEVATION_DEG = 22;
const SUN_AZIMUTH_DEG = -60;
const SKY_COLOR = 0x8fa4e6;
const GROUND_COLOR = 0x4a3a2c;
const HEMI_INTENSITY = 2;
const BACKGROUND = 0x231b2b;

const canvas = document.getElementById('scene');

if (!hasWebGL2()) {
  showFatal("Ce village a besoin de WebGL2 pour s'afficher. Ouvre la page dans une version récente de Chrome, Firefox, Safari ou Edge, et vérifie que l'accélération matérielle est activée.");
} else {
  try {
    start();
  } catch (error) {
    console.error(error);
    showFatal("Le village n'a pas pu démarrer sur cet appareil. Recharge la page, ou essaie un autre navigateur.");
  }
}

function hasWebGL2() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

function showFatal(text) {
  const box = document.getElementById('message');
  box.textContent = text;
  box.hidden = false;
  canvas.remove();
}

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);

  // Focale étroite et plongée : le futur regard « sur une maquette ».
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(0, 5.6, 7.7);
  camera.lookAt(0, 0, 0);

  const sun = new THREE.DirectionalLight(SUN_COLOR, SUN_INTENSITY);
  const elevation = THREE.MathUtils.degToRad(SUN_ELEVATION_DEG);
  const azimuth = THREE.MathUtils.degToRad(SUN_AZIMUTH_DEG);
  sun.position.set(
    Math.cos(elevation) * Math.sin(azimuth),
    Math.sin(elevation),
    Math.cos(elevation) * Math.cos(azimuth),
  ).multiplyScalar(10);
  scene.add(sun, new THREE.HemisphereLight(SKY_COLOR, GROUND_COLOR, HEMI_INTENSITY));

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.6, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xc9925f, roughness: 0.85 }),
  );
  cube.rotation.x = 0.35;
  scene.add(cube);

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const debug = isDebugEnabled() ? createDebugPanel(renderer) : null;
  let last = performance.now();

  renderer.setAnimationLoop((now) => {
    const dt = Math.min((now - last) / 1000, MAX_FRAME_SECONDS);
    last = now;

    cube.rotation.y += dt * 0.6;
    renderer.render(scene, camera);

    gate.frameRendered();
    debug?.update(dt);
  });
}
