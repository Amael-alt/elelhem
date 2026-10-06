// Le mobilier des intérieurs : lit, comptoir, étagère, cheminée, four de forge,
// coffre, tapis, fenêtre, râtelier. Même fabrique que le village
// (world/builder.js) : chaque meuble empile des boîtes dans le constructeur de
// sa matière. Il renvoie ses obstacles ronds (liste de { x, z, radius }) et,
// pour un feu, le point où poser la flamme.

import { createFrame, pushBox } from './builder.js';

const FULL_UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
const WALL_DEPTH = 0.02; // fenêtres et râteliers, juste devant le mur

// Lit le long de l'axe z, tête au nord : cadre, tête de lit, matelas, oreiller
// et couverture rayée.
export function buildBed({ x, z }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const linen = createFrame(builders.plaster, [x, 0, z]);
  const cloth = createFrame(builders.awning, [x, 0, z]);
  pushBox(wood, [-0.5, 0, -0.95], [0.5, 0.32, 0.95]);
  pushBox(wood, [-0.5, 0.32, -1.0], [0.5, 1.0, -0.86]);
  pushBox(wood, [-0.5, 0.32, 0.86], [0.5, 0.6, 0.95]);
  pushBox(linen, [-0.44, 0.32, -0.86], [0.44, 0.48, 0.86]);
  pushBox(linen, [-0.33, 0.48, -0.8], [0.33, 0.6, -0.48]);
  pushBox(cloth, [-0.47, 0.4, -0.36], [0.47, 0.55, 0.86]);
  return { posts: [{ x, z: z - 0.48, radius: 0.55 }, { x, z: z + 0.48, radius: 0.55 }] };
}

// Comptoir d'auberge : un long meuble de bois, plateau en saillie, de x0 à x1,
// centré sur z.
export function buildCounter({ x0, x1, z }, builders) {
  const wood = createFrame(builders.wood, [0, 0, z]);
  const plank = createFrame(builders.bark, [0, 0, z]);
  pushBox(plank, [x0, 0, -0.3], [x1, 0.95, 0.3]);
  pushBox(wood, [x0 - 0.06, 0.95, -0.38], [x1 + 0.06, 1.05, 0.38]);
  const posts = [];
  for (let px = x0 + 0.35; px < x1; px += 0.6) posts.push({ x: px, z, radius: 0.36 });
  return { posts };
}

// Étagère contre le mur nord (dont la face est en z) : deux montants, trois
// planches, des bouteilles et des pots.
export function buildShelf({ x0, x1, z }, builders) {
  const wood = createFrame(builders.wood, [0, 0, z]);
  const iron = createFrame(builders.iron, [0, 0, z]);
  const brick = createFrame(builders.brick, [0, 0, z]);
  for (const px of [x0, x1 - 0.08]) pushBox(wood, [px, 0, 0], [px + 0.08, 2.0, 0.34]);
  [0.6, 1.2, 1.8].forEach((y, row) => {
    pushBox(wood, [x0, y, 0], [x1, y + 0.06, 0.34]);
    for (let px = x0 + 0.2 + row * 0.07; px < x1 - 0.2; px += 0.32) {
      const frame = (Math.round(px * 10) + row) % 3 === 0 ? brick : iron;
      pushBox(frame, [px - 0.06, y + 0.06, 0.1], [px + 0.06, y + 0.3, 0.22]);
    }
  });
  return { posts: [{ x: (x0 + x1) / 2, z: z + 0.2, radius: 0.25 }] };
}

// Cheminée contre le mur nord (face en z) : un massif de pierre ouvert, une
// hotte jusqu'au plafond, des bûches et la flamme.
export function buildFireplace({ x, z }, builders) {
  const stone = createFrame(builders.stonewall, [x, 0, z]);
  const bark = createFrame(builders.bark, [x, 0, z]);
  pushBox(stone, [-0.85, 0, 0], [-0.55, 1.15, 0.55]);
  pushBox(stone, [0.55, 0, 0], [0.85, 1.15, 0.55]);
  pushBox(stone, [-0.9, 1.15, 0], [0.9, 1.4, 0.62]);
  pushBox(stone, [-0.6, 1.4, 0], [0.6, 2.6, 0.42]);
  pushBox(stone, [-0.55, 0, 0], [0.55, 0.08, 0.5]);
  pushBox(bark, [-0.35, 0.08, 0.2], [0.35, 0.2, 0.32]);
  pushBox(bark, [-0.12, 0.08, 0.08], [0.0, 0.2, 0.45]);
  return { posts: [{ x, z: z + 0.35, radius: 0.75 }], flame: { x, y: 0.38, z: z + 0.27 } };
}

// Four de forge contre le mur nord : un massif de brique, une gueule où brûle
// le feu, une hotte de pierre et un soufflet de cuir.
export function buildFurnace({ x, z }, builders) {
  const brick = createFrame(builders.brick, [x, 0, z]);
  const stone = createFrame(builders.stonewall, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  const wood = createFrame(builders.wood, [x, 0, z]);
  pushBox(brick, [-1.0, 0, 0], [1.0, 0.75, 1.15]);
  pushBox(brick, [-1.0, 0.75, 0], [-0.55, 1.35, 1.15]);
  pushBox(brick, [0.55, 0.75, 0], [1.0, 1.35, 1.15]);
  pushBox(brick, [-1.0, 0.75, 0], [1.0, 1.35, 0.35]);
  pushBox(iron, [-0.55, 0.75, 0.35], [0.55, 0.79, 1.1]); // la grille
  pushBox(stone, [-1.1, 1.35, 0], [1.1, 1.6, 1.25]);
  pushBox(stone, [-0.75, 1.6, 0], [0.75, 2.6, 0.8]);
  pushBox(wood, [1.05, 0.55, 0.35], [1.45, 0.75, 0.95]); // le soufflet
  pushBox(wood, [1.45, 0.62, 0.6], [1.75, 0.68, 0.7]);
  return {
    posts: [{ x: x - 0.5, z: z + 0.6, radius: 0.65 }, { x: x + 0.5, z: z + 0.6, radius: 0.65 }, { x: x + 1.3, z: z + 0.65, radius: 0.35 }],
    flame: { x, y: 0.98, z: z + 0.75 },
  };
}

// Coffre de bois cerclé de fer, couvercle bombé.
export function buildChest({ x, z }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  pushBox(wood, [-0.38, 0, -0.24], [0.38, 0.38, 0.24]);
  pushBox(wood, [-0.38, 0.38, -0.2], [0.38, 0.48, 0.2]);
  for (const bx of [-0.25, 0.25]) pushBox(iron, [bx - 0.03, 0, -0.25], [bx + 0.03, 0.49, 0.25]);
  pushBox(iron, [-0.06, 0.2, 0.24], [0.06, 0.32, 0.27]); // la serrure
  return { posts: [{ x, z, radius: 0.4 }] };
}

// Tapis posé au sol, rayé, sans épaisseur qui gêne : aucun obstacle.
export function buildRug({ x0, z0, x1, z1 }, builders) {
  const cloth = createFrame(builders.awning, [0, 0, 0]);
  pushBox(cloth, [x0, 0, z0], [x1, 0.015, z1], { groundAo: 1 });
  return { posts: [] };
}

// Fenêtre sur la face intérieure du mur nord (en z) : la lumière du dehors.
export function buildWindow({ x, z, y = 1.0, width = 0.8, height = 0.8 }, builders) {
  const glass = createFrame(builders.window, [x, 0, z + WALL_DEPTH]);
  const wood = createFrame(builders.wood, [x, 0, z]);
  const half = width / 2;
  glass.polygon([[-half, y, 0], [half, y, 0], [half, y + height, 0], [-half, y + height, 0]], FULL_UV);
  pushBox(wood, [-half - 0.08, y - 0.1, 0], [half + 0.08, y - 0.02, 0.14]); // l'appui
  return { posts: [] };
}

// Râtelier de forge contre le mur nord : une barre, des outils pendus.
export function buildToolRack({ x0, x1, z }, builders) {
  const wood = createFrame(builders.wood, [0, 0, z]);
  const iron = createFrame(builders.iron, [0, 0, z + WALL_DEPTH]);
  pushBox(wood, [x0, 1.7, 0], [x1, 1.78, 0.1]);
  for (let px = x0 + 0.2; px < x1 - 0.1; px += 0.3) {
    const long = Math.round(px * 10) % 2 === 0;
    pushBox(iron, [px - 0.025, long ? 0.95 : 1.15, 0.03], [px + 0.025, 1.7, 0.08]);
    pushBox(iron, [px - 0.09, long ? 0.95 : 1.15, 0.03], [px + 0.09, long ? 1.08 : 1.25, 0.08]);
  }
  return { posts: [] };
}

// Bougie posée sur un meuble (y : hauteur du plateau) : un bougeoir de fer, une
// petite flamme et sa lumière. Aucun obstacle, le meuble en a déjà un.
export function buildCandle({ x, z, y = 1.05 }, builders) {
  const iron = createFrame(builders.iron, [x, y, z]);
  const linen = createFrame(builders.plaster, [x, y, z]);
  pushBox(iron, [-0.08, 0, -0.08], [0.08, 0.03, 0.08]);
  pushBox(linen, [-0.03, 0.03, -0.03], [0.03, 0.2, 0.03]);
  return { posts: [], flame: { x, y: y + 0.24, z, small: true } };
}
