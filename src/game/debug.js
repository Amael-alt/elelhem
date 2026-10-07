// Outils de mesure et de test.
// - Le panneau ?debug : images par seconde, coût d'une image, appels de
//   dessin, triangles et définition réelle du canvas.
// - window.__lia : commandes pour des captures reproductibles et des tests
//   scriptés (téléporter, figer le temps, avancer image par image, mesurer,
//   ouvrir une conversation, contrôler les textes).

import * as THREE from 'three';
import { repliques } from '../data/dialogues.js';
import { createCharacterSheet, DIRECTIONS, FRAME_HEIGHT, FRAME_WIDTH } from '../gfx/sprites.js';
import { figurants, hero, villagers } from '../data/characters.js';
import { habiller, tenues } from '../data/tokens.js';

const REFRESH_SECONDS = 0.5;

export function isDebugEnabled() {
  return new URLSearchParams(window.location.search).has('debug');
}

// scale : fonction qui donne l'échelle de rendu en cours.
export function createDebugPanel(renderer, scale = () => 1) {
  const panel = document.getElementById('debug');
  panel.hidden = false;

  let frames = 0;
  let elapsed = 0;

  return {
    // À appeler juste après renderer.render(), tant que renderer.info
    // contient encore les chiffres de l'image qui vient d'être dessinée.
    update(dt) {
      frames += 1;
      elapsed += dt;
      if (elapsed < REFRESH_SECONDS) return;

      const fps = frames / elapsed;
      const { calls, triangles } = renderer.info.render;
      const canvas = renderer.domElement;
      panel.textContent = [
        `images/s  ${fps.toFixed(0)}  (${(1000 / fps).toFixed(1)} ms)`,
        `appels    ${calls}`,
        `triangles ${triangles}`,
        `ratio px  ${renderer.getPixelRatio().toFixed(2)}  (échelle ${scale()})`,
        `canvas    ${canvas.width}×${canvas.height}`,
      ].join('\n');

      frames = 0;
      elapsed = 0;
    },
  };
}

// Planche de sprites agrandie dans un coin de l'écran, pour juger le dessin
// pixel par pixel. Dessinée depuis le tampon généré : aucune image chargée.
function createSheetViewer(buffer, scale = 4) {
  const canvas = document.createElement('canvas');
  canvas.width = buffer.width * scale;
  canvas.height = buffer.height * scale;
  canvas.style.cssText = 'position:fixed;right:8px;top:8px;z-index:30;image-rendering:pixelated;'
    + 'background:#8f8a9e;border:1px solid #1b1a2e;max-width:calc(100% - 16px);pointer-events:none';
  const source = document.createElement('canvas');
  source.width = buffer.width;
  source.height = buffer.height;
  source.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buffer.data), buffer.width, buffer.height), 0, 0);
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Contrôle des textes : toutes les clés présentes, trois choix dont un seul
// bon, pages courtes, aucun tiret long, et une bonne réponse qu'on ne devine
// pas à sa longueur (à CHOICE_BALANCE près de la moyenne des deux autres).
// Renvoie la liste des problèmes (vide si tout va bien).
const MAX_PAGE_LENGTH = 170;
const CHOICE_BALANCE = 0.15;
const LONG_DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

function checkDialogues(texts, characters) {
  const problems = [];
  const page = (where, text) => {
    if (typeof text !== 'string' || text.length === 0) problems.push(`${where} : page vide ou absente`);
    else if (text.length > MAX_PAGE_LENGTH) problems.push(`${where} : ${text.length} caractères (maximum ${MAX_PAGE_LENGTH})`);
    else if (LONG_DASH.test(text)) problems.push(`${where} : tiret long`);
  };
  const pages = (where, list) => {
    if (!Array.isArray(list) || list.length === 0) problems.push(`${where} : liste de pages absente`);
    else list.forEach((text, i) => page(`${where}[${i}]`, text));
  };
  const states = [
    { prenom: '', parchemins: new Set(), visites: new Map(), choix: new Map(), erreurs: new Map() },
    { prenom: 'Ada', parchemins: new Set(['a', 'b', 'c']), visites: new Map([['x', 2]]), choix: new Map(), erreurs: new Map() },
    { prenom: 'Ada', parchemins: new Set(Object.keys(texts)), visites: new Map(), choix: new Map(), erreurs: new Map() },
    { prenom: 'Ada', parchemins: new Set(Object.keys(texts)), visites: new Map(), choix: new Map(Object.keys(texts).map((key) => [key, 0])), erreurs: new Map() },
  ];
  for (const character of characters) {
    if (character.dialogue && !texts[character.dialogue]) problems.push(`${character.id} : dialogue « ${character.dialogue} » introuvable`);
  }
  for (const [key, entry] of Object.entries(texts)) {
    if (typeof entry.nom !== 'string') problems.push(`${key} : nom absent`);
    if (entry.guide) {
      states.forEach((state, n) => {
        pages(`${key}.intro(état ${n})`, entry.intro(state));
        pages(`${key}.retour(état ${n})`, entry.retour(state));
      });
      continue;
    }
    states.forEach((state, n) => {
      pages(`${key}.intro(état ${n})`, entry.intro(state));
      pages(`${key}.retour(état ${n})`, entry.retour(state));
    });
    pages(`${key}.lecon`, entry.lecon);
    pages(`${key}.recompense`, entry.recompense);
    // La maxime du grimoire doit être celle que l'habitant prononce.
    if (entry.maxime && !entry.recompense.some((text) => text.includes(entry.maxime))) problems.push(`${key}.maxime : absente de recompense`);
    const { question } = entry;
    page(`${key}.question.texte`, question?.texte);
    const choix = question?.choix ?? [];
    if (choix.length !== 3) problems.push(`${key}.question : ${choix.length} choix au lieu de 3`);
    if (choix.filter((c) => c.bon).length !== 1) problems.push(`${key}.question : il faut exactement un bon choix`);
    const right = choix.find((c) => c.bon);
    const others = choix.filter((c) => !c.bon);
    const mean = others.reduce((sum, c) => sum + c.texte.length, 0) / (others.length || 1);
    if (right && Math.abs(right.texte.length - mean) > mean * CHOICE_BALANCE) {
      problems.push(`${key}.question : la bonne réponse fait ${right.texte.length} caractères, les autres ${Math.round(mean)} en moyenne`);
    }
    choix.forEach((c, i) => {
      page(`${key}.question.choix[${i}].texte`, c.texte);
      page(`${key}.question.choix[${i}].retour`, c.retour);
    });
  }
  for (const [id, lines] of Object.entries(repliques)) pages(`repliques.${id}`, lines);
  return problems;
}

// game : { renderer, player, follow, tick, state, sheets, npcs, interaction,
// dialogue, gameState, texts }.
export function installDebugApi(game) {
  const { renderer, player, follow, tick, state, sheets, npcs, interaction, dialogue, gameState, texts, music, ambience, counter, diploma, grimoire, chatter, minimap, doors, wallet, shop, controls, actionButton, setLeftHanded, credits, dressHero } = game;
  let viewer = null;

  const info = () => ({
    x: Number(player.position.x.toFixed(3)),
    z: Number(player.position.z.toFixed(3)),
    facing: player.facing,
    moving: player.moving,
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    programs: renderer.info.programs?.length ?? 0,
  });

  // Dessine une image et la relit aussitôt, avant que le navigateur ne
  // l'efface : base des mesures sur les pixels.
  function readFrame() {
    tick(0, true);
    const gl = renderer.getContext();
    const { width, height } = renderer.domElement;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return { width, height, pixels };
  }

  window.__lia = {
    info,
    // Couleur moyenne d'un carré de pixels autour d'un point de l'écran, en
    // pixels CSS depuis le coin haut gauche.
    pixel(x, y, radius = 2) {
      const { width, height, pixels } = readFrame();
      const ratio = renderer.getPixelRatio();
      const cx = Math.round(x * ratio);
      const cy = height - 1 - Math.round(y * ratio);
      const sum = [0, 0, 0];
      let count = 0;
      for (let py = cy - radius; py <= cy + radius; py += 1) {
        for (let px = cx - radius; px <= cx + radius; px += 1) {
          if (px < 0 || py < 0 || px >= width || py >= height) continue;
          const i = (py * width + px) * 4;
          sum[0] += pixels[i];
          sum[1] += pixels[i + 1];
          sum[2] += pixels[i + 2];
          count += 1;
        }
      }
      return sum.map((v) => Math.round(v / count));
    },
    // Couleur d'un point du monde, vu par la caméra (il doit être visible).
    probe(x, y, z, radius = 1) {
      const point = new THREE.Vector3(x, y, z).project(follow.camera);
      const canvas = renderer.domElement;
      return this.pixel((point.x * 0.5 + 0.5) * canvas.clientWidth, (0.5 - point.y * 0.5) * canvas.clientHeight, radius);
    },
    // Part des pixels saturés (une composante à 250 ou plus) et blanchis
    // (les trois composantes à 250 ou plus) dans l'image.
    stats() {
      const { pixels } = readFrame();
      let saturated = 0;
      let whitened = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const high = (pixels[i] >= 250) + (pixels[i + 1] >= 250) + (pixels[i + 2] >= 250);
        if (high > 0) saturated += 1;
        if (high === 3) whitened += 1;
      }
      const percent = (count) => Number(((count / (pixels.length / 4)) * 100).toFixed(2));
      return { saturatedPercent: percent(saturated), whitenedPercent: percent(whitened), ...info() };
    },
    // Version 2.0 : la lande et le combat. lande(true) y va sans fondu, lande(false) en revient.
    lande(on = true) {
      const gate = game.doors.gates.find((g) => (on ? g.to : g.from) === game.moor);
      if (on) game.gameState.decouvertes.add('lieu:lande');
      game.doors.travel(gate, { instant: true });
      tick(0);
      return info();
    },
    // Fait tomber du butin en (x, z) sur la lande : des pièces (tokens) et une
    // fiole si potion vaut 1. Renvoie le nombre d'objets au sol.
    butin(x, z, tokens = 3, potion = 1) {
      game.pickups.drop(x, z, tokens, potion);
      return game.pickups.count;
    },
    // Forge l'épée de ce niveau (0 : aucune, 1 bois, 2 fer, 3 acier).
    epee(n = 1) {
      game.gameState.epee = n;
      return game.gameState.epee;
    },
    clartes(n) {
      if (n !== undefined) game.combat.setClartes(n);
      return game.combat.clartes;
    },
    frapper() {
      game.combat.request();
      return true;
    },
    epeeVisible() {
      return game.combat.swordVisible;
    },
    forge(on = true) {
      if (on) game.forge.open();
      else game.forge.close();
      return game.forge.isOpen;
    },
    feuille(on = true) {
      if (on) game.fiche.open();
      else game.fiche.close();
      return game.fiche.isOpen;
    },
    // La scène du lieu courant, pour fouiller dans la console.
    scene: () => game.doors.current.scene,
    // Un objet de la scène courante, par son nom : visible, nombre d'instances, rayon.
    objet(name) {
      const o = game.doors.current.scene.getObjectByName(name);
      if (!o) return null;
      const first = new THREE.Vector3();
      if (o.count) {
        const m = new THREE.Matrix4();
        o.getMatrixAt(0, m);
        first.setFromMatrixPosition(m);
      }
      const screen = first.clone().project(follow.camera);
      return { visible: o.visible, count: o.count ?? null, position: o.position.toArray().map((v) => Number(v.toFixed(2))), rayon: o.geometry?.boundingSphere?.radius ?? null, triangles: o.geometry?.index ? o.geometry.index.count / 3 : null, points: o.geometry?.drawRange?.count ?? null, premier: first.toArray().map((v) => Number(v.toFixed(2))), ecran: [Number(((screen.x * 0.5 + 0.5) * renderer.domElement.clientWidth).toFixed(0)), Number(((0.5 - screen.y * 0.5) * renderer.domElement.clientHeight).toFixed(0))] };
    },
    hallucinations() {
      return game.hallucinations.list.map((e) => ({ id: e.id, hp: e.hp, state: e.state, x: Number(e.position.x.toFixed(2)), z: Number(e.position.z.toFixed(2)) }));
    },
    teleport(x, z) {
      player.teleport(x, z);
      follow.snap(player.worldPosition(game.focusTarget));
      tick(0);
      return info();
    },
    freeze(on = true) {
      state.frozen = on;
      return state.frozen;
    },
    // Avance le jeu image par image, même quand la page ne s'anime pas
    // (onglet masqué) : base des tests scriptés.
    step(frames = 1, dt = 1 / 60) {
      for (let i = 0; i < frames; i += 1) tick(dt, true);
      return info();
    },
    // Coût moyen d'une image, GPU compris : on attend la fin du dessin en
    // relisant un pixel. Utile quand la page ne s'anime pas.
    bench(frames = 60) {
      const gl = renderer.getContext();
      const pixel = new Uint8Array(4);
      tick(0, true);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      const start = performance.now();
      for (let i = 0; i < frames; i += 1) tick(0, true);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      const ms = (performance.now() - start) / frames;
      return { msPerFrame: Number(ms.toFixed(2)), fpsCeiling: Math.round(1000 / ms), ...info() };
    },
    // Planche d'un personnage ('heros', 'gepeto'...) agrandie dans un coin.
    showSheet(on = true, id = 'heros') {
      viewer?.remove();
      viewer = null;
      if (on) {
        viewer = createSheetViewer(sheets[id].buffer);
        document.body.append(viewer);
      }
      return Boolean(viewer);
    },
    // Galerie de QA : les personnages en grand, au repos, dans leurs huit
    // directions (l'ordre de DIRECTIONS), sur un fond neutre. ids : liste
    // d'identifiants (tous par défaut) ; scale : agrandissement.
    portraits(on = true, ids = Object.keys(sheets), scale = 5) {
      document.getElementById('lia-portraits')?.remove();
      if (!on) return false;
      const canvas = document.createElement('canvas');
      canvas.id = 'lia-portraits';
      const perRow = 2;
      const cell = FRAME_WIDTH * DIRECTIONS.length * scale + 16;
      const rowHeight = FRAME_HEIGHT * scale + 16;
      canvas.width = Math.min(ids.length, perRow) * cell;
      canvas.height = Math.ceil(ids.length / perRow) * rowHeight;
      canvas.style.cssText = 'position:fixed;inset:0;z-index:40;background:#7d7a8c;image-rendering:pixelated;max-width:100%;max-height:100%;pointer-events:none';
      const context = canvas.getContext('2d');
      context.imageSmoothingEnabled = false;
      ids.forEach((id, n) => {
        const { buffer, frameWidth: fw, frameHeight: fh } = sheets[id];
        const source = document.createElement('canvas');
        source.width = buffer.width;
        source.height = buffer.height;
        source.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buffer.data), buffer.width, buffer.height), 0, 0);
        const ox = (n % perRow) * cell + 8;
        const oy = Math.floor(n / perRow) * rowHeight + 8;
        for (let row = 0; row < DIRECTIONS.length; row += 1) {
          context.drawImage(source, 0, row * fh, fw, fh, ox + row * FRAME_WIDTH * scale, oy + (FRAME_HEIGHT - fh) * scale, fw * scale, fh * scale);
        }
      });
      document.body.append(canvas);
      return true;
    },
    // Galerie d'images choisies, pour juger une pose pixel par pixel : rows est
    // une liste de lignes, chaque ligne une liste de [id, direction (indice
    // dans DIRECTIONS : 0 bas, 2 gauche, 4 haut, 6 droite, les diagonales
    // entre), colonne de la planche, sansAccessoire].
    // L'id « heros:nuit » montre le héros dans une tenue de data/tokens.js.
    // Les planches sont refaites depuis les fiches, sans toucher au jeu.
    galerie(rows, scale = 4) {
      document.getElementById('lia-galerie')?.remove();
      if (!rows) return false;
      const fiches = [hero, ...villagers, ...figurants];
      const cache = new Map();
      const sheetOf = (id, bare) => {
        const key = `${id}:${bare ? 'nu' : 'habille'}`;
        if (!cache.has(key)) {
          const [base, outfit] = id.split(':');
          const fiche = outfit ? habiller(hero, tenues.find((t) => t.id === outfit)) : fiches.find((c) => c.id === base);
          cache.set(key, createCharacterSheet(bare ? { ...fiche, accessoire: null } : fiche));
        }
        return cache.get(key);
      };
      const columns = Math.max(...rows.map((row) => row.length));
      const canvas = document.createElement('canvas');
      canvas.id = 'lia-galerie';
      canvas.width = columns * (FRAME_WIDTH * scale + 4) + 12;
      canvas.height = rows.length * (FRAME_HEIGHT * scale + 8) + 8;
      canvas.style.cssText = 'position:fixed;left:0;top:0;z-index:40;background:#6f6c7e;image-rendering:pixelated;pointer-events:none';
      const context = canvas.getContext('2d');
      context.imageSmoothingEnabled = false;
      rows.forEach((row, r) => row.forEach(([id, direction, column, bare], i) => {
        const { buffer, frameWidth: fw, frameHeight: fh } = sheetOf(id, bare);
        const source = document.createElement('canvas');
        source.width = buffer.width;
        source.height = buffer.height;
        source.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(buffer.data), buffer.width, buffer.height), 0, 0);
        context.drawImage(source, column * fw, direction * fh, fw, fh,
          8 + i * (FRAME_WIDTH * scale + 4) + Math.floor(((FRAME_WIDTH - fw) * scale) / 2), 8 + r * (FRAME_HEIGHT * scale + 8) + (FRAME_HEIGHT - fh) * scale, fw * scale, fh * scale);
      }));
      document.body.append(canvas);
      return true;
    },
    // Conversations. talk ouvre celle d'un habitant sans condition de distance ;
    // advance fait l'action (termine la page, passe à la suivante, ferme).
    talk(id = 'claudette') {
      interaction.start(npcs.find((npc) => npc.id === id));
      return dialogue.snapshot();
    },
    advance() {
      dialogue.advance();
      return dialogue.snapshot();
    },
    // Répond à la question affichée (indice du choix, à partir de 0).
    answer(index) {
      dialogue.choose(index);
      return dialogue.snapshot();
    },
    // L'action, comme la touche E : parle à l'habitant à portée, s'il y en a un.
    act() {
      interaction.request();
      tick(0, true);
      return dialogue.snapshot();
    },
    // Joue toute une conversation avec un habitant, sans condition de
    // distance. mode 'erreurs' essaie d'abord les mauvaises réponses (pour
    // tester les nouveaux essais), 'direct' donne tout de suite la bonne.
    // lecon : prendre la leçon quand l'habitant la propose (sinon, la question
    // tout de suite).
    converse(id, mode = 'erreurs', lecon = true) {
      const npc = npcs.find((candidate) => candidate.id === id);
      const { question } = texts[npc.character.dialogue];
      // Un guide (Claudette) n'a pas de question : on lit ses pages, rien de plus.
      const right = question ? question.choix.findIndex((c) => c.bon) : 0;
      const picks = !question || mode === 'direct' ? [right] : [...question.choix.keys()].filter((i) => i !== right).concat(right);
      const log = { pages: [], essais: [] };
      interaction.start(npc);
      for (let guard = 0; dialogue.isOpen && guard < 400; guard += 1) {
        const snap = dialogue.snapshot();
        if (snap.enFrappe) dialogue.advance();
        else if (snap.sorte === 'offre') dialogue.choose(lecon ? 0 : 1);
        else if (snap.sorte === 'boutique') dialogue.choose(1);
        else if (snap.mode === 'question') {
          const pick = picks.shift() ?? right;
          log.essais.push(pick);
          dialogue.choose(pick);
        } else {
          log.pages.push(snap.texte);
          dialogue.advance();
        }
      }
      return { pages: log.pages.length, essais: log.essais, diplome: diploma.isOpen, parchemins: [...gameState.parchemins], texte: log.pages };
    },
    // Donne des parchemins sans conversation (tests d'une partie avancée).
    give(ids = counter.ids) {
      for (const id of [].concat(ids)) gameState.parchemins.add(id);
      counter.refresh();
      return [...gameState.parchemins];
    },
    // Le grimoire, ouvert à une page donnée (la dernière gagnée par défaut).
    grimoire(on = true, page) {
      if (on) grimoire.open(page);
      else grimoire.close();
      return { ouvert: grimoire.isOpen, page: grimoire.page };
    },
    // Change de lieu sans fondu : un intérieur de world/rooms.js, ou null pour
    // ressortir dans le village.
    lieu(id = null) {
      if (id) doors.enter(id, { instant: true });
      else doors.exit({ instant: true });
      return doors.room;
    },
    // Tokens : en donner (tests de la boutique), ouvrir la boutique.
    tokens(n = 0) {
      wallet.earn(n);
      return wallet.balance;
    },
    boutique(on = true) {
      if (on) shop.open();
      else shop.close();
      return shop.isOpen;
    },
    // Habille le héros d'une tenue (id de data/tokens.js), comme un achat.
    tenue(id = 'voyage') {
      gameState.tenues.add(id);
      gameState.tenue = id;
      dressHero(id);
      return gameState.tenue;
    },
    // La carte en grand.
    carte(on = true) {
      if (on) minimap.open();
      else minimap.close();
      return minimap.isOpen;
    },
    // La réplique de figurant affichée, s'il y en a une.
    chatter: () => chatter.snapshot(),
    // Contrôles tactiles (étape 4) : doigts posés, joystick, course,
    // pincement, zoom de la caméra, mode du bouton d'action.
    touch: () => ({ ...controls.snapshot(), zoom: Number(follow.zoom.toFixed(3)), action: actionButton.mode }),
    // Joystick à droite et bouton d'action à gauche (main gauche), ou l'inverse.
    mainGauche(on = true) {
      setLeftHanded(on);
      return controls.snapshot().mainGauche;
    },
    // Le générique de fin, sans passer par Clodomir.
    generique(on = true) {
      if (on) credits.play();
      else credits.close();
      return credits.isOpen;
    },
    diploma(on = true) {
      if (on) diploma.open();
      else diploma.close();
      return diploma.isOpen;
    },
    dialogue: () => dialogue.snapshot(),
    music: () => music.state,
    ambience: () => ambience.state,
    // Habitant à portée du héros (ou null) et distance à chacun.
    nearby: () => ({
      cible: interaction.target?.id ?? null,
      distances: Object.fromEntries(npcs.map((npc) => [npc.id, Number(npc.distanceTo(player.position).toFixed(2))])),
    }),
    // Parcours scripté : le héros marche en ligne droite vers chaque point
    // { x, z } de la liste, image par image, collisions comprises. S'arrête sur
    // un point si l'on n'avance plus (coincé). Renvoie les points atteints.
    walk(points, { arrive = 0.35, maxFrames = 20000 } = {}) {
      const reached = [];
      let stuck = null;
      let frames = 0;
      for (let i = 0; i < points.length && !stuck; i += 1) {
        const [tx, tz] = points[i];
        let still = 0;
        let last = Infinity;
        while (frames < maxFrames) {
          const dx = tx - player.position.x;
          const dz = tz - player.position.z;
          const distance = Math.hypot(dx, dz);
          if (distance < arrive) break;
          state.autoDirection = { x: dx / distance, z: dz / distance };
          tick(1 / 60, true);
          frames += 1;
          still = last - distance < 0.004 ? still + 1 : 0;
          last = distance;
          if (still > 45) {
            stuck = { index: i, cible: [tx, tz], position: [Number(player.position.x.toFixed(2)), Number(player.position.z.toFixed(2))] };
            break;
          }
        }
        if (!stuck) reached.push(i);
      }
      state.autoDirection = null;
      return { atteints: reached.length, sur: points.length, coince: stuck, images: frames, ...info() };
    },
    // Cache ou montre les habitants : mesure leur coût en appels de dessin.
    showNpcs(on = true) {
      for (const npc of npcs) for (const object of npc.objects) object.visible = on;
      return on;
    },
    setName(name) {
      gameState.prenom = String(name).slice(0, 24);
      return gameState.prenom;
    },
    gameState: () => ({
      prenom: gameState.prenom,
      parchemins: [...gameState.parchemins],
      visites: Object.fromEntries(gameState.visites),
      choix: Object.fromEntries(gameState.choix),
      erreurs: Object.fromEntries(gameState.erreurs),
      tokens: gameState.tokens,
      tenue: gameState.tenue,
      tenues: [...gameState.tenues],
      decouvertes: [...gameState.decouvertes],
      coffres: [...gameState.coffres],
    }),
    checkDialogues: () => checkDialogues(texts, npcs.map((npc) => npc.character)),
  };
}
