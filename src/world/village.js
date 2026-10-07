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
import { buildFlowerBed, buildKerb, buildNoticeBoard, buildClothesline, buildSteppingStones, buildSundial, buildChalkboard, buildLowWall, buildPlanterBox,
  buildAnvil, buildAppleTree, buildBarrel, buildBasket, buildBench, buildCampfire, buildCrate, buildDummy, buildFence,
  buildFlowerPot, buildHaystack, buildHearth, buildLadder, buildMarketStall, buildRock, buildShopSign, buildSignpost, buildSite,
  buildStall, buildTable, buildTarget, buildTower, buildVegetables, buildWashhouse, buildWell, buildWoodpile,
} from './landmarks.js';
import {
  ANVIL, BARRELS, BENCHES, BUNTING, BUSHES, BUTTERFLIES, CAMPFIRE, FENCES, FLOWER_POTS, HAYSTACKS, MEADOWS, ROCKS, SIGNPOSTS,
  STALLS, TABLES, WOODPILE, CRATES, DECOR_LANTERNS, FIREFLY_ANCHORS, HEARTH, HOUSES, LANTERNS, MARKET_STALLS, ORCHARD, SITE,
  SPAWN, SUN_RAYS, PIGEONS, TOWERS, TRAINING, TREES, VEGETABLES, WASHHOUSE, WATERFALL, WELL, CHESTS, INN_COURT, FORGE_YARD, LIBRARY_COURT, APOTHECARY_YARD, HOME_GARDEN, SQUARE,
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
import { buildBeehive, buildDryingRack, buildPlant, buildTripodCauldron, buildBookStack, buildGrindstone, buildIronBars, buildSacks, buildShield, buildSwordBarrel, buildTrough, buildWeaponRack, buildStool, buildChest } from './furniture.js';
import { createNoPointShadowMaterial, createPixelMaterial } from '../gfx/materials.js';
import { createFlames } from '../gfx/fx/flame.js';
import { createFxUniforms } from '../gfx/fx/points.js';
import { createSky } from '../gfx/fx/sky.js';
import { createFireflies } from '../gfx/fx/fireflies.js';
import { createDust } from '../gfx/fx/dust.js';
import { createSmoke } from '../gfx/fx/smoke.js';
import { createSunRays } from '../gfx/fx/sunrays.js';
import {
  createBrickTextures, createCobbleTextures, createFanCobbleTextures, createDirtTextures, createDoorTexture, createGrassTextures,
  createLeafTextures, createPlasterTextures, createRockTextures, createRoofTextures, createWaterTextures,
  createWindowTextures, createWoodTextures, createAwningTexture, createSlateTextures, createStoneWallTextures, createThatchTextures,
  createFlagstoneTextures, createPaintingTexture, createPanelTextures, createPlankTextures, createRugTexture, RUG_PIXELS_PER_UNIT,
} from '../gfx/textures.js';
import { buildingRamps, foliageTints, hazeColor, interiorRamps, ironColor, lanternColor, natureRamps, terrainRamps } from '../data/palette.js';

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
  // Le tapis d'un intérieur a une texture à sa taille, faite à la demande et
  // gardée par taille (deux tapis de même taille partagent la leur).
  const rugs = new Map();
  const rug = (width, depth) => {
    const w = Math.round(width * RUG_PIXELS_PER_UNIT);
    const d = Math.round(depth * RUG_PIXELS_PER_UNIT);
    const key = `${w}x${d}`;
    if (!rugs.has(key)) rugs.set(key, createPixelMaterial({ map: createRugTexture(w, d), texSize: [w, d], roughness: 1 }));
    return rugs.get(key);
  };
  return {
    grass: tile(createGrassTextures(11), { normalStrength: 0.35, roughness: 0.95 }),
    dirt: tile(createDirtTextures(23), { normalStrength: 0.8, roughness: 0.95 }),
    cobble: tile(createCobbleTextures(37), { normalStrength: 0.7, roughness: 0.85 }),
    // Le parvis de l'auberge (version 2.5) : des pavés en éventail.
    fan: tile(createFanCobbleTextures(43), { normalStrength: 0.75, roughness: 0.85 }),
    // La cour de la forge (version 2.6) : de grandes dalles.
    yard: tile(createFlagstoneTextures(151, terrainRamps.cour), { normalStrength: 0.9, roughness: 0.95 }),
    water: tile(createWaterTextures(41), { roughness: 0.35 }),
    plaster: tile(createPlasterTextures(53), { normalStrength: 0.4, roughness: 0.95 }),
    wood: tile(createWoodTextures(61), { normalStrength: 0.5, roughness: 0.8 }),
    roof: tile(createRoofTextures(67), { normalStrength: 0.9, roughness: 0.75 }),
    brick: tile(createBrickTextures(71), { normalStrength: 0.8, roughness: 0.9 }),
    door: createPixelMaterial({ map: door, roughness: 0.8 }),
    window: createPixelMaterial({ ...windows, emissiveIntensity: WINDOW_GLOW, roughness: 0.4 }),
    iron: new THREE.MeshStandardMaterial({ color: ironColor, roughness: 0.55, metalness: 0.4 }),
    bark: tile(createWoodTextures(83, natureRamps.ecorce), { normalStrength: 0.7, roughness: 0.95 }),
    leaves: tile(createLeafTextures(89), { normalStrength: 1, roughness: 0.9 }),
    rock: tile(createRockTextures(97), { normalStrength: 0.9, roughness: 0.95 }),
    slate: tile(createSlateTextures(101), { normalStrength: 1.0, roughness: 0.7 }),
    thatch: tile(createThatchTextures(103), { normalStrength: 0.9, roughness: 1 }),
    stonewall: tile(createStoneWallTextures(107), { normalStrength: 0.8, roughness: 0.9 }),
    // Les volets peints des façades (version 2.4) : du bois, en trois couleurs.
    voletVert: tile(createWoodTextures(141, buildingRamps.voletVert), { normalStrength: 0.4, roughness: 0.85 }),
    voletBleu: tile(createWoodTextures(143, buildingRamps.voletBleu), { normalStrength: 0.4, roughness: 0.85 }),
    voletRouge: tile(createWoodTextures(149, buildingRamps.voletRouge), { normalStrength: 0.4, roughness: 0.85 }),
    awning: createPixelMaterial({ ...createAwningTexture(), roughness: 0.9 }),
    // Les intérieurs (version 1.3, world/interior.js) : plancher de lattes,
    // dalles de la forge, lambris, enduit à la chaux, les tableaux, le tapis.
    plank: tile(createPlankTextures(113), { normalStrength: 0.6, roughness: 0.85 }),
    flagstone: tile(createFlagstoneTextures(127), { normalStrength: 0.9, roughness: 0.95 }),
    paneling: tile(createPanelTextures(131), { normalStrength: 0.6, roughness: 0.8 }),
    plasterIn: tile(createPlasterTextures(137, interiorRamps.enduit), { normalStrength: 0.4, roughness: 0.95 }),
    // Le velours des fauteuils (version 2.5).
    velvet: tile(createPlasterTextures(149, interiorRamps.velours), { normalStrength: 0.5, roughness: 0.9 }),
    // La toile d'un tableau s'éclaire un peu d'elle-même : le mur nord ne reçoit
    // pas le jour (il entre par ses fenêtres), un tableau y resterait terne.
    painting: (() => {
      const map = createPaintingTexture(139);
      return createPixelMaterial({ map, emissiveMap: map, emissiveIntensity: 0.45, texSize: [20, 14], roughness: 0.9 });
    })(),
    rug,
  };
}

// Une géométrie fusionnée par matière pour tout ce qui est bâti ou planté.
// flames : { lit, decor, hearth }, les points où se posent les flammes.
function createBuildings(materials, posts) {
  const keys = [
    'plaster', 'stonewall', 'wood', 'roof', 'slate', 'thatch', 'stone', 'brick', 'door', 'window', 'post', 'iron', 'bark',
    'leaves', 'rock', 'awning', 'voletVert', 'voletBleu', 'voletRouge', 'yard',
  ];
  const builders = Object.fromEntries(keys.map((key) => [key, createMeshBuilder()]));
  const addPosts = (list) => posts.push(...[list].flat());

  const houses = Object.values(HOUSES).map((house) => buildHouse(house, builders));
  const chimneys = houses.map((house) => house.chimney).filter(Boolean);
  const planters = houses.flatMap((house) => house.planters);
  // Les lanternes murales des portes (version 2.4) : des flammes d'ambiance.
  const wallLanterns = houses.flatMap((house) => house.lanterns);
  // Les enseignes figurées (version 2.4) : au sud de la façade, à droite de la porte.
  for (const house of Object.values(HOUSES)) {
    if (!house.sign) continue;
    buildShopSign({ x: house.x + house.sizeX / 2 + (house.door?.offset ?? 0) + 1.15, z: house.z + house.sizeZ, y: 2.35, kind: house.sign }, builders);
  }
  for (const stall of STALLS) addPosts(buildStall(stall, builders));
  // Version 2.3 : le marché, le lavoir, l'enclos d'entraînement et le verger.
  for (const stall of MARKET_STALLS) addPosts(buildMarketStall(stall, builders));
  addPosts(buildWashhouse(WASHHOUSE, builders));
  const dummies = TRAINING.dummies.map((dummy) => buildDummy(dummy, builders));
  for (const dummy of dummies) addPosts(dummy.obstacle);
  for (const target of TRAINING.targets) addPosts(buildTarget(target, builders));
  addPosts(buildLadder(ORCHARD.ladder, builders));
  for (const chest of CHESTS) addPosts(buildChest(chest, builders).posts);
  for (const basket of ORCHARD.baskets) addPosts(buildBasket(basket, builders));
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
  // Le parvis de l'auberge (version 2.5) : muret à chaperon, jardinières
  // fleuries, chevalet d'ardoise, tabourets autour des tables de la terrasse.
  for (const wall of INN_COURT.walls) addPosts(buildLowWall(wall, builders));
  for (const box of INN_COURT.planters) {
    const planter = buildPlanterBox(box, builders);
    addPosts(planter.obstacle);
    planters.push(...planter.flowers);
  }
  addPosts(buildChalkboard(INN_COURT.chalkboard, builders));
  for (const stool of INN_COURT.stools) addPosts(buildStool(stool, builders).posts);
  // Le parvis de la bibliothèque (version 2.6).
  for (const wall of LIBRARY_COURT.walls) addPosts(buildLowWall(wall, builders));
  for (const box of LIBRARY_COURT.planters) {
    const planter = buildPlanterBox(box, builders);
    addPosts(planter.obstacle);
    planters.push(...planter.flowers);
  }
  addPosts(buildSundial(LIBRARY_COURT.sundial, builders));
  buildBookStack(LIBRARY_COURT.books, builders);
  // Le jardin de la maison du héros (version 2.6).
  for (const fence of HOME_GARDEN.fences) addPosts(buildFence(fence, builders));
  buildSteppingStones(HOME_GARDEN.stones, builders);
  buildVegetables(HOME_GARDEN.vegetables, builders);
  addPosts(buildClothesline(HOME_GARDEN.clothesline, builders));
  addPosts(buildWoodpile(HOME_GARDEN.woodpile, builders));
  addPosts(buildBench(HOME_GARDEN.bench, builders));
  addPosts(buildBarrel(HOME_GARDEN.barrel, builders));
  for (const spot of HOME_GARDEN.pots) {
    const pot = buildFlowerPot(spot, builders);
    addPosts(pot.obstacle);
    planters.push(pot.flowers);
  }
  // Les abords de l'apothicairerie (version 2.6).
  addPosts(buildDryingRack(APOTHECARY_YARD.rack, builders).posts);
  addPosts(buildPlant(APOTHECARY_YARD.plant, builders).posts);
  addPosts(buildTripodCauldron(APOTHECARY_YARD.cauldron, builders).posts);
  for (const hive of APOTHECARY_YARD.hives) addPosts(buildBeehive(hive, builders).posts);
  // La cour de la forge (version 2.6).
  for (const wall of FORGE_YARD.walls) addPosts(buildLowWall(wall, builders));
  addPosts(buildWeaponRack(FORGE_YARD.rack, builders).posts);
  buildShield(FORGE_YARD.shield, builders);
  addPosts(buildSwordBarrel(FORGE_YARD.swordBarrel, builders).posts);
  addPosts(buildIronBars(FORGE_YARD.bars, builders).posts);
  addPosts(buildSacks(FORGE_YARD.sacks, builders).posts);
  addPosts(buildTrough(FORGE_YARD.trough, builders).posts);
  addPosts(buildGrindstone(FORGE_YARD.grindstone, builders).posts);
  for (const garden of VEGETABLES) buildVegetables(garden, builders);
  // Couronnes : les grappes de tous les arbres, dessinées ensemble (voir createVillage).
  const clumps = [];
  const autumnCrowns = []; // d'où tombent les feuilles
  // La place du puits (version 2.6) : bordure du tapis de pavés, massifs
  // fleuris et leurs boules taillées, jardinières, panneau d'affichage, sacs
  // et panier près de l'étal. Le puits, son rond de dalles et les bancs sont
  // posés plus haut.
  buildKerb(SQUARE.kerb, builders);
  SQUARE.beds.forEach((spot, i) => {
    const bed = buildFlowerBed(spot, builders);
    addPosts(bed.obstacle);
    planters.push(...bed.flowers);
    clumps.push({ ...bed.bush, tint: foliageTints.buisson[i % foliageTints.buisson.length] });
  });
  for (const box of SQUARE.planters) {
    const planter = buildPlanterBox(box, builders);
    addPosts(planter.obstacle);
    planters.push(...planter.flowers);
  }
  addPosts(buildNoticeBoard(SQUARE.board, builders));
  addPosts(buildSacks(SQUARE.sacks, builders).posts);
  addPosts(buildBasket(SQUARE.basket, builders));
  TREES.forEach(([x, z, size, kind = 'vert'], i) => {
    posts.push({ x, z, radius: TREE_TRUNK_RADIUS * size });
    const crown = buildTree(x, z, { size }, builders);
    const tints = foliageTints[kind];
    const tint = tints[i % tints.length];
    clumps.push(...crownClumps(crown.center, crown.radius, tint, i));
    if (kind === 'automne') autumnCrowns.push({ ...crown.center, radius: crown.radius, tint });
  });
  // Les pommiers du verger : couronnes plus rondes et plus basses, chargées
  // de pommes (buildAppleTree pose les fruits dans la géométrie).
  ORCHARD.trees.forEach(([x, z, size], i) => {
    posts.push({ x, z, radius: TREE_TRUNK_RADIUS * size });
    const crown = buildAppleTree(x, z, { size }, builders);
    const tints = foliageTints.verger ?? foliageTints.vert;
    clumps.push(...crownClumps(crown.center, crown.radius, tints[i % tints.length], 100 + i));
  });
  const lanternFlame = ([x, z]) => {
    posts.push({ x, z, radius: LANTERN_POST_RADIUS });
    return buildLantern(x, z, builders);
  };
  const flames = { lit: LANTERNS.map(lanternFlame), decor: [...DECOR_LANTERNS.map(lanternFlame), ...wallLanterns], hearth: [hearth.flame, campfire.flame] };

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
  return { group, flames, chimneys, clumps, planters, autumnCrowns, dummies: dummies.map((dummy) => dummy.hit) };
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
  const dummies = buildings.dummies;
  scene.add(buildings.group);

  const { lit, decor, hearth } = buildings.flames;
  const flames = createFlames([...lit, ...decor, ...hearth], LANTERN_FLAME);
  scene.add(flames.mesh);

  // Soleil. Son cadrage d'ombre suit la caméra (voir update) : 44 unités de
  // côté, assez serré pour des ombres nettes.
  const sunDirection = sunDirectionFrom(SUN_ELEVATION_DEG, SUN_AZIMUTH_DEG);

  // Ciel et effets de vie, un appel de dessin chacun.
  const fx = createFxUniforms();
  const dome = createSky(sunDirection);
  scene.add(
    dome,
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
  scene.add(createFoliage([...buildings.clumps, ...bushClumps, ...hedgeClumps, ...outskirts.clumps], fx.uTime, 7, fx.uHero));
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
  scene.add(createGrass([...scatterTufts(map, { meadows: MEADOWS, blocked, density: narrowScreen ? GRASS_DENSITY_LIGHT : 1 }), ...planterFlowers, ...outskirts.tufts], fx.uTime, 31, fx.uHero));
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
  // La lumière qui tourne (version 2.9, world/daylight.js) : ce que le
  // village applique d'un état interpolé ; lanternScale multiplie les lanternes.
  let lanternScale = 1;
  function setDaylight(light) {
    sun.color.copy(light.sun);
    sun.intensity = light.sunPower;
    sky.color.copy(light.sky);
    sky.groundColor.copy(light.ground);
    sky.intensity = light.hemi;
    scene.fog.color.copy(light.haze);
    materials.window.emissiveIntensity = light.windows;
    lanternScale = light.lanterns;
    fx.uNight.value = light.night;
    dome.setNight?.(light.night);
  }

  return {
    map,
    scene,
    setDaylight,
    // Les uniformes des effets (uTime, uNight...), pour les runes de la place.
    fx,
    // Les matériaux du village, repris par les intérieurs (world/interior.js).
    materials,
    collider: createCollider(map, posts),
    // Obstacle rond posé après coup (un habitant) : le collider lit la même liste.
    addObstacle(x, z, radius) {
      const post = { x, z, radius };
      posts.push(post);
      return post;
    },
    // Un habitant qui s'en va (vers un intérieur) libère sa place.
    removeObstacle(post) {
      const i = posts.indexOf(post);
      if (i !== -1) posts.splice(i, 1);
    },
    sunDirection,
    spawn: SPAWN,
    // Les mannequins de l'enclos d'entraînement : où l'épée les touche.
    dummies,
    // Les coffres du dehors (main.js les ouvre comme ceux des pièces).
    chests: CHESTS,
    groundHeight(x, z) {
      return map.cellAt(Math.floor(x), Math.floor(z))?.height ?? 0;
    },
    // Pixels par unité à distance 1 : taille des particules à l'écran.
    setPointScale(scale) {
      fx.uPointScale.value = scale;
    },
    // focus : point visé par la caméra ; cameraDistance : son recul ; hero :
    // la position du héros (les plantes se couchent sur son passage).
    update(time, focus, cameraDistance, hero = null) {
      fx.uTime.value = time;
      if (hero) fx.uHero.value.copy(hero);
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
        light.intensity = LANTERN_INTENSITY * lanternScale * (1 + 0.06 * Math.sin(time * 7.1 + seed) + 0.04 * Math.sin(time * 13.3 + seed * 2));
      }

      scene.fog.near = cameraDistance + HAZE_START;
      scene.fog.far = cameraDistance + HAZE_DEPTH;
    },
  };
}
