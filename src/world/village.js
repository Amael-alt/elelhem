// Composition du village : carte, sol, lumières. Étape 1a : le sol texturé,
// un soleil bas qui projette des ombres, un ciel froid en lumière d'ambiance.
// Les réglages fins de la lumière dorée viennent à l'étape 1b.

import * as THREE from 'three';
import { createMap } from './map.js';
import { createTerrain } from './terrain.js';
import { createCollider } from './collision.js';
import { createPixelMaterial } from '../gfx/materials.js';
import { createCobbleTextures, createDirtTextures, createGrassTextures, createWaterTextures } from '../gfx/textures.js';

const SUN_COLOR = 0xffc07a;
const SUN_INTENSITY = 4.5;
const SUN_ELEVATION_DEG = 22;
const SUN_AZIMUTH_DEG = -60;
const SKY_COLOR = 0x8fa4e6;
const GROUND_COLOR = 0x4a3a2c;
const HEMI_INTENSITY = 2;
const SHADOW_MAP_SIZE = 2048;
const SHADOW_EXTENT = 22;

export function createVillage(scene) {
  const map = createMap();

  const grass = createGrassTextures(11);
  const dirt = createDirtTextures(23);
  const cobble = createCobbleTextures(37);
  const water = createWaterTextures(41);
  const materials = {
    grass: createPixelMaterial({ ...grass, normalStrength: 0.35, roughness: 0.95 }),
    dirt: createPixelMaterial({ ...dirt, normalStrength: 0.8, roughness: 0.95 }),
    cobble: createPixelMaterial({ ...cobble, normalStrength: 0.7, roughness: 0.85 }),
    water: createPixelMaterial({ ...water, roughness: 0.35 }),
  };
  scene.add(createTerrain(map, materials));

  // Soleil bas venu de l'ouest-sud-ouest : ombres longues vers l'est.
  const center = new THREE.Vector3(map.width / 2, 0, map.depth / 2);
  const elevation = THREE.MathUtils.degToRad(SUN_ELEVATION_DEG);
  const azimuth = THREE.MathUtils.degToRad(SUN_AZIMUTH_DEG);
  const sunDirection = new THREE.Vector3(
    Math.cos(elevation) * Math.sin(azimuth),
    Math.sin(elevation),
    Math.cos(elevation) * Math.cos(azimuth),
  );
  const sun = new THREE.DirectionalLight(SUN_COLOR, SUN_INTENSITY);
  sun.position.copy(center).addScaledVector(sunDirection, 40);
  sun.target.position.copy(center);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  Object.assign(sun.shadow.camera, {
    left: -SHADOW_EXTENT, right: SHADOW_EXTENT, top: SHADOW_EXTENT, bottom: -SHADOW_EXTENT, near: 1, far: 90,
  });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target, new THREE.HemisphereLight(SKY_COLOR, GROUND_COLOR, HEMI_INTENSITY));

  return {
    map,
    collider: createCollider(map),
    sunDirection,
    spawn: { x: 15.5, z: 12.5 },
    groundHeight(x, z) {
      return map.cellAt(Math.floor(x), Math.floor(z))?.height ?? 0;
    },
  };
}
