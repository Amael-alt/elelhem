// Les bâtiments et objets qui ne sont pas des maisons à colombages : tours à
// toit en pyramide (l'architecte, le colombier), chantier avec échafaudages,
// puits, forge à ciel ouvert, tonneaux, bancs, enseigne. Même méthode que
// props.js : des boîtes et des polygones empilés dans un constructeur par
// matière (plaster, wood, roof, stone, brick, door, window, iron, leaves).
//
// Chaque fonction renvoie ce que le village doit en savoir : les obstacles
// ronds { x, z, radius } à poser dans les collisions, et au besoin la
// position d'une flamme ou d'une cheminée.

import { createFrame, pushBox } from './builder.js';
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

// Tonneau : fût de bois et deux cercles de fer.
export function buildBarrel({ x, z, height = 0.75 }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  pushBox(wood, [-0.27, 0, -0.27], [0.27, height, 0.27]);
  for (const y of [0.15, height - 0.2]) pushBox(iron, [-0.285, y, -0.285], [0.285, y + 0.05, 0.285]);
  return { x, z, radius: 0.3 };
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
export function buildVegetables({ x0, z0, x1, z1 }, builders) {
  const leaves = createFrame(builders.leaves, [0, 0, 0]);
  for (let px = x0; px <= x1; px += 0.9) {
    for (let pz = z0; pz <= z1; pz += 0.9) {
      pushBox(leaves, [px - 0.2, 0, pz - 0.2], [px + 0.2, 0.3, pz + 0.2], { groundAo: 0.6 });
    }
  }
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
