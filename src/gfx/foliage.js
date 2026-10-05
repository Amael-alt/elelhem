// Feuillage en grappes : la couronne d'un arbre (ou un buisson) est un
// bouquet de grappes de feuilles, chacune un quad tourné vers la caméra et
// découpé dans une petite image pixel art générée au chargement.
//
// - Toutes les grappes du village sont un seul InstancedMesh : un appel de
//   dessin, plus un pour leur ombre.
// - L'image est en gris : chaque grappe est teintée par sa couleur d'instance
//   (vert, vert tendre, roux d'automne). Une même texture fait tout le village.
// - Chaque grappe ondule un peu au vent, d'une phase qui lui est propre.
// - L'ombre reprend la même découpe, vue du soleil : des ombres tachetées qui
//   bougent avec le vent, comme sous un vrai feuillage.
// - alphaTest, jamais transparent : aucun problème de tri entre grappes.

import * as THREE from 'three';
import { createPixelBuffer, createRamp, createRng, setPixel, toDataTexture, bayer4 } from './pixels.js';
import { createNoPointShadowMaterial, injectSharpSampling } from './materials.js';
import { foliageGreys, outlineColor } from '../data/palette.js';

const CLUMP_PIXELS = 24; // côté d'une grappe dans l'image
const VARIANTS = 4; // formes de grappes différentes, côte à côte dans l'image
const SWAY = 0.05; // amplitude du vent, en unités, au sommet de la grappe
const SWAY_RATE = 1.5; // radians par seconde
const NORMAL_TILT = 0.9; // la normale penche vers le haut : le dessus prend le soleil

// Lumière de la grappe dans l'image (y vers le bas) : en haut à gauche.
const LIGHT = [-0.55, -0.6, 0.58];

// Image des grappes : chaque variante est l'union de quelques disques (des
// touffes de feuilles), ombrée comme une boule, tramée par Bayer sur une rampe
// de six gris, avec un contour sombre d'un pixel.
function createClumpTexture(seed) {
  const size = CLUMP_PIXELS;
  const buffer = createPixelBuffer(size * VARIANTS, size);
  const ramp = createRamp(foliageGreys);
  const outline = createRamp([outlineColor])[0];
  const rng = createRng(seed);
  for (let v = 0; v < VARIANTS; v += 1) {
    const blobs = [{ x: 12, y: 13, r: 7.5 }];
    const count = 5 + Math.floor(rng() * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = rng() * Math.PI * 2;
      const distance = 3 + rng() * 4.5;
      blobs.push({ x: 12 + Math.cos(angle) * distance, y: 12.5 + Math.sin(angle) * distance * 0.85, r: 2.6 + rng() * 2.4 });
    }
    const inside = new Uint8Array(size * size);
    const tone = new Float32Array(size * size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        let best = -1;
        for (const blob of blobs) {
          const dx = (x + 0.5 - blob.x) / blob.r;
          const dy = (y + 0.5 - blob.y) / blob.r;
          const d = dx * dx + dy * dy;
          if (d > 1) continue;
          // La touffe la plus « en avant » (au centre de son disque) l'emporte.
          const nz = Math.sqrt(1 - d);
          const light = Math.max(0, dx * LIGHT[0] + dy * LIGHT[1] + nz * LIGHT[2]);
          // Les touffes du haut de la grappe sont plus claires que celles du bas.
          const height = 1 - (blob.y / size) * 0.5;
          const shade = light * 0.75 * height + 0.12;
          if (nz > best) {
            best = nz;
            tone[y * size + x] = shade;
          }
        }
        if (best >= 0) inside[y * size + x] = 1;
      }
    }
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const i = y * size + x;
        if (!inside[i]) continue;
        const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1
          || !inside[i - 1] || !inside[i + 1] || !inside[i - size] || !inside[i + size];
        const px = v * size + x;
        if (edge) {
          setPixel(buffer, px, y, outline);
          continue;
        }
        const level = Math.min(ramp.length - 1, Math.max(0, Math.floor(tone[i] * ramp.length + bayer4(x, y) - 0.5)));
        setPixel(buffer, px, y, ramp[level]);
      }
    }
  }
  return toDataTexture(buffer, { repeat: false, mipmaps: false });
}

// Le quad tourne face à la caméra (ou au soleil, pour l'ombre) : on le
// reconstruit avec les axes de la matrice de vue. Il ondule autour de son pied.
const BILLBOARD_VERTEX = /* glsl */`
vec3 clumpRight = vec3( viewMatrix[ 0 ][ 0 ], viewMatrix[ 1 ][ 0 ], viewMatrix[ 2 ][ 0 ] );
vec3 clumpUp = vec3( viewMatrix[ 0 ][ 1 ], viewMatrix[ 1 ][ 1 ], viewMatrix[ 2 ][ 1 ] );
float clumpSway = sin( uTime * ${SWAY_RATE.toFixed(2)} + aSeed * 6.2832 ) * ${SWAY.toFixed(3)} * ( position.y + 0.5 );
vec3 transformed = clumpRight * ( position.x + clumpSway ) + clumpUp * position.y;
`;

const VARIANT_UV = /* glsl */`
#include <uv_vertex>
#ifdef USE_MAP
  vMapUv = vec2( ( uv.x + aVariant ) / ${VARIANTS.toFixed(1)}, uv.y );
#endif
`;

function patchVertex(shader, time) {
  shader.uniforms.uTime = time;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float aSeed;\nattribute float aVariant;')
    .replace('#include <begin_vertex>', BILLBOARD_VERTEX)
    .replace('#include <uv_vertex>', VARIANT_UV);
}

// clumps : liste de { x, y, z, size, tint } (centre de la grappe, côté du quad
// en unités, couleur). time : l'uniforme de temps partagé des effets.
export function createFoliage(clumps, time, seed = 7) {
  const texture = createClumpTexture(seed);
  const texSize = new THREE.Vector2(CLUMP_PIXELS * VARIANTS, CLUMP_PIXELS);

  const material = new THREE.MeshLambertMaterial({ map: texture, alphaTest: 0.5 });
  material.onBeforeCompile = (shader) => {
    patchVertex(shader, time);
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', /* glsl */`
      #include <beginnormal_vertex>
      objectNormal = normalize( vec3( viewMatrix[ 0 ][ 2 ], viewMatrix[ 1 ][ 2 ], viewMatrix[ 2 ][ 2 ] ) + vec3( 0.0, ${NORMAL_TILT.toFixed(2)}, 0.0 ) );
    `);
    injectSharpSampling(shader, texSize);
  };

  const depthMaterial = new THREE.MeshDepthMaterial({ map: texture, alphaTest: 0.5 });
  depthMaterial.onBeforeCompile = (shader) => patchVertex(shader, time);

  const geometry = new THREE.PlaneGeometry(1, 1);
  const seeds = new Float32Array(clumps.length);
  const variants = new Float32Array(clumps.length);
  const mesh = new THREE.InstancedMesh(geometry, material, clumps.length);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  const rng = createRng(seed + 1);
  clumps.forEach((clump, i) => {
    matrix.makeScale(clump.size, clump.size, clump.size).setPosition(clump.x, clump.y, clump.z);
    mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, color.set(clump.tint));
    seeds[i] = rng();
    variants[i] = Math.floor(rng() * VARIANTS);
  });
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  geometry.setAttribute('aVariant', new THREE.InstancedBufferAttribute(variants, 1));

  mesh.name = 'feuillage';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false; // les quads tournent dans le shader
  mesh.customDepthMaterial = depthMaterial;
  // Les ombres des lanternes, figées au chargement, ne garderaient pas le vent.
  mesh.customDistanceMaterial = createNoPointShadowMaterial();
  return mesh;
}

// Couronne d'un arbre : une grappe au sommet, une couronne de cinq, trois
// dessous. center : centre de la couronne ; radius : son rayon ; tint : couleur.
export function crownClumps({ x, y, z }, radius, tint, seed = 0) {
  const clumps = [{ x, y: y + radius * 0.75, z, size: radius * 1.5, tint }];
  const random = (i) => {
    const v = Math.sin((seed + 1) * 12.9898 + i * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  const ring = (count, height, spread, size, offset) => {
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + offset + random(i) * 0.6;
      clumps.push({
        x: x + Math.cos(angle) * radius * spread,
        y: y + radius * height + (random(i + 7) - 0.5) * radius * 0.3,
        z: z + Math.sin(angle) * radius * spread,
        size: radius * size * (0.9 + random(i + 3) * 0.25),
        tint,
      });
    }
  };
  ring(5, 0.15, 0.72, 1.35, random(20) * 2);
  ring(3, -0.4, 0.5, 1.2, random(21) * 2);
  return clumps;
}
