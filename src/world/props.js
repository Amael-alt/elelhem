// Les constructions du village, décrites en quelques nombres et bâties en
// géométrie fusionnée : maisons à colombages et lanternes.
//
// Une maison se dessine dans son repère local : u le long du faîtage (longueur
// L), w en travers (portée S), y vers le haut. Les murs sous les égouts sont
// les côtés ±w, les pignons les côtés ±u. Un faîtage nord-sud échange u et w
// dans le monde.

import { createFrame, pushBox } from './builder.js';
import { TILE_UNITS } from '../gfx/textures.js';

const FOUNDATION = 0.3; // soubassement de pierre
const BEAM = 0.14; // section des poutres
const BEAM_OUT = 0.04; // saillie des poutres hors du mur
const GIRT_Y = 1.85; // lisse de mi-hauteur, au ras du haut des portes
const EAVE_OVERHANG = 0.32;
const GABLE_OVERHANG = 0.22;
const ROOF_THICKNESS = 0.12;
const OPENING_OUT = 0.07; // portes et fenêtres, juste devant le mur
const DOOR = { width: 0.95, height: GIRT_Y };
const WINDOW = { size: 0.8, y: 0.85 };
const CHIMNEY = 0.5; // section de la cheminée, réglable par maison (chimneySize)

const tile = (value) => value / TILE_UNITS;

// Côté du monde vers côté du repère local, selon l'axe du faîtage.
const LOCAL_SIDE = {
  x: { south: '+w', north: '-w', east: '+u', west: '-u' },
  z: { east: '+w', west: '-w', south: '+u', north: '-u' },
};

// Un côté de la maison : longueur, et position d'un point (t le long du mur,
// y en hauteur, off en avant du mur), dans le sens qui garde la face vers
// l'extérieur.
function sideOf(key, L, S) {
  switch (key) {
    case '+w': return { length: L, at: (t, y, off = 0) => [t, y, S + off] };
    case '-w': return { length: L, at: (t, y, off = 0) => [L - t, y, -off] };
    case '+u': return { length: S, at: (t, y, off = 0) => [L + off, y, S - t] };
    default: return { length: S, at: (t, y, off = 0) => [-off, y, t] };
  }
}

function rectangleOn(side, t0, t1, y0, y1, off) {
  return [side.at(t0, y0, off), side.at(t1, y0, off), side.at(t1, y1, off), side.at(t0, y1, off)];
}

const FULL_UV = [[0, 0], [1, 0], [1, 1], [0, 1]];

// builders : un constructeur de géométrie par matière (plaster, wood, roof,
// stone, brick, door, window). Renvoie le haut de la cheminée, d'où monte la
// fumée (null s'il n'y en a pas).
export function buildHouse(house, builders) {
  const swap = house.ridge === 'z';
  const L = swap ? house.sizeZ : house.sizeX;
  const S = swap ? house.sizeX : house.sizeZ;
  const { wall, rise } = house;
  const frames = {};
  for (const key of Object.keys(builders)) frames[key] = createFrame(builders[key], [house.x, 0, house.z], swap);

  // Soubassement de pierre, un peu plus large que les murs.
  pushBox(frames.stone, [-0.05, 0, -0.05], [L + 0.05, FOUNDATION, S + 0.05]);

  // Murs d'enduit, plus sombres au pied, et pignons.
  for (const key of ['+w', '-w', '+u', '-u']) {
    const side = sideOf(key, L, S);
    frames.plaster.polygon(
      rectangleOn(side, 0, side.length, FOUNDATION, wall, 0),
      [[0, tile(FOUNDATION)], [tile(side.length), tile(FOUNDATION)], [tile(side.length), tile(wall)], [0, tile(wall)]],
      [0.78, 0.78, 1, 1],
    );
    if (key === '+u' || key === '-u') {
      frames.plaster.polygon(
        [side.at(0, wall), side.at(S, wall), side.at(S / 2, wall + rise - 0.06)],
        [[0, tile(wall)], [tile(S), tile(wall)], [tile(S / 2), tile(wall + rise)]],
      );
    }
  }

  // Colombages : poteaux d'angle, lisse et sablière sur chaque face, poinçon
  // au milieu des pignons.
  const inner = BEAM - BEAM_OUT;
  for (const [cu, cw] of [[0, 0], [L, 0], [0, S], [L, S]]) {
    const [u0, u1] = cu === 0 ? [-BEAM_OUT, inner] : [L - inner, L + BEAM_OUT];
    const [w0, w1] = cw === 0 ? [-BEAM_OUT, inner] : [S - inner, S + BEAM_OUT];
    pushBox(frames.wood, [u0, FOUNDATION, w0], [u1, wall, w1]);
  }
  for (const y of [GIRT_Y, wall - BEAM]) {
    const y1 = y + BEAM * 0.85;
    pushBox(frames.wood, [0, y, S - 0.02], [L, y1, S + BEAM_OUT]);
    pushBox(frames.wood, [0, y, -BEAM_OUT], [L, y1, 0.02]);
    pushBox(frames.wood, [L - 0.02, y, 0], [L + BEAM_OUT, y1, S]);
    pushBox(frames.wood, [-BEAM_OUT, y, 0], [0.02, y1, S]);
  }
  pushBox(frames.wood, [L - 0.02, wall, S / 2 - 0.07], [L + BEAM_OUT, wall + rise - 0.3, S / 2 + 0.07]);
  pushBox(frames.wood, [-BEAM_OUT, wall, S / 2 - 0.07], [0.02, wall + rise - 0.3, S / 2 + 0.07]);

  // Porte et fenêtres, sur le côté du monde demandé, décalées du milieu.
  const opening = (frame, spec, width, y0, height) => {
    const side = sideOf(LOCAL_SIDE[house.ridge][spec.side], L, S);
    const center = side.length / 2 + (spec.offset ?? 0);
    frame.polygon(rectangleOn(side, center - width / 2, center + width / 2, y0, y0 + height, OPENING_OUT), FULL_UV);
  };
  if (house.door) opening(frames.door, house.door, DOOR.width, 0, DOOR.height);
  for (const spec of house.windows ?? []) opening(frames.window, spec, WINDOW.size, spec.y ?? WINDOW.y, WINDOW.size);

  // Toit à deux pans : tuiles dessus, planches dessous, rives et égouts en
  // bois. Fermé de tous côtés, il projette son ombre comme un volume.
  const slope = rise / (S / 2);
  const ridgeY = wall + rise;
  const eaveY = wall - EAVE_OVERHANG * slope;
  const u0 = -GABLE_OVERHANG;
  const u1 = L + GABLE_OVERHANG;
  const front = S + EAVE_OVERHANG;
  const back = -EAVE_OVERHANG;
  const mid = S / 2;
  const T = ROOF_THICKNESS;
  const slopeLength = tile(Math.hypot(mid + EAVE_OVERHANG, rise + EAVE_OVERHANG * slope));
  const plain = (n) => FULL_UV.slice(0, n);

  frames.roof.polygon([[u0, eaveY, front], [u1, eaveY, front], [u1, ridgeY, mid], [u0, ridgeY, mid]],
    [[tile(u0), 0], [tile(u1), 0], [tile(u1), slopeLength], [tile(u0), slopeLength]]);
  frames.roof.polygon([[u1, eaveY, back], [u0, eaveY, back], [u0, ridgeY, mid], [u1, ridgeY, mid]],
    [[tile(u1), 0], [tile(u0), 0], [tile(u0), slopeLength], [tile(u1), slopeLength]]);
  frames.wood.polygon([[u0, ridgeY - T, mid], [u1, ridgeY - T, mid], [u1, eaveY - T, front], [u0, eaveY - T, front]], plain(4));
  frames.wood.polygon([[u1, ridgeY - T, mid], [u0, ridgeY - T, mid], [u0, eaveY - T, back], [u1, eaveY - T, back]], plain(4));
  frames.wood.polygon([[u0, eaveY - T, front], [u1, eaveY - T, front], [u1, eaveY, front], [u0, eaveY, front]], plain(4));
  frames.wood.polygon([[u1, eaveY - T, back], [u0, eaveY - T, back], [u0, eaveY, back], [u1, eaveY, back]], plain(4));
  frames.wood.polygon([[u1, eaveY - T, front], [u1, ridgeY - T, mid], [u1, ridgeY, mid], [u1, eaveY, front]], plain(4));
  frames.wood.polygon([[u1, ridgeY - T, mid], [u1, eaveY - T, back], [u1, eaveY, back], [u1, ridgeY, mid]], plain(4));
  frames.wood.polygon([[u0, eaveY - T, back], [u0, ridgeY - T, mid], [u0, ridgeY, mid], [u0, eaveY, back]], plain(4));
  frames.wood.polygon([[u0, ridgeY - T, mid], [u0, eaveY - T, front], [u0, eaveY, front], [u0, ridgeY, mid]], plain(4));
  pushBox(frames.wood, [u0, ridgeY - 0.04, mid - 0.09], [u1, ridgeY + 0.08, mid + 0.09]);

  if (!house.chimney) return null;
  const [cu, cw] = [house.chimney[0] * L, house.chimney[1] * S];
  const size = house.chimneySize ?? CHIMNEY;
  const top = ridgeY + (house.chimneyRise ?? 0.6);
  pushBox(frames.brick, [cu - size / 2, wall, cw - size / 2], [cu + size / 2, top, cw + size / 2]);
  return swap ? [house.x + cw, top, house.z + cu] : [house.x + cu, top, house.z + cw];
}

// Lanterne sur poteau : poteau de bois, cage de fer ouverte, chapeau. Renvoie
// la position de la flamme, où se placent la lumière et le sprite de feu.
export const LANTERN_FLAME = { y: 2.02, width: 0.2, height: 0.31 };
export const LANTERN_POST_RADIUS = 0.08;

export function buildLantern(x, z, builders) {
  const wood = createFrame(builders.post, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  pushBox(wood, [-0.07, 0, -0.07], [0.07, 1.95, 0.07]);
  pushBox(iron, [-0.18, 1.95, -0.18], [0.18, 2.0, 0.18]);
  for (const [cx, cz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) {
    pushBox(iron, [cx - 0.025, 2.0, cz - 0.025], [cx + 0.025, 2.38, cz + 0.025]);
  }
  pushBox(iron, [-0.21, 2.38, -0.21], [0.21, 2.44, 0.21]);
  pushBox(iron, [-0.1, 2.44, -0.1], [0.1, 2.52, 0.1]);
  return { x, y: LANTERN_FLAME.y, z };
}

// Arbre en volumes : un tronc, une couronne d'un gros bloc et de deux ou trois
// plus petits qui cassent la silhouette. size règle la taille (1 : moyen),
// seed décale les blocs d'un arbre à l'autre.
export const TREE_TRUNK_RADIUS = 0.2;

export function buildTree(x, z, { size = 1, seed = 0 }, builders) {
  const bark = createFrame(builders.bark, [x, 0, z]);
  const leaves = createFrame(builders.leaves, [x, 0, z]);
  const trunk = 0.17 * size;
  const crownBase = 1.35 * size;
  pushBox(bark, [-trunk, 0, -trunk], [trunk, crownBase + 0.3, trunk], { groundAo: 0.6 });
  const r = 0.95 * size;
  pushBox(leaves, [-r, crownBase, -r], [r, crownBase + 1.7 * size, r]);
  const random = (i) => {
    const v = Math.sin((seed + 1) * 12.9898 + i * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  const lobes = 2 + Math.floor(random(0) * 2);
  for (let i = 0; i < lobes; i += 1) {
    const angle = random(i + 1) * Math.PI * 2;
    const half = (0.45 + random(i + 5) * 0.2) * size;
    const cx = Math.cos(angle) * r * 0.85;
    const cz = Math.sin(angle) * r * 0.85;
    const cy = crownBase + (0.4 + random(i + 9) * 0.9) * size;
    pushBox(leaves, [cx - half, cy - half, cz - half], [cx + half, cy + half, cz + half]);
  }
}
