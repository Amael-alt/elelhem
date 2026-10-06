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
import { createQuest } from './game/quest.js';
import { createScrollCounter } from './game/scrolls.js';
import { createDiploma } from './game/diploma.js';
import { createGrimoire } from './game/grimoire.js';
import { createChatter } from './game/chatter.js';
import { createMinimap } from './game/minimap.js';
import { createDoors } from './game/doors.js';
import { createWallet } from './game/wallet.js';
import { createShop } from './game/shop.js';
import { gains, tenues } from './data/tokens.js';
import { createInterior } from './world/interior.js';
import { ROOMS } from './world/rooms.js';
import { createGameState, resetGameState, saveGameState } from './game/state.js';
import { createTitleScreen } from './game/title.js';
import { createAreaBanner } from './game/banner.js';
import { ANVIL, CAMPFIRE, HEARTH, HOUSES, PIGEONS, REGIONS, TOWERS, TREES, WATERFALL } from './world/layout.js';
import { createDebugPanel, installDebugApi, isDebugEnabled } from './game/debug.js';
import { backgroundColor } from './data/palette.js';
import { figurants, hero, villagers } from './data/characters.js';
import { dialogues, repliques, textesInterface } from './data/dialogues.js';

// Installée avant tout le reste, pour que rien ne passe avant elle.
const gate = createLoadGate(6);

const MAX_FRAME_SECONDS = 0.1; // au retour d'un onglet en veille, pas de saut
const NARROW_SCREEN = 600; // en dessous (en pixels CSS), ombres moins définies
const STANDING = { x: 0, z: 0 }; // direction du héros pendant une conversation
const PIGEON_HEAR_RADIUS = 3.2; // les pigeons parlent quand on passe sous leur vol
const INTERIOR_FRAMING = 0.55; // dans une pièce, la caméra se rapproche
const FIRST_TALK_DELAY_MS = 700; // au réveil, Claudette parle après un instant
const CHEST_REACH = 1.0; // un coffre s'ouvre quand on arrive à cette distance

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
  // Les intérieurs (world/rooms.js), bâtis avec les matériaux du village.
  const rooms = Object.fromEntries(Object.entries(ROOMS).map(([id, room]) => [
    id, createInterior(room, { materials: village.materials, sunDirection: village.sunDirection }),
  ]));
  const worldOf = (lieu) => (lieu ? rooms[lieu] : village);
  const follow = createFollowCamera();
  const keyboard = createKeyboard();
  const stick = createFloatingStick(canvas, document.getElementById('stick'));

  const gameState = createGameState({ restore: !params.has('reset') });
  const sheet = createCharacterSheet(hero);
  const sheets = { [hero.id]: sheet };
  const sprite = createSprite(sheet, village.sunDirection, pipeline.spriteHooks);
  // La tenue du héros (data/tokens.js) : une palette qui remplace la sienne.
  const dressHero = (id) => {
    const outfit = tenues.find((t) => t.id === id);
    if (!outfit?.palette) {
      sprite.setSheet(sheet);
      return;
    }
    sprite.setSheet(createCharacterSheet({ ...hero, palette: { ...hero.palette, ...outfit.palette } }));
  };
  sprite.object.layers.set(SPRITE_LAYER);
  const shadow = createBlobShadow();
  scene.add(sprite.object, shadow);
  const player = createPlayer({ sprite, shadow, village });

  // Les habitants : de la donnée (data/characters.js), une planche chacun. Chacun
  // vit dans son lieu (le village ou une pièce) ; celui qui a un départ
  // (Claudette) y attend tant qu'on ne lui a pas parlé.
  const waiting = (character) => Boolean(character.depart) && !gameState.visites.has(character.id);
  const npcs = [...villagers, ...figurants].map((character) => {
    const npcSheet = createCharacterSheet(character);
    sheets[character.id] = npcSheet;
    const world = waiting(character) ? worldOf(character.depart.lieu) : worldOf(character.lieu);
    const npc = createNpc({
      character, sheet: npcSheet, village: world, sunDirection: village.sunDirection, post: pipeline.spriteHooks,
      at: waiting(character) ? character.depart : null,
    });
    world.scene.add(...npc.objects);
    return npc;
  });
  // Ceux du lieu où se trouve le héros : eux seuls bougent, parlent, s'affichent.
  const activeNpcs = [];
  const refreshActive = (world) => activeNpcs.splice(0, activeNpcs.length, ...npcs.filter((npc) => npc.world === world));
  refreshActive(village);
  let doors = null;

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

  // Conversations : boîte de dialogue et bulle en DOM, qui parle à qui dans
  // interaction.js, ce qui se dit et ce qu'on gagne dans quest.js. Le
  // compteur ouvre le grimoire ; diplôme et grimoire suspendent le jeu.
  const notions = textesInterface.parchemins.notions;
  const dialogue = createDialogueBox(document.getElementById('dialogue'));
  let playing = params.has('autostart');
  let quest = null;
  const canOpenOverlay = () => playing && !quest.isBusy;
  const counter = createScrollCounter(document.getElementById('parchemins'), {
    notions, texts: textesInterface.parchemins, state: gameState, onOpen: () => canOpenOverlay() && grimoire.open(),
  });
  const grimoire = createGrimoire(document.getElementById('grimoire'), {
    ids: counter.ids, notions, texts: dialogues, labels: textesInterface.grimoire, state: gameState, canOpen: canOpenOverlay,
  });
  const diploma = createDiploma(document.getElementById('diplome'), { texts: textesInterface.diplome, notions, state: gameState });
  // La bourse et la boutique de Berthe.
  const wallet = createWallet(document.getElementById('tokens'), { state: gameState, texts: textesInterface.tokens });
  const shop = createShop(document.getElementById('boutique'), {
    outfits: tenues, basePalette: hero.palette, texts: textesInterface.boutique, state: gameState, wallet, onWear: dressHero,
  });
  if (gameState.tenue !== tenues[0].id) dressHero(gameState.tenue);
  // La minimap : un point doré pour l'habitant qui a encore une leçon à donner,
  // un point bleu pour Claudette. Un habitant dans une pièce est montré à la
  // porte de sa maison.
  const markerKind = (npc) => {
    const key = npc.character.dialogue;
    const entry = dialogues[key];
    if (npc.isExtra || !entry) return null;
    if (entry.guide) return 'guide';
    if (entry.diplome) return !gameState.choix.has(key) && counter.ids.every((id) => gameState.parchemins.has(id)) ? 'quete' : 'fait';
    return gameState.parchemins.has(key) ? 'fait' : 'quete';
  };
  const markers = () => npcs.flatMap((npc) => {
    const kind = markerKind(npc);
    if (!kind) return [];
    if (npc.world === village) return [{ x: npc.position.x, z: npc.position.z, kind }];
    const door = doors?.doors.find((d) => d.interior === npc.world);
    return door ? [{ x: door.x, z: door.z + 0.5, kind }] : [];
  });
  const minimap = createMinimap(document.getElementById('minimap'), document.getElementById('carte'), {
    map: village.map, trees: TREES, regions: REGIONS, names: textesInterface.lieux, player, markers,
    labels: textesInterface.carte, canOpen: canOpenOverlay,
  });
  quest = createQuest({
    dialogue, state: gameState, texts: dialogues, offer: textesInterface.offreLecon, scrolls: counter.ids, counter,
    overlays: [diploma, grimoire, minimap, shop], diploma, wallet, gains, shop, shopOffer: textesInterface.boutique.offre,
  });

  // L'exploration paie : un lieu découvert (quartier ou pièce), une fois ; un
  // coffre ouvert, une fois.
  const discover = (id) => {
    if (!id || gameState.decouvertes.has(id)) return;
    gameState.decouvertes.add(id);
    wallet.earn(gains.decouverte);
  };
  function openChests(world) {
    for (const chest of world.chests ?? []) {
      if (gameState.coffres.has(chest.id)) continue;
      if (Math.hypot(chest.x - player.position.x, chest.z - player.position.z) > CHEST_REACH) continue;
      gameState.coffres.add(chest.id);
      wallet.earn(chest.tokens);
      counter.say(textesInterface.tokens.coffre, textesInterface.tokens.contenu(chest.tokens));
    }
  }
  let interaction = null;
  const hint = createInteractionHint(document.getElementById('indice'), () => interaction.request());
  const label = createNameLabel(document.getElementById('nom'));
  interaction = createInteraction({
    player, npcs: activeNpcs, hint, label, dialogue, quest, talkLabel: textesInterface.parlerA, camera: follow.camera, canvas,
  });

  // Musique de fond et sons d'ambiance : lancés par le geste qui ferme l'écran titre.
  const music = createAudio('assets/audio/village-bell.mp3', document.getElementById('son'), textesInterface.musique);
  const dovecote = TOWERS.colombier;

  // Les figurants qui ont une réplique, et les pigeons, qui parlent du milieu de leur vol.
  const dovecoteCenter = { x: dovecote.x + dovecote.size / 2, z: dovecote.z + dovecote.size / 2 };
  const chatter = createChatter(document.getElementById('replique'), {
    speakers: [
      ...npcs.filter((npc) => npc.isExtra && repliques[npc.id]).map((npc) => ({
        id: npc.id, lines: repliques[npc.id], position: npc.position, headPoint: (target) => npc.headPoint(target),
      })),
      {
        id: 'pigeons',
        lines: repliques.pigeons,
        position: { x: PIGEONS.center[0], z: PIGEONS.center[2] },
        radius: PIGEON_HEAR_RADIUS,
        headPoint: (target) => target.set(...PIGEONS.center),
      },
    ],
    player, camera: follow.camera, canvas,
  });
  const ambience = createAmbience(music, {
    // La rivière : du plateau au nord jusqu'à la plaine au sud.
    river: [[31.5, -30], [31.5, 16.5], [32.5, 17.5], [32.5, 60]],
    waterfall: [(WATERFALL.x0 + WATERFALL.x1) / 2, WATERFALL.z + 0.3],
    fires: [[HEARTH.x, HEARTH.z], [CAMPFIRE.x, CAMPFIRE.z]],
    anvil: [ANVIL.x, ANVIL.z],
    dovecote: [dovecoteCenter.x, dovecoteCenter.z],
  }, (x, z) => (doors?.current ?? village).map.cellAt(Math.floor(x), Math.floor(z))?.matter ?? 'grass');

  // Écran titre (sauf ?autostart, pour les tests) et bandeau de lieu.
  const banner = createAreaBanner(document.getElementById('lieu'), REGIONS, textesInterface.lieux);

  // Les portes des maisons : à chaque changement de lieu, les habitants
  // présents, la caméra, la minimap, les sons et le bandeau suivent.
  doors = createDoors(document.getElementById('fondu'), {
    village, rooms, houses: HOUSES, player,
    onChange(world, room) {
      // En sortant, celui qui attendait au départ (Claudette) est déjà parti
      // à son poste, si on lui a parlé.
      if (!room) {
        for (const npc of npcs) {
          const home = worldOf(npc.character.lieu);
          if (npc.character.depart && !waiting(npc.character) && npc.world !== home) {
            npc.moveTo(home, npc.character.position.x, npc.character.position.z, npc.character.direction);
          }
        }
      }
      refreshActive(world);
      follow.setFraming(room ? INTERIOR_FRAMING : 1);
      follow.snap(player.worldPosition(focusTarget));
      minimap.setVisible(playing && !room);
      ambience.setIndoors(room ? { fires: world.fires } : null);
      if (room) {
        banner.showRoom(world.room.lieu);
        discover(`piece:${room}`);
      }
      hint.hide();
      label.hide();
    },
  });

  // Une partie neuve commence dans la maison, face à Claudette, qui parle la
  // première.
  function wakeUp() {
    for (const npc of npcs) {
      const { depart } = npc.character;
      if (depart && npc.world !== worldOf(depart.lieu)) npc.moveTo(worldOf(depart.lieu), depart.x, depart.z, depart.direction);
    }
    const home = Object.keys(ROOMS).find((id) => ROOMS[id].start);
    gameState.decouvertes.add(`piece:${home}`); // sa propre maison ne se découvre pas
    doors.enter(home, { instant: true, at: ROOMS[home].start });
    setTimeout(() => {
      const guide = activeNpcs.find((npc) => npc.character.depart);
      if (guide && !dialogue.isOpen) interaction.start(guide);
    }, FIRST_TALK_DELAY_MS);
  }
  const freshGame = () => gameState.visites.size === 0;

  if (playing) {
    music.showButton();
    counter.show();
    wallet.show();
    minimap.setVisible(true);
    if (freshGame()) wakeUp();
  }
  if (!playing) {
    createTitleScreen(document.getElementById('titre'), {
      texts: textesInterface,
      state: gameState,
      onStart({ fresh, prenom }) {
        if (fresh) {
          resetGameState(gameState);
          dressHero(gameState.tenue);
        }
        gameState.prenom = prenom;
        saveGameState(gameState);
        // La touche qui a lancé le jeu ne doit pas aussi ouvrir un dialogue.
        keyboard.takeAction();
        playing = true;
        music.start();
        music.showButton();
        counter.show();
        wallet.show();
        minimap.setVisible(!doors.room);
        if (freshGame()) wakeUp();
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
    player.update(step, interaction.isTalking || !playing || doors.isBusy ? STANDING : wanted);
    for (const npc of activeNpcs) npc.update(step, state.time, player.position);
    follow.follow(player.worldPosition(focusTarget), step);
    // Après la caméra : la bulle se pose sur l'image qui va être dessinée.
    // Le temps de la conversation est réel : le gel du temps ne fige pas le texte.
    if (playing) {
      if (keyboard.takeCancel()) dialogue.close();
      interaction.update(dt, keyboard.takeAction());
      if (!doors.room) {
        banner.update(player.position);
        discover(banner.current);
      } else {
        openChests(doors.current);
      }
      if (!interaction.isTalking) doors.update(wanted);
      chatter.update(dt, quest.isBusy || doors.room !== null);
      minimap.update(dt);
      music.setDucked(interaction.isTalking);
      ambience.update(player.position, dt);
    } else {
      keyboard.takeAction();
      keyboard.takeCancel();
    }
    doors.current.update(state.time, follow.focus, follow.distance);
    // Le point net du flou : le buste du héros.
    sharpPoint.copy(player.worldPosition(focusTarget)).y += 0.9;
    pipeline.render(doors.current.scene, follow.camera, sharpPoint, state.time);
    gate.frameRendered();
  }

  installDebugApi({
    renderer, player, follow, tick, state, sheets, focusTarget, npcs, interaction, dialogue, gameState, texts: dialogues, music, ambience,
    counter, diploma, quest, grimoire, chatter, minimap, doors, rooms, wallet, shop,
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
