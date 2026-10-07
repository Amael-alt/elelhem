// Les lieux du jeu, en un seul endroit : les quartiers du village (REGIONS de
// layout.js), les pièces (rooms.js) et la lande. Ce module répond « dans quel
// quartier est ce point », « combien y a-t-il de lieux à découvrir » et donne
// la clé de découverte de chacun, celle que l'état de partie garde dans
// `decouvertes`. Du calcul pur, sans three.js : il tourne aussi dans Node.
//
// Les clés sont gelées parce qu'elles vivent dans les sauvegardes : un quartier
// garde son identifiant nu (« place »), une pièce est préfixée (« piece:forge »),
// la lande a sa clé propre.

import { REGIONS } from './layout.js';
import { ROOMS } from './rooms.js';

export const MOOR_KEY = 'lieu:lande';
export const regionKey = (id) => id;
export const roomKey = (id) => `piece:${id}`;

// Tout ce qui se découvre : les quartiers, les pièces, la lande.
export const PLACE_COUNT = REGIONS.length + Object.keys(ROOMS).length + 1;

// Un point est-il dans un rectangle ? Le rectangle s'écrit [x0, z0, x1, z1]
// (layout.js) ou { x0, x1, z0, z1 } (les zones de porte de game/doors.js).
export function inRect(rect, x, z) {
  const [x0, z0, x1, z1] = Array.isArray(rect) ? rect : [rect.x0, rect.z0, rect.x1, rect.z1];
  return x >= x0 && x <= x1 && z >= z0 && z <= z1;
}

// Le quartier qui contient le point, le premier de la liste qui l'emporte ;
// null entre deux quartiers.
export function regionAt(x, z) {
  const found = REGIONS.find((region) => inRect(region.rect, x, z));
  return found ? found.id : null;
}
