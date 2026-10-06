// Les Hallucinations : les ennemis de la lande, hors les murs. Que de la
// donnée, le moteur est dans game/enemies.js. Dans l'histoire, ce sont les
// erreurs de la magie LIA qui ont pris corps : un Mirage sourit et dit
// n'importe quoi, un Fantôme vous suit en répétant ce que vous vouliez
// entendre. Les dissiper rapporte des Tokens.
//
// Un type : { sprite (planche de data/sprites/), pv, vitesse (unités par
// seconde), portee (distance de contact), degats (clartés ôtées au héros),
// tokens (lâchés en pièces quand il se dissipe), potion (chance, de 0 à 1,
// de lâcher aussi une fiole de clarté), comportement :
//   'erre'      il flotte au hasard autour de son point d'origine (rayon),
//               change de cap toutes les une à deux secondes
//   'poursuit'  il erre, mais dès que le héros entre dans son champ (vue), il
//               fonce sur lui, et retourne chez lui s'il le perd
// flotte : hauteur de flottement au-dessus du sol, avec son balancement.
// Les noms affichés sont dans data/dialogues.js (textesInterface.combat.ennemis).

export const ENEMY_TYPES = {
  mirage: {
    sprite: 'mirage',
    pv: 3,
    vitesse: 1.1,
    portee: 0.55,
    degats: 1,
    tokens: 3,
    potion: 0.3,
    comportement: 'erre',
    rayon: 3.0,
    flotte: 0.35,
  },
  fantome: {
    sprite: 'fantome',
    pv: 6,
    vitesse: 2.3,
    portee: 0.6,
    degats: 1,
    tokens: 8,
    potion: 0.5,
    comportement: 'poursuit',
    rayon: 4.0,
    vue: 6.5,
    flotte: 0.25,
  },
};

// Où ils apparaissent sur la lande (repère de la lande, world/moor.js) : type
// et point d'origine. Ils reviennent tous quand on y retourne.
export const MOOR_ENEMIES = [
  { type: 'mirage', x: 20.5, z: 7.5 },
  { type: 'mirage', x: 17.5, z: 13.5 },
  { type: 'mirage', x: 12.5, z: 5.5 },
  { type: 'mirage', x: 9.5, z: 14.5 },
  { type: 'mirage', x: 6.5, z: 9.5 },
  { type: 'mirage', x: 14.5, z: 16.5 },
  { type: 'fantome', x: 13.5, z: 10.0 },
  { type: 'fantome', x: 7.0, z: 5.0 },
  { type: 'fantome', x: 5.5, z: 15.0 },
];

// Les épées que forge Ferrand (game/forge.js) : niveau, prix en Tokens, dégâts
// d'un coup. Le troisième coup d'un enchaînement frappe deux fois plus fort.
// Les noms et descriptions sont dans data/dialogues.js (textesInterface.forge).
export const SWORDS = [
  { id: 'bois', niveau: 1, prix: 15, degats: 1 },
  { id: 'fer', niveau: 2, prix: 35, degats: 2 },
  { id: 'acier', niveau: 3, prix: 70, degats: 3 },
];

// Le héros : ses clartés (points de vie), le temps où il est intouchable
// après un coup, le recul qu'il subit et qu'il inflige.
export const HERO_COMBAT = {
  clartes: 5,
  invulnerable: 1.0,
  recul: 1.6,
  reculEnnemi: 1.3, // assez pour sentir le coup, pas assez pour sortir de portée du suivant
};
