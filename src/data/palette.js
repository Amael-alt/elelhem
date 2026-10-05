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

// Effets : lucioles vert-jaune, poussière dorée, fumée gris chaud, rayons.
export const effectColors = {
  luciole: '#d9ff7a',
  poussiere: '#ffd590',
  fumeeSombre: '#58524f',
  fumeeClaire: '#d9c3ad',
  rayon: '#ffd9a0',
};

// Fer des lanternes et des ferrures.
export const ironColor = '#2b2725';

// Lumière chaude des lanternes et des flammes.
export const lanternColor = '#ffb060';

// Brume chaude de fin de journée.
export const hazeColor = '#e8c9a0';

// Cuir des bottes et des ceintures, commun à tous les personnages.
export const leatherRamp = ['#2a1b16', '#46302a', '#634435', '#815b43'];

// Lumière propre aux personnages (joyau et orbe de Lia) : or pâle, du plus
// sombre au presque blanc. Ces pixels brillent même dans l'ombre.
export const glowRamp = ['#ffc56e', '#ffd88f', '#ffeab5', '#fff6dc'];

// Contour des personnages : sombre et bleuté, jamais noir pur.
export const outlineColor = '#1b1a2e';

// Ciel provisoire, en attendant la sphère de ciel de l'étape 1d : la couleur
// de la brume, pour que le lointain s'y fonde.
export const backgroundColor = hazeColor;
