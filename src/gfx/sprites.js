// Générateur de planches de personnages en pixel art, façon RPG HD-2D : grosse
// tête, coiffure en volume, visage lisible, tenue détaillée.
//
// Une silhouette commune est calculée pour chaque direction et chaque image
// du cycle de marche, puis habillée selon le personnage (data/characters.js) :
// - sa coiffure (court, long, chignon, queue, hérissé, chauve) : un volume plus
//   large que le crâne, une frange dentelée, des mèches plus sombres et un
//   reflet clair ;
// - sa tenue (tunique ou robe) : col, ceinture et boucle, plis, poignets,
//   bottes ;
// - son visage : yeux avec un reflet, bouche, joues roses, ombre sous la
//   frange ;
// - puis son accessoire, décrit en grilles de caractères.
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

import { faceColors, glowRamp, leatherRamp, outlineColor } from '../data/palette.js';
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
const RAMPS = { peau: 1, vetement: 2, accent: 3, cheveux: 4, cuir: 5, lumiere: 7, visage: 8 };
const OUTLINE = 6;
const LETTERS = { p: RAMPS.peau, v: RAMPS.vetement, a: RAMPS.accent, c: RAMPS.cheveux, b: RAMPS.cuir, l: RAMPS.lumiere };
// Tons de la rampe « visage » : bouche, joues, reflet des yeux.
const FACE = { bouche: 0, joue: 1, reflet: 2 };

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
  if (light > 0.84) return 3;
  if (light > 0.52) return 2;
  if (light > 0.16) return 1;
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

const rampAt = (frame, x, y) => (x < 0 || y < 0 || x >= FRAME || y >= FRAME ? EMPTY : frame.ramp[y * FRAME + x]);

function ellipse(frame, cx, cy, rx, ry, ramp, shade = 0) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny <= 1) put(frame, x, y, ramp, toneFromNormal(nx * 0.9, ny * 0.9) - shade);
    }
  }
}

// Trapèze vertical (buste, membres, robe), ombré comme un cylindre.
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

// Assombrit (ou éclaircit) d'un ton les pixels d'une rampe donnée.
function retone(frame, x, y, ramp, delta) {
  if (rampAt(frame, x, y) !== ramp) return;
  const i = y * FRAME + x;
  frame.tone[i] = Math.max(0, Math.min(3, frame.tone[i] + delta));
}

// --- Tête et visage ----------------------------------------------------------

const HEAD = { cx: 16, cy: 9.5, rx: 6.5, ry: 6 };
// Volume des cheveux : un peu plus large et plus haut que le crâne.
const HAIR = { rx: 7.1, ry: 6.5, lift: 0.5 };

function head(frame, bob) {
  ellipse(frame, HEAD.cx, HEAD.cy + bob, HEAD.rx, HEAD.ry, RAMPS.peau);
}

// Yeux (deux pixels de haut, un reflet), bouche, joues. Face ou profil.
function face(frame, view, bob) {
  const y = 10 + bob;
  if (view === 'down') {
    for (const x of [12, 18]) {
      put(frame, x, y, RAMPS.visage, FACE.reflet);
      put(frame, x + 1, y, OUTLINE, 0);
      put(frame, x, y + 1, OUTLINE, 0);
      put(frame, x + 1, y + 1, OUTLINE, 0);
    }
    put(frame, 11, y + 2, RAMPS.visage, FACE.joue);
    put(frame, 20, y + 2, RAMPS.visage, FACE.joue);
    put(frame, 15, y + 3, RAMPS.peau, 0);
    put(frame, 16, y + 3, RAMPS.peau, 0);
  } else if (view === 'left') {
    put(frame, 11, y, RAMPS.visage, FACE.reflet);
    put(frame, 12, y, OUTLINE, 0);
    put(frame, 11, y + 1, OUTLINE, 0);
    put(frame, 12, y + 1, OUTLINE, 0);
    put(frame, 13, y + 2, RAMPS.visage, FACE.joue);
    put(frame, 10, y + 3, RAMPS.peau, 0);
    put(frame, 9, y + 1, RAMPS.peau, 2); // le nez dépasse du profil
  }
}

// Une frange dentelée : la limite basse des cheveux sur le front varie d'une
// colonne à l'autre.
const fringe = (x) => [0, 0.7, 0.2, 1.0, 0.4, 0.9, 0.1][((x % 7) + 7) % 7];

// Les cheveux, en deux couches : back (derrière le corps : cheveux longs vus de
// face ou de profil) et front (le reste, par-dessus la tête).
function hair(frame, view, style, bob, layer) {
  if (style === 'aucun') return;
  const cx = HEAD.cx;
  const cy = HEAD.cy + bob - HAIR.lift;
  const paint = (x, y, nx, ny, shade = 0) => {
    let tone = toneFromNormal(nx * 0.95, ny * 0.95) - shade;
    // Mèches : de fines diagonales plus sombres donnent la matière.
    if ((x * 2 + y) % 5 === 0 && tone > 0 && tone < 3) tone -= 1;
    put(frame, x, y, RAMPS.cheveux, tone);
  };

  if (layer === 'back') {
    // Cheveux longs : ils tombent derrière les épaules (face) ou dans le dos (profil).
    if (style === 'long' && view === 'down') {
      for (let y = 12; y <= 21; y += 1) {
        for (const [x0, x1] of [[9, 11], [20, 22]]) {
          const narrow = y > 18 ? 1 : 0;
          for (let x = x0 + (x0 < 16 ? narrow : 0); x <= x1 - (x0 > 16 ? narrow : 0); x += 1) {
            paint(x, y + bob, (x - 16) / 8, (y - 14) / 10, 1);
          }
        }
      }
    }
    return;
  }

  const inVolume = (x, y) => {
    const nx = (x + 0.5 - cx) / HAIR.rx;
    const ny = (y + 0.5 - cy) / HAIR.ry;
    return nx * nx + ny * ny <= 1 ? [nx, ny] : null;
  };
  for (let y = 0; y < 20; y += 1) {
    for (let x = 0; x < FRAME; x += 1) {
      const n = inVolume(x, y);
      if (!n) continue;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - (HEAD.cy + bob);
      let covered;
      if (view === 'up') {
        covered = dy < 4.6; // de dos, la tête est toute en cheveux
      } else if (view === 'down') {
        const sides = Math.abs(dx) > HEAD.rx - 1.6 && dy < (style === 'long' ? 4 : 2);
        covered = dy < -1.6 + fringe(x) || sides;
      } else {
        // Profil tourné vers la gauche : l'arrière du crâne et le dessus.
        covered = dy < -1.6 + fringe(x) * 0.6 || (dx > -0.5 && dy < 3) || (dx > 2.5 && dy < 5);
      }
      if (style === 'chauve') {
        // Une couronne de cheveux à hauteur des oreilles, le crâne nu.
        if (view === 'up') covered = dy > -1 && dy < 4.6;
        else if (view === 'down') covered = Math.abs(dx) > HEAD.rx - 2 && dy > -2.5 && dy < 2.5;
        else covered = dx > 0.5 && dy > -2.5 && dy < 3.5;
      }
      if (style === 'herisse' && dy < -3.5) covered = covered && ((x % 3) !== 1 || dy > -4.8);
      if (covered) paint(x, y, n[0], n[1]);
    }
  }
  // Mèches qui dépassent au sommet du crâne (hérissé) : trois pointes.
  if (style === 'herisse') {
    for (const [x, y] of [[12, 2], [15, 1], [16, 1], [19, 2], [13, 3], [18, 3]]) paint(x, y + bob, (x - 16) / 8, -0.9);
  }
  // Chignon : une boule au sommet (face, dos) ou à l'arrière (profil).
  if (style === 'chignon') {
    const [bx, by] = view === 'left' ? [20.5, 3.6] : [16, 2.6];
    ellipse(frame, bx, by + bob, 2.4, 2.1, RAMPS.cheveux);
  }
  // Queue de cheval : vue de dos ou de profil, une mèche qui pend.
  if (style === 'queue') {
    if (view === 'up') rect(frame, 15, 13 + bob, 16, 19 + bob, RAMPS.cheveux);
    if (view === 'left') {
      for (const [x, y] of [[22, 8], [23, 9], [23, 10], [23, 11], [22, 12], [22, 13], [22, 14]]) put(frame, x, y + bob, RAMPS.cheveux, 1);
    }
  }
  // Cheveux longs de dos ou de profil : par-dessus le dos.
  if (style === 'long' && view !== 'down') {
    const [x0, x1] = view === 'up' ? [10, 21] : [17, 22];
    for (let y = 14; y <= 20; y += 1) {
      const inset = y > 18 ? 1 : 0;
      for (let x = x0 + inset; x <= x1 - inset; x += 1) put(frame, x, y + bob, RAMPS.cheveux, toneFromNormal((x - (x0 + x1) / 2) / 7, 0.2) - ((x * 2 + y) % 5 === 0 ? 1 : 0));
    }
  }
  // Ombre sous la frange : la peau juste sous les cheveux s'assombrit.
  if (view !== 'up') {
    for (let y = 1; y < 18; y += 1) {
      for (let x = 0; x < FRAME; x += 1) {
        if (rampAt(frame, x, y) === RAMPS.peau && rampAt(frame, x, y - 1) === RAMPS.cheveux) retone(frame, x, y, RAMPS.peau, -1);
      }
    }
  }
}

// --- Corps et tenue ---------------------------------------------------------

function leg(frame, x0, x1, lift, shade, toe) {
  const top = 23 - lift;
  rect(frame, x0, top, x1, top + 3, RAMPS.vetement, shade + 1);
  rect(frame, x0, top + 4, x1, FEET_ROW - lift, RAMPS.cuir, shade);
  put(frame, x0, top + 4, RAMPS.cuir, 3 - shade); // reflet sur la tige de la botte
  if (toe) put(frame, x0 - 1, FEET_ROW - lift, RAMPS.cuir, 1 - shade);
}

// Petites bottes sous une robe.
function boot(frame, x0, x1, lift, toe) {
  rect(frame, x0, FEET_ROW - 1 - lift, x1, FEET_ROW - lift, RAMPS.cuir);
  if (toe) put(frame, x0 - 1, FEET_ROW - lift, RAMPS.cuir, 1);
}

// Le buste : tunique ou haut de robe, col en accent, ceinture et boucle, plis.
function torso(frame, view, bob, outfit) {
  const [top, bottom] = [15 + bob, 22 + bob];
  if (outfit === 'robe') {
    // La robe descend jusqu'aux chevilles en s'évasant.
    if (view === 'left') trapezoid(frame, top, 27, [13, 18], [12, 20], RAMPS.vetement);
    else trapezoid(frame, top, 27, [12, 19], [10, 21], RAMPS.vetement);
    // Ourlet en accent, plis plus sombres.
    for (let x = 0; x < FRAME; x += 1) if (rampAt(frame, x, 27) === RAMPS.vetement) put(frame, x, 27, RAMPS.accent, 1);
    for (const x of view === 'left' ? [15, 18] : [13, 16, 19]) for (let y = 23; y <= 26; y += 1) retone(frame, x, y, RAMPS.vetement, -1);
  } else if (view === 'left') {
    trapezoid(frame, top, bottom, [13, 18], [12, 19], RAMPS.vetement);
  } else {
    trapezoid(frame, top, bottom, [12, 19], [11, 20], RAMPS.vetement);
    for (const x of [13, 18]) retone(frame, x, bottom, RAMPS.vetement, -1); // plis de la tunique
    for (const x of [14, 17]) retone(frame, x, bottom - 1, RAMPS.vetement, -1);
  }
  // Ceinture (ou ceinture de robe) et sa boucle.
  const beltY = (outfit === 'robe' ? 19 : 20) + bob;
  for (let x = 0; x < FRAME; x += 1) {
    if (rampAt(frame, x, beltY) === RAMPS.vetement) put(frame, x, beltY, outfit === 'robe' ? RAMPS.accent : RAMPS.cuir, x < 16 ? 2 : 1);
  }
  if (view === 'down') {
    put(frame, 15, beltY, RAMPS.accent, 3);
    put(frame, 16, beltY, RAMPS.accent, 2);
    // Col en V, bordé d'accent.
    for (const [x, y, tone] of [[14, 15, 2], [15, 15, 1], [16, 15, 1], [17, 15, 2], [15, 16, 3], [16, 16, 2]]) put(frame, x, y + bob, RAMPS.accent, tone);
    put(frame, 15, 17 + bob, RAMPS.peau, 1);
    put(frame, 16, 17 + bob, RAMPS.peau, 1);
  } else if (view === 'left') {
    put(frame, 13, beltY, RAMPS.accent, 3);
    put(frame, 13, 15 + bob, RAMPS.accent, 2);
    put(frame, 14, 15 + bob, RAMPS.accent, 2);
  } else {
    for (let x = 13; x <= 18; x += 1) put(frame, x, 15 + bob, RAMPS.accent, 1); // col, de dos
  }
}

// Un bras : manche, poignet en accent, main.
function arm(frame, x0, x1, bob, reach) {
  rect(frame, x0, 15 + bob, x1, 19 + bob + reach, RAMPS.vetement, 1);
  for (let x = x0; x <= x1; x += 1) put(frame, x, 20 + bob + reach, RAMPS.accent, 1);
  rect(frame, x0, 21 + bob + reach, x1, 22 + bob + reach, RAMPS.peau);
}

// Pose d'une image : bob (buste plus bas d'un pixel), jambes levées, foulée
// et balancement des bras.
function drawBody(frame, view, pose, look) {
  const { bob = 0, lift = [0, 0], reach = [0, 0], stride = [0, 0], swing = 0 } = pose;
  const robe = look.tenue === 'robe';
  hair(frame, view, look.coiffure, bob, 'back');
  if (view === 'left') {
    if (robe) {
      boot(frame, 15 + stride[1], 16 + stride[1], lift[1], true);
      boot(frame, 14 + stride[0], 15 + stride[0], lift[0], true);
    } else {
      leg(frame, 15 + stride[1], 17 + stride[1], lift[1], 1, true); // jambe du fond, plus sombre
      leg(frame, 14 + stride[0], 16 + stride[0], lift[0], 0, true);
    }
    torso(frame, view, bob, look.tenue);
    head(frame, bob);
    face(frame, view, bob);
    hair(frame, view, look.coiffure, bob, 'front');
    arm(frame, 15 + swing, 16 + swing, bob, 0);
    return;
  }
  if (robe) {
    boot(frame, 12, 14, lift[0], false);
    boot(frame, 17, 19, lift[1], false);
  } else {
    leg(frame, 12, 14, lift[0], 0, false);
    leg(frame, 17, 19, lift[1], 0, false);
  }
  torso(frame, view, bob, look.tenue);
  arm(frame, 10, 11, bob, reach[0]);
  arm(frame, 20, 21, bob, reach[1]);
  head(frame, bob);
  face(frame, view, bob);
  hair(frame, view, look.coiffure, bob, 'front');
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
    createRamp([faceColors.bouche, faceColors.joue, faceColors.reflet, faceColors.reflet]),
  ];
  const look = { coiffure: character.coiffure ?? 'court', tenue: character.tenue ?? 'tunique' };
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
      drawBody(frame, view, pose, look);
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
