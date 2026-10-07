// Le curseur du jeu (version 2.8) : une main gantée qui pointe, dans l'esprit
// des vieux jeux de rôle en ligne, dessinée pixel par pixel ici et écrite en
// PNG à l'échelle 2 dans assets/ui/curseur.png. Aucune dépendance (png.mjs).
// Usage : node outils/curseur.mjs

import { writeFileSync } from 'node:fs';
import { encodePng } from './png.mjs';

const SCALE = 2;
const PALETTE = {
  k: [26, 18, 8, 255], // contour
  s: [154, 163, 173, 255], // acier du gantelet
  l: [232, 238, 242, 255], // reflet
  d: [92, 100, 109, 255], // ombre de l'acier
  g: [226, 178, 74, 255], // or de la manchette
  G: [138, 95, 28, 255], // or sombre
  '.': [0, 0, 0, 0],
};

// L'index pointe vers le haut à gauche (le point chaud), les trois autres
// doigts sont repliés, le pouce à droite, la manchette d'or en bas à gauche.
const ROWS = [
  '....kk..............',
  '...klsk.............',
  '...klsk.............',
  '...klsk.............',
  '...klsk.............',
  '...klsk.kk..........',
  '...klsk.klsk.kk.....',
  '...klsk.klsk.klsk...',
  '...klsk.klsk.klsk.kk',
  '...klsskklsskklsskls',
  '...klsssssssssssssk.',
  '..kglssssssssssssk..',
  '..kGglsssssssssdsk..',
  '..kGGgsssssssssdk...',
  '..kGGGsssssssssdk...',
  '...kGGgssssssssdk...',
  '...kkGGgssssssdk....',
  '.....kGGgsssssdk....',
  '......kGGGssssdk....',
  '......kGGGssssdk....',
  '.......kkkkkkkk.....',
];

const width = ROWS[0].length * SCALE;
const height = ROWS.length * SCALE;
const rgba = new Uint8Array(width * height * 4);
ROWS.forEach((row, y) => {
  [...row].forEach((ch, x) => {
    const color = PALETTE[ch] ?? PALETTE['.'];
    for (let sy = 0; sy < SCALE; sy += 1) {
      for (let sx = 0; sx < SCALE; sx += 1) {
        rgba.set(color, (((y * SCALE + sy) * width) + x * SCALE + sx) * 4);
      }
    }
  });
});
writeFileSync('assets/ui/curseur.png', encodePng(width, height, rgba));
console.log(`Curseur écrit : assets/ui/curseur.png (${width} × ${height}), point chaud en ${5 * SCALE}, 0.`);
