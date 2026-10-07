// Le dehors des intérieurs (version 2.5) : autour de la pièce, le village
// devine ses formes dans la nuit, comme dans les RPG en HD-2D où l'on voit,
// assombri, ce qui entoure la maison. Ce n'est pas le vrai village : un sol
// sombre, des maisons à pignon, des arbres, une clôture et quelques
// lanternes, en silhouettes non éclairées (MeshBasicMaterial), qui s'effacent
// dans le fond à mesure qu'elles s'éloignent de la pièce. Deux appels de
// dessin : les silhouettes, et les fenêtres et lanternes qui luisent.
//
// La caméra regarde vers le nord, en plongée : au sud de la pièce, rien de
// haut (ça cacherait l'intérieur), seulement la clôture basse et des touffes.
// Les maisons se tiennent derrière le mur nord et sur les côtés.

import * as THREE from 'three';
import { createFrame, createMeshBuilder, pushBox, pushPolygon, toGeometry } from './builder.js';
import { beyondColors } from '../data/palette.js';

const GROUND_Y = -0.42; // un peu sous le socle de la pièce
const FADE_FROM = 4; // à cette distance de la pièce, les formes commencent à s'éteindre
const FADE_TO = 22; // au-delà, elles sont presque fondues dans le fond
const MIN_SHADE = 0.22;

// Petit générateur déterministe : la même pièce a toujours le même dehors.
function createRandom(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// La pièce occupe [0, width] × [0, depth] ; distance d'un point à son bord.
function distanceToRoom(x, z, width, depth) {
  const dx = Math.max(0 - x, 0, x - width);
  const dz = Math.max(0 - z, 0, z - depth);
  return Math.hypot(dx, dz);
}

// map : la grille de la pièce (width, depth) ; seed : un nombre propre à la pièce.
export function createBeyond(map, seed = 1) {
  const width = map.width;
  const depth = map.depth;
  const random = createRandom(seed * 7919 + width * 31 + depth);
  const dark = createMeshBuilder();
  const glow = createMeshBuilder();
  const frame = createFrame(dark, [0, 0, 0]);
  const glowFrame = createFrame(glow, [0, 0, 0]);
  const shadeAt = (x, z) => {
    const d = distanceToRoom(x, z, width, depth);
    const t = THREE.MathUtils.clamp((d - FADE_FROM) / (FADE_TO - FADE_FROM), 0, 1);
    return 1 - t * (1 - MIN_SHADE);
  };
  // Une boîte dont la teinte suit la distance (le builder garde l'ombre dans
  // la couleur de sommet : on la multiplie ensuite).
  const box = (x0, y0, z0, x1, y1, z1, tint = 1) => {
    const start = dark.colors.length;
    pushBox(frame, [x0, y0, z0], [x1, y1, z1], { groundAo: 0.7 });
    const shade = shadeAt((x0 + x1) / 2, (z0 + z1) / 2) * tint;
    for (let i = start; i < dark.colors.length; i += 1) dark.colors[i] *= shade;
  };
  const polygon = (builder, vertices, tint) => {
    const start = builder.colors.length;
    pushPolygon(builder, vertices, vertices.map(() => [0, 0]));
    for (let i = start; i < builder.colors.length; i += 1) builder.colors[i] *= tint;
  };

  // Le sol : des dalles sombres autour de la pièce, chacune d'un ton un peu
  // différent, qui s'éteignent avec la distance.
  const reach = 24;
  const TILE = 1.5;
  for (let tz = -reach; tz < depth + reach; tz += TILE) {
    for (let tx = -reach; tx < width + reach; tx += TILE) {
      if (tx >= 0 && tx + TILE <= width && tz >= 0 && tz + TILE <= depth) continue;
      const tint = 0.3 * shadeAt(tx + TILE / 2, tz + TILE / 2) * (0.85 + random() * 0.3);
      polygon(dark, [[tx, GROUND_Y, tz], [tx, GROUND_Y, tz + TILE], [tx + TILE, GROUND_Y, tz + TILE], [tx + TILE, GROUND_Y, tz]], tint);
    }
  }
  // Une allée pavée devant la porte, vers le sud, un peu plus claire.
  const door = map.width / 2;
  polygon(dark, [
    [door - 0.9, GROUND_Y + 0.01, depth], [door - 1.4, GROUND_Y + 0.01, depth + 9], [door + 1.4, GROUND_Y + 0.01, depth + 9], [door + 0.9, GROUND_Y + 0.01, depth],
  ], 0.45);

  // Une maison à pignon : murs, toit à deux pans (faîtage est-ouest), fenêtre
  // allumée ou non sur le mur sud, cheminée.
  const house = (x, z, w, d, h) => {
    box(x, GROUND_Y, z, x + w, GROUND_Y + h, z + d, 1);
    const rise = d * 0.55;
    const eave = GROUND_Y + h;
    const overhang = 0.25;
    const roofTint = shadeAt(x + w / 2, z + d / 2) * 1.25;
    const x0 = x - overhang;
    const x1 = x + w + overhang;
    const zs = z + d + overhang;
    const zn = z - overhang;
    const ridge = z + d / 2;
    polygon(dark, [[x0, eave, zs], [x1, eave, zs], [x1, eave + rise, ridge], [x0, eave + rise, ridge]], roofTint);
    polygon(dark, [[x1, eave, zn], [x0, eave, zn], [x0, eave + rise, ridge], [x1, eave + rise, ridge]], roofTint * 0.8);
    // Pignons.
    polygon(dark, [[x, eave, z + d], [x, eave, z], [x, eave + rise, ridge]], roofTint * 0.7);
    polygon(dark, [[x + w, eave, z], [x + w, eave, z + d], [x + w, eave + rise, ridge]], roofTint * 0.7);
    if (random() < 0.7) {
      const cx = x + w * (0.2 + random() * 0.6);
      box(cx - 0.2, eave, ridge - 0.5, cx + 0.2, eave + rise + 0.7, ridge - 0.1, 1.1);
    }
    // Les fenêtres du mur sud, dont une ou deux allumées.
    const count = Math.max(1, Math.floor(w / 1.6));
    for (let i = 0; i < count; i += 1) {
      const wx = x + ((i + 0.5) * w) / count;
      const lit = random() < 0.55;
      const y0 = GROUND_Y + h * 0.4;
      const target = lit ? glow : dark;
      const tint = lit ? 0.55 + random() * 0.45 : shadeAt(wx, z + d) * 0.5;
      polygon(target, [[wx - 0.28, y0, z + d + 0.02], [wx + 0.28, y0, z + d + 0.02], [wx + 0.28, y0 + 0.55, z + d + 0.02], [wx - 0.28, y0 + 0.55, z + d + 0.02]], tint);
    }
  };

  // Un arbre : un tronc et trois étages de feuillage en octogones qui rétrécissent.
  const tree = (x, z, h) => {
    box(x - 0.12, GROUND_Y, z - 0.12, x + 0.12, GROUND_Y + h * 0.35, z + 0.12, 0.9);
    const tint = shadeAt(x, z) * 1.15;
    for (let level = 0; level < 3; level += 1) {
      const r = (1 - level * 0.28) * h * 0.32;
      const y0 = GROUND_Y + h * (0.3 + level * 0.22);
      const y1 = y0 + h * 0.3;
      for (let k = 0; k < 8; k += 1) {
        const a0 = (k / 8) * Math.PI * 2;
        const a1 = ((k + 1) / 8) * Math.PI * 2;
        const p0 = [x + Math.cos(a0) * r, y0, z + Math.sin(a0) * r];
        const p1 = [x + Math.cos(a1) * r, y0, z + Math.sin(a1) * r];
        polygon(dark, [p1, p0, [x, y1, z]], tint * (0.75 + 0.25 * Math.cos(a0 - 1.2)));
      }
    }
  };

  // Une lanterne sur son poteau : le poteau en silhouette, la lanterne qui luit.
  const lantern = (x, z) => {
    box(x - 0.05, GROUND_Y, z - 0.05, x + 0.05, GROUND_Y + 1.7, z + 0.05, 0.45);
    const start = glow.colors.length;
    pushBox(glowFrame, [x - 0.08, GROUND_Y + 1.62, z - 0.08], [x + 0.08, GROUND_Y + 1.84, z + 0.08], { groundAo: 1 });
    for (let i = start; i < glow.colors.length; i += 1) glow.colors[i] *= 0.6;
    // Une flaque de lueur au sol, sous la lanterne.
    const pool = [];
    for (let k = 0; k < 10; k += 1) {
      const a = (k / 10) * Math.PI * 2;
      pool.push([x + Math.cos(a) * 0.8, GROUND_Y + 0.02, z + Math.sin(a) * 0.6]);
    }
    for (let k = 0; k < 10; k += 1) polygon(glow, [[x, GROUND_Y + 0.02, z], pool[(k + 1) % 10], pool[k]], 0.045);
  };

  // Derrière le mur nord : une rangée de maisons (on n'en voit que les
  // toits, et seulement quand la pièce est profonde).
  let x = -6 + random() * 2;
  while (x < width + 6) {
    const w = 2.6 + random() * 2.4;
    const d = 2.4 + random() * 1.2;
    house(x, -1.6 - d - random(), w, d, 2.2 + random() * 1.2);
    x += w + 1.2 + random() * 1.4;
  }
  // Sur les côtés, ce qu'on voit le mieux : des maisons serrées le long de la
  // pièce, des arbres derrière elles.
  for (const side of [-1, 1]) {
    let z = -3 + random() * 1.5;
    while (z < depth + 1) {
      const d = 2.2 + random() * 1.4;
      const w = 2.4 + random() * 1.4;
      const gap = 1.4 + random() * 0.8;
      house(side < 0 ? -gap - w : width + gap, z, w, d, 2.0 + random() * 1.3);
      if (random() < 0.7) tree(side < 0 ? -gap - w - 1.2 - random() * 2 : width + gap + w + 1.2 + random() * 2, z + d * random(), 2.4 + random() * 1.4);
      z += d + 0.8 + random() * 1.2;
    }
    // Aux coins sud, des arbres qui ne cachent pas la pièce.
    for (let k = 0; k < 3; k += 1) {
      const tx = side < 0 ? -1.8 - random() * 5 : width + 1.8 + random() * 5;
      tree(tx, depth + 1.2 + random() * 4, 2.2 + random() * 1.4);
    }
    // Deux buissons bas aux coins, assez loin devant pour ne rien cacher.
    for (let k = 0; k < 2; k += 1) {
      const tx = side < 0 ? 0.6 + random() * 2 : width - 0.6 - random() * 2;
      tree(tx, depth + 3.6 + random() * 2, 1.1 + random() * 0.5);
    }
    // Une lanterne sur chaque flanc de la pièce, contre le mur.
    lantern(side < 0 ? -0.8 : width + 0.8, depth * 0.55);
  }
  // Au sud : une clôture basse de part et d'autre de l'allée, des touffes.
  for (let fx = -6; fx < width + 6; fx += 0.9) {
    if (Math.abs(fx - door) < 1.6) continue;
    box(fx - 0.05, GROUND_Y, depth + 2.6, fx + 0.05, GROUND_Y + 0.55, depth + 2.7, 1);
  }
  box(-6, GROUND_Y + 0.38, depth + 2.62, door - 1.6, GROUND_Y + 0.46, depth + 2.68, 1);
  box(door + 1.6, GROUND_Y + 0.38, depth + 2.62, width + 6, GROUND_Y + 0.46, depth + 2.68, 1);
  for (let k = 0; k < 18; k += 1) {
    const tx = -6 + random() * (width + 12);
    const tz = depth + 0.8 + random() * 7;
    if (Math.abs(tx - door) < 1.6) continue;
    const s = 0.18 + random() * 0.2;
    box(tx - s, GROUND_Y, tz - s, tx + s, GROUND_Y + s * 1.4, tz + s, 1.1);
  }

  const group = new THREE.Group();
  const darkMesh = new THREE.Mesh(toGeometry(dark), new THREE.MeshBasicMaterial({ color: beyondColors.silhouette, vertexColors: true, fog: false, side: THREE.DoubleSide }));
  const glowMesh = new THREE.Mesh(toGeometry(glow), new THREE.MeshBasicMaterial({ color: beyondColors.lueur, vertexColors: true, fog: false, side: THREE.DoubleSide }));
  for (const mesh of [darkMesh, glowMesh]) {
    mesh.matrixAutoUpdate = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);
  }
  return group;
}
