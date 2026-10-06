// Rampes de couleurs du village, du ton le plus sombre au plus clair.
// Une seule palette pour tout le décor : c'est ce qui garde le village cohérent
// quand tout est généré par le code. Tons choisis pour une fin de journée,
// légèrement réchauffés ; la lumière de la scène fait le reste.

export const terrainRamps = {
  herbe: ['#1f321e', '#2b4425', '#38572b', '#4a6b31', '#5f8039', '#799745', '#97ae55'],
  terre: ['#2e2119', '#3f2f20', '#533d29', '#685033', '#7f633f', '#97784e'],
  paves: ['#2b2526', '#3c3433', '#4f4541', '#645850', '#7b6d60', '#948472', '#ad9c86'],
  eau: ['#13273d', '#1a3551', '#234665', '#2e597a', '#3e7090', '#5a8ba7', '#84aec2'],
};

// Maisons : enduit blanc cassé, colombages rouge sang de bœuf et tuiles canal,
// comme les maisons du Pays basque ; portes vertes, fenêtres éclairées.
export const buildingRamps = {
  enduit: ['#867a6b', '#9e917f', '#b6a994', '#cbbea8', '#dcd1bc', '#eae1ce'],
  bois: ['#2b1411', '#401c17', '#56261d', '#6d3224', '#843f2c'],
  tuiles: ['#3d1c17', '#5a2a20', '#7a3a28', '#984c31', '#b3623d', '#c97d4f'],
  briques: ['#3a1d18', '#552a20', '#71382a', '#8c4733', '#a5593f'],
  porte: ['#17241e', '#203328', '#2a4333', '#355440', '#43664e'],
  vitre: ['#6e3410', '#a8561a', '#dc862b', '#f7b852', '#ffdc93'],
  ardoise: ['#1c2131', '#283146', '#364260', '#47577b', '#5d6f95', '#7889ae'],
  chaume: ['#3f2c14', '#5f431d', '#82602a', '#a67f38', '#c69f4c', '#e0bf66'],
  pierre: ['#4a4440', '#5f5852', '#766e66', '#8d857a', '#a49b8e', '#bcb3a4'],
  toileRouge: ['#5a1414', '#851f1c', '#b03028', '#d0483a'],
  toileCreme: ['#9c8a6c', '#c4b08c', '#e2d0aa', '#f5e8c8'],
};

// Nature et socle : feuillage plus sombre et plus bleu que l'herbe, écorce,
// roche en strates sous la terre des flancs.
export const natureRamps = {
  feuillage: ['#15251a', '#1e3420', '#294525', '#36582b', '#456c32', '#57803b', '#6c9546'],
  ecorce: ['#231913', '#32251c', '#433226', '#563f30', '#6a4f3c'],
  roche: ['#29252a', '#383236', '#4a4244', '#5d5453', '#716662', '#877b74'],
};

// Ciel du soir : pêche vers le bas de l'image, bleu vers le haut, lueur chaude
// du côté du soleil.
export const skyColors = { bas: '#f6c9a0', haut: '#6f8fd1', soleil: '#ffd8a0' };

// Feuillage en grappes : une rampe de gris, teintée grappe par grappe.
export const foliageGreys = ['#2c2b2e', '#4b4a4c', '#6f6d6c', '#96938c', '#bdb8ac', '#e6dfcf'];
export const foliageTints = {
  vert: ['#9fce62', '#8fc257', '#b2d36c', '#86b85a'],
  automne: ['#f2a553', '#e3803f', '#f4c75e', '#d9693a'],
  buisson: ['#7fb251', '#8bbd58', '#74a64b'],
  haie: ['#6e9c45', '#77a64b', '#67933f'],
};

// Fleurs des prés : pétales blancs, jaunes, roses, bleus.
export const flowerColors = { blanc: '#f3eedf', jaune: '#f5cf48', rose: '#ee8aa2', bleu: '#8fb3f2' };

// Fanions de la place et papillons des prés.
export const buntingColors = ['#c8443a', '#e9b949', '#4f7fc0', '#efe6d2', '#5f9a4e', '#b1508a'];
export const butterflyColors = ['#f6f1e4', '#f3d25a', '#f0a6c0', '#a8c8f5'];

// Effets : lucioles vert-jaune, poussière dorée, fumée gris chaud, rayons.
export const effectColors = {
  luciole: '#d9ff7a',
  poussiere: '#ffd590',
  fumeeSombre: '#58524f',
  fumeeClaire: '#d9c3ad',
  rayon: '#ffd9a0',
  pigeon: '#9aa6bd',
  ecume: '#eef6ff',
};

// Fer des lanternes et des ferrures.
export const ironColor = '#2b2725';

// Lumière chaude des lanternes et des flammes.
export const lanternColor = '#ffb060';

// Brume chaude de fin de journée.
export const hazeColor = '#e8c9a0';

// Cuir des bottes et des ceintures, commun à tous les personnages.
export const leatherRamp = ['#2a1b16', '#46302a', '#634435', '#815b43'];

// Lumière propre aux personnages (le bâton de l'Oracle Gépété) : or pâle, du plus
// sombre au presque blanc. Ces pixels brillent même dans l'ombre.
export const glowRamp = ['#ffc56e', '#ffd88f', '#ffeab5', '#fff6dc'];

// Visage des personnages : bouche, joues, reflet des yeux.
export const faceColors = { bouche: '#8e4a40', joue: '#e8907f', reflet: '#fbf7ee' };

// Contour des personnages : sombre et bleuté, jamais noir pur.
export const outlineColor = '#1b1a2e';

// Silhouette du héros quand un mur ou un arbre le cache : sa planche teintée
// de bleu pâle, translucide, dessinée à travers l'obstacle.
export const ghostColor = '#b4c4ff';

// Ciel provisoire, en attendant la sphère de ciel de l'étape 1d : la couleur
// de la brume, pour que le lointain s'y fonde.
export const backgroundColor = hazeColor;

// Le diplôme : parchemin (du bord taché au cœur clair), encres, filets d'or et
// cire du sceau (du plus sombre au plus clair).
export const diplomaColors = {
  parchemin: ['#c9b083', '#e3cfa4', '#f3e6c6'],
  encre: '#2a1d2e',
  sepia: '#6e5236',
  or: '#a8803e',
  orClair: '#c9a45c',
  nom: '#5a2320',
  cire: ['#4f1310', '#7e201b', '#a83228', '#d0574b'],
};

// La minimap et la carte : le village vu d'en haut, en aplats, et les repères
// (le héros, les habitants dont le parchemin reste à gagner, les autres).
export const mapColors = {
  // Une couleur par lettre de la grille (voir world/map.js).
  cases: {
    '.': '#4f6e34', t: '#8a6c47', p: '#a39581', '~': '#3e7090', '#': '#7b6d60',
    b: '#b3a28a', c: '#3a4a2a', W: '#6a5f55', h: '#2f4a26', r: '#3e7090',
  },
  toit: '#7a3a28',
  toitBord: '#4a2018',
  arbre: '#2b4425',
  fond: '#1a1830',
  heros: '#fff6dc',
  contour: '#1b1a2e',
  guide: '#8fd3ff',
  quete: '#ffd08a',
  fait: '#9a9488',
};

// Les intérieurs : le noir autour de la pièce, le jour qui entre par les
// fenêtres, une lumière d'ambiance chaude venue du plafond et du plancher.
export const interiorColors = {
  fond: '#17121d',
  jour: '#ffd9a8',
  ciel: '#ffe2bd',
  sol: '#3a2a20',
};
