// Composition du village : carte, sol, maisons, tours, chantier, puits,
// arbres, lanternes, lumières, ciel et effets de vie (lucioles, poussière,
// fumée, rayons de soleil). L'implantation est dans world/layout.js.
//
// Lumière dorée de fin de journée : un soleil bas et chaud venu de
// l'ouest-sud-ouest, des ombres longues, un ciel froid en lumière d'ambiance
// (les faces à l'ombre bleuissent), une brume chaude au loin, des fenêtres et
// des lanternes allumées.

import * as THREE from 'three';
import { createMap } from './map.js';
import { createTerrain } from './terrain.js';
import { createCollider } from './collision.js';
import { buildHouse, buildLantern, buildTree, LANTERN_FLAME, LANTERN_POST_RADIUS, TREE_TRUNK_RADIUS } from './props.js';
import {
  buildAnvil, buildBarrel, buildBench, buildCrate, buildHearth, buildSign, buildSite, buildTower, buildVegetables, buildWell,
} from './landmarks.js';
import {
  ANVIL, BARRELS, BENCHES, CRATES, DECOR_LANTERNS, FIREFLY_ANCHORS, HEARTH, HOUSES, LANTERNS, SIGN, SITE, SPAWN, SUN_RAYS,
  PIGEONS, TOWERS, TREES, VEGETABLES, WELL,
} from './layout.js';
import { createPigeons } from '../gfx/fx/pigeons.js';
import { createMeshBuilder, toGeometry } from './builder.js';
import { createNoPointShadowMaterial, createPixelMaterial } from '../gfx/materials.js';
import { createFlames } from '../gfx/fx/flame.js';
import { createFxUniforms } from '../gfx/fx/points.js';
import { createSky } from '../gfx/fx/sky.js';
import { createFireflies } from '../gfx/fx/fireflies.js';
import { createDust } from '../gfx/fx/dust.js';
import { createSmoke } from '../gfx/fx/smoke.js';
import { createSunRays } from '../gfx/fx/sunrays.js';
import {
  createBrickTextures, createCobbleTextures, createDirtTextures, createDoorTexture, createGrassTextures,
  createLeafTextures, createPlasterTextures, createRockTextures, createRoofTextures, createWaterTextures,
  createWindowTextures, createWoodTextures,
} from '../gfx/textures.js';
import { hazeColor, ironColor, lanternColor, natureRamps } from '../data/palette.js';

const SUN_COLOR = 0xffc07a;
const SUN_INTENSITY = 6.5;
const SUN_ELEVATION_DEG = 23;
const SUN_AZIMUTH_DEG = -60;
const SKY_COLOR = 0x8fa4e6;
const GROUND_COLOR = 0x4a3a2c;
const HEMI_INTENSITY = 1.7;
const SHADOW_EXTENT = 22; // demi-largeur du cadrage d'ombre, centré sur la caméra
const SHADOW_BIAS = -0.0004;
const SHADOW_NORMAL_BIAS = 0.03;
const LANTERN_INTENSITY = 7;
const LANTERN_RANGE = 8;
const LANTERN_SHADOW_SIZE = 256;
const WINDOW_GLOW = 2.4;
const HAZE_START = 4; // au-delà de la distance de la caméra
const HAZE_DEPTH = 70;

function sunDirectionFrom(elevationDeg, azimuthDeg) {
  const elevation = THREE.MathUtils.degToRad(elevationDeg);
  const azimuth = THREE.MathUtils.degToRad(azimuthDeg);
  return new THREE.Vector3(
    Math.cos(elevation) * Math.sin(azimuth),
    Math.sin(elevation),
    Math.cos(elevation) * Math.cos(azimuth),
  );
}

function createMaterials() {
  const tile = (textures, options) => createPixelMaterial({ ...textures, ...options });
  const door = createDoorTexture();
  const windows = createWindowTextures();
  return {
    grass: tile(createGrassTextures(11), { normalStrength: 0.35, roughness: 0.95 }),
    dirt: tile(createDirtTextures(23), { normalStrength: 0.8, roughness: 0.95 }),
    cobble: tile(createCobbleTextures(37), { normalStrength: 0.7, roughness: 0.85 }),
    water: tile(createWaterTextures(41), { roughness: 0.35 }),
    plaster: tile(createPlasterTextures(53), { normalStrength: 0.4, roughness: 0.95 }),
    wood: tile(createWoodTextures(61), { normalStrength: 0.5, roughness: 0.8 }),
    roof: tile(createRoofTextures(67), { normalStrength: 0.9, roughness: 0.75 }),
    brick: tile(createBrickTextures(71), { normalStrength: 0.8, roughness: 0.9 }),
    door: createPixelMaterial({ map: door, texSize: [16, 32], roughness: 0.8 }),
    window: createPixelMaterial({ ...windows, emissiveIntensity: WINDOW_GLOW, texSize: [16, 16], roughness: 0.4 }),
    iron: new THREE.MeshStandardMaterial({ color: ironColor, roughness: 0.55, metalness: 0.4 }),
    bark: tile(createWoodTextures(83, natureRamps.ecorce), { normalStrength: 0.7, roughness: 0.95 }),
    leaves: tile(createLeafTextures(89), { normalStrength: 1, roughness: 0.9 }),
    rock: tile(createRockTextures(97), { normalStrength: 0.9, roughness: 0.95 }),
  };
}

// Une géométrie fusionnée par matière pour tout ce qui est bâti ou planté.
// flames : { lit, decor, hearth }, les points où se posent les flammes.
function createBuildings(materials, posts) {
  const keys = ['plaster', 'wood', 'roof', 'stone', 'brick', 'door', 'window', 'post', 'iron', 'bark', 'leaves'];
  const builders = Object.fromEntries(keys.map((key) => [key, createMeshBuilder()]));
  const addPosts = (list) => posts.push(...[list].flat());

  const chimneys = Object.values(HOUSES).map((house) => buildHouse(house, builders)).filter(Boolean);
  for (const tower of Object.values(TOWERS)) addPosts(buildTower(tower, builders));
  addPosts(buildSite(SITE, builders));
  addPosts(buildWell(WELL, builders));
  addPosts(buildAnvil(ANVIL, builders));
  const hearth = buildHearth(HEARTH, builders);
  addPosts(hearth.obstacle);
  for (const barrel of BARRELS) addPosts(buildBarrel(barrel, builders));
  for (const crate of CRATES) addPosts(buildCrate(crate, builders));
  for (const bench of BENCHES) addPosts(buildBench(bench, builders));
  buildSign(SIGN, builders);
  for (const garden of VEGETABLES) buildVegetables(garden, builders);
  TREES.forEach(([x, z, size], i) => {
    posts.push({ x, z, radius: TREE_TRUNK_RADIUS * size });
    buildTree(x, z, { size, seed: i }, builders);
  });
  const lanternFlame = ([x, z]) => {
    posts.push({ x, z, radius: LANTERN_POST_RADIUS });
    return buildLantern(x, z, builders);
  };
  const flames = { lit: LANTERNS.map(lanternFlame), decor: DECOR_LANTERNS.map(lanternFlame), hearth: [hearth.flame] };

  const group = new THREE.Group();
  group.name = 'constructions';
  for (const key of keys) {
    if (builders[key].indices.length === 0) continue;
    const material = { stone: materials.cobble, post: materials.wood }[key] ?? materials[key];
    const mesh = new THREE.Mesh(toGeometry(builders[key]), material);
    mesh.name = `constructions-${key}`;
    // Portes et fenêtres sont plaquées sur les murs : rien à projeter.
    mesh.castShadow = key !== 'door' && key !== 'window';
    // Poteau et ferronnerie des lanternes, juste sous la flamme, éteindraient
    // le sol tout autour : ombre au soleil, mais pas dans leur propre lumière.
    if (key === 'post' || key === 'iron') mesh.customDistanceMaterial = createNoPointShadowMaterial();
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  return { group, flames, chimneys };
}

export function createVillage(scene, { narrowScreen = false } = {}) {
  const map = createMap();
  for (const house of Object.values(HOUSES)) map.build(house.x, house.z, house.sizeX, house.sizeZ);
  for (const tower of Object.values(TOWERS)) map.build(tower.x, tower.z, tower.size, tower.size);
  map.build(SITE.x, SITE.z, SITE.sizeX, SITE.sizeZ);

  const materials = createMaterials();
  scene.add(createTerrain(map, materials));
  const posts = [];
  const buildings = createBuildings(materials, posts);
  scene.add(buildings.group);

  const { lit, decor, hearth } = buildings.flames;
  const flames = createFlames([...lit, ...decor, ...hearth], LANTERN_FLAME);
  scene.add(flames.mesh);

  // Soleil. Son cadrage d'ombre suit la caméra (voir update) : 44 unités de
  // côté, assez serré pour des ombres nettes.
  const sunDirection = sunDirectionFrom(SUN_ELEVATION_DEG, SUN_AZIMUTH_DEG);

  // Ciel et effets de vie, un appel de dessin chacun.
  const fx = createFxUniforms();
  scene.add(
    createSky(sunDirection),
    createFireflies(FIREFLY_ANCHORS, fx),
    createDust(fx),
    createSmoke(buildings.chimneys, fx),
    createSunRays(SUN_RAYS, sunDirection, fx),
  );
  const pigeons = createPigeons(PIGEONS);
  scene.add(pigeons.mesh);
  const sun = new THREE.DirectionalLight(SUN_COLOR, SUN_INTENSITY);
  const shadowSize = narrowScreen ? 1024 : 2048;
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(sun.shadow.camera, {
    left: -SHADOW_EXTENT, right: SHADOW_EXTENT, top: SHADOW_EXTENT, bottom: -SHADOW_EXTENT, near: 1, far: 90,
  });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = SHADOW_BIAS;
  sun.shadow.normalBias = SHADOW_NORMAL_BIAS;
  // Les sprites vivent sur un calque à part (dessinés après le post-traitement) :
  // le soleil doit les voir pour leur ombre, et toutes les lumières doivent
  // éclairer tous les calques.
  sun.shadow.camera.layers.enableAll();
  const sky = new THREE.HemisphereLight(SKY_COLOR, GROUND_COLOR, HEMI_INTENSITY);
  sun.layers.enableAll();
  sky.layers.enableAll();
  scene.add(sun, sun.target, sky);

  // Repère de la caméra d'ombre, pour caler son centre sur la grille de ses
  // texels : sans cela, les bords d'ombre ondulent quand la caméra glisse.
  const lightRight = new THREE.Vector3(0, 1, 0).cross(sunDirection).normalize();
  const lightUp = sunDirection.clone().cross(lightRight).normalize();
  const texel = (2 * SHADOW_EXTENT) / shadowSize;
  const snapped = new THREE.Vector3();

  // Lanternes : lumière chaude, ombres calculées une seule fois.
  const lanterns = buildings.flames.lit.map((flame, i) => {
    const light = new THREE.PointLight(lanternColor, LANTERN_INTENSITY, LANTERN_RANGE, 2);
    light.position.set(flame.x, flame.y + 0.12, flame.z);
    light.castShadow = true;
    light.shadow.mapSize.set(LANTERN_SHADOW_SIZE, LANTERN_SHADOW_SIZE);
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = LANTERN_RANGE;
    light.shadow.bias = -0.004;
    light.shadow.autoUpdate = false;
    light.shadow.needsUpdate = true;
    light.layers.enableAll();
    scene.add(light);
    return { light, seed: i * 2.39 };
  });

  scene.fog = new THREE.Fog(hazeColor, 30, 100);

  return {
    map,
    collider: createCollider(map, posts),
    // Obstacle rond posé après coup (un habitant) : le collider lit la même liste.
    addObstacle(x, z, radius) {
      posts.push({ x, z, radius });
    },
    sunDirection,
    spawn: SPAWN,
    groundHeight(x, z) {
      return map.cellAt(Math.floor(x), Math.floor(z))?.height ?? 0;
    },
    // Pixels par unité à distance 1 : taille des particules à l'écran.
    setPointScale(scale) {
      fx.uPointScale.value = scale;
    },
    // focus : point visé par la caméra ; cameraDistance : son recul.
    update(time, focus, cameraDistance) {
      fx.uTime.value = time;
      pigeons.update(time);
      fx.uFocus.value.copy(focus);
      const along = Math.round(focus.dot(lightRight) / texel) * texel;
      const across = Math.round(focus.dot(lightUp) / texel) * texel;
      snapped.copy(lightRight).multiplyScalar(along)
        .addScaledVector(lightUp, across)
        .addScaledVector(sunDirection, focus.dot(sunDirection));
      sun.target.position.copy(snapped);
      sun.position.copy(snapped).addScaledVector(sunDirection, 40);

      // Flammes et lanternes vacillent ensemble, doucement.
      flames.update(time);
      for (const { light, seed } of lanterns) {
        light.intensity = LANTERN_INTENSITY * (1 + 0.06 * Math.sin(time * 7.1 + seed) + 0.04 * Math.sin(time * 13.3 + seed * 2));
      }

      scene.fog.near = cameraDistance + HAZE_START;
      scene.fog.far = cameraDistance + HAZE_DEPTH;
    },
  };
}
