// La monnaie d'Elelhem, le Token, et ce qu'elle achète. Que de la donnée, plus
// une fonction pure qui habille une fiche : les noms et descriptions sont dans
// data/dialogues.js (textesInterface.boutique), le moteur dans game/wallet.js
// et game/shop.js.

// Ce que rapporte chaque chose. On gagne des Tokens avec les quêtes (un
// parchemin, le diplôme) et l'exploration (un lieu découvert pour la première
// fois, un coffre ouvert).
export const gains = {
  parchemin: 10,
  diplome: 20,
  decouverte: 2,
  coffre: 5,
};

// Habille le héros d'une tenue : sa fiche (data/characters.js) reçoit les
// rampes de la tenue par-dessus les siennes, et son allure (look : tenue,
// coiffure, accessoire) si la tenue en change. Sans tenue, la fiche telle quelle.
export function habiller(hero, tenue) {
  if (!tenue?.palette && !tenue?.look) return hero;
  return { ...hero, ...(tenue.look ?? {}), palette: { ...hero.palette, ...(tenue.palette ?? {}) } };
}

// Les tenues du héros, vendues par Berthe à l'auberge. Chacune remplace des
// rampes de la palette du héros : accent (la capuche et la cape), vetement (la
// tunique), parfois lumiere (les pixels qui brillent). Depuis la version 1.1,
// une tenue change aussi la silhouette (look) : la grille de son accessoire
// remplace la capuche de voyage, dans le même format que data/characters.js
// (repères de la silhouette en tête de ce fichier-là). La première tenue est
// celle du départ, gratuite.

// Cape longue à capuche : la même tête que la capuche de voyage, mais la cape
// tombe de chaque côté du corps jusqu'aux genoux (écarlate, des bois).
const capeTete = [
  '.......aaaa.......',
  '.....aaaaaaaa.....',
  '....aaaaaaaaaa....',
  '...aaaaaaaaaaaa...',
  '...aaaaaaaaaaaa...',
  '..aaaaaaaaaaaaaa..',
  '..aaaaAAAAAAaaaa..',
  '..aaaA......Aaaa..',
  '.aaaA........Aaaa.',
  '.aaaA........Aaaa.',
  '.aaaA........Aaaa.',
  '.aaaA........Aaaa.',
  '.aaaA........Aaaa.',
  '.aaaA........Aaaa.',
  '.aaaaA......Aaaaa.',
  '..aaaaA....Aaaaa..',
  '..aaaaaAAAAaaaaa..',
  'aaaaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaaaa',
];
const capeTeteDos = [
  '.......aaaa.......',
  '.....aaaaaaaa.....',
  '....aaaaaaaaaa....',
  '...aaaaaaaaaaaa...',
  '...aaaaaaaaaaaa...',
  ...Array(11).fill('..aaaaaaaaaaaaaa..'),
  '...aaaAAAAAAaaa...',
  'aaaaaaaaaaaaaaaaaa',
  'aaaaaaaaaaaaaaaaaa',
];
const capeTeteProfil = [
  '.........aaaa.....',
  '.......aaaaaaa....',
  '......aaaaaaaaa...',
  '.....aaaaaaaaaa...',
  '....aaaaaaaaaaaa..',
  '...aaaaaaaaaaaaa..',
  '...aAAAAAaaaaaaaa.',
  ...Array(8).fill('........Aaaaaaaaa.'),
  '.......AAaaaaaaaa.',
  '......AAaaaaaaaaa.',
  '...aaaaaaaaaaaaaa.',
  '...aaaaaaaaaaaaaa.',
];
// Le corps de la cape, vu de face : ouverte devant, elle encadre le buste puis
// les jambes.
const capeCorps = (hauteur) => ['aaaaaA......Aaaaaa', 'aaaaA........Aaaaa', ...Array(hauteur).fill('aaaA..........Aaaa')];

export const tenues = [
  { id: 'voyage', prix: 0, palette: null },
  {
    id: 'ecarlate',
    prix: 15,
    palette: {
      accent: ['#7a1d22', '#b02a2f', '#d9453f', '#f07a63'],
      vetement: ['#5a4e44', '#7d6e60', '#a3927f', '#c7b6a0'],
    },
    look: {
      accessoire: {
        nom: 'cape écarlate',
        ancre: [7, 3],
        face: [...capeTete, ...capeCorps(15), '.aaA..........Aaa.', '..AA..........AA..'],
        dos: [...capeTeteDos, ...Array(19).fill('aaaaaaaaaaaaaaaaaa'), '.aaaaaaaaaaaaaaaa.', '..AAAAAAAAAAAAAA..'],
        profil: [...capeTeteProfil, ...Array(17).fill('.......Aaaaaaaaaa.'), '........Aaaaaaaa..', '.........AAAAAAA..'],
      },
    },
  },
  {
    id: 'foret',
    prix: 15,
    palette: {
      accent: ['#1f3a22', '#2f5a30', '#468442', '#6aa65a'],
      vetement: ['#4a3a24', '#6b5433', '#8f7246', '#b3945c'],
    },
    // Cape courte à bord dentelé comme des feuilles, une courroie de cuir en
    // travers de la poitrine.
    look: {
      accessoire: {
        nom: 'cape des bois',
        ancre: [7, 3],
        face: [
          ...capeTete,
          'aaaaaAb.....Aaaaaa',
          'aaaaA..b.....Aaaaa',
          'aaaA....b.....Aaaa',
          'aaaA.....b....Aaaa',
          'aaaA......b...Aaaa',
          'aaaA..........Aaaa',
          'aaaA..........Aaaa',
          '.aAA..........AAa.',
          '..A.A........A.A..',
        ],
        dos: [...capeTeteDos, ...Array(9).fill('aaaaaaaaaaaaaaaaaa'), '.aaaaaaaaaaaaaaaa.', '..A.A.A.A.A.A.A...'],
        profil: [...capeTeteProfil, ...Array(7).fill('.......Aaaaaaaaaa.'), '........Aaaaaaaa..', '.........A.A.A.A..'],
      },
    },
  },
  {
    id: 'nuit',
    prix: 25,
    palette: {
      accent: ['#1a1238', '#2c1f5e', '#443587', '#6552b0'],
      vetement: ['#2a2238', '#3d3352', '#55496e', '#706390'],
      lumiere: ['#c9ff8a', '#dcff9f', '#edffc4', '#f8ffe6'],
    },
    // Capuche baissée sur les épaules, les cheveux à l'air, une longue cape
    // semée de lucioles (lettre l : elles brillent, même à l'ombre).
    look: {
      accessoire: {
        nom: 'cape de nuit',
        ancre: [7, 19],
        face: [
          '....aaaaaaaaaa....',
          '..aaaaaaaaaaaaaa..',
          'aaaaaaallaaaaaaaaa',
          'aaaaaA......Aaaaaa',
          'aaaaA........Aaaaa',
          'aaaA..........Aaaa',
          'aaaA..........Aaaa',
          'aaaA..........Aaaa',
          'alaA..........Aaaa',
          'aaaA..........Aaaa',
          'aaaA..........Aaaa',
          'aaaA..........Aaaa',
          'aaaA..........Aala',
          'aaaA..........Aaaa',
          'aaaA..........Aaaa',
          'aaaA..........Aaaa',
          'aalA..........Aaaa',
          'aaaA..........Aaaa',
          'aaaA..........Aaaa',
          'aaaA..........Aaaa',
          '.aaA..........Aaa.',
          '..AA..........AA..',
        ],
        dos: [
          '....aaaaaaaaaa....',
          '..aaaaaaaaaaaaaa..',
          'aaaaaaaaaaaaaaaaaa',
          'aaaaaaaaaaaaaaaaaa',
          'aaaaaaaaaaaaaaaaaa',
          'aaaalaaaaaaaaaaaaa',
          'aaaaaaaaaaaaaaaaaa',
          'aaaaaaaaaaaaaaaaaa',
          'aaaaaaaaaaaaaaaaaa',
          'aaaaaaaaaaaalaaaaa',
          'aaaaaaaaaaaaaaaaaa',
          'aaaaaaaaaaaaaaaaaa',
          'aaaaaaaaaaaaaaaaaa',
          'aaaaaaalaaaaaaaaaa',
          'aaaaaaaaaaaaaaaaaa',
          'aaaaaaaaaaaaaaaaaa',
          'aaaaaaaaaaaaaaaaaa',
          'aaaaaaaaaaaaaalaaa',
          'aaaaaaaaaaaaaaaaaa',
          'aaaaaaaaaaaaaaaaaa',
          '.aaaaaaaaaaaaaaaa.',
          '..AAAAAAAAAAAAAA..',
        ],
        profil: [
          '....aaaaaaaaaaa...',
          '...aaaaaaaaaaaaaa.',
          '...aallaaaaaaaaaa.',
          '.......Aaaaaaaaaa.',
          '.......Aaaaaaaaaa.',
          '.......Aaaaaaaaaa.',
          '.......Aaaaaaaaaa.',
          '.......Aaalaaaaaa.',
          '.......Aaaaaaaaaa.',
          '.......Aaaaaaaaaa.',
          '.......Aaaaaaaaaa.',
          '.......Aaaaaaaaaa.',
          '.......Aaaaaaaaaa.',
          '.......Aaaaaaalaa.',
          '.......Aaaaaaaaaa.',
          '.......Aaaaaaaaaa.',
          '.......Aaaaaaaaaa.',
          '.......Aalaaaaaaa.',
          '.......Aaaaaaaaaa.',
          '.......Aaaaaaaaaa.',
          '........Aaaaaaaa..',
          '.........AAAAAAA..',
        ],
      },
    },
  },
  {
    id: 'mage',
    prix: 40,
    palette: {
      accent: ['#6b4e10', '#a67c1c', '#d9a935', '#ffd96a'],
      vetement: ['#231a3d', '#372a5e', '#4f3d84', '#6e5aa8'],
    },
    // Robe violette à liserés d'or, et un chapeau pointu à ruban d'or et à
    // étoile, plus petit que celui de l'Oracle.
    look: {
      tenue: 'robe',
      accessoire: {
        nom: "chapeau d'apprenti mage",
        ancre: [6, 0],
        face: [
          '.........vv.........',
          '........vvv.........',
          '........vvvv........',
          '.......vvvvv........',
          '.......vvavvv.......',
          '......vvvvvvvv......',
          '.....vvvvvvvvvv.....',
          '....aaaaaaaaaaaa....',
          '..vvvvvvvvvvvvvvvv..',
          '...VVVVVVVVVVVVVV...',
        ],
        dos: [
          '.........vv.........',
          '........vvv.........',
          '........vvvv........',
          '.......vvvvv........',
          '.......vvvvvv.......',
          '......vvvvvvvv......',
          '.....vvvvvvvvvv.....',
          '....aaaaaaaaaaaa....',
          '..vvvvvvvvvvvvvvvv..',
          '...VVVVVVVVVVVVVV...',
        ],
        profil: [
          '............vv......',
          '...........vvv......',
          '..........vvvv......',
          '.........vvvvv......',
          '........vvavvv......',
          '.......vvvvvvvv.....',
          '......vvvvvvvvvv....',
          '.....aaaaaaaaaaaa...',
          '..vvvvvvvvvvvvvvvv..',
          '...VVVVVVVVVVVVVV...',
        ],
      },
    },
  },
];
