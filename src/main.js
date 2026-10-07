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
import { createDamageNumbers } from './game/damage.js';
import { createBursts } from './gfx/fx/bursts.js';
import { createCritters } from './gfx/fx/critters.js';
import { createRunes } from './gfx/fx/runes.js';
import { createDaylight, daylightAt, DAY_PERIOD } from './world/daylight.js';
import { barColors } from './data/palette.js';
import { createImpacts, createSlash, createSword } from './gfx/weapon.js';
import { MOOR_ENEMIES, SWORDS } from './data/enemies.js';
import { gains, habiller, tenues } from './data/tokens.js';
import { createInterior } from './world/interior.js';
import { ROOMS } from './world/rooms.js';
import { createGameState, discover as noteDiscovery, hasAllScrolls, questStatus, resetGameState, saveGameState } from './game/state.js';
import { createOverlayHost } from './game/overlays.js';
import { inRect, MOOR_KEY, PLACE_COUNT, roomKey } from './world/places.js';
import { loadSettings, saveSettings } from './game/settings.js';
import { createTitleScreen } from './game/title.js';
import { createAreaBanner } from './game/banner.js';
import {
  ANVIL, BARRELS, CAMPFIRE, CRATES, GATE, HAYSTACKS, HEARTH, HOUSES, MARKET_STALLS, ORCHARD, PIGEONS, REGIONS, SPARKS,
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
  const impacts = createImpacts();
  // La barre des clartés, à plat sous les pieds du héros, sur la lande (gfx/healthbar.js).
  const heroBar = createHealthBar(barColors.clarte, { ground: true });
  // Les bouffées de poussière et de feuilles (version 2.8, gfx/fx/bursts.js),
  // qui suivent le héros de lieu en lieu comme son épée.
  const burstScale = { value: 1 };
  const bursts = createBursts(burstScale);
  scene.add(sprite.object, shadow, sword.object, slash.object, impacts.object, heroBar.object, bursts.object);
  const player = createPlayer({ sprite, shadow, village, extras: [sword.object, slash.object, impacts.object, heroBar.object, bursts.object] });

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
    burstScale.value = pointScale;
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
  // La voix d'un habitant, pour le bip de la frappe (data/characters.js, voix).
  const voiceOf = (name) => [...villagers, ...figurants].find((who) => who.nom === name)?.voix ?? 1;
  const dialogue = createDialogueBox(document.getElementById('dialogue'), { portraitOf, onType: (name) => ambience.blip(voiceOf(name)) });
  let playing = params.has('autostart');
  let quest = null;
  const canOpenOverlay = () => playing && !quest.isBusy;
  // Les panneaux posés sur le jeu (game/overlays.js) : Échap, le clic sur le
  // fond et « le jeu est-il occupé » ne vivent qu'ici.
  const overlays = createOverlayHost();
  const counter = createScrollCounter(document.getElementById('parchemins'), {
    notions, texts: textesInterface.parchemins, state: gameState, onOpen: () => canOpenOverlay() && grimoire.open(),
    onGain: () => ambience.chime('parchemin'),
  });
  const grimoireRoot = document.getElementById('grimoire');
  const grimoire = overlays.attach(createGrimoire(grimoireRoot, {
    ids: counter.ids, notions, texts: dialogues, labels: textesInterface.grimoire, state: gameState, canOpen: canOpenOverlay,
  }), grimoireRoot);
  const diplomaRoot = document.getElementById('diplome');
  const diploma = overlays.attach(createDiploma(diplomaRoot, { texts: textesInterface.diplome, notions, state: gameState }), diplomaRoot);
  // Le générique de fin, après le diplôme : les habitants y sont nommés d'après leur fiche.
  const credits = overlays.attach(createCredits(document.getElementById('generique'), {
    texts: textesInterface.generique, cast: villagers.map((character) => character.nom), state: gameState,
  }));
  // La bourse et la boutique de Berthe.
  const wallet = createWallet(document.getElementById('tokens'), { state: gameState, texts: textesInterface.tokens });
  // Les Hallucinations de la lande, et le combat (data/enemies.js, game/enemies.js, game/combat.js).
  // Une Hallucination dissipée lâche son butin : des pièces, parfois une fiole (game/pickups.js).
  const hallucinations = createEnemies(MOOR_ENEMIES, {
    world: moor, sunDirection: moor.sunDirection, post: pipeline.spriteHooks,
    onDeath: (enemy) => {
      pickups.drop(enemy.position.x, enemy.position.z, enemy.type.tokens, enemy.type.potion ?? 0);
      gameState.dissipees = (gameState.dissipees ?? 0) + 1;
      saveGameState(gameState);
    },
  });
  // Dans l'enclos d'entraînement (world/layout.js), l'épée sert aussi : les
  // mannequins prennent les coups (version 2.3, game/spots.js).
  const inTraining = () => inRect(TRAINING.rect, player.position.x, player.position.z);
  let spots = null;
  // Les chiffres de dégâts (version 2.6, game/damage.js), posés sur le canvas.
  const damage = createDamageNumbers(document.getElementById('degats'), { camera: follow.camera, canvas, texts: textesInterface.combat.degats });
  const combat = createCombat({
    player, sword, slash, impacts, state: gameState, hud: document.getElementById('clartes'), texts: textesInterface.combat,
    canFight: () => doors?.current === moor || (doors?.current === village && inTraining()),
    // Plus de clartés : retour à la porte du village (les clartés reviennent à l'arrivée, voir onChange).
    onDeath: () => doors?.travel(doors.gates.find((gate) => gate.to === village)),
    // Sauf si une fiole de réserve est là.
    onEmpty: () => spots?.drinkVial() ?? false,
    dummies: () => (doors?.current === village ? village.dummies : []),
    onDummy: (dummy) => spots?.dummyHit(dummy),
    onStrike: () => spots?.strikeStarted(),
    onDamage: (enemy, amount, kind) => {
      if (enemy) damage.show({ x: enemy.position.x, y: enemy.sprite.object.position.y + enemy.headHeight * 0.9, z: enemy.position.z }, amount, kind);
      else damage.show(player.worldPosition(focusTarget).clone().setY(focusTarget.y + 1.0), amount, kind);
    },
  });
  const pickups = createPickups({
    world: moor, sunDirection: moor.sunDirection, post: pipeline.spriteHooks, wallet,
    onCoin: () => ambience.chime('piece'),
    onPotion: () => {
      const healed = combat.heal(1);
      counter.say(textesInterface.combat.potion, healed ? textesInterface.combat.potionDetail : textesInterface.combat.potionPleine);
    },
  });
  // La forge de Ferrand : le menu Forger (game/forge.js), ouvert après ses pages ou à l'enclume.
  const forgeRoot = document.getElementById('forge');
  const forge = overlays.attach(createForge(forgeRoot, { swords: SWORDS, texts: textesInterface.forge, state: gameState, wallet }), forgeRoot);
  const shopRoot = document.getElementById('boutique');
  const shop = overlays.attach(createShop(shopRoot, {
    outfits: tenues, basePalette: hero.palette, texts: textesInterface.boutique, state: gameState, wallet, onWear: dressHero,
  }), shopRoot);
  if (gameState.tenue !== tenues[0].id) dressHero(gameState.tenue);
  // Les étincelles cachées du village (version 2.3) : des éclats posés une
  // fois pour toutes, ramassés en marchant dessus, trois Tokens chacun.
  const sparks = createPickups({
    world: village, sunDirection: village.sunDirection, post: pipeline.spriteHooks, wallet,
    onSpark: (item) => {
      gameState.etincelles.add(item.id);
      saveGameState(gameState);
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
  // Où en est la quête d'un habitant (game/state.js) : la minimap et le point
  // d'exclamation lisent la même réponse.
  const statusOf = (npc) => questStatus(gameState, npc.character.dialogue, dialogues[npc.character.dialogue], counter.ids);
  const markers = () => npcs.flatMap((npc) => {
    const kind = npc.isExtra ? null : statusOf(npc);
    if (!kind) return [];
    if (npc.world === village) return [{ x: npc.position.x, z: npc.position.z, kind }];
    const door = doors?.doors.find((d) => d.interior === npc.world);
    return door ? [{ x: door.x, z: door.z + 0.5, kind }] : [];
  });
  const mapRoot = document.getElementById('carte');
  const minimap = overlays.attach(createMinimap(document.getElementById('minimap'), mapRoot, {
    map: village.map, trees: TREES, regions: REGIONS, names: textesInterface.lieux, player, markers,
    labels: textesInterface.carte, canOpen: canOpenOverlay,
  }), mapRoot);
  quest = createQuest({
    dialogue, state: gameState, texts: dialogues, offer: textesInterface.offreLecon, scrolls: counter.ids, counter,
    host: overlays, diploma, wallet, gains, shop, shopOffer: textesInterface.boutique.offre, credits,
    forge, forgeOffer: textesInterface.forge.offre, farewell: textesInterface.auRevoir,
  });
  // Les exploits (version 2.3) : six titres, vérifiés deux fois par seconde.
  const exploits = createExploits({
    state: gameState, texts: textesInterface.exploits, counter,
    goals: { places: PLACE_COUNT, sparks: SPARKS.length, searches: BARRELS.length + CRATES.length + HAYSTACKS.length },
  });
  // La feuille de personnage (game/sheet.js) : touche F, ou le bouton livre du HUD.
  const sheetRoot = document.getElementById('feuille');
  const fiche = overlays.attach(createSheet(sheetRoot, {
    button: document.getElementById('fiche'), texts: textesInterface.feuille, notions, ids: counter.ids, state: gameState,
    outfits: tenues, outfitTexts: textesInterface.boutique.tenues, swords: SWORDS, swordTexts: textesInterface.forge.epees, combat,
    places: PLACE_COUNT, canOpen: canOpenOverlay, exploits,
  }), sheetRoot);
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
  const discover = (key) => {
    if (noteDiscovery(gameState, key)) wallet.earn(gains.decouverte);
  };
  function openChests(world) {
    for (const chest of world.chests ?? []) {
      if (gameState.coffres.has(chest.id)) continue;
      if (Math.hypot(chest.x - player.position.x, chest.z - player.position.z) > CHEST_REACH) continue;
      gameState.coffres.add(chest.id);
      wallet.earn(chest.tokens);
      ambience.chime('coffre');
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
    village, state: gameState, wallet, combat, dialogue, counter,
    texts: textesInterface.points, tokenTexts: textesInterface.tokens,
    layout: {
      well: WELL, barrels: BARRELS, crates: CRATES, haystacks: HAYSTACKS,
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
  // La matière du sol sous un point, dans le lieu courant (les pas, les feuilles).
  const surfaceAt = (x, z) => (doors?.current ?? village).map.cellAt(Math.floor(x), Math.floor(z))?.matter ?? 'grass';
  // Le mouvement de l'image précédente, pour les bouffées de poussière.
  const lastMove = { x: 0, z: 0 };
  let lastPace = 0;
  let wasRunning = false;
  const RUN_PACE = 1.3; // le facteur de vitesse à partir duquel le héros court (game/player.js)
  const allScrolls = () => hasAllScrolls(gameState, counter.ids);
  // La lumière du jour (version 2.9), les petites vies, les runes de la place.
  const daylight = createDaylight();
  const critters = createCritters({
    cat: { x: 20.6, y: 0.66, z: 14.3 }, // sur le muret de la bibliothèque
    hens: { rect: [47.9, 23.9, 52.3, 28.3], count: 3 }, // la pâture aux meules
    book: { x: 18.6, y: 1.3, z: 11.9 }, // devant la porte de la bibliothèque
    hammer: { x: 9.88, y: 0.55, z: 11.3 }, // la main de Ferrand
    groundHeight: (x, z) => village.groundHeight(x, z),
  });
  village.scene.add(critters.group, createRunes({ center: WELL, radius: 2.0 }, village.fx));
  const gepeto = npcs.find((npc) => npc.character.id === 'gepeto') ?? null;
  let sparkTimer = 0;
  const MIST = { x: (WATERFALL.x0 + WATERFALL.x1) / 2, z: WATERFALL.z + 0.3, reach: 18 }; // la brume au pied de la cascade
  // Un habitant a-t-il une quête pour le grimoire (son parchemin, ou le diplôme) encore à faire ?
  const hasQuest = (npc) => Boolean(dialogues[npc.character.dialogue]?.question) && statusOf(npc) === 'quete';
  const ambience = createAmbience(music, {
    // La rivière : du plateau au nord jusqu'à la plaine au sud.
    river: [[44.5, -30], [44.5, 22.5], [45.5, 23.5], [45.5, 80]],
    waterfall: [(WATERFALL.x0 + WATERFALL.x1) / 2, WATERFALL.z + 0.3],
    fires: [[HEARTH.x, HEARTH.z], [CAMPFIRE.x, CAMPFIRE.z]],
    anvil: [ANVIL.x, ANVIL.z],
    dovecote: [dovecoteCenter.x, dovecoteCenter.z],
  }, surfaceAt);

  // Écran titre (sauf ?autostart, pour les tests) et bandeau de lieu.
  const banner = createAreaBanner(document.getElementById('lieu'), textesInterface.lieux, { place: document.getElementById('endroit') });
  if (playing) banner.setWorld(textesInterface.lieux.village); // ?autostart : pas d'écran titre

  // Les portes des maisons : à chaque changement de lieu, les habitants
  // présents, la caméra, la minimap, les sons et le bandeau suivent.
  // Les portes de la lande : la porte ouest de la muraille, dans les deux sens.
  // Sans épée, Rocard barre le passage ; la première fois avec, il laisse un conseil.
  let refusedAt = -Infinity;
  const gates = [
    {
      from: village, to: moor, zone: GATE.zone, push: { x: -1, z: 0 }, at: MOOR_SPAWN,
      allowed: () => (gameState.epee ?? 0) > 0 && gameState.decouvertes.has(MOOR_KEY),
    },
    { from: moor, to: village, zone: MOOR_GATE, push: { x: 1, z: 0 }, at: GATE.back },
  ];
  // L'iris des portes (version 2.9) se ferme sur le héros, à l'écran.
  const irisPoint = new THREE.Vector3();
  const irisAt = () => {
    player.worldPosition(irisPoint);
    irisPoint.y += 0.5;
    irisPoint.project(follow.camera);
    return { x: (irisPoint.x * 0.5 + 0.5) * canvas.clientWidth, y: (0.5 - irisPoint.y * 0.5) * canvas.clientHeight };
  };
  doors = createDoors(document.getElementById('fondu'), {
    irisAt,
    village, rooms, houses: HOUSES, player, gates,
    onRefused(gate) {
      if (performance.now() - refusedAt < 3000 || dialogue.isOpen) return;
      refusedAt = performance.now();
      const rocard = dialogues.rocard;
      if ((gameState.epee ?? 0) > 0) {
        dialogue.open(rocard.nom, rocard.porte.avecEpee, () => {
          discover(MOOR_KEY);
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
        discover(roomKey(room));
      }
      // Sur la lande : les Hallucinations reviennent toutes, le butin au sol
      // disparaît, le combat les connaît.
      pickups.clear();
      banner.setWorld(inMoor ? textesInterface.lieux.lande : textesInterface.lieux.village);
      if (inMoor) {
        banner.showRoom('lande');
        banner.setWorld(textesInterface.lieux.lande, '');
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
    noteDiscovery(gameState, roomKey(home)); // sa propre maison ne se découvre pas
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
        // L'étiquette du lieu courant (version 2.6) : le village, sauf si une
        // porte a déjà dit autre chose (la partie commence dans la maison).
        if (doors.current === village && !doors.room) banner.setWorld(textesInterface.lieux.village);
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
    const frozen = interaction.isTalking || !playing || doors.isBusy;
    // Sur la lande avec une épée, une planche qui la dessine (gfx/sprites.js)
    // montre le héros l'arme à la main ; sinon l'épée est un sprite à part.
    combat.setDrawnSword(heroSheet.armed);
    player.setArmed(heroSheet.armed && combat.armed && !frozen);
    player.update(step, frozen || combat.isAttacking ? STANDING : wanted);
    // Pendant un coup, la planche montre l'élan puis la frappe.
    if (combat.frame !== null) sprite.setFrame(DIRECTIONS.indexOf(player.facing), combat.frame);
    for (const npc of activeNpcs) {
      npc.update(step, state.time, player.position);
      const quest = hasQuest(npc);
      if (npc.quest && !quest) ambience.chime('quete'); // la quête est faite : le point s'efface avec un son
      npc.setQuest(quest);
    }
    // La lumière qui tourne (version 2.9), la vie du village, les runes, les
    // étincelles de Gépété, la brume de la cascade.
    if (playing) village.setDaylight(daylightAt(state.heureForcee ?? state.time / DAY_PERIOD, daylight));
    if (doors.current === village) {
      critters.update(state.time, step, ambience.hammerPhase);
      sparkTimer -= step;
      if (sparkTimer <= 0 && gepeto?.world === village) {
        sparkTimer = 0.28;
        gepeto.headPoint(focusTarget);
        bursts.emit('etincelles', focusTarget.x - 0.3, focusTarget.y + 0.05, focusTarget.z + 0.05);
      }
      if (Math.hypot(player.position.x - MIST.x, player.position.z - MIST.z) < MIST.reach && Math.random() < step * 9) {
        bursts.emit('brume', MIST.x - 1.4 + Math.random() * 2.8, 0.05, MIST.z + Math.random() * 0.8);
      }
    }
    // Les bouffées (version 2.8) : de la poussière quand le héros tourne court
    // ou part en courant, des feuilles quand il traverse l'herbe.
    if (!frozen) {
      const pace = Math.hypot(wanted.x, wanted.z);
      const running = pace >= RUN_PACE;
      const here = player.worldPosition(focusTarget);
      if (pace > 0.01 && lastPace > 0.01) {
        const dot = (wanted.x * lastMove.x + wanted.z * lastMove.z) / (pace * lastPace);
        if (dot < -0.2) bursts.emit('poussiere', here.x, here.y, here.z, { x: lastMove.x / lastPace, z: lastMove.z / lastPace });
      }
      if (running && !wasRunning && pace > 0.01) bursts.emit('poussiere', here.x, here.y, here.z, { x: -wanted.x / pace, z: -wanted.z / pace });
      if (pace > 0.01 && surfaceAt(player.position.x, player.position.z) === 'grass' && Math.random() < step * (running ? 9 : 5)) {
        bursts.emit('feuilles', here.x, here.y + 0.15, here.z);
      }
      // Tous les parchemins réunis : une poussière d'étoiles suit le héros.
      if (pace > 0.01 && allScrolls() && Math.random() < step * 14) bursts.emit('etoiles', here.x, here.y + 0.3, here.z);
      lastMove.x = wanted.x;
      lastMove.z = wanted.z;
      lastPace = pace;
      wasRunning = running;
    }
    bursts.update(step);
    heroBar.update(step);
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
    damage.update(dt);
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
    doors.current.update(state.time, follow.focus, follow.distance, player.worldPosition(focusTarget));
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
