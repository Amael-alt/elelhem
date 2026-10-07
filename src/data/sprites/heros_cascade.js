// La tenue de la cascade (version 2.3) : la planche du héros, l'épée à la
// main et ses six poses de coup comprises, dont les rouges (chapeau, écharpe)
// deviennent des bleu-vert d'eau vive. Aucune fiche dessinée : une recoloration
// de la palette, les grilles sont celles de heros.js. Les index de palette
// sont les mêmes dans tous les modules du héros (la palette de référence est
// reprise telle quelle par outils/transcrire-sprite.mjs), la table s'applique
// donc partout.

import { heros } from './heros.js';

// Index de palette du héros vers la couleur de l'eau : du rouge sombre au
// rouge vif, du bleu profond au bleu clair.
const WATER = {
  4: '#0f3a5a',
  7: '#155a7a',
  9: '#1f7fa0',
  b: '#38a8c8',
};
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

const recolor = (sprite) => ({
  ...sprite,
  couleurs: sprite.couleurs.map((color, i) => WATER[DIGITS[i]] ?? color),
});

export const heros_cascade = {
  ...recolor(heros),
  arme: recolor(heros.arme),
  coups: heros.coups.map(([elan, frappe]) => [recolor(elan), recolor(frappe)]),
};
