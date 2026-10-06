// Les intérieurs : une petite pièce par maison où l'on peut entrer. Que de la
// donnée : world/interior.js les bâtit, game/doors.js relie chaque pièce à la
// porte de sa maison (HOUSES de world/layout.js).
//
// Chaque pièce est une grille comme celle du village (lettres de world/map.js) :
// murs au nord et sur les côtés, muret bas au sud, un seuil P au milieu du
// muret, par où l'on ressort. Repère propre à la pièce : x vers l'est, z vers
// le sud, la case (0, 0) au coin nord-ouest. La face intérieure du mur nord
// est en z = 1, celle du mur ouest en x = 1, celle du mur est en x = largeur - 1.
//
// house : la maison du village dont la porte mène ici ; lieu : clé du nom
// affiché en entrant (textesInterface.lieux) ; entry : où l'on apparaît en
// entrant, face au nord ; reserve : rectangles [x, z, largeur, profondeur] de
// cases pleines sous les gros meubles (collision et ombre au sol) ; props : le
// mobilier (type, position ; voir world/furniture.js et world/landmarks.js).
// Un coffre avec tokens en contient : on les gagne en s'en approchant. Les
// boiseries (plinthes, lisse, poteaux, corniche, main courante) sont ajoutées
// d'office d'après la grille.

export const ROOMS = {
  // La maison du héros, de l'autre côté du pont : là où la partie commence.
  // Un lit, une cheminée et sa marmite, des herbes qui sèchent, la
  // bibliothèque des grimoires, le pupitre où l'on apprend.
  maison: {
    house: 'maison',
    lieu: 'maison',
    rows: [
      'MMMMMMM',
      'MfffffM',
      'MfffffM',
      'MfffffM',
      'MfffffM',
      'mmmPmmm',
    ],
    entry: { x: 3.5, z: 4.4 },
    // Au tout début de la partie : debout près du lit, face à Claudette.
    start: { x: 2.6, z: 2.5, direction: 'right' },
    reserve: [[1, 1, 1, 2]],
    props: [
      { type: 'bed', x: 1.5, z: 2.0 },
      { type: 'rug', x0: 2.2, z0: 2.5, x1: 3.7, z1: 4.0 },
      { type: 'fireplace', x: 3.5, z: 1 },
      { type: 'cauldron', x: 3.5, z: 1 },
      { type: 'window', x: 1.5, z: 1, y: 1.3 },
      { type: 'curtain', x: 1.5, z: 1, y: 1.3 },
      { type: 'herbs', x0: 2.25, x1: 2.85, z: 1, y: 1.8 },
      { type: 'bookshelf', x0: 4.65, x1: 6.0, z: 1, height: 1.9 },
      { type: 'chest', x: 5.6, z: 2.6, tokens: 5 },
      { type: 'desk', x: 4.9, z: 3.9 },
      { type: 'candle', x: 5.3, z: 3.62, y: 0.78 },
      { type: 'stool', x: 4.9, z: 4.6 },
      { type: 'sconce', x: 1, z: 3.3, side: 'west' },
      { type: 'sconce', x: 6, z: 3.6, side: 'east' },
      { type: 'basket', x: 2.0, z: 4.4 },
    ],
  },

  // L'auberge : un comptoir où Berthe vend ses tenues, un tonnelet derrière,
  // des tables, des tabourets, un lustre, un bon feu.
  auberge: {
    house: 'auberge',
    lieu: 'auberge',
    rows: [
      'MMMMMMMMMM',
      'MffffffffM',
      'MffffffffM',
      'MffffffffM',
      'MffffffffM',
      'MffffffffM',
      'mmmmmPmmmm',
    ],
    entry: { x: 5.5, z: 5.4 },
    props: [
      { type: 'counter', x0: 5.1, x1: 8.95, z: 2.45 },
      { type: 'shelf', x0: 5.3, x1: 8.8, z: 1 },
      { type: 'keg', x: 8.55, z: 1.75 },
      { type: 'fireplace', x: 2.4, z: 1 },
      { type: 'cauldron', x: 2.4, z: 1 },
      { type: 'window', x: 4.2, z: 1, y: 1.1 },
      { type: 'curtain', x: 4.2, z: 1, y: 1.1 },
      { type: 'table', x: 2.3, z: 3.7 },
      { type: 'table', x: 7.3, z: 4.6 },
      { type: 'candle', x: 6.0, z: 2.45, y: 1.05 },
      { type: 'candle', x: 7.3, z: 4.62, y: 0.78 },
      { type: 'candle', x: 2.3, z: 3.72, y: 0.78 },
      { type: 'stool', x: 5.8, z: 3.15 },
      { type: 'stool', x: 8.3, z: 3.15 },
      { type: 'barrel', x: 1.4, z: 5.3 },
      { type: 'barrel', x: 8.6, z: 5.4, height: 0.6 },
      { type: 'basket', x: 1.3, z: 4.45 },
      { type: 'rug', x0: 4.4, z0: 3.2, x1: 6.0, z1: 5.6 },
      { type: 'chandelier', x: 4.9, z: 4.3, y: 2.1 },
      { type: 'sconce', x: 1, z: 3.0, side: 'west', light: false },
      { type: 'sconce', x: 9, z: 4.8, side: 'east', light: false },
    ],
  },

  // La forge : le four rougeoyant, l'enclume des grandes pièces, les outils,
  // la meule, le baquet de trempe, des fers au mur.
  forge: {
    house: 'forge',
    lieu: 'forge',
    rows: [
      'SSSSSSSS',
      'SffffffS',
      'SffffffS',
      'SffffffS',
      'SffffffS',
      'sssPssss',
    ],
    entry: { x: 3.5, z: 4.4 },
    reserve: [[1, 1, 2, 1]],
    props: [
      { type: 'furnace', x: 2.0, z: 1 },
      { type: 'toolrack', x0: 3.9, x1: 5.6, z: 1 },
      { type: 'horseshoes', x0: 5.85, x1: 6.9, z: 1, y: 1.45 },
      { type: 'trough', x: 6.4, z: 1.75 },
      { type: 'anvil', x: 4.4, z: 2.9 },
      { type: 'grindstone', x: 6.3, z: 3.4 },
      { type: 'coal', x: 6.5, z: 4.45 },
      { type: 'crate', x: 1.4, z: 3.0 },
      { type: 'candle', x: 1.4, z: 3.0, y: 0.55 },
      { type: 'chest', x: 1.5, z: 4.1, tokens: 5 },
      { type: 'sconce', x: 1, z: 2.3, side: 'west' },
      { type: 'sconce', x: 7, z: 4.0, side: 'east' },
    ],
  },
};
