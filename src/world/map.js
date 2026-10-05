// La carte du village en grille de caractères : une lettre par cellule d'une
// unité. Ligne 0 au nord (z = 0), colonne 0 à l'ouest (x = 0). Le type de
// cellule donne sa hauteur, sa matière et si on peut y marcher.
//
// Carte provisoire de l'étape 1 : une place pavée, des chemins de terre, un
// jardin clos de murets, une rivière franchie par un gué pavé.

const ROWS = [
  '...............t........~~~.....',
  '...............t........~~~.....',
  '...............t.......~~~......',
  '...#########...t.......~~~......',
  '...#.......#...t......~~~.......',
  '...#.......#...t......~~~.......',
  '...#.......#...t......~~~.......',
  '...####.####...t......~~~.......',
  '.......t.......t......~~~.......',
  '.......t..pppppppppp...~~~......',
  '.......tttpppppppppp...~~~......',
  '..........pppppppppp...~~~......',
  'ttttttttttpppppppppptttppppttttt',
  '..........pppppppppp....~~~.....',
  '..........pppppppppp....~~~.....',
  '..........pppppppppp.....~~~....',
  '..............t..........~~~....',
  '..............t..........~~~....',
  '...#######....t...........~~~...',
  '..............t...........~~~...',
  '..............t............~~~..',
  '..............t............~~~..',
  '..............t............~~~..',
  '..............t............~~~..',
];

// matter : texture du dessus ; side : texture des flancs ; height : hauteur
// du dessus ; solid : on ne peut pas y marcher.
export const CELL_TYPES = {
  '.': { name: 'herbe', matter: 'grass', side: 'dirt', height: 0, solid: false },
  t: { name: 'terre', matter: 'dirt', side: 'dirt', height: 0, solid: false },
  p: { name: 'pavés', matter: 'cobble', side: 'dirt', height: 0, solid: false },
  '~': { name: 'eau', matter: 'water', side: 'dirt', height: -0.35, solid: true },
  '#': { name: 'muret', matter: 'cobble', side: 'cobble', height: 0.8, solid: true },
};

// Hauteur du dessous du socle : les flancs descendent jusque-là.
export const BASE_HEIGHT = -1.6;

export function createMap(rows = ROWS) {
  const width = rows[0].length;
  const depth = rows.length;
  rows.forEach((row, z) => {
    if (row.length !== width) throw new Error(`Carte : la ligne ${z} fait ${row.length} cases au lieu de ${width}.`);
    for (const char of row) {
      if (!CELL_TYPES[char]) throw new Error(`Carte : type de case inconnu « ${char} » à la ligne ${z}.`);
    }
  });

  const cellAt = (x, z) => (x < 0 || z < 0 || x >= width || z >= depth ? null : CELL_TYPES[rows[z][x]]);

  // Cases occupées par un bâtiment posé en code (voir world/props.js).
  const built = new Set();
  const isBuilt = (x, z) => built.has(z * width + x);

  return {
    width,
    depth,
    cellAt,
    isBuilt,
    isSolid(x, z) {
      const cell = cellAt(x, z);
      return cell === null || cell.solid || isBuilt(x, z);
    },
    // Réserve un rectangle de cases pour un bâtiment.
    build(x0, z0, sizeX, sizeZ) {
      for (let z = z0; z < z0 + sizeZ; z += 1) {
        for (let x = x0; x < x0 + sizeX; x += 1) {
          if (!cellAt(x, z) || cellAt(x, z).solid) throw new Error(`Carte : on ne peut pas bâtir sur la case ${x}, ${z}.`);
          built.add(z * width + x);
        }
      }
    },
  };
}
