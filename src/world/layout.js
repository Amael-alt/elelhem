// L'implantation du village : où se posent les maisons, tours, chantier, puits
// et arbres, avec leurs réglages. Que de la donnée : world/village.js les
// bâtit, la grille de world/map.js leur laisse la place.
//
// Repère : x vers l'est, z vers le sud. Une maison est donnée par son coin
// nord-ouest (x, z) et son emprise en cases ; sa porte et ses fenêtres par côté
// (south, north, east, west) et décalage depuis le milieu du mur (voir
// world/props.js). Les positions des habitants sont dans data/characters.js.

// Maisons à colombages. wall : hauteur des murs, rise : montée du toit, ridge :
// axe du faîtage, chimney : position de la cheminée (part de la longueur et de
// la portée) avec chimneySize et chimneyRise pour une cheminée forte.
export const HOUSES = {
  // La forge : basse et large, une cheminée de brique très forte.
  forge: {
    x: 4, z: 7, sizeX: 5, sizeZ: 3, wall: 2.5, rise: 1.4, ridge: 'x',
    door: { side: 'south', offset: -0.7 },
    windows: [{ side: 'south', offset: 1.5 }],
    chimney: [0.82, 0.4], chimneySize: 0.9, chimneyRise: 1.4,
  },
  // La bibliothèque : haute, deux rangées de fenêtres.
  bibliotheque: {
    x: 11, z: 5, sizeX: 5, sizeZ: 4, wall: 3.4, rise: 1.8, ridge: 'x',
    door: { side: 'south', offset: 0 },
    windows: [
      { side: 'south', offset: -1.7 }, { side: 'south', offset: 1.7 },
      { side: 'south', offset: -1.7, y: 2.3 }, { side: 'south', offset: 1.7, y: 2.3 }, { side: 'south', offset: 0, y: 2.35 },
      { side: 'west', offset: 0 }, { side: 'west', offset: 0, y: 2.3 },
    ],
    chimney: [0.8, 0.3],
  },
  // L'apothicairerie : étroite, ouverte sur son jardin de simples à l'est.
  apothicairerie: {
    x: 23, z: 6, sizeX: 3, sizeZ: 3, wall: 2.5, rise: 1.5, ridge: 'x',
    door: { side: 'south', offset: 0 },
    windows: [{ side: 'east', offset: 0 }, { side: 'west', offset: 0 }],
    chimney: [0.25, 0.5],
  },
  // La guérite de la porte de la muraille.
  guerite: {
    x: 3, z: 10, sizeX: 2, sizeZ: 2, wall: 2.2, rise: 1.0, ridge: 'x',
    door: { side: 'south', offset: 0 },
    windows: [{ side: 'east', offset: 0 }],
  },
  // L'auberge : la plus grande maison, cheminée qui fume.
  auberge: {
    x: 7, z: 19, sizeX: 6, sizeZ: 4, wall: 2.8, rise: 1.7, ridge: 'x',
    door: { side: 'south', offset: 0.5 },
    windows: [{ side: 'south', offset: -1.7 }, { side: 'south', offset: 1.9 }, { side: 'west', offset: 0 }],
    chimney: [0.8, 0.4],
  },
};

// Tours à toit en pyramide.
export const TOWERS = {
  architecte: { x: 18, z: 2, size: 3, wall: 5.6, rise: 2.6, windowHeights: [2.6, 4.2] },
  colombier: { x: 26, z: 18, size: 2, wall: 3.6, rise: 1.6, holes: true },
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

// Quatre lanternes éclairantes (une vraie lumière, des ombres calculées une
// seule fois) aux coins de la place, et des lanternes d'ambiance (flamme
// seulement, le bloom fait le halo) : trop de lumières ralentiraient les
// téléphones.
export const LANTERNS = [[14.6, 11.6], [24.4, 11.6], [14.6, 17.4], [24.4, 17.4]];
export const DECOR_LANTERNS = [
  [12.2, 9.7], [26.3, 10.7], [17.6, 5.7], [4.9, 12.4], [13.2, 24.4], [29.4, 13.3], [33.6, 16.6], [23.6, 21.6],
];

// Arbres : position du tronc, taille (1 : moyen).
export const TREES = [
  [5.2, 4.8, 1.1], [8.6, 4.0, 1.0], [9.7, 5.8, 0.9], [17.3, 7.6, 0.95], [22.0, 4.0, 1.1],
  [25.5, 3.5, 1.0], [33.8, 6.5, 1.1], [35.5, 10.0, 1.0], [36.2, 20.5, 1.2], [34.5, 24.0, 1.05],
  [4.5, 17.5, 1.1], [5.0, 22.0, 1.0], [16.5, 27.0, 1.0], [24.5, 28.0, 1.15], [9.0, 27.5, 0.9],
  [28.5, 12.0, 0.9], [12.0, 14.0, 0.8], [3.8, 27.0, 1.05],
];

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

// Départ du héros.
export const SPAWN = { x: 18.0, z: 17.0 };
