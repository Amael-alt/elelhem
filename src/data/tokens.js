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

// Habille le héros d'une tenue : sa fiche (data/characters.js) prend la planche
// de la tenue (sprite, voir data/sprites/) et ses rampes de palette, qui servent
// aux échantillons de la boutique. Sans tenue, la fiche telle quelle.
export function habiller(hero, tenue) {
  if (!tenue) return hero;
  const dressed = { ...hero };
  if (tenue.sprite) dressed.sprite = tenue.sprite;
  if (tenue.palette) dressed.palette = { ...hero.palette, ...tenue.palette };
  return dressed;
}

// Les tenues du héros, vendues par Berthe à l'auberge. Chacune a sa planche
// transcrite (sprite) et une palette qui résume ses couleurs pour la boutique :
// accent (la cape ou le chapeau), vetement (la tunique), parfois lumiere (ce
// qui brille). La première tenue est celle du départ, gratuite.
export const tenues = [
  { id: 'voyage', prix: 0, palette: null },
  {
    id: 'ecarlate',
    sprite: 'heros_ecarlate',
    prix: 15,
    palette: {
      accent: ['#7a1d22', '#b02a2f', '#d9453f', '#f07a63'],
      vetement: ['#5a4e44', '#7d6e60', '#a3927f', '#c7b6a0'],
    },
  },
  {
    id: 'foret',
    sprite: 'heros_foret',
    prix: 15,
    palette: {
      accent: ['#1f3a22', '#2f5a30', '#468442', '#6aa65a'],
      vetement: ['#4a3a24', '#6b5433', '#8f7246', '#b3945c'],
    },
    // Cape courte à bord dentelé comme des feuilles, une courroie de cuir en
    // travers de la poitrine.
  },
  {
    id: 'nuit',
    sprite: 'heros_nuit',
    prix: 25,
    palette: {
      accent: ['#1a1238', '#2c1f5e', '#443587', '#6552b0'],
      vetement: ['#2a2238', '#3d3352', '#55496e', '#706390'],
      lumiere: ['#c9ff8a', '#dcff9f', '#edffc4', '#f8ffe6'],
    },
    // Capuche baissée sur les épaules, les cheveux à l'air, une longue cape
    // semée de lucioles (lettre l : elles brillent, même à l'ombre).
  },
  {
    id: 'mage',
    sprite: 'heros_mage',
    prix: 40,
    palette: {
      accent: ['#6b4e10', '#a67c1c', '#d9a935', '#ffd96a'],
      vetement: ['#231a3d', '#372a5e', '#4f3d84', '#6e5aa8'],
    },
    // Robe violette à liserés d'or, et un chapeau pointu à ruban d'or et à
    // étoile, plus petit que celui de l'Oracle.
  },
];
