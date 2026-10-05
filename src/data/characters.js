// Les personnages du village. Chacun a une palette de quatre rampes (peau,
// vêtement, accent, cheveux, du plus sombre au plus clair) et un accessoire
// distinctif dessiné en grilles de caractères, une par vue.
//
// Légende des grilles (voir gfx/sprites.js) :
//   p peau   v vêtement   a accent   c cheveux   b cuir
//   en minuscule, ton calculé d'après la forme ; en majuscule, ton le plus sombre
//   e œil (couleur du contour)   x efface   . laisse voir le corps dessous
// L'ancre place le coin haut gauche de la grille dans le cadre de 32 × 32.

// Le héros : une capuche de voyage et sa pèlerine, aucun trait de genre.
export const hero = {
  id: 'heros',
  nom: 'Voyageur',
  palette: {
    peau: ['#8a5a44', '#b67c5d', '#d9a07c', '#efc29b'],
    vetement: ['#4a2a28', '#6e3b31', '#93533f', '#b56f4f'],
    accent: ['#1f2944', '#2d3d60', '#3f557d', '#5a7199'],
    cheveux: ['#2a1d18', '#3f2b22', '#58402f', '#73563f'],
  },
  accessoire: {
    nom: 'capuche de voyage',
    ancre: [9, 2],
    face: [
      '......aa......',
      '....aaaaaa....',
      '...aaaaaaaa...',
      '..aaaaaaaaaa..',
      '.aaaaaaaaaaaa.',
      '.aaaAAAAAAaaa.',
      '.aaAccccccAaa.',
      'aaaAppppppAaaa',
      'aaaApeppepAaaa',
      'aaaApeppepAaaa',
      'aaaAppppppAaaa',
      '.aaaAppppAaaa.',
      '.aaaaAAAAaaaa.',
      'aaaaaaaaaaaaaa',
      'aaaaaaaaaaaaaa',
      '.aaaaaaaaaaaa.',
    ],
    dos: [
      '......aa......',
      '....aaaaaa....',
      '...aaaaaaaa...',
      '..aaaaaaaaaa..',
      '.aaaaaaaaaaaa.',
      '.aaaaaaaaaaaa.',
      '.aaaaaaaaaaaa.',
      'aaaaaaaaaaaaaa',
      'aaaaaaaaaaaaaa',
      'aaaaaaaaaaaaaa',
      'aaaaaaaaaaaaaa',
      '.aaaaaaaaaaaa.',
      '.aaaAAAAAAaaa.',
      'aaaaaaaaaaaaaa',
      'aaaaaaaaaaaaaa',
      '.aaaaaaaaaaaa.',
    ],
    // Profil tourné vers la gauche ; la vue de droite en est le miroir.
    profil: [
      '.........aa...',
      '.......aaaaa..',
      '.....aaaaaaaa.',
      '....aaaaaaaaaa',
      '...aaaaaaaaaaa',
      '..aAAAaaaaaaaa',
      '..Accaaaaaaaaa',
      '..pppAaaaaaaaa',
      '.ppepAaaaaaaaa',
      '..pepAaaaaaaaa',
      '..pppAaaaaaaaa',
      '...ppAaaaaaaa.',
      '....AAaaaaaaa.',
      '...aaaaaaaaaa.',
      '...aaaaaaaaaaa',
      '....aaaaaaaaa.',
    ],
  },
};
