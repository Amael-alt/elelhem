// La tenue écarlate (version 2.5) : la planche du héros, l'épée à la main et
// ses six poses de coup comprises, recolorée par la palette. Chapeau et écharpe d’un rouge vif, chausses noires.
// Aucune fiche dessinée : les grilles sont celles de heros.js, et les index
// de palette sont les mêmes dans tous les modules du héros (la palette de
// référence est reprise telle quelle par outils/transcrire-sprite.mjs), la
// table s'applique donc partout.

import { heros } from './heros.js';

// Index de palette du héros vers les couleurs de la tenue : les rouges du
// chapeau et de l'écharpe (du sombre au vif), puis les bruns des chausses.
const TABLE = {
  5: '#5c0a10', 7: '#9a1018', a: '#d81f26', c: '#ff4a3c',
  3: '#120e0d', 4: '#1c1614', 6: '#29201c', 8: '#3a2e28',
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
