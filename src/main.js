// Démarrage du Village de LIA : vérifie WebGL2, assemble le monde, le héros et
// les habitants, puis lance la boucle. Post-traitement (flou de profondeur,
// bloom, étalonnage) ; ?nofx pour le rendu direct ; ?reset repart d'une partie
// neuve.

import * as THREE from 'three';
import { createFloatingStick, createKeyboard, createLoadGate } from './core/input.js';
import { createRenderer, MAX_PIXEL_RATIO } from './core/renderer.js';
import { createQualityGovernor } from './core/quality.js';
import { trackViewportHeight } from './core/viewport.js';
import { createAudio } from './core/audio.js';
import { createAmbience } from './core/ambience.js';
import { createPipeline, SPRITE_LAYER } from './gfx/post/pipeline.js';
import { createFollowCamera } from './core/camera.js';
import { createVillage } from './world/village.js';
import { createCharacterSheet } from './gfx/sprites.js';
import { createBlobShadow, createSprite } from './gfx/billboard.js';
import { createPlayer } from './game/player.js';
import { createNpc } from './game/npc.js';
import { createDialogueBox } from './game/dialogue.js';
import { createInteractionHint, createNameLabel } from './game/ui.js';
import { createInteraction } from './game/interaction.js';
import { createGameState, resetGameState, saveGameState } from './game/state.js';
import { createTitleScreen } from './game/title.js';
import { createAreaBanner } from './game/banner.js';
import { ANVIL, CAMPFIRE, HEARTH, REGIONS, TOWERS, WATERFALL } from './world/layout.js';
import { createDebugPanel, installDebugApi, isDebugEnabled } from './game/debug.js';
import { backgroundColor } from './data/palette.js';
import { figurants, hero, villagers } from './data/characters.js';
import { dialogues, textesInterface } from './data/dialogues.js';

// Installée avant tout le reste, pour que rien ne passe avant elle.
const gate = createLoadGate(6);

const MAX_FRAME_SECONDS = 0.1; // au retour d'un onglet en veille, pas de saut
const NARROW_SCREEN = 600; // en dessous (en pixels CSS), ombres moins définies
const STANDING = { x: 0, z: 0 }; // direction du héros pendant une conversation

const canvas = document.getElementById('scene');
trackViewportHeight();

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
  const stick = createFloatingStick(canvas, document.getElementById('stick'));

  const gameState = createGameState({ restore: !params.has('reset') });
  const sheet = createCharacterSheet(hero);
  const sheets = { [hero.id]: sheet };
  const sprite = createSprite(sheet, village.sunDirection, pipeline.spriteHooks);
  sprite.object.layers.set(SPRITE_LAYER);
  const shadow = createBlobShadow();
  scene.add(sprite.object, shadow);
  const player = createPlayer({ sprite, shadow, village });

  // Les habitants : de la donnée (data/characters.js), une planche chacun.
  const npcs = [...villagers, ...figurants].map((character) => {
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

  // Définition de dessin : ratio de l'écran (plafonné) fois l'échelle que
  // choisit le gouverneur de qualité quand l'appareil peine.
  const basePixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
  const forcedScale = Number(params.get('scale'));
  let renderScale = 1;

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return; // page pas encore affichée
    renderer.setPixelRatio(basePixelRatio * renderScale);
    renderer.setSize(width, height, false);
    renderer.getDrawingBufferSize(drawingBuffer);
    pipeline.setSize(drawingBuffer.x, drawingBuffer.y);
    village.setPointScale(drawingBuffer.y / (2 * Math.tan(THREE.MathUtils.degToRad(follow.camera.fov / 2))));
    follow.setAspect(width / height);
  }
  // Suit la taille réelle du canvas (fenêtre redimensionnée, page affichée).
  new ResizeObserver(resize).observe(canvas);
  resize();
  const quality = createQualityGovernor({
    fixed: forcedScale > 0 && forcedScale <= 1 ? forcedScale : null,
    onChange(scale) {
      renderScale = scale;
      resize();
    },
  });

  const state = { frozen: false, time: 0, autoDirection: null };
  const debug = isDebugEnabled() ? createDebugPanel(renderer, () => quality.scale) : null;

  // Conversations : boîte de dialogue et bulle en DOM, logique dans interaction.js.
  const dialogue = createDialogueBox(document.getElementById('dialogue'));
  let interaction = null;
  const hint = createInteractionHint(document.getElementById('indice'), () => interaction.request());
  const label = createNameLabel(document.getElementById('nom'));
  interaction = createInteraction({
    player, npcs, hint, label, dialogue, state: gameState, texts: dialogues, talkLabel: textesInterface.parlerA,
    camera: follow.camera, canvas,
  });

  // Musique de fond et sons d'ambiance : lancés par le geste qui ferme l'écran titre.
  const music = createAudio('assets/audio/village-bell.mp3', document.getElementById('son'), textesInterface.musique);
  const dovecote = TOWERS.colombier;
  const ambience = createAmbience(music, {
    // La rivière : du plateau au nord jusqu'à la plaine au sud.
    river: [[31.5, -30], [31.5, 16.5], [32.5, 17.5], [32.5, 60]],
    waterfall: [(WATERFALL.x0 + WATERFALL.x1) / 2, WATERFALL.z + 0.3],
    fires: [[HEARTH.x, HEARTH.z], [CAMPFIRE.x, CAMPFIRE.z]],
    anvil: [ANVIL.x, ANVIL.z],
    dovecote: [dovecote.x + dovecote.size / 2, dovecote.z + dovecote.size / 2],
  }, (x, z) => village.map.cellAt(Math.floor(x), Math.floor(z))?.matter ?? 'grass');

  // Écran titre (sauf ?autostart, pour les tests) et bandeau de lieu.
  const banner = createAreaBanner(document.getElementById('lieu'), REGIONS, textesInterface.lieux);
  let playing = params.has('autostart');
  if (playing) music.showButton();
  if (!playing) {
    createTitleScreen(document.getElementById('titre'), {
      texts: textesInterface,
      state: gameState,
      onStart({ fresh, prenom }) {
        if (fresh) resetGameState(gameState);
        gameState.prenom = prenom;
        saveGameState(gameState);
        // La touche qui a lancé le jeu ne doit pas aussi ouvrir un dialogue.
        keyboard.takeAction();
        playing = true;
        music.start();
        music.showButton();
      },
    });
  }

  // Une image du jeu. force : avance même figé (tests image par image).
  function tick(dt, force = false) {
    const step = state.frozen && !force ? 0 : dt;
    const zoom = keyboard.takeZoomSteps();
    if (zoom) follow.zoomBy(zoom);
    state.time += step;
    const pushed = stick.direction();
    // autoDirection : direction imposée par les tests scriptés (__lia.walk).
    const wanted = state.autoDirection ?? (pushed.x !== 0 || pushed.z !== 0 ? pushed : keyboard.direction());
    player.update(step, interaction.isTalking || !playing ? STANDING : wanted);
    for (const npc of npcs) npc.update(step, state.time, player.position);
    follow.follow(player.worldPosition(focusTarget), step);
    // Après la caméra : la bulle se pose sur l'image qui va être dessinée.
    // Le temps de la conversation est réel : le gel du temps ne fige pas le texte.
    if (playing) {
      if (keyboard.takeCancel()) dialogue.close();
      interaction.update(dt, keyboard.takeAction());
      banner.update(player.position);
      music.setDucked(interaction.isTalking);
      ambience.update(player.position, dt);
    } else {
      keyboard.takeAction();
      keyboard.takeCancel();
    }
    village.update(state.time, follow.focus, follow.distance);
    // Le point net du flou : le buste du héros.
    sharpPoint.copy(player.worldPosition(focusTarget)).y += 0.9;
    pipeline.render(scene, follow.camera, sharpPoint, state.time);
    gate.frameRendered();
  }

  installDebugApi({
    renderer, player, follow, tick, state, sheets, focusTarget, npcs, interaction, dialogue, gameState, texts: dialogues, music, ambience,
  });

  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const real = Math.max((now - last) / 1000, 0);
    const dt = Math.min(real, MAX_FRAME_SECONDS);
    last = now;
    tick(dt);
    quality.update(real);
    debug?.update(dt);
  });
}
