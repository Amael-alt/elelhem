// La tenue de la forêt (version 2.5) : la planche du héros, l'épée à la main et
// ses six poses de coup comprises, recolorée par la palette. Chapeau et écharpe vert feuille, chausses de cuir fauve.
// Aucune fiche dessinée : les grilles sont celles de heros.js, et les index
// de palette sont les mêmes dans tous les modules du héros (la palette de
// référence est reprise telle quelle par outils/transcrire-sprite.mjs), la
// table s'applique donc partout.

import { heros } from './heros.js';

// Index de palette du héros vers les couleurs de la tenue : les rouges du
// chapeau et de l'écharpe (du sombre au vif), puis les bruns des chausses.
const TABLE = {
  5: '#1f3a22', 7: '#2f5a30', a: '#468442', c: '#6aa65a',
  3: '#3a2b18', 4: '#4a3a24', 6: '#6b5433', 8: '#8f7246',
};
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

const recolor = (sprite) => ({
  ...sprite,
  couleurs: sprite.couleurs.map((color, i) => TABLE[DIGITS[i]] ?? color),
});

export const heros_foret = {
  ...recolor(heros),
  arme: recolor(heros.arme),
  coups: heros.coups.map(([elan, frappe]) => [recolor(elan), recolor(frappe)]),
};
