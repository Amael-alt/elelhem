// L'épée du héros et la lame de lumière de ses coups. Deux petites images
// dessinées par le code : l'épée est un sprite comme les personnages (même
// matériau, même lumière, même netteté), tourné autour de sa poignée en
// réécrivant les quatre sommets de son quad ; le coup est une lueur additive
// en croissant, qui s'étire et s'éteint en un sixième de seconde, et que le
// bloom attrape.

import * as THREE from 'three';
import { createPixelBuffer, hexToRgb, setPixel, toDataTexture } from './pixels.js';
import { createSprite } from './billboard.js';
import { PIXELS_PER_UNIT } from './sprites.js';
import { outlineColor, swordColors } from '../data/palette.js';

const SWORD_WIDTH = 16;
const SWORD_HEIGHT = 24;
const SLASH_SIZE = 64; // pixels de la texture du croissant
const SLASH_SECONDS = 0.16;
const SLASH_INTENSITY = 2.6; // au-dessus de 1 : le bloom s'en empare

// --- L'épée ------------------------------------------------------------------

// Une épée droite, vue de face : pommeau et poignée en bas (le pivot), garde
// d'or, lame d'acier avec son arête claire et son contour sombre.
function drawSword() {
  const buffer = createPixelBuffer(SWORD_WIDTH, SWORD_HEIGHT);
  const steel = swordColors.acier.map(hexToRgb);
  const gold = swordColors.or.map(hexToRgb);
  const leather = swordColors.cuir.map(hexToRgb);
  const outline = hexToRgb(outlineColor);
  const cx = 8; // la lame occupe les colonnes 6 à 9
  // Lame : de la pointe (y 0) à la garde (y 16).
  for (let y = 1; y < 17; y += 1) {
    const half = y < 3 ? y - 1 : 2; // la pointe s'affine
    for (let dx = -half; dx < half; dx += 1) {
      const x = cx + dx;
      const tone = dx === -1 ? 3 : dx === 0 ? 2 : dx < -1 ? 1 : 1;
      setPixel(buffer, x, y, steel[tone]);
    }
    setPixel(buffer, cx - half - 1, y, outline);
    setPixel(buffer, cx + half, y, outline);
  }
  setPixel(buffer, cx - 1, 0, outline);
  setPixel(buffer, cx, 0, outline);
  // Garde : une barre d'or sur sept pixels, aux bouts arrondis.
  for (let x = 4; x < 12; x += 1) {
    setPixel(buffer, x, 17, gold[x === 4 || x === 11 ? 0 : 2]);
    setPixel(buffer, x, 18, gold[x === 4 || x === 11 ? 0 : 1]);
  }
  setPixel(buffer, 3, 18, outline);
  setPixel(buffer, 12, 18, outline);
  for (let x = 4; x < 12; x += 1) setPixel(buffer, x, 16, outline);
  for (let x = 4; x < 12; x += 1) setPixel(buffer, x, 19, outline);
  // Poignée de cuir, puis le pommeau d'or.
  for (let y = 19; y < 23; y += 1) {
    setPixel(buffer, cx - 1, y, leather[y % 2]);
    setPixel(buffer, cx, y, leather[(y + 1) % 2]);
    setPixel(buffer, cx - 2, y, outline);
    setPixel(buffer, cx + 1, y, outline);
  }
  setPixel(buffer, cx - 1, 23, gold[1]);
  setPixel(buffer, cx, 23, gold[2]);
  return buffer;
}

// sunDirection, post : comme pour les personnages (gfx/billboard.js).
export function createSword(sunDirection, post) {
  const buffer = drawSword();
  const sheet = {
    texture: toDataTexture(buffer, { repeat: false, mipmaps: false }),
    emissive: null,
    columns: 1,
    rows: 1,
    frameWidth: SWORD_WIDTH,
    frameHeight: SWORD_HEIGHT,
    feetRow: SWORD_HEIGHT - 1, // le pivot : le pommeau
  };
  const sprite = createSprite(sheet, sunDirection, post);
  const mesh = sprite.object;
  mesh.castShadow = false;
  mesh.visible = false;
  // Les sommets d'origine du quad, pour les tourner autour du pivot (0, 0).
  const positions = mesh.geometry.getAttribute('position');
  const base = Array.from({ length: positions.count }, (_, i) => [positions.getX(i), positions.getY(i)]);

  return {
    object: mesh,
    // angle en radians (0 : lame vers le haut, positif : vers la droite de
    // l'écran) ; mirror retourne l'image ; (x, y, z) : la poignée dans le monde.
    setPose({ x, y, z, angle = 0, mirror = false }) {
      mesh.visible = true;
      mesh.position.set(x, y, z);
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      base.forEach(([bx, by], i) => {
        const px = mirror ? -bx : bx;
        positions.setXYZ(i, px * c + by * s, -px * s + by * c, 0);
      });
      positions.needsUpdate = true;
    },
    hide() {
      mesh.visible = false;
    },
    get visible() {
      return mesh.visible;
    },
  };
}

// --- La lame de lumière -------------------------------------------------------

// Un croissant : plein au bord d'attaque, qui s'efface vers l'intérieur.
function drawSlash() {
  const buffer = createPixelBuffer(SLASH_SIZE, SLASH_SIZE);
  const color = hexToRgb(swordColors.eclair);
  const center = SLASH_SIZE / 2;
  for (let y = 0; y < SLASH_SIZE; y += 1) {
    for (let x = 0; x < SLASH_SIZE; x += 1) {
      const dx = (x + 0.5 - center) / center;
      const dy = (y + 0.5 - center) / center;
      const r = Math.hypot(dx, dy);
      // Entre deux cercles décalés : le croissant ouvert vers le haut.
      const inner = Math.hypot(dx, dy + 0.42);
      if (r > 0.98 || inner < 0.72) continue;
      const edge = Math.min(1, (0.98 - r) / 0.18); // bord externe net
      const body = Math.min(1, (inner - 0.72) / 0.5); // s'efface vers l'intérieur
      const alpha = Math.round(255 * edge * (0.25 + 0.75 * body));
      if (alpha > 8) setPixel(buffer, x, y, color, alpha);
    }
  }
  return buffer;
}

export function createSlash() {
  const texture = toDataTexture(drawSlash(), { repeat: false, mipmaps: false });
  const material = new THREE.SpriteMaterial({
    map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: new THREE.Color(SLASH_INTENSITY, SLASH_INTENSITY, SLASH_INTENSITY),
  });
  const sprite = new THREE.Sprite(material);
  sprite.visible = false;
  let life = 0;
  let size = 1;

  return {
    object: sprite,
    // Lance la lueur : centre (x, y, z), angle (comme l'épée), taille en unités.
    play({ x, y, z, angle = 0, mirror = false, scale = 1.6 }) {
      sprite.position.set(x, y, z);
      sprite.material.rotation = -angle + (mirror ? Math.PI : 0);
      size = scale;
      life = SLASH_SECONDS;
      sprite.visible = true;
    },
    update(dt) {
      if (!sprite.visible) return;
      life -= dt;
      if (life <= 0) {
        sprite.visible = false;
        return;
      }
      const t = 1 - life / SLASH_SECONDS; // 0 au départ, 1 à la fin
      const s = size * (0.85 + 0.45 * t);
      sprite.scale.set(s, s, 1);
      sprite.material.opacity = 1 - t * t;
    },
    get playing() {
      return sprite.visible;
    },
  };
}

export const SWORD_UNITS = SWORD_HEIGHT / PIXELS_PER_UNIT;
