// Les constructions du village, décrites en quelques nombres et bâties en
// géométrie fusionnée : maisons à colombages et lanternes.
//
// Une maison se dessine dans son repère local : u le long du faîtage (longueur
// L), w en travers (portée S), y vers le haut. Les murs sous les égouts sont
// les côtés ±w, les pignons les côtés ±u. Un faîtage nord-sud échange u et w
// dans le monde.

import { createFrame, pushBar, pushBox } from './builder.js';
import { TILE_UNITS } from '../gfx/textures.js';

const FOUNDATION = 0.3; // soubassement de pierre
const BEAM = 0.14; // section des poutres
const BEAM_OUT = 0.04; // saillie des poutres hors du mur
const GIRT_Y = 1.85; // lisse de mi-hauteur, au ras du haut des portes
const TALL_WALL = 3.6; // au-delà, la maison a un étage : une lisse de plancher de plus
const EAVE_OVERHANG = 0.32;
const GABLE_OVERHANG = 0.22;
const ROOF_THICKNESS = 0.12;
const OPENING_OUT = 0.07; // portes et fenêtres, juste devant le mur
const DOOR = { width: 0.95, height: GIRT_Y };
const WINDOW = { size: 0.8, y: 0.85 };
const CHIMNEY = 0.5; // section de la cheminée, réglable par maison (chimneySize)

// Les façades (version 2.4) : un rez-de-chaussée de pierre sous l'enduit, des
// croix de colombage, des volets peints, des appuis de fenêtre, un
// encadrement de porte en pierre avec ses marches, une lanterne murale à la
// porte, les chevrons sous les égouts, une lucarne pour les maisons à étage,
// un chapeau de cheminée.
const STONE_BASE = 1.0; // hauteur du soubassement de pierre des maisons d'enduit
const BRACE = { section: 0.1, reach: 0.75 }; // croix de colombage : section, portée le long du mur
const SHUTTER = { width: 0.3, thickness: 0.05, gap: 0.04 };
const SILL = { depth: 0.12, height: 0.07, overhang: 0.08 };
const SURROUND = { width: 0.14, out: 0.06 }; // l'encadrement de pierre de la porte
const STEPS = [{ height: 0.1, depth: 0.36 }, { height: 0.05, depth: 0.7 }]; // deux marches, de la plus haute à la plus basse
const RAFTER = { every: 0.55, size: 0.09 };
const WALL_LANTERN = { y: 2.05, out: 0.24, aside: 0.4 }; // à droite de la porte
const DORMER = { width: 1.0, height: 0.85, rise: 0.4, window: 0.44, along: 0.55, sink: 0.1 }; // along : où sa face perce la pente (0 égout, 1 faîte) ; sink : enfoncée d'autant sous la pente
const CHIMNEY_CAP = { lip: 0.07, height: 0.08, pot: 0.16 };

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
// slate, thatch, stonewall, stone, brick, door, window, voletVert, voletBleu,
// voletRouge). house.walls choisit la matière des murs (plaster par défaut,
// stonewall, brick), house.roof celle du toit (roof : tuiles par défaut,
// slate : ardoise, thatch : chaume), house.planters ajoute une jardinière sous
// chaque fenêtre du rez-de-chaussée. Les façades (version 2.4) : house.shutters
// ('vert', 'bleu', 'rouge' ou rien) peint des volets à chaque fenêtre,
// house.dormers (décalages le long du faîtage) pose des lucarnes sur le pan
// sud, house.stoneBase (vrai par défaut pour l'enduit) monte un rez-de-chaussée
// de pierre, house.lantern (vrai par défaut) accroche une lanterne à la porte.
// Renvoie { chimney, planters, lanterns } : le haut de la cheminée, d'où monte
// la fumée (null s'il n'y en a pas), les points où poser des fleurs, et les
// flammes des lanternes murales.
const PLANTER = { width: 0.95, depth: 0.24, height: 0.18 };

export function buildHouse(house, builders) {
  const swap = house.ridge === 'z';
  const L = swap ? house.sizeZ : house.sizeX;
  const S = swap ? house.sizeX : house.sizeZ;
  const { wall, rise } = house;
  const toWorld = ([u, y, w]) => (swap ? { x: house.x + w, y, z: house.z + u } : { x: house.x + u, y, z: house.z + w });
  const wallKey = house.walls ?? 'plaster';
  const roofKey = house.roof ?? 'roof';
  const frames = {};
  for (const key of Object.keys(builders)) frames[key] = createFrame(builders[key], [house.x, 0, house.z], swap);

  // Soubassement de pierre, un peu plus large que les murs.
  pushBox(frames.stone, [-0.05, 0, -0.05], [L + 0.05, FOUNDATION, S + 0.05]);

  // Une dalle entre deux points d'un côté (t le long du mur, y, off en avant) :
  // les volets, appuis, encadrements, marches et consoles des façades.
  const slab = (frame, side, t0, t1, y0, y1, off0, off1, options) => {
    const a = side.at(t0, y0, off0);
    const b = side.at(t1, y1, off1);
    pushBox(frame, [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])], [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])], options);
  };
  // Les fenêtres d'un côté : [t0, t1] le long du mur, pour éviter de poser une
  // croix de colombage dessus.
  const windowsOn = (key) => (house.windows ?? [])
    .filter((spec) => LOCAL_SIDE[house.ridge][spec.side] === key)
    .map((spec) => {
      const center = sideOf(key, L, S).length / 2 + (spec.offset ?? 0);
      return [center - WINDOW.size / 2 - SHUTTER.width - SHUTTER.gap, center + WINDOW.size / 2 + SHUTTER.width + SHUTTER.gap];
    });
  const doorOn = (key) => (house.door && LOCAL_SIDE[house.ridge][house.door.side] === key
    ? [sideOf(key, L, S).length / 2 + (house.door.offset ?? 0) - DOOR.width / 2 - SURROUND.width - WALL_LANTERN.aside - 0.2, sideOf(key, L, S).length / 2 + (house.door.offset ?? 0) + DOOR.width / 2 + SURROUND.width + WALL_LANTERN.aside + 0.2]
    : null);
  const free = (key, t0, t1) => {
    const spans = windowsOn(key);
    const door = doorOn(key);
    if (door) spans.push(door);
    return spans.every(([a, b]) => t1 < a || t0 > b);
  };

  // Murs d'enduit, plus sombres au pied, et pignons.
  for (const key of ['+w', '-w', '+u', '-u']) {
    const side = sideOf(key, L, S);
    frames[wallKey].polygon(
      rectangleOn(side, 0, side.length, FOUNDATION, wall, 0),
      [[0, tile(FOUNDATION)], [tile(side.length), tile(FOUNDATION)], [tile(side.length), tile(wall)], [0, tile(wall)]],
      [0.78, 0.78, 1, 1],
    );
    if (key === '+u' || key === '-u') {
      frames[wallKey].polygon(
        [side.at(0, wall), side.at(S, wall), side.at(S / 2, wall + rise - 0.06)],
        [[0, tile(wall)], [tile(S), tile(wall)], [tile(S / 2), tile(wall + rise)]],
      );
    }
  }

  // Rez-de-chaussée de pierre sous l'enduit (version 2.4) : une bande de
  // pierre de taille au pied de chaque face, juste devant le mur.
  const stoneBase = house.stoneBase ?? wallKey === 'plaster';
  if (stoneBase) {
    for (const key of ['+w', '-w', '+u', '-u']) {
      const side = sideOf(key, L, S);
      frames.stonewall.polygon(
        rectangleOn(side, -0.02, side.length + 0.02, FOUNDATION, STONE_BASE, 0.015),
        [[0, tile(FOUNDATION)], [tile(side.length), tile(FOUNDATION)], [tile(side.length), tile(STONE_BASE)], [0, tile(STONE_BASE)]],
        [0.85, 0.85, 1, 1],
      );
    }
    // Le bandeau de bois qui couronne la pierre.
    pushBox(frames.wood, [-BEAM_OUT, STONE_BASE, -BEAM_OUT], [L + BEAM_OUT, STONE_BASE + 0.07, S + BEAM_OUT]);
  }

  // Colombages : poteaux d'angle, lisse et sablière sur chaque face, poinçon
  // au milieu des pignons.
  const inner = BEAM - BEAM_OUT;
  for (const [cu, cw] of [[0, 0], [L, 0], [0, S], [L, S]]) {
    const [u0, u1] = cu === 0 ? [-BEAM_OUT, inner] : [L - inner, L + BEAM_OUT];
    const [w0, w1] = cw === 0 ? [-BEAM_OUT, inner] : [S - inner, S + BEAM_OUT];
    pushBox(frames.wood, [u0, FOUNDATION, w0], [u1, wall, w1]);
  }
  // Lisse basse, sablière, et pour une maison à étage la lisse du plancher,
  // à mi-chemin : les fenêtres hautes se placent juste au-dessus (layout.js).
  const girts = [GIRT_Y, wall - BEAM];
  if (wall > TALL_WALL) girts.splice(1, 0, GIRT_Y + (wall - BEAM - GIRT_Y) / 2);
  for (const y of girts) {
    const y1 = y + BEAM * 0.85;
    pushBox(frames.wood, [0, y, S - 0.02], [L, y1, S + BEAM_OUT]);
    pushBox(frames.wood, [0, y, -BEAM_OUT], [L, y1, 0.02]);
    pushBox(frames.wood, [L - 0.02, y, 0], [L + BEAM_OUT, y1, S]);
    pushBox(frames.wood, [-BEAM_OUT, y, 0], [0.02, y1, S]);
  }
  pushBox(frames.wood, [L - 0.02, wall, S / 2 - 0.07], [L + BEAM_OUT, wall + rise - 0.3, S / 2 + 0.07]);
  pushBox(frames.wood, [-BEAM_OUT, wall, S / 2 - 0.07], [0.02, wall + rise - 0.3, S / 2 + 0.07]);

  // Croix de colombage (version 2.4) : dans chaque panneau entre le bandeau
  // de pierre (ou la lisse basse) et la lisse de mi-hauteur, une diagonale
  // depuis chaque poteau d'angle, là où aucune fenêtre ni porte ne gêne.
  const braceBottom = (stoneBase ? STONE_BASE + 0.07 : FOUNDATION) + 0.05;
  const braceTop = GIRT_Y - 0.05;
  if (wallKey === 'plaster') {
    for (const key of ['+w', '-w', '+u', '-u']) {
      const side = sideOf(key, L, S);
      const reach = Math.min(BRACE.reach, side.length / 2 - 0.2);
      for (const [t0, t1] of [[0.08, 0.08 + reach], [side.length - 0.08, side.length - 0.08 - reach]]) {
        if (!free(key, Math.min(t0, t1), Math.max(t0, t1))) continue;
        pushBar(frames.wood, side.at(t0, braceBottom, BEAM_OUT * 0.5), side.at(t1, braceTop, BEAM_OUT * 0.5), BRACE.section);
      }
    }
  }

  // Porte et fenêtres, sur le côté du monde demandé, décalées du milieu.
  const opening = (frame, spec, width, y0, height) => {
    const side = sideOf(LOCAL_SIDE[house.ridge][spec.side], L, S);
    const center = side.length / 2 + (spec.offset ?? 0);
    frame.polygon(rectangleOn(side, center - width / 2, center + width / 2, y0, y0 + height, OPENING_OUT), FULL_UV);
  };
  if (house.door) opening(frames.door, house.door, DOOR.width, 0, DOOR.height);
  for (const spec of house.windows ?? []) opening(frames.window, spec, WINDOW.size, spec.y ?? WINDOW.y, WINDOW.size);

  // Volets peints et appuis de pierre à chaque fenêtre (version 2.4).
  const shutterKey = house.shutters ? `volet${house.shutters.charAt(0).toUpperCase()}${house.shutters.slice(1)}` : null;
  for (const spec of house.windows ?? []) {
    const key = LOCAL_SIDE[house.ridge][spec.side];
    const side = sideOf(key, L, S);
    const center = side.length / 2 + (spec.offset ?? 0);
    const y0 = spec.y ?? WINDOW.y;
    if (shutterKey && frames[shutterKey]) {
      for (const dir of [-1, 1]) {
        const near = center + dir * (WINDOW.size / 2 + SHUTTER.gap);
        const far = near + dir * SHUTTER.width;
        slab(frames[shutterKey], side, near, far, y0 + 0.02, y0 + WINDOW.size - 0.02, 0.02, 0.02 + SHUTTER.thickness);
        // Deux traverses sombres, comme des volets à barres.
        for (const yy of [y0 + 0.16, y0 + WINDOW.size - 0.22]) {
          slab(frames.wood, side, near, far, yy, yy + 0.06, 0.02 + SHUTTER.thickness, 0.02 + SHUTTER.thickness + 0.02);
        }
      }
    }
    slab(frames.stone, side, center - WINDOW.size / 2 - SILL.overhang, center + WINDOW.size / 2 + SILL.overhang, y0 - SILL.height, y0, 0, SILL.depth);
  }

  // La porte (version 2.4) : encadrement de pierre, clé de voûte, deux
  // marches, et une lanterne murale à sa droite.
  const lanterns = [];
  if (house.door) {
    const key = LOCAL_SIDE[house.ridge][house.door.side];
    const side = sideOf(key, L, S);
    const center = side.length / 2 + (house.door.offset ?? 0);
    const half = DOOR.width / 2;
    for (const dir of [-1, 1]) {
      slab(frames.stone, side, center + dir * half, center + dir * (half + SURROUND.width), FOUNDATION - 0.02, DOOR.height + SURROUND.width, 0, SURROUND.out);
    }
    slab(frames.stone, side, center - half - SURROUND.width, center + half + SURROUND.width, DOOR.height, DOOR.height + SURROUND.width, 0, SURROUND.out);
    slab(frames.stone, side, center - 0.12, center + 0.12, DOOR.height + 0.02, DOOR.height + SURROUND.width + 0.1, 0, SURROUND.out + 0.03); // la clé
    let front = SURROUND.out;
    for (const step of STEPS) {
      slab(frames.stone, side, center - half - 0.2, center + half + 0.2, 0, step.height, front, front + step.depth, { groundAo: 0.7 });
      front += step.depth;
    }
    if (house.lantern ?? true) {
      const t = center + half + SURROUND.width + WALL_LANTERN.aside;
      const y = WALL_LANTERN.y;
      slab(frames.iron, side, t - 0.03, t + 0.03, y + 0.3, y + 0.35, 0, WALL_LANTERN.out); // la potence
      slab(frames.iron, side, t - 0.03, t + 0.03, y + 0.1, y + 0.35, 0, 0.05); // sa patte
      const cage = WALL_LANTERN.out - 0.1;
      slab(frames.iron, side, t - 0.11, t + 0.11, y + 0.26, y + 0.3, cage - 0.11, cage + 0.11); // le chapeau
      slab(frames.iron, side, t - 0.1, t + 0.1, y - 0.1, y - 0.06, cage - 0.1, cage + 0.1); // le fond
      for (const [du, dw] of [[-0.09, -0.09], [0.09, -0.09], [-0.09, 0.09], [0.09, 0.09]]) {
        slab(frames.iron, side, t + du - 0.015, t + du + 0.015, y - 0.06, y + 0.26, cage + dw - 0.015, cage + dw + 0.015);
      }
      const [fu, fy, fw] = side.at(t, y + 0.02, cage);
      lanterns.push(toWorld([fu, fy, fw]));
    }
  }

  // Jardinières : une caisse de bois sous chaque fenêtre basse, des fleurs
  // dessus (posées par le village en touffes fleuries), juste sous l'appui.
  const planters = [];
  if (house.planters) {
    for (const spec of house.windows ?? []) {
      if ((spec.y ?? WINDOW.y) > 1.5) continue;
      const side = sideOf(LOCAL_SIDE[house.ridge][spec.side], L, S);
      const center = side.length / 2 + (spec.offset ?? 0);
      const top = WINDOW.y - SILL.height - 0.02;
      const a = side.at(center - PLANTER.width / 2, top - PLANTER.height, 0);
      const b = side.at(center + PLANTER.width / 2, top, PLANTER.depth);
      pushBox(frames.wood, [Math.min(a[0], b[0]), a[1], Math.min(a[2], b[2])], [Math.max(a[0], b[0]), b[1], Math.max(a[2], b[2])]);
      for (const d of [-0.3, 0, 0.3]) planters.push(toWorld(side.at(center + d, top, PLANTER.depth / 2)));
    }
  }

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

  frames[roofKey].polygon([[u0, eaveY, front], [u1, eaveY, front], [u1, ridgeY, mid], [u0, ridgeY, mid]],
    [[tile(u0), 0], [tile(u1), 0], [tile(u1), slopeLength], [tile(u0), slopeLength]]);
  frames[roofKey].polygon([[u1, eaveY, back], [u0, eaveY, back], [u0, ridgeY, mid], [u1, ridgeY, mid]],
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

  // Chevrons (version 2.4) : les bouts de chevrons qui dépassent sous les
  // égouts, tous les 55 cm.
  for (let u = 0.2; u < L; u += RAFTER.every) {
    pushBox(frames.wood, [u - RAFTER.size / 2, eaveY - T - RAFTER.size, S - 0.05], [u + RAFTER.size / 2, eaveY - T, front - 0.03]);
    pushBox(frames.wood, [u - RAFTER.size / 2, eaveY - T - RAFTER.size, back + 0.03], [u + RAFTER.size / 2, eaveY - T, 0.05]);
  }

  // Lucarnes (version 2.4) sur le pan sud (+w) : un petit corps d'enduit qui
  // sort de la pente, son pignon de bois, sa fenêtre, son toit à deux pans.
  for (const offset of house.dormers ?? []) {
    const cu = L / 2 + offset;
    const wf = mid + (S / 2 + EAVE_OVERHANG) * (1 - DORMER.along); // où la face avant perce la pente
    const yf = ridgeY - slope * (wf - mid);
    const y0 = yf - DORMER.sink;
    const y1 = y0 + DORMER.height;
    const hw = DORMER.width / 2;
    pushBox(frames.plaster, [cu - hw, y0, mid - 0.1], [cu + hw, y1, wf]);
    for (const du of [-hw, hw - BEAM]) pushBox(frames.wood, [cu + du, y0, wf - 0.02], [cu + du + BEAM, y1, wf + BEAM_OUT]);
    pushBox(frames.wood, [cu - hw, y1 - 0.08, wf - 0.02], [cu + hw, y1, wf + BEAM_OUT]);
    frames.window.polygon(
      [[cu - DORMER.window / 2, y0 + 0.3, wf + OPENING_OUT], [cu + DORMER.window / 2, y0 + 0.3, wf + OPENING_OUT], [cu + DORMER.window / 2, y0 + 0.3 + DORMER.window, wf + OPENING_OUT], [cu - DORMER.window / 2, y0 + 0.3 + DORMER.window, wf + OPENING_OUT]],
      FULL_UV,
    );
    slab(frames.stone, sideOf('+w', L, S), cu - DORMER.window / 2 - 0.06, cu + DORMER.window / 2 + 0.06, y0 + 0.3 - SILL.height, y0 + 0.3, wf - S, wf - S + SILL.depth);
    // Le pignon et le petit toit : deux pans qui rejoignent la pente derrière.
    const apex = y1 + DORMER.rise;
    const wb = mid - 0.1;
    const wfront = wf + 0.2;
    frames.plaster.polygon([[cu - hw, y1, wf], [cu + hw, y1, wf], [cu, apex, wf]], [[0, tile(y1)], [tile(DORMER.width), tile(y1)], [tile(hw), tile(apex)]]);
    const dr = frames[roofKey];
    const dl = tile(Math.hypot(hw + 0.1, DORMER.rise + 0.08));
    dr.polygon([[cu - hw - 0.1, y1 - 0.08, wfront], [cu, apex + 0.04, wfront], [cu, apex + 0.04, wb], [cu - hw - 0.1, y1 - 0.08, wb]], [[0, 0], [dl, 0], [dl, tile(wfront - wb)], [0, tile(wfront - wb)]]);
    dr.polygon([[cu, apex + 0.04, wfront], [cu + hw + 0.1, y1 - 0.08, wfront], [cu + hw + 0.1, y1 - 0.08, wb], [cu, apex + 0.04, wb]], [[0, 0], [dl, 0], [dl, tile(wfront - wb)], [0, tile(wfront - wb)]]);
    frames.wood.polygon([[cu - hw - 0.1, y1 - 0.12, wfront], [cu + hw + 0.1, y1 - 0.12, wfront], [cu + hw + 0.1, y1 - 0.08, wfront], [cu - hw - 0.1, y1 - 0.08, wfront]], FULL_UV);
    frames.wood.polygon([[cu + hw + 0.1, y1 - 0.12, wfront], [cu, apex, wfront], [cu - hw - 0.1, y1 - 0.12, wfront]], [[0, 0], [1, 0], [0.5, 1]]);
  }

  if (!house.chimney) return { chimney: null, planters, lanterns };
  const [cu, cw] = [house.chimney[0] * L, house.chimney[1] * S];
  const size = house.chimneySize ?? CHIMNEY;
  const top = ridgeY + (house.chimneyRise ?? 0.6);
  pushBox(frames.brick, [cu - size / 2, wall, cw - size / 2], [cu + size / 2, top, cw + size / 2]);
  // Le chapeau de la cheminée (version 2.4) : une dalle de pierre qui déborde,
  // et un ou deux pots de terre cuite dessus.
  const lip = CHIMNEY_CAP.lip;
  pushBox(frames.stone, [cu - size / 2 - lip, top, cw - size / 2 - lip], [cu + size / 2 + lip, top + CHIMNEY_CAP.height, cw + size / 2 + lip]);
  const pots = size > 0.7 ? [-0.18, 0.18] : [0];
  for (const du of pots) {
    pushBox(frames.brick, [cu + du - CHIMNEY_CAP.pot / 2, top + CHIMNEY_CAP.height, cw - CHIMNEY_CAP.pot / 2], [cu + du + CHIMNEY_CAP.pot / 2, top + CHIMNEY_CAP.height + 0.22, cw + CHIMNEY_CAP.pot / 2]);
  }
  const smokeTop = top + CHIMNEY_CAP.height + 0.22;
  return { chimney: swap ? [house.x + cw, smokeTop, house.z + cu] : [house.x + cu, smokeTop, house.z + cw], planters, lanterns };
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

// Arbre : un tronc et deux branches en volumes ; la couronne est faite de
// grappes de feuilles (gfx/foliage.js). size règle la taille (1 : moyen).
// Renvoie le centre et le rayon de la couronne.
export const TREE_TRUNK_RADIUS = 0.2;

export function buildTree(x, z, { size = 1 }, builders) {
  const bark = createFrame(builders.bark, [x, 0, z]);
  const trunk = 0.15 * size;
  const crownBase = 1.25 * size;
  pushBox(bark, [-trunk, 0, -trunk], [trunk, crownBase + 0.9 * size, trunk], { groundAo: 0.6 });
  pushBox(bark, [-trunk - 0.04, 0, -trunk - 0.04], [trunk + 0.04, 0.25, trunk + 0.04], { groundAo: 0.6 }); // racines
  const branch = 0.06 * size;
  pushBox(bark, [trunk, crownBase - 0.1, -branch], [trunk + 0.45 * size, crownBase + 0.02, branch]);
  pushBox(bark, [-branch, crownBase + 0.25, -trunk - 0.4 * size], [branch, crownBase + 0.37, -trunk]);
  return { center: { x, y: crownBase + 0.95 * size, z }, radius: 1.05 * size };
}
