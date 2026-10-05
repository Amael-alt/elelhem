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

// Cuir des bottes et des ceintures, commun à tous les personnages.
export const leatherRamp = ['#2a1b16', '#46302a', '#634435', '#815b43'];

// Contour des personnages : sombre et bleuté, jamais noir pur.
export const outlineColor = '#1b1a2e';

// Ciel provisoire, en attendant la sphère de ciel de l'étape 1d.
export const backgroundColor = '#4b4466';
