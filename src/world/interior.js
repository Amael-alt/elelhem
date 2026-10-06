// Un intérieur : une scène à part, bâtie comme le village (grille, sol à
// occlusion cuite, mobilier fusionné par matière), éclairée au chaud par son
// feu et par le jour qui entre. On y passe par une porte (game/doors.js) ; le
// héros et les habitants de la pièce y vivent avec les mêmes règles que dehors.
//
// Renvoie le même genre d'objet que createVillage (scene, map, collider,
// groundHeight, addObstacle, update...) : le joueur et les habitants ne voient
// pas la différence.

import * as THREE from 'three';
import { createMap } from './map.js';
import { createTerrain } from './terrain.js';
import { createCollider } from './collision.js';
import { createMeshBuilder, toGeometry } from './builder.js';
import { buildAnvil, buildBarrel, buildBench, buildCrate, buildTable, buildWoodpile } from './landmarks.js';
import {
  buildBed, buildCandle, buildChest, buildCounter, buildFireplace, buildFurnace, buildRug, buildShelf, buildToolRack, buildWindow,
} from './furniture.js';
import { createFlames } from '../gfx/fx/flame.js';
import { createLightPools } from '../gfx/lightpools.js';
import { interiorColors, lanternColor } from '../data/palette.js';

const DAY_INTENSITY = 2.4; // le jour qui entre, dans l'axe du soleil du village
const HEMI_INTENSITY = 1.7;
const FIRE_INTENSITY = 9;
const FIRE_RANGE = 7.5;
const SHADOW_SIZE = 1024;
const FIRE_FLAME = { width: 0.55, height: 0.62 }; // plus grande qu'une flamme de lanterne
const CANDLE_FLAME = { width: 0.1, height: 0.16 };
const CANDLE_INTENSITY = 3.5;
const CANDLE_RANGE = 4.5;

const FURNITURE = {
  anvil: buildAnvil,
  barrel: buildBarrel,
  bed: buildBed,
  candle: buildCandle,
  bench: buildBench,
  chest: buildChest,
  counter: buildCounter,
  crate: buildCrate,
  fireplace: buildFireplace,
  furnace: buildFurnace,
  rug: buildRug,
  shelf: buildShelf,
  table: buildTable,
  toolrack: buildToolRack,
  window: buildWindow,
  woodpile: buildWoodpile,
};

// Les meubles du village renvoient un obstacle, une liste, ou { obstacle,
// flame } ; ceux de furniture.js { posts, flame }. On ramène tout à la même forme.
function normalize(result) {
  if (!result) return { posts: [] };
  if (Array.isArray(result)) return { posts: result };
  if (result.posts) return result;
  if (result.obstacle) return { posts: [result.obstacle], flame: result.flame };
  return { posts: [result] };
}

// room : une entrée de world/rooms.js ; materials : ceux du village (mêmes
// textures, mêmes programmes de shader) ; sunDirection : la lumière du jour.
export function createInterior(room, { materials, sunDirection }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(interiorColors.fond);
  // Même type de brume que dehors, mais si loin qu'elle ne se voit pas : les
  // matériaux gardent les mêmes programmes de shader, aucune recompilation.
  scene.fog = new THREE.Fog(interiorColors.fond, 200, 400);

  const map = createMap(room.rows);
  for (const [x, z, sizeX, sizeZ] of room.reserve ?? []) map.build(x, z, sizeX, sizeZ);

  // Le mobilier, fusionné par matière.
  const keys = ['wood', 'plaster', 'stonewall', 'brick', 'iron', 'bark', 'awning', 'window', 'stone'];
  const builders = Object.fromEntries(keys.map((key) => [key, createMeshBuilder()]));
  const posts = [];
  const flames = [];
  for (const item of room.props) {
    const build = FURNITURE[item.type];
    if (!build) throw new Error(`Intérieur : meuble inconnu « ${item.type} ».`);
    const { posts: obstacles, flame } = normalize(build(item, builders));
    posts.push(...obstacles);
    if (flame) flames.push(flame);
  }

  scene.add(createTerrain(map, materials));
  for (const key of keys) {
    if (builders[key].indices.length === 0) continue;
    const mesh = new THREE.Mesh(toGeometry(builders[key]), key === 'stone' ? materials.cobble : materials[key]);
    mesh.castShadow = key !== 'window';
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    scene.add(mesh);
  }

  // Les feux (cheminée, four) et les bougies : flammes dessinées, lumières
  // qui vacillent, flaque de lumière au sol sous les grands feux.
  const fires = flames.filter((f) => !f.small);
  const candles = flames.filter((f) => f.small);
  const flameMeshes = [];
  if (fires.length) flameMeshes.push(createFlames(fires, FIRE_FLAME));
  if (candles.length) flameMeshes.push(createFlames(candles, CANDLE_FLAME));
  for (const flame of flameMeshes) scene.add(flame.mesh);
  if (fires.length) scene.add(createLightPools(fires.map((f) => ({ x: f.x, y: 0, z: f.z + 0.6, radius: 2.2, strength: 1.1 }))));
  const fireLights = flames.map((flame, i) => {
    const intensity = flame.small ? CANDLE_INTENSITY : FIRE_INTENSITY;
    const light = new THREE.PointLight(lanternColor, intensity, flame.small ? CANDLE_RANGE : FIRE_RANGE, 2);
    light.position.set(flame.x, flame.y + (flame.small ? 0.1 : 0.35), flame.z + (flame.small ? 0 : 0.45));
    light.layers.enableAll();
    scene.add(light);
    return { light, intensity, seed: i * 1.7 };
  });

  // Le jour qui entre : la même direction que le soleil du village, plus
  // doux, avec ses ombres, cadrées sur la pièce.
  const center = new THREE.Vector3(map.width / 2, 0, map.depth / 2);
  const extent = Math.max(map.width, map.depth) / 2 + 2;
  const day = new THREE.DirectionalLight(interiorColors.jour, DAY_INTENSITY);
  day.position.copy(center).addScaledVector(sunDirection, 20);
  day.target.position.copy(center);
  day.castShadow = true;
  day.shadow.mapSize.set(SHADOW_SIZE, SHADOW_SIZE);
  Object.assign(day.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 1, far: 50 });
  day.shadow.camera.updateProjectionMatrix();
  day.shadow.bias = -0.0005;
  day.shadow.normalBias = 0.03;
  day.shadow.camera.layers.enableAll();
  day.layers.enableAll();
  const ambient = new THREE.HemisphereLight(interiorColors.ciel, interiorColors.sol, HEMI_INTENSITY);
  ambient.layers.enableAll();
  scene.add(day, day.target, ambient);

  // La porte de sortie : la case du seuil, au bord sud.
  const doorX = room.rows[room.rows.length - 1].indexOf('P');

  return {
    scene,
    map,
    room,
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
    spawn: room.entry,
    // Le seuil : on sort en le franchissant vers le sud.
    door: { x: doorX + 0.5, z: map.depth },
    // Les feux de la pièce, pour le crépitement (core/ambience.js).
    fires: fires.map((f) => [f.x, f.z]),
    groundHeight(x, z) {
      return map.cellAt(Math.floor(x), Math.floor(z))?.height ?? 0;
    },
    setPointScale() {},
    update(time) {
      for (const flame of flameMeshes) flame.update(time);
      for (const { light, intensity, seed } of fireLights) {
        light.intensity = intensity * (1 + 0.08 * Math.sin(time * 6.3 + seed) + 0.05 * Math.sin(time * 14.1 + seed * 2));
      }
    },
  };
}
