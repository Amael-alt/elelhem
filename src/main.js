// Démarrage du Village de LIA : vérifie WebGL2, assemble le monde, le héros et
// les habitants, puis lance la boucle. Post-traitement (flou de profondeur,
// bloom, étalonnage) ; ?nofx pour le rendu direct ; ?reset repart d'une partie
// neuve.

import * as THREE from 'three';
import { createKeyboard, createLoadGate } from './core/input.js';
import { createRenderer } from './core/renderer.js';
import { createPipeline, SPRITE_LAYER } from './gfx/post/pipeline.js';
import { createFollowCamera } from './core/camera.js';
import { createVillage } from './world/village.js';
import { createCharacterSheet } from './gfx/sprites.js';
import { createBlobShadow, createSprite } from './gfx/billboard.js';
import { createPlayer } from './game/player.js';
import { createNpc } from './game/npc.js';
import { createDialogueBox } from './game/dialogue.js';
import { createInteractionHint } from './game/ui.js';
import { createInteraction } from './game/interaction.js';
import { createGameState } from './game/state.js';
import { createDebugPanel, installDebugApi, isDebugEnabled } from './game/debug.js';
import { backgroundColor } from './data/palette.js';
import { hero, villagers } from './data/characters.js';
import { dialogues } from './data/dialogues.js';

// Installée avant tout le reste, pour que rien ne passe avant elle.
const gate = createLoadGate(6);

const MAX_FRAME_SECONDS = 0.1; // au retour d'un onglet en veille, pas de saut
const NARROW_SCREEN = 600; // en dessous (en pixels CSS), ombres moins définies
const STANDING = { x: 0, z: 0 }; // direction du héros pendant une conversation

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

  const gameState = createGameState({ restore: !params.has('reset') });
  const sheet = createCharacterSheet(hero);
  const sheets = { [hero.id]: sheet };
  const sprite = createSprite(sheet, village.sunDirection, pipeline.spriteHooks);
  sprite.object.layers.set(SPRITE_LAYER);
  const shadow = createBlobShadow();
  scene.add(sprite.object, shadow);
  const player = createPlayer({ sprite, shadow, village });

  // Les habitants : de la donnée (data/characters.js), une planche chacun.
  const npcs = villagers.map((character) => {
    const npcSheet = createCharacterSheet(character);
    sheets[character.id] = npcSheet;
    const npc = createNpc({ character, sheet: npcSheet, village, sunDirection: village.sunDirection, post: pipeline.spriteHooks });
    scene.add(...npc.objects);
    return npc;
  });

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
    village.setPointScale(drawingBuffer.y / (2 * Math.tan(THREE.MathUtils.degToRad(follow.camera.fov / 2))));
    follow.setAspect(width / height);
  }
  // Suit la taille réelle du canvas (fenêtre redimensionnée, page affichée).
  new ResizeObserver(resize).observe(canvas);
  resize();

  const state = { frozen: false, time: 0 };
  const debug = isDebugEnabled() ? createDebugPanel(renderer) : null;

  // Conversations : boîte de dialogue et bulle en DOM, logique dans interaction.js.
  const dialogue = createDialogueBox(document.getElementById('dialogue'));
  let interaction = null;
  const hint = createInteractionHint(document.getElementById('indice'), () => interaction.request());
  interaction = createInteraction({
    player, npcs, hint, dialogue, state: gameState, texts: dialogues, camera: follow.camera, canvas,
  });

  // Une image du jeu. force : avance même figé (tests image par image).
  function tick(dt, force = false) {
    const step = state.frozen && !force ? 0 : dt;
    const zoom = keyboard.takeZoomSteps();
    if (zoom) follow.zoomBy(zoom);
    state.time += step;
    player.update(step, interaction.isTalking ? STANDING : keyboard.direction());
    for (const npc of npcs) npc.update(step, state.time, player.position);
    follow.follow(player.worldPosition(focusTarget), step);
    // Après la caméra : la bulle se pose sur l'image qui va être dessinée.
    // Le temps de la conversation est réel : le gel du temps ne fige pas le texte.
    if (keyboard.takeCancel()) dialogue.close();
    interaction.update(dt, keyboard.takeAction());
    village.update(state.time, follow.focus, follow.distance);
    // Le point net du flou : le buste du héros.
    sharpPoint.copy(player.worldPosition(focusTarget)).y += 0.9;
    pipeline.render(scene, follow.camera, sharpPoint, state.time);
    gate.frameRendered();
  }

  installDebugApi({
    renderer, player, follow, tick, state, sheets, focusTarget, npcs, interaction, dialogue, gameState, texts: dialogues,
  });

  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(Math.max((now - last) / 1000, 0), MAX_FRAME_SECONDS);
    last = now;
    tick(dt);
    debug?.update(dt);
  });
}
