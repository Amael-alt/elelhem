// Les personnages du village. Chacun a une palette de quatre rampes (peau,
// vêtement, accent, cheveux, du plus sombre au plus clair) et un accessoire
// distinctif dessiné en grilles de caractères, une par vue.
//
// FORMAT GELÉ (étape 1e) : un personnage est un objet
//   {
//     id,          identifiant unique
//     nom,         nom affiché dans la boîte de dialogue
//     palette,     { peau, vetement, accent, cheveux } et, si l'accessoire émet
//                  de la lumière, lumiere : quatre tons chacune, du sombre au clair
//     accessoire,  { nom, ancre, face, dos, profil } : le seul signe distinctif
//     position,    { x, z } dans le village, ou null pour le héros (point de départ)
//     direction,   'down' | 'left' | 'right' | 'up' : où il regarde au repos
//     dialogue,    clé de son texte dans data/dialogues.js, ou null
//   }
// Le moteur ne lit que ces champs : un nouvel habitant n'est que de la donnée.
//
// Légende des grilles (voir gfx/sprites.js) :
//   p peau   v vêtement   a accent   c cheveux   b cuir
//   l lumière (émissive, brille même à l'ombre)
//   en minuscule, ton calculé d'après la forme ; en majuscule, ton le plus sombre
//   e œil (couleur du contour)   x efface   . laisse voir le corps dessous
// L'ancre place le coin haut gauche de la grille dans le cadre de 32 × 32.

// Le héros : une capuche de voyage et sa pèlerine, aucun trait de genre.
export const hero = {
  id: 'heros',
  nom: 'Voyageur',
  position: null,
  direction: 'down',
  dialogue: null,
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

// Lia, la guide. Se lit « l'IA » : une petite lumière d'Ellelhem, cheveux
// argentés, robe crème, un joyau au front et une orbe qui flotte à son côté.
// Joyau, pendentif et orbe sont de la lumière (lettre l) : ils brillent.
export const lia = {
  id: 'lia',
  nom: 'Lia',
  palette: {
    peau: ['#9a6b55', '#c08a6c', '#e0aa88', '#f3c9a6'],
    vetement: ['#8a7a5e', '#b5a27a', '#dcc896', '#f5e6b8'],
    accent: ['#2c2650', '#453b7a', '#6a5aa8', '#9a8ad0'],
    cheveux: ['#6d6a8c', '#9a97b8', '#c4c2dc', '#ecebf7'],
  },
  position: { x: 14.7, z: 10.6 },
  direction: 'down',
  dialogue: 'lia',
  accessoire: {
    nom: 'joyau et orbe de lumière',
    ancre: [6, 2],
    face: [
      '.......................',
      '.......................',
      '.......................',
      '.......................',
      '.......................',
      '......aaallaaa.........',
      '.......................',
      '.......................',
      '.......................',
      '....cc........cc.......',
      '....cc........cc.......',
      '....cc........cc...lll.',
      '....cc........cc..lllll',
      '....ccaaaaaaaacc..lllll',
      '....cc........cc..lllll',
      '....cc...ll...cc...lll.',
      '....cc........cc.......',
      '....cc........cc.......',
      '.......................',
      '.......................',
    ],
    dos: [
      '.......................',
      '.......................',
      '.......................',
      '.......................',
      '.......................',
      '......aaaaaaaa.........',
      '.......................',
      '.......................',
      '.......................',
      '.......................',
      '.......................',
      '...................lll.',
      '..................lllll',
      '....cccccccccccc..lllll',
      '....cccccccccccc..lllll',
      '.....cccccccccc....lll.',
      '.....cccccccccc........',
      '......cccccccc.........',
      '.......cccccc..........',
      '.......................',
    ],
    profil: [
      '.......................',
      '.......................',
      '.......................',
      '.......................',
      '.......................',
      '.....llaaaaaaaa........',
      '.......................',
      '.......................',
      '.......................',
      '...........ccccc.......',
      '...........cccccc......',
      '.lll.......cccccc......',
      'lllll......cccccc......',
      'lllll......cccccc......',
      'lllll......ccccc.......',
      '.lll...l...ccccc.......',
      '............cccc.......',
      '............ccc........',
      '.......................',
      '.......................',
    ],
  },
};

// Les habitants du village, dans l'ordre où ils sont posés.
export const villagers = [lia];
