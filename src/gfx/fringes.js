// Lisières : l'herbe déborde sur les chemins et les pavés.
//
// Le sol est une grille : sans retouche, chaque chemin de terre est une suite
// de carrés parfaits. Sur chaque bord entre une case d'herbe et une case de
// terre ou de pavés, on pose quelques taches d'herbe à plat, à cheval sur le
// bord, découpées en forme irrégulière. Leur texture est celle de l'herbe du
// sol, lue aux mêmes coordonnées du monde : côté herbe, elles se confondent
// avec le sol ; côté chemin, elles dessinent une lisière dentelée. Quelques
// taches isolées au milieu des chemins font l'usure.
//
// Un seul InstancedMesh, un appel de dessin.

import * as THREE from 'three';
import { createPixelBuffer, createRng, bayer4, toDataTexture } from './pixels.js';
import { TILE_UNITS } from './textures.js';
import { SHARP_SAMPLE_GLSL } from './materials.js';

const MASK_PIXELS = 16;
const MASK_VARIANTS = 4;
const PER_EDGE = 4;
const WEAR_CHANCE = 0.1; // taches d'herbe au milieu d'un chemin
const LIFT = 0.004; // juste au-dessus du sol

// Formes des taches : quelques disques fondus, bord tramé (pixel art).
function createMaskTexture(seed) {
  const rng = createRng(seed);
  const size = MASK_PIXELS;
  const buffer = createPixelBuffer(size * MASK_VARIANTS, size);
  for (let v = 0; v < MASK_VARIANTS; v += 1) {
    const blobs = [{ x: 8, y: 8, r: 4.6 }];
    for (let i = 0; i < 4; i += 1) {
      const a = rng() * Math.PI * 2;
      blobs.push({ x: 8 + Math.cos(a) * (2 + rng() * 3), y: 8 + Math.sin(a) * (2 + rng() * 3), r: 1.6 + rng() * 2.2 });
    }
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        let field = 0;
        for (const b of blobs) field = Math.max(field, 1 - Math.hypot(x + 0.5 - b.x, y + 0.5 - b.y) / b.r);
        const inside = field + (bayer4(x, y) - 0.5) * 0.35 > 0.02;
        // three.js lit la découpe dans le canal vert de l'alphaMap.
        const i = ((y * buffer.width) + v * size + x) * 4;
        const value = inside ? 255 : 0;
        buffer.data[i] = buffer.data[i + 1] = buffer.data[i + 2] = buffer.data[i + 3] = value;
      }
    }
  }
  return toDataTexture(buffer, { color: false, repeat: false, mipmaps: false });
}

// La tache prend la couleur et le relief de l'herbe aux coordonnées du monde,
// sa forme dans le masque. Même éclairage que le sol (MeshStandardMaterial).
function createFringeMaterial(grass, mask) {
  const material = new THREE.MeshStandardMaterial({
    map: grass.map,
    normalMap: grass.normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    alphaMap: mask,
    alphaTest: 0.5,
    roughness: 0.95,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const texSize = new THREE.Vector2(64, 64);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTexSize = { value: texSize };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aVariant;')
      .replace('#include <uv_vertex>', /* glsl */`
        #include <uv_vertex>
        vec4 fringeWorld = modelMatrix * instanceMatrix * vec4( position, 1.0 );
        vec2 fringeUv = vec2( fringeWorld.x, - fringeWorld.z ) / ${TILE_UNITS.toFixed(1)};
        vMapUv = fringeUv;
        vNormalMapUv = fringeUv;
        vAlphaMapUv = vec2( ( uv.x + aVariant ) / ${MASK_VARIANTS.toFixed(1)}, uv.y );
      `);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SHARP_SAMPLE_GLSL}`)
      .replace('#include <map_fragment>', THREE.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )', 'sharpSample( map, vMapUv )'))
      .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.replace('texture2D( normalMap, vNormalMapUv )', 'sharpSample( normalMap, vNormalMapUv )'));
  };
  return material;
}

// map : la carte ; grass : { map, normalMap } de l'herbe du sol.
export function createFringes(map, grass, seed = 19) {
  const rng = createRng(seed);
  const isGrass = (x, z) => map.cellAt(x, z)?.matter === 'grass' && !map.isBuilt(x, z) && !map.cellAt(x, z).solid;
  const isPath = (x, z) => {
    const cell = map.cellAt(x, z);
    return cell && !cell.solid && !map.isBuilt(x, z) && (cell.matter === 'dirt' || cell.matter === 'cobble') && cell.height === 0;
  };
  const spots = [];
  const add = (x, z, scale) => spots.push({ x, z, scale, angle: Math.floor(rng() * 4) * (Math.PI / 2), variant: Math.floor(rng() * MASK_VARIANTS) });
  for (let z = 0; z < map.depth; z += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (!isPath(x, z)) continue;
      // Les quatre bords de la case de chemin : si l'herbe est de l'autre côté,
      // des taches à cheval sur le bord, un peu enfoncées dans le chemin.
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!isGrass(x + dx, z + dz)) continue;
        for (let i = 0; i < PER_EDGE; i += 1) {
          const t = (i + 0.2 + rng() * 0.6) / PER_EDGE;
          const depth = 0.08 + rng() * 0.18; // enfoncement dans le chemin
          const ex = dx !== 0 ? x + 0.5 + dx * (0.5 - depth) : x + t;
          const ez = dz !== 0 ? z + 0.5 + dz * (0.5 - depth) : z + t;
          add(ex, ez, 0.7 + rng() * 0.5);
        }
      }
      if (map.cellAt(x, z).matter === 'dirt' && rng() < WEAR_CHANCE) add(x + 0.2 + rng() * 0.6, z + 0.2 + rng() * 0.6, 0.3 + rng() * 0.25);
    }
  }

  const geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const variants = new Float32Array(spots.length);
  const mesh = new THREE.InstancedMesh(geometry, createFringeMaterial(grass, createMaskTexture(seed)), spots.length);
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Matrix4();
  spots.forEach((spot, i) => {
    matrix.makeScale(spot.scale, 1, spot.scale).premultiply(rotation.makeRotationY(spot.angle)).setPosition(spot.x, LIFT, spot.z);
    mesh.setMatrixAt(i, matrix);
    variants[i] = spot.variant;
  });
  geometry.setAttribute('aVariant', new THREE.InstancedBufferAttribute(variants, 1));
  mesh.name = 'lisieres';
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  return mesh;
}
