// Démarrage de The Legend of Elelhem : vérifie WebGL2, assemble le monde, le
// héros et les habitants, puis lance la boucle. Post-traitement (flou de profondeur,
// bloom, étalonnage) ; ?nofx pour le rendu direct ; ?reset repart d'une partie
// neuve.

import * as THREE from 'three';
import { createKeyboard, createLoadGate, createTouchControls, onTap } from './core/input.js';
import { installTouchGuards, trackTouchScreen } from './core/guards.js';
import { createRenderer, MAX_PIXEL_RATIO } from './core/renderer.js';
import { createQualityGovernor } from './core/quality.js';
import { trackViewportHeight } from './core/viewport.js';
import { createAudio } from './core/audio.js';
import { createAmbience } from './core/ambience.js';
import { createPipeline, SPRITE_LAYER } from './gfx/post/pipeline.js';
import { createFollowCamera } from './core/camera.js';
import { createVillage } from './world/village.js';
import { createCharacterSheet, DIRECTIONS } from './gfx/sprites.js';
import { createBlobShadow, createSprite } from './gfx/billboard.js';
import { createPlayer } from './game/player.js';
import { createNpc } from './game/npc.js';
import { createDialogueBox } from './game/dialogue.js';
import { createActionButton, createInteractionHint, createNameLabel } from './game/ui.js';
import { createInteraction } from './game/interaction.js';
import { createQuest } from './game/quest.js';
import { createScrollCounter } from './game/scrolls.js';
import { createDiploma } from './game/diploma.js';
import { createGrimoire } from './game/grimoire.js';
import { createCredits } from './game/credits.js';
import { createChatter } from './game/chatter.js';
import { createMinimap } from './game/minimap.js';
import { createDoors } from './game/doors.js';
import { createWallet } from './game/wallet.js';
import { createShop } from './game/shop.js';
import { createMoor, MOOR_GATE, MOOR_SPAWN } from './world/moor.js';
import { createEnemies } from './game/enemies.js';
import { createCombat } from './game/combat.js';
import { createForge } from './game/forge.js';
import { createSheet } from './game/sheet.js';
import { createKeyGuide, TOGGLE_KEY as KEY_GUIDE_TOGGLE } from './game/keys.js';
import { createPickups } from './game/pickups.js';
import { createSpots } from './game/spots.js';
import { createExploits } from './game/exploits.js';
import { createHealthBar } from './gfx/healthbar.js';
import { barColors } from './data/palette.js';
import { createSlash, createSword } from './gfx/weapon.js';
import { MOOR_ENEMIES, SWORDS } from './data/enemies.js';
import { gains, habiller, tenues } from './data/tokens.js';
import { createInterior } from './world/interior.js';
import { ROOMS } from './world/rooms.js';
import { createGameState, resetGameState, saveGameState } from './game/state.js';
import { loadSettings, saveSettings } from './game/settings.js';
import { createTitleScreen } from './game/title.js';
import { createAreaBanner } from './game/banner.js';
import {
  ANVIL, BARRELS, BENCHES, CAMPFIRE, CRATES, GATE, HAYSTACKS, HEARTH, HOUSES, MARKET_STALLS, ORCHARD, PIGEONS, REGIONS, SPARKS,
  TOWERS, TRAINING, TRAINING_SPOT, TREES, WATERFALL, WELL,
} from './world/layout.js';
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
const INTERIOR_FRAMING = 0.74; // dans une pièce, la caméra se rapproche (pièces agrandies en 1.2 ; un peu moins en 2.5, pour voir le dehors deviné autour)
const FIRST_TALK_DELAY_MS = 700; // au réveil, Claudette parle après un instant
const CHEST_REACH = 1.0; // un coffre s'ouvre quand on arrive à cette distance

const canvas = document.getElementById('scene');
trackViewportHeight();
installTouchGuards();
trackTouchScreen();

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
  // ?vignette : l'écran titre recomposé pour l'image de partage (styles.css,
  // outils/vignette.mjs).
  if (params.has('vignette')) document.documentElement.dataset.vignette = '';
  const narrowScreen = Math.min(window.innerWidth, window.innerHeight) < NARROW_SCREEN;

  const renderer = createRenderer(canvas, { postProcessing });
  renderer.setClearColor(backgroundColor);
  const pipeline = createPipeline(renderer, { enabled: postProcessing, view: params.get('view') ?? 'final', narrowScreen });
  const scene = new THREE.Scene();

  const village = createVillage(scene, { narrowScreen });
  // Les intérieurs (world/rooms.js), bâtis avec les matériaux du village.
  const rooms = Object.fromEntries(Object.entries(ROOMS).map(([id, room]) => [id, createInterior(room, { materials: village.materials })]));
  const worldOf = (lieu) => (lieu ? rooms[lieu] : village);
  // La lande hors les murs (world/moor.js) : la zone d'action, par la porte ouest.
  const moor = createMoor({ materials: village.materials, narrowScreen });
  const follow = createFollowCamera();
  const keyboard = createKeyboard();
  const controls = createTouchControls(canvas, document.getElementById('stick'));
  // Main gauche : joystick à droite, bouton d'action à gauche (styles.css lit
  // html[data-main]). Réglage de l'appareil, gardé hors de la partie.
  const settings = loadSettings();
  const setLeftHanded = (on) => {
    settings.mainGauche = on;
    document.documentElement.dataset.main = on ? 'gauche' : 'droite';
    controls.setLeftHanded(on);
    saveSettings(settings);
  };
  setLeftHanded(settings.mainGauche);

  const gameState = createGameState({ restore: !params.has('reset') });
  const sheet = createCharacterSheet(hero);
  const sheets = { [hero.id]: sheet };
  let heroSheet = sheet; // la planche portée en ce moment (la tenue)
  // Le héros a un fantôme : sa silhouette reste visible derrière un mur ou un arbre.
  const sprite = createSprite(sheet, village.sunDirection, pipeline.spriteHooks, { ghost: true });
  // La tenue du héros (data/tokens.js) : une palette, et depuis la version 1.1
  // une allure (cape, chapeau, robe), qui remplacent les siennes.
  const dressHero = (id) => {
    const outfit = tenues.find((t) => t.id === id);
    const dressed = habiller(hero, outfit);
    heroSheet = dressed === hero ? sheet : createCharacterSheet(dressed);
    sprite.setSheet(heroSheet);
  };
  sprite.object.layers.set(SPRITE_LAYER);
  sprite.ghost.layers.set(SPRITE_LAYER);
  const shadow = createBlobShadow();
  // L'épée et la lame de lumière de ses coups (gfx/weapon.js) suivent le héros de lieu en lieu.
  const sword = createSword(village.sunDirection, pipeline.spriteHooks);
  sword.object.layers.set(SPRITE_LAYER);
  const slash = createSlash();
  // La barre des clartés, à plat sous les pieds du héros, sur la lande (gfx/healthbar.js).
  const heroBar = createHealthBar(barColors.clarte, { ground: true });
  scene.add(sprite.object, shadow, sword.object, slash.object, heroBar.object);
  const player = createPlayer({ sprite, shadow, village, extras: [sword.object, slash.object, heroBar.object] });

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
    const pointScale = drawingBuffer.y / (2 * Math.tan(THREE.MathUtils.degToRad(follow.camera.fov / 2)));
    for (const world of [village, moor, ...Object.values(rooms)]) world.setPointScale(pointScale);
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
  // Le portrait de qui parle, par son nom affiché : une illustration par
  // habitant qui a un dialogue (assets/portraits/), aucune pour les figurants.
  const portraitOf = (name) => {
    const who = villagers.find((v) => v.nom === name);
    return who ? `assets/portraits/${who.id}.png` : null;
  };
  const dialogue = createDialogueBox(document.getElementById('dialogue'), { portraitOf });
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
  // Le générique de fin, après le diplôme : les habitants y sont nommés d'après leur fiche.
  const credits = createCredits(document.getElementById('generique'), {
    texts: textesInterface.generique, cast: villagers.map((character) => character.nom), state: gameState,
  });
  // La bourse et la boutique de Berthe.
  const wallet = createWallet(document.getElementById('tokens'), { state: gameState, texts: textesInterface.tokens });
  // Les Hallucinations de la lande, et le combat (data/enemies.js, game/enemies.js, game/combat.js).
  // Une Hallucination dissipée lâche son butin : des pièces, parfois une fiole (game/pickups.js).
  const hallucinations = createEnemies(MOOR_ENEMIES, {
    world: moor, sunDirection: moor.sunDirection, post: pipeline.spriteHooks,
    onDeath: (enemy) => {
      pickups.drop(enemy.position.x, enemy.position.z, enemy.type.tokens, enemy.type.potion ?? 0);
      gameState.dissipees = (gameState.dissipees ?? 0) + 1;
    },
  });
  // Dans l'enclos d'entraînement (world/layout.js), l'épée sert aussi : les
  // mannequins prennent les coups (version 2.3, game/spots.js).
  const inTraining = () => {
    const [x0, z0, x1, z1] = TRAINING.rect;
    const { x, z } = player.position;
    return x >= x0 && x <= x1 && z >= z0 && z <= z1;
  };
  let spots = null;
  const combat = createCombat({
    player, sword, slash, state: gameState, hud: document.getElementById('clartes'), texts: textesInterface.combat,
    canFight: () => doors?.current === moor || (doors?.current === village && inTraining()),
    // Plus de clartés : retour à la porte du village (les clartés reviennent à l'arrivée, voir onChange).
    onDeath: () => doors?.travel(doors.gates.find((gate) => gate.to === village)),
    // Sauf si une fiole de réserve est là.
    onEmpty: () => spots?.drinkVial() ?? false,
    dummies: () => (doors?.current === village ? village.dummies : []),
    onDummy: (dummy) => spots?.dummyHit(dummy),
    onStrike: () => spots?.strikeStarted(),
  });
  const pickups = createPickups({
    world: moor, sunDirection: moor.sunDirection, post: pipeline.spriteHooks, wallet,
    onPotion: () => {
      const healed = combat.heal(1);
      counter.say(textesInterface.combat.potion, healed ? textesInterface.combat.potionDetail : textesInterface.combat.potionPleine);
    },
  });
  // La forge de Ferrand : le menu Forger (game/forge.js), ouvert après ses pages ou à l'enclume.
  const forge = createForge(document.getElementById('forge'), { swords: SWORDS, texts: textesInterface.forge, state: gameState, wallet });
  const shop = createShop(document.getElementById('boutique'), {
    outfits: tenues, basePalette: hero.palette, texts: textesInterface.boutique, state: gameState, wallet, onWear: dressHero,
  });
  if (gameState.tenue !== tenues[0].id) dressHero(gameState.tenue);
  // Les étincelles cachées du village (version 2.3) : des éclats posés une
  // fois pour toutes, ramassés en marchant dessus, trois Tokens chacun.
  const sparks = createPickups({
    world: village, sunDirection: village.sunDirection, post: pipeline.spriteHooks, wallet,
    onSpark: (item) => {
      gameState.etincelles.add(item.id);
      wallet.earn(gains.etincelle);
      counter.say(textesInterface.tokens.etincelle, textesInterface.tokens.etincelleDetail(gameState.etincelles.size, SPARKS.length));
    },
  });
  SPARKS.forEach(([x, z], i) => {
    const id = `etincelle:${i}`;
    if (!gameState.etincelles.has(id)) sparks.place(x, z, id);
  });
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
    overlays: [diploma, grimoire, minimap, shop, credits, forge], diploma, wallet, gains, shop, shopOffer: textesInterface.boutique.offre, credits,
    forge, forgeOffer: textesInterface.forge.offre,
  });
  // Les exploits (version 2.3) : six titres, vérifiés deux fois par seconde.
  const exploits = createExploits({
    state: gameState, texts: textesInterface.exploits, counter, save: () => saveGameState(gameState),
    goals: { places: REGIONS.length + Object.keys(ROOMS).length + 1, sparks: SPARKS.length, searches: BARRELS.length + CRATES.length + HAYSTACKS.length },
  });
  // La feuille de personnage (game/sheet.js) : touche F, ou le bouton livre du HUD.
  const fiche = createSheet(document.getElementById('feuille'), {
    button: document.getElementById('fiche'), texts: textesInterface.feuille, notions, ids: counter.ids, state: gameState,
    outfits: tenues, outfitTexts: textesInterface.boutique.tenues, swords: SWORDS, swordTexts: textesInterface.forge.epees, combat,
    places: REGIONS.length + Object.keys(ROOMS).length + 1, canOpen: canOpenOverlay, exploits,
  });
  quest.overlays.push(fiche);
  // La légende des touches (game/keys.js), sur ordinateur seulement.
  const keyGuide = createKeyGuide(document.getElementById('touches'), {
    texts: textesInterface.touches,
    collapsed: settings.touchesRepliees,
    onCollapse(on) {
      settings.touchesRepliees = on;
      saveSettings(settings);
    },
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
      // Le coffre de la cascade (version 2.3) rend aussi une tenue.
      if (chest.tenue) {
        gameState.tenues.add(chest.tenue);
        saveGameState(gameState);
        counter.say(textesInterface.tokens.coffre, textesInterface.tokens.tenueTrouvee(chest.tokens, textesInterface.boutique.tenues[chest.tenue].nom));
      } else {
        counter.say(textesInterface.tokens.coffre, textesInterface.tokens.contenu(chest.tokens));
      }
    }
  }
  let interaction = null;
  const hint = createInteractionHint(document.getElementById('indice'), () => interaction.request());
  const actionButton = createActionButton(document.getElementById('action'), () => interaction.request());
  const label = createNameLabel(document.getElementById('nom'));
  interaction = createInteraction({
    player, npcs: activeNpcs, hint, label, dialogue, quest, talkLabel: textesInterface.parlerA, camera: follow.camera, canvas,
    button: actionButton, idleLabel: textesInterface.action,
    currentWorld: () => doors?.current,
    // L'enclume de la forge : « Forger » ouvre le menu de Ferrand.
    hotspots: [{
      world: rooms.forge, x: ROOMS.forge.props.find((p) => p.type === 'anvil').x, z: ROOMS.forge.props.find((p) => p.type === 'anvil').z, y: 1.1, radius: 1.3,
      label: textesInterface.forge.enclume, action: () => canOpenOverlay() && forge.open(),
    }],
  });
  // Les points d'action du village (version 2.3, game/spots.js) : le puits à
  // vœux, le feu et les bancs, les cachettes, la pomme, les fioles, le défi.
  spots = createSpots({
    village, player, state: gameState, wallet, combat, dialogue, counter, follow,
    texts: textesInterface.points, tokenTexts: textesInterface.tokens, save: () => saveGameState(gameState),
    layout: {
      well: WELL, campfire: CAMPFIRE, benches: BENCHES, barrels: BARRELS, crates: CRATES, haystacks: HAYSTACKS,
      apple: ORCHARD.apple, vialStall: MARKET_STALLS.find((stall) => stall.goods === 'fioles'), training: TRAINING_SPOT,
    },
  });
  interaction.hotspots.push(...spots.hotspots);
  // Frapper : la touche J ou X, un clic de souris sur le village, le bouton épée sur écran tactile.
  const attackButton = document.getElementById('attaque');
  attackButton.setAttribute('aria-label', textesInterface.combat.frapper);
  onTap(attackButton, () => combat.request());
  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button === 0 && playing) combat.request();
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
    river: [[44.5, -30], [44.5, 22.5], [45.5, 23.5], [45.5, 80]],
    waterfall: [(WATERFALL.x0 + WATERFALL.x1) / 2, WATERFALL.z + 0.3],
    fires: [[HEARTH.x, HEARTH.z], [CAMPFIRE.x, CAMPFIRE.z]],
    anvil: [ANVIL.x, ANVIL.z],
    dovecote: [dovecoteCenter.x, dovecoteCenter.z],
  }, (x, z) => (doors?.current ?? village).map.cellAt(Math.floor(x), Math.floor(z))?.matter ?? 'grass');

  // Écran titre (sauf ?autostart, pour les tests) et bandeau de lieu.
  const banner = createAreaBanner(document.getElementById('lieu'), REGIONS, textesInterface.lieux);

  // Les portes des maisons : à chaque changement de lieu, les habitants
  // présents, la caméra, la minimap, les sons et le bandeau suivent.
  // Les portes de la lande : la porte ouest de la muraille, dans les deux sens.
  // Sans épée, Rocard barre le passage ; la première fois avec, il laisse un conseil.
  let refusedAt = -Infinity;
  const gates = [
    {
      from: village, to: moor, zone: GATE.zone, push: { x: -1, z: 0 }, at: MOOR_SPAWN,
      allowed: () => (gameState.epee ?? 0) > 0 && gameState.decouvertes.has('lieu:lande'),
    },
    { from: moor, to: village, zone: MOOR_GATE, push: { x: 1, z: 0 }, at: GATE.back },
  ];
  doors = createDoors(document.getElementById('fondu'), {
    village, rooms, houses: HOUSES, player, gates,
    onRefused(gate) {
      if (performance.now() - refusedAt < 3000 || dialogue.isOpen) return;
      refusedAt = performance.now();
      const rocard = dialogues.rocard;
      if ((gameState.epee ?? 0) > 0) {
        dialogue.open(rocard.nom, rocard.porte.avecEpee, () => {
          discover('lieu:lande');
          doors.travel(gate);
        });
      } else {
        dialogue.open(rocard.nom, rocard.porte.sansEpee);
      }
    },
    onChange(world, room) {
      const inMoor = world === moor;
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
      pipeline.setInterior(Boolean(room)); // dedans, la pièce se voit nette
      follow.snap(player.worldPosition(focusTarget));
      minimap.setVisible(playing && !room && !inMoor);
      ambience.setIndoors(room || inMoor ? { fires: world.fires } : null);
      if (room) {
        banner.showRoom(world.room.lieu);
        discover(`piece:${room}`);
      }
      // Sur la lande : les Hallucinations reviennent toutes, le butin au sol
      // disparaît, le combat les connaît.
      pickups.clear();
      if (inMoor) {
        banner.showRoom('lande');
        hallucinations.reset();
        combat.setEnemies(hallucinations);
        spots.regrowApple(); // la pomme du verger repousse à chaque sortie
      } else {
        combat.setEnemies(null);
      }
      // Revenu sans clartés : on reprend ses esprits à la porte.
      if (!inMoor && combat.clartes === 0) {
        combat.restore();
        counter.say(textesInterface.combat.reveil, textesInterface.combat.reveilDetail);
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
    fiche.showButton();
    wallet.show();
    keyGuide.show();
    minimap.setVisible(true);
    if (freshGame()) wakeUp();
  }
  if (!playing) {
    createTitleScreen(document.getElementById('titre'), {
      texts: textesInterface,
      state: gameState,
      leftHanded: settings.mainGauche,
      onHandedness: setLeftHanded,
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
        // Les portraits de dialogue se chargent en tâche de fond, le jeu lancé :
        // la page elle-même ne demande aucune image avant ce geste.
        for (const who of villagers) {
          const image = new Image();
          image.decoding = 'async';
          image.src = `assets/portraits/${who.id}.png`;
        }
        music.showButton();
        counter.show();
        fiche.showButton();
        wallet.show();
        keyGuide.show();
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
    const pinch = controls.takeZoomFactor();
    if (pinch !== 1) follow.zoomByFactor(pinch);
    state.time += step;
    const pushed = controls.direction();
    // autoDirection : direction imposée par les tests scriptés (__lia.walk).
    const wanted = state.autoDirection ?? (pushed.x !== 0 || pushed.z !== 0 ? pushed : keyboard.direction());
    const frozen = interaction.isTalking || !playing || doors.isBusy || spots.isResting;
    // Sur la lande avec une épée, une planche qui la dessine (gfx/sprites.js)
    // montre le héros l'arme à la main ; sinon l'épée est un sprite à part.
    combat.setDrawnSword(heroSheet.armed);
    player.setArmed(heroSheet.armed && combat.armed && !frozen);
    player.update(step, frozen || combat.isAttacking ? STANDING : wanted);
    // Pendant un coup, la planche montre l'élan puis la frappe.
    if (combat.frame !== null) sprite.setFrame(DIRECTIONS.indexOf(player.facing), combat.frame);
    for (const npc of activeNpcs) npc.update(step, state.time, player.position);
    if (playing && keyboard.takeKey('KeyJ', 'KeyX')) combat.request();
    combat.update(step, frozen);
    if (doors.current === moor && !frozen) {
      hallucinations.update(step, state.time, player.position, (enemy) => combat.takeHit(enemy));
      pickups.update(step, state.time, player.position, !doors.isBusy);
    }
    if (doors.current === village) sparks.update(step, state.time, player.position, !doors.isBusy && playing);
    spots.update(step);
    if (playing) exploits.update(step);
    // La barre des clartés sous les pieds, sur la lande seulement, un peu vers le bas de l'écran.
    heroBar.setVisible(doors.current === moor && combat.hasSword);
    if (heroBar.visible) {
      heroBar.setRatio(combat.ratio);
      player.worldPosition(focusTarget);
      heroBar.object.position.set(focusTarget.x, focusTarget.y + 0.03, focusTarget.z + 0.5);
    }
    attackButton.hidden = !(playing && doors.current === moor && combat.hasSword);
    keyGuide.setFighting(doors.current === moor && combat.hasSword);
    keyGuide.setFaded(interaction.isTalking || quest.isBusy);
    follow.follow(player.worldPosition(focusTarget), step);
    // Après la caméra : la bulle se pose sur l'image qui va être dessinée.
    // Le temps de la conversation est réel : le gel du temps ne fige pas le texte.
    if (playing) {
      if (keyboard.takeCancel()) dialogue.close();
      interaction.update(dt, keyboard.takeAction());
      if (keyboard.takeKey('KeyF')) fiche.toggle();
      if (keyboard.takeKey(KEY_GUIDE_TOGGLE)) keyGuide.toggle();
      if (!doors.room && doors.current !== moor) {
        banner.update(player.position);
        discover(banner.current);
        openChests(doors.current); // le coffre de la cascade
      } else if (doors.room) {
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
    counter, diploma, quest, grimoire, chatter, minimap, doors, rooms, wallet, shop, controls, actionButton, setLeftHanded, credits, dressHero,
    moor, combat, forge, fiche, hallucinations, pickups, spots, sparks, exploits,
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
