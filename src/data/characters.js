// Les personnages du village : que de la donnée. Chacun nomme sa planche de
// sprite (data/sprites/, grilles transcrites d'après une fiche dessinée) et
// garde une palette de quatre rampes (peau, vêtement, accent, cheveux, du plus
// sombre au plus clair), qui ne sert plus qu'aux échantillons de la boutique.
//
// FORMAT GELÉ (étape 1e, allégé en version 1.4) : un personnage est un objet
//   {
//     id,          identifiant unique
//     nom,         nom affiché dans la boîte de dialogue
//     sprite,      nom de sa planche dans data/sprites/index.js (version 1.4)
//     palette,     { peau, vetement, accent, cheveux } et parfois lumiere
//     position,    { x, z } dans le village, ou null pour le héros (point de départ)
//     direction,   'down' | 'left' | 'right' | 'up' : où il regarde au repos
//     dialogue,    clé de son texte dans data/dialogues.js, ou null
//     lieu,        facultatif (étape 3c) : la pièce où il se tient (clé de
//                  world/rooms.js) ; sa position est alors celle de la pièce
//     depart,      facultatif (étape 3c) : { lieu, x, z, direction }, où il
//                  attend au tout début, avant la première conversation
//   }
// Le moteur ne lit que ces champs : un nouvel habitant n'est que de la donnée,
// plus une planche. Les portraits de dialogue (assets/portraits/) portent l'id.

// Le héros, dans l'esprit d'Elliot (The Adventures of Elliot, de l'équipe
// d'Octopath Traveler) : chapeau rouge à large bord et plume dorée, cheveux
// blond pâle, écharpe rouge jetée sur l'épaule, veste claire barrée d'une
// sangle de cuir, bottes brunes, sacoche. Sans épée dans le village : elle
// viendra avec la lande, hors les murs. Aucun trait de genre.
export const hero = {
  id: 'heros',
  sprite: 'heros',
  nom: 'Voyageur',
  position: null,
  direction: 'down',
  dialogue: null,
  palette: {
    peau: ['#8a5a44', '#b67c5d', '#d9a07c', '#efc29b'],
    vetement: ['#6e6252', '#9a8c78', '#c4b59c', '#e8dcc3'],
    accent: ['#6e1a1e', '#a1262a', '#cf3b36', '#ef6a58'],
    cheveux: ['#8a6a2a', '#b89446', '#dcc073', '#f3e2a4'],
  },
  // Le chapeau (accent) et sa plume (la rampe des cheveux, blond doré),
  // l'écharpe (accent) nouée au cou dont le pan tombe sur l'épaule gauche du
  // héros, la sangle (cuir) en travers de la veste.
};

// Claudette, notre sœur (un clin d'œil à Claude) : la guide. Elle nous donne
// la quête dans la maison, au début, puis nous attend sur la place. Queue de
// cheval auburn, robe vert sauge, une sacoche en bandoulière avec son fermoir.
export const claudette = {
  id: 'claudette',
  voix: 1.2, // hauteur de sa voix dans les dialogues (1 : moyenne)
  sprite: 'claudette',
  nom: 'Claudette',
  palette: {
    peau: ['#9a6650', '#c48a6a', '#e2ab88', '#f5cba8'],
    vetement: ['#2c3d2a', '#45603f', '#628457', '#86a877'],
    accent: ['#6b4e10', '#a67c1c', '#d9a935', '#ffd96a'],
    cheveux: ['#4a1e12', '#6e2e1a', '#94431f', '#b8612e'],
  },
  position: { x: 24.4, z: 21.0 },
  direction: 'down',
  depart: { lieu: 'maison', x: 5.0, z: 3.5, direction: 'left' },
  dialogue: 'claudette',
};

// L'Oracle Gépété : un vieux magicien qui sait plein de choses, et qui se
// trompe parfois avec aplomb. Il se sert de la magie LIA. Chapeau pointu à
// large bord, longue barbe blanche, robe bleue, et un bâton qui porte la
// lumière de la magie (lettre l : elle brille, même à l'ombre).
export const gepeto = {
  id: 'gepeto',
  voix: 0.72, // hauteur de sa voix dans les dialogues (1 : moyenne)
  sprite: 'gepeto',
  nom: "L'Oracle Gépété",
  palette: {
    peau: ['#8a5d4a', '#b0806a', '#d2a184', '#ebc3a4'],
    vetement: ['#1b2550', '#2a3a78', '#3d55a3', '#5f7cc8'],
    accent: ['#2a1a4a', '#40296e', '#5c3f96', '#7d5fbd'],
    cheveux: ['#8f8f9c', '#b8b8c6', '#dcdce6', '#f7f7fb'],
  },
  position: { x: 30.0, z: 22.0 },
  direction: 'down',
  dialogue: 'gepeto',
};

// Maître Ferrand, le forgeron, devant son enclume : barbe courte, tablier de
// cuir, et son marteau posé sur l'épaule.
export const ferrand = {
  id: 'ferrand',
  voix: 0.62, // hauteur de sa voix dans les dialogues (1 : moyenne)
  sprite: 'ferrand',
  nom: 'Maître Ferrand',
  palette: {
    peau: ['#7a4b36', '#a56a4c', '#c78d68', '#e0aa84'],
    vetement: ['#3a1e1a', '#5a2b24', '#7c3b30', '#a04e3f'],
    accent: ['#2a2d35', '#43485a', '#69708a', '#96a0b8'],
    cheveux: ['#1b1411', '#2a1d17', '#3a2a20', '#4d382a'],
  },
  position: { x: 9.6, z: 11.4 },
  direction: 'up',
  dialogue: 'ferrand',
};

// Dame Marjolaine, la bibliothécaire, devant sa porte : lunettes rondes et un
// livre tenu à deux mains.
export const marjolaine = {
  id: 'marjolaine',
  voix: 1.08, // hauteur de sa voix dans les dialogues (1 : moyenne)
  sprite: 'marjolaine',
  nom: 'Dame Marjolaine',
  palette: {
    peau: ['#a9755c', '#cf9a7c', '#ebb999', '#f8d3b8'],
    vetement: ['#2d1c3b', '#47295c', '#65407f', '#8760a3'],
    accent: ['#10343a', '#1a5560', '#2a7a85', '#4aa3ad'],
    cheveux: ['#4a4048', '#6b5f67', '#8f828b', '#b5a8b0'],
  },
  position: { x: 16.0, z: 12.7 },
  direction: 'down',
  dialogue: 'marjolaine',
};

// Basile, l'apothicaire, à l'entrée de son jardin : une fiole levée, dont le
// remède luit d'un vert douteux.
export const basile = {
  id: 'basile',
  voix: 0.95, // hauteur de sa voix dans les dialogues (1 : moyenne)
  sprite: 'basile',
  nom: 'Basile',
  palette: {
    peau: ['#8d6048', '#b88265', '#dba585', '#f1c7a8'],
    vetement: ['#162e22', '#234a36', '#336a4d', '#4c8f6b'],
    accent: ['#1b6b3a', '#2fae5b', '#65e082', '#b6ffbf'],
    cheveux: ['#5a5a5e', '#807f84', '#a9a8ad', '#d2d1d6'],
  },
  position: { x: 37.2, z: 14.7 },
  direction: 'down',
  dialogue: 'basile',
};

// Pépin, le messager, au pied du colombier : un pigeon perché sur l'épaule et
// la courroie de sa sacoche en travers de la poitrine.
export const pepin = {
  id: 'pepin',
  voix: 1.3, // hauteur de sa voix dans les dialogues (1 : moyenne)
  sprite: 'pepin',
  nom: 'Pépin',
  palette: {
    peau: ['#8a5a44', '#b67c5d', '#d9a07c', '#efc29b'],
    vetement: ['#14343f', '#1f5163', '#2f7490', '#4b9ab8'],
    accent: ['#4a5468', '#6f7b92', '#9aa6bd', '#d0d8e6'],
    cheveux: ['#5a3a1f', '#7d5230', '#a06f43', '#c3935f'],
  },
  position: { x: 38.8, z: 27.3 },
  direction: 'up',
  dialogue: 'pepin',
};

// Capitaine Rocard, le garde, à la porte de la muraille : casque à plumet
// rouge et à joues, hallebarde tenue droite.
export const rocard = {
  id: 'rocard',
  voix: 0.78, // hauteur de sa voix dans les dialogues (1 : moyenne)
  sprite: 'rocard',
  nom: 'Capitaine Rocard',
  palette: {
    peau: ['#845542', '#ae7960', '#d19b7a', '#e8bc9a'],
    vetement: ['#4a1218', '#721d26', '#9b2f3a', '#c4505a'],
    accent: ['#3b4048', '#5d646f', '#8a929f', '#bcc4d0'],
    cheveux: ['#1d1815', '#2e2520', '#43372f', '#5a4a3f'],
  },
  position: { x: 5.4, z: 19.2 },
  direction: 'down',
  dialogue: 'rocard',
};

// Berthe, l'aubergiste, derrière son comptoir : un foulard crème noué sur les
// cheveux et une cruche à la main.
export const berthe = {
  id: 'berthe',
  voix: 1, // hauteur de sa voix dans les dialogues (1 : moyenne)
  sprite: 'berthe',
  nom: 'Berthe',
  palette: {
    peau: ['#a06a52', '#c78b6c', '#e5ab88', '#f6cba9'],
    vetement: ['#4d1626', '#752536', '#a13a4a', '#c75d68'],
    accent: ['#a59a86', '#cfc4ad', '#ece3cf', '#fbf6ea'],
    cheveux: ['#5b2f1c', '#80482b', '#a8683f', '#cf8f5e'],
  },
  // Derrière son comptoir, dans l'auberge (coordonnées de la pièce, world/rooms.js).
  lieu: 'auberge',
  position: { x: 8.6, z: 1.7 },
  direction: 'down',
  dialogue: 'berthe',
};

// Maître Gaspard, le chef de chantier, face à son échafaudage : une règle
// graduée dans une main, le rouleau des plans sous l'autre bras.
export const gaspard = {
  id: 'gaspard',
  voix: 0.85, // hauteur de sa voix dans les dialogues (1 : moyenne)
  sprite: 'gaspard',
  nom: 'Maître Gaspard',
  palette: {
    peau: ['#7c4f3a', '#a56f52', '#c99172', '#e3b190'],
    vetement: ['#4a3414', '#725020', '#a37530', '#d1a350'],
    accent: ['#8c7c5c', '#b8a67e', '#dcca9c', '#f5e8c4'],
    cheveux: ['#2f2118', '#47321f', '#63472d', '#81603d'],
  },
  position: { x: 31.4, z: 35.4 },
  direction: 'right',
  dialogue: 'gaspard',
};

// Clodomir, l'architecte, devant sa tour : barbe blanche taillée court et un
// grand compas d'or ouvert dans la main.
export const clodomir = {
  id: 'clodomir',
  voix: 0.8, // hauteur de sa voix dans les dialogues (1 : moyenne)
  sprite: 'clodomir',
  nom: 'Clodomir',
  palette: {
    peau: ['#94644e', '#bd8a6c', '#dfac8a', '#f3ccaa'],
    vetement: ['#231a3d', '#372a5e', '#4f3d84', '#6e5aa8'],
    accent: ['#6b4e10', '#a67c1c', '#d9a935', '#ffd96a'],
    cheveux: ['#8a8a99', '#b0b0c0', '#d4d4e2', '#f2f2fa'],
  },
  position: { x: 27.3, z: 9.0 },
  direction: 'down',
  dialogue: 'clodomir',
};

// Le marchand de fioles du marché et la lavandière du lavoir (version 2.3) :
// des figurants qui ne bougent pas, se tournent vers le héros et lancent une
// réplique quand on passe (data/dialogues.js, repliques). L'étal du marchand
// vend les fioles par un point d'action (game/spots.js), pas par un dialogue.
export const marchand = {
  id: 'marchand',
  voix: 0.92, // hauteur de sa voix dans les dialogues (1 : moyenne)
  sprite: 'marchand',
  nom: 'Marchand',
  palette: {
    peau: ['#8a5a44', '#b67c5d', '#d9a07c', '#efc29b'],
    vetement: ['#7a4e12', '#a86f1c', '#d19a2c', '#e8b84a'],
    accent: ['#3a2a1a', '#5a4028', '#7a5636', '#9a7048'],
    cheveux: ['#6a6a66', '#8a8a86', '#aaaaa6', '#cacac6'],
  },
  position: { x: 33.1, z: 30.4 },
  direction: 'left',
  dialogue: null,
  figurant: true,
};

export const lavandiere = {
  id: 'lavandiere',
  voix: 1.15, // hauteur de sa voix dans les dialogues (1 : moyenne)
  sprite: 'lavandiere',
  nom: 'Lavandière',
  palette: {
    peau: ['#9a6650', '#c48a6a', '#e2ab88', '#f5cba8'],
    vetement: ['#1f4a52', '#2e6a72', '#3f8a92', '#5aaab0'],
    accent: ['#6a7a90', '#8a9ab0', '#aab8c8', '#d0dce8'],
    cheveux: ['#5a2a14', '#8a4420', '#b45e2e', '#d07a44'],
  },
  position: { x: 39.3, z: 37.6 },
  direction: 'right',
  dialogue: null,
  figurant: true,
};

// Les apprentis du chantier : figurants qui font des allers-retours le long de
// leur trajet (points { x, z }, parcourus puis repris à l'envers). Pas
// d'accessoire, pas de dialogue, pas d'étiquette de nom.
const apprenti = (id, palette, trajet) => ({
  id,
  nom: 'Apprenti',
  sprite: 'apprenti',
  palette,
  position: { x: trajet[0][0], z: trajet[0][1] },
  direction: 'down',
  dialogue: null,
  trajet,
});

export const figurants = [
  apprenti('apprenti-1', {
    peau: ['#8a5a44', '#b67c5d', '#d9a07c', '#efc29b'],
    vetement: ['#3b3a2a', '#575540', '#7a7758', '#a09c72'],
    accent: ['#4a2a28', '#6e3b31', '#93533f', '#b56f4f'],
    cheveux: ['#2a1d18', '#3f2b22', '#58402f', '#73563f'],
  }, [[30.4, 36.0], [30.4, 40.0]]),
  apprenti('apprenti-2', {
    peau: ['#a9755c', '#cf9a7c', '#ebb999', '#f8d3b8'],
    vetement: ['#4a2f2a', '#6e4439', '#966252', '#bd8570'],
    accent: ['#1f2944', '#2d3d60', '#3f557d', '#5a7199'],
    cheveux: ['#7a5a2a', '#a07c3a', '#c7a352', '#e3c677'],
  }, [[32.2, 38.8], [38.8, 38.8]]),
  apprenti('apprenti-3', {
    peau: ['#7c4f3a', '#a56f52', '#c99172', '#e3b190'],
    vetement: ['#233a44', '#35566a', '#4d7a93', '#6ea0ba'],
    accent: ['#4a2a28', '#6e3b31', '#93533f', '#b56f4f'],
    cheveux: ['#1b1411', '#2a1d17', '#3a2a20', '#4d382a'],
  }, [[9.1, 20.4], [16.8, 20.4]]),
  marchand,
  lavandiere,
];

// Les habitants du village, dans l'ordre où ils sont posés.
export const villagers = [claudette, gepeto, ferrand, marjolaine, basile, pepin, rocard, berthe, gaspard, clodomir];
