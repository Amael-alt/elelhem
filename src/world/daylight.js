// La lumière du jour qui tourne (version 2.9) : une soirée qui tombe, la
// nuit, l'aube, le jour, puis le soir revient. Que de la donnée : quatre
// moments-clés, et une interpolation entre eux. Le village applique ce
// qu'on lui rend (world/village.js, setDaylight) : soleil, lumière du ciel,
// brume, fenêtres, lanternes, et la part de nuit (uNight) pour les lucioles
// et les runes de la place.
//
// Le cycle dure DAY_PERIOD secondes de jeu et commence au soir doré, le
// moment pour lequel l'étalonnage a été réglé.

import * as THREE from 'three';
import { hazeColor } from '../data/palette.js';

export const DAY_PERIOD = 720; // douze minutes de jeu pour un tour complet

// t : part du cycle, de 0 (soir) à 1 (le soir suivant).
const MOMENTS = [
  { t: 0.0, nom: 'soir', sun: '#ffc07a', sunPower: 6.5, sky: '#86a8e8', ground: '#4a3a2c', hemi: 2.6, haze: hazeColor, windows: 2.4, lanterns: 1.0, night: 0.0 },
  { t: 0.22, nom: 'nuit', sun: '#7b8fd0', sunPower: 1.7, sky: '#2b3666', ground: '#15111e', hemi: 1.9, haze: '#1c2342', windows: 3.4, lanterns: 1.7, night: 1.0 },
  { t: 0.48, nom: 'aube', sun: '#ffa98a', sunPower: 3.6, sky: '#9ab0e0', ground: '#3a2c2c', hemi: 2.3, haze: '#c9a6a0', windows: 1.4, lanterns: 0.9, night: 0.15 },
  { t: 0.72, nom: 'jour', sun: '#fff0d0', sunPower: 6.0, sky: '#9fc2ff', ground: '#55483a', hemi: 2.8, haze: '#cfd9e8', windows: 0.6, lanterns: 0.45, night: 0.0 },
];

const colors = MOMENTS.map((m) => ({ sun: new THREE.Color(m.sun), sky: new THREE.Color(m.sky), ground: new THREE.Color(m.ground), haze: new THREE.Color(m.haze) }));
const smooth = (x) => x * x * (3 - 2 * x);

// Un état de lumière interpolé, écrit dans out (objets réutilisés).
export function daylightAt(t, out = createDaylight()) {
  const phase = ((t % 1) + 1) % 1;
  let i = MOMENTS.length - 1;
  for (let k = 0; k < MOMENTS.length; k += 1) if (phase >= MOMENTS[k].t) i = k;
  const a = MOMENTS[i];
  const b = MOMENTS[(i + 1) % MOMENTS.length];
  const span = ((b.t - a.t) + 1) % 1 || 1;
  const u = smooth(Math.min(1, (phase - a.t) / span));
  const ca = colors[i];
  const cb = colors[(i + 1) % MOMENTS.length];
  out.sun.copy(ca.sun).lerp(cb.sun, u);
  out.sky.copy(ca.sky).lerp(cb.sky, u);
  out.ground.copy(ca.ground).lerp(cb.ground, u);
  out.haze.copy(ca.haze).lerp(cb.haze, u);
  out.sunPower = a.sunPower + (b.sunPower - a.sunPower) * u;
  out.hemi = a.hemi + (b.hemi - a.hemi) * u;
  out.windows = a.windows + (b.windows - a.windows) * u;
  out.lanterns = a.lanterns + (b.lanterns - a.lanterns) * u;
  out.night = a.night + (b.night - a.night) * u;
  out.moment = u < 0.5 ? a.nom : b.nom;
  return out;
}

export function createDaylight() {
  return { sun: new THREE.Color(), sky: new THREE.Color(), ground: new THREE.Color(), haze: new THREE.Color(), sunPower: 6.5, hemi: 2.6, windows: 2.4, lanterns: 1, night: 0, moment: 'soir' };
}
