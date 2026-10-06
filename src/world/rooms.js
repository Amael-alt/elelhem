// Les intérieurs : une petite pièce par maison où l'on peut entrer. Que de la
// donnée : world/interior.js les bâtit, game/doors.js relie chaque pièce à la
// porte de sa maison (HOUSES de world/layout.js).
//
// Chaque pièce est une grille comme celle du village (lettres de world/map.js) :
// murs au nord et sur les côtés, muret bas au sud, un seuil P au milieu du
// muret, par où l'on ressort. Repère propre à la pièce : x vers l'est, z vers
// le sud, la case (0, 0) au coin nord-ouest. La face intérieure du mur nord
// est en z = 1.
//
// house : la maison du village dont la porte mène ici ; lieu : clé du nom
// affiché en entrant (textesInterface.lieux) ; entry : où l'on apparaît en
// entrant, face au nord ; reserve : rectangles [x, z, largeur, profondeur] de
// cases pleines sous les gros meubles (collision et ombre au sol) ; props : le
// mobilier (type, position ; voir world/furniture.js et world/landmarks.js).
// Un coffre avec tokens en contient : on les gagne en s'en approchant.

export const ROOMS = {
  // La maison du héros, de l'autre côté du pont : là où la partie commence.
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
      { type: 'fireplace', x: 3.5, z: 1 },
      { type: 'window', x: 1.5, z: 1, y: 1.3 },
      { type: 'window', x: 5.4, z: 1, y: 1.1 },
      { type: 'chest', x: 5.45, z: 1.5, tokens: 5 },
      { type: 'table', x: 4.9, z: 3.8 },
      { type: 'candle', x: 4.9, z: 3.82, y: 0.78 },
      { type: 'rug', x0: 2.2, z0: 2.5, x1: 3.7, z1: 4.0 },
    ],
  },

  // L'auberge : un comptoir où Berthe vend ses tenues, des tables, un bon feu.
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
      { type: 'fireplace', x: 2.4, z: 1 },
      { type: 'window', x: 4.2, z: 1, y: 1.1 },
      { type: 'table', x: 2.3, z: 3.7 },
      { type: 'table', x: 7.3, z: 4.6 },
      { type: 'candle', x: 6.0, z: 2.45, y: 1.05 },
      { type: 'candle', x: 7.3, z: 4.62, y: 0.78 },
      { type: 'candle', x: 2.3, z: 3.72, y: 0.78 },
      { type: 'barrel', x: 1.4, z: 5.3 },
      { type: 'barrel', x: 8.6, z: 3.4, height: 0.6 },
      { type: 'rug', x0: 4.4, z0: 3.2, x1: 6.0, z1: 5.6 },
    ],
  },

  // La forge : le four rougeoyant, l'enclume des grandes pièces, les outils.
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
      { type: 'toolrack', x0: 3.6, x1: 6.0, z: 1 },
      { type: 'anvil', x: 4.4, z: 2.9 },
      { type: 'barrel', x: 6.3, z: 1.5 },
      { type: 'crate', x: 6.3, z: 3.6 },
      { type: 'candle', x: 6.3, z: 3.6, y: 0.55 },
      { type: 'candle', x: 6.3, z: 1.5, y: 0.75 },
      { type: 'chest', x: 1.5, z: 3.9, tokens: 5 },
    ],
  },
};
