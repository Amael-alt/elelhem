// Planches de personnages à partir des sprites transcrits (data/sprites/) :
// jusqu'à cinq vues dessinées (face, trois-quarts face, profil tourné vers la
// gauche, trois-quarts dos, dos) deviennent une planche de 15 ou 36 colonnes
// sur 8 lignes, une par direction du regard (version 2.5 : huit directions,
// les diagonales comprises ; la droite est le miroir de la gauche). Le
// mouvement est fabriqué ici : respiration au repos, marche à six images (le
// corps rebondit d'un pixel, les jambes se lèvent et s'écartent de face, se
// croisent de profil, les bras balancent), course à six images plus amples.
//
// Un sprite : { cadre: [largeur, hauteur], pieds, couleurs: [hex...],
// lumiere: [caractères...], face, profil, dos : [lignes], et depuis la
// version 2.5, facultatifs, troisQuarts et troisQuartsDos }, un caractère par
// pixel (index 0-9 puis a-z dans couleurs, « . » vide). Sans trois-quarts, la
// face et le dos servent aux diagonales. Les pixels dont le caractère est
// dans lumiere sont recopiés dans une seconde planche, lue comme carte
// d'émission : ils brillent même à l'ombre (le bâton de l'Oracle).
//
// Le héros porte en plus ses poses de combat, transcrites de fiches à part
// (version 2.1) : `arme`, le même personnage l'épée à la main (repos et marche
// se fabriquent dessus comme sur les vues nues), et `coups`, trois paires de
// vues figées, l'élan puis la frappe de chaque coup. Chaque grille apporte sa
// palette ; une grille plus étroite que le cadre est centrée dedans. Les
// coups ne sont dessinés qu'en quatre directions : sur une diagonale, la
// planche reprend la vue de profil (le combat tourne d'abord le héros vers
// la direction cardinale la plus proche, voir game/combat.js).
//
// Le cadre de la planche est propre à chaque personnage : le plus grand des
// cadres de ses grilles (80 × 88 pour le héros et son épée levée, 48 × 56
// pour un habitant de la version 2.5). Un sprite sans combat n'a que les
// quinze colonnes de repos, de marche et de course : sa planche est petite.
//
// Repères trouvés dans le dessin de face : la ligne des hanches est la plus
// haute ligne où un vide sépare les deux jambes ; sous une robe, seules les
// bottes bougent. Les objets tenus loin du corps (bâton, hallebarde, épée au
// repos) restent immobiles.

import { sprites } from '../data/sprites/index.js';
import { createPixelBuffer, hexToRgb, setPixel, toDataTexture } from './pixels.js';

// Le cadre du héros : assez large pour une épée tendue, assez haut pour une
// épée levée (version 2.1). Les autres personnages ont le leur (voir plus bas).
export const FRAME_WIDTH = 80;
export const FRAME_HEIGHT = 88;
export const PIXELS_PER_UNIT = 36; // le héros fait 40 pixels de haut, chapeau compris : 1,1 unité
export const FEET_ROW = 85; // dernière ligne des bottes dans le cadre du héros ; le pivot est sous elle
const BELOW_FEET = 2; // lignes sous les bottes, dans tous les cadres
// Huit directions, dans l'ordre des lignes de la planche. Sud = +z = bas de l'écran.
export const DIRECTIONS = ['down', 'downleft', 'left', 'upleft', 'up', 'upright', 'right', 'downright'];
// Repos : deux temps de respiration (colonnes 0 et 1), la colonne 2 répète le
// premier (place gardée pour un clignement).
export const IDLE_FRAMES = [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 2];
export const IDLE_FPS = 3;
export const WALK_FRAMES = [3, 4, 5, 6, 7, 8];
export const WALK_FPS = 10; // six images par cycle : une foulée toutes les 0,3 s
// La course (colonnes 9 à 14) : la même foulée, plus ample, le buste penché.
export const RUN_FRAMES = [9, 10, 11, 12, 13, 14];
const PLAIN_COLUMNS = 15;
// Les mêmes, l'épée à la main (colonnes 15 à 29) : sur la lande, le héros la
// porte au repos, en marchant et en courant.
const ARMED_OFFSET = 15;
export const ARMED_IDLE_FRAMES = IDLE_FRAMES.map((column) => column + ARMED_OFFSET);
export const ARMED_WALK_FRAMES = WALK_FRAMES.map((column) => column + ARMED_OFFSET);
export const ARMED_RUN_FRAMES = RUN_FRAMES.map((column) => column + ARMED_OFFSET);
// Les trois coups (colonnes 30 à 35) : pour chacun, l'élan puis la frappe.
export const STRIKE_FRAMES = [[30, 31], [32, 33], [34, 35]];
export const COLUMNS = 36;

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
const EMPTY = -1;
const LEG_SEARCH = 16; // l'entrejambe se cherche dans les seize dernières lignes
const LEG_REACH = 7; // demi-largeur de la zone des jambes autour du centre
const ROBE_BOOTS = 4; // sous une robe, les quatre dernières lignes (les bottes) bougent
const ARM_SHARE = 0.45; // part du buste (depuis les hanches) où les bras balancent
const ARM_WIDTH = 3; // pixels du bord du buste qui suivent le bras
const BACK_LEG_SHADE = 0.72; // la jambe arrière, de profil, est plus sombre
const SIDE_SHIFT = 0.4; // de profil, part de la foulée qui déplace la jambe entière
const SIDE_SHEAR = 0.7; // et part qui l'incline depuis la hanche

// --- Directions ---------------------------------------------------------------

// L'angle de chaque direction, en radians, 0 vers la droite de l'écran,
// positif vers le bas (sud).
const ANGLE_OF = {
  right: 0, downright: Math.PI / 4, down: Math.PI / 2, downleft: (3 * Math.PI) / 4,
  left: Math.PI, upleft: (-3 * Math.PI) / 4, up: -Math.PI / 2, upright: -Math.PI / 4,
};
const BY_OCTANT = ['right', 'downright', 'down', 'downleft', 'left', 'upleft', 'up', 'upright'];
const OCTANT = Math.PI / 4;

// La direction du regard pour un écart (dx, dz) : la plus proche des huit.
// La direction en cours est gardée tant que l'écart n'en sort pas de plus de
// `bias` radians au-delà de son octant : sur une diagonale, le personnage ne
// tremble pas entre deux vues.
export function directionOf(dx, dz, current = null, bias = 0.2) {
  if (Math.abs(dx) < 1e-4 && Math.abs(dz) < 1e-4) return current ?? 'down';
  const angle = Math.atan2(dz, dx);
  if (current && current in ANGLE_OF) {
    let gap = Math.abs(angle - ANGLE_OF[current]);
    if (gap > Math.PI) gap = 2 * Math.PI - gap;
    if (gap <= OCTANT / 2 + bias) return current;
  }
  const index = Math.round(angle / OCTANT);
  return BY_OCTANT[((index % 8) + 8) % 8];
}

// La direction cardinale la plus proche d'une direction : sur une diagonale,
// le côté (les coups d'épée ne sont dessinés que de face, de profil et de dos).
const CARDINAL_OF = {
  down: 'down', up: 'up', left: 'left', right: 'right',
  downleft: 'left', upleft: 'left', downright: 'right', upright: 'right',
};
export const cardinalOf = (direction) => CARDINAL_OF[direction] ?? 'down';

// Repos : respiration d'un pixel. Marche : contact, réception (le corps
// descend, le pied libre monte et s'écarte), passage (le corps remonte), puis
// l'autre jambe ; les bras balancent. Course : la même foulée, plus haute et
// plus large, le buste penché en avant. De profil, stride écarte les jambes,
// en pixels aux pieds (version 2.1 : pas plus amples, « les pieds étaient
// trop collés » ; version 2.5 : les jambes sont courtes, les pas aussi).
const FRONT_POSES = [
  { bob: 0 }, { bob: 1 }, { bob: 0 },
  { bob: 0, liftR: 2, spreadR: 1, swing: 1 },
  { bob: 1, liftR: 2, spreadR: 1, swing: 1 },
  { bob: -1, liftR: 1 },
  { bob: 0, liftL: 2, spreadL: 1, swing: -1 },
  { bob: 1, liftL: 2, spreadL: 1, swing: -1 },
  { bob: -1, liftL: 1 },
  { bob: 1, liftR: 3, spreadR: 2, swing: 2 },
  { bob: 2, liftR: 3, spreadR: 2, swing: 2 },
  { bob: -1, liftR: 2, spreadR: 1 },
  { bob: 1, liftL: 3, spreadL: 2, swing: -2 },
  { bob: 2, liftL: 3, spreadL: 2, swing: -2 },
  { bob: -1, liftL: 2, spreadL: 1 },
];
const SIDE_POSES = [
  { bob: 0 }, { bob: 1 }, { bob: 0 },
  { bob: 0, stride: 4 },
  { bob: 1, stride: 2, lift: 2 },
  { bob: -1, stride: 0 },
  { bob: 0, stride: -4 },
  { bob: 1, stride: -2, lift: 2 },
  { bob: -1, stride: 0 },
  { bob: 1, stride: 6, lean: 2 },
  { bob: 2, stride: 4, lift: 2, lean: 2 },
  { bob: -1, stride: 1, lean: 2 },
  { bob: 1, stride: -6, lean: 2 },
  { bob: 2, stride: -4, lift: 2, lean: 2 },
  { bob: -1, stride: -1, lean: 2 },
];
// Un personnage sans fiche de combat frappe quand même : le corps s'abaisse de
// face ou de dos, le buste penche en avant de profil (l'épée est dessinée à part).
const FRONT_STRIKE = { bob: 1, swing: 1 };
const SIDE_STRIKE = { bob: 1, stride: 2, lean: 3 };
// Ce qui flotte (les Hallucinations) ne marche pas : tout le corps ondule.
const FLOAT_POSES = [0, 1, 0, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1].map((bob) => ({ bob }));

// --- Lecture des grilles ----------------------------------------------------

// Les fonctions de dessin travaillent dans un cadre (largeur, hauteur) : celui
// de la planche en cours, fixé par createCharacterSheet.
let W = FRAME_WIDTH;
let H = FRAME_HEIGHT;

// Une grille plus petite que le cadre est centrée en largeur et alignée par
// le bas : ses pieds tombent sur la ligne des pieds du cadre.
function parseGrid(rows, gridWidth, gridHeight) {
  const cells = new Int8Array(W * H).fill(EMPTY);
  const offsetX = Math.floor((W - gridWidth) / 2);
  const offsetY = H - gridHeight;
  rows.forEach((row, y) => {
    const ty = y + offsetY;
    if (ty < 0 || ty >= H) return;
    for (let x = 0; x < row.length && x + offsetX < W; x += 1) {
      if (row[x] !== '.') cells[ty * W + x + offsetX] = DIGITS.indexOf(row[x]);
    }
  });
  return cells;
}

const at = (cells, x, y) => (x < 0 || y < 0 || x >= W || y >= H ? EMPTY : cells[y * W + x]);

// Repères d'une vue de face (ou de trois-quarts) : haut et bas de la
// silhouette, colonne centrale (médiane des pixels pleins : un bâton fin ne
// la déplace pas), ligne des hanches et longueur des jambes.
function analyzeFront(cells) {
  let top = H;
  let bottom = -1;
  const xs = [];
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (cells[y * W + x] === EMPTY) continue;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      xs.push(x);
    }
  }
  xs.sort((a, b) => a - b);
  const center = xs.length ? xs[Math.floor(xs.length / 2)] : W / 2;
  // Une ligne « à deux jambes » : vide au centre, plein de chaque côté, pas loin.
  const splitAt = (y) => {
    if (at(cells, center, y) !== EMPTY) return false;
    let left = false;
    let right = false;
    for (let d = 1; d <= LEG_REACH; d += 1) {
      if (at(cells, center - d, y) !== EMPTY) left = true;
      if (at(cells, center + d, y) !== EMPTY) right = true;
    }
    return left && right;
  };
  let hips = -1;
  for (let y = bottom; y >= Math.max(top, bottom - LEG_SEARCH); y -= 1) {
    if (splitAt(y)) hips = y;
    else if (hips >= 0) break;
  }
  const robe = hips < 0;
  if (robe) hips = bottom - ROBE_BOOTS + 1;
  return { top, bottom, center, hips, robe, legLength: bottom - hips };
}

// Haut et bas d'une autre vue, pour y reporter la longueur des jambes.
function bounds(cells) {
  let top = H;
  let bottom = -1;
  const xs = [];
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (cells[y * W + x] === EMPTY) continue;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      xs.push(x);
    }
  }
  xs.sort((a, b) => a - b);
  return { top, bottom, center: xs.length ? xs[Math.floor(xs.length / 2)] : W / 2 };
}

// --- Fabrication d'une image -------------------------------------------------

// Une image en cours : l'index de couleur de chaque pixel et son ombrage
// (0 normal, 1 assombri).
function createFrame() {
  return { index: new Int8Array(W * H).fill(EMPTY), shade: new Uint8Array(W * H) };
}

// Recopie une zone de la grille source dans l'image, décalée de (dx, dy) ;
// shear(y) ajoute un décalage horizontal propre à chaque ligne ; keep(x, y)
// choisit les pixels concernés.
function stamp(frame, cells, { rows, cols = null, dx = 0, dy = 0, shade = 0, shear = null, keep = null }) {
  const [x0, x1] = cols ?? [0, W - 1];
  for (let y = rows[0]; y <= rows[1]; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const value = at(cells, x, y);
      if (value === EMPTY || (keep && !keep(x, y))) continue;
      const tx = x + dx + (shear ? shear(y) : 0);
      const ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
      frame.index[ty * W + tx] = value;
      frame.shade[ty * W + tx] = shade;
    }
  }
}

// Vue de face, de trois-quarts ou de dos : les jambes se lèvent tour à tour,
// le corps rebondit, les bords du buste (les bras) balancent d'un pixel.
function frontFrame(cells, info, pose) {
  const frame = createFrame();
  const { top, bottom, center, hips } = info;
  const bob = pose.bob ?? 0;
  const inLegs = (x) => Math.abs(x - center) <= LEG_REACH;
  // Ce qui, dans les lignes des jambes, n'est pas une jambe (un bâton) ne bouge pas.
  stamp(frame, cells, { rows: [hips, bottom], keep: (x) => !inLegs(x) });
  for (const [side, lift, spread] of [['left', pose.liftL ?? 0, pose.spreadL ?? 0], ['right', pose.liftR ?? 0, pose.spreadR ?? 0]]) {
    const cols = side === 'left' ? [center - LEG_REACH, center - 1] : [center, center + LEG_REACH];
    // La jambe levée s'écarte du corps (spread), d'autant plus qu'on descend
    // vers le pied : le genou reste près de la hanche.
    const legSpan = Math.max(1, bottom - hips);
    const sign = side === 'left' ? -1 : 1;
    const shear = spread ? (y) => sign * Math.round((spread * (y - hips)) / legSpan) : null;
    stamp(frame, cells, { rows: [hips, bottom], cols, dy: -lift, shear });
    // Le corps remonte : la ligne des hanches se répète pour ne laisser aucun trou.
    if (bob < 0) stamp(frame, cells, { rows: [hips, hips], cols, dy: -lift - 1 });
  }
  // Le buste, puis les bras s'il balance : les ARM_WIDTH pixels du bord de la
  // bande basse du buste montent d'un côté et descendent de l'autre.
  const swing = pose.swing ?? 0;
  const armTop = hips - Math.round((hips - top) * ARM_SHARE);
  const arms = new Set();
  if (swing) {
    for (let y = armTop; y < hips; y += 1) {
      let left = -1;
      let right = -1;
      for (let x = 0; x < W; x += 1) {
        if (at(cells, x, y) === EMPTY || !inLegs(x) && Math.abs(x - center) > LEG_REACH + 4) continue;
        if (left < 0) left = x;
        right = x;
      }
      if (left < 0) continue;
      for (let d = 0; d < ARM_WIDTH; d += 1) {
        arms.add(`${left + d},${y},${swing}`);
        arms.add(`${right - d},${y},${-swing}`);
      }
    }
  }
  const isArm = (x, y, direction) => arms.has(`${x},${y},${direction}`);
  stamp(frame, cells, { rows: [top, hips - 1], dy: bob, keep: (x, y) => !isArm(x, y, swing) && !isArm(x, y, -swing) });
  if (swing) {
    stamp(frame, cells, { rows: [armTop, hips - 1], dy: bob + swing, keep: (x, y) => isArm(x, y, swing) });
    stamp(frame, cells, { rows: [armTop, hips - 1], dy: bob - swing, keep: (x, y) => isArm(x, y, -swing) });
  }
  return frame;
}

// Vue de profil : les jambes dessinées servent deux fois, cisaillées en sens
// contraires (une jambe arrière assombrie, une jambe avant), le corps rebondit.
function sideFrame(cells, info, pose) {
  const frame = createFrame();
  const { top, bottom, center, hips } = info;
  const bob = pose.bob ?? 0;
  const stride = pose.stride ?? 0;
  const lift = pose.lift ?? 0;
  const lean = pose.lean ?? 0;
  const span = Math.max(1, bottom - hips);
  const inLegs = (x) => Math.abs(x - center) <= LEG_REACH;
  stamp(frame, cells, { rows: [hips, bottom], keep: (x) => !inLegs(x) });
  if (stride === 0) {
    stamp(frame, cells, { rows: [hips, bottom], keep: inLegs });
    if (bob < 0) stamp(frame, cells, { rows: [hips, hips], dy: -1, keep: inLegs });
  } else {
    // On regarde vers la gauche : l'avant est à gauche (x négatif). Chaque
    // jambe se déplace d'un bloc (shift : la cuisse bouge aussi, pas seulement
    // le pied) et se cisaille depuis la hanche (version 2.7 : les jambes sont
    // courtes, le cisaillement seul ne bougeait que les pieds).
    const shift = Math.sign(stride) * Math.max(1, Math.round(Math.abs(stride) * SIDE_SHIFT));
    const shear = (direction) => (y) => Math.round((direction * stride * SIDE_SHEAR * (y - hips)) / span);
    stamp(frame, cells, { rows: [hips, bottom], shade: 1, dx: shift, shear: shear(1), keep: inLegs });
    stamp(frame, cells, { rows: [hips, bottom], dx: -shift, dy: -lift, shear: shear(-1), keep: inLegs });
    if (bob < 0) stamp(frame, cells, { rows: [hips, hips], dy: -1, keep: inLegs });
  }
  // Le buste penche vers l'avant (la gauche) : d'autant plus qu'on monte.
  const bodySpan = Math.max(1, hips - top);
  stamp(frame, cells, { rows: [top, hips - 1], dy: bob, shear: lean ? (y) => -Math.round((lean * (hips - y)) / bodySpan) : null });
  return frame;
}

// Ce qui flotte : la grille entière, décalée du balancement.
function floatFrame(cells, pose) {
  const frame = createFrame();
  stamp(frame, cells, { rows: [0, H - 1], dy: pose.bob ?? 0 });
  return frame;
}

// Une pose figée (les coups d'épée dessinés) : la grille telle quelle.
function stillFrame(cells) {
  return floatFrame(cells, { bob: 0 });
}

// --- Planche complète -------------------------------------------------------

// La vue dessinée qui sert à chaque direction, et celles qui se lisent en
// miroir (la droite est le miroir de la gauche).
const VIEW_OF = {
  down: 'face', downleft: 'troisQuarts', left: 'profil', upleft: 'troisQuartsDos',
  up: 'dos', upright: 'troisQuartsDos', right: 'profil', downright: 'troisQuarts',
};
const MIRRORED = new Set(['right', 'upright', 'downright']);
// Sans trois-quarts dessinés, la face et le dos tiennent lieu des diagonales.
const FALLBACK = { troisQuarts: 'face', troisQuartsDos: 'dos' };

// Un jeu de vues avec sa palette : les grilles lues (les trois-quarts absents
// renvoient à la face et au dos), les repères de chaque vue, la palette
// normale et sa version assombrie (jambe arrière).
function readViews(data) {
  const colors = data.couleurs.map(hexToRgb);
  const [gridWidth, gridHeight] = data.cadre;
  const grids = {};
  for (const view of ['face', 'profil', 'dos', 'troisQuarts', 'troisQuartsDos']) {
    const rows = data[view] ?? data[FALLBACK[view]];
    grids[view] = parseGrid(rows, gridWidth, gridHeight);
  }
  const front = analyzeFront(grids.face);
  const infos = { face: front };
  // Les trois-quarts ont leurs jambes visibles : elles se lisent comme de
  // face ; faute d'entrejambe net, la longueur de jambes de la face sert. Le
  // profil et le dos reçoivent toujours celle de la face.
  for (const view of ['troisQuarts', 'troisQuartsDos']) {
    if (!data[view]) {
      infos[view] = front;
      continue;
    }
    const own = analyzeFront(grids[view]);
    infos[view] = own.robe && !front.robe ? { ...own, hips: own.bottom - front.legLength, robe: false, legLength: front.legLength } : own;
  }
  for (const view of ['profil', 'dos']) {
    const b = bounds(grids[view]);
    infos[view] = { ...b, hips: b.bottom - front.legLength, robe: front.robe, legLength: front.legLength };
  }
  return {
    grids, front, infoOf: (view) => infos[view], colors,
    darker: colors.map(([r, g, b]) => [r, g, b].map((c) => Math.round(c * BACK_LEG_SHADE))),
  };
}

// Toutes les grilles d'un personnage : les vues nues, l'épée à la main, les coups.
function allGrids(data) {
  const list = [data];
  if (data.arme) list.push(data.arme);
  for (const pair of data.coups ?? []) list.push(...pair);
  return list;
}

// Chaque grille a le même nombre de lignes sous les pieds (BELOW_FEET) : alignée
// par le bas, elle pose sur la ligne des pieds du cadre.
function checkGrid(data, name) {
  if (data.cadre[1] - 1 - data.pieds !== BELOW_FEET) {
    throw new Error(`Sprite ${name} : cadre ${data.cadre.join('×')}, pieds ${data.pieds} ; attendu ${BELOW_FEET} lignes sous les pieds.`);
  }
}

export function createCharacterSheet(character) {
  const data = sprites[character.sprite];
  if (!data) throw new Error(`Sprite inconnu : « ${character.sprite} » (fiche ${character.id}).`);
  allGrids(data).forEach((grid) => checkGrid(grid, character.sprite));
  // Le cadre de la planche : le plus grand des cadres du personnage.
  W = Math.max(...allGrids(data).map((grid) => grid.cadre[0]));
  H = Math.max(...allGrids(data).map((grid) => grid.cadre[1]));
  const feetRow = H - 1 - BELOW_FEET;
  const columns = data.arme || data.coups ? COLUMNS : PLAIN_COLUMNS;

  const glowing = new Set(data.lumiere.map((ch) => DIGITS.indexOf(ch)));
  const base = readViews(data);
  // Les poses de combat du héros, si sa fiche les porte (version 2.1).
  const armed = data.arme ? readViews(data.arme) : null;
  const strikes = data.coups ? data.coups.map((pair) => pair.map((pose) => readViews(pose))) : null;

  const buffer = createPixelBuffer(W * columns, H * DIRECTIONS.length);
  const glow = createPixelBuffer(buffer.width, buffer.height);
  let hasGlow = false;

  // Pose une image dans la planche, avec la palette de son jeu de vues.
  const paint = (frame, views, column, row, mirror) => {
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const i = y * W + x;
        const index = frame.index[i];
        if (index === EMPTY) continue;
        const rgb = (frame.shade[i] ? views.darker : views.colors)[index];
        const px = column * W + (mirror ? W - 1 - x : x);
        setPixel(buffer, px, row * H + y, rgb);
        // Les index de lumière valent pour tous les jeux de vues : les poses
        // de combat reprennent la palette de base aux mêmes index.
        if (glowing.has(index) && index < base.colors.length) {
          setPixel(glow, px, row * H + y, views.colors[index]);
          hasGlow = true;
        }
      }
    }
  };

  // Les quinze images de repos, de marche et de course d'un jeu de vues, à
  // partir de column.
  const animate = (views, view, column, row, mirror) => {
    const cells = views.grids[view];
    const info = views.infoOf(view);
    const poses = data.flottant ? FLOAT_POSES : view === 'profil' ? SIDE_POSES : FRONT_POSES;
    poses.forEach((pose, i) => {
      const frame = data.flottant ? floatFrame(cells, pose) : view === 'profil' ? sideFrame(cells, info, pose) : frontFrame(cells, info, pose);
      paint(frame, views, column + i, row, mirror);
    });
  };

  DIRECTIONS.forEach((direction, row) => {
    const view = VIEW_OF[direction];
    const mirror = MIRRORED.has(direction);
    animate(base, view, 0, row, mirror);
    if (columns === PLAIN_COLUMNS) return;
    // L'épée à la main : les vues armées, sinon les mêmes images (l'épée est
    // alors dessinée à part, gfx/weapon.js).
    animate(armed ?? base, view, ARMED_OFFSET, row, mirror);
    // Les coups, dessinés de face, de profil et de dos seulement : une
    // diagonale reprend la vue cardinale la plus proche.
    const strikeView = VIEW_OF[cardinalOf(direction)];
    STRIKE_FRAMES.forEach((pair, hit) => {
      pair.forEach((column, phase) => {
        if (strikes) {
          const views = strikes[hit][phase];
          paint(stillFrame(views.grids[strikeView]), views, column, row, mirror);
        } else {
          const cells = base.grids[strikeView];
          const info = base.infoOf(strikeView);
          const frame = data.flottant ? floatFrame(cells, { bob: 1 }) : strikeView === 'profil' ? sideFrame(cells, info, SIDE_STRIKE) : frontFrame(cells, info, FRONT_STRIKE);
          paint(frame, base, column, row, mirror);
        }
      });
    });
  });

  const sheet = {
    buffer,
    texture: toDataTexture(buffer, { repeat: false, mipmaps: false }),
    // Carte d'émission, absente quand le personnage n'a aucune lumière.
    emissive: hasGlow ? toDataTexture(glow, { repeat: false, mipmaps: false }) : null,
    columns,
    rows: DIRECTIONS.length,
    frameWidth: W,
    frameHeight: H,
    feetRow,
    // Repères utiles à l'interface (étiquette au-dessus de la tête) : le haut
    // du personnage dans son cadre, et sa hauteur en unités.
    top: base.front.top,
    height: (feetRow + 1 - base.front.top) / PIXELS_PER_UNIT,
    // Le personnage a ses propres vues l'épée à la main et ses coups dessinés.
    armed: Boolean(armed && strikes),
  };
  W = FRAME_WIDTH;
  H = FRAME_HEIGHT;
  return sheet;
}
