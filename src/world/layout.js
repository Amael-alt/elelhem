// L'implantation du village : où se posent les maisons, tours, chantier, puits
// et arbres, avec leurs réglages. Que de la donnée : world/village.js les
// bâtit, la grille de world/map.js leur laisse la place.
//
// Repère : x vers l'est, z vers le sud. Une maison est donnée par son coin
// nord-ouest (x, z) et son emprise en cases ; sa porte et ses fenêtres par côté
// (south, north, east, west) et décalage depuis le milieu du mur (voir
// world/props.js). Les positions des habitants sont dans data/characters.js.

// Maisons. wall : hauteur des murs, rise : montée du toit, ridge : axe du
// faîtage, chimney : position de la cheminée (part de la longueur et de la
// portée) avec chimneySize et chimneyRise pour une cheminée forte. walls :
// plaster (enduit et colombages, par défaut), stonewall (pierre de taille) ;
// roof : roof (tuiles, par défaut), slate (ardoise), thatch (chaume) ;
// planters : jardinières fleuries sous les fenêtres basses.
export const HOUSES = {
  // La forge : basse et large, une cheminée de brique très forte.
  forge: {
    x: 4, z: 7, sizeX: 5, sizeZ: 3, wall: 3.3, rise: 1.8, ridge: 'x', walls: 'stonewall', roof: 'slate',
    door: { side: 'south', offset: -0.7 },
    windows: [{ side: 'south', offset: 1.5 }, { side: 'south', offset: 0.4, y: 2.3 }],
    chimney: [0.82, 0.4], chimneySize: 0.9, chimneyRise: 1.4,
  },
  // La bibliothèque : haute, deux rangées de fenêtres.
  bibliotheque: {
    x: 11, z: 5, sizeX: 5, sizeZ: 4, wall: 5.6, rise: 2.3, ridge: 'x', roof: 'slate', planters: true,
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
    x: 23, z: 6, sizeX: 3, sizeZ: 3, wall: 4.2, rise: 2.0, ridge: 'x', roof: 'thatch', planters: true,
    door: { side: 'south', offset: 0 },
    windows: [{ side: 'east', offset: 0 }, { side: 'west', offset: 0 }, { side: 'south', offset: 0, y: 3.2 }, { side: 'east', offset: 0, y: 3.2 }],
    chimney: [0.25, 0.5],
  },
  // La guérite de la porte de la muraille.
  guerite: {
    x: 3, z: 10, sizeX: 2, sizeZ: 2, wall: 2.9, rise: 1.3, ridge: 'x', walls: 'stonewall', roof: 'slate',
    door: { side: 'south', offset: 0 },
    windows: [{ side: 'east', offset: 0 }],
  },
  // La maison du héros, dans la prairie de l'est, de l'autre côté du pont :
  // petite, chaume et jardinières. La partie commence dedans.
  maison: {
    x: 35, z: 4, sizeX: 3, sizeZ: 3, wall: 3.4, rise: 2.0, ridge: 'x', roof: 'thatch', planters: true,
    door: { side: 'south', offset: 0 },
    windows: [{ side: 'south', offset: 1.0 }, { side: 'west', offset: 0 }, { side: 'south', offset: -0.6, y: 2.3 }],
    chimney: [0.5, 0.25],
  },
  // L'auberge : la plus grande maison, cheminée qui fume.
  auberge: {
    x: 7, z: 19, sizeX: 6, sizeZ: 4, wall: 4.8, rise: 2.2, ridge: 'x', planters: true,
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
  architecte: { x: 18, z: 2, size: 3, wall: 7.4, rise: 3.2, windowHeights: [2.6, 4.3, 6.0], roof: 'slate' },
  colombier: { x: 26, z: 18, size: 2, wall: 4.6, rise: 2.0, holes: true, roof: 'thatch' },
};

// Le chantier : bâtiment à moitié monté, échafaudage sur ses faces sud et ouest.
export const SITE = { x: 26, z: 22, sizeX: 4, sizeZ: 3 };

export const WELL = { x: 19.5, z: 14.5 };
export const HEARTH = { x: 8.0, z: 11.0 };
export const ANVIL = { x: 6.7, z: 11.9 };

// Petits objets : tonneaux, caisses, bancs, enseigne, potagers.
export const BARRELS = [
  { x: 9.7, z: 10.6 }, { x: 9.65, z: 11.3, height: 0.6 },
  { x: 7.5, z: 23.5 }, { x: 12.0, z: 23.5 }, { x: 12.5, z: 23.9, height: 0.6 },
];
export const CRATES = [
  { x: 15.7, z: 9.5 }, { x: 22.5, z: 9.6 }, { x: 23.2, z: 25.4, size: 0.5 },
];
export const BENCHES = [{ x: 16.9, z: 11.9 }, { x: 22.3, z: 17.7 }, { x: 8.7, z: 23.7 }];
export const SIGN = { x: 12.3, z: 23.0, y: 2.4 };
export const VEGETABLES = [
  { x0: 27.5, z0: 6.5, x1: 28.5, z1: 8.5 }, // jardin de simples de l'apothicaire
  { x0: 14.4, z0: 22.5, x1: 16.4, z1: 22.5 }, // potager de l'auberge
];

// Étal de marché sur la place, barrières (tracés de segments droits), meules,
// rochers et feu de camp dans la prairie de l'est.
export const STALLS = [{ x: 22.6, z: 12.9 }];
export const FENCES = [
  [[34.2, 19.0], [37.6, 19.0]], [[34.2, 19.0], [34.2, 25.6]], [[34.2, 25.6], [37.6, 25.6]],
  [[3.2, 24.6], [6.6, 24.6]], [[21.6, 27.0], [24.0, 27.0]],
];
export const HAYSTACKS = [{ x: 35.6, z: 21.0 }, { x: 36.6, z: 23.6 }, { x: 31.6, z: 25.4 }];
export const ROCKS = [
  { x: 33.5, z: 27.2, size: 1.1 }, { x: 28.5, z: 28.6 }, { x: 3.5, z: 5.6, size: 1.2 }, { x: 15.2, z: 28.3, size: 0.8 },
  { x: 33.4, z: 8.8 }, { x: 8.0, z: 16.6, size: 0.7 }, { x: 24.2, z: 4.6, size: 0.8 },
];
export const CAMPFIRE = { x: 36.0, z: 11.6 };

// Terrasse de l'auberge, pots de fleurs aux portes, poteaux indicateurs aux
// carrefours, tas de bois de la forge.
export const TABLES = [{ x: 9.2, z: 25.5 }, { x: 14.8, z: 26.9 }];
export const FLOWER_POTS = [
  { x: 12.8, z: 9.4 }, { x: 14.2, z: 9.4 }, { x: 9.8, z: 23.4 }, { x: 11.2, z: 23.4 },
  { x: 23.8, z: 9.4 }, { x: 25.2, z: 9.4 }, { x: 18.75, z: 5.4 }, { x: 20.25, z: 5.4 },
];
export const SIGNPOSTS = [{ x: 13.2, z: 13.3 }, { x: 21.2, z: 19.4 }, { x: 29.0, z: 13.1 }];
export const WOODPILE = { x: 3.4, z: 8.6 };

// Guirlandes de fanions : attachées au sommet des quatre lanternes de la
// place, elles en font le tour.
export const BUNTING = [
  { from: [14.6, 2.45, 11.6], to: [24.4, 2.45, 11.6], sag: 0.4 },
  { from: [14.6, 2.45, 17.4], to: [24.4, 2.45, 17.4], sag: 0.4 },
  { from: [14.6, 2.45, 11.6], to: [14.6, 2.45, 17.4], sag: 0.3 },
  { from: [24.4, 2.45, 11.6], to: [24.4, 2.45, 17.4], sag: 0.3 },
];

// Papillons : [x, z, rayon de vol] au-dessus des prés et des jardins.
export const BUTTERFLIES = [
  [35.5, 8, 2], [35.5, 22, 2], [8, 17, 2], [26, 27.5, 2], [10, 3.5, 1.8], [27.9, 7.5, 1], [15.2, 22.4, 1.2], [5, 27.5, 1.8],
];

// Quatre lanternes éclairantes (une vraie lumière, des ombres calculées une
// seule fois) aux coins de la place, et des lanternes d'ambiance (flamme
// seulement, le bloom fait le halo) : trop de lumières ralentiraient les
// téléphones.
export const LANTERNS = [[14.6, 11.6], [24.4, 11.6], [14.6, 17.4], [24.4, 17.4]];
export const DECOR_LANTERNS = [
  [12.2, 9.7], [26.3, 10.7], [17.6, 5.7], [4.9, 12.4], [13.2, 24.4], [29.4, 13.3], [33.6, 16.6], [23.6, 21.6],
];

// Arbres : position du tronc, taille (1 : moyen, soit deux personnages de haut ; les
// tailles valent 1,3 à 1,7 depuis la version 1.4, pour des arbres de trois personnages), feuillage ('vert' par défaut,
// 'automne' pour les roux de la prairie de l'est et du sud).
export const TREES = [
  [5.2, 4.8, 1.6], [8.6, 4.0, 1.45], [9.7, 5.8, 1.31], [17.3, 7.6, 1.38], [22.0, 4.0, 1.6],
  [25.5, 3.5, 1.45], [33.4, 8.8, 1.6, 'automne'], [35.5, 10.0, 1.45, 'automne'], [36.2, 20.5, 1.74, 'automne'],
  [34.5, 24.0, 1.52, 'automne'], [4.5, 17.5, 1.6], [5.0, 22.0, 1.45, 'automne'], [16.5, 27.0, 1.45],
  [24.5, 28.0, 1.67, 'automne'], [9.0, 27.5, 1.31], [28.5, 12.0, 1.31], [12.0, 14.0, 1.16], [3.8, 27.0, 1.52],
];

// Buissons : position, taille (1 : à hauteur de genou).
export const BUSHES = [
  [9.6, 9.6, 1], [3.6, 9.6, 0.9], [16.4, 8.6, 1], [10.4, 8.8, 0.8], [22.6, 8.8, 0.9], [26.0, 4.4, 1],
  [6.6, 18.6, 1.1], [13.6, 19.6, 0.9], [6.4, 23.2, 1], [21.0, 21.5, 0.9], [25.6, 17.2, 0.8], [30.0, 21.0, 1],
  [33.0, 11.0, 1.1], [36.5, 12.5, 0.9], [36.0, 17.0, 1], [29.6, 27.5, 1.1], [17.6, 26.0, 0.9], [11.0, 27.6, 1],
  [2.6, 28.0, 1], [7.4, 4.6, 0.9], [14.0, 3.4, 1], [27.6, 3.2, 1],
];

// Prés fleuris (rectangles x0, z0, x1, z1 en cases) : les touffes y sont
// souvent en fleurs.
export const MEADOWS = [[33, 3, 37, 28], [3, 16, 12, 18], [22, 26, 30, 29], [6, 3, 17, 4], [3, 26, 17, 29]];

// Lucioles : [x, z, rayon] des coins où elles se rassemblent.
export const FIREFLY_ANCHORS = [
  [6, 4.5, 2.5], [22, 4, 2.5], [34, 8, 2.5], [9, 26, 2.5], [36, 21, 2.5], [28, 11.5, 2.5], [17, 16, 4], [29, 24, 2],
];

// Rayons de soleil : centre, longueur, largeur, opacité (0,06 à 0,12).
export const SUN_RAYS = [
  { center: [10, 4.5, 13], length: 12, width: 1.6, opacity: 0.1 },
  { center: [16, 4.5, 9], length: 11, width: 0.9, opacity: 0.08 },
  { center: [21.5, 4.5, 15], length: 13, width: 2.0, opacity: 0.12 },
  { center: [27, 4.5, 12], length: 10, width: 1.2, opacity: 0.07 },
  { center: [13, 4.5, 21], length: 12, width: 1.4, opacity: 0.06 },
];

// Pigeons du colombier : centre du vol (x, y, z), rayon, nombre.
export const PIGEONS = { center: [27, 4.6, 19], radius: 2.6, count: 6 };

// Quartiers, pour le bandeau de lieu : rectangles [x0, z0, x1, z1] en unités,
// le premier qui contient le héros l'emporte. Noms dans data/dialogues.js.
export const REGIONS = [
  { id: 'tour', rect: [17, 2, 21.5, 7.5] },
  { id: 'bibliotheque', rect: [10, 4, 16.5, 10.5] },
  { id: 'apothicairerie', rect: [22, 5, 29.5, 10.5] },
  { id: 'forge', rect: [3, 6, 10, 13] },
  { id: 'porte', rect: [0, 9, 5, 17] },
  { id: 'place', rect: [13.5, 10.5, 26, 18.6] },
  { id: 'pont', rect: [28, 12, 33.5, 17] },
  { id: 'colombier', rect: [24.5, 16.5, 29.5, 21] },
  { id: 'chantier', rect: [21, 21, 31, 28.5] },
  { id: 'auberge', rect: [6, 19, 18, 26.5] },
  { id: 'maison', rect: [33.5, 3, 38, 9.5] },
  { id: 'prairie', rect: [33.5, 3, 38, 28.5] },
];

// La cascade : la rivière du plateau tombe dans le village, face sud de la
// falaise nord.
export const WATERFALL = { x0: 30, x1: 33, z: 2, top: 1.55, bottom: -0.35 };

// Départ du héros.
export const SPAWN = { x: 18.0, z: 17.0 };
