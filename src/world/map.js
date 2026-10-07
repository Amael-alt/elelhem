// La carte du village en grille de caractères : une lettre par cellule d'une
// unité. Ligne 0 au nord (z = 0), colonne 0 à l'ouest (x = 0). Le type de
// cellule donne sa hauteur, sa matière et si on peut y marcher.
//
// Carte du village, 56 × 42 cases depuis la version 2.3 (40 × 30 avant, tout
// espacé de 40 %) : une place pavée au centre, des rues de terre vers chaque
// quartier, la muraille et sa porte à l'ouest, la rivière et son pont à l'est,
// des falaises au nord et à l'est, des haies autour des jardins, le marché
// pavé au sud de la place, le terrain d'entraînement en terre battue derrière
// la forge, le bassin du lavoir au bord de la rivière. Les maisons, tours et
// le chantier sont posés par world/village.js sur ces cases (map.build) ;
// leur emplacement est donc lisible là-bas.
//
//   . herbe   t terre   p pavés   ~ eau   # muret   b pont
//   c falaise   W muraille   h haie   r rivière haute (avant la cascade)
//   g corniche derrière la cascade   e parvis en éventail (devant l'auberge)

const ROWS = [
  'cccccccccccccccccccccccccccccccccccccccccccrrrcccccccccc',
  'cccccccccccccccccccccccccccccccccccccccccccrrrcccccccccc',
  'cccccccccc.................................ggg..cccccccc',
  'ccc........................................~~~........cc',
  '...W.......................................~~~........cc',
  '...W......................tt...............~~~........cc',
  '...W......................tt...............~~~........cc',
  '...W...tt.................tt........hhhhhh.~~~........cc',
  '...W...tt.................tt........htttth.~~~........cc',
  '...W...tt.................tt........htttth.~~~........cc',
  '...W...tt.................tt........htttth.~~~........cc',
  '...W...tt........tt.......tt.....tt.htttth.~~~........cc',
  '...W...ttttttt...tt.......tt.....tt.htttth.~~~........cc',
  '...W...ttttttt...tt.......tt.....tt.htttth.~~~........cc',
  '...W...ttttttt...tt.......tt.....tt........~~~........cc',
  '...W...ttttttt...tt.......tt.....tt........~~~........cc',
  '...W...ttttttt......ppppppppppppppppp......~~~........cc',
  '...W...ttttttt......ppppppppppppppppp......~~~........cc',
  '...W...ttttttt......ppppppppppppppppp......~~~........cc',
  '.........ttt........ppppppppppppppppp......###.tttt...cc',
  'ttttttttttttttttttttpppppppppppppppppttttttbbbttttttt.cc',
  'ttttttttttttttttttttpppppppppppppppppttttttbbbttttttt.cc',
  '....................ppppppppppppppppp......###.tttt...cc',
  '...W................ppppppppppppppppp.......~~~.......cc',
  '...W................ppppppppppppppppp.......~~~.......cc',
  '...W................ppppppppppppppppp.......~~~.......cc',
  '...W................ppppppppppppppppp.......~~~.......cc',
  '...W.......................tt...............~~~.......cc',
  '...W..............hhhhhh...tt...............~~~.......cc',
  '...W..............htttthppppppppppp.........~~~.......cc',
  '...W..............htttthppppppppppp.........~~~.......cc',
  '...W..............hhtthhpppppppppptttttt....~~~.......cc',
  '...W.....eeeeeeeeeeeeepppppppppppptttttt....~~~.......cc',
  '...W.....eeeeeeeeeeeeeppppppppppppp...tt....~~~.......cc',
  '...W.....eeeeeeeeee...ppppppppppppp...tt....~~~.......cc',
  '...W.....eeeeeeeeee........tt.........tt....~~~.......cc',
  '.........eeeeeeeeee........tt...............~~~.......cc',
  '...........................tt............~~.~~~.......cc',
  '..........................htth...........~~.~~~.......cc',
  '..........................htth..............~~~.......cc',
  '...........................tt...............~~~.......cc',
  '...........................tt...............~~~.......cc',
];

// matter : texture du dessus ; side : texture des flancs ; height : hauteur
// du dessus ; solid : on ne peut pas y marcher.
export const CELL_TYPES = {
  '.': { name: 'herbe', matter: 'grass', side: 'dirt', height: 0, solid: false },
  t: { name: 'terre', matter: 'dirt', side: 'dirt', height: 0, solid: false },
  p: { name: 'pavés', matter: 'cobble', side: 'dirt', height: 0, solid: false },
  '~': { name: 'eau', matter: 'water', side: 'dirt', height: -0.35, solid: true },
  '#': { name: 'muret', matter: 'cobble', side: 'cobble', height: 0.8, solid: true },
  b: { name: 'pont', matter: 'cobble', side: 'cobble', height: 0, solid: false },
  c: { name: 'falaise', matter: 'grass', side: 'rock', height: 1.8, solid: true },
  W: { name: 'muraille', matter: 'cobble', side: 'cobble', height: 3.4, solid: true }, // deux personnages de haut
  h: { name: 'haie', matter: 'leaves', side: 'leaves', height: 0.45, solid: true }, // basse : ses grappes la couvrent
  r: { name: 'rivière haute', matter: 'water', side: 'rock', height: 1.55, solid: true },
  // La corniche derrière la cascade (version 2.3) : de la pierre au niveau du
  // village, cachée par le rideau d'eau qui tombe une case devant.
  g: { name: 'corniche', matter: 'cobble', side: 'rock', height: 0, solid: false },
  // Le parvis de l'auberge (version 2.5) : des pavés en éventail.
  e: { name: 'parvis', matter: 'fan', side: 'dirt', height: 0, solid: false },
  // Les intérieurs (world/rooms.js) : plancher de lattes (ou dalles de pierre
  // à la forge), murs au nord et sur les côtés, muret bas au sud (la façade est
  // coupée, comme une maquette ouverte), seuil par où l'on ressort, de bois ou
  // de pierre. Les cases de mur sont pleines pour les collisions mais cachées
  // (hidden) : le sol ne les dessine pas, world/furniture.js pose à leur bord
  // intérieur une cloison mince, celle qu'on voit. Les flancs du sol, visibles
  // seulement au seuil, sont en pierre : le soubassement de la maison.
  f: { name: 'plancher', matter: 'plank', side: 'cobble', height: 0, solid: false },
  d: { name: 'dalles', matter: 'flagstone', side: 'cobble', height: 0, solid: false },
  P: { name: 'seuil', matter: 'plank', side: 'cobble', height: 0, solid: false },
  Q: { name: 'seuil de pierre', matter: 'flagstone', side: 'cobble', height: 0, solid: false },
  M: { name: 'mur', matter: 'plaster', side: 'plaster', height: 2.6, solid: true, hidden: true },
  S: { name: 'mur de pierre', matter: 'stonewall', side: 'stonewall', height: 2.6, solid: true, hidden: true },
  m: { name: 'muret de façade', matter: 'plaster', side: 'plaster', height: 0.45, solid: true, hidden: true },
  s: { name: 'muret de pierre', matter: 'stonewall', side: 'stonewall', height: 0.45, solid: true, hidden: true },
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
    // La lettre de la case dans la grille (la minimap la colorie d'après elle).
    charAt: (x, z) => (x < 0 || z < 0 || x >= width || z >= depth ? null : rows[z][x]),
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
