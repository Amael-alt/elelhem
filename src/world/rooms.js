// Les intérieurs : une pièce par maison où l'on peut entrer. Que de la donnée :
// world/interior.js les bâtit, game/doors.js relie chaque pièce à la porte de
// sa maison (HOUSES de world/layout.js).
//
// Chaque pièce est une grille comme celle du village (lettres de world/map.js) :
// cases de mur au nord et sur les côtés, muret bas au sud, un seuil P (de
// bois) ou Q (de pierre) dans le muret, par où l'on ressort ; f un plancher de
// lattes, d des dalles. Les cases de mur ne servent qu'aux collisions :
// la cloison qu'on voit est mince, posée à leur bord intérieur. Repère propre
// à la pièce : x vers l'est, z vers le sud, la case (0, 0) au coin nord-ouest.
// La face intérieure du mur nord est en z = 1, celle du mur ouest en x = 1,
// celle du mur est en x = largeur - 1.
//
// house : la maison du village dont la porte mène ici ; lieu : clé du nom
// affiché en entrant (textesInterface.lieux) ; entry : où l'on apparaît en
// entrant, face au nord ; reserve : rectangles [x, z, largeur, profondeur] de
// cases pleines sous les gros meubles (collision et ombre au sol) ; props : le
// mobilier (type, position ; voir world/furniture.js et world/landmarks.js).
// Un coffre avec tokens en contient : on les gagne en s'en approchant. Les
// cloisons et les boiseries (plinthes, lisse, poteaux, sablière, main
// courante) sont ajoutées d'office d'après la grille.
//
// Version 1.2 : pièces agrandies (la maison fait 8 × 6 au lieu de 5 × 4).
// Version 1.3 : un tableau par mur libre, de la vaisselle sur les tables, une
// fenêtre à la forge (le jour entre en rais par les fenêtres, voir
// world/interior.js), ses dalles et son seuil de pierre.

export const ROOMS = {
  // La maison du héros, de l'autre côté du pont : là où la partie commence.
  // Un lit, une armoire, une fenêtre à rideaux, la cheminée et sa marmite, des
  // herbes qui sèchent, la bibliothèque des grimoires, le pupitre où l'on
  // apprend, une table pour manger.
  maison: {
    house: 'maison',
    lieu: 'maison',
    rows: [
      'MMMMMMMMMM',
      'MffffffffM',
      'MffffffffM',
      'MffffffffM',
      'MffffffffM',
      'MffffffffM',
      'MffffffffM',
      'mmmmPmmmmm',
    ],
    entry: { x: 4.5, z: 6.4 },
    // Au tout début de la partie : debout sur le tapis, face à Claudette.
    start: { x: 3.2, z: 3.6, direction: 'right' },
    reserve: [[1, 1, 1, 2]],
    props: [
      { type: 'bed', x: 1.6, z: 2.1 },
      { type: 'wardrobe', x: 2.75, z: 1 },
      { type: 'window', x: 4.1, z: 1, y: 1.3 },
      { type: 'curtain', x: 4.1, z: 1, y: 1.3 },
      { type: 'sconce', x: 4.9, z: 1, side: 'north' },
      { type: 'fireplace', x: 5.9, z: 1 },
      { type: 'cauldron', x: 5.9, z: 1 },
      { type: 'herbs', x0: 6.95, x1: 7.45, z: 1, y: 1.8 },
      { type: 'bookshelf', x0: 7.6, x1: 8.95, z: 1, height: 1.9 },
      { type: 'chest', x: 8.4, z: 2.9, tokens: 5 },
      { type: 'rug', x0: 3.0, z0: 3.0, x1: 4.9, z1: 5.0 },
      { type: 'desk', x: 7.3, z: 4.6 },
      { type: 'candle', x: 7.72, z: 4.32, y: 0.78 },
      { type: 'stool', x: 7.3, z: 5.35 },
      { type: 'table', x: 2.6, z: 5.4 },
      { type: 'tableware', x: 2.6, z: 5.4 },
      { type: 'basket', x: 1.5, z: 6.5 },
      { type: 'sconce', x: 1, z: 4.2, side: 'west' },
      { type: 'sconce', x: 9, z: 4.6, side: 'east' },
      // Au mur nord, au-dessus de la tête du lit : les murs est et ouest sont
      // vus de profil par la caméra, un tableau n'y serait qu'un trait.
      { type: 'painting', x: 1.7, z: 1, y: 1.5 },
    ],
  },

  // L'auberge : un long comptoir où Berthe vend ses tenues, le tonnelet
  // derrière, des tabourets, trois tables, un lustre, un bon feu.
  auberge: {
    house: 'auberge',
    lieu: 'auberge',
    rows: [
      'MMMMMMMMMMMMM',
      'MfffffffffffM',
      'MfffffffffffM',
      'MfffffffffffM',
      'MfffffffffffM',
      'MfffffffffffM',
      'MfffffffffffM',
      'MfffffffffffM',
      'mmmmmmPmmmmmm',
    ],
    entry: { x: 6.5, z: 7.4 },
    props: [
      { type: 'counter', x0: 6.2, x1: 11.9, z: 2.45 },
      { type: 'shelf', x0: 6.4, x1: 11.7, z: 1 },
      { type: 'keg', x: 11.4, z: 1.75 },
      { type: 'fireplace', x: 2.6, z: 1 },
      { type: 'cauldron', x: 2.6, z: 1 },
      { type: 'window', x: 4.6, z: 1, y: 1.1 },
      { type: 'curtain', x: 4.6, z: 1, y: 1.1 },
      { type: 'table', x: 2.6, z: 4.4 },
      { type: 'table', x: 4.6, z: 6.6 },
      { type: 'table', x: 10.0, z: 5.6 },
      { type: 'tableware', x: 2.6, z: 4.4 },
      { type: 'tableware', x: 4.6, z: 6.6 },
      { type: 'tableware', x: 10.0, z: 5.6 },
      { type: 'painting', x: 1.5, z: 1, y: 1.45 },
      { type: 'painting', x: 5.7, z: 1, y: 1.4 },
      { type: 'candle', x: 7.4, z: 2.45, y: 1.05 },
      { type: 'candle', x: 2.6, z: 4.42, y: 0.78 },
      { type: 'candle', x: 10.0, z: 5.62, y: 0.78 },
      { type: 'stool', x: 7.0, z: 3.2 },
      { type: 'stool', x: 8.7, z: 3.2 },
      { type: 'stool', x: 10.4, z: 3.2 },
      { type: 'barrel', x: 1.4, z: 6.9 },
      { type: 'barrel', x: 11.5, z: 7.0, height: 0.6 },
      { type: 'basket', x: 1.3, z: 5.4 },
      { type: 'rug', x0: 5.5, z0: 3.6, x1: 7.5, z1: 7.6 },
      { type: 'chandelier', x: 6.5, z: 5.4, y: 2.1 },
      { type: 'sconce', x: 1, z: 3.4, side: 'west', light: false },
      { type: 'sconce', x: 1, z: 6.2, side: 'west', light: false },
      { type: 'sconce', x: 12, z: 5.2, side: 'east', light: false },
    ],
  },

  // La forge : le four rougeoyant, l'enclume des grandes pièces, le râtelier,
  // l'établi, les fers au mur au-dessus du baquet de trempe, la meule.
  forge: {
    house: 'forge',
    lieu: 'forge',
    rows: [
      'SSSSSSSSSSS',
      'SdddddddddS',
      'SdddddddddS',
      'SdddddddddS',
      'SdddddddddS',
      'SdddddddddS',
      'SdddddddddS',
      'sssssQsssss',
    ],
    entry: { x: 5.5, z: 6.4 },
    reserve: [[1, 1, 3, 1]],
    props: [
      { type: 'furnace', x: 2.2, z: 1 },
      { type: 'window', x: 3.75, z: 1, y: 1.5, width: 0.7, height: 0.7 },
      { type: 'toolrack', x0: 4.4, x1: 6.4, z: 1 },
      { type: 'workbench', x0: 6.6, x1: 8.6, z: 1 },
      { type: 'horseshoes', x0: 8.8, x1: 9.9, z: 1, y: 1.45 },
      { type: 'trough', x: 9.4, z: 2.5 },
      { type: 'anvil', x: 5.2, z: 3.4 },
      { type: 'grindstone', x: 8.5, z: 4.4 },
      { type: 'coal', x: 1.6, z: 3.6 },
      { type: 'crate', x: 9.2, z: 6.0 },
      { type: 'candle', x: 9.2, z: 6.0, y: 0.55 },
      { type: 'barrel', x: 3.4, z: 6.2 },
      { type: 'chest', x: 1.5, z: 5.8, tokens: 5 },
      { type: 'sconce', x: 1, z: 3.0, side: 'west' },
      { type: 'sconce', x: 10, z: 4.6, side: 'east' },
    ],
  },
};
