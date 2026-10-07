// Les petites vies du village (version 2.9) : un chat qui dort sur un muret
// et remue la queue, des poules qui picorent dans la pâture, le grimoire
// qui flotte devant la bibliothèque en tournant ses pages, le marteau de
// Ferrand. Chacun est un sprite de pixels dessiné ici (deux images, une
// texture), animé par une horloge. Les couleurs sont nommées sur place :
// ce sont des bêtes, pas la palette du décor.

import * as THREE from 'three';
import { createPixelBuffer, setPixel, toDataTexture } from '../pixels.js';
import { SPRITE_LAYER } from '../post/pipeline.js';

const PIXELS_PER_UNIT = 36; // comme les personnages (gfx/sprites.js)

// Une texture de deux images côte à côte, depuis deux grilles de caractères.
function sheetOf(frames, colors) {
  const h = frames[0].length;
  const w = frames[0][0].length;
  const buffer = createPixelBuffer(w * frames.length, h);
  frames.forEach((rows, f) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (colors[ch]) setPixel(buffer, f * w + x, y, colors[ch]);
  })));
  const texture = toDataTexture(buffer, { repeat: false, mipmaps: false });
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.repeat.set(1 / frames.length, 1);
  return { texture, w, h, count: frames.length };
}

function spriteOf(sheet, tint = 0xffffff) {
  const material = new THREE.SpriteMaterial({ map: sheet.texture.clone(), transparent: true, depthWrite: false, color: tint });
  material.map.repeat.set(1 / sheet.count, 1);
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(sheet.w / PIXELS_PER_UNIT, sheet.h / PIXELS_PER_UNIT, 1);
  sprite.center.set(0.5, 0);
  sprite.layers.set(SPRITE_LAYER);
  return sprite;
}

const showFrame = (sprite, index, count) => {
  sprite.material.map.offset.x = index / count;
};

// Le chat : roux, en boule, la queue qui bat (deux images).
const CAT = {
  colors: { k: [52, 30, 14], r: [214, 128, 52], R: [240, 168, 84], w: [250, 236, 210], p: [230, 140, 150] },
  frames: [
    ['......kkkk......k', '....kkrRRrkk...kr', '...krRRRRRrk...kr', '..krRwRRRwRk..krk', '..kRRRRRRRRkkkrk.', '.kRRRRRRRRRRrrk..', '.kRRRRRRRRRRRk...', '.kkRRRRRRRRkk....', '..kkkkkkkkk......'],
    ['......kkkk.......', '....kkrRRrkk.....', '...krRRRRRrk.....', '..krRwRRRwRk.....', '..kRRRRRRRRkk.kk.', '.kRRRRRRRRRRrkrrk', '.kRRRRRRRRRRRrrk.', '.kkRRRRRRRRkkkk..', '..kkkkkkkkk......'],
  ],
};
// La poule : blanche, crête rouge, bec jaune ; la tête baisse pour picorer.
const HEN = {
  colors: { k: [60, 42, 20], w: [246, 240, 226], W: [255, 255, 250], r: [214, 60, 50], y: [230, 180, 60] },
  frames: [
    ['...rr.....', '..kwwk....', '.kwWwwky..', '.kwwwwk...', '..kwwwwkk.', '.kwwwwwwwk', '.kwWwwwwwk', '..kwwwwwk.', '...kkkkk..', '...y..y...'],
    ['..........', '..........', '.kkk......', 'kwwwkk....', 'kwWwwwkk..', 'rkwwwwwwwk', 'ykwWwwwwwk', '..kwwwwwk.', '...kkkkk..', '...y..y...'],
  ],
};
// Le grimoire : couverture violette, tranche d'or, pages qui tournent.
const BOOK = {
  colors: { k: [40, 24, 50], v: [96, 52, 140], V: [132, 80, 180], g: [226, 178, 74], p: [250, 240, 214], P: [228, 214, 180] },
  frames: [
    ['kkkkkkkkkkkkkk', 'kvvvvvkkvvvvvk', 'kvVVVvkkvVVVvk', 'kvVppPkkPppVvk', 'kvVpPPkkPPpVvk', 'kvVppPkkPppVvk', 'kvVpPPkkPPpVvk', 'kvvgggkkgggvvk', 'kkkkkkkkkkkkkk'],
    ['kkkkkkkkkkkkkk', 'kvvvvvkkvvvvvk', 'kvVVVvkkvVVVvk', 'kvVppPkPpppVvk', 'kvVpPPkPPPpVvk', 'kvVppPkPpppVvk', 'kvVpPPkPPPpVvk', 'kvvgggkkgggvvk', 'kkkkkkkkkkkkkk'],
  ],
};
// Le marteau : tête de fer, manche de bois, dressé (il tourne autour du bas du manche).
const HAMMER = {
  colors: { k: [30, 26, 24], f: [150, 158, 168], F: [210, 216, 222], b: [120, 80, 44], B: [160, 112, 64] },
  frames: [
    ['.kkkkkkkk.', 'kfFFFFFffk', 'kfFFFFFffk', 'kffffffffk', '.kkkkkkkk.', '....kbk...', '....kBk...', '....kBk...', '....kbk...', '....kbk...', '....kbk...', '.....k....'],
  ],
};

// hens : { rect: [x0, z0, x1, z1], count } ; cat : { x, y, z } ; book : { x, y, z } ;
// hammer : { x, y, z } (la main de Ferrand) ; groundHeight(x, z).
export function createCritters({ hens = null, cat = null, book = null, hammer = null, groundHeight = () => 0 }) {
  const group = new THREE.Group();
  group.name = 'petites-vies';
  const animals = [];

  if (cat) {
    const sheet = sheetOf(CAT.frames, CAT.colors);
    const sprite = spriteOf(sheet, 0xe8dccc);
    sprite.position.set(cat.x, cat.y, cat.z);
    group.add(sprite);
    animals.push({ kind: 'chat', sprite, sheet, seed: 0.3 });
  }
  if (hens) {
    const sheet = sheetOf(HEN.frames, HEN.colors);
    for (let i = 0; i < hens.count; i += 1) {
      const sprite = spriteOf(sheet, 0xf0e8dc);
      const [x0, z0, x1, z1] = hens.rect;
      const x = x0 + 0.5 + Math.random() * (x1 - x0 - 1);
      const z = z0 + 0.5 + Math.random() * (z1 - z0 - 1);
      sprite.position.set(x, groundHeight(x, z) + 0.01, z);
      group.add(sprite);
      animals.push({ kind: 'poule', sprite, sheet, rect: hens.rect, x, z, tx: x, tz: z, wait: Math.random() * 3, seed: i * 1.7 });
    }
  }
  if (book) {
    const sheet = sheetOf(BOOK.frames, BOOK.colors);
    const sprite = spriteOf(sheet);
    sprite.position.set(book.x, book.y, book.z);
    sprite.layers.set(0); // dans le post-traitement : le bloom fait sa lueur
    group.add(sprite);
    animals.push({ kind: 'grimoire', sprite, sheet, base: book.y, seed: 1.1 });
  }
  let hammerSprite = null;
  if (hammer) {
    const sheet = sheetOf(HAMMER.frames, HAMMER.colors);
    hammerSprite = spriteOf(sheet);
    hammerSprite.center.set(0.5, 0.08); // il tourne autour du bas du manche
    hammerSprite.position.set(hammer.x, hammer.y, hammer.z);
    group.add(hammerSprite);
  }

  return {
    group,
    // time : le temps du jeu ; hammerPhase : de 0 à 1 dans le coup de marteau
    // (core/ambience.js, synchronisé avec le son).
    update(time, dt, hammerPhase = 0) {
      for (const a of animals) {
        if (a.kind === 'chat') {
          showFrame(a.sprite, Math.floor(time / 1.4 + a.seed) % 2, a.sheet.count);
        } else if (a.kind === 'grimoire') {
          a.sprite.position.y = a.base + Math.sin(time * 1.3 + a.seed) * 0.08;
          showFrame(a.sprite, Math.floor(time / 1.1) % 2, a.sheet.count);
          a.sprite.material.rotation = Math.sin(time * 0.8) * 0.12;
        } else if (a.kind === 'poule') {
          a.wait -= dt;
          const dx = a.tx - a.x;
          const dz = a.tz - a.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.05) {
            const step = Math.min(d, 0.45 * dt);
            a.x += (dx / d) * step;
            a.z += (dz / d) * step;
            a.sprite.scale.x = Math.abs(a.sprite.scale.x) * (dx < 0 ? -1 : 1);
            showFrame(a.sprite, 0, a.sheet.count);
          } else {
            // À l'arrêt, elle picore : la tête baisse en rythme.
            showFrame(a.sprite, Math.floor(time * 5 + a.seed) % 3 === 0 ? 1 : 0, a.sheet.count);
            if (a.wait <= 0) {
              const [x0, z0, x1, z1] = a.rect;
              a.tx = Math.min(x1 - 0.4, Math.max(x0 + 0.4, a.x + (Math.random() - 0.5) * 2.2));
              a.tz = Math.min(z1 - 0.4, Math.max(z0 + 0.4, a.z + (Math.random() - 0.5) * 2.2));
              a.wait = 1.5 + Math.random() * 3;
            }
          }
          a.sprite.position.set(a.x, groundHeight(a.x, a.z) + 0.01, a.z);
        }
      }
      if (hammerSprite) {
        // Le marteau se lève lentement, puis frappe d'un coup sec et reste posé.
        const p = hammerPhase;
        const angle = p < 0.62 ? 0.35 - (1.5 * p) / 0.62 : p < 0.72 ? -1.15 + (1.5 * (p - 0.62)) / 0.1 : 0.35;
        hammerSprite.material.rotation = angle;
      }
    },
  };
}
