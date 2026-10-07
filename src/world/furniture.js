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

import { createFrame, pushBar, pushBox, pushDisc, pushRevolution } from './builder.js';

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

// --- Version 2.5 : le salon et la salle de l'auberge ------------------------

// Un meuble tourné : ses boîtes sont données dans un repère local où +w est
// l'avant (le côté où l'on s'assoit, où l'on regarde) et +u la droite ; facing
// ('south', 'north', 'east', 'west') oriente cet avant dans la pièce. Les
// rotations sont d'un quart de tour : une boîte reste une boîte.
const FRONT = { south: [0, 1], north: [0, -1], east: [1, 0], west: [-1, 0] };
function orientedBox(builder, x, z, facing) {
  const [fx, fz] = FRONT[facing] ?? FRONT.south;
  const [rx, rz] = [fz, -fx]; // la droite de l'avant (vue de derrière le meuble)
  const frame = createFrame(builder, [x, 0, z]);
  const toWorld = (u, w) => [u * rx + w * fx, u * rz + w * fz];
  return ([u0, y0, w0], [u1, y1, w1], options) => {
    const [ax, az] = toWorld(u0, w0);
    const [bx, bz] = toWorld(u1, w1);
    pushBox(frame, [Math.min(ax, bx), y0, Math.min(az, bz)], [Math.max(ax, bx), y1, Math.max(az, bz)], options);
  };
}

// Chaise à dossier : assise, quatre pieds, deux montants et trois barreaux au
// dos (du côté opposé à facing, le côté où l'on regarde assis).
export function buildChair({ x, z, facing = 'south' }, builders) {
  const box = orientedBox(builders.wood, x, z, facing);
  box([-0.21, 0.42, -0.2], [0.21, 0.48, 0.2]);
  for (const [u, w] of [[-0.17, -0.16], [0.17, -0.16], [-0.17, 0.16], [0.17, 0.16]]) box([u - 0.03, 0, w - 0.03], [u + 0.03, 0.42, w + 0.03]);
  for (const u of [-0.18, 0.18]) box([u - 0.03, 0.48, -0.2], [u + 0.03, 1.0, -0.15]);
  box([-0.2, 0.92, -0.2], [0.2, 1.0, -0.15]);
  for (const u of [-0.07, 0.07]) box([u - 0.02, 0.5, -0.19], [u + 0.02, 0.92, -0.16]);
  return { posts: [{ x, z, radius: 0.24 }] };
}

// Fauteuil de velours vert : socle et pieds de bois, assise rembourrée, dossier
// haut et deux accoudoirs arrondis d'un bourrelet.
export function buildArmchair({ x, z, facing = 'south' }, builders) {
  const velvet = orientedBox(builders.velvet, x, z, facing);
  const wood = orientedBox(builders.wood, x, z, facing);
  for (const [u, w] of [[-0.3, -0.26], [0.3, -0.26], [-0.3, 0.26], [0.3, 0.26]]) wood([u - 0.04, 0, w - 0.04], [u + 0.04, 0.1, w + 0.04]);
  velvet([-0.38, 0.1, -0.33], [0.38, 0.36, 0.33]);
  velvet([-0.26, 0.36, -0.2], [0.26, 0.47, 0.32]); // le coussin
  velvet([-0.38, 0.36, -0.36], [0.38, 1.02, -0.18]); // le dossier
  velvet([-0.3, 1.02, -0.34], [0.3, 1.08, -0.2]);
  for (const s of [-1, 1]) {
    velvet([s * 0.26, 0.36, -0.2], [s * 0.39, 0.62, 0.33]);
    velvet([s * 0.25, 0.62, -0.2], [s * 0.4, 0.68, 0.35]);
  }
  return { posts: [{ x, z, radius: 0.42 }] };
}

// Canapé de velours, long de length : comme le fauteuil, avec deux coussins.
export function buildSofa({ x, z, facing = 'south', length = 1.8 }, builders) {
  const velvet = orientedBox(builders.velvet, x, z, facing);
  const wood = orientedBox(builders.wood, x, z, facing);
  const h = length / 2;
  for (const [u, w] of [[-h + 0.08, -0.26], [h - 0.08, -0.26], [-h + 0.08, 0.26], [h - 0.08, 0.26]]) wood([u - 0.04, 0, w - 0.04], [u + 0.04, 0.1, w + 0.04]);
  velvet([-h, 0.1, -0.33], [h, 0.36, 0.33]);
  for (const s of [-1, 1]) velvet([s < 0 ? -h + 0.14 : 0.02, 0.36, -0.2], [s < 0 ? -0.02 : h - 0.14, 0.47, 0.32]);
  velvet([-h, 0.36, -0.36], [h, 0.98, -0.18]);
  velvet([-h + 0.06, 0.98, -0.34], [h - 0.06, 1.04, -0.2]);
  for (const s of [-1, 1]) {
    const [a, b] = s < 0 ? [-h, -h + 0.14] : [h - 0.14, h];
    velvet([a, 0.36, -0.2], [b, 0.62, 0.33]);
    velvet([a - (s < 0 ? 0.01 : 0), 0.62, -0.2], [b + (s > 0 ? 0.01 : 0), 0.68, 0.35]);
  }
  const posts = [];
  for (let u = -h + 0.35; u <= h - 0.35 + 1e-6; u += 0.5) {
    const [fx, fz] = FRONT[facing] ?? FRONT.south;
    posts.push({ x: x + u * fz, z: z - u * fx, radius: 0.4 });
  }
  return { posts };
}

// Table ronde sur pied : un plateau octogonal, une colonne tournée, un pied
// en croix.
export function buildRoundTable({ x, z, radius = 0.52 }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  pushRevolution(wood, [[0.7, radius], [0.78, radius]], { sides: 12, groundAo: 1 });
  pushDisc(wood, 0.78, radius, { sides: 12 });
  pushRevolution(wood, [[0, 0.09], [0.12, 0.07], [0.35, 0.05], [0.55, 0.07], [0.7, 0.06]], { sides: 8 });
  pushBox(wood, [-0.32, 0, -0.05], [0.32, 0.06, 0.05]);
  pushBox(wood, [-0.05, 0, -0.32], [0.05, 0.06, 0.32]);
  return { posts: [{ x, z, radius: radius + 0.05 }] };
}

// Table basse du salon : plateau sur quatre pieds courts, un livre et une tasse.
export function buildLowTable({ x, z, width = 0.9, depth = 0.55 }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const book = createFrame(builders.awning, [x, 0, z]);
  const cup = createFrame(builders.plaster, [x, 0, z]);
  const hw = width / 2;
  const hd = depth / 2;
  pushBox(wood, [-hw, 0.36, -hd], [hw, 0.42, hd]);
  for (const [u, w] of [[-hw + 0.06, -hd + 0.06], [hw - 0.06, -hd + 0.06], [-hw + 0.06, hd - 0.06], [hw - 0.06, hd - 0.06]]) pushBox(wood, [u - 0.03, 0, w - 0.03], [u + 0.03, 0.36, w + 0.03]);
  pushBox(book, [-0.3, 0.42, -0.12], [-0.05, 0.47, 0.08]);
  pushRevolution(cup, [[0.42, 0.04], [0.5, 0.05]], { sides: 8, groundAo: 1 });
  return { posts: [{ x, z, radius: Math.max(hw, hd) }] };
}

// Horloge comtoise contre un mur : une haute caisse de bois, le cadran clair
// et ses aiguilles, la lentille du balancier derrière une fente, un fronton.
// facing : le côté du cadran (east : contre le mur ouest).
export function buildClock({ x, z, facing = 'south' }, builders) {
  const wood = orientedBox(builders.wood, x, z, facing);
  const face = orientedBox(builders.plaster, x, z, facing);
  const iron = orientedBox(builders.iron, x, z, facing);
  wood([-0.26, 0, -0.18], [0.26, 0.16, 0.18]);
  wood([-0.2, 0.16, -0.15], [0.2, 1.45, 0.15]);
  wood([-0.26, 1.45, -0.18], [0.26, 2.05, 0.18]);
  wood([-0.29, 2.05, -0.2], [0.29, 2.12, 0.2]);
  wood([-0.12, 2.12, -0.15], [0.12, 2.24, 0.15]);
  face([-0.18, 1.55, 0.18], [0.18, 1.91, 0.2]);
  iron([-0.012, 1.72, 0.2], [0.012, 1.86, 0.215]);
  iron([-0.012, 1.72, 0.2], [0.1, 1.745, 0.215]);
  iron([-0.07, 0.4, 0.15], [0.07, 1.3, 0.16]);
  iron([-0.012, 0.75, 0.16], [0.012, 1.3, 0.17]);
  face([-0.06, 0.6, 0.16], [0.06, 0.72, 0.175]);
  return { posts: [{ x, z, radius: 0.3 }] };
}

// Plante en pot : un pot de terre cuite évasé et un buisson de feuilles en
// deux étages.
export function buildPlant({ x, z, size = 1 }, builders) {
  const pot = createFrame(builders.brick, [x, 0, z]);
  const leaves = createFrame(builders.leaves, [x, 0, z]);
  const s = size;
  pushRevolution(pot, [[0, 0.13 * s], [0.32 * s, 0.18 * s], [0.36 * s, 0.2 * s]], { sides: 8 });
  pushRevolution(leaves, [[0.34 * s, 0.12 * s], [0.5 * s, 0.32 * s], [0.75 * s, 0.34 * s], [0.95 * s, 0.22 * s], [1.08 * s, 0]], { sides: 9, groundAo: 1 });
  pushRevolution(leaves, [[0.7 * s, 0.1 * s], [0.85 * s, 0.26 * s], [1.1 * s, 0.22 * s], [1.26 * s, 0]], { sides: 7, groundAo: 1, phase: 0.4 });
  return { posts: [{ x, z, radius: 0.24 * s }] };
}

// Escalier vers l'étage, de z1 (en bas, au sud) à z0 (en haut, au nord),
// entre x0 et x1, jusqu'à la hauteur top ; un palier au nord, une rampe à
// balustres du côté ouest (x0). Les cases dessous sont réservées (world/rooms.js) :
// on ne passe pas sous les marches.
export function buildStairs({ x0, x1, z0, z1, top = 2.3, landing = 0.6 }, builders) {
  const wood = createFrame(builders.wood, [0, 0, 0]);
  const tread = createFrame(builders.bark, [0, 0, 0]);
  const run = z1 - z0;
  const count = Math.max(4, Math.round(run / 0.3));
  const depth = run / count;
  const rise = top / (count + 1);
  for (let i = 0; i < count; i += 1) {
    const zb = z1 - i * depth;
    const y = (i + 1) * rise;
    pushBox(wood, [x0, 0, zb - depth], [x1, y - 0.05, zb], { groundAo: 0.6 });
    pushBox(tread, [x0 - 0.03, y - 0.05, zb - depth - 0.02], [x1, y, zb]);
  }
  // Le palier, à hauteur de la dernière marche, porté par une poutre.
  pushBox(wood, [x0, top - 0.12, z0 - landing], [x1, top - 0.05, z0]);
  pushBox(tread, [x0 - 0.03, top - 0.05, z0 - landing], [x1, top, z0]);
  pushBox(wood, [x0, 0, z0 - landing], [x0 + 0.1, top - 0.12, z0 - landing + 0.1], { groundAo: 0.6 });
  // La rampe : un poteau en bas, un en haut, une main courante entre eux, des balustres.
  const rail = 0.82;
  const xr = x0 + 0.06;
  pushBox(wood, [xr - 0.06, 0, z1 - 0.12], [xr + 0.06, rise + rail + 0.1, z1], { groundAo: 0.6 });
  pushBox(wood, [xr - 0.08, rise + rail + 0.1, z1 - 0.14], [xr + 0.08, rise + rail + 0.17, z1 + 0.02]);
  pushBar(wood, [xr, rise + rail, z1 - 0.06], [xr, top + rail - rise * 0.5, z0], 0.07);
  pushBar(wood, [xr, top + rail - rise * 0.5, z0], [xr, top + rail - rise * 0.5, z0 - landing], 0.07);
  for (let i = 0; i < count; i += 1) {
    const zc = z1 - (i + 0.5) * depth;
    const y = (i + 1) * rise;
    const yTop = rise + rail + ((z1 - zc) / run) * (top - rise * 1.5 - rise);
    pushBox(wood, [xr - 0.02, y, zc - 0.02], [xr + 0.02, yTop, zc + 0.02]);
  }
  for (let k = 1; k <= 2; k += 1) {
    const zc = z0 - (landing * k) / 3;
    pushBox(wood, [xr - 0.02, top, zc - 0.02], [xr + 0.02, top + rail - rise * 0.5, zc + 0.02]);
  }
  return { posts: [] };
}

// --- Version 2.6 : la forge ------------------------------------------------------

// Une épée debout, pointe en bas ou en haut, dans le repère d'un meuble : lame
// d'acier, garde de fer, poignée de bois, pommeau. (u, w) : sa place ; y0 : le
// bas de la lame ; up : la pointe en haut.
function sword(iron, wood, u, w, y0, { length = 0.62, up = false } = {}) {
  const blade = up ? [y0, y0 + length] : [y0 + 0.24, y0 + 0.24 + length];
  const guard = up ? y0 - 0.03 : y0 + 0.2;
  const grip = up ? [y0 - 0.22, y0 - 0.03] : [y0, y0 + 0.2];
  iron([u - 0.03, blade[0], w - 0.012], [u + 0.03, blade[1], w + 0.012]);
  iron([u - 0.1, guard, w - 0.025], [u + 0.1, guard + 0.04, w + 0.025]);
  wood([u - 0.02, grip[0], w - 0.02], [u + 0.02, grip[1], w + 0.02]);
}

// Râtelier d'armes : deux montants, une traverse basse percée et une traverse
// haute, quatre épées debout et une lance. facing : le côté où l'on se tient
// pour prendre une arme (south : contre un mur au nord de lui).
export function buildWeaponRack({ x, z, facing = 'south', width = 1.1 }, builders) {
  const wood = orientedBox(builders.wood, x, z, facing);
  const iron = orientedBox(builders.iron, x, z, facing);
  const h = width / 2;
  for (const s of [-1, 1]) wood([s * h - 0.04, 0, -0.14], [s * h + 0.04, 1.3, -0.06]);
  wood([-h, 0.12, -0.18], [h, 0.2, 0.02]);
  wood([-h, 1.0, -0.14], [h, 1.07, -0.06]);
  const count = 4;
  for (let k = 0; k < count; k += 1) {
    const u = -h + 0.2 + (k * (width - 0.5)) / (count - 1);
    sword(iron, wood, u, -0.08, 0.2, { up: true, length: 0.58 });
  }
  wood([h - 0.12, 0.2, -0.11], [h - 0.09, 1.55, -0.08]);
  iron([h - 0.14, 1.55, -0.12], [h - 0.07, 1.72, -0.07]);
  return { posts: [{ x, z, radius: Math.max(0.3, h * 0.8) }] };
}

// Mannequin d'armure : un socle, un poteau, une cuirasse aux épaulières
// arrondies, un casque à cimier.
export function buildArmorStand({ x, z, facing = 'south' }, builders) {
  const wood = orientedBox(builders.wood, x, z, facing);
  const iron = orientedBox(builders.iron, x, z, facing);
  const helm = createFrame(builders.iron, [x, 0, z]);
  wood([-0.28, 0, -0.28], [0.28, 0.08, 0.28]);
  wood([-0.04, 0.08, -0.04], [0.04, 0.95, 0.04]);
  iron([-0.24, 0.85, -0.14], [0.24, 1.35, 0.14]); // le plastron
  iron([-0.2, 0.75, -0.13], [0.2, 0.85, 0.13]); // la taille
  iron([-0.3, 1.24, -0.15], [-0.18, 1.38, 0.15]);
  iron([0.18, 1.24, -0.15], [0.3, 1.38, 0.15]);
  iron([-0.17, 0.95, 0.14], [0.17, 1.0, 0.16]); // une arête au plastron
  wood([-0.05, 1.35, -0.05], [0.05, 1.45, 0.05]);
  pushRevolution(helm, [[1.45, 0.12], [1.55, 0.14], [1.66, 0.12], [1.72, 0.05]], { sides: 8, groundAo: 1 });
  iron([-0.015, 1.68, -0.1], [0.015, 1.8, 0.1]); // le cimier
  return { posts: [{ x, z, radius: 0.3 }] };
}

// Bouclier rond pendu à un mur : un disque de bois à huit pans, un cercle et
// un umbo de fer. side : le mur qui le porte, comme pour les tableaux
// (north : la face regarde le sud ; south : posé sur une façade, il regarde
// le sud aussi, en avant d'elle).
export function buildShield({ x, z, y = 1.5, side = 'north', radius = 0.3 }, builders) {
  const [nx, nz] = { north: [0, 1], south: [0, 1], west: [1, 0], east: [-1, 0] }[side];
  const wood = createFrame(builders.wood, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  const along = (a, r, out) => {
    const u = Math.cos(a) * r;
    const v = Math.sin(a) * r;
    // u le long du mur, v vers le haut, out en avant du mur.
    return nz ? [u, y + v, out * nz] : [out * nx, y + v, u];
  };
  const fan = (frame, r, out) => {
    for (let k = 0; k < 8; k += 1) {
      const a0 = (k / 8) * Math.PI * 2;
      const a1 = ((k + 1) / 8) * Math.PI * 2;
      let tri = [along(0, 0, out), along(a0, r, out), along(a1, r, out)];
      // La face doit regarder vers l'avant (nx, nz).
      const [p0, p1, p2] = tri;
      const cx = (p1[1] - p0[1]) * (p2[2] - p0[2]) - (p1[2] - p0[2]) * (p2[1] - p0[1]);
      const cz = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]);
      if (cx * nx + cz * nz < 0) tri = [p0, p2, p1];
      frame.polygon(tri, tri.map(() => [0.5, 0.5]));
    }
  };
  fan(iron, radius + 0.03, 0.035);
  fan(wood, radius, 0.05);
  fan(iron, radius * 0.28, 0.075);
  return { posts: [] };
}

// Tonneau d'épées : un tonneau rond, quatre épées plantées, poignée en haut,
// un peu penchées.
export function buildSwordBarrel({ x, z }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  const h = 0.62;
  pushRevolution(wood, [[0, 0.22], [h * 0.5, 0.26], [h, 0.22]]);
  pushDisc(wood, h - 0.06, 0.2);
  for (const [y, r] of [[0.08, 0.235], [h - 0.12, 0.235]]) pushRevolution(iron, [[y, r], [y + 0.05, r]], { groundAo: 1 });
  for (const [dx, dz, lean] of [[-0.08, -0.05, -0.12], [0.07, -0.07, 0.1], [0.0, 0.08, 0.05], [0.1, 0.06, 0.16]]) {
    const top = [dx + lean, h + 0.42, dz + lean * 0.4];
    pushBar(iron, [dx, h - 0.06, dz], [dx + lean * 0.45, h + 0.18, dz + lean * 0.2], 0.04);
    pushBar(iron, [dx + lean * 0.45 - 0.08, h + 0.19, dz + lean * 0.2], [dx + lean * 0.45 + 0.08, h + 0.21, dz + lean * 0.2], 0.03);
    pushBar(wood, [dx + lean * 0.45, h + 0.2, dz + lean * 0.2], top, 0.035);
  }
  return { posts: [{ x, z, radius: 0.28 }] };
}

// Barres de fer empilées sur deux traverses de bois, le long de l'axe x.
export function buildIronBars({ x, z, length = 1.0 }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  const h = length / 2;
  for (const s of [-1, 1]) pushBox(wood, [s * (h - 0.15) - 0.05, 0, -0.22], [s * (h - 0.15) + 0.05, 0.08, 0.22], { groundAo: 0.6 });
  const rows = [[0.08, [-0.15, -0.05, 0.05, 0.15]], [0.13, [-0.1, 0.0, 0.1]], [0.18, [-0.05, 0.05]]];
  for (const [y, zs] of rows) for (const bz of zs) pushBox(iron, [-h, y, bz - 0.04], [h, y + 0.05, bz + 0.04]);
  return { posts: [{ x: x - h / 2, z, radius: 0.26 }, { x: x + h / 2, z, radius: 0.26 }] };
}

// Sacs de toile (du charbon de bois) : des sacs ventrus, l'un couché, noués.
export function buildSacks({ x, z, count = 2 }, builders) {
  const cloth = createFrame(builders.thatch, [x, 0, z]);
  const spots = [[0, 0, 1], [0.38, 0.12, 0.9], [-0.3, 0.2, 0.85]].slice(0, count);
  const posts = [];
  for (const [dx, dz, s] of spots) {
    const sack = createFrame(builders.thatch, [x + dx, 0, z + dz]);
    pushRevolution(sack, [[0, 0.16 * s], [0.12 * s, 0.21 * s], [0.38 * s, 0.19 * s], [0.5 * s, 0.1 * s], [0.56 * s, 0.05 * s]], { sides: 9 });
    pushRevolution(sack, [[0.56 * s, 0.05 * s], [0.62 * s, 0.08 * s], [0.66 * s, 0.03 * s]], { sides: 6, groundAo: 1 });
    posts.push({ x: x + dx, z: z + dz, radius: 0.22 * s });
  }
  void cloth;
  return { posts };
}

// --- Version 2.6 : la bibliothèque ---------------------------------------------

// Une rangée de livres de x0 à x1 (repère d'un meuble tourné), posée en y, de
// hauteurs et d'épaisseurs variées, quelques-uns penchés en fin de rangée.
function bookRow(builders, x, z, facing, u0, u1, y, w0, w1, seed) {
  let u = u0;
  let n = seed;
  while (u < u1 - 0.1) {
    const width = 0.06 + ((n * 7) % 4) * 0.018;
    const height = 0.24 + ((n * 5) % 5) * 0.035;
    const book = orientedBox(builders[BOOK_MATTERS[n % BOOK_MATTERS.length]], x, z, facing);
    book([u, y, w0], [u + width, y + height, w1]);
    u += width + 0.012;
    n += 1;
    if (n % 11 === 0) u += 0.14; // un vide, un livre manquant
  }
}

// Haute bibliothèque contre un mur (facing : le côté des livres ; east contre
// le mur ouest) : montants, fond, corniche, six rayons pleins de livres.
export function buildTallShelf({ x, z, facing = 'south', width = 1.5, height = 2.35 }, builders) {
  const wood = orientedBox(builders.wood, x, z, facing);
  const h = width / 2;
  const depth = 0.4;
  wood([-h, 0, -0.2], [h, height, -0.17]); // le fond, contre le mur
  for (const s of [-1, 1]) wood([s * h - 0.05, 0, -0.2], [s * h + 0.05, height, depth - 0.2]);
  wood([-h - 0.06, height, -0.2], [h + 0.06, height + 0.08, depth - 0.16]);
  wood([-h, 0, -0.2], [h, 0.1, depth - 0.2]);
  const shelves = [0.1, 0.48, 0.86, 1.24, 1.62, 1.98];
  shelves.forEach((y, row) => {
    if (row > 0) wood([-h, y, -0.2], [h, y + 0.04, depth - 0.2]);
    if (y + 0.3 < height) bookRow(builders, x, z, facing, -h + 0.07, h - 0.07, y + (row ? 0.04 : 0), -0.15, depth - 0.25, row * 5 + Math.round(x * 3 + z * 7));
  });
  const [fx, fz] = FRONT[facing] ?? FRONT.south;
  const posts = [];
  for (let u = -h + 0.3; u <= h - 0.3 + 1e-6; u += 0.45) posts.push({ x: x + u * fz + fx * 0.02, z: z - u * fx + fz * 0.02, radius: 0.3 });
  return { posts };
}

// Globe terrestre sur son pied : trois pieds, une colonne, la sphère (océans
// et terres en deux tons), le méridien de fer.
export function buildGlobe({ x, z }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const sea = createFrame(builders.voletBleu, [x, 0, z]); // le bois peint en bleu des volets
  const land = createFrame(builders.leaves, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  for (const a of [0, 2.1, 4.2]) pushBar(wood, [0, 0.45, 0], [Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3], 0.05, { groundAo: 0.6 });
  pushRevolution(wood, [[0.45, 0.05], [0.7, 0.04], [0.74, 0.08]], { sides: 8 });
  const c = 0.98;
  const r = 0.24;
  const rings = [];
  for (let k = 0; k <= 6; k += 1) {
    const a = -Math.PI / 2 + (k / 6) * Math.PI;
    rings.push([c + Math.sin(a) * r, Math.max(0.001, Math.cos(a) * r)]);
  }
  pushRevolution(sea, rings.slice(0, 3), { sides: 10, groundAo: 1 });
  pushRevolution(land, rings.slice(2, 5), { sides: 10, groundAo: 1, phase: 0.3 });
  pushRevolution(sea, rings.slice(4), { sides: 10, groundAo: 1 });
  pushRevolution(iron, [[c - 0.015, r + 0.02], [c + 0.015, r + 0.02]], { sides: 12, groundAo: 1 });
  pushBar(iron, [0, c - r - 0.06, 0], [0, c + r + 0.06, 0], 0.025);
  return { posts: [{ x, z, radius: 0.32 }] };
}

// Pile de livres posée à plat (y : la hauteur où elle repose), chaque livre
// un peu décalé.
export function buildBookStack({ x, z, y = 0, count = 4 }, builders) {
  let top = y;
  for (let k = 0; k < count; k += 1) {
    const book = createFrame(builders[BOOK_MATTERS[(k * 3 + Math.round(x * 5)) % BOOK_MATTERS.length]], [x, 0, z]);
    const w = 0.34 - (k % 3) * 0.03;
    const d = 0.25 - (k % 2) * 0.02;
    const dx = ((k * 37) % 7 - 3) * 0.012;
    const dz = ((k * 53) % 5 - 2) * 0.012;
    const t = 0.05 + (k % 2) * 0.015;
    pushBox(book, [dx - w / 2, top, dz - d / 2], [dx + w / 2, top + t, dz + d / 2], { groundAo: top < 0.05 ? 0.7 : 1 });
    top += t;
  }
  return { posts: y < 0.05 ? [{ x, z, radius: 0.22 }] : [] };
}

// Lutrin : un pied tourné, un plateau incliné vers le lecteur (facing), un
// grand livre ouvert dessus.
export function buildLectern({ x, z, facing = 'south' }, builders) {
  const wood = orientedBox(builders.wood, x, z, facing);
  const page = orientedBox(builders.plaster, x, z, facing);
  const cover = orientedBox(builders.awning, x, z, facing);
  wood([-0.25, 0, -0.2], [0.25, 0.06, 0.2]);
  wood([-0.05, 0.06, -0.05], [0.05, 1.0, 0.05]);
  // Le plateau, en trois marches qui montent vers l'arrière : une pente lisible.
  for (let k = 0; k < 3; k += 1) wood([-0.3, 0.98 + k * 0.05, 0.12 - k * 0.12], [0.3, 1.03 + k * 0.05, 0.24 - k * 0.12]);
  cover([-0.27, 1.03, -0.12], [0.27, 1.1, 0.22]);
  page([-0.25, 1.1, -0.1], [-0.01, 1.13, 0.2]);
  page([0.01, 1.1, -0.1], [0.25, 1.13, 0.2]);
  return { posts: [{ x, z, radius: 0.3 }] };
}

// --- Version 2.6 : l'apothicairerie ------------------------------------------

// Les verres des fioles : du bois peint (vert, bleu, rouge, opaques en pixel
// art) et, pour les remèdes qui luisent, la matière des fenêtres allumées.
const GLASS = ['voletVert', 'voletBleu', 'voletRouge', 'window'];

// Une fiole ronde au long col, en (x, y, z) : la panse, le col, le bouchon.
function flask(builders, x, y, z, glass, size = 1) {
  const body = createFrame(builders[glass], [x, 0, z]);
  const cork = createFrame(builders.bark, [x, 0, z]);
  const s = size;
  pushRevolution(body, [[y, 0.03 * s], [y + 0.04 * s, 0.07 * s], [y + 0.1 * s, 0.075 * s], [y + 0.15 * s, 0.04 * s], [y + 0.2 * s, 0.02 * s]], { sides: 7, groundAo: 1 });
  pushRevolution(cork, [[y + 0.2 * s, 0.022 * s], [y + 0.25 * s, 0.022 * s]], { sides: 5, groundAo: 1 });
}

// Un bocal de terre ou de grès, en (x, y, z) : ventru, un couvercle de fer.
function jar(builders, x, y, z, clay, size = 1) {
  const body = createFrame(builders[clay], [x, 0, z]);
  const lid = createFrame(builders.iron, [x, 0, z]);
  const s = size;
  pushRevolution(body, [[y, 0.06 * s], [y + 0.06 * s, 0.09 * s], [y + 0.18 * s, 0.085 * s], [y + 0.22 * s, 0.06 * s]], { sides: 7, groundAo: 1 });
  pushRevolution(lid, [[y + 0.22 * s, 0.065 * s], [y + 0.25 * s, 0.065 * s], [y + 0.27 * s, 0.03 * s]], { sides: 7, groundAo: 1 });
}

// Étagère de remèdes contre le mur nord, de x0 à x1 : quatre rayons, des
// bocaux de grès et de terre, des fioles de couleur, quelques-unes qui luisent.
export function buildJarShelf({ x0, x1, z, height = 2.2 }, builders) {
  const wood = createFrame(builders.wood, [0, 0, z]);
  for (const px of [x0, x1 - 0.08]) pushBox(wood, [px, 0, 0], [px + 0.08, height, 0.34]);
  pushBox(wood, [x0 - 0.04, height, 0], [x1 + 0.04, height + 0.07, 0.38]);
  const rows = [0.15, 0.62, 1.09, 1.56];
  rows.forEach((y, row) => {
    pushBox(wood, [x0, y - 0.05, 0], [x1, y, 0.34]);
    let px = x0 + 0.2;
    let n = row * 5;
    while (px < x1 - 0.18) {
      const kind = (n * 7 + row) % 5;
      if (kind < 2) {
        jar(builders, px, y, z + 0.17, kind === 0 ? 'plaster' : 'brick', 0.9 + (n % 3) * 0.12);
        px += 0.24;
      } else {
        flask(builders, px, y, z + 0.17, GLASS[(n + row) % GLASS.length], 0.9 + (n % 2) * 0.25);
        px += 0.18;
      }
      n += 1;
      if (n % 7 === 0) px += 0.12;
    }
  });
  const posts = [];
  for (let px = x0 + 0.3; px < x1; px += 0.5) posts.push({ x: px, z: z + 0.2, radius: 0.3 });
  return { posts };
}

// Alambic posé sur un meuble (y : son plateau) : un ballon sur un petit
// réchaud, le col de cygne, le serpentin, le ballon de recette qui luit.
export function buildAlembic({ x, z, y = 0.78 }, builders) {
  const iron = createFrame(builders.iron, [x, 0, z]);
  const copper = createFrame(builders.brick, [x, 0, z]);
  const glass = createFrame(builders.voletVert, [x, 0, z]);
  pushRevolution(iron, [[y, 0.1], [y + 0.12, 0.1]], { sides: 8, groundAo: 1 });
  pushRevolution(copper, [[y + 0.12, 0.06], [y + 0.18, 0.13], [y + 0.3, 0.13], [y + 0.38, 0.07], [y + 0.5, 0.03]], { sides: 9, groundAo: 1 });
  pushBar(copper, [-0.0, y + 0.5, 0], [0.32, y + 0.42, 0], 0.03);
  pushBar(copper, [0.32, y + 0.42, 0], [0.34, y + 0.2, 0], 0.03);
  for (let k = 0; k < 3; k += 1) pushBar(copper, [0.28, y + 0.38 - k * 0.07, -0.05], [0.4, y + 0.36 - k * 0.07, 0.05], 0.025);
  flask(builders, x + 0.36, y, z + 0.02, 'window', 0.9);
  pushRevolution(glass, [[y, 0.04], [y + 0.04, 0.05], [y + 0.1, 0.03]], { sides: 6, groundAo: 1 });
  return { posts: [] };
}

// Mortier de pierre et son pilon, posé sur un meuble.
export function buildMortar({ x, z, y = 0.78 }, builders) {
  const stone = createFrame(builders.stone, [x, 0, z]);
  const wood = createFrame(builders.wood, [x, 0, z]);
  pushRevolution(stone, [[y, 0.07], [y + 0.04, 0.1], [y + 0.12, 0.11], [y + 0.14, 0.1]], { sides: 8, groundAo: 1 });
  pushDisc(stone, y + 0.13, 0.08, { sides: 8 });
  pushBar(wood, [0.02, y + 0.1, 0], [0.12, y + 0.3, 0.04], 0.035);
  return { posts: [] };
}

// Séchoir à herbes : deux montants, une perche en haut, des bottes d'herbes
// pendues tête en bas par une ficelle. facing : le côté vu de face.
export function buildDryingRack({ x, z, facing = 'south', width = 1.3 }, builders) {
  const wood = orientedBox(builders.wood, x, z, facing);
  const leaves = orientedBox(builders.leaves, x, z, facing);
  const string = orientedBox(builders.thatch, x, z, facing);
  const h = width / 2;
  for (const s of [-1, 1]) {
    wood([s * h - 0.04, 0, -0.04], [s * h + 0.04, 1.75, 0.04]);
    wood([s * h - 0.18, 0, -0.06], [s * h + 0.18, 0.06, 0.06]);
  }
  wood([-h - 0.06, 1.7, -0.03], [h + 0.06, 1.77, 0.03]);
  wood([-h, 1.25, -0.025], [h, 1.3, 0.025]);
  let k = 0;
  for (let u = -h + 0.16; u < h - 0.1; u += 0.2) {
    const top = k % 2 ? 1.7 : 1.25;
    const length = 0.38 + (k % 3) * 0.08;
    string([u - 0.01, top - 0.08, -0.01], [u + 0.01, top, 0.01]);
    leaves([u - 0.06, top - 0.08 - length * 0.35, -0.05], [u + 0.06, top - 0.08, 0.05]);
    leaves([u - 0.1, top - 0.08 - length, -0.08], [u + 0.1, top - 0.08 - length * 0.35, 0.08]);
    k += 1;
  }
  const [fx, fz] = FRONT[facing] ?? FRONT.south;
  return { posts: [{ x: x + h * fz * 0.9, z: z - h * fx * 0.9, radius: 0.2 }, { x: x - h * fz * 0.9, z: z + h * fx * 0.9, radius: 0.2 }] };
}

// Ruche de paille sur son tabouret : un dôme de chaume en anneaux, le trou
// de vol, un toit plat de planches.
export function buildBeehive({ x, z }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const straw = createFrame(builders.thatch, [x, 0, z]);
  const hole = createFrame(builders.iron, [x, 0, z]);
  for (const [lx, lz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) pushBox(wood, [lx - 0.03, 0, lz - 0.03], [lx + 0.03, 0.35, lz + 0.03], { groundAo: 0.6 });
  pushBox(wood, [-0.3, 0.35, -0.3], [0.3, 0.4, 0.3]);
  pushRevolution(straw, [[0.4, 0.26], [0.5, 0.28], [0.62, 0.27], [0.74, 0.23], [0.84, 0.16], [0.9, 0.07], [0.92, 0.001]], { sides: 10, groundAo: 1 });
  for (const y of [0.52, 0.66, 0.78]) pushRevolution(straw, [[y, 0.285 - (y - 0.5) * 0.4], [y + 0.025, 0.29 - (y - 0.5) * 0.4]], { sides: 10, groundAo: 1, phase: 0.3 });
  pushBox(hole, [-0.05, 0.4, 0.24], [0.05, 0.45, 0.27]);
  return { posts: [{ x, z, radius: 0.34 }] };
}

// Chaudron sur trépied, dehors : trois perches liées en haut, une chaîne,
// une marmite de fer ventrue, des bûches dessous.
export function buildTripodCauldron({ x, z }, builders) {
  const wood = createFrame(builders.wood, [x, 0, z]);
  const iron = createFrame(builders.iron, [x, 0, z]);
  const bark = createFrame(builders.bark, [x, 0, z]);
  for (const a of [0.3, 2.4, 4.5]) pushBar(wood, [Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55], [0, 1.45, 0], 0.06, { groundAo: 0.6 });
  pushBar(iron, [0, 1.42, 0], [0, 0.8, 0], 0.02);
  pushRevolution(iron, [[0.42, 0.14], [0.5, 0.22], [0.66, 0.25], [0.76, 0.22], [0.8, 0.2]], { sides: 10 });
  pushRevolution(iron, [[0.8, 0.22], [0.83, 0.22]], { sides: 10, groundAo: 1 });
  const brew = createFrame(builders.voletVert, [x, 0, z]);
  pushDisc(brew, 0.78, 0.19, { sides: 10 });
  for (const [a, l] of [[0.4, 0.5], [1.9, 0.45], [3.3, 0.5]]) pushBar(bark, [Math.cos(a) * l * 0.5, 0.05, Math.sin(a) * l * 0.5], [-Math.cos(a) * l * 0.5, 0.05, -Math.sin(a) * l * 0.5], 0.09);
  return { posts: [{ x, z, radius: 0.45 }] };
}
