// La tenue écarlate (version 2.5) : la planche du héros, l'épée à la main et
// ses six poses de coup comprises, recolorée par la palette. Chapeau et écharpe cramoisis, chausses gris-brun.
// Aucune fiche dessinée : les grilles sont celles de heros.js, et les index
// de palette sont les mêmes dans tous les modules du héros (la palette de
// référence est reprise telle quelle par outils/transcrire-sprite.mjs), la
// table s'applique donc partout.

import { heros } from './heros.js';

// Index de palette du héros vers les couleurs de la tenue : les rouges du
// chapeau et de l'écharpe (du sombre au vif), puis les bruns des chausses.
const TABLE = {
  5: '#4a0c12', 7: '#7a1d22', a: '#b02a2f', c: '#d9453f',
  3: '#2c2420', 4: '#3f352e', 6: '#5a4e44', 8: '#7d6e60',
};
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

const recolor = (sprite) => ({
  ...sprite,
  couleurs: sprite.couleurs.map((color, i) => TABLE[DIGITS[i]] ?? color),
});

export const heros_ecarlate = {
  ...recolor(heros),
  arme: recolor(heros.arme),
  coups: heros.coups.map(([elan, frappe]) => [recolor(elan), recolor(frappe)]),
};
