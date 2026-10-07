// La Lande des Hallucinations : la zone d'action hors les murs, à l'ouest de la
// porte. Un monde comme le village (même carte en lettres, mêmes matériaux,
// même sol), mais une lande : chemins de terre, murets en ruine, rochers,
// arbres morts et roux, un étang, des falaises boisées tout autour, une brume
// qui traîne au sol et une lumière plus froide, plus basse. On y entre par la
// porte ouest de la muraille (ici, le bord est de la carte) et on en ressort
// par là. Les Hallucinations y rôdent (game/enemies.js, data/enemies.js).

import * as THREE from 'three';
import { createMap } from './map.js';
import { createTerrain } from './terrain.js';
import { createCollider } from './collision.js';
import { buildTree, TREE_TRUNK_RADIUS } from './props.js';
import { buildFence, buildRock } from './landmarks.js';
import { createMeshBuilder, toGeometry } from './builder.js';
import { createFoliage, crownClumps } from '../gfx/foliage.js';
import { createGrass, scatterTufts } from '../gfx/grass.js';
import { createFringes } from '../gfx/fringes.js';
import { createFxUniforms } from '../gfx/fx/points.js';
import { createSky } from '../gfx/fx/sky.js';
import { createDust } from '../gfx/fx/dust.js';
import { createFireflies } from '../gfx/fx/fireflies.js';
import { foliageTints, moorColors } from '../data/palette.js';

const WIDTH = 28;
const DEPTH = 20;
const GATE_ROWS = [9, 11]; // la porte, dans la muraille du bord est
const SUN_COLOR = moorColors.soleil;
const SUN_INTENSITY = 4.2; // plus pâle qu'au village
const SUN_ELEVATION_DEG = 16; // plus bas : des ombres longues et froides
const SUN_AZIMUTH_DEG = -70;
const HEMI_INTENSITY = 2.2;
const SHADOW_EXTENT = 22;
const HAZE_START = 2;
const HAZE_DEPTH = 42; // la brume est bien plus dense qu'au village
const MIST = { count: 180, size: 0.09, glow: 0.55, drift: [0.22, 0.015, 0.08] };
const GRASS_DENSITY = 0.75;

// --- Implantation ------------------------------------------------------------
// Que de la donnée, comme world/layout.js pour le village.

// Arbres : position, taille, 'mort' (un tronc nu) ou 'automne' (couronne rousse).
const TREES = [
  [4.5, 3.5, 1.4, 'mort'], [10.5, 3.2, 1.6, 'automne'], [16.5, 3.5, 1.3, 'mort'], [22.5, 4.5, 1.5, 'automne'],
  [3.5, 8.5, 1.5, 'automne'], [11.5, 7.5, 1.2, 'mort'], [21.0, 13.5, 1.4, 'mort'], [24.5, 15.5, 1.6, 'automne'],
  [4.0, 16.5, 1.3, 'mort'], [10.0, 17.0, 1.5, 'automne'], [17.5, 17.2, 1.2, 'mort'], [8.5, 12.0, 1.1, 'mort'],
];
const ROCKS = [
  { x: 12.5, z: 12.0, size: 1.2 }, { x: 20.0, z: 6.5, size: 0.9 }, { x: 6.5, z: 13.5, size: 1.0 }, { x: 24.0, z: 7.5, size: 0.7 },
  { x: 15.5, z: 6.0, size: 0.8 }, { x: 9.0, z: 9.0, size: 0.6 }, { x: 22.5, z: 11.5, size: 0.8 }, { x: 3.5, z: 12.0, size: 1.1 },
];
// Barrières rompues : des tronçons qui ne clôturent plus rien.
const FENCES = [
  [[13.0, 3.0], [16.0, 3.0]], [[19.5, 15.5], [19.5, 17.5]], [[5.0, 7.0], [7.0, 7.0]],
];
const FIREFLY_ANCHORS = [[7, 5, 3], [16, 14, 3], [12, 9, 2.5], [22, 12, 2.5]];
// Où l'on arrive en venant du village, et la zone où l'on repart (la porte).
export const MOOR_SPAWN = { x: 25.2, z: 10.5, direction: 'left' };
export const MOOR_GATE = { x0: 26.2, x1: 28, z0: GATE_ROWS[0], z1: GATE_ROWS[1] + 1 };

// La carte, peinte par zones plutôt qu'écrite lettre à lettre : falaises tout
// autour, muraille à l'est percée de la porte, un chemin de terre qui part de
// la porte et se divise, un étang, les murets d'une ruine.
function paintMap() {
  const grid = Array.from({ length: DEPTH }, () => Array(WIDTH).fill('.'));
  const set = (x, z, ch) => {
    if (x >= 0 && z >= 0 && x < WIDTH && z < DEPTH) grid[z][x] = ch;
  };
  const rect = (x0, z0, x1, z1, ch) => {
    for (let z = z0; z <= z1; z += 1) for (let x = x0; x <= x1; x += 1) set(x, z, ch);
  };
  rect(0, 0, WIDTH - 1, 1, 'c'); // falaise nord
  rect(0, DEPTH - 2, WIDTH - 1, DEPTH - 1, 'c'); // falaise sud
  rect(0, 0, 1, DEPTH - 1, 'c'); // falaise ouest
  rect(WIDTH - 1, 0, WIDTH - 1, DEPTH - 1, 'W'); // la muraille d'Elelhem
  rect(WIDTH - 1, GATE_ROWS[0], WIDTH - 1, GATE_ROWS[1], 't'); // la porte
  rect(9, 9, WIDTH - 1, 11, 't'); // le chemin, de la porte vers l'ouest
  rect(5, 10, 9, 11, 't');
  rect(13, 12, 14, 15, 't'); // la branche vers la ruine
  rect(18, 5, 19, 9, 't'); // la branche vers le nord
  rect(5, 4, 8, 6, '~'); // l'étang
  set(4, 5, '~');
  set(9, 5, '~');
  set(6, 7, '~');
  rect(15, 13, 19, 13, '#'); // la ruine : trois pans de muret
  rect(15, 14, 15, 15, '#');
  rect(19, 15, 19, 15, '#');
  set(17, 15, '#');
  return grid.map((row) => row.join(''));
}

function sunDirectionFrom(elevationDeg, azimuthDeg) {
  const elevation = THREE.MathUtils.degToRad(elevationDeg);
  const azimuth = THREE.MathUtils.degToRad(azimuthDeg);
  return new THREE.Vector3(Math.cos(elevation) * Math.sin(azimuth), Math.sin(elevation), Math.cos(elevation) * Math.cos(azimuth));
}

// materials : ceux du village (mêmes textures, mêmes programmes de shader).
export function createMoor({ materials, narrowScreen = false }) {
  const scene = new THREE.Scene();
  const map = createMap(paintMap());
  scene.add(createTerrain(map, materials));

  // Ce qui est posé : rochers, barrières, arbres (fusionnés par matière).
  const keys = ['wood', 'rock', 'bark'];
  const builders = Object.fromEntries(keys.map((key) => [key, createMeshBuilder()]));
  const posts = [];
  const addPosts = (list) => posts.push(...[list].flat());
  for (const rock of ROCKS) addPosts(buildRock(rock, builders));
  for (const fence of FENCES) addPosts(buildFence(fence, builders));
  const clumps = [];
  TREES.forEach(([x, z, size, kind], i) => {
    posts.push({ x, z, radius: TREE_TRUNK_RADIUS * size });
    const crown = buildTree(x, z, { size }, builders);
    if (kind === 'mort') return; // un tronc et deux branches nues
    const tints = foliageTints.automne;
    clumps.push(...crownClumps(crown.center, crown.radius, tints[i % tints.length], i + 40));
  });
  const group = new THREE.Group();
  for (const key of keys) {
    if (builders[key].indices.length === 0) continue;
    const mesh = new THREE.Mesh(toGeometry(builders[key]), materials[key]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  scene.add(group);

  const sunDirection = sunDirectionFrom(SUN_ELEVATION_DEG, SUN_AZIMUTH_DEG);
  const fx = createFxUniforms();
  const blocked = (x, z) => posts.some((post) => Math.hypot(x - post.x, z - post.z) < post.radius + 0.15);
  scene.add(
    createSky(sunDirection),
    createFoliage(clumps, fx.uTime, 11, fx.uHero),
    createFringes(map, materials.grass, 23),
    createGrass(scatterTufts(map, { meadows: [[2, 2, WIDTH - 2, DEPTH - 3]], blocked, density: narrowScreen ? GRASS_DENSITY * 0.7 : GRASS_DENSITY, seed: 9 }), fx.uTime, 37, fx.uHero),
    createFireflies(FIREFLY_ANCHORS, fx),
    // La brume : des grains qui traînent au ras du sol sur toute la lande.
    createDust(fx, { ...MIST, box: [WIDTH - 3, 1.3, DEPTH - 4], origin: [1.5, 0.05, 2] }),
  );

  // Un soleil pâle et bas, un ciel mauve : la lumière de la lande.
  const sun = new THREE.DirectionalLight(SUN_COLOR, SUN_INTENSITY);
  const shadowSize = narrowScreen ? 1024 : 2048;
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(sun.shadow.camera, { left: -SHADOW_EXTENT, right: SHADOW_EXTENT, top: SHADOW_EXTENT, bottom: -SHADOW_EXTENT, near: 1, far: 90 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.camera.layers.enableAll();
  sun.layers.enableAll();
  const sky = new THREE.HemisphereLight(moorColors.ciel, moorColors.sol, HEMI_INTENSITY);
  sky.layers.enableAll();
  scene.add(sun, sun.target, sky);
  scene.fog = new THREE.Fog(moorColors.brume, 20, 60);

  // Cadrage d'ombre calé sur les texels, comme au village.
  const lightRight = new THREE.Vector3(0, 1, 0).cross(sunDirection).normalize();
  const lightUp = sunDirection.clone().cross(lightRight).normalize();
  const texel = (2 * SHADOW_EXTENT) / shadowSize;
  const snapped = new THREE.Vector3();

  return {
    kind: 'lande',
    map,
    scene,
    collider: createCollider(map, posts),
    addObstacle(x, z, radius) {
      const post = { x, z, radius };
      posts.push(post);
      return post;
    },
    removeObstacle(post) {
      const i = posts.indexOf(post);
      if (i !== -1) posts.splice(i, 1);
    },
    sunDirection,
    spawn: MOOR_SPAWN,
    gate: MOOR_GATE,
    fires: [],
    groundHeight(x, z) {
      return map.cellAt(Math.floor(x), Math.floor(z))?.height ?? 0;
    },
    setPointScale(scale) {
      fx.uPointScale.value = scale;
    },
    update(time, focus, cameraDistance, hero = null) {
      if (hero) fx.uHero.value.copy(hero);
      fx.uTime.value = time;
      fx.uFocus.value.copy(focus);
      const along = Math.round(focus.dot(lightRight) / texel) * texel;
      const across = Math.round(focus.dot(lightUp) / texel) * texel;
      snapped.copy(lightRight).multiplyScalar(along).addScaledVector(lightUp, across).addScaledVector(sunDirection, focus.dot(sunDirection));
      sun.target.position.copy(snapped);
      sun.position.copy(snapped).addScaledVector(sunDirection, 40);
      scene.fog.near = cameraDistance + HAZE_START;
      scene.fog.far = cameraDistance + HAZE_DEPTH;
    },
  };
}
