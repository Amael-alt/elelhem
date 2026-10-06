// Générateur de planches de personnages en pixel art, façon RPG HD-2D : cadres
// de 32 × 48 pixels, silhouette de trois têtes, visage dessiné (sourcils, yeux,
// nez, bouche, joues), cheveux en mèches avec un reflet, tenue détaillée,
// marche à six images avec rebond du corps.
//
// Une silhouette commune est calculée pour chaque direction et chaque image,
// puis habillée selon le personnage (data/characters.js) :
// - sa coiffure (court, long, chignon, queue, hérissé, chauve) : un volume plus
//   large que le crâne, une frange dentelée, des mèches plus sombres et une
//   bande de reflet ;
// - sa tenue (tunique ou robe) : col, ceinture et boucle, plis, poignets,
//   pantalon et bottes ;
// - son visage ;
// - puis son accessoire, décrit en grilles de caractères.
// Le volume vient d'une pseudo-normale (lumière en haut à gauche) ramenée à
// quatre tons par rampe, et un contour sombre bleuté entoure la silhouette.
//
// Planche : 9 colonnes (3 images de repos : respiration haute, basse,
// clignement ; 6 images de marche : contact, réception, passage, deux fois)
// × 4 lignes (bas, gauche, droite, haut). La droite est le miroir de la gauche.
//
// Canal émissif : la lettre « l » d'une grille d'accessoire est de la lumière
// (le bâton de l'Oracle Gépété). Ces pixels sont copiés dans une seconde
// planche, de même taille, lue comme carte d'émission : ils brillent même à
// l'ombre.

import { faceColors, glowRamp, leatherRamp, outlineColor } from '../data/palette.js';
import { createPixelBuffer, createRamp, hexToRgb, setPixel, toDataTexture } from './pixels.js';

export const FRAME_WIDTH = 32;
export const FRAME_HEIGHT = 48;
export const PIXELS_PER_UNIT = 24;
export const FEET_ROW = 45; // dernière ligne des bottes ; le pivot est sous elle
export const DIRECTIONS = ['down', 'left', 'right', 'up'];
// Repos : deux temps de respiration (colonnes 0 et 1) et un clignement
// (colonne 2), joué un court instant une fois par cycle.
export const IDLE_FRAMES = [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 2];
export const IDLE_FPS = 3;
export const WALK_FRAMES = [3, 4, 5, 6, 7, 8];
export const WALK_FPS = 10; // six images par cycle : une foulée toutes les 0,3 s
export const COLUMNS = 9;

const EMPTY = 0;
const RAMPS = { peau: 1, vetement: 2, accent: 3, cheveux: 4, cuir: 5, lumiere: 7, visage: 8 };
const OUTLINE = 6;
const LETTERS = { p: RAMPS.peau, v: RAMPS.vetement, a: RAMPS.accent, c: RAMPS.cheveux, b: RAMPS.cuir, l: RAMPS.lumiere };
// Tons de la rampe « visage » : bouche, joues, reflet des yeux.
const FACE = { bouche: 0, joue: 1, reflet: 2 };

// Lignes de référence de la silhouette, au repos (y vers le bas).
const HEAD = { cx: 16, cy: 12.5, rx: 5.5, ry: 6 };
// Volume des cheveux : un peu plus large et plus haut que le crâne.
const HAIR = { rx: 6.6, ry: 6.9, lift: 0.9 };
const NECK_ROW = 19;
const TORSO_TOP = 20;
const TORSO_BOTTOM = 33; // ourlet de la tunique, sur les hanches
const BELT_ROW = 30;
const ROBE_BELT_ROW = 28;
const ROBE_HEM = 44;
const LEG_TOP = 32; // sous la tunique : le pantalon apparaît dessous
const BOOT_TOP = 40;

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
  return { ramp: new Int8Array(FRAME_WIDTH * FRAME_HEIGHT), tone: new Int8Array(FRAME_WIDTH * FRAME_HEIGHT) };
}

function put(frame, x, y, ramp, tone) {
  if (x < 0 || y < 0 || x >= FRAME_WIDTH || y >= FRAME_HEIGHT) return;
  frame.ramp[y * FRAME_WIDTH + x] = ramp;
  frame.tone[y * FRAME_WIDTH + x] = Math.max(0, Math.min(3, tone));
}

const rampAt = (frame, x, y) => (x < 0 || y < 0 || x >= FRAME_WIDTH || y >= FRAME_HEIGHT ? EMPTY : frame.ramp[y * FRAME_WIDTH + x]);

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
  const i = y * FRAME_WIDTH + x;
  frame.tone[i] = Math.max(0, Math.min(3, frame.tone[i] + delta));
}

// --- Tête et visage ----------------------------------------------------------

function head(frame, bob) {
  ellipse(frame, HEAD.cx, HEAD.cy + bob, HEAD.rx, HEAD.ry, RAMPS.peau);
  // Le cou, plus sombre, dans l'ombre du menton.
  put(frame, 15, NECK_ROW + bob, RAMPS.peau, 1);
  put(frame, 16, NECK_ROW + bob, RAMPS.peau, 1);
  // Le menton s'arrondit d'un ton plus sombre.
  for (const x of [13, 14, 17, 18]) retone(frame, x, 18 + bob, RAMPS.peau, -1);
}

// Un œil : deux pixels de large, deux de haut, un reflet en haut à gauche.
// Fermé (clignement) : un trait sombre sur la ligne basse.
function eye(frame, x, y, closed) {
  if (closed) {
    put(frame, x, y + 1, OUTLINE, 0);
    put(frame, x + 1, y + 1, OUTLINE, 0);
    return;
  }
  put(frame, x, y, RAMPS.visage, FACE.reflet);
  put(frame, x + 1, y, OUTLINE, 0);
  put(frame, x, y + 1, OUTLINE, 0);
  put(frame, x + 1, y + 1, OUTLINE, 0);
}

// Sourcils, yeux, nez, bouche, joues. Face ou profil (tourné vers la gauche).
function face(frame, view, bob, blink) {
  const y = 13 + bob; // ligne haute des yeux
  if (view === 'down') {
    for (const x of [13, 17]) {
      put(frame, x, y - 2, RAMPS.cheveux, 0);
      put(frame, x + 1, y - 2, RAMPS.cheveux, 0);
      eye(frame, x, y, blink);
    }
    put(frame, 16, y + 2, RAMPS.peau, 1); // l'ombre du nez
    put(frame, 15, y + 4, RAMPS.visage, FACE.bouche);
    put(frame, 16, y + 4, RAMPS.visage, FACE.bouche);
    put(frame, 12, y + 3, RAMPS.visage, FACE.joue);
    put(frame, 19, y + 3, RAMPS.visage, FACE.joue);
  } else if (view === 'left') {
    put(frame, 12, y - 2, RAMPS.cheveux, 0);
    put(frame, 13, y - 2, RAMPS.cheveux, 0);
    eye(frame, 12, y, blink);
    put(frame, 10, y + 1, RAMPS.peau, 2); // le nez dépasse du profil
    put(frame, 10, y + 2, RAMPS.peau, 1);
    put(frame, 12, y + 4, RAMPS.visage, FACE.bouche);
    put(frame, 14, y + 3, RAMPS.visage, FACE.joue);
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
    // Une bande de reflet en haut à gauche du volume, comme une laque.
    if (ny > -0.74 && ny < -0.42 && nx > -0.6 && nx < 0.3 && tone >= 1 && shade === 0) tone = 3;
    // Mèches : de fines diagonales plus sombres donnent la matière.
    else if ((x * 3 + y) % 7 === 0 && tone > 0) tone -= 1;
    put(frame, x, y, RAMPS.cheveux, tone);
  };

  if (layer === 'back') {
    // Cheveux longs : ils tombent derrière les épaules (face) ou dans le dos (profil).
    if (style === 'long' && view === 'down') {
      for (let y = 17; y <= 30; y += 1) {
        for (const [x0, x1] of [[9, 11], [20, 22]]) {
          const narrow = y > 26 ? 1 : 0;
          for (let x = x0 + (x0 < 16 ? narrow : 0); x <= x1 - (x0 > 16 ? narrow : 0); x += 1) {
            paint(x, y + bob, (x - 16) / 8, (y - 20) / 14, 1);
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
  for (let y = 0; y < 26; y += 1) {
    for (let x = 0; x < FRAME_WIDTH; x += 1) {
      const n = inVolume(x, y);
      if (!n) continue;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - (HEAD.cy + bob);
      let covered;
      if (view === 'up') {
        covered = dy < 5.2; // de dos, la tête est toute en cheveux
      } else if (view === 'down') {
        const sides = Math.abs(dx) > HEAD.rx - 1.8 && dy < (style === 'long' ? 4.5 : 2.5);
        covered = dy < -2.2 + fringe(x) * 1.3 || sides;
      } else {
        // Profil tourné vers la gauche : l'arrière du crâne et le dessus.
        covered = dy < -2.2 + fringe(x) * 0.8 || (dx > -0.5 && dy < 3.5) || (dx > 2.5 && dy < 5.5);
      }
      if (style === 'chauve') {
        // Une couronne de cheveux à hauteur des oreilles, le crâne nu.
        if (view === 'up') covered = dy > -0.5 && dy < 5.2;
        else if (view === 'down') covered = Math.abs(dx) > HEAD.rx - 2.2 && dy > -2.5 && dy < 3;
        else covered = dx > 0.5 && dy > -2.5 && dy < 4;
      }
      if (style === 'herisse' && dy < -4) covered = covered && ((x % 3) !== 1 || dy > -5.5);
      if (covered) paint(x, y, n[0], n[1]);
    }
  }
  // Mèches qui dépassent au sommet du crâne (hérissé) : des pointes.
  if (style === 'herisse') {
    for (const [x, y] of [[11, 5], [12, 4], [15, 3], [16, 3], [19, 4], [20, 5], [13, 5], [18, 5], [10, 7], [21, 7]]) paint(x, y + bob, (x - 16) / 8, -0.9);
  }
  // Chignon : une boule au sommet (face, dos) ou à l'arrière (profil).
  if (style === 'chignon') {
    const [bx, by] = view === 'left' ? [21, 6] : [16, 4.5];
    ellipse(frame, bx, by + bob, 2.8, 2.4, RAMPS.cheveux);
  }
  // Queue de cheval : vue de dos ou de profil, une mèche qui pend.
  if (style === 'queue') {
    if (view === 'up') {
      for (let y = 18; y <= 28; y += 1) {
        const w = y > 25 ? 0 : 1;
        for (let x = 16 - w; x <= 16 + w; x += 1) put(frame, x, y + bob, RAMPS.cheveux, x === 16 - w ? 2 : 1);
      }
    }
    if (view === 'left') {
      for (const [x, y, tone] of [[22, 11, 2], [23, 12, 1], [23, 13, 2], [24, 14, 1], [24, 15, 1], [23, 16, 1], [23, 17, 2], [22, 18, 1], [22, 19, 1], [22, 20, 0]]) put(frame, x, y + bob, RAMPS.cheveux, tone);
    }
  }
  // Cheveux longs de dos ou de profil : par-dessus le dos.
  if (style === 'long' && view !== 'down') {
    const [x0, x1] = view === 'up' ? [10, 22] : [18, 23];
    for (let y = 18; y <= 29; y += 1) {
      const inset = y > 26 ? 1 : 0;
      for (let x = x0 + inset; x <= x1 - inset; x += 1) {
        put(frame, x, y + bob, RAMPS.cheveux, toneFromNormal((x - (x0 + x1) / 2) / 7, 0.2) - ((x * 3 + y) % 7 === 0 ? 1 : 0));
      }
    }
  }
  // Ombre sous la frange : la peau juste sous les cheveux s'assombrit.
  if (view !== 'up') {
    for (let y = 1; y < 22; y += 1) {
      for (let x = 0; x < FRAME_WIDTH; x += 1) {
        if (rampAt(frame, x, y) === RAMPS.peau && rampAt(frame, x, y - 1) === RAMPS.cheveux) retone(frame, x, y, RAMPS.peau, -1);
      }
    }
  }
}

// --- Corps et tenue ---------------------------------------------------------

// Une jambe : pantalon (la tunique plus sombre), botte avec un reflet sur la
// tige et un talon. hipRow : haut de la jambe (suit le rebond du corps) ;
// lift : la botte quitte le sol d'autant ; bend : la botte avance de ce
// nombre de pixels quand la jambe est pliée ; toe : bout de la botte en avant
// (profil).
function leg(frame, x0, x1, hipRow, lift, shade, toe, bend = 0, inner = null) {
  const bootTop = BOOT_TOP - lift;
  rect(frame, x0, hipRow, x1, bootTop - 1, RAMPS.vetement, shade + 1);
  rect(frame, x0 + bend, bootTop, x1 + bend, FEET_ROW - lift, RAMPS.cuir, shade);
  put(frame, x0 + bend, bootTop + 1, RAMPS.cuir, 3 - shade); // reflet sur la tige
  retone(frame, x1 + bend, FEET_ROW - lift, RAMPS.cuir, -1); // le talon
  if (toe) put(frame, x0 + bend - 1, FEET_ROW - lift, RAMPS.cuir, 1 - shade);
  // Vues de face et de dos : les deux jambes se touchent, un trait plus sombre
  // sur leur bord intérieur les sépare.
  if (inner !== null) {
    for (let y = hipRow; y < bootTop; y += 1) retone(frame, inner, y, RAMPS.vetement, -1);
    for (let y = bootTop; y <= FEET_ROW - lift; y += 1) retone(frame, inner + bend, y, RAMPS.cuir, -1);
  }
}

// Petites bottes sous une robe.
function boot(frame, x0, x1, lift, toe) {
  rect(frame, x0, ROBE_HEM - lift, x1, FEET_ROW - lift, RAMPS.cuir);
  if (toe) put(frame, x0 - 1, FEET_ROW - lift, RAMPS.cuir, 1);
}

// Le buste : tunique ou haut de robe, col en accent, ceinture et boucle, plis.
function torso(frame, view, bob, outfit) {
  const top = TORSO_TOP + bob;
  if (outfit === 'robe') {
    // La robe descend jusqu'aux chevilles en s'évasant.
    if (view === 'left') trapezoid(frame, top, ROBE_HEM, [13, 19], [11, 21], RAMPS.vetement);
    else trapezoid(frame, top, ROBE_HEM, [11, 20], [9, 22], RAMPS.vetement);
    // Ourlet en accent, plis plus sombres.
    for (let x = 0; x < FRAME_WIDTH; x += 1) if (rampAt(frame, x, ROBE_HEM) === RAMPS.vetement) put(frame, x, ROBE_HEM, RAMPS.accent, 1);
    for (const x of view === 'left' ? [14, 17] : [12, 15, 18]) for (let y = 33; y < ROBE_HEM; y += 1) retone(frame, x, y, RAMPS.vetement, -1);
  } else if (view === 'left') {
    trapezoid(frame, top, TORSO_BOTTOM + bob, [13, 20], [13, 19], RAMPS.vetement);
  } else {
    // Épaules un peu plus larges que la taille, ourlet qui s'évase sur les hanches.
    trapezoid(frame, top, BELT_ROW + bob, [11, 20], [11, 20], RAMPS.vetement);
    trapezoid(frame, BELT_ROW + 1 + bob, TORSO_BOTTOM + bob, [11, 20], [10, 21], RAMPS.vetement);
    for (const x of [13, 18]) retone(frame, x, TORSO_BOTTOM + bob, RAMPS.vetement, -1); // plis de la tunique
    for (const x of [12, 15, 19]) retone(frame, x, TORSO_BOTTOM + bob - 1, RAMPS.vetement, -1);
  }
  // L'ombre des épaules sous la tête.
  for (let x = 13; x <= 18; x += 1) retone(frame, x, top, RAMPS.vetement, -1);

  // Ceinture (ou ceinture de robe) et sa boucle.
  const beltY = (outfit === 'robe' ? ROBE_BELT_ROW : BELT_ROW) + bob;
  for (let x = 0; x < FRAME_WIDTH; x += 1) {
    if (rampAt(frame, x, beltY) === RAMPS.vetement) put(frame, x, beltY, outfit === 'robe' ? RAMPS.accent : RAMPS.cuir, x < 16 ? 2 : 1);
  }
  if (view === 'down') {
    put(frame, 15, beltY, RAMPS.accent, 3);
    put(frame, 16, beltY, RAMPS.accent, 2);
    // Col en V, bordé d'accent, un triangle de peau au creux.
    for (let x = 12; x <= 19; x += 1) put(frame, x, top, RAMPS.accent, x < 14 || x > 17 ? 2 : 1);
    put(frame, 14, top + 1, RAMPS.accent, 2);
    put(frame, 17, top + 1, RAMPS.accent, 1);
    put(frame, 15, top + 1, RAMPS.peau, 1);
    put(frame, 16, top + 1, RAMPS.peau, 1);
    put(frame, 15, top + 2, RAMPS.accent, 2);
    put(frame, 16, top + 2, RAMPS.accent, 1);
  } else if (view === 'left') {
    put(frame, 14, beltY, RAMPS.accent, 3);
    for (let x = 13; x <= 17; x += 1) put(frame, x, top, RAMPS.accent, x < 15 ? 2 : 1);
    put(frame, 13, top + 1, RAMPS.accent, 2);
  } else {
    for (let x = 12; x <= 19; x += 1) put(frame, x, top, RAMPS.accent, 1); // col, de dos
  }
}

// Un bras : manche de la couleur du buste, séparée de lui par un trait plus
// sombre sur son bord intérieur (inner), poignet en accent, main. reach : la
// main monte ou descend (balancement vu de face).
function arm(frame, x0, x1, bob, reach, inner = null) {
  const top = TORSO_TOP + 1 + bob;
  const cuff = BELT_ROW + 1 + bob + reach;
  rect(frame, x0, top, x1, cuff - 1, RAMPS.vetement);
  if (inner !== null) for (let y = top; y < cuff; y += 1) retone(frame, inner, y, RAMPS.vetement, -1);
  for (let x = x0; x <= x1; x += 1) put(frame, x, cuff, RAMPS.accent, 1);
  rect(frame, x0, cuff + 1, x1, cuff + 2, RAMPS.peau);
  retone(frame, x1, cuff + 2, RAMPS.peau, -1);
}

// Pose d'une image : bob (le corps monte ou descend d'un pixel, les pieds
// posés ne bougent pas), jambes levées, foulée et balancement des bras,
// clignement des yeux.
function drawBody(frame, view, pose, look) {
  const { bob = 0, lift = [0, 0], reach = [0, 0], stride = [0, 0], swing = 0, blink = false } = pose;
  const robe = look.tenue === 'robe';
  const hip = LEG_TOP + bob;
  hair(frame, view, look.coiffure, bob, 'back');
  if (view === 'left') {
    if (robe) {
      boot(frame, 15 + stride[1], 16 + stride[1], lift[1], true);
      boot(frame, 14 + stride[0], 15 + stride[0], lift[0], true);
    } else {
      // Jambe du fond, plus sombre, puis jambe de devant.
      leg(frame, 16 + stride[1], 18 + stride[1], hip, lift[1], 1, true, lift[1] ? -1 : 0);
      leg(frame, 14 + stride[0], 16 + stride[0], hip, lift[0], 0, true, lift[0] ? -1 : 0);
    }
    torso(frame, view, bob, look.tenue);
    head(frame, bob);
    face(frame, view, bob, blink);
    hair(frame, view, look.coiffure, bob, 'front');
    arm(frame, 16 + swing, 17 + swing, bob, 0);
    return;
  }
  if (robe) {
    boot(frame, 12, 14, lift[0], false);
    boot(frame, 17, 19, lift[1], false);
  } else {
    leg(frame, 12, 15, hip, lift[0], 0, false, 0, 15);
    leg(frame, 16, 19, hip, lift[1], 0, false, 0, 16);
  }
  torso(frame, view, bob, look.tenue);
  arm(frame, 9, 10, bob, reach[0], 10);
  arm(frame, 21, 22, bob, reach[1], 21);
  head(frame, bob);
  if (view === 'down') face(frame, view, bob, blink);
  hair(frame, view, look.coiffure, bob, 'front');
}

// Repos : respiration d'un pixel, puis un clignement. Marche : contact,
// réception (le corps descend, le pied libre monte), passage (le corps
// remonte, les jambes se croisent), puis la même chose de l'autre jambe.
const POSES = {
  front: [
    { bob: 0 }, { bob: 1 }, { bob: 0, blink: true },
    { bob: 0, lift: [0, 1], reach: [1, -1] },
    { bob: 1, lift: [0, 2], reach: [1, -1] },
    { bob: -1, lift: [0, 1], reach: [0, 0] },
    { bob: 0, lift: [1, 0], reach: [-1, 1] },
    { bob: 1, lift: [2, 0], reach: [-1, 1] },
    { bob: -1, lift: [1, 0], reach: [0, 0] },
  ],
  side: [
    { bob: 0 }, { bob: 1 }, { bob: 0, blink: true },
    { bob: 0, stride: [-3, 3], swing: 2 },
    { bob: 1, stride: [-2, 2], lift: [0, 1], swing: 1 },
    { bob: -1, stride: [0, 0], lift: [0, 1], swing: 0 },
    { bob: 0, stride: [3, -3], swing: -2 },
    { bob: 1, stride: [2, -2], lift: [1, 0], swing: -1 },
    { bob: -1, stride: [0, 0], lift: [1, 0], swing: 0 },
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
  for (let y = 0; y < FRAME_HEIGHT; y += 1) {
    for (let x = 0; x < FRAME_WIDTH; x += 1) {
      if (solid[y * FRAME_WIDTH + x]) continue;
      const touches = (x > 0 && solid[y * FRAME_WIDTH + x - 1]) || (x < FRAME_WIDTH - 1 && solid[y * FRAME_WIDTH + x + 1])
        || (y > 0 && solid[(y - 1) * FRAME_WIDTH + x]) || (y < FRAME_HEIGHT - 1 && solid[(y + 1) * FRAME_WIDTH + x]);
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
  const buffer = createPixelBuffer(FRAME_WIDTH * COLUMNS, FRAME_HEIGHT * DIRECTIONS.length);
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
      for (let y = 0; y < FRAME_HEIGHT; y += 1) {
        for (let x = 0; x < FRAME_WIDTH; x += 1) {
          const i = y * FRAME_WIDTH + x;
          const ramp = frame.ramp[i];
          if (ramp === EMPTY) continue;
          const rgb = ramp === OUTLINE ? outlineRgb : colors[ramp][frame.tone[i]];
          const px = column * FRAME_WIDTH + (mirror ? FRAME_WIDTH - 1 - x : x);
          setPixel(buffer, px, row * FRAME_HEIGHT + y, rgb);
          if (ramp === RAMPS.lumiere) {
            setPixel(glow, px, row * FRAME_HEIGHT + y, rgb);
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
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
  };
}
