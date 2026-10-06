// La monnaie d'Elelhem, le Token, et ce qu'elle achète. Que de la donnée : les
// noms et descriptions sont dans data/dialogues.js (textesInterface.boutique),
// le moteur dans game/wallet.js et game/shop.js.

// Ce que rapporte chaque chose. On gagne des Tokens avec les quêtes (un
// parchemin, le diplôme) et l'exploration (un lieu découvert pour la première
// fois, un coffre ouvert).
export const gains = {
  parchemin: 10,
  diplome: 20,
  decouverte: 2,
  coffre: 5,
};

// Les tenues du héros, vendues par Berthe à l'auberge. Chacune remplace deux
// rampes de la palette du héros (data/characters.js) : accent (la capuche et
// la cape) et vetement (la tunique). La première est celle du départ, gratuite.
export const tenues = [
  { id: 'voyage', prix: 0, palette: null },
  {
    id: 'ecarlate',
    prix: 15,
    palette: {
      accent: ['#4a1218', '#721d26', '#9b2f3a', '#c4505a'],
      vetement: ['#2a2420', '#3d342d', '#544840', '#6d5f54'],
    },
  },
  {
    id: 'foret',
    prix: 15,
    palette: {
      accent: ['#1d3320', '#2b4a2e', '#3e6640', '#58855a'],
      vetement: ['#3b3a2a', '#575540', '#7a7758', '#a09c72'],
    },
  },
  {
    id: 'nuit',
    prix: 25,
    palette: {
      accent: ['#1a1238', '#2a1d55', '#3f2d7a', '#5a46a0'],
      vetement: ['#2a2238', '#3d3352', '#55496e', '#706390'],
    },
  },
  {
    id: 'mage',
    prix: 40,
    palette: {
      accent: ['#6b4e10', '#a67c1c', '#d9a935', '#ffd96a'],
      vetement: ['#231a3d', '#372a5e', '#4f3d84', '#6e5aa8'],
    },
  },
];
