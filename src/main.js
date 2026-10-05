// Démarrage du Village de LIA : vérifie WebGL2, assemble le monde et le
// héros, puis lance la boucle. Étape 1c : post-traitement (flou de
// profondeur, bloom, étalonnage) ; ?nofx pour le rendu direct.

import * as THREE from 'three';
import { createKeyboard, createLoadGate } from './core/input.js';
import { createRenderer } from './core/renderer.js';
import { createPipeline, SPRITE_LAYER } from './gfx/post/pipeline.js';
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
const NARROW_SCREEN = 600; // en dessous (en pixels CSS), ombres moins définies

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
  const params = new URLSearchParams(window.location.search);
  const postProcessing = !params.has('nofx');
  const narrowScreen = Math.min(window.innerWidth, window.innerHeight) < NARROW_SCREEN;

  const renderer = createRenderer(canvas, { postProcessing });
  renderer.setClearColor(backgroundColor);
  const pipeline = createPipeline(renderer, { enabled: postProcessing, view: params.get('view') ?? 'final', narrowScreen });
  const scene = new THREE.Scene();

  const village = createVillage(scene, { narrowScreen });
  const follow = createFollowCamera();
  const keyboard = createKeyboard();

  const sheet = createCharacterSheet(hero);
  const sprite = createSprite(sheet, village.sunDirection, pipeline.spriteHooks);
  sprite.object.layers.set(SPRITE_LAYER);
  const shadow = createBlobShadow();
  scene.add(sprite.object, shadow);
  const player = createPlayer({ sprite, shadow, village });

  const focusTarget = new THREE.Vector3();
  const sharpPoint = new THREE.Vector3();
  const drawingBuffer = new THREE.Vector2();
  follow.snap(player.worldPosition(focusTarget));

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return; // page pas encore affichée
    renderer.setSize(width, height, false);
    renderer.getDrawingBufferSize(drawingBuffer);
    pipeline.setSize(drawingBuffer.x, drawingBuffer.y);
    follow.setAspect(width / height);
  }
  // Suit la taille réelle du canvas (fenêtre redimensionnée, page affichée).
  new ResizeObserver(resize).observe(canvas);
  resize();

  const state = { frozen: false, time: 0 };
  const debug = isDebugEnabled() ? createDebugPanel(renderer) : null;

  // Une image du jeu. force : avance même figé (tests image par image).
  function tick(dt, force = false) {
    const step = state.frozen && !force ? 0 : dt;
    const zoom = keyboard.takeZoomSteps();
    if (zoom) follow.zoomBy(zoom);
    state.time += step;
    player.update(step, keyboard.direction());
    follow.follow(player.worldPosition(focusTarget), step);
    village.update(state.time, follow.focus, follow.distance);
    // Le point net du flou : le buste du héros.
    sharpPoint.copy(player.worldPosition(focusTarget)).y += 0.9;
    pipeline.render(scene, follow.camera, sharpPoint, state.time);
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
