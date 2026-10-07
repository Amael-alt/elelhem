// Le butin de la lande (version 2.1) : ce qu'une Hallucination lâche en se
// dissipant. Des pièces (des Tokens) et parfois une fiole de clarté, posées
// au sol autour d'elle, qui flottent un peu et que le héros ramasse en
// marchant dessus. Les pièces vont dans la bourse, la fiole rend une clarté.
// Les sprites sont dessinés par le code, comme l'épée (gfx/weapon.js).
// Version 2.3 : les étincelles cachées du village, posées une fois pour
// toutes à un endroit précis (place), ramassées de la même façon (onSpark).

import * as THREE from 'three';
import { createPixelBuffer, hexToRgb, setPixel, toDataTexture } from '../gfx/pixels.js';
import { createSprite } from '../gfx/billboard.js';
import { SPRITE_LAYER } from '../gfx/post/pipeline.js';
import { lootColors, outlineColor } from '../data/palette.js';

const SIZE = 12; // pixels d'un sprite de butin
const REACH = 0.5; // distance où le héros ramasse
const SCATTER_MIN = 0.3; // les objets tombent autour de l'Hallucination
const SCATTER_MAX = 0.75;
const BOB_RATE = 3.2;
const BOB_AMPLITUDE = 0.05;
const REST_HEIGHT = 0.12; // au-dessus du sol
const MAX_COINS = 4; // au plus quatre pièces par Hallucination, de plus grande valeur s'il le faut
const SETTLE_SECONDS = 0.35; // le temps de tomber au sol

// --- Les deux dessins -------------------------------------------------------

// Une pièce d'or vue de face : disque à bord sombre, reflet, et l'étincelle
// de la magie LIA gravée au centre.
function drawCoin() {
  const buffer = createPixelBuffer(SIZE, SIZE);
  const gold = lootColors.piece.map(hexToRgb);
  const outline = hexToRgb(outlineColor);
  const c = SIZE / 2 - 0.5;
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const d = Math.hypot(x - c, y - c);
      if (d > 5.2) continue;
      let rgb = gold[1];
      if (d > 4.3) rgb = outline;
      else if (d > 3.4) rgb = gold[0];
      else if (x + y < 8) rgb = gold[2];
      setPixel(buffer, x, y, rgb);
    }
  }
  // L'étincelle : une croix de quatre pixels clairs.
  for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) setPixel(buffer, 5 + dx, 5 + dy, gold[3]);
  return buffer;
}

// Une fiole de clarté : goulot et bouchon, panse ronde, liquide rouge et un
// reflet de verre.
function drawVial() {
  const buffer = createPixelBuffer(SIZE, SIZE);
  const outline = hexToRgb(outlineColor);
  const glass = hexToRgb(lootColors.fiole.verre);
  const cork = hexToRgb(lootColors.fiole.bouchon);
  const [dark, light] = lootColors.fiole.liquide.map(hexToRgb);
  // Bouchon et goulot.
  for (let x = 5; x <= 6; x += 1) setPixel(buffer, x, 0, cork);
  for (let x = 4; x <= 7; x += 1) setPixel(buffer, x, 1, cork);
  for (let y = 2; y <= 3; y += 1) {
    setPixel(buffer, 4, y, outline);
    setPixel(buffer, 5, y, glass);
    setPixel(buffer, 6, y, glass);
    setPixel(buffer, 7, y, outline);
  }
  // La panse : un rond de rayon 3,6 centré en (5,5 ; 7,5).
  for (let y = 4; y < SIZE; y += 1) {
    for (let x = 1; x < SIZE - 1; x += 1) {
      const d = Math.hypot(x - 5.5, y - 7.5);
      if (d > 3.9) continue;
      let rgb = y >= 7 ? dark : glass;
      if (d > 3.1) rgb = outline;
      else if (y >= 7 && x + y < 13) rgb = light;
      setPixel(buffer, x, y, rgb);
    }
  }
  setPixel(buffer, 3, 6, hexToRgb('#ffffff')); // le reflet
  return buffer;
}

// Une étincelle de la magie LIA : une étoile à quatre branches, claire, qui
// brille même à l'ombre, et deux éclats à côté.
function drawSpark() {
  const buffer = createPixelBuffer(SIZE, SIZE);
  const [dark, mid, light] = lootColors.etincelle.map(hexToRgb);
  const c = 5;
  for (let d = -5; d <= 5; d += 1) {
    const rgb = Math.abs(d) >= 4 ? dark : Math.abs(d) >= 2 ? mid : light;
    setPixel(buffer, c + d, c, rgb);
    setPixel(buffer, c, c + d, rgb);
  }
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) setPixel(buffer, c + dx, c + dy, mid);
  setPixel(buffer, c, c, hexToRgb('#ffffff'));
  setPixel(buffer, 9, 1, light);
  setPixel(buffer, 1, 9, light);
  setPixel(buffer, 10, 9, mid);
  return buffer;
}

function toSheet(buffer, glow) {
  return {
    texture: toDataTexture(buffer, { repeat: false, mipmaps: false }),
    emissive: glow ? toDataTexture(buffer, { repeat: false, mipmaps: false }) : null,
    columns: 1,
    rows: 1,
    frameWidth: SIZE,
    frameHeight: SIZE,
    feetRow: SIZE - 1,
  };
}

// world : la lande (ou le village pour les étincelles) ; sunDirection, post :
// pour les sprites ; wallet : la bourse ; onPotion() : une fiole ramassée
// (rend une clarté) ; onSpark(item) : une étincelle ramassée ; rng : hasard.
// onCoin() : une pièce ramassée (le tintement, version 2.9).
export function createPickups({ world, sunDirection, post, wallet, onPotion = () => {}, onSpark = () => {}, onCoin = () => {}, rng = Math.random }) {
  const sheets = { piece: toSheet(drawCoin(), true), fiole: toSheet(drawVial(), false), etincelle: toSheet(drawSpark(), true) };
  const items = [];
  const point = new THREE.Vector3();

  function spawn(kind, value, x, z) {
    const angle = rng() * Math.PI * 2;
    const distance = SCATTER_MIN + rng() * (SCATTER_MAX - SCATTER_MIN);
    const position = { x: x + Math.cos(angle) * distance, z: z + Math.sin(angle) * distance };
    // Pas dans un mur : on recule vers le point de départ si la case est bloquée.
    world.collider.move(position, 0, 0, 0.15);
    const sprite = createSprite(sheets[kind], sunDirection, post);
    sprite.object.layers.set(SPRITE_LAYER);
    sprite.object.castShadow = false;
    world.scene.add(sprite.object);
    const item = { kind, value, position, sprite, age: 0, seed: rng() * 10, from: { x, z } };
    items.push(item);
    return item;
  }

  function remove(item) {
    world.scene.remove(item.sprite.object);
    item.sprite.object.geometry.dispose?.();
    items.splice(items.indexOf(item), 1);
  }

  return {
    get count() {
      return items.length;
    },
    // Une Hallucination se dissipe en (x, z) : ses Tokens en pièces, et une
    // fiole si le sort le veut (chance de 0 à 1).
    drop(x, z, tokens, potionChance) {
      if (tokens > 0) {
        const coins = Math.min(MAX_COINS, tokens);
        const each = Math.floor(tokens / coins);
        let rest = tokens - each * coins;
        for (let i = 0; i < coins; i += 1) {
          spawn('piece', each + (rest > 0 ? 1 : 0), x, z);
          rest -= 1;
        }
      }
      if (rng() < potionChance) spawn('fiole', 1, x, z);
    },
    // Une étincelle posée là, déjà au sol, qui ne bouge plus que pour flotter.
    place(x, z, id) {
      const sprite = createSprite(sheets.etincelle, sunDirection, post);
      sprite.object.layers.set(SPRITE_LAYER);
      sprite.object.castShadow = false;
      world.scene.add(sprite.object);
      const item = { kind: 'etincelle', id, value: 0, position: { x, z }, sprite, age: SETTLE_SECONDS, seed: rng() * 10, from: { x, z } };
      items.push(item);
      return item;
    },
    // Tout disparaît (on quitte la lande ou on y revient).
    clear() {
      while (items.length) remove(items[items.length - 1]);
    },
    // dt, time : le temps ; player : { x, z } ; collect : vrai si le héros
    // peut ramasser (pas pendant un fondu).
    update(dt, time, player, collect = true) {
      for (const item of [...items]) {
        item.age += dt;
        // Au départ, l'objet glisse de l'Hallucination vers sa place au sol.
        const settle = Math.min(1, item.age / SETTLE_SECONDS);
        const ease = 1 - (1 - settle) * (1 - settle);
        const x = item.from.x + (item.position.x - item.from.x) * ease;
        const z = item.from.z + (item.position.z - item.from.z) * ease;
        const ground = world.groundHeight(x, z);
        const hop = settle < 1 ? Math.sin(settle * Math.PI) * 0.45 : 0;
        const bob = BOB_AMPLITUDE * Math.sin(time * BOB_RATE + item.seed);
        item.sprite.object.position.set(x, ground + REST_HEIGHT + hop + bob, z);
        if (collect && settle >= 1 && Math.hypot(player.x - x, player.z - z) < REACH) {
          if (item.kind === 'piece') {
            wallet.earn(item.value);
            onCoin();
          }
          else if (item.kind === 'fiole') onPotion();
          else onSpark(item);
          remove(item);
        }
      }
      void point;
    },
  };
}
