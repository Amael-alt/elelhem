// Les deux colonnes de coupe d'une fiche à trois silhouettes (face, profil,
// dos), à passer à transcrire-sprite.mjs en --decoupe quand une lame tendue
// relie deux silhouettes : dans chacun des deux plus larges creux (une lame
// fine qui traverse compte pour creux), le milieu de la plus longue suite de
// colonnes vraiment vides ; sans colonne vide, la lame est rattachée au corps
// dont le bord partage le plus de lignes avec elle (la main qui la tient).
// Aucune dépendance (png.mjs). Usage : node outils/coupes.mjs fiche.png
import { readFileSync } from 'node:fs';
import { decodePng } from './png.mjs';
const img = decodePng(readFileSync(process.argv[2]));
const col = new Uint32Array(img.width);
for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3] >= 128) col[x]++;
const max = Math.max(...col);
const gaps = [];
let start = -1;
for (let x = 0; x <= img.width; x++) {
  const thin = x < img.width && col[x] < max * 0.12;
  if (thin && start < 0) start = x;
  if (!thin && start >= 0) { if (start > 0 && x < img.width) gaps.push([start, x - 1]); start = -1; }
}
gaps.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
const cutOf = ([a, b]) => {
  let best = null;
  let run = -1;
  for (let x = a; x <= b + 1; x++) {
    const empty = x <= b && col[x] === 0;
    if (empty && run < 0) run = x;
    if (!empty && run >= 0) { if (!best || x - run > best[1] - best[0]) best = [run, x - 1]; run = -1; }
  }
  if (best) return Math.round((best[0] + best[1]) / 2);
  // Pas une colonne vide : une lame traverse tout le creux. Elle appartient au
  // corps dont le bord partage le plus de lignes avec elle (la main qui la tient).
  const rows = (x) => { const set = new Set(); for (let y = 0; y < img.height; y++) if (img.data[(y * img.width + x) * 4 + 3] >= 128) set.add(y); return set; };
  const overlap = (x1, x2) => { const r1 = rows(x1); let n = 0; for (const y of rows(x2)) if (r1.has(y)) n++; return n; };
  return overlap(a - 1, a) >= overlap(b, b + 1) ? b + 1 : a;
};
console.log(gaps.slice(0, 2).map(cutOf).sort((a, b) => a - b).join(','));
