// La tenue de la nuit (version 2.5) : la planche du héros, l'épée à la main et
// ses six poses de coup comprises, recolorée par la palette. Chapeau et écharpe violets, chausses d’ardoise.
// Aucune fiche dessinée : les grilles sont celles de heros.js, et les index
// de palette sont les mêmes dans tous les modules du héros (la palette de
// référence est reprise telle quelle par outils/transcrire-sprite.mjs), la
// table s'applique donc partout.

import { heros } from './heros.js';

// Index de palette du héros vers les couleurs de la tenue : les rouges du
// chapeau et de l'écharpe (du sombre au vif), puis les bruns des chausses.
const TABLE = {
  5: '#1a1238', 7: '#2c1f5e', a: '#443587', c: '#6552b0',
  3: '#1e1830', 4: '#2a2238', 6: '#3d3352', 8: '#55496e',
};
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

const recolor = (sprite) => ({
  ...sprite,
  couleurs: sprite.couleurs.map((color, i) => TABLE[DIGITS[i]] ?? color),
});

export const heros_nuit = {
  ...recolor(heros),
  arme: recolor(heros.arme),
  coups: heros.coups.map(([elan, frappe]) => [recolor(elan), recolor(frappe)]),
};
