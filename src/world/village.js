// Composition du village : carte, sol, maisons, lanternes, lumières.
//
// Lumière dorée de fin de journée : un soleil bas et chaud venu de
// l'ouest-sud-ouest, des ombres longues, un ciel froid en lumière d'ambiance
// (les faces à l'ombre bleuissent), une brume chaude au loin, des fenêtres et
// des lanternes allumées.

import * as THREE from 'three';
import { createMap } from './map.js';
import { createTerrain } from './terrain.js';
import { createCollider } from './collision.js';
import { buildHouse, buildLantern, LANTERN_FLAME, LANTERN_POST_RADIUS } from './props.js';
import { createMeshBuilder, toGeometry } from './builder.js';
import { createNoPointShadowMaterial, createPixelMaterial } from '../gfx/materials.js';
import { createFlames } from '../gfx/fx/flame.js';
import {
  createBrickTextures, createCobbleTextures, createDirtTextures, createDoorTexture, createGrassTextures,
  createPlasterTextures, createRoofTextures, createWaterTextures, createWindowTextures, createWoodTextures,
} from '../gfx/textures.js';
import { hazeColor, ironColor, lanternColor } from '../data/palette.js';

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

// Maisons : coin nord-ouest (x, z), emprise en cases, hauteur des murs, montée
// du toit, axe du faîtage, porte et fenêtres (côté, décalage depuis le milieu
// du mur, hauteur), cheminée (position relative dans le repère de la maison).
const HOUSES = [
  {
    x: 17, z: 4, sizeX: 4, sizeZ: 3, wall: 2.6, rise: 1.5, ridge: 'x',
    door: { side: 'south', offset: -0.6 },
    windows: [{ side: 'south', offset: 1.0 }, { side: 'west', offset: 0 }],
    chimney: [0.75, 0.3],
  },
  {
    x: 3, z: 14, sizeX: 4, sizeZ: 3, wall: 2.6, rise: 1.6, ridge: 'z',
    door: { side: 'south', offset: -0.8 },
    windows: [{ side: 'south', offset: 0.9 }, { side: 'south', offset: 0, y: 2.75 }],
    chimney: [0.3, 0.75],
  },
  {
    x: 20, z: 15, sizeX: 4, sizeZ: 3, wall: 2.4, rise: 1.5, ridge: 'z',
    door: { side: 'south', offset: 0.7 },
    windows: [{ side: 'south', offset: -0.9 }, { side: 'south', offset: 0, y: 2.6 }, { side: 'west', offset: 0 }],
    chimney: [0.7, 0.3],
  },
  {
    x: 16, z: 18, sizeX: 4, sizeZ: 3, wall: 2.6, rise: 1.4, ridge: 'x',
    door: { side: 'south', offset: 0.6 },
    windows: [{ side: 'south', offset: -1.0 }, { side: 'west', offset: 0 }],
    chimney: [0.25, 0.7],
  },
];

// Quatre lanternes avec ombre : les deux coins nord de la place, son coin
// sud-ouest, et le gué.
const LANTERNS = [[10.5, 9.5], [19.5, 9.5], [10.5, 15.5], [22.5, 11.4]];

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
  };
}

// Une géométrie fusionnée par matière pour tout ce qui est bâti.
function createBuildings(materials, posts) {
  const keys = ['plaster', 'wood', 'roof', 'stone', 'brick', 'door', 'window', 'post', 'iron'];
  const builders = Object.fromEntries(keys.map((key) => [key, createMeshBuilder()]));
  for (const house of HOUSES) buildHouse(house, builders);
  const flames = LANTERNS.map(([x, z]) => {
    posts.push({ x, z, radius: LANTERN_POST_RADIUS });
    return buildLantern(x, z, builders);
  });

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
  return { group, flames };
}

export function createVillage(scene, { narrowScreen = false } = {}) {
  const map = createMap();
  for (const house of HOUSES) map.build(house.x, house.z, house.sizeX, house.sizeZ);

  const materials = createMaterials();
  scene.add(createTerrain(map, materials));
  const posts = [];
  const buildings = createBuildings(materials, posts);
  scene.add(buildings.group);

  const flames = createFlames(buildings.flames, LANTERN_FLAME);
  scene.add(flames.mesh);

  // Soleil. Son cadrage d'ombre suit la caméra (voir update) : 44 unités de
  // côté, assez serré pour des ombres nettes.
  const sunDirection = sunDirectionFrom(SUN_ELEVATION_DEG, SUN_AZIMUTH_DEG);
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
  const lanterns = buildings.flames.map((flame, i) => {
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
    sunDirection,
    spawn: { x: 15.5, z: 12.5 },
    groundHeight(x, z) {
      return map.cellAt(Math.floor(x), Math.floor(z))?.height ?? 0;
    },
    // focus : point visé par la caméra ; cameraDistance : son recul.
    update(time, focus, cameraDistance) {
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
