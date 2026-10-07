// Les bâtiments et objets qui ne sont pas des maisons à colombages : tours à
// toit en pyramide (l'architecte, le colombier), chantier avec échafaudages,
// puits, forge à ciel ouvert, tonneaux, bancs, enseigne. Même méthode que
// props.js : des boîtes et des polygones empilés dans un constructeur par
// matière (plaster, wood, roof, stone, brick, door, window, iron, leaves).
//
// Chaque fonction renvoie ce que le village doit en savoir : les obstacles
// ronds { x, z, radius } à poser dans les collisions, et au besoin la
// position d'une flamme ou d'une cheminée.

import { createFrame, pushBar, pushBox, pushDisc, pushRevolution, pushSkewBox } from './builder.js';
import { TILE_UNITS } from '../gfx/textures.js';

const tile = (value) => value / TILE_UNITS;
const FOUNDATION = 0.3;
const BEAM = 0.14;

// Quad vertical le long d'un mur, de p0 à p1 (vus de l'extérieur, de gauche à
// droite), entre y0 et y1.
function wallQuad(frame, [ax, az], [bx, bz], y0, y1, ao = [1, 1, 1, 1]) {
  const length = Math.hypot(bx - ax, bz - az);
  frame.polygon(
    [[ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az]],
    [[0, tile(y0)], [tile(length), tile(y0)], [tile(length), tile(y1)], [0, tile(y1)]],
    ao,
  );
}

// Toit en pyramide sur un rectangle (x0, z0)-(x1, z1) : quatre faces de
// tuiles, et le dessous en planches pour fermer le volume (il projette son
// ombre comme un solide). overhang : débord au-delà des murs.
function pyramidRoof(frames, [x0, z0, x1, z1], baseY, apexY, overhang) {
  const [a0, b0, a1, b1] = [x0 - overhang, z0 - overhang, x1 + overhang, z1 + overhang];
  const apex = [(x0 + x1) / 2, apexY, (z0 + z1) / 2];
  const lengthX = tile(a1 - a0);
  const lengthZ = tile(b1 - b0);
  const slant = tile(Math.hypot((a1 - a0) / 2, apexY - baseY));
  const face = (p0, p1, length) => frames.roof.polygon([p0, p1, apex], [[0, 0], [length, 0], [length / 2, slant]]);
  face([a0, baseY, b1], [a1, baseY, b1], lengthX); // sud
  face([a1, baseY, b0], [a0, baseY, b0], lengthX); // nord
  face([a1, baseY, b1], [a1, baseY, b0], lengthZ); // est
  face([a0, baseY, b0], [a0, baseY, b1], lengthZ); // ouest
  frames.wood.polygon([[a0, baseY, b0], [a1, baseY, b0], [a1, baseY, b1], [a0, baseY, b1]], [[0, 0], [1, 0], [1, 1], [0, 1]]);
}

const FULL_UV = [[0, 0], [1, 0], [1, 1], [0, 1]];

// Tour carrée à murs d'enduit, colombages d'angle, porte au sud, fenêtres sur
// les quatre faces (étages donnés par windowHeights) et toit en pyramide.
// holes : trous de colombier (petits carrés sombres) au lieu de fenêtres.
// Renvoie l'obstacle rond qui la couvre.
export function buildTower({ x, z, size, wall, rise, doorOffset = 0, windowHeights = [], holes = false, roof = 'roof' }, builders) {
  const frames = Object.fromEntries(Object.keys(builders).map((key) => [key, createFrame(builders[key], [x, 0, z])]));
  const S = size;
  pushBox(frames.stone, [-0.06, 0, -0.06], [S + 0.06, FOUNDATION, S + 0.06]);
  const corners = [[0, S], [S, S], [S, 0], [0, 0]]; // sud-ouest, sud-est, nord-est, nord-ouest
  const sides = [[corners[0], corners[1]], [corners[1], corners[2]], [corners[2], corners[3]], [corners[3], corners[0]]];
  sides.forEach(([p0, p1], i) => wallQuad(frames.plaster, p0, p1, FOUNDATION, wall, i === 0 ? [0.78, 0.78, 1, 1] : [0.78, 0.78, 1, 1]));
  const inner = BEAM - 0.04;
  for (const [cx, cz] of [[0, 0], [S, 0], [0, S], [S, S]]) {
    const [x0, x1] = cx === 0 ? [-0.04, inner] : [S - inner, S + 0.04];
    const [z0, z1] = cz === 0 ? [-0.04, inner] : [S - inner, S + 0.04];
    pushBox(frames.wood, [x0, FOUNDATION, z0], [x1, wall, z1]);
  }
  for (const y of [1.85, wall * 0.55, wall - BEAM]) {
    pushBox(frames.wood, [0, y, S - 0.02], [S, y + BEAM * 0.85, S + 0.04]);
    pushBox(frames.wood, [0, y, -0.04], [S, y + BEAM * 0.85, 0.02]);
    pushBox(frames.wood, [S - 0.02, y, 0], [S + 0.04, y + BEAM * 0.85, S]);
    pushBox(frames.wood, [-0.04, y, 0], [0.02, y + BEAM * 0.85, S]);
  }
  // Porte au sud.
  const doorCenter = S / 2 + doorOffset;
  frames.door.polygon([[doorCenter - 0.475, 0, S + 0.07], [doorCenter + 0.475, 0, S + 0.07], [doorCenter + 0.475, 1.85, S + 0.07], [doorCenter - 0.475, 1.85, S + 0.07]], FULL_UV);
  // Fenêtres ou trous de colombier.
  const opening = (px, py, pz, face, half, frame) => {
    const out = 0.07;
    if (face === 'south') frame.polygon([[px - half, py, pz + out], [px + half, py, pz + out], [px + half, py + half * 2, pz + out], [px - half, py + half * 2, pz + out]], FULL_UV);
    if (face === 'north') frame.polygon([[px + half, py, pz - out], [px - half, py, pz - out], [px - half, py + half * 2, pz - out], [px + half, py + half * 2, pz - out]], FULL_UV);
    if (face === 'east') frame.polygon([[px + out, py, pz + half], [px + out, py, pz - half], [px + out, py + half * 2, pz - half], [px + out, py + half * 2, pz + half]], FULL_UV);
    if (face === 'west') frame.polygon([[px - out, py, pz - half], [px - out, py, pz + half], [px - out, py + half * 2, pz + half], [px - out, py + half * 2, pz - half]], FULL_UV);
  };
  if (holes) {
    for (const py of [wall - 1.1, wall - 0.65]) {
      for (const dx of [-0.45, 0, 0.45]) opening(S / 2 + dx, py, S, 'south', 0.1, frames.door);
    }
    pushBox(frames.wood, [S / 2 - 0.6, wall - 1.25, S], [S / 2 + 0.6, wall - 1.2, S + 0.25]);
  } else {
    for (const py of windowHeights) {
      opening(S / 2 + (py < 2 ? 0.85 : 0), py, S, 'south', 0.4, frames.window);
      opening(S / 2, py, 0, 'north', 0.4, frames.window);
      opening(S, py, S / 2, 'east', 0.4, frames.window);
      opening(0, py, S / 2, 'west', 0.4, frames.window);
    }
  }
  pyramidRoof({ roof: frames[roof], wood: frames.wood }, [0, 0, S, S], wall, wall + rise, 0.4);
  pushBox(frames.wood, [S / 2 - 0.07, wall + rise - 0.05, S / 2 - 0.07], [S / 2 + 0.07, wall + rise + 0.55, S / 2 + 0.07]);
  return [{ x: x + S / 2, z: z + S / 2, radius: S / 2 }];
}

// Puits de la place : margelle de pierre, deux poteaux, traverse et petit toit
// de planches. Obstacle rond au centre.
export const WELL_RADIUS = 0.95;
export function buildWell({ x, z }, builders) {
  const stone = createFrame(builders.stone, [x, 0, z]);
  const wood = createFrame(builders.wood, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  const r = 0.8;
  const t = 0.3; // épaisseur de la margelle
  pushBox(stone, [-r, 0, -r], [r, 0.85, -r + t]);
  pushBox(stone, [-r, 0, r - t], [r, 0.85, r]);
  pushBox(stone, [-r, 0, -r + t], [-r + t, 0.85, r - t]);
  pushBox(stone, [r - t, 0, -r + t], [r, 0.85, r - t]);
  for (const sx of [-1, 1]) pushBox(wood, [sx * r - 0.07, 0.85, -0.07], [sx * r + 0.07, 2.3, 0.07]);
  pushBox(wood, [-r - 0.14, 2.3, -0.1], [r + 0.14, 2.42, 0.1]);
  pushBox(wood, [-r - 0.35, 2.42, -0.7], [r + 0.35, 2.52, 0.7]);
  pushBox(iron, [-0.04, 1.2, -0.04], [0.04, 2.3, 0.04]);
  pushBox(iron, [-0.18, 1.0, -0.18], [0.18, 1.2, 0.18]); // le seau
  return [{ x, z, radius: WELL_RADIUS }];
}

// Tonneau (version 2.5 : rond et ventru, il était un cube) : un fût à dix
// douelles qui s'évase au milieu, trois cercles de fer, un couvercle.
export function buildBarrel({ x, z, height = 0.75 }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  const h = height;
  pushRevolution(wood, [[0, 0.24], [h * 0.25, 0.285], [h * 0.5, 0.3], [h * 0.75, 0.285], [h, 0.24]]);
  pushDisc(wood, h - 0.02, 0.235);
  for (const [y, r] of [[0.08, 0.255], [h * 0.5 - 0.03, 0.305], [h - 0.12, 0.255]]) {
    pushRevolution(iron, [[y, r], [y + 0.05, r]], { groundAo: 1 });
  }
  return { x, z, radius: 0.31 };
}

// Muret de pierre à chaperon (version 2.5, le parvis de l'auberge) : un mur
// bas d'une trentaine de centimètres d'épaisseur le long d'une suite de
// points, une dalle de couronnement qui déborde, et un pilier coiffé à chaque
// point. On ne le traverse pas.
const WALL = { thick: 0.3, height: 0.58, coping: 0.42, copingHeight: 0.08, pier: 0.46, pierHeight: 0.78 };
export function buildLowWall(points, builders) {
  const stone = createFrame(builders.stonewall, [0, 0, 0]);
  const cap = createFrame(builders.stone, [0, 0, 0]);
  const obstacles = [];
  const t = WALL.thick / 2;
  const c = WALL.coping / 2;
  for (let i = 0; i + 1 < points.length; i += 1) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    const alongX = Math.abs(bx - ax) >= Math.abs(bz - az);
    const [x0, x1] = [Math.min(ax, bx), Math.max(ax, bx)];
    const [z0, z1] = [Math.min(az, bz), Math.max(az, bz)];
    if (alongX) {
      pushBox(stone, [x0, 0, az - t], [x1, WALL.height, az + t], { groundAo: 0.6 });
      pushBox(cap, [x0, WALL.height, az - c], [x1, WALL.height + WALL.copingHeight, az + c]);
    } else {
      pushBox(stone, [ax - t, 0, z0], [ax + t, WALL.height, z1], { groundAo: 0.6 });
      pushBox(cap, [ax - c, WALL.height, z0], [ax + c, WALL.height + WALL.copingHeight, z1]);
    }
    const length = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(1, Math.ceil(length / 0.35));
    for (let s = 0; s <= steps; s += 1) obstacles.push({ x: ax + ((bx - ax) * s) / steps, z: az + ((bz - az) * s) / steps, radius: 0.2 });
  }
  // Les piliers, à chaque point : plus larges et plus hauts, avec leur chapeau.
  const p = WALL.pier / 2;
  for (const [px, pz] of points) {
    pushBox(stone, [px - p, 0, pz - p], [px + p, WALL.pierHeight, pz + p], { groundAo: 0.6 });
    pushBox(cap, [px - p - 0.04, WALL.pierHeight, pz - p - 0.04], [px + p + 0.04, WALL.pierHeight + 0.07, pz + p + 0.04]);
    pushBox(cap, [px - p * 0.55, WALL.pierHeight + 0.07, pz - p * 0.55], [px + p * 0.55, WALL.pierHeight + 0.17, pz + p * 0.55]);
    obstacles.push({ x: px, z: pz, radius: 0.3 });
  }
  return obstacles;
}

// Jardinière (version 2.5) : une caisse de bois ou une auge de pierre, longue sur quatre pieds
// courts, pleine de terre ; les fleurs y poussent (points renvoyés, plantés
// par le village comme ceux des rebords de fenêtre). axis : 'x' ou 'z', le
// sens de la longueur.
export function buildPlanterBox({ x, z, length = 1.3, axis = 'x', y = 0, stone = false }, builders) {
  // stone : une auge de pierre (posée sur un muret), sinon une caisse de bois.
  const wood = createFrame(stone ? builders.stone : builders.wood, [x, 0, z]);
  const soil = createFrame(builders.bark, [x, 0, z]);
  const half = length / 2;
  const [hx, hz] = axis === 'x' ? [half, 0.2] : [0.2, half];
  pushBox(wood, [-hx, y + 0.08, -hz], [hx, y + 0.38, hz], { groundAo: 0.7 });
  pushBox(wood, [-hx - 0.03, y + 0.36, -hz - 0.03], [hx + 0.03, y + 0.41, hz + 0.03]);
  pushBox(soil, [-hx + 0.04, y + 0.38, -hz + 0.04], [hx - 0.04, y + 0.4, hz - 0.04]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pushBox(wood, [sx * hx - 0.04 - (sx > 0 ? 0.04 : -0.04) * 0, y, sz * hz - 0.04], [sx * hx + 0.04, y + 0.08, sz * hz + 0.04]);
  const count = Math.max(2, Math.round(length / 0.32));
  const flowers = [];
  for (let k = 0; k < count; k += 1) {
    const t = (k + 0.5) / count - 0.5;
    flowers.push(axis === 'x' ? { x: x + t * length, y: y + 0.4, z } : { x, y: y + 0.4, z: z + t * length });
  }
  const obstacle = y > 0.05 ? [] : axis === 'x'
    ? [{ x: x - half / 2, z, radius: 0.24 }, { x: x + half / 2, z, radius: 0.24 }]
    : [{ x, z: z - half / 2, radius: 0.24 }, { x, z: z + half / 2, radius: 0.24 }];
  return { obstacle, flowers };
}

// Chevalet d'ardoise à la porte d'une auberge (version 2.5) : deux panneaux
// penchés l'un contre l'autre, cadre de bois, ardoise sombre, une ligne
// claire de craie.
export function buildChalkboard({ x, z }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const slate = createFrame(builders.iron, [x, 0, z]);
  const chalk = createFrame(builders.stone, [x, 0, z]);
  const lean = 0.2; // les pieds s'écartent de 2 × 0,2 au sol
  const top = 0.86;
  // Face sud (vers la caméra) : cadre, ardoise, deux lignes de craie.
  pushSkewBox(wood, [-0.28, 0, lean], [[0.56, 0, 0], [0, top, -lean], [0, 0, 0.035]], { groundAo: 0.7 });
  pushSkewBox(slate, [-0.23, 0.12, lean - 0.028 + 0.04], [[0.46, 0, 0], [0, top - 0.2, -(lean * (top - 0.2)) / top], [0, 0, 0.012]]);
  for (const [y0, w] of [[0.5, 0.32], [0.38, 0.24], [0.26, 0.28]]) {
    const back = (lean * y0) / top;
    pushBox(chalk, [-w / 2, y0, lean - back + 0.062], [w / 2, y0 + 0.025, lean - back + 0.07]);
  }
  // Face nord, penchée en miroir.
  pushSkewBox(wood, [-0.28, 0, -lean - 0.035], [[0.56, 0, 0], [0, top, lean], [0, 0, 0.035]], { groundAo: 0.7 });
  return { x, z, radius: 0.32 };
}

// Caisse de bois.
export function buildCrate({ x, z, size = 0.55 }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const half = size / 2;
  pushBox(wood, [-half, 0, -half], [half, size, half]);
  return { x, z, radius: half * 1.2 };
}

// Banc : planche sur deux pieds, le long de l'axe x.
export function buildBench({ x, z }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  pushBox(wood, [-0.7, 0.4, -0.18], [0.7, 0.47, 0.18]);
  for (const sx of [-0.55, 0.55]) pushBox(wood, [sx - 0.05, 0, -0.14], [sx + 0.05, 0.4, 0.14]);
  return { x, z, radius: 0.55 };
}

// Enseigne d'auberge : potence de fer sur le mur et planche suspendue.
export function buildSign({ x, z, y = 2.5 }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  pushBox(iron, [-0.03, y + 0.35, 0], [0.03, y + 0.4, 0.8]);
  pushBox(iron, [-0.03, y, 0], [0.03, y + 0.4, 0.05]);
  pushBox(wood, [-0.35, y - 0.4, 0.65], [0.35, y + 0.15, 0.72]);
  for (const sx of [-0.28, 0.28]) pushBox(iron, [sx - 0.015, y + 0.15, 0.66], [sx + 0.015, y + 0.35, 0.68]);
}

// Enclume : pied de bois, billot de fer, table et bec.
export function buildAnvil({ x, z }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  pushBox(wood, [-0.25, 0, -0.25], [0.25, 0.45, 0.25]);
  pushBox(iron, [-0.18, 0.45, -0.14], [0.18, 0.6, 0.14]);
  pushBox(iron, [-0.4, 0.6, -0.18], [0.4, 0.78, 0.18]);
  return { x, z, radius: 0.35 };
}

// Foyer de la forge : un massif de brique ouvert sur le dessus, où brûle la
// flamme. Renvoie l'obstacle et la position de la flamme.
export function buildHearth({ x, z }, builders) {
  const brick = createFrame(builders.brick, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  const r = 0.6;
  pushBox(brick, [-r, 0, -r], [r, 0.55, -r + 0.22]);
  pushBox(brick, [-r, 0, r - 0.22], [r, 0.55, r]);
  pushBox(brick, [-r, 0, -r + 0.22], [-r + 0.22, 0.55, r - 0.22]);
  pushBox(brick, [r - 0.22, 0, -r + 0.22], [r, 0.55, r - 0.22]);
  pushBox(iron, [-r + 0.22, 0.32, -r + 0.22], [r - 0.22, 0.36, r - 0.22]); // grille
  return { obstacle: { x, z, radius: 0.7 }, flame: { x, y: 0.75, z } };
}

// Chantier : un bâtiment à moitié monté (soubassement et pans de mur à hauteur
// de ceinture), un échafaudage sur ses faces sud et ouest, tas de pierres et
// de planches. L'emprise du bâtiment (x, z, sizeX, sizeZ) est à réserver dans
// la carte ; renvoie les obstacles ronds des tas.
export function buildSite({ x, z, sizeX, sizeZ }, builders) {
  const plaster = createFrame(builders.plaster, [x, 0, z]);
  const wood = createFrame(builders.wood, [x, 0, z]);
  const stone = createFrame(builders.stone, [x, 0, z]);
  pushBox(stone, [-0.05, 0, -0.05], [sizeX + 0.05, 0.35, sizeZ + 0.05]);
  // Pans de mur de ceinture, avec des brèches : le chantier n'est pas fini.
  const t = 0.28;
  pushBox(plaster, [0, 0.35, 0], [sizeX, 1.5, t]);
  pushBox(plaster, [0, 0.35, 0], [t, 1.5, sizeZ]);
  pushBox(plaster, [sizeX - t, 0.35, 0], [sizeX, 1.1, sizeZ * 0.55]);
  pushBox(plaster, [0, 0.35, sizeZ - t], [sizeX * 0.4, 1.1, sizeZ]);
  // Échafaudage : poteaux tous les deux mètres, lisses à deux hauteurs,
  // plancher à la première, échelle à l'angle.
  const out = 0.55;
  const post = (px, pz) => pushBox(wood, [px - 0.06, 0, pz - 0.06], [px + 0.06, 3.1, pz + 0.06]);
  const southZ = sizeZ + out;
  const westX = -out;
  for (let px = westX; px <= sizeX + 0.01; px += 2) post(px, southZ);
  for (let pz = 0; pz <= southZ; pz += 2) post(westX, pz);
  for (const y of [1.3, 2.4, 3.0]) {
    pushBox(wood, [westX, y, southZ - 0.04], [sizeX + 0.06, y + 0.08, southZ + 0.04]);
    pushBox(wood, [westX - 0.04, y, 0], [westX + 0.04, y + 0.08, southZ]);
  }
  pushBox(wood, [westX, 1.3, southZ - 0.6], [sizeX, 1.38, southZ - 0.05]); // plancher sud
  pushBox(wood, [westX + 0.05, 1.3, 0], [westX + 0.6, 1.38, southZ - 0.6]); // plancher ouest
  for (const py of [1.7, 2.1]) pushBox(wood, [westX - 0.08, py - 0.04, southZ - 0.06], [westX + 0.1, py + 0.04, southZ + 0.06]);
  for (let ry = 0.2; ry < 1.3; ry += 0.28) pushBox(wood, [sizeX - 0.5, ry, southZ + 0.1], [sizeX - 0.1, ry + 0.04, southZ + 0.16]); // échelle
  pushBox(wood, [sizeX - 0.5, 0, southZ + 0.1], [sizeX - 0.44, 1.5, southZ + 0.16]);
  pushBox(wood, [sizeX - 0.16, 0, southZ + 0.1], [sizeX - 0.1, 1.5, southZ + 0.16]);
  // Tas de pierres de taille et pile de planches, à l'est du bâtiment.
  const pile = createFrame(builders.stone, [x + sizeX + 1.2, 0, z + 0.4]);
  pushBox(pile, [0, 0, 0], [1.0, 0.45, 0.7]);
  pushBox(pile, [0.1, 0.45, 0.05], [0.75, 0.85, 0.6]);
  const planks = createFrame(builders.wood, [x + sizeX + 1.2, 0, z + 1.8]);
  pushBox(planks, [0, 0, 0], [1.3, 0.14, 0.5]);
  pushBox(planks, [0.05, 0.14, 0.03], [1.25, 0.28, 0.47]);
  pushBox(planks, [0.1, 0.28, 0.06], [1.2, 0.42, 0.44]);
  return [
    { x: x + sizeX + 1.7, z: z + 0.75, radius: 0.65 },
    { x: x + sizeX + 1.85, z: z + 2.05, radius: 0.7 },
  ];
}

// Potager : quelques rangs de choux (petits blocs de feuillage) et de piquets.
// Version 2.6 : des rangs plutôt que des cubes. Chaque rang a son sillon de
// terre ; on y plante, en alternance, des choux ronds et des fanes de carottes.
export function buildVegetables({ x0, z0, x1, z1 }, builders) {
  const leaves = createFrame(builders.leaves, [0, 0, 0]);
  const soil = createFrame(builders.bark, [0, 0, 0]);
  let row = 0;
  for (let pz = z0; pz <= z1 + 1e-6; pz += 0.6) {
    pushBox(soil, [x0 - 0.25, 0, pz - 0.16], [x1 + 0.25, 0.07, pz + 0.16], { groundAo: 0.7 });
    let k = 0;
    for (let px = x0; px <= x1 + 1e-6; px += 0.45) {
      if ((row + k) % 2 === 0) {
        // Un chou : des feuilles en dôme, tourné d'un cran à chaque plant.
        const cabbage = createFrame(builders.leaves, [px, 0, pz]);
        pushRevolution(cabbage, [[0.05, 0.1], [0.11, 0.17], [0.2, 0.16], [0.27, 0.09], [0.3, 0.001]], { sides: 7, groundAo: 0.7, phase: (k * 0.7 + row) % 1.5 });
      } else {
        // Des fanes : trois tiges qui s'écartent.
        for (const [dx, dz] of [[-0.06, 0.02], [0.05, -0.03], [0.01, 0.05]]) pushBar(leaves, [px, 0.07, pz], [px + dx * 2.2, 0.36, pz + dz * 2.2], 0.035);
      }
      k += 1;
    }
    row += 1;
  }
}

// Corde à linge (version 2.6, le jardin de la maison) : deux poteaux, une
// corde, du linge qui pend (des draps clairs, une chemise bleue, un foulard
// rouge). La corde suit l'axe x, de x0 à x1.
export function buildClothesline({ x0, x1, z }, builders) {
  const wood = createFrame(builders.wood, [0, 0, z]);
  const rope = createFrame(builders.thatch, [0, 0, z]);
  const top = 1.55;
  for (const px of [x0, x1]) {
    pushBox(wood, [px - 0.05, 0, -0.05], [px + 0.05, top + 0.12, 0.05], { groundAo: 0.6 });
    pushBox(wood, [px - 0.05, top, -0.22], [px + 0.05, top + 0.06, 0.22]);
  }
  pushBar(rope, [x0, top - 0.02, 0], [x1, top - 0.02, 0], 0.02);
  const cloths = [['plaster', 0.55, 0.6], ['voletBleu', 0.4, 0.45], ['plaster', 0.5, 0.7], ['voletRouge', 0.3, 0.32]];
  let px = x0 + 0.25;
  for (const [matter, width, height] of cloths) {
    if (px + width > x1 - 0.15) break;
    const cloth = createFrame(builders[matter], [0, 0, z]);
    pushBox(cloth, [px, top - 0.03 - height, -0.015], [px + width, top - 0.01, 0.015]);
    px += width + 0.18;
  }
  return [{ x: x0, z, radius: 0.12 }, { x: x1, z, radius: 0.12 }];
}

// Pas japonais (version 2.6) : des dalles de pierre plates, irrégulières,
// posées dans l'herbe le long d'une suite de points.
export function buildSteppingStones(points, builders) {
  const stone = createFrame(builders.stone, [0, 0, 0]);
  points.forEach(([x, z], i) => {
    const w = 0.42 + ((i * 37) % 5) * 0.03;
    const d = 0.32 + ((i * 53) % 4) * 0.03;
    const dx = (((i * 29) % 5) - 2) * 0.04;
    pushBox(stone, [x + dx - w / 2, 0, z - d / 2], [x + dx + w / 2, 0.035, z + d / 2], { groundAo: 0.8 });
  });
}

// Étal de marché : comptoir, quatre poteaux, auvent de toile rayée en pente
// vers l'avant (le sud) avec son lambrequin, et des cageots de légumes.
export function buildStall({ x, z }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const awning = createFrame(builders.awning, [x, 0, z]);
  const leaves = createFrame(builders.leaves, [x, 0, z]);
  const w = 1.1; // demi-largeur
  for (const [px, pz, h] of [[-w, -0.55, 2.15], [w, -0.55, 2.15], [-w, 0.65, 1.8], [w, 0.65, 1.8]]) {
    pushBox(wood, [px - 0.05, 0, pz - 0.05], [px + 0.05, h, pz + 0.05]);
  }
  pushBox(wood, [-w + 0.05, 0, 0.1], [w - 0.05, 0.85, 0.6]);
  pushBox(wood, [-w, 0.85, 0.05], [w, 0.92, 0.7]);
  // Auvent : dessus et dessous, du haut à l'arrière au bas à l'avant.
  const back = [-0.75, 2.2];
  const front = [0.95, 1.78];
  const span = tile(2 * w + 0.2);
  const uv = [[0, 0], [span, 0], [span, tile(1.8)], [0, tile(1.8)]];
  awning.polygon([[-w - 0.1, front[1], front[0]], [w + 0.1, front[1], front[0]], [w + 0.1, back[1], back[0]], [-w - 0.1, back[1], back[0]]], uv);
  awning.polygon([[w + 0.1, front[1], front[0]], [-w - 0.1, front[1], front[0]], [-w - 0.1, back[1], back[0]], [w + 0.1, back[1], back[0]]], uv);
  awning.polygon([[-w - 0.1, front[1] - 0.25, front[0]], [w + 0.1, front[1] - 0.25, front[0]], [w + 0.1, front[1], front[0]], [-w - 0.1, front[1], front[0]]],
    [[0, 0], [span, 0], [span, tile(0.25)], [0, tile(0.25)]]);
  // Cageots et légumes sur le comptoir.
  for (const cx of [-0.65, 0, 0.65]) {
    pushBox(wood, [cx - 0.25, 0.92, 0.15], [cx + 0.25, 1.06, 0.6]);
    pushBox(leaves, [cx - 0.2, 1.06, 0.2], [cx + 0.2, 1.2, 0.55]);
  }
  return [{ x, z: z + 0.2, radius: 1.15 }];
}

// Barrière de bois le long d'un tracé de segments droits (points [x, z]) :
// poteaux tous les 1,2 m environ, deux lisses. Les obstacles sont de petits
// cercles serrés le long du tracé : on ne passe pas entre deux poteaux.
export function buildFence(points, builders) {
  const wood = createFrame(builders.wood, [0, 0, 0]);
  const obstacles = [];
  for (let i = 0; i + 1 < points.length; i += 1) {
    const [ax, az] = points[i];
    const [bx, bz] = points[i + 1];
    const length = Math.hypot(bx - ax, bz - az);
    const posts = Math.max(1, Math.round(length / 1.2));
    for (let p = 0; p <= posts; p += 1) {
      const t = p / posts;
      const px = ax + (bx - ax) * t;
      const pz = az + (bz - az) * t;
      pushBox(wood, [px - 0.06, 0, pz - 0.06], [px + 0.06, 0.85, pz + 0.06], { groundAo: 0.6 });
    }
    const alongX = Math.abs(bx - ax) > Math.abs(bz - az);
    for (const y of [0.35, 0.68]) {
      if (alongX) pushBox(wood, [Math.min(ax, bx), y, az - 0.03], [Math.max(ax, bx), y + 0.08, az + 0.03]);
      else pushBox(wood, [ax - 0.03, y, Math.min(az, bz)], [ax + 0.03, y + 0.08, Math.max(az, bz)]);
    }
    const steps = Math.max(1, Math.ceil(length / 0.4));
    for (let s = 0; s <= steps; s += 1) {
      obstacles.push({ x: ax + ((bx - ax) * s) / steps, z: az + ((bz - az) * s) / steps, radius: 0.12 });
    }
  }
  return obstacles;
}

// Meule de foin : trois blocs de chaume, de plus en plus étroits.
export function buildHaystack({ x, z }, builders) {
  const thatch = createFrame(builders.thatch, [x, 0, z]);
  pushBox(thatch, [-0.55, 0, -0.45], [0.55, 0.6, 0.45], { groundAo: 0.6 });
  pushBox(thatch, [-0.42, 0.6, -0.34], [0.42, 0.95, 0.34]);
  pushBox(thatch, [-0.25, 0.95, -0.2], [0.25, 1.1, 0.2]);
  return { x, z, radius: 0.6 };
}

// Rocher : deux blocs de roche qui se chevauchent.
export function buildRock({ x, z, size = 1 }, builders) {
  const rock = createFrame(builders.rock, [x, 0, z]);
  const s = size;
  pushBox(rock, [-0.45 * s, 0, -0.35 * s], [0.4 * s, 0.45 * s, 0.35 * s], { groundAo: 0.6 });
  pushBox(rock, [-0.2 * s, 0.3 * s, -0.25 * s], [0.3 * s, 0.62 * s, 0.2 * s]);
  return { x, z, radius: 0.45 * s };
}

// Feu de camp : un cercle de pierres, deux bûches croisées. Renvoie
// l'obstacle, la flamme et le point d'où monte la fumée.
export function buildCampfire({ x, z }, builders) {
  const rock = createFrame(builders.rock, [x, 0, z]);
  const bark = createFrame(builders.bark, [x, 0, z]);
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 2;
    const px = Math.cos(a) * 0.45;
    const pz = Math.sin(a) * 0.45;
    pushBox(rock, [px - 0.12, 0, pz - 0.1], [px + 0.12, 0.18, pz + 0.1], { groundAo: 0.6 });
  }
  pushBox(bark, [-0.35, 0.02, -0.07], [0.35, 0.16, 0.07]);
  pushBox(bark, [-0.07, 0.02, -0.35], [0.07, 0.16, 0.35]);
  return { obstacle: { x, z, radius: 0.6 }, flame: { x, y: 0.42, z }, smoke: [x, 0.8, z] };
}

// Table de terrasse : plateau sur pied, deux bancs, des chopes.
export function buildTable({ x, z }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  pushBox(wood, [-0.55, 0.7, -0.35], [0.55, 0.78, 0.35]);
  pushBox(wood, [-0.08, 0, -0.08], [0.08, 0.7, 0.08]);
  pushBox(wood, [-0.35, 0, -0.25], [0.35, 0.06, 0.25]);
  for (const side of [-1, 1]) {
    pushBox(wood, [-0.55, 0.4, side * 0.55 - 0.13], [0.55, 0.46, side * 0.55 + 0.13]);
    for (const lx of [-0.42, 0.42]) pushBox(wood, [lx - 0.04, 0, side * 0.55 - 0.08], [lx + 0.04, 0.4, side * 0.55 + 0.08]);
  }
  for (const [mx, mz] of [[-0.25, -0.1], [0.2, 0.12], [0.32, -0.15]]) pushBox(iron, [mx - 0.05, 0.78, mz - 0.05], [mx + 0.05, 0.92, mz + 0.05]);
  return { x, z, radius: 0.75 };
}

// Pot de fleurs en terre cuite : un petit massif de brique, les fleurs sont
// posées dessus en touffes fleuries. Renvoie l'obstacle et le point des fleurs.
export function buildFlowerPot({ x, z }, builders) {
  const brick = createFrame(builders.brick, [x, 0, z]);
  pushBox(brick, [-0.17, 0, -0.17], [0.17, 0.3, 0.17], { groundAo: 0.6 });
  pushBox(brick, [-0.2, 0.26, -0.2], [0.2, 0.34, 0.2]);
  return { obstacle: { x, z, radius: 0.22 }, flowers: { x, y: 0.34, z } };
}

// Poteau indicateur : un mât et deux planches en flèche.
export function buildSignpost({ x, z }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  pushBox(wood, [-0.06, 0, -0.06], [0.06, 1.75, 0.06], { groundAo: 0.6 });
  pushBox(wood, [0.06, 1.35, -0.04], [0.7, 1.55, 0.04]);
  pushBox(wood, [-0.04, 1.05, 0.06], [0.04, 1.25, 0.62]);
  pushBox(wood, [-0.1, 1.75, -0.1], [0.1, 1.82, 0.1]);
  return { x, z, radius: 0.12 };
}

// Tas de bois : des bûches empilées le long de l'axe x, sous un petit auvent.
export function buildWoodpile({ x, z }, builders) {
  const bark = createFrame(builders.bark, [x, 0, z]);
  const wood = createFrame(builders.wood, [x, 0, z]);
  for (let row = 0; row < 3; row += 1) {
    for (let i = 0; i < 4 - row; i += 1) {
      const cx = -0.6 + row * 0.15 + i * 0.32;
      pushBox(bark, [cx - 0.14, row * 0.26, -0.3], [cx + 0.14, row * 0.26 + 0.26, 0.3], { groundAo: 0.6 });
    }
  }
  for (const px of [-0.78, 0.62]) pushBox(wood, [px - 0.04, 0, -0.38], [px + 0.04, 1.05, -0.3]);
  pushBox(wood, [-0.9, 1.05, -0.5], [0.75, 1.1, 0.42]);
  return { x, z, radius: 0.75 };
}

// ---------------------------------------------------------------------------
// Le verger, le terrain d'entraînement, le lavoir et le marché. Même méthode,
// avec deux outils de plus : une boîte inclinée (pushBar), pour les échelles,
// les pieds de chevalet, les flèches et les branches, et un octogone épais
// (pushOctagon) pour les cibles. Les positions « au hasard » (les pommes)
// sortent d'un hachage de x et z : le même verger à chaque chargement.
// ---------------------------------------------------------------------------

// Nombre pseudo-aléatoire dans [0, 1[, déterminé par (a, b) et un indice i.
function hash01(a, b, i) {
  const v = Math.sin(a * 12.9898 + b * 78.233 + i * 37.719) * 43758.5453;
  return v - Math.floor(v);
}

// Octogone plein dans un plan vertical, face au sud : face avant en z1, face
// arrière en z0, flancs entre les deux. Avec z0 égal à z1, seule la face avant
// (un disque plat à plaquer). Le rayon est pris aux sommets.
function pushOctagon(frame, [cx, cy], radius, [z0, z1]) {
  const ring = (zz) => Array.from({ length: 8 }, (_, k) => {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, zz];
  });
  const uvs = (points) => points.map(([px, py]) => [tile(px), tile(py)]);
  const front = ring(z1);
  frame.polygon(front, uvs(front));
  if (z0 === z1) return;
  const back = ring(z0).reverse();
  frame.polygon(back, uvs(back));
  const depth = tile(z1 - z0);
  for (let k = 0; k < 8; k += 1) {
    const n = (k + 1) % 8;
    const edge = tile(Math.hypot(front[n][0] - front[k][0], front[n][1] - front[k][1]));
    frame.polygon(
      [front[k], [front[k][0], front[k][1], z0], [front[n][0], front[n][1], z0], front[n]],
      [[0, 0], [depth, 0], [depth, edge], [0, edge]],
    );
  }
}

// Toit à deux pans dont le faîtage suit l'axe x, de x0 à x1, les égouts en z0
// (nord) et z1 (sud) : pans couverts de la matière roofKey, sous-face et chants
// en planches, poutre de faîtage. Fermé, il porte ombre comme un volume.
function gableRoofX(frames, roofKey, [x0, z0, x1, z1], eaveY, ridgeY, T) {
  const mid = (z0 + z1) / 2;
  const slopeLength = tile(Math.hypot(mid - z0, ridgeY - eaveY));
  const roof = frames[roofKey];
  const wood = frames.wood;
  roof.polygon([[x0, eaveY, z1], [x1, eaveY, z1], [x1, ridgeY, mid], [x0, ridgeY, mid]],
    [[tile(x0), 0], [tile(x1), 0], [tile(x1), slopeLength], [tile(x0), slopeLength]]);
  roof.polygon([[x1, eaveY, z0], [x0, eaveY, z0], [x0, ridgeY, mid], [x1, ridgeY, mid]],
    [[tile(x1), 0], [tile(x0), 0], [tile(x0), slopeLength], [tile(x1), slopeLength]]);
  wood.polygon([[x0, ridgeY - T, mid], [x1, ridgeY - T, mid], [x1, eaveY - T, z1], [x0, eaveY - T, z1]], FULL_UV);
  wood.polygon([[x1, ridgeY - T, mid], [x0, ridgeY - T, mid], [x0, eaveY - T, z0], [x1, eaveY - T, z0]], FULL_UV);
  wood.polygon([[x0, eaveY - T, z1], [x1, eaveY - T, z1], [x1, eaveY, z1], [x0, eaveY, z1]], FULL_UV);
  wood.polygon([[x1, eaveY - T, z0], [x0, eaveY - T, z0], [x0, eaveY, z0], [x1, eaveY, z0]], FULL_UV);
  wood.polygon([[x1, eaveY - T, z1], [x1, ridgeY - T, mid], [x1, ridgeY, mid], [x1, eaveY, z1]], FULL_UV);
  wood.polygon([[x1, ridgeY - T, mid], [x1, eaveY - T, z0], [x1, eaveY, z0], [x1, ridgeY, mid]], FULL_UV);
  wood.polygon([[x0, eaveY - T, z0], [x0, ridgeY - T, mid], [x0, ridgeY, mid], [x0, eaveY, z0]], FULL_UV);
  wood.polygon([[x0, ridgeY - T, mid], [x0, eaveY - T, z1], [x0, eaveY, z1], [x0, ridgeY, mid]], FULL_UV);
  pushBox(wood, [x0, ridgeY - 0.04, mid - 0.09], [x1, ridgeY + 0.08, mid + 0.09]);
}

// Lavoir : margelle de pierre autour d'un bassin de deux cases sur deux (l'eau
// est peinte par la carte, le rectangle intérieur reste vide), planche à laver,
// baquet et panier de linge, sous un toit d'ardoise à deux pans porté par
// quatre poteaux à charpente apparente. (x, z) : coin nord-ouest de l'emprise
// de 4 × 4 cases. Renvoie les obstacles ronds des poteaux et de la margelle.
const WASHHOUSE = { size: 4, rim: 0.3, rimHeight: 0.45, postHeight: 2.4, ridgeY: 3.3, roofSize: 4.4, postInset: 0.35 };
export function buildWashhouse({ x, z }, builders) {
  const frames = Object.fromEntries(Object.keys(builders).map((key) => [key, createFrame(builders[key], [x, 0, z])]));
  const { stone, wood, post, iron, plaster, awning } = frames;
  const S = WASHHOUSE.size;
  const [in0, in1] = [1, 3]; // le bassin
  const [out0, out1] = [in0 - WASHHOUSE.rim, in1 + WASHHOUSE.rim];
  const H = WASHHOUSE.rimHeight;
  // Margelle en quatre côtés, coiffée d'un chaperon qui déborde un peu.
  const rimStrips = (a0, a1, y0, y1) => {
    pushBox(stone, [a0, y0, a0], [a1, y1, in0]);
    pushBox(stone, [a0, y0, in1], [a1, y1, a1]);
    pushBox(stone, [a0, y0, in0], [in0, y1, in1]);
    pushBox(stone, [in1, y0, in0], [a1, y1, in1]);
  };
  rimStrips(out0, out1, 0, H - 0.06);
  rimStrips(out0 - 0.04, out1 + 0.04, H - 0.06, H);
  // Poteaux sur dés de pierre, sablières (axe x) et entraits (axe z) posés
  // dessus, jambes de force, puis aux pignons un poinçon et deux arbalétriers
  // qui suivent les pans.
  const [p0, p1] = [WASHHOUSE.postInset, S - WASHHOUSE.postInset];
  const PH = WASHHOUSE.postHeight;
  const ridgeY = WASHHOUSE.ridgeY;
  const mid = S / 2;
  const corners = [[p0, p0], [p1, p0], [p0, p1], [p1, p1]];
  for (const [px, pz] of corners) {
    pushBox(stone, [px - 0.12, 0, pz - 0.12], [px + 0.12, 0.12, pz + 0.12], { groundAo: 0.6 });
    pushBox(post, [px - 0.07, 0, pz - 0.07], [px + 0.07, PH, pz + 0.07], { groundAo: 0.6 });
    const sx = px === p0 ? 1 : -1;
    const sz = pz === p0 ? 1 : -1;
    pushBar(wood, [px, PH - 0.55, pz], [px + sx * 0.5, PH + 0.02, pz], 0.06);
    pushBar(wood, [px, PH - 0.55, pz], [px, PH + 0.02, pz + sz * 0.5], 0.06);
  }
  for (const pz of [p0, p1]) pushBox(wood, [p0 - 0.15, PH, pz - 0.07], [p1 + 0.15, PH + 0.12, pz + 0.07]);
  for (const px of [p0, p1]) {
    pushBox(wood, [px - 0.07, PH, p0 - 0.15], [px + 0.07, PH + 0.12, p1 + 0.15]);
    pushBox(wood, [px - 0.05, PH + 0.12, mid - 0.05], [px + 0.05, ridgeY - 0.04, mid + 0.05]);
    pushBar(wood, [px, PH + 0.06, p0], [px, ridgeY - 0.2, mid - 0.08], 0.08);
    pushBar(wood, [px, PH + 0.06, p1], [px, ridgeY - 0.2, mid + 0.08], 0.08);
  }
  const overhang = (WASHHOUSE.roofSize - S) / 2;
  gableRoofX(frames, 'slate', [-overhang, -overhang, S + overhang, S + overhang], PH, ridgeY, 0.1);
  // Planche à laver appuyée sur la margelle sud et plongeant dans le bassin,
  // le savon à côté.
  const boardLow = [1.63, 0.12, 2.35];
  const boardRun = [0, H - 0.12, 0.85];
  const boardLength = Math.hypot(boardRun[1], boardRun[2]);
  const boardUp = [0, (boardRun[2] / boardLength) * 0.04, (-boardRun[1] / boardLength) * 0.04];
  pushSkewBox(wood, boardLow, [[0.45, 0, 0], boardUp, boardRun]);
  pushBox(plaster, [2.25, H, 3.05], [2.37, H + 0.05, 3.14]);
  // Baquet cerclé de fer au coin nord-ouest, plein d'eau savonneuse.
  pushBox(wood, [0.68, H, 0.68], [1.04, H + 0.26, 1.04]);
  for (const y of [H + 0.05, H + 0.19]) pushBox(iron, [0.665, y, 0.665], [1.045, y + 0.03, 1.045]);
  pushBox(plaster, [0.72, H + 0.26, 0.72], [1.0, H + 0.3, 1.0]);
  // Panier de linge sur la margelle est, le linge qui dépasse.
  pushBox(wood, [out1 - 0.33, H, 1.95], [out1 + 0.02, H + 0.22, 2.4]);
  pushBox(iron, [out1 - 0.345, H + 0.1, 1.935], [out1 + 0.035, H + 0.13, 2.415]);
  pushBox(plaster, [out1 - 0.3, H + 0.22, 1.98], [out1 - 0.01, H + 0.3, 2.37]);
  pushBox(awning, [out1 - 0.26, H + 0.3, 2.05], [out1 - 0.05, H + 0.35, 2.3]);
  // Un drap étendu sur la margelle sud, qui pend devant.
  pushBox(awning, [2.5, H, 3.0], [2.85, H + 0.02, out1 + 0.04]);
  awning.polygon(
    [[2.5, 0.15, out1 + 0.045], [2.85, 0.15, out1 + 0.045], [2.85, H + 0.02, out1 + 0.045], [2.5, H + 0.02, out1 + 0.045]],
    [[0, 0], [tile(0.35), 0], [tile(0.35), tile(H)], [0, tile(H)]],
  );
  // Obstacles : les poteaux, et des cercles serrés le long de la margelle.
  const obstacles = corners.map(([px, pz]) => ({ x: x + px, z: z + pz, radius: 0.1 }));
  const [c0, c1] = [out0 + WASHHOUSE.rim / 2, out1 - WASHHOUSE.rim / 2];
  const steps = Math.ceil((c1 - c0) / 0.4);
  for (let s = 0; s <= steps; s += 1) {
    const t = c0 + ((c1 - c0) * s) / steps;
    obstacles.push({ x: x + t, z: z + c0, radius: 0.2 }, { x: x + t, z: z + c1, radius: 0.2 });
    if (s > 0 && s < steps) obstacles.push({ x: x + c0, z: z + t, radius: 0.2 }, { x: x + c1, z: z + t, radius: 0.2 });
  }
  return obstacles;
}

// Mannequin d'entraînement : un pieu calé au sol, un corps de paille serré par
// des cordes, une traverse pour les bras, un tablier de toile. facing : le
// côté vers lequel il regarde (south, north, east, west). Renvoie l'obstacle
// rond et le point où une épée le touche.
const DUMMY = { postHeight: 1.9, torso: [0.5, 0.7, 0.3], torsoBottom: 0.75, armsY: 1.35, armsLength: 1.1, hitY: 1.1 };
export function buildDummy({ x, z, facing = 'south' }, builders) {
  const swap = facing === 'east' || facing === 'west';
  const front = facing === 'south' || facing === 'east' ? 1 : -1;
  const frame = (key) => createFrame(builders[key], [x, 0, z], swap);
  const [post, thatch, wood, iron, awning] = ['post', 'thatch', 'wood', 'iron', 'awning'].map(frame);
  const [hw, th, hd] = [DUMMY.torso[0] / 2, DUMMY.torso[1], DUMMY.torso[2] / 2];
  const y0 = DUMMY.torsoBottom;
  pushBox(post, [-0.05, 0, -0.05], [0.05, DUMMY.postHeight, 0.05], { groundAo: 0.6 });
  for (const [u, w] of [[0.08, 0], [-0.08, 0.02], [0.01, -0.09]]) {
    pushBox(wood, [u - 0.07, 0, w - 0.05], [u + 0.07, 0.08, w + 0.05], { groundAo: 0.6 });
  }
  // Paille : torse, hanches plus étroites, tête en deux boîtes croisées.
  pushBox(thatch, [-hw, y0, -hd], [hw, y0 + th, hd]);
  pushBox(thatch, [-hw + 0.08, y0 - 0.2, -hd + 0.05], [hw - 0.08, y0, hd - 0.05]);
  pushBox(thatch, [-0.14, y0 + th + 0.03, -0.14], [0.14, y0 + th + 0.31, 0.14]);
  pushBox(thatch, [-0.1, y0 + th - 0.01, -0.1], [0.1, y0 + th + 0.35, 0.1]);
  // Traverse des bras, une poignée de paille à chaque bout.
  const half = DUMMY.armsLength / 2;
  pushBox(wood, [-half, DUMMY.armsY - 0.04, -0.04], [half, DUMMY.armsY + 0.04, 0.04]);
  for (const su of [-1, 1]) {
    pushBox(thatch, [su * half - 0.1, DUMMY.armsY - 0.09, -0.07], [su * half + 0.1, DUMMY.armsY + 0.09, 0.07]);
  }
  // Tablier sur le devant, cordes autour du torse et du cou.
  const apron = front > 0 ? [hd, hd + 0.02] : [-hd - 0.02, -hd];
  pushBox(awning, [-0.19, y0 + 0.05, apron[0]], [0.19, y0 + 0.5, apron[1]]);
  for (const y of [y0 + 0.1, y0 + 0.3, y0 + 0.5]) pushBox(iron, [-hw - 0.03, y, -hd - 0.03], [hw + 0.03, y + 0.03, hd + 0.03]);
  pushBox(iron, [-0.115, y0 + th - 0.03, -0.115], [0.115, y0 + th, 0.115]);
  return { obstacle: { x, z, radius: 0.35 }, hit: { x, y: DUMMY.hitY, z } };
}

// Cible d'archer : un disque de paille (octogone épais) ceinturé de corde,
// posé sur un chevalet à trois pieds croisés, deux anneaux peints sur la face
// sud, deux flèches fichées. Renvoie l'obstacle rond.
const TARGET = { radius: 0.45, thickness: 0.12, centerY: 0.9, legHeight: 1.1 };
export function buildTarget({ x, z }, builders) {
  const frame = (key) => createFrame(builders[key], [x, 0, z]);
  const [thatch, wood, iron, brick, plaster, awning] = ['thatch', 'wood', 'iron', 'brick', 'plaster', 'awning'].map(frame);
  const t = TARGET.thickness / 2;
  const cy = TARGET.centerY;
  const top = TARGET.legHeight;
  const legZ = -t - 0.05;
  // Chevalet : deux pieds avant écartés, un pied arrière, réunis sous un
  // chapeau, une traverse, et la tablette où repose la cible.
  for (const sx of [-1, 1]) pushBar(wood, [sx * 0.5, 0, legZ], [sx * 0.1, top, legZ], 0.06, { groundAo: 0.6 });
  pushBar(wood, [0, 0, -0.8], [0, top, legZ - 0.08], 0.06, { groundAo: 0.6 });
  pushBox(wood, [-0.16, top - 0.02, legZ - 0.12], [0.16, top + 0.05, legZ + 0.04]);
  pushBox(wood, [-0.36, 0.38, legZ - 0.03], [0.36, 0.45, legZ + 0.03]);
  pushBox(wood, [-0.3, cy - TARGET.radius - 0.06, legZ], [0.3, cy - TARGET.radius, t + 0.04]);
  // Le disque de paille, deux liens de corde, et les anneaux peints.
  pushOctagon(thatch, [0, cy], TARGET.radius, [-t, t]);
  for (const sy of [-0.18, 0.18]) pushBox(iron, [-0.4, cy + sy - 0.015, -t - 0.005], [0.4, cy + sy + 0.015, t + 0.005]);
  pushOctagon(plaster, [0, cy], 0.33, [t + 0.01, t + 0.01]);
  pushOctagon(brick, [0, cy], 0.2, [t + 0.02, t + 0.02]);
  pushOctagon(plaster, [0, cy], 0.08, [t + 0.03, t + 0.03]);
  // Deux flèches un peu obliques : fût de fer, empenne de toile.
  for (const [ax, ay, dx, dy] of [[0.1, cy + 0.06, 0.12, 0.1], [-0.15, cy - 0.12, -0.08, 0.14]]) {
    const tail = [ax + dx, ay + dy, t + 0.5];
    pushBar(iron, [ax, ay, t - 0.04], tail, 0.025);
    pushBar(awning, [ax + dx * 0.82, ay + dy * 0.82, t + 0.41], tail, 0.05);
  }
  return { x, z, radius: 0.5 };
}

// Pommier de verger : tronc court et trapu, trois branches qui montent, des
// pommes semées dans la coquille de la couronne (positions tirées de x et z,
// identiques à chaque chargement) et deux tombées au pied. La couronne est
// posée par le village en grappes de feuillage. Renvoie { center, radius }.
const APPLE = 0.09;
export function buildAppleTree(x, z, { size = 1 }, builders) {
  const bark = createFrame(builders.bark, [x, 0, z]);
  const brick = createFrame(builders.brick, [x, 0, z]);
  const trunk = 0.19 * size;
  const crownBase = 1.0 * size;
  pushBox(bark, [-trunk, 0, -trunk], [trunk, crownBase + 0.7 * size, trunk], { groundAo: 0.6 });
  pushBox(bark, [-trunk - 0.05, 0, -trunk - 0.05], [trunk + 0.05, 0.22 * size, trunk + 0.05], { groundAo: 0.6 });
  const b = 0.07 * size;
  pushBar(bark, [trunk - 0.05, crownBase - 0.15 * size, 0], [trunk + 0.55 * size, crownBase + 0.35 * size, 0.1 * size], b);
  pushBar(bark, [-trunk + 0.05, crownBase + 0.05 * size, 0.05 * size], [-trunk - 0.5 * size, crownBase + 0.5 * size, -0.15 * size], b);
  pushBar(bark, [0, crownBase + 0.2 * size, -trunk + 0.05], [0.1 * size, crownBase + 0.6 * size, -trunk - 0.5 * size], b);
  const center = { x, y: crownBase + 0.95 * size, z };
  const radius = 1.05 * size;
  const count = 12 + Math.floor(hash01(x, z, 0) * 5);
  for (let i = 0; i < count; i += 1) {
    const angle = hash01(x, z, i * 3 + 1) * Math.PI * 2;
    const v = hash01(x, z, i * 3 + 2);
    const lift = -0.75 + 1.1 * v * v; // plutôt dans la moitié basse
    const rho = radius * (0.6 + 0.4 * hash01(x, z, i * 3 + 3));
    const flat = rho * Math.sqrt(1 - lift * lift);
    const [ax, ay, az] = [Math.cos(angle) * flat, center.y + rho * lift, Math.sin(angle) * flat];
    pushBox(brick, [ax - APPLE / 2, ay - APPLE / 2, az - APPLE / 2], [ax + APPLE / 2, ay + APPLE / 2, az + APPLE / 2]);
  }
  for (const i of [0, 1]) {
    const angle = hash01(x, z, 60 + i) * Math.PI * 2;
    const d = trunk + 0.25 + hash01(x, z, 70 + i) * 0.4;
    const [ax, az] = [Math.cos(angle) * d, Math.sin(angle) * d];
    pushBox(brick, [ax - APPLE / 2, 0, az - APPLE / 2], [ax + APPLE / 2, APPLE, az + APPLE / 2], { groundAo: 0.6 });
  }
  return { center, radius };
}

// Échelle de bois appuyée contre un arbre : deux montants inclinés de 0,07
// vers lean (north, south, east, west) par 0,3 de hauteur, barreaux tous les
// 0,3. (x, z) : le pied de l'échelle. Renvoie l'obstacle rond.
const LADDER = { width: 0.4, rail: 0.05, rung: 0.04, step: 0.3, lean: 0.07 };
export function buildLadder({ x, z, length = 2.6, lean = 'north' }, builders) {
  const swap = lean === 'east' || lean === 'west';
  const sign = lean === 'south' || lean === 'east' ? 1 : -1;
  const wood = createFrame(builders.wood, [x, 0, z], swap);
  const slope = Math.hypot(LADDER.step, LADDER.lean);
  const rise = (LADDER.step / slope) * length;
  const run = ((sign * LADDER.lean) / slope) * length;
  const half = LADDER.width / 2;
  for (const u of [-half, half]) pushBar(wood, [u, 0, 0], [u, rise, run], LADDER.rail, { groundAo: 0.6 });
  for (let s = 0.25; s < length - 0.12; s += LADDER.step) {
    const y = (s / length) * rise;
    const w = (s / length) * run;
    pushBox(wood, [-half, y - LADDER.rung / 2, w - LADDER.rung / 2], [half, y + LADDER.rung / 2, w + LADDER.rung / 2]);
  }
  return { x, z, radius: 0.25 };
}

// Panier d'osier : une caisse de bois cerclée de deux liserés de fer (le
// tressage) au bord roulé, une anse en trois morceaux, et des pommes dedans
// si full. Renvoie l'obstacle rond.
export function buildBasket({ x, z, full = true }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  const brick = createFrame(builders.brick, [x, 0, z]);
  const h = 0.25;
  pushBox(wood, [-h, 0, -h], [h, 0.32, h], { groundAo: 0.6 });
  for (const y of [0.08, 0.26]) pushBox(iron, [-h - 0.012, y, -h - 0.012], [h + 0.012, y + 0.025, h + 0.012]);
  pushBox(wood, [-h - 0.02, 0.3, -h - 0.02], [h + 0.02, 0.34, h + 0.02]);
  for (const sx of [-0.2, 0.2]) pushBox(wood, [sx - 0.02, 0.34, -0.02], [sx + 0.02, 0.58, 0.02]);
  pushBox(wood, [-0.22, 0.58, -0.02], [0.22, 0.62, 0.02]);
  if (!full) return { x, z, radius: 0.3 };
  // Cinq pommes posées dans le panier, trois par-dessus, à peine décalées.
  const spots = [
    [-0.13, 0.34, -0.12], [0.12, 0.34, -0.13], [-0.12, 0.34, 0.12], [0.13, 0.34, 0.1], [0, 0.34, 0],
    [-0.03, 0.42, -0.1], [0.08, 0.42, 0.05], [-0.1, 0.42, 0.06],
  ];
  spots.forEach(([ax, ay, az], i) => {
    const jx = (hash01(x, z, i) - 0.5) * 0.03;
    const jz = (hash01(x, z, i + 9) - 0.5) * 0.03;
    pushBox(brick, [ax + jx - APPLE / 2, ay, az + jz - APPLE / 2], [ax + jx + APPLE / 2, ay + APPLE, az + jz + APPLE / 2]);
  });
  return { x, z, radius: 0.3 };
}

// Structure commune des étals garnis : comptoir à lisses, quatre poteaux,
// auvent de toile rayée en pente vers le sud, lambrequin à festons. Renvoie
// le bas du lambrequin et l'avancée du front, pour y suspendre une pancarte.
const STALL = { halfWidth: 1.1, counterTop: 0.92, back: [-0.75, 2.2], front: [0.95, 1.78], valance: 0.25, scallops: 6 };
function pushStallStructure(wood, awning) {
  const w = STALL.halfWidth;
  for (const [px, pz, h] of [[-w, -0.55, 2.15], [w, -0.55, 2.15], [-w, 0.65, 1.8], [w, 0.65, 1.8]]) {
    pushBox(wood, [px - 0.05, 0, pz - 0.05], [px + 0.05, h, pz + 0.05]);
  }
  pushBox(wood, [-w + 0.05, 0, 0.1], [w - 0.05, 0.85, 0.6]);
  pushBox(wood, [-w, 0.85, 0.05], [w, STALL.counterTop, 0.7]);
  for (const y of [0.25, 0.55]) pushBox(wood, [-w + 0.03, y, 0.6], [w - 0.03, y + 0.06, 0.63]);
  const { back, front } = STALL;
  const span = tile(2 * w + 0.2);
  const uv = [[0, 0], [span, 0], [span, tile(1.8)], [0, tile(1.8)]];
  awning.polygon([[-w - 0.1, front[1], front[0]], [w + 0.1, front[1], front[0]], [w + 0.1, back[1], back[0]], [-w - 0.1, back[1], back[0]]], uv);
  awning.polygon([[w + 0.1, front[1], front[0]], [-w - 0.1, front[1], front[0]], [-w - 0.1, back[1], back[0]], [w + 0.1, back[1], back[0]]], uv);
  const valanceY = front[1] - STALL.valance;
  awning.polygon([[-w - 0.1, valanceY, front[0]], [w + 0.1, valanceY, front[0]], [w + 0.1, front[1], front[0]], [-w - 0.1, front[1], front[0]]],
    [[0, 0], [span, 0], [span, tile(STALL.valance)], [0, tile(STALL.valance)]]);
  const width = (2 * w + 0.2) / STALL.scallops;
  for (let i = 0; i < STALL.scallops; i += 1) {
    const a = -w - 0.1 + i * width;
    awning.polygon([[a, valanceY, front[0]], [a + width / 2, valanceY - 0.1, front[0]], [a + width, valanceY, front[0]]],
      [[tile(a), 0], [tile(a + width / 2), -tile(0.1)], [tile(a + width), 0]]);
  }
  return { valanceY, frontZ: front[0] };
}

// Étal de marché garni selon goods : 'legumes' (cageots et citrouilles),
// 'tissus' (rouleaux de toile, coupons pliés, un pan qui pend), 'poteries'
// (pots et cruches à anse) ou 'fioles' (étagère de fioles bouchées, mortier,
// pancarte). Même emprise que buildStall. Renvoie l'obstacle rond.
export function buildMarketStall({ x, z, goods = 'legumes' }, builders) {
  const frame = (key) => createFrame(builders[key], [x, 0, z]);
  const wood = frame('wood');
  const awning = frame('awning');
  const { valanceY, frontZ } = pushStallStructure(wood, awning);
  const top = STALL.counterTop;
  if (goods === 'legumes') {
    const leaves = frame('leaves');
    const brick = frame('brick');
    for (const cx of [-0.72, -0.2, 0.32]) {
      pushBox(wood, [cx - 0.22, top, 0.15], [cx + 0.22, top + 0.14, 0.6]);
      pushBox(leaves, [cx - 0.18, top + 0.14, 0.2], [cx + 0.18, top + 0.28, 0.55]);
    }
    for (const [px, pz] of [[0.72, 0.25], [0.93, 0.5]]) {
      pushBox(brick, [px - 0.11, top, pz - 0.11], [px + 0.11, top + 0.22, pz + 0.11]);
      pushBox(brick, [px - 0.08, top + 0.22, pz - 0.08], [px + 0.08, top + 0.25, pz + 0.08]);
      pushBox(wood, [px - 0.02, top + 0.25, pz - 0.02], [px + 0.02, top + 0.31, pz + 0.02]);
    }
  } else if (goods === 'tissus') {
    const roll = (cx, cy, cz) => pushBox(awning, [cx - 0.275, cy, cz - 0.09], [cx + 0.275, cy + 0.18, cz + 0.09]);
    roll(-0.55, top, 0.22);
    roll(-0.55, top, 0.44);
    roll(-0.55, top + 0.18, 0.33);
    for (let i = 0; i < 3; i += 1) {
      pushBox(awning, [0.2 + i * 0.02, top + i * 0.06, 0.15 + i * 0.01], [0.6 - i * 0.02, top + (i + 1) * 0.06, 0.55 - i * 0.01]);
    }
    pushBox(awning, [0.76, top, 0.26], [0.94, top + 0.6, 0.44]);
    pushBox(awning, [-0.3, top, 0.4], [0.3, top + 0.02, 0.72]);
    awning.polygon(
      [[-0.3, 0.15, 0.725], [0.3, 0.15, 0.725], [0.3, top + 0.02, 0.725], [-0.3, top + 0.02, 0.725]],
      [[0, 0], [tile(0.6), 0], [tile(0.6), tile(top)], [0, tile(top)]],
    );
  } else if (goods === 'poteries') {
    const brick = frame('brick');
    const pot = (cx, cz, s) => {
      pushBox(brick, [cx - s / 2, top, cz - s / 2], [cx + s / 2, top + s * 1.1, cz + s / 2]);
      pushBox(brick, [cx - s * 0.36, top + s * 1.1, cz - s * 0.36], [cx + s * 0.36, top + s * 1.3, cz + s * 0.36]);
      pushBox(brick, [cx - s * 0.42, top + s * 1.3, cz - s * 0.42], [cx + s * 0.42, top + s * 1.38, cz + s * 0.42]);
    };
    for (const [cx, cz, s] of [[-0.85, 0.28, 0.22], [-0.52, 0.5, 0.16], [-0.3, 0.22, 0.18], [0, 0.45, 0.14], [0.25, 0.2, 0.2]]) pot(cx, cz, s);
    for (const [cx, cz] of [[0.6, 0.3], [0.92, 0.5]]) {
      pushBox(brick, [cx - 0.1, top, cz - 0.1], [cx + 0.1, top + 0.3, cz + 0.1]);
      pushBox(brick, [cx - 0.06, top + 0.3, cz - 0.06], [cx + 0.06, top + 0.42, cz + 0.06]);
      pushBox(brick, [cx - 0.08, top + 0.42, cz - 0.08], [cx + 0.08, top + 0.45, cz + 0.08]);
      pushBox(brick, [cx + 0.1, top + 0.14, cz - 0.015], [cx + 0.17, top + 0.17, cz + 0.015]);
      pushBox(brick, [cx + 0.14, top + 0.14, cz - 0.015], [cx + 0.17, top + 0.36, cz + 0.015]);
      pushBox(brick, [cx + 0.06, top + 0.33, cz - 0.015], [cx + 0.17, top + 0.36, cz + 0.015]);
    }
  } else {
    const iron = frame('iron');
    const brick = frame('brick');
    const vial = (cx, cy, cz) => {
      pushBox(iron, [cx - 0.04, cy, cz - 0.04], [cx + 0.04, cy + 0.16, cz + 0.04]);
      pushBox(wood, [cx - 0.03, cy + 0.16, cz - 0.03], [cx + 0.03, cy + 0.22, cz + 0.03]);
    };
    // Étagère à deux niveaux, fond compris, quatre fioles en bas et trois en haut.
    for (const sx of [-0.55, 0.55]) pushBox(wood, [sx - 0.025, top, 0.3], [sx + 0.025, top + 0.58, 0.5]);
    for (const y of [top + 0.27, top + 0.55]) pushBox(wood, [-0.58, y, 0.29], [0.58, y + 0.03, 0.51]);
    pushBox(wood, [-0.55, top, 0.29], [0.55, top + 0.58, 0.3]);
    for (const cx of [-0.38, -0.13, 0.13, 0.38]) vial(cx, top, 0.4);
    for (const cx of [-0.25, 0, 0.25]) vial(cx, top + 0.3, 0.4);
    // Mortier et pilon au bout du comptoir.
    pushBox(brick, [0.78, top, 0.3], [0.98, top + 0.14, 0.5]);
    pushBar(wood, [0.84, top + 0.1, 0.42], [0.96, top + 0.3, 0.34], 0.04);
    // Pancarte suspendue au lambrequin, une fiole peinte dessus.
    for (const sx of [-0.22, 0.22]) pushBox(iron, [sx - 0.01, valanceY - 0.2, frontZ - 0.01], [sx + 0.01, valanceY, frontZ + 0.01]);
    pushBox(wood, [-0.3, valanceY - 0.42, frontZ - 0.02], [0.3, valanceY - 0.2, frontZ + 0.02]);
    pushBox(iron, [-0.035, valanceY - 0.38, frontZ + 0.02], [0.035, valanceY - 0.27, frontZ + 0.035]);
    pushBox(wood, [-0.025, valanceY - 0.27, frontZ + 0.02], [0.025, valanceY - 0.23, frontZ + 0.035]);
  }
  return [{ x, z: z + 0.2, radius: 1.15 }];
}

// Enseigne figurée (version 2.4) : la potence de fer de buildSign, et dessous
// l'objet du métier au bout de deux chaînettes : la chope de l'auberge
// (fût de bois cerclé, mousse d'enduit, anse de fer), l'enclume de la forge,
// le livre ouvert de la bibliothèque, la fiole lumineuse de l'apothicaire
// (le verre est la matière des fenêtres : il brille le soir).
export function buildShopSign({ x, z, y = 2.5, kind = 'chope' }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  const plaster = createFrame(builders.plaster, [x, 0, z]);
  const glass = createFrame(builders.window, [x, 0, z]);
  const brick = createFrame(builders.brick, [x, 0, z]);
  pushBox(iron, [-0.03, y + 0.35, 0], [0.03, y + 0.4, 0.8]);
  pushBox(iron, [-0.03, y, 0], [0.03, y + 0.4, 0.05]);
  pushBar(iron, [0, y + 0.05, 0.05], [0, y + 0.35, 0.5], 0.04); // la jambe de force
  const cz = 0.56; // l'objet pend au bout de la potence
  for (const sz of [-0.12, 0.12]) pushBox(iron, [-0.012, y + 0.14, cz + sz - 0.012], [0.012, y + 0.35, cz + sz + 0.012]);
  if (kind === 'chope') {
    pushBox(wood, [-0.16, y - 0.26, cz - 0.16], [0.16, y + 0.1, cz + 0.16]);
    for (const yy of [y - 0.22, y + 0.02]) pushBox(iron, [-0.17, yy, cz - 0.17], [0.17, yy + 0.04, cz + 0.17]);
    pushBox(plaster, [-0.18, y + 0.1, cz - 0.18], [0.18, y + 0.2, cz + 0.18]); // la mousse
    pushBox(plaster, [-0.1, y + 0.2, cz - 0.1], [0.1, y + 0.26, cz + 0.1]);
    pushBox(iron, [0.16, y - 0.18, cz - 0.03], [0.26, y + 0.02, cz + 0.03]); // l'anse
    pushBox(iron, [0.22, y - 0.18, cz - 0.03], [0.26, y + 0.02, cz + 0.03]);
  } else if (kind === 'enclume') {
    pushBox(iron, [-0.2, y - 0.26, cz - 0.13], [0.2, y - 0.14, cz + 0.13]); // le pied
    pushBox(iron, [-0.13, y - 0.14, cz - 0.09], [0.13, y - 0.02, cz + 0.09]); // le corps
    pushBox(iron, [-0.3, y - 0.02, cz - 0.1], [0.3, y + 0.12, cz + 0.1]); // la table
    pushBox(iron, [0.3, y + 0.02, cz - 0.05], [0.42, y + 0.1, cz + 0.05]); // le bec
  } else if (kind === 'livre') {
    for (const sx of [-1, 1]) {
      pushSkewBox(wood, [sx * 0.02, y - 0.2, cz - 0.16], [[sx * 0.26, 0.1, 0], [0, 0.04, 0], [0, 0, 0.32]]); // la couverture
      pushSkewBox(plaster, [sx * 0.03, y - 0.16, cz - 0.14], [[sx * 0.23, 0.09, 0], [0, 0.07, 0], [0, 0, 0.28]]); // les pages
    }
    pushBox(wood, [-0.03, y - 0.2, cz - 0.16], [0.03, y - 0.1, cz + 0.16]); // le dos
  } else if (kind === 'fiole') {
    pushBox(glass, [-0.12, y - 0.26, cz - 0.12], [0.12, y - 0.02, cz + 0.12]); // la panse
    pushBox(glass, [-0.06, y - 0.02, cz - 0.06], [0.06, y + 0.12, cz + 0.06]); // le col
    pushBox(wood, [-0.07, y + 0.12, cz - 0.07], [0.07, y + 0.2, cz + 0.07]); // le bouchon
    pushBox(brick, [-0.14, y - 0.2, cz - 0.14], [0.14, y - 0.16, cz + 0.14]); // l'étiquette, un liseré
  }
}

// Cadran solaire (version 2.6, le parvis de la bibliothèque) : un socle carré,
// une colonne de pierre, la table ronde et son style de fer.
export function buildSundial({ x, z }, builders) {
  const stone = createFrame(builders.stone, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  pushBox(stone, [-0.32, 0, -0.32], [0.32, 0.14, 0.32], { groundAo: 0.6 });
  pushRevolution(stone, [[0.14, 0.14], [0.25, 0.11], [0.75, 0.1], [0.82, 0.14]], { sides: 8 });
  pushRevolution(stone, [[0.82, 0.3], [0.88, 0.3]], { sides: 12, groundAo: 1 });
  pushDisc(stone, 0.88, 0.3, { sides: 12 });
  for (let k = 0; k < 12; k += 1) {
    const a = (k / 12) * Math.PI * 2;
    pushBox(iron, [Math.cos(a) * 0.24 - 0.012, 0.88, Math.sin(a) * 0.24 - 0.012], [Math.cos(a) * 0.24 + 0.012, 0.895, Math.sin(a) * 0.24 + 0.012]);
  }
  pushSkewBox(iron, [-0.012, 0.88, -0.18], [[0.024, 0, 0], [0, 0.2, 0.2], [0, 0, 0.16]]);
  return { x, z, radius: 0.36 };
}
