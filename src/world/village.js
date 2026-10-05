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
  buildAnvil, buildBarrel, buildBench, buildCampfire, buildCrate, buildFence, buildFlowerPot, buildHaystack, buildHearth,
  buildRock, buildSign, buildSignpost, buildSite, buildStall, buildTable, buildTower, buildVegetables, buildWell, buildWoodpile,
} from './landmarks.js';
import {
  ANVIL, BARRELS, BENCHES, BUNTING, BUSHES, BUTTERFLIES, CAMPFIRE, FENCES, FLOWER_POTS, HAYSTACKS, MEADOWS, ROCKS, SIGNPOSTS,
  STALLS, TABLES, WOODPILE, CRATES, DECOR_LANTERNS, FIREFLY_ANCHORS, HEARTH, HOUSES, LANTERNS, SIGN, SITE, SPAWN, SUN_RAYS,
  PIGEONS, TOWERS, TREES, VEGETABLES, WATERFALL, WELL,
} from './layout.js';
import { createPigeons } from '../gfx/fx/pigeons.js';
import { createFoliage, crownClumps } from '../gfx/foliage.js';
import { createGrass, FIRST_FLOWER_VARIANT, FLOWER_VARIANTS, scatterTufts } from '../gfx/grass.js';
import { createWaterfall } from '../gfx/fx/waterfall.js';
import { createOutskirts } from './outskirts.js';
import { createFringes } from '../gfx/fringes.js';
import { createBunting } from '../gfx/bunting.js';
import { createLightPools } from '../gfx/lightpools.js';
import { createButterflies, createFallingLeaves } from '../gfx/fx/leaves.js';
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
  createWindowTextures, createWoodTextures, createAwningTexture, createSlateTextures, createStoneWallTextures, createThatchTextures,
} from '../gfx/textures.js';
import { foliageTints, hazeColor, ironColor, lanternColor, natureRamps } from '../data/palette.js';

const SUN_COLOR = 0xffc07a;
const SUN_INTENSITY = 6.5;
const SUN_ELEVATION_DEG = 28; // assez bas pour des ombres longues, assez haut pour ne pas noyer la place
const SUN_AZIMUTH_DEG = -60;
const SKY_COLOR = 0x86a8e8;
const GROUND_COLOR = 0x4a3a2c;
const HEMI_INTENSITY = 2.6; // les ombres restent lisibles, bleutées plutôt que noires
const SHADOW_EXTENT = 22; // demi-largeur du cadrage d'ombre, centré sur la caméra
const SHADOW_BIAS = -0.0004;
const SHADOW_NORMAL_BIAS = 0.03;
const LANTERN_INTENSITY = 7;
const LANTERN_RANGE = 8;
const LANTERN_SHADOW_SIZE = 256;
const WINDOW_GLOW = 2.4;
const HAZE_START = 4; // au-delà de la distance de la caméra
const HAZE_DEPTH = 70;
const WATER_FLOW = 0.12; // défilement de la rivière, en tuiles par seconde
const GRASS_DENSITY_LIGHT = 0.65; // sur téléphone, un tiers de touffes en moins

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
    slate: tile(createSlateTextures(101), { normalStrength: 1.0, roughness: 0.7 }),
    thatch: tile(createThatchTextures(103), { normalStrength: 0.9, roughness: 1 }),
    stonewall: tile(createStoneWallTextures(107), { normalStrength: 0.8, roughness: 0.9 }),
    awning: createPixelMaterial({ ...createAwningTexture(), roughness: 0.9 }),
  };
}

// Une géométrie fusionnée par matière pour tout ce qui est bâti ou planté.
// flames : { lit, decor, hearth }, les points où se posent les flammes.
function createBuildings(materials, posts) {
  const keys = [
    'plaster', 'stonewall', 'wood', 'roof', 'slate', 'thatch', 'stone', 'brick', 'door', 'window', 'post', 'iron', 'bark',
    'leaves', 'rock', 'awning',
  ];
  const builders = Object.fromEntries(keys.map((key) => [key, createMeshBuilder()]));
  const addPosts = (list) => posts.push(...[list].flat());

  const houses = Object.values(HOUSES).map((house) => buildHouse(house, builders));
  const chimneys = houses.map((house) => house.chimney).filter(Boolean);
  const planters = houses.flatMap((house) => house.planters);
  for (const stall of STALLS) addPosts(buildStall(stall, builders));
  for (const fence of FENCES) addPosts(buildFence(fence, builders));
  for (const stack of HAYSTACKS) addPosts(buildHaystack(stack, builders));
  for (const rock of ROCKS) addPosts(buildRock(rock, builders));
  for (const table of TABLES) addPosts(buildTable(table, builders));
  for (const post of SIGNPOSTS) addPosts(buildSignpost(post, builders));
  addPosts(buildWoodpile(WOODPILE, builders));
  const pots = FLOWER_POTS.map((pot) => buildFlowerPot(pot, builders));
  for (const pot of pots) addPosts(pot.obstacle);
  planters.push(...pots.map((pot) => pot.flowers));
  const campfire = buildCampfire(CAMPFIRE, builders);
  addPosts(campfire.obstacle);
  chimneys.push(campfire.smoke);
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
  // Couronnes : les grappes de tous les arbres, dessinées ensemble (voir createVillage).
  const clumps = [];
  const autumnCrowns = []; // d'où tombent les feuilles
  TREES.forEach(([x, z, size, kind = 'vert'], i) => {
    posts.push({ x, z, radius: TREE_TRUNK_RADIUS * size });
    const crown = buildTree(x, z, { size }, builders);
    const tints = foliageTints[kind];
    const tint = tints[i % tints.length];
    clumps.push(...crownClumps(crown.center, crown.radius, tint, i));
    if (kind === 'automne') autumnCrowns.push({ ...crown.center, radius: crown.radius, tint });
  });
  const lanternFlame = ([x, z]) => {
    posts.push({ x, z, radius: LANTERN_POST_RADIUS });
    return buildLantern(x, z, builders);
  };
  const flames = { lit: LANTERNS.map(lanternFlame), decor: DECOR_LANTERNS.map(lanternFlame), hearth: [hearth.flame, campfire.flame] };

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
  return { group, flames, chimneys, clumps, planters, autumnCrowns };
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
  // Buissons : deux ou trois grappes posées au sol.
  const bushClumps = BUSHES.flatMap(([x, z, size], i) => {
    const tint = foliageTints.buisson[i % foliageTints.buisson.length];
    const r = 0.42 * size;
    return [
      { x, y: r * 0.9, z, size: r * 2.1, tint },
      { x: x + r * 0.7, y: r * 0.7, z: z + r * 0.3, size: r * 1.6, tint },
      { x: x - r * 0.6, y: r * 0.65, z: z + r * 0.4, size: r * 1.5, tint },
    ];
  });
  for (const [x, z, size] of BUSHES) posts.push({ x, z, radius: 0.4 * size });
  // Haies : chaque case de haie se couvre de deux grappes, le bloc devient touffu.
  const hedgeClumps = [];
  for (let z = 0; z < map.depth; z += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (map.cellAt(x, z)?.name !== 'haie') continue;
      const tint = foliageTints.haie[(x + z) % foliageTints.haie.length];
      hedgeClumps.push(
        { x: x + 0.5, y: 0.62, z: z + 0.5, size: 1.3, tint },
        { x: x + 0.5 + (((x * 7 + z) % 3) - 1) * 0.15, y: 0.85, z: z + 0.65, size: 1.0, tint },
      );
    }
  }
  // Le monde autour du village : plateau, plaine, rivière, routes, lisière.
  const outskirts = createOutskirts(map, materials, { tints: foliageTints, light: narrowScreen });
  scene.add(outskirts.group);
  scene.add(createFoliage([...buildings.clumps, ...bushClumps, ...hedgeClumps, ...outskirts.clumps], fx.uTime));
  scene.add(createWaterfall(WATERFALL, materials.water.map, fx));
  // Lisières dentelées, fanions, flaques de lumière, feuilles et papillons.
  scene.add(createFringes(map, materials.grass));
  scene.add(createBunting(BUNTING, fx.uTime));
  scene.add(createLightPools([
    ...buildings.flames.lit.map((f) => ({ x: f.x, y: 0, z: f.z, radius: 2.0, strength: 0.45 })),
    ...buildings.flames.decor.map((f) => ({ x: f.x, y: 0, z: f.z, radius: 1.7 })),
    ...buildings.flames.hearth.map((f) => ({ x: f.x, y: 0, z: f.z, radius: 1.8, strength: 1.2 })),
  ]));
  scene.add(createFallingLeaves([...buildings.autumnCrowns, ...outskirts.autumnCrowns], fx));
  scene.add(createButterflies(BUTTERFLIES, fx));
  // La rivière coule vers le sud : sa texture défile.
  const waterCompile = materials.water.onBeforeCompile;
  materials.water.onBeforeCompile = (shader, renderer) => {
    waterCompile(shader, renderer);
    shader.uniforms.uTime = fx.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>\nvMapUv.y += uTime * ${WATER_FLOW.toFixed(3)};`);
  };

  // Herbe en touffes : partout où il y a de l'herbe libre.
  const blocked = (x, z) => posts.some((post) => Math.hypot(x - post.x, z - post.z) < post.radius + 0.15);
  const planterFlowers = buildings.planters.map((point, i) => ({ ...point, variant: FIRST_FLOWER_VARIANT + (i % FLOWER_VARIANTS) }));
  scene.add(createGrass([...scatterTufts(map, { meadows: MEADOWS, blocked, density: narrowScreen ? GRASS_DENSITY_LIGHT : 1 }), ...planterFlowers, ...outskirts.tufts], fx.uTime));
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
