// Le mobilier des intérieurs : lit, comptoir, étagère, cheminée, four de forge,
// coffre, tapis, fenêtre, râtelier, puis (version 1.2) les boiseries des murs,
// appliques, rideaux, bibliothèque, pupitre, armoire, tabouret, lustre,
// tonnelet, chaudron, herbes, panier, tapisserie, établi, meule, baquet, fers
// à cheval, charbon, puis (version 1.3) le lambris, le soubassement de pierre,
// les tableaux, la vaisselle. Même fabrique que le village (world/builder.js) :
// chaque meuble empile des boîtes dans le constructeur de sa matière. Il
// renvoie ses obstacles ronds (liste de { x, z, radius }) et, pour un feu, le
// point où poser la flamme (flame, ou flames pour plusieurs ; small : une
// bougie ; noLight : la flamme se voit mais n'éclaire pas, pour ménager le
// téléphone).
//
// Les meubles « contre le mur nord » prennent la face du mur en z et avancent
// vers le sud (z croissant) ; une applique ou un tableau prend le mur (side)
// qui le porte.

import { createFrame, pushBox } from './builder.js';

const FULL_UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
const WALL_DEPTH = 0.02; // fenêtres et râteliers, juste devant le mur
const WALL_TOP = 2.6; // hauteur des murs pleins (world/map.js)
const LOW_WALL = 0.45; // le muret de façade
export const WALL_THICKNESS = 0.22; // la cloison visible, au bord intérieur des cases de mur
const TRIM_DEPTH = 0.07; // saillie des poutres et plinthes devant le mur
const PLINTH_HEIGHT = 0.16;
const GIRT_Y = 1.95; // lisse à mi-hauteur, au-dessus des fenêtres
const BEAM = 0.16; // section des poutres
const POST_WIDTH = 0.14;
const POST_SPACING = 1.5;
const BOOK_MATTERS = ['brick', 'iron', 'awning', 'plaster', 'wood', 'door'];
// Version 1.3 : le soubassement sous la façade coupée, le lambris du bas des murs.
export const BASE_DEPTH = 0.4; // profondeur du soubassement sous le plancher (le socle de world/terrain.js descend d'autant)
const DADO_Y = 0.95; // haut du lambris, sous les fenêtres
const PANEL_DEPTH = 0.035; // saillie du lambris, moindre que celle des poteaux

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

// Tapis posé au sol, à motif tissé : sa texture est faite à sa taille
// (gfx/textures.js) et posée une seule fois, le nord de l'image au nord. Le
// constructeur `rug` est fourni par la pièce (world/interior.js), un par tapis.
// Sans épaisseur qui gêne : aucun obstacle.
export function buildRug({ x0, z0, x1, z1 }, builders) {
  const cloth = createFrame(builders.rug, [0, 0, 0]);
  const y = 0.012;
  cloth.polygon([[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]], FULL_UV);
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

// --- Version 1.2 : la pièce habitée -----------------------------------------

// Les murs eux-mêmes : la grille garde des cases pleines d'une unité pour les
// collisions, mais ce qu'on voit est une cloison mince posée au bord intérieur
// de ces cases, le reste de la case est du vide, comme une maquette ouverte.
// Trois murs hauts (nord, ouest, est) et un muret de façade ouvert au seuil.
// Sous le muret, d'un angle à l'autre, le soubassement de pierre : la maison
// coupée en deux montre ses fondations (version 1.3). Les murs d'enduit
// prennent la chaux ocre des intérieurs (plasterIn), pas le blanc des façades.
export function buildWalls(map, { stone = false, doorX }, builders) {
  const wall = createFrame(builders[stone ? 'stonewall' : 'plasterIn'], [0, 0, 0]);
  const base = createFrame(builders.stone, [0, 0, 0]);
  const [x0, x1, z0, z1] = [1, map.width - 1, 1, map.depth - 1];
  const t = WALL_THICKNESS;
  pushBox(wall, [x0 - t, 0, z0 - t], [x1 + t, WALL_TOP, z0]);
  pushBox(wall, [x0 - t, 0, z0], [x0, WALL_TOP, z1 + t]);
  pushBox(wall, [x1, 0, z0], [x1 + t, WALL_TOP, z1 + t]);
  pushBox(wall, [x0 - t, 0, z1], [doorX, LOW_WALL, z1 + t]);
  pushBox(wall, [doorX + 1, 0, z1], [x1 + t, LOW_WALL, z1 + t]);
  // Le dessus du soubassement reste un peu sous le plancher du seuil, qui le
  // recouvre : pas deux faces au même niveau.
  pushBox(base, [x0 - t, -BASE_DEPTH, z1 - 0.02], [x1 + t, -0.01, z1 + t + 0.02]);
  return { posts: [] };
}

// Boiseries d'une pièce, d'après sa grille : plinthe au pied des trois murs,
// sablière de bois qui coiffe leur sommet, et sur l'enduit une lisse à
// mi-hauteur et des poteaux (sauf devant ce qui est déjà posé contre le mur
// nord : avoid, liste de [x0, x1]). Sur le muret de façade, une main courante
// de part et d'autre du seuil (doorX : colonne du seuil).
export function buildTrim(map, { stone = false, avoid = [], doorX }, builders) {
  const wood = createFrame(builders.wood, [0, 0, 0]);
  const [x0, x1, z0, z1] = [1, map.width - 1, 1, map.depth - 1];
  const d = TRIM_DEPTH;
  const t = WALL_THICKNESS;
  pushBox(wood, [x0, 0, z0], [x1, PLINTH_HEIGHT, z0 + d]);
  pushBox(wood, [x0, 0, z0], [x0 + d, PLINTH_HEIGHT, z1]);
  pushBox(wood, [x1 - d, 0, z0], [x1, PLINTH_HEIGHT, z1]);
  // La sablière : un chapeau de bois sur toute l'épaisseur de la cloison.
  const cap = WALL_TOP - 0.06;
  pushBox(wood, [x0 - t - 0.03, cap, z0 - t - 0.03], [x1 + t + 0.03, cap + 0.14, z0 + d]);
  pushBox(wood, [x0 - t - 0.03, cap, z0], [x0 + d, cap + 0.14, z1 + t + 0.03]);
  pushBox(wood, [x1 - d, cap, z0], [x1 + t + 0.03, cap + 0.14, z1 + t + 0.03]);
  if (!stone) {
    pushBox(wood, [x0 - 0.01, GIRT_Y, z0 - 0.01], [x1 + 0.01, GIRT_Y + BEAM, z0 + d]);
    pushBox(wood, [x0 - 0.01, GIRT_Y, z0], [x0 + d, GIRT_Y + BEAM, z1]);
    pushBox(wood, [x1 - d, GIRT_Y, z0], [x1 + 0.01, GIRT_Y + BEAM, z1]);
    // Le lambris (version 1.3) : des planches verticales de la plinthe à la
    // cimaise sur les trois murs d'enduit, et la cimaise de bois qui le coiffe.
    // Ce qui est posé contre le mur passe devant, les poteaux aussi.
    const panel = createFrame(builders.paneling, [0, 0, 0]);
    pushBox(panel, [x0, PLINTH_HEIGHT, z0], [x1, DADO_Y, z0 + PANEL_DEPTH]);
    pushBox(panel, [x0, PLINTH_HEIGHT, z0], [x0 + PANEL_DEPTH, DADO_Y, z1]);
    pushBox(panel, [x1 - PANEL_DEPTH, PLINTH_HEIGHT, z0], [x1, DADO_Y, z1]);
    pushBox(wood, [x0, DADO_Y, z0], [x1, DADO_Y + 0.06, z0 + d]);
    pushBox(wood, [x0, DADO_Y, z0], [x0 + d, DADO_Y + 0.06, z1]);
    pushBox(wood, [x1 - d, DADO_Y, z0], [x1, DADO_Y + 0.06, z1]);
  }
  if (!stone) {
    const free = (x) => avoid.every(([a, b]) => x + POST_WIDTH < a || x - POST_WIDTH > b);
    for (let x = x0 + POST_SPACING; x < x1 - 0.5; x += POST_SPACING) {
      if (free(x)) pushBox(wood, [x - POST_WIDTH / 2, PLINTH_HEIGHT, z0], [x + POST_WIDTH / 2, GIRT_Y, z0 + d]);
    }
    for (let z = z0 + POST_SPACING; z < z1 - 0.5; z += POST_SPACING) {
      pushBox(wood, [x0, PLINTH_HEIGHT, z - POST_WIDTH / 2], [x0 + d, GIRT_Y, z + POST_WIDTH / 2]);
      pushBox(wood, [x1 - d, PLINTH_HEIGHT, z - POST_WIDTH / 2], [x1, GIRT_Y, z + POST_WIDTH / 2]);
    }
  }
  // Main courante du muret, et ses poteaux aux coins et au seuil.
  const [railA, railB] = [z1 - 0.03, z1 + t + 0.03];
  if (doorX > x0) pushBox(wood, [x0 - t - 0.03, LOW_WALL, railA], [doorX - 0.02, LOW_WALL + 0.1, railB]);
  if (doorX + 1 < x1) pushBox(wood, [doorX + 1.02, LOW_WALL, railA], [x1 + t + 0.03, LOW_WALL + 0.1, railB]);
  for (const px of [x0 - t / 2, doorX - 0.08, doorX + 1.08, x1 + t / 2]) {
    pushBox(wood, [px - 0.06, LOW_WALL, z1 + t / 2 - 0.08], [px + 0.06, LOW_WALL + 0.32, z1 + t / 2 + 0.08]);
  }
  return { posts: [] };
}

// Applique murale : une patte de fer scellée dans le mur (side : north, west
// ou east), une coupelle, une bougie et sa flamme. light : false pour une
// flamme qui n'éclaire pas.
export function buildSconce({ x, z, y = 1.5, side = 'north', light = true }, builders) {
  const iron = createFrame(builders.iron, [x, y, z]);
  const linen = createFrame(builders.plaster, [x, y, z]);
  const [ox, oz] = side === 'north' ? [0, 0.16] : side === 'west' ? [0.16, 0] : [-0.16, 0];
  pushBox(iron, [Math.min(0, ox) - 0.025, -0.025, Math.min(0, oz) - 0.025], [Math.max(0, ox) + 0.025, 0.025, Math.max(0, oz) + 0.025]);
  pushBox(iron, [ox - 0.08, 0.025, oz - 0.08], [ox + 0.08, 0.055, oz + 0.08]);
  pushBox(linen, [ox - 0.03, 0.055, oz - 0.03], [ox + 0.03, 0.22, oz + 0.03]);
  return { posts: [], flame: { x: x + ox, y: y + 0.26, z: z + oz, small: true, noLight: !light } };
}

// Rideaux de part et d'autre d'une fenêtre du mur nord : une tringle de fer,
// deux pans de toile.
export function buildCurtain({ x, z, y = 1.0, width = 0.8, height = 0.8 }, builders) {
  const cloth = createFrame(builders.awning, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  const half = width / 2;
  const top = y + height + 0.08;
  pushBox(iron, [-half - 0.3, top, 0.03], [half + 0.3, top + 0.04, 0.1]);
  for (const s of [-1, 1]) {
    const inner = s * (half + 0.02);
    const outer = s * (half + 0.26);
    pushBox(cloth, [Math.min(inner, outer), y - 0.15, 0.03], [Math.max(inner, outer), top, 0.11]);
  }
  return { posts: [] };
}

// Bibliothèque contre le mur nord : montants, planches, des rangées de livres
// aux dos de toutes les couleurs (une place vide de temps en temps), un dessus.
export function buildBookshelf({ x0, x1, z, height = 2.0 }, builders) {
  const wood = createFrame(builders.wood, [0, 0, z]);
  for (const px of [x0, x1 - 0.08]) pushBox(wood, [px, 0, 0], [px + 0.08, height, 0.36]);
  pushBox(wood, [x0, height - 0.06, 0], [x1, height, 0.36]);
  [0.12, 0.62, 1.12, 1.62].filter((y) => y < height - 0.3).forEach((y, row) => {
    pushBox(wood, [x0, y, 0], [x1, y + 0.06, 0.36]);
    let px = x0 + 0.12;
    let n = row * 3;
    while (px < x1 - 0.2) {
      const w = 0.08 + ((n * 7) % 3) * 0.02;
      const h = 0.28 + ((n * 5) % 4) * 0.04;
      const book = createFrame(builders[BOOK_MATTERS[n % BOOK_MATTERS.length]], [0, 0, z]);
      pushBox(book, [px, y + 0.06, 0.06], [px + w, y + 0.06 + h, 0.3]);
      px += w + 0.015;
      n += 1;
      if (n % 9 === 0) px += 0.12;
    }
  });
  const posts = [];
  for (let px = x0 + 0.3; px < x1; px += 0.5) posts.push({ x: px, z: z + 0.2, radius: 0.32 });
  return { posts };
}

// Tabouret : assise carrée sur trois pieds.
export function buildStool({ x, z }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  pushBox(wood, [-0.2, 0.42, -0.2], [0.2, 0.48, 0.2]);
  for (const [sx, sz] of [[-0.13, -0.13], [0.13, -0.13], [0, 0.14]]) pushBox(wood, [sx - 0.03, 0, sz - 0.03], [sx + 0.03, 0.42, sz + 0.03]);
  return { posts: [{ x, z, radius: 0.24 }] };
}

// Lustre : une chaîne qui monte au-dessus des murs, un anneau de fer, quatre
// bougies dont les flammes se voient ; une seule lumière, au centre.
export function buildChandelier({ x, z, y = 2.05 }, builders) {
  const iron = createFrame(builders.iron, [x, y, z]);
  const linen = createFrame(builders.plaster, [x, y, z]);
  const r = 0.42;
  pushBox(iron, [-0.02, 0, -0.02], [0.02, WALL_TOP + 0.4 - y, 0.02]);
  pushBox(iron, [-r, 0, -r], [r, 0.04, -r + 0.06]);
  pushBox(iron, [-r, 0, r - 0.06], [r, 0.04, r]);
  pushBox(iron, [-r, 0, -r], [-r + 0.06, 0.04, r]);
  pushBox(iron, [r - 0.06, 0, -r], [r, 0.04, r]);
  const flames = [];
  for (const [cx, cz] of [[-r + 0.03, -r + 0.03], [r - 0.03, -r + 0.03], [-r + 0.03, r - 0.03], [r - 0.03, r - 0.03]]) {
    pushBox(linen, [cx - 0.03, 0.04, cz - 0.03], [cx + 0.03, 0.2, cz + 0.03]);
    flames.push({ x: x + cx, y: y + 0.24, z: z + cz, small: true, noLight: true });
  }
  return { posts: [], flames, lights: [{ x, y: y + 0.1, z, small: true }] };
}

// Tonnelet couché sur un chevalet, cerclé de fer, avec son robinet vers le sud.
export function buildKeg({ x, z, y = 0.25 }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const bark = createFrame(builders.bark, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  for (const sx of [-0.28, 0.28]) pushBox(wood, [sx - 0.05, 0, -0.22], [sx + 0.05, y + 0.1, 0.22]);
  pushBox(bark, [-0.4, y, -0.25], [0.4, y + 0.5, 0.25]);
  for (const bx of [-0.3, 0.26]) pushBox(iron, [bx, y - 0.015, -0.265], [bx + 0.04, y + 0.515, 0.265]);
  pushBox(iron, [-0.04, y + 0.12, 0.25], [0.04, y + 0.2, 0.36]);
  return { posts: [{ x, z, radius: 0.42 }] };
}

// Chaudron pendu à sa crémaillère dans une cheminée (x, z : ceux de la cheminée).
export function buildCauldron({ x, z }, builders) {
  const iron = createFrame(builders.iron, [x, 0, z]);
  pushBox(iron, [-0.6, 0.98, 0.22], [0.6, 1.03, 0.28]);
  pushBox(iron, [-0.02, 0.72, 0.23], [0.02, 0.98, 0.27]);
  pushBox(iron, [-0.22, 0.45, 0.06], [0.22, 0.72, 0.46]);
  pushBox(iron, [-0.25, 0.68, 0.03], [0.25, 0.74, 0.49]);
  return { posts: [] };
}

// Bottes d'herbes séchées pendues à une ficelle, contre le mur nord.
export function buildHerbs({ x0, x1, z, y = 1.8 }, builders) {
  const leaves = createFrame(builders.leaves, [0, 0, z]);
  const iron = createFrame(builders.iron, [0, 0, z]);
  pushBox(iron, [x0, y, 0.04], [x1, y + 0.025, 0.08]);
  for (let px = x0 + 0.12; px < x1 - 0.1; px += 0.26) {
    pushBox(leaves, [px - 0.07, y - 0.38, 0.03], [px + 0.07, y, 0.16]);
    pushBox(leaves, [px - 0.1, y - 0.42, 0.02], [px + 0.1, y - 0.2, 0.19]);
  }
  return { posts: [] };
}

// Panier d'osier, du linge qui dépasse, une anse.
export function buildBasket({ x, z }, builders) {
  const bark = createFrame(builders.bark, [x, 0, z]);
  const linen = createFrame(builders.plaster, [x, 0, z]);
  pushBox(bark, [-0.22, 0, -0.18], [0.22, 0.26, 0.18]);
  pushBox(linen, [-0.17, 0.26, -0.13], [0.17, 0.33, 0.13]);
  pushBox(bark, [-0.03, 0.26, -0.03], [0.03, 0.5, 0.03]);
  return { posts: [{ x, z, radius: 0.28 }] };
}

// Tapisserie encadrée de bois, contre le mur nord.
export function buildTapestry({ x, z, y = 1.15, width = 0.9, height = 0.7 }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const cloth = createFrame(builders.awning, [x, 0, z]);
  const half = width / 2;
  pushBox(cloth, [-half, y, 0.02], [half, y + height, 0.05]);
  pushBox(wood, [-half - 0.05, y - 0.05, 0.02], [half + 0.05, y, 0.07]);
  pushBox(wood, [-half - 0.05, y + height, 0.02], [half + 0.05, y + height + 0.05, 0.07]);
  pushBox(wood, [-half - 0.05, y, 0.02], [-half, y + height, 0.07]);
  pushBox(wood, [half, y, 0.02], [half + 0.05, y + height, 0.07]);
  return { posts: [] };
}

// Pupitre d'étude : une table étroite, des parchemins roulés, un livre ouvert,
// un encrier. C'est là qu'on apprend la magie.
export function buildDesk({ x, z }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const linen = createFrame(builders.plaster, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  pushBox(wood, [-0.6, 0.72, -0.35], [0.6, 0.78, 0.35]);
  for (const [lx, lz] of [[-0.52, -0.27], [0.52, -0.27], [-0.52, 0.27], [0.52, 0.27]]) pushBox(wood, [lx - 0.04, 0, lz - 0.04], [lx + 0.04, 0.72, lz + 0.04]);
  pushBox(wood, [-0.6, 0.3, -0.33], [0.6, 0.36, -0.27]);
  for (const [px, pz, fat] of [[-0.38, -0.14, 0], [-0.3, 0.08, 1], [-0.42, 0.22, 0]]) {
    pushBox(linen, [px - 0.16, 0.78, pz - 0.04 - fat * 0.02], [px + 0.16, 0.86 + fat * 0.02, pz + 0.04 + fat * 0.02]);
  }
  pushBox(linen, [0.02, 0.78, -0.18], [0.44, 0.83, 0.14]);
  pushBox(wood, [0.2, 0.78, -0.2], [0.26, 0.85, 0.16]);
  pushBox(iron, [0.42, 0.78, 0.22], [0.5, 0.88, 0.3]);
  return { posts: [{ x: x - 0.3, z, radius: 0.42 }, { x: x + 0.3, z, radius: 0.42 }] };
}

// Armoire contre le mur nord : un haut meuble de bois, deux portes en panneaux,
// poignées de fer, corniche.
export function buildWardrobe({ x, z, width = 1.1, height = 2.1 }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const door = createFrame(builders.door, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  const half = width / 2;
  const depth = 0.55;
  pushBox(wood, [-half, 0, 0], [half, height, depth]);
  for (const s of [-1, 1]) {
    const [a, b] = s < 0 ? [-half + 0.08, -0.03] : [0.03, half - 0.08];
    door.polygon([[a, 0.2, depth + 0.01], [b, 0.2, depth + 0.01], [b, height - 0.15, depth + 0.01], [a, height - 0.15, depth + 0.01]], FULL_UV);
    pushBox(iron, [s * 0.1 - 0.02, 1.0, depth], [s * 0.1 + 0.02, 1.12, depth + 0.04]);
  }
  pushBox(wood, [-half - 0.04, height, -0.02], [half + 0.04, height + 0.08, depth + 0.04]);
  return { posts: [{ x, z: z + depth / 2, radius: half + 0.05 }] };
}

// Établi de forge contre le mur nord : plateau épais sur quatre pieds, un
// étau, des outils posés.
export function buildWorkbench({ x0, x1, z }, builders) {
  const wood = createFrame(builders.wood, [0, 0, z]);
  const iron = createFrame(builders.iron, [0, 0, z]);
  pushBox(wood, [x0, 0.8, 0.05], [x1, 0.92, 0.75]);
  for (const px of [x0 + 0.08, x1 - 0.16]) {
    pushBox(wood, [px, 0, 0.1], [px + 0.08, 0.8, 0.18]);
    pushBox(wood, [px, 0, 0.62], [px + 0.08, 0.8, 0.7]);
  }
  pushBox(iron, [x1 - 0.5, 0.92, 0.5], [x1 - 0.3, 1.1, 0.72]);
  pushBox(iron, [x1 - 0.55, 0.98, 0.58], [x1 - 0.25, 1.02, 0.64]);
  for (const [px, pz, w] of [[x0 + 0.3, 0.3, 0.3], [x0 + 0.75, 0.5, 0.22], [x0 + 1.1, 0.25, 0.4]]) pushBox(iron, [px, 0.92, pz], [px + w, 0.96, pz + 0.07]);
  const posts = [];
  for (let px = x0 + 0.3; px < x1; px += 0.5) posts.push({ x: px, z: z + 0.4, radius: 0.4 });
  return { posts };
}

// Meule : une roue de pierre (deux boîtes croisées) sur un bâti de bois, son
// axe et sa manivelle.
export function buildGrindstone({ x, z }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const stone = createFrame(builders.stone, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  for (const sz of [-0.2, 0.2]) pushBox(wood, [-0.3, 0, sz - 0.04], [0.3, 0.5, sz + 0.04]);
  pushBox(wood, [-0.34, 0.5, -0.26], [0.34, 0.56, 0.26]);
  pushBox(stone, [-0.3, 0.45, -0.07], [0.3, 1.05, 0.07]);
  pushBox(stone, [-0.21, 0.36, -0.07], [0.21, 1.14, 0.07]);
  pushBox(iron, [-0.04, 0.72, -0.3], [0.04, 0.78, 0.3]);
  pushBox(iron, [0.3, 0.55, 0.26], [0.34, 0.78, 0.3]);
  return { posts: [{ x, z, radius: 0.42 }] };
}

// Baquet de trempe : une cuve de bois cerclée, l'eau sombre au ras du bord.
export function buildTrough({ x, z }, builders) {
  const bark = createFrame(builders.bark, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  pushBox(bark, [-0.4, 0, -0.3], [0.4, 0.55, 0.3]);
  for (const y of [0.1, 0.42]) pushBox(iron, [-0.415, y, -0.315], [0.415, y + 0.04, 0.315]);
  pushBox(iron, [-0.34, 0.47, -0.24], [0.34, 0.5, 0.24]);
  return { posts: [{ x, z, radius: 0.45 }] };
}

// Fers à cheval pendus au mur nord, de x0 à x1.
export function buildHorseshoes({ x0, x1, z, y = 1.35 }, builders) {
  const iron = createFrame(builders.iron, [0, 0, z]);
  for (let px = x0; px <= x1 - 0.2; px += 0.32) {
    pushBox(iron, [px, y + 0.14, 0.02], [px + 0.2, y + 0.18, 0.06]);
    pushBox(iron, [px, y, 0.02], [px + 0.04, y + 0.14, 0.06]);
    pushBox(iron, [px + 0.16, y, 0.02], [px + 0.2, y + 0.14, 0.06]);
  }
  return { posts: [] };
}

// Tas de charbon : quelques blocs sombres.
export function buildCoal({ x, z }, builders) {
  const iron = createFrame(builders.iron, [x, 0, z]);
  for (const [cx, cz, s, h] of [[0, 0, 0.3, 0.3], [-0.25, 0.1, 0.22, 0.2], [0.22, -0.12, 0.2, 0.22], [0.05, 0.25, 0.18, 0.15]]) {
    pushBox(iron, [cx - s / 2, 0, cz - s / 2], [cx + s / 2, h, cz + s / 2]);
  }
  return { posts: [{ x, z, radius: 0.4 }] };
}

// --- Version 1.3 : les détails qui font la pièce ------------------------------

// Petit tableau accroché au mur (side : north, west ou east), à hauteur y de
// son centre : un cadre de bois en saillie et une toile peinte par le code
// (gfx/textures.js). Les murs est et ouest ont leur face intérieure en x.
export function buildPainting({ x, z, y = 1.4, width = 0.84, height = 0.6, side = 'north' }, builders) {
  const wood = createFrame(builders.wood, [x, y, z]);
  const canvas = createFrame(builders.painting, [x, y, z]);
  const f = 0.04; // largeur du cadre
  const hw = width / 2;
  const hh = height / 2;
  if (side === 'north') {
    canvas.polygon([[-hw, -hh, 0.03], [hw, -hh, 0.03], [hw, hh, 0.03], [-hw, hh, 0.03]], FULL_UV);
    pushBox(wood, [-hw - f, hh, 0.01], [hw + f, hh + f, 0.05]);
    pushBox(wood, [-hw - f, -hh - f, 0.01], [hw + f, -hh, 0.05]);
    pushBox(wood, [-hw - f, -hh, 0.01], [-hw, hh, 0.05]);
    pushBox(wood, [hw, -hh, 0.01], [hw + f, hh, 0.05]);
    return { posts: [] };
  }
  // Mur ouest : la toile regarde l'est (+x), son bord gauche au sud ; mur est :
  // elle regarde l'ouest, son bord gauche au nord.
  const [near, far] = side === 'west' ? [0.01, 0.05] : [-0.05, -0.01];
  const face = side === 'west' ? 0.03 : -0.03;
  canvas.polygon(side === 'west'
    ? [[face, -hh, hw], [face, -hh, -hw], [face, hh, -hw], [face, hh, hw]]
    : [[face, -hh, -hw], [face, -hh, hw], [face, hh, hw], [face, hh, -hw]], FULL_UV);
  pushBox(wood, [near, hh, -hw - f], [far, hh + f, hw + f]);
  pushBox(wood, [near, -hh - f, -hw - f], [far, -hh, hw + f]);
  pushBox(wood, [near, -hh, -hw - f], [far, hh, -hw]);
  pushBox(wood, [near, -hh, hw], [far, hh, hw + f]);
  return { posts: [] };
}

// Vaisselle sur une table (x, z : ceux de la table ; y : son plateau) : une
// assiette de faïence et une miche dessus, à côté des chopes de la table.
// Aucun obstacle, la table en a un.
export function buildTableware({ x, z, y = 0.78 }, builders) {
  const linen = createFrame(builders.plaster, [x, y, z]);
  const bread = createFrame(builders.thatch, [x, y, z]);
  pushBox(linen, [-0.2, 0, 0.12], [0.08, 0.025, 0.34]);
  pushBox(bread, [-0.14, 0.025, 0.16], [0.02, 0.1, 0.3]);
  return { posts: [] };
}
