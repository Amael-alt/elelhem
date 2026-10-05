// Générateur de planches de personnages en pixel art.
//
// Une silhouette commune (tête, buste, bras, jambes) est calculée pour chaque
// direction et chaque image du cycle de marche, puis habillée de l'accessoire
// du personnage, décrit en grilles de caractères dans data/characters.js.
// Le volume vient d'une pseudo-normale (lumière en haut à gauche) ramenée à
// quatre tons par rampe, et un contour sombre bleuté entoure la silhouette.
//
// Planche : 6 colonnes (2 images de repos, 4 de marche) × 4 lignes
// (bas, gauche, droite, haut), cadres de 32 × 32 pixels. La droite est le
// miroir de la gauche.
//
// Canal émissif : la lettre « l » d'une grille d'accessoire est de la lumière
// (le joyau et l'orbe de Lia). Ces pixels sont copiés dans une seconde planche,
// de même taille, lue comme carte d'émission : ils brillent même à l'ombre.

import { glowRamp, leatherRamp, outlineColor } from '../data/palette.js';
import { createPixelBuffer, createRamp, hexToRgb, setPixel, toDataTexture } from './pixels.js';

export const FRAME = 32;
export const PIXELS_PER_UNIT = 18;
export const FEET_ROW = 29; // dernière ligne des bottes ; le pivot est sous elle
export const DIRECTIONS = ['down', 'left', 'right', 'up'];
export const IDLE_FRAMES = [0, 1];
export const WALK_FRAMES = [2, 3, 4, 5];
export const COLUMNS = IDLE_FRAMES.length + WALK_FRAMES.length;
export const IDLE_FPS = 1.6; // respiration au repos, la même pour tous

const EMPTY = 0;
const RAMPS = { peau: 1, vetement: 2, accent: 3, cheveux: 4, cuir: 5, lumiere: 7 };
const OUTLINE = 6;
const LETTERS = { p: RAMPS.peau, v: RAMPS.vetement, a: RAMPS.accent, c: RAMPS.cheveux, b: RAMPS.cuir, l: RAMPS.lumiere };

// Lumière des sprites, dans le repère de l'image (y vers le bas) : haut gauche.
const LIGHT = (() => {
  const v = [-0.5, -0.65, 0.6];
  const length = Math.hypot(...v);
  return v.map((c) => c / length);
})();

// Ton (0 à 3) d'une pseudo-normale dont on connaît x et y.
function toneFromNormal(nx, ny) {
  const nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny));
  const length = Math.hypot(nx, ny, nz);
  const light = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / length;
  if (light > 0.82) return 3;
  if (light > 0.5) return 2;
  if (light > 0.15) return 1;
  return 0;
}

// --- Cadre de travail : une rampe et un ton par pixel ----------------------

function createFrame() {
  return { ramp: new Int8Array(FRAME * FRAME), tone: new Int8Array(FRAME * FRAME) };
}

function put(frame, x, y, ramp, tone) {
  if (x < 0 || y < 0 || x >= FRAME || y >= FRAME) return;
  frame.ramp[y * FRAME + x] = ramp;
  frame.tone[y * FRAME + x] = Math.max(0, Math.min(3, tone));
}

function ellipse(frame, cx, cy, rx, ry, ramp, shade = 0) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny <= 1) put(frame, x, y, ramp, toneFromNormal(nx * 0.9, ny * 0.9) - shade);
    }
  }
}

// Trapèze vertical (buste, membres), ombré comme un cylindre.
function trapezoid(frame, top, bottom, [topLeft, topRight], [bottomLeft, bottomRight], ramp, shade = 0) {
  for (let y = top; y <= bottom; y += 1) {
    const t = bottom === top ? 0 : (y - top) / (bottom - top);
    const left = Math.round(topLeft + (bottomLeft - topLeft) * t);
    const right = Math.round(topRight + (bottomRight - topRight) * t);
    const center = (left + right + 1) / 2;
    const half = Math.max(1, (right - left + 1) / 2);
    for (let x = left; x <= right; x += 1) {
      put(frame, x, y, ramp, toneFromNormal(((x + 0.5 - center) / half) * 0.85, -0.25 + 0.5 * t) - shade);
    }
  }
}

function rect(frame, x0, y0, x1, y1, ramp, shade = 0) {
  trapezoid(frame, y0, y1, [x0, x1], [x0, x1], ramp, shade);
}

// --- Silhouette commune -----------------------------------------------------

const HEAD = { cx: 16, cy: 9.5, rx: 6, ry: 5.6 };

function head(frame, view, bob) {
  const cy = HEAD.cy + bob;
  ellipse(frame, HEAD.cx, cy, HEAD.rx, HEAD.ry, RAMPS.peau);
  // Cheveux : le haut du crâne, les côtés, tout l'arrière en vue de dos.
  for (let y = 0; y < FRAME; y += 1) {
    for (let x = 0; x < FRAME; x += 1) {
      const i = y * FRAME + x;
      if (frame.ramp[i] !== RAMPS.peau) continue;
      const dx = x + 0.5 - HEAD.cx;
      const dy = y + 0.5 - cy;
      const hair = view === 'up'
        || dy < -1.5
        || (view === 'down' && Math.abs(dx) > HEAD.rx - 1.6 && dy < 1.5)
        || (view === 'left' && dx > -1 && dy < 2.5);
      if (hair) frame.ramp[i] = RAMPS.cheveux;
    }
  }
  if (view === 'down') {
    for (const x of [13, 18]) for (const dy of [0, 1]) put(frame, x, 10 + bob + dy, OUTLINE, 0);
  } else if (view === 'left') {
    for (const dy of [0, 1]) put(frame, 12, 10 + bob + dy, OUTLINE, 0);
  }
}

function leg(frame, x0, x1, lift, shade, toe) {
  const top = 23 - lift;
  rect(frame, x0, top, x1, top + 3, RAMPS.vetement, shade + 1);
  rect(frame, x0, top + 4, x1, FEET_ROW - lift, RAMPS.cuir, shade);
  if (toe) put(frame, x0 - 1, FEET_ROW - lift, RAMPS.cuir, 1 - shade);
}

function torso(frame, view, bob) {
  const [top, bottom] = [15 + bob, 22 + bob];
  if (view === 'left') trapezoid(frame, top, bottom, [13, 18], [12, 19], RAMPS.vetement);
  else trapezoid(frame, top, bottom, [12, 19], [11, 20], RAMPS.vetement);
  const beltY = 20 + bob;
  for (let x = 0; x < FRAME; x += 1) {
    if (frame.ramp[beltY * FRAME + x] === RAMPS.vetement) put(frame, x, beltY, RAMPS.cuir, x < 16 ? 2 : 1);
  }
}

function arm(frame, x0, x1, bob, reach) {
  rect(frame, x0, 15 + bob, x1, 20 + bob + reach, RAMPS.vetement, 1);
  rect(frame, x0, 21 + bob + reach, x1, 22 + bob + reach, RAMPS.peau);
}

// Pose d'une image : bob (buste plus bas d'un pixel), jambes levées, foulée
// et balancement des bras.
function drawBody(frame, view, pose) {
  const { bob = 0, lift = [0, 0], reach = [0, 0], stride = [0, 0], swing = 0 } = pose;
  if (view === 'left') {
    leg(frame, 15 + stride[1], 17 + stride[1], lift[1], 1, true); // jambe du fond, plus sombre
    leg(frame, 14 + stride[0], 16 + stride[0], lift[0], 0, true);
    torso(frame, view, bob);
    head(frame, view, bob);
    arm(frame, 15 + swing, 16 + swing, bob, 0);
    return;
  }
  leg(frame, 12, 14, lift[0], 0, false);
  leg(frame, 17, 19, lift[1], 0, false);
  torso(frame, view, bob);
  arm(frame, 10, 11, bob, reach[0]);
  arm(frame, 20, 21, bob, reach[1]);
  head(frame, view, bob);
}

// Repos : respiration d'un pixel. Marche : contact, passage, contact, passage.
const POSES = {
  front: [
    { bob: 0 }, { bob: 1 },
    { bob: 1 },
    { bob: 0, lift: [1, 0], reach: [-1, 1] },
    { bob: 1 },
    { bob: 0, lift: [0, 1], reach: [1, -1] },
  ],
  side: [
    { bob: 0 }, { bob: 1 },
    { bob: 1, stride: [-2, 2], swing: 1 },
    { bob: 0, lift: [0, 1] },
    { bob: 1, stride: [2, -2], swing: -1 },
    { bob: 0, lift: [1, 0] },
  ],
};

// --- Accessoire en grille ---------------------------------------------------

// Chaque zone d'une même rampe reçoit une pseudo-normale tirée de sa propre
// forme : distance au bord à gauche, à droite, en haut, en bas.
function overlay(frame, grid, [ox, oy], bob) {
  const height = grid.length;
  const width = grid[0].length;
  const rampOf = (gx, gy) => {
    if (gx < 0 || gy < 0 || gx >= width || gy >= height) return EMPTY;
    return LETTERS[grid[gy][gx].toLowerCase()] ?? EMPTY;
  };
  const run = (gx, gy, sx, sy, ramp) => {
    let n = 0;
    while (n < 8 && rampOf(gx + sx * (n + 1), gy + sy * (n + 1)) === ramp) n += 1;
    return n + 1;
  };
  for (let gy = 0; gy < height; gy += 1) {
    for (let gx = 0; gx < width; gx += 1) {
      const char = grid[gy][gx];
      const x = ox + gx;
      const y = oy + gy + bob;
      if (char === '.') continue;
      if (char === 'x') { put(frame, x, y, EMPTY, 0); continue; }
      if (char === 'e') { put(frame, x, y, OUTLINE, 0); continue; }
      const ramp = LETTERS[char.toLowerCase()];
      if (ramp === undefined) throw new Error(`Sprite : lettre inconnue « ${char} » dans une grille.`);
      if (char !== char.toLowerCase()) { put(frame, x, y, ramp, 0); continue; }
      const left = run(gx, gy, -1, 0, ramp);
      const right = run(gx, gy, 1, 0, ramp);
      const up = run(gx, gy, 0, -1, ramp);
      const down = run(gx, gy, 0, 1, ramp);
      put(frame, x, y, ramp, toneFromNormal(((left - right) / (left + right)) * 0.9, ((up - down) / (up + down)) * 0.9));
    }
  }
}

// Contour : tout pixel vide qui touche la silhouette par un côté.
function outline(frame) {
  const solid = Uint8Array.from(frame.ramp, (r) => (r === EMPTY ? 0 : 1));
  for (let y = 0; y < FRAME; y += 1) {
    for (let x = 0; x < FRAME; x += 1) {
      if (solid[y * FRAME + x]) continue;
      const touches = (x > 0 && solid[y * FRAME + x - 1]) || (x < FRAME - 1 && solid[y * FRAME + x + 1])
        || (y > 0 && solid[(y - 1) * FRAME + x]) || (y < FRAME - 1 && solid[(y + 1) * FRAME + x]);
      if (touches) put(frame, x, y, OUTLINE, 0);
    }
  }
}

// --- Planche complète -------------------------------------------------------

const VIEW_OF = { down: 'down', up: 'up', left: 'left', right: 'left' };
const GRID_OF = { down: 'face', up: 'dos', left: 'profil' };

export function createCharacterSheet(character) {
  const colors = [
    null,
    createRamp(character.palette.peau),
    createRamp(character.palette.vetement),
    createRamp(character.palette.accent),
    createRamp(character.palette.cheveux),
    createRamp(leatherRamp),
    null, // 6 : le contour, sa couleur est fixe
    createRamp(character.palette.lumiere ?? glowRamp),
  ];
  const outlineRgb = hexToRgb(outlineColor);
  const buffer = createPixelBuffer(FRAME * COLUMNS, FRAME * DIRECTIONS.length);
  const glow = createPixelBuffer(buffer.width, buffer.height);
  let hasGlow = false;
  const accessory = character.accessoire;

  DIRECTIONS.forEach((direction, row) => {
    const view = VIEW_OF[direction];
    const poses = view === 'left' ? POSES.side : POSES.front;
    poses.forEach((pose, column) => {
      const frame = createFrame();
      drawBody(frame, view, pose);
      if (accessory) overlay(frame, accessory[GRID_OF[view]], accessory.ancre, pose.bob ?? 0);
      outline(frame);
      const mirror = direction === 'right';
      for (let y = 0; y < FRAME; y += 1) {
        for (let x = 0; x < FRAME; x += 1) {
          const i = y * FRAME + x;
          const ramp = frame.ramp[i];
          if (ramp === EMPTY) continue;
          const rgb = ramp === OUTLINE ? outlineRgb : colors[ramp][frame.tone[i]];
          const px = column * FRAME + (mirror ? FRAME - 1 - x : x);
          setPixel(buffer, px, row * FRAME + y, rgb);
          if (ramp === RAMPS.lumiere) {
            setPixel(glow, px, row * FRAME + y, rgb);
            hasGlow = true;
          }
        }
      }
    });
  });

  return {
    buffer,
    texture: toDataTexture(buffer, { repeat: false, mipmaps: false }),
    // Carte d'émission, absente quand le personnage n'a aucune lumière.
    emissive: hasGlow ? toDataTexture(glow, { repeat: false, mipmaps: false }) : null,
    columns: COLUMNS,
    rows: DIRECTIONS.length,
  };
}
