// Planches de personnages à partir des sprites transcrits (data/sprites/) :
// trois vues dessinées (face, profil tourné vers la gauche, dos) deviennent
// une planche de 9 colonnes × 4 lignes (bas, gauche, droite, haut). Le
// mouvement est fabriqué ici : respiration au repos, marche à six images (le
// corps rebondit d'un pixel, les jambes se lèvent de face et se croisent de
// profil, les bras balancent). La droite est le miroir de la gauche.
//
// Un sprite : { cadre: [largeur, hauteur], pieds, couleurs: [hex...],
// lumiere: [caractères...], face, profil, dos : [lignes] }, un caractère par
// pixel (index 0-9 puis a-z dans couleurs, « . » vide). Les pixels dont le
// caractère est dans lumiere sont recopiés dans une seconde planche, lue comme
// carte d'émission : ils brillent même à l'ombre (le bâton de l'Oracle).
//
// Repères trouvés dans le dessin de face : la ligne des hanches est la plus
// haute ligne où un vide sépare les deux jambes ; sous une robe, seules les
// bottes bougent. Les objets tenus loin du corps (bâton, hallebarde) restent
// immobiles.

import { sprites } from '../data/sprites/index.js';
import { createPixelBuffer, hexToRgb, setPixel, toDataTexture } from './pixels.js';

export const FRAME_WIDTH = 48;
export const FRAME_HEIGHT = 72;
export const PIXELS_PER_UNIT = 36; // le héros fait 56 pixels de haut, chapeau compris : 1,55 unité
export const FEET_ROW = 69; // dernière ligne des bottes ; le pivot est sous elle
export const DIRECTIONS = ['down', 'left', 'right', 'up'];
// Repos : deux temps de respiration (colonnes 0 et 1), la colonne 2 répète le
// premier (place gardée pour un clignement).
export const IDLE_FRAMES = [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 2];
export const IDLE_FPS = 3;
export const WALK_FRAMES = [3, 4, 5, 6, 7, 8];
export const WALK_FPS = 10; // six images par cycle : une foulée toutes les 0,3 s
// La dixième colonne : la pose du coup d'épée (le corps se penche en avant).
export const ATTACK_FRAME = 9;
export const COLUMNS = 10;

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
const EMPTY = -1;
const LEG_SEARCH = 20; // l'entrejambe se cherche dans les vingt dernières lignes
const LEG_REACH = 8; // demi-largeur de la zone des jambes autour du centre
const ROBE_BOOTS = 5; // sous une robe, les cinq dernières lignes (les bottes) bougent
const ARM_SHARE = 0.45; // part du buste (depuis les hanches) où les bras balancent
const ARM_WIDTH = 3; // pixels du bord du buste qui suivent le bras
const BACK_LEG_SHADE = 0.72; // la jambe arrière, de profil, est plus sombre

// Repos : respiration d'un pixel. Marche : contact, réception (le corps
// descend, le pied libre monte), passage (le corps remonte), puis l'autre
// jambe. De profil, stride écarte les jambes, en pixels aux pieds.
const FRONT_POSES = [
  { bob: 0 }, { bob: 1 }, { bob: 0 },
  { bob: 0, liftR: 1, swing: 1 },
  { bob: 1, liftR: 2, swing: 1 },
  { bob: -1, liftR: 1 },
  { bob: 0, liftL: 1, swing: -1 },
  { bob: 1, liftL: 2, swing: -1 },
  { bob: -1, liftL: 1 },
  { bob: 1, swing: 1 }, // le coup, de face ou de dos : le corps s'abaisse
];
const SIDE_POSES = [
  { bob: 0 }, { bob: 1 }, { bob: 0 },
  { bob: 0, stride: 3 },
  { bob: 1, stride: 2, lift: 1 },
  { bob: -1, stride: 0 },
  { bob: 0, stride: -3 },
  { bob: 1, stride: -2, lift: 1 },
  { bob: -1, stride: 0 },
  { bob: 1, stride: 2, lean: 3 }, // le coup, de profil : le buste penche en avant
];
// Ce qui flotte (les Hallucinations) ne marche pas : tout le corps ondule.
const FLOAT_POSES = [0, 1, 0, -1, 0, 1, 1, 0, -1, 0].map((bob) => ({ bob }));

// --- Lecture des grilles ----------------------------------------------------

function parseGrid(rows) {
  const cells = new Int8Array(FRAME_WIDTH * FRAME_HEIGHT).fill(EMPTY);
  rows.forEach((row, y) => {
    if (y >= FRAME_HEIGHT) return;
    for (let x = 0; x < row.length && x < FRAME_WIDTH; x += 1) {
      if (row[x] !== '.') cells[y * FRAME_WIDTH + x] = DIGITS.indexOf(row[x]);
    }
  });
  return cells;
}

const at = (cells, x, y) => (x < 0 || y < 0 || x >= FRAME_WIDTH || y >= FRAME_HEIGHT ? EMPTY : cells[y * FRAME_WIDTH + x]);

// Repères de la vue de face : haut et bas de la silhouette, colonne centrale
// (médiane des pixels pleins : un bâton fin ne la déplace pas), ligne des
// hanches et longueur des jambes.
function analyzeFront(cells) {
  let top = FRAME_HEIGHT;
  let bottom = -1;
  const xs = [];
  for (let y = 0; y < FRAME_HEIGHT; y += 1) {
    for (let x = 0; x < FRAME_WIDTH; x += 1) {
      if (cells[y * FRAME_WIDTH + x] === EMPTY) continue;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      xs.push(x);
    }
  }
  xs.sort((a, b) => a - b);
  const center = xs.length ? xs[Math.floor(xs.length / 2)] : FRAME_WIDTH / 2;
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
  let top = FRAME_HEIGHT;
  let bottom = -1;
  const xs = [];
  for (let y = 0; y < FRAME_HEIGHT; y += 1) {
    for (let x = 0; x < FRAME_WIDTH; x += 1) {
      if (cells[y * FRAME_WIDTH + x] === EMPTY) continue;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      xs.push(x);
    }
  }
  xs.sort((a, b) => a - b);
  return { top, bottom, center: xs.length ? xs[Math.floor(xs.length / 2)] : FRAME_WIDTH / 2 };
}

// --- Fabrication d'une image -------------------------------------------------

// Une image en cours : l'index de couleur de chaque pixel et son ombrage
// (0 normal, 1 assombri).
function createFrame() {
  return { index: new Int8Array(FRAME_WIDTH * FRAME_HEIGHT).fill(EMPTY), shade: new Uint8Array(FRAME_WIDTH * FRAME_HEIGHT) };
}

// Recopie une zone de la grille source dans l'image, décalée de (dx, dy) ;
// shear(y) ajoute un décalage horizontal propre à chaque ligne ; keep(x, y)
// choisit les pixels concernés.
function stamp(frame, cells, { rows, cols = [0, FRAME_WIDTH - 1], dx = 0, dy = 0, shade = 0, shear = null, keep = null }) {
  for (let y = rows[0]; y <= rows[1]; y += 1) {
    for (let x = cols[0]; x <= cols[1]; x += 1) {
      const value = at(cells, x, y);
      if (value === EMPTY || (keep && !keep(x, y))) continue;
      const tx = x + dx + (shear ? shear(y) : 0);
      const ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= FRAME_WIDTH || ty >= FRAME_HEIGHT) continue;
      frame.index[ty * FRAME_WIDTH + tx] = value;
      frame.shade[ty * FRAME_WIDTH + tx] = shade;
    }
  }
}

// Vue de face ou de dos : les jambes se lèvent tour à tour, le corps rebondit,
// les bords du buste (les bras) balancent d'un pixel.
function frontFrame(cells, info, pose) {
  const frame = createFrame();
  const { top, bottom, center, hips } = info;
  const bob = pose.bob ?? 0;
  const inLegs = (x) => Math.abs(x - center) <= LEG_REACH;
  // Ce qui, dans les lignes des jambes, n'est pas une jambe (un bâton) ne bouge pas.
  stamp(frame, cells, { rows: [hips, bottom], keep: (x) => !inLegs(x) });
  for (const [side, lift] of [['left', pose.liftL ?? 0], ['right', pose.liftR ?? 0]]) {
    const cols = side === 'left' ? [center - LEG_REACH, center - 1] : [center, center + LEG_REACH];
    stamp(frame, cells, { rows: [hips, bottom], cols, dy: -lift });
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
      for (let x = 0; x < FRAME_WIDTH; x += 1) {
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
    // On regarde vers la gauche : l'avant est à gauche (x négatif).
    const shear = (direction) => (y) => Math.round((direction * stride * (y - hips)) / span);
    stamp(frame, cells, { rows: [hips, bottom], shade: 1, shear: shear(1), keep: inLegs });
    stamp(frame, cells, { rows: [hips, bottom], dy: -lift, shear: shear(-1), keep: inLegs });
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
  stamp(frame, cells, { rows: [0, FRAME_HEIGHT - 1], dy: pose.bob ?? 0 });
  return frame;
}

// --- Planche complète -------------------------------------------------------

const VIEW_OF = { down: 'face', up: 'dos', left: 'profil', right: 'profil' };

export function createCharacterSheet(character) {
  const data = sprites[character.sprite];
  if (!data) throw new Error(`Sprite inconnu : « ${character.sprite} » (fiche ${character.id}).`);
  if (data.cadre[0] !== FRAME_WIDTH || data.cadre[1] !== FRAME_HEIGHT || data.pieds !== FEET_ROW) {
    throw new Error(`Sprite ${character.sprite} : cadre ${data.cadre.join('×')}, pieds ${data.pieds} ; attendu ${FRAME_WIDTH}×${FRAME_HEIGHT}, pieds ${FEET_ROW}.`);
  }
  const colors = data.couleurs.map(hexToRgb);
  const darker = colors.map(([r, g, b]) => [r, g, b].map((c) => Math.round(c * BACK_LEG_SHADE)));
  const glowing = new Set(data.lumiere.map((ch) => DIGITS.indexOf(ch)));

  const grids = { face: parseGrid(data.face), profil: parseGrid(data.profil), dos: parseGrid(data.dos) };
  const front = analyzeFront(grids.face);
  // Les autres vues reçoivent la même longueur de jambes que la face.
  const infoOf = (view) => {
    if (view === 'face') return front;
    const b = bounds(grids[view]);
    return { ...b, hips: b.bottom - front.legLength, robe: front.robe };
  };

  const buffer = createPixelBuffer(FRAME_WIDTH * COLUMNS, FRAME_HEIGHT * DIRECTIONS.length);
  const glow = createPixelBuffer(buffer.width, buffer.height);
  let hasGlow = false;

  DIRECTIONS.forEach((direction, row) => {
    const view = VIEW_OF[direction];
    const cells = grids[view];
    const info = infoOf(view);
    const poses = data.flottant ? FLOAT_POSES : view === 'profil' ? SIDE_POSES : FRONT_POSES;
    const mirror = direction === 'right';
    poses.forEach((pose, column) => {
      const frame = data.flottant ? floatFrame(cells, pose) : view === 'profil' ? sideFrame(cells, info, pose) : frontFrame(cells, info, pose);
      for (let y = 0; y < FRAME_HEIGHT; y += 1) {
        for (let x = 0; x < FRAME_WIDTH; x += 1) {
          const i = y * FRAME_WIDTH + x;
          const index = frame.index[i];
          if (index === EMPTY) continue;
          const rgb = (frame.shade[i] ? darker : colors)[index];
          const px = column * FRAME_WIDTH + (mirror ? FRAME_WIDTH - 1 - x : x);
          setPixel(buffer, px, row * FRAME_HEIGHT + y, rgb);
          if (glowing.has(index)) {
            setPixel(glow, px, row * FRAME_HEIGHT + y, colors[index]);
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
    // Repères utiles à l'interface (étiquette au-dessus de la tête).
    top: front.top,
  };
}
