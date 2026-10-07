// La tenue de mage (version 2.5) : la planche du héros, l'épée à la main et
// ses six poses de coup comprises, recolorée par la palette. Chapeau et écharpe d’or, chausses de velours violet.
// Aucune fiche dessinée : les grilles sont celles de heros.js, et les index
// de palette sont les mêmes dans tous les modules du héros (la palette de
// référence est reprise telle quelle par outils/transcrire-sprite.mjs), la
// table s'applique donc partout.

import { heros } from './heros.js';

// Index de palette du héros vers les couleurs de la tenue : les rouges du
// chapeau et de l'écharpe (du sombre au vif), puis les bruns des chausses.
const TABLE = {
  5: '#6b4e10', 7: '#a67c1c', a: '#d9a935', c: '#ffd96a',
  3: '#231a3d', 4: '#372a5e', 6: '#4f3d84', 8: '#6e5aa8',
};
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

const recolor = (sprite) => ({
  ...sprite,
  couleurs: sprite.couleurs.map((color, i) => TABLE[DIGITS[i]] ?? color),
});

export const heros_mage = {
  ...recolor(heros),
  arme: recolor(heros.arme),
  coups: heros.coups.map(([elan, frappe]) => [recolor(elan), recolor(frappe)]),
};
