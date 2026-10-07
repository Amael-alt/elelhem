// L'implantation du village : où se posent les maisons, tours, chantier, puits
// et arbres, avec leurs réglages. Que de la donnée : world/village.js les
// bâtit, la grille de world/map.js leur laisse la place.
//
// Repère : x vers l'est, z vers le sud. Une maison est donnée par son coin
// nord-ouest (x, z) et son emprise en cases ; sa porte et ses fenêtres par côté
// (south, north, east, west) et décalage depuis le milieu du mur (voir
// world/props.js). Les positions des habitants sont dans data/characters.js.
//
// Version 2.3 : la carte passe de 40 × 30 à 56 × 42 cases. Toute l'ancienne
// implantation a été multipliée par 1,4 (plus d'air entre les éléments), puis
// quatre lieux sont venus : le terrain d'entraînement derrière la forge, le
// marché au sud de la place, le lavoir au bord de la rivière, le verger dans
// la prairie de l'est.

// Maisons. wall : hauteur des murs, rise : montée du toit, ridge : axe du
// faîtage, chimney : position de la cheminée (part de la longueur et de la
// portée) avec chimneySize et chimneyRise pour une cheminée forte. walls :
// plaster (enduit et colombages, par défaut), stonewall (pierre de taille) ;
// roof : roof (tuiles, par défaut), slate (ardoise), thatch (chaume) ;
// planters : jardinières fleuries sous les fenêtres basses.
export const HOUSES = {
  // La forge : basse et large, une cheminée de brique très forte.
  forge: {
    x: 6, z: 4, sizeX: 5, sizeZ: 3, wall: 3.3, rise: 1.8, ridge: 'x', walls: 'stonewall', roof: 'slate', shutters: 'bleu', sign: 'enclume',
    door: { side: 'south', offset: -0.7 },
    windows: [{ side: 'south', offset: 1.5 }, { side: 'south', offset: 0.4, y: 2.3 }],
    chimney: [0.82, 0.4], chimneySize: 0.9, chimneyRise: 1.4,
  },
  // La bibliothèque : haute, trois rangées de fenêtres.
  bibliotheque: {
    x: 15, z: 7, sizeX: 5, sizeZ: 4, wall: 5.6, rise: 2.3, ridge: 'x', roof: 'slate', planters: true, shutters: 'bleu', dormers: [-1.2, 1.2], sign: 'livre',
    door: { side: 'south', offset: 0 },
    // Trois rangées de fenêtres : la plus haute maison du village.
    windows: [
      { side: 'south', offset: -1.7 }, { side: 'south', offset: 1.7 },
      { side: 'south', offset: -1.7, y: 2.4 }, { side: 'south', offset: 1.7, y: 2.4 }, { side: 'south', offset: 0, y: 2.45 },
      { side: 'south', offset: -1.7, y: 4.15 }, { side: 'south', offset: 1.7, y: 4.15 }, { side: 'south', offset: 0, y: 4.2 },
      { side: 'west', offset: 0 }, { side: 'west', offset: 0, y: 2.4 }, { side: 'west', offset: 0, y: 4.15 },
    ],
    chimney: [0.8, 0.3],
  },
  // L'apothicairerie : étroite, ouverte sur son jardin de simples à l'est.
  apothicairerie: {
    x: 32, z: 8, sizeX: 3, sizeZ: 3, wall: 4.2, rise: 2.0, ridge: 'x', roof: 'thatch', planters: true, shutters: 'vert', sign: 'fiole',
    door: { side: 'south', offset: 0 },
    windows: [{ side: 'east', offset: 0 }, { side: 'west', offset: 0 }, { side: 'south', offset: 0, y: 3.2 }, { side: 'east', offset: 0, y: 3.2 }],
    chimney: [0.25, 0.5],
  },
  // La guérite de la porte de la muraille.
  guerite: {
    x: 4, z: 16, sizeX: 2, sizeZ: 2, wall: 2.9, rise: 1.3, ridge: 'x', walls: 'stonewall', roof: 'slate', lantern: false,
    door: { side: 'south', offset: 0 },
    windows: [{ side: 'east', offset: 0 }],
  },
  // La maison du héros, dans la prairie de l'est, de l'autre côté du pont :
  // petite, chaume et jardinières. La partie commence dedans.
  maison: {
    x: 49, z: 6, sizeX: 3, sizeZ: 3, wall: 3.4, rise: 2.0, ridge: 'x', roof: 'thatch', planters: true, shutters: 'vert',
    door: { side: 'south', offset: 0 },
    windows: [{ side: 'south', offset: 1.0 }, { side: 'west', offset: 0 }, { side: 'south', offset: -0.6, y: 2.3 }],
    chimney: [0.5, 0.25],
  },
  // L'auberge : la plus grande maison, cheminée qui fume.
  auberge: {
    x: 10, z: 28, sizeX: 6, sizeZ: 4, wall: 4.8, rise: 2.2, ridge: 'x', planters: true, shutters: 'rouge', dormers: [-1.6, 1.4], sign: 'chope',
    door: { side: 'south', offset: 0.5 },
    windows: [
      { side: 'south', offset: -1.7 }, { side: 'south', offset: 1.9 }, { side: 'west', offset: 0 },
      { side: 'south', offset: -1.9, y: 3.5 }, { side: 'south', offset: 0.3, y: 3.5 }, { side: 'south', offset: 2.1, y: 3.5 }, { side: 'west', offset: 0, y: 3.5 },
    ],
    chimney: [0.8, 0.4],
  },
};

// Tours à toit en pyramide.
export const TOWERS = {
  architecte: { x: 25, z: 3, size: 3, wall: 7.4, rise: 3.2, windowHeights: [2.6, 4.3, 6.0], roof: 'slate' },
  colombier: { x: 38, z: 24, size: 2, wall: 4.6, rise: 2.0, holes: true, roof: 'thatch' },
};

// Le chantier : bâtiment à moitié monté, échafaudage sur ses faces sud et ouest.
export const SITE = { x: 33, z: 35, sizeX: 4, sizeZ: 3 };

export const WELL = { x: 27.6, z: 20.4 };
// Le parvis de la bibliothèque (version 2.6) : des pavés en éventail
// jusqu'à l'allée, un muret à chaperon coiffé d'auges fleuries au sud (ouvert
// face à la porte), un cadran solaire à l'ouest, un banc et des livres sous
// la fenêtre à l'est.
export const LIBRARY_COURT = {
  walls: [[[13.9, 14.3], [16.7, 14.3]], [[18.3, 14.3], [21.2, 14.3]]],
  planters: [
    { x: 15.2, z: 14.3, length: 1.8, axis: 'x', y: 0.66, stone: true },
    { x: 19.8, z: 14.3, length: 2.0, axis: 'x', y: 0.66, stone: true },
  ],
  sundial: { x: 14.9, z: 12.1 },
  books: { x: 20.15, z: 11.55, y: 0.47, count: 3 },
};
export const HEARTH = { x: 10.6, z: 9.2 };
// La cour de la forge (version 2.6) : des dalles (case k de world/map.js), un
// muret à l'ouest, un râtelier d'épées et un bouclier sur la façade, un
// tonneau d'épées, des barres de fer, des sacs de charbon, le baquet de
// trempe et la meule près du foyer.
export const FORGE_YARD = {
  walls: [[[5.0, 7.3], [5.0, 10.7]]],
  rack: { x: 6.6, z: 7.32, facing: 'south', width: 1.1 },
  shield: { x: 6.6, z: 7.0, y: 1.95, side: 'south', radius: 0.32 },
  swordBarrel: { x: 9.0, z: 7.38 },
  bars: { x: 10.4, z: 7.5, length: 1.1 },
  sacks: { x: 11.9, z: 7.7, count: 3 },
  trough: { x: 12.0, z: 9.5 },
  grindstone: { x: 6.2, z: 9.9 },
};
export const ANVIL = { x: 8.4, z: 10.3 };

// Le lavoir (version 2.3) : son emprise de 4 × 4 cases au bord de la rivière,
// le bassin d'eau au milieu est peint dans la carte (world/map.js).
export const WASHHOUSE = { x: 40, z: 36 };

// Le terrain d'entraînement (version 2.3), entre la forge et la grande rue
// (la forge est remontée au pied de la falaise pour lui laisser la place et
// ne pas le cacher à la caméra) : un enclos de terre battue, des mannequins de
// paille à frapper et des cibles.
export const TRAINING = {
  rect: [6.5, 11.5, 14.5, 19], // le quartier, pour le bandeau et le défi
  dummies: [{ x: 9.0, z: 14.2 }, { x: 12.0, z: 14.2 }, { x: 10.5, z: 16.6 }],
  targets: [{ x: 13.1, z: 13.4 }, { x: 13.1, z: 15.8 }],
  // La barrière de l'enclos : ouverte au nord vers la forge (x 7 à 9,4) et au
  // sud vers la grande rue (x 9 à 12).
  fences: [[[9.4, 12.0], [14.0, 12.0]], [[14.0, 12.0], [14.0, 18.8]], [[7.0, 12.0], [7.0, 18.8]], [[7.0, 18.8], [9.0, 18.8]], [[12.0, 18.8], [14.0, 18.8]]],
};

// Le marché (version 2.3), au sud de la place : trois étals sous leurs auvents
// et, sur la place même, l'étal de légumes qui s'y tenait déjà. Le marchand de
// fioles se tient derrière son comptoir (data/characters.js).
export const MARKET_STALLS = [
  { x: 24.8, z: 29.9, goods: 'tissus' },
  { x: 31.2, z: 29.9, goods: 'fioles' },
  { x: 24.8, z: 33.4, goods: 'poteries' },
];

// Le verger (version 2.3), dans la prairie de l'est, au sud de la pâture :
// neuf pommiers en rangs, une échelle contre l'un d'eux, des paniers.
export const ORCHARD = {
  rect: [46.5, 29.5, 54, 41],
  trees: [
    [47.8, 31.5, 1.15], [50.2, 31.5, 1.2], [52.6, 31.5, 1.1],
    [47.8, 34.0, 1.2], [50.2, 34.0, 1.15], [52.6, 34.0, 1.2],
    [47.8, 36.5, 1.1], [50.2, 36.5, 1.2], [52.6, 36.5, 1.15],
  ],
  ladder: { x: 50.2, z: 34.9, lean: 'north' },
  baskets: [{ x: 48.9, z: 35.4 }, { x: 51.6, z: 32.9 }, { x: 49.0, z: 38.3, full: false }],
  // La pomme à cueillir : au pied de l'arbre à l'échelle.
  apple: { x: 50.2, z: 35.6 },
};

// Petits objets : tonneaux, caisses, bancs, enseigne, potagers.
export const BARRELS = [
  { x: 12.4, z: 5.6 }, { x: 12.3, z: 6.6, height: 0.6 },
  { x: 14.85, z: 32.42 }, { x: 15.5, z: 32.42 }, { x: 16.15, z: 32.42 }, { x: 15.2, z: 33.05, height: 0.6 },
  { x: 36.2, z: 30.4 }, { x: 44.0, z: 39.8, height: 0.6 },
];
export const CRATES = [
  { x: 22.0, z: 13.3 }, { x: 31.5, z: 13.4 }, { x: 30.6, z: 36.0, size: 0.5 }, { x: 22.8, z: 35.6 },
];
export const BENCHES = [{ x: 19.7, z: 11.55 }, { x: 23.7, z: 16.7 }, { x: 31.2, z: 24.8 }, { x: 11.0, z: 32.55 }, { x: 41.6, z: 27.2 }, { x: 49.4, z: 39.3 }];
export const VEGETABLES = [
  { x0: 37.6, z0: 8.6, x1: 39.4, z1: 12.2 }, // jardin de simples de l'apothicaire
  { x0: 19.5, z0: 29.4, x1: 22.0, z1: 30.3 }, // potager de l'auberge
];

// Étal de marché sur la place, barrières (tracés de segments droits), meules,
// rochers et feu de camp dans la prairie de l'est.
export const STALLS = [{ x: 31.6, z: 18.1 }];
export const FENCES = [
  // La pâture aux meules, dans la prairie de l'est.
  [[47.6, 23.6], [52.6, 23.6]], [[47.6, 23.6], [47.6, 28.6]], [[47.6, 28.6], [52.6, 28.6]],
  // Devant l'auberge, et le coin nord-ouest du verger.
  [[4.5, 34.4], [8.6, 34.4]], [[46.8, 30.0], [51.0, 30.0]], [[46.8, 30.0], [46.8, 34.0]],
  ...TRAINING.fences,
];
export const HAYSTACKS = [{ x: 49.4, z: 25.2 }, { x: 51.4, z: 27.4 }, { x: 52.6, z: 18.4 }];
export const ROCKS = [
  { x: 53.2, z: 39.6, size: 1.1 }, { x: 39.9, z: 40.4 }, { x: 4.6, z: 3.6, size: 1.2 }, { x: 21.3, z: 39.6, size: 0.8 },
  { x: 46.8, z: 12.3 }, { x: 11.2, z: 23.2, size: 0.7 }, { x: 33.9, z: 6.4, size: 0.8 }, { x: 44.6, z: 32.2, size: 0.9 },
];
export const CAMPFIRE = { x: 50.4, z: 16.2 };

// Terrasse de l'auberge, pots de fleurs aux portes, poteaux indicateurs aux
// carrefours, tas de bois de la forge.
// Le parvis de l'auberge (version 2.5) : un muret de pierre à chaperon le
// ferme à l'ouest et au sud (une ouverture face à la porte), des jardinières
// sur le muret et contre lui, un chevalet d'ardoise à la porte, des tabourets
// autour des tables de la terrasse. Le sol est en pavés en éventail (case e de
// world/map.js).
export const INN_COURT = {
  walls: [
    [[8.75, 32.25], [8.75, 36.75], [12.6, 36.75]],
    [[14.4, 36.75], [18.9, 36.75]],
  ],
  planters: [
    { x: 10.7, z: 36.75, length: 1.8, axis: 'x', y: 0.66, stone: true },
    { x: 16.7, z: 36.75, length: 2.0, axis: 'x', y: 0.66, stone: true },
    { x: 8.75, z: 34.5, length: 2.0, axis: 'z', y: 0.66, stone: true },
    { x: 19.3, z: 34.6, length: 1.4, axis: 'z' },
  ],
  chalkboard: { x: 12.3, z: 33.0 },
  // Les tables ont leurs bancs (landmarks.js) : un tabouret à chaque bout.
  stools: [{ x: 10.25, z: 34.7 }, { x: 12.15, z: 34.7 }, { x: 15.65, z: 34.7 }, { x: 17.55, z: 34.7 }],
};

export const TABLES = [{ x: 11.2, z: 34.7 }, { x: 16.6, z: 34.7 }];
export const FLOWER_POTS = [
  { x: 16.4, z: 11.4 }, { x: 18.6, z: 11.4 }, { x: 12.75, z: 32.5 }, { x: 14.25, z: 32.5 },
  { x: 32.6, z: 11.4 }, { x: 34.4, z: 11.4 }, { x: 25.5, z: 6.4 }, { x: 27.5, z: 6.4 },
];
export const SIGNPOSTS = [{ x: 19.4, z: 18.8 }, { x: 29.6, z: 27.4 }, { x: 40.6, z: 18.3 }, { x: 46.6, z: 18.6 }, { x: 35.2, z: 33.6 }];
export const WOODPILE = { x: 4.8, z: 6.0 };

// Guirlandes de fanions : attachées au sommet des quatre lanternes de la
// place, elles en font le tour.
export const BUNTING = [
  { from: [20.7, 2.45, 16.7], to: [35.3, 2.45, 16.7], sag: 0.5 },
  { from: [20.7, 2.45, 25.3], to: [35.3, 2.45, 25.3], sag: 0.5 },
  { from: [20.7, 2.45, 16.7], to: [20.7, 2.45, 25.3], sag: 0.35 },
  { from: [35.3, 2.45, 16.7], to: [35.3, 2.45, 25.3], sag: 0.35 },
];

// Papillons : [x, z, rayon de vol] au-dessus des prés et des jardins.
export const BUTTERFLIES = [
  [49.7, 11.2, 2], [49.7, 33.5, 2.4], [11.2, 23.8, 2], [36.4, 39.5, 2], [14, 4.9, 1.8], [38.8, 10.5, 1], [20.8, 29.8, 1.2], [7, 38.5, 1.8],
  [49.5, 26.2, 1.6],
];

// Quatre lanternes éclairantes (une vraie lumière, des ombres calculées une
// seule fois) aux coins de la place, et des lanternes d'ambiance (flamme
// seulement, le bloom fait le halo) : trop de lumières ralentiraient les
// téléphones.
export const LANTERNS = [[20.7, 16.7], [35.3, 16.7], [20.7, 25.3], [35.3, 25.3]];
export const DECOR_LANTERNS = [
  [19.6, 12.6], [35.6, 12.6], [24.6, 8.0], [5.6, 12.8], [18.4, 32.6], [41.2, 18.6], [47.2, 23.0],
  [26.2, 28.2], [29.4, 28.2], [39.4, 35.4], [13.6, 9.6], [46.6, 31.0],
];

// Arbres : position du tronc, taille (1 : moyen, soit deux personnages de haut ; les
// tailles valent 1,3 à 1,7 depuis la version 1.4, pour des arbres de trois personnages), feuillage ('vert' par défaut,
// 'automne' pour les roux de la prairie de l'est et du sud).
export const TREES = [
  [14.0, 4.6, 1.6], [14.4, 9.0, 1.31], [24.2, 10.6, 1.38], [30.8, 5.6, 1.6],
  [35.7, 4.9, 1.45], [46.8, 12.3, 1.6, 'automne'], [49.7, 14.0, 1.45, 'automne'], [53.0, 29.2, 1.74, 'automne'],
  [47.3, 29.3, 1.52, 'automne'], [6.3, 24.5, 1.6], [7.0, 30.8, 1.45, 'automne'], [23.1, 37.8, 1.45],
  [36.2, 40.6, 1.67, 'automne'], [6.2, 39.6, 1.31], [39.9, 16.8, 1.31], [16.8, 19.6, 1.16], [5.3, 37.8, 1.52],
  [3.95, 8.6, 1.3], [40.6, 8.6, 1.4], [47.6, 40.4, 1.2, 'automne'], [8.4, 22.4, 1.2],
];

// Buissons : position, taille (1 : à hauteur de genou).
export const BUSHES = [
  [13.2, 15.2, 1], [5.2, 13.2, 0.9], [23.0, 12.0, 1], [13.3, 11.7, 0.8], [31.6, 12.3, 0.9], [36.4, 6.2, 1],
  [9.2, 26.0, 1.1], [19.0, 27.4, 0.9], [7.6, 33.0, 1], [35.6, 30.2, 0.9], [37.4, 22.6, 0.8], [42.0, 29.4, 1],
  [46.2, 15.4, 1.1], [51.1, 17.5, 0.9], [46.4, 25.4, 1], [38.6, 40.6, 1.1], [24.6, 36.4, 0.9], [15.4, 38.6, 1],
  [3.6, 39.2, 1], [13.6, 3.4, 0.9], [19.6, 4.8, 1], [38.6, 4.5, 1], [22.4, 7.8, 0.9], [41.8, 24.0, 0.9],
];

// Prés fleuris (rectangles x0, z0, x1, z1 en cases) : les touffes y sont
// souvent en fleurs.
export const MEADOWS = [[46, 4, 53, 40], [4, 22, 17, 25], [31, 37, 42, 41], [14, 4, 24, 6], [4, 36, 24, 41]];

// Lucioles : [x, z, rayon] des coins où elles se rassemblent.
export const FIREFLY_ANCHORS = [
  [8.4, 6.3, 2.5], [30.8, 5.6, 2.5], [47.6, 11.2, 2.5], [12.6, 36.4, 2.5], [50.4, 33.4, 3], [39.2, 16.1, 2.5], [23.8, 22.4, 4], [40.6, 37.6, 2],
  [28, 31.5, 2.5],
];

// Rayons de soleil : centre, longueur, largeur, opacité (0,06 à 0,12).
export const SUN_RAYS = [
  { center: [14, 4.5, 18], length: 14, width: 1.6, opacity: 0.1 },
  { center: [22.4, 4.5, 12.6], length: 13, width: 0.9, opacity: 0.08 },
  { center: [30, 4.5, 21], length: 15, width: 2.0, opacity: 0.12 },
  { center: [37.8, 4.5, 16.8], length: 12, width: 1.2, opacity: 0.07 },
  { center: [18.2, 4.5, 29.4], length: 14, width: 1.4, opacity: 0.06 },
  { center: [49, 4.5, 33], length: 12, width: 1.3, opacity: 0.07 },
];

// Pigeons du colombier : centre du vol (x, y, z), rayon, nombre.
export const PIGEONS = { center: [39, 4.6, 25], radius: 2.6, count: 6 };

// Quartiers, pour le bandeau de lieu : rectangles [x0, z0, x1, z1] en unités,
// le premier qui contient le héros l'emporte. Noms dans data/dialogues.js.
export const REGIONS = [
  { id: 'tour', rect: [24, 2, 30, 10.5] },
  { id: 'bibliotheque', rect: [14, 6, 23, 15] },
  { id: 'apothicairerie', rect: [31, 7, 42, 15] },
  { id: 'entrainement', rect: TRAINING.rect },
  { id: 'forge', rect: [4, 3, 14, 11.5] },
  { id: 'porte', rect: [0, 12.5, 6.5, 24] },
  { id: 'place', rect: [19.5, 15.5, 37, 27] },
  { id: 'pont', rect: [40, 18, 47, 23.5] },
  { id: 'colombier', rect: [36.5, 23, 43, 29] },
  { id: 'lavoir', rect: [37.5, 33, 44, 41] },
  { id: 'chantier', rect: [30, 34.5, 39.5, 41] },
  { id: 'marche', rect: [21.5, 27, 35, 34.5] },
  { id: 'auberge', rect: [8, 27, 24, 37] },
  { id: 'maison', rect: [47, 4, 54, 13] },
  { id: 'verger', rect: ORCHARD.rect },
  { id: 'prairie', rect: [46.5, 4, 54, 41] },
];

// La rivière et les routes, là où elles quittent le village (world/outskirts.js
// les prolonge vers l'horizon) : colonnes de la rivière sur le plateau au nord
// et dans la plaine au sud (elle se décale d'une case au pont), rangs de la
// rue de l'ouest, colonnes de la rue du sud.
export const OUTSKIRTS = {
  riverNorth: { x0: 43, x1: 46 },
  riverSouth: { x0: 44, x1: 47 },
  westRoad: { z0: 20, z1: 22 },
  southRoad: { x0: 27, x1: 29 },
};

// La cascade : la rivière du plateau tombe dans le village. Depuis la version
// 2.3, le rideau d'eau tombe en z = 3, une case devant la falaise : derrière
// lui, une corniche de pierre (lettre g de world/map.js) cache un coffre.
export const WATERFALL = { x0: 43, x1: 46, z: 3, top: 1.55, bottom: -0.35 };

// Les coffres du village (version 2.3) : le coffre de la cascade, 25 Tokens et
// la tenue de la cascade (data/tokens.js), ouvert en s'en approchant.
export const CHESTS = [{ id: 'cascade', x: 45.2, z: 2.5, tokens: 25, tenue: 'cascade' }];

// Les douze étincelles cachées (version 2.3) : des éclats de magie LIA posés
// dans les recoins du village, ramassés en marchant dessus. Trois Tokens
// chacune, et un titre quand on les a toutes (game/exploits.js).
export const SPARKS = [
  [43.5, 2.4], [53.0, 3.4], [11.0, 2.5], [38.5, 6.2], [1.0, 8.0], [1.2, 30.0],
  [20.5, 29.6], [34.2, 26.6], [13.0, 24.6], [26.0, 40.2], [41.0, 33.0], [53.2, 38.4],
];

// Le défi du mannequin : d'où on le lance, au milieu de l'enclos.
export const TRAINING_SPOT = { x: 10.5, z: 15.4 };

// La porte de la muraille : la zone où pousser vers l'ouest fait sortir sur la
// lande, et où l'on réapparaît en revenant.
export const GATE = { zone: { x0: 0, x1: 2.5, z0: 18.5, z1: 23 }, back: { x: 2.4, z: 20.9, direction: 'right' } };

// Départ du héros.
export const SPAWN = { x: 25.2, z: 23.8 };
