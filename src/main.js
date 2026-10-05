// Démarrage du Village de LIA : vérifie WebGL2, assemble le monde et le
// héros, puis lance la boucle. Étape 1a : sol texturé, caméra qui suit,
// héros au clavier, collisions. Aucun post-traitement.

import * as THREE from 'three';
import { createKeyboard, createLoadGate } from './core/input.js';
import { createRenderer } from './core/renderer.js';
import { createFollowCamera } from './core/camera.js';
import { createVillage } from './world/village.js';
import { createCharacterSheet } from './gfx/sprites.js';
import { createBlobShadow, createSprite } from './gfx/billboard.js';
import { createPlayer } from './game/player.js';
import { createDebugPanel, installDebugApi, isDebugEnabled } from './game/debug.js';
import { backgroundColor } from './data/palette.js';
import { hero } from './data/characters.js';

// Installée avant tout le reste, pour que rien ne passe avant elle.
const gate = createLoadGate(6);

const MAX_FRAME_SECONDS = 0.1; // au retour d'un onglet en veille, pas de saut

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
  const renderer = createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backgroundColor);

  const village = createVillage(scene);
  const follow = createFollowCamera();
  const keyboard = createKeyboard();

  const sheet = createCharacterSheet(hero);
  const sprite = createSprite(sheet, village.sunDirection);
  const shadow = createBlobShadow();
  scene.add(sprite.object, shadow);
  const player = createPlayer({ sprite, shadow, village });

  const focusTarget = new THREE.Vector3();
  follow.snap(player.worldPosition(focusTarget));

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    follow.setAspect(width / height);
  }
  window.addEventListener('resize', resize);
  resize();

  const state = { frozen: false };
  const debug = isDebugEnabled() ? createDebugPanel(renderer) : null;

  // Une image du jeu. force : avance même figé (tests image par image).
  function tick(dt, force = false) {
    const step = state.frozen && !force ? 0 : dt;
    const zoom = keyboard.takeZoomSteps();
    if (zoom) follow.zoomBy(zoom);
    player.update(step, keyboard.direction());
    follow.follow(player.worldPosition(focusTarget), step);
    renderer.render(scene, follow.camera);
    gate.frameRendered();
  }

  installDebugApi({ renderer, player, follow, tick, state, sheet, focusTarget });

  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(Math.max((now - last) / 1000, 0), MAX_FRAME_SECONDS);
    last = now;
    tick(dt);
    debug?.update(dt);
  });
}
