// Touffes d'herbe et de fleurs : des milliers de petits quads debout sur
// l'herbe, dessinés en un seul appel (InstancedMesh). Chaque touffe est une
// image pixel art de 12 × 12 générée au chargement (brins plus clairs à la
// pointe, fleurs de couleur), à la même densité que le décor (16 pixels par
// unité). Elle tourne autour de l'axe vertical pour faire face à la caméra,
// et sa pointe ondule au vent.
//
// Les touffes reçoivent les ombres mais n'en projettent pas : des milliers
// de petites ombres coûteraient cher pour un effet que le sol rend déjà.

import * as THREE from 'three';
import { createPixelBuffer, createRamp, createRng, hexToRgb, setPixel, toDataTexture } from './pixels.js';
import { injectSharpSampling } from './materials.js';
import { flowerColors, terrainRamps } from '../data/palette.js';

const TUFT_PIXELS = 12;
const GRASS_VARIANTS = 3; // touffes d'herbe seule
const FLOWER_VARIANTS = 4; // touffes fleuries
export const TUFT_VARIANTS = GRASS_VARIANTS + FLOWER_VARIANTS;
const PIXELS_PER_UNIT = 16;
const SWAY = 0.07;
const SWAY_RATE = 2.1;

// Un brin : une ligne de la base vers la pointe, qui penche un peu, du ton
// sombre au pied au ton clair au bout.
function blade(buffer, ramp, ox, x0, height, lean) {
  for (let i = 0; i < height; i += 1) {
    const t = i / Math.max(1, height - 1);
    const x = Math.round(x0 + lean * t * t);
    const y = TUFT_PIXELS - 1 - i;
    if (x < 0 || x >= TUFT_PIXELS || y < 0) continue;
    const tone = Math.min(ramp.length - 1, 1 + Math.floor(t * (ramp.length - 1)));
    setPixel(buffer, ox + x, y, ramp[tone]);
  }
}

function createTuftTexture(seed) {
  const buffer = createPixelBuffer(TUFT_PIXELS * TUFT_VARIANTS, TUFT_PIXELS);
  const ramp = createRamp(terrainRamps.herbe);
  const rng = createRng(seed);
  const petals = Object.values(flowerColors).map(hexToRgb);
  for (let v = 0; v < TUFT_VARIANTS; v += 1) {
    const ox = v * TUFT_PIXELS;
    const flowers = v >= GRASS_VARIANTS;
    const blades = flowers ? 5 : 7 + Math.floor(rng() * 3);
    const tips = [];
    for (let b = 0; b < blades; b += 1) {
      const x0 = 2 + rng() * 8;
      const height = flowers ? 4 + Math.floor(rng() * 4) : 5 + Math.floor(rng() * 6);
      const lean = (x0 - 6) * 0.45 + (rng() - 0.5) * 2;
      blade(buffer, ramp, ox, x0, height, lean);
      tips.push([Math.round(x0 + lean), TUFT_PIXELS - height]);
    }
    if (!flowers) continue;
    // Têtes de fleurs : une croix de cinq pixels, cœur plus clair, sur
    // trois brins.
    const petal = petals[(v - GRASS_VARIANTS) % petals.length];
    const heart = [255, 236, 170];
    for (const [x, y] of tips.slice(0, 3)) {
      const cx = Math.min(TUFT_PIXELS - 2, Math.max(1, x));
      const cy = Math.max(1, y);
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) setPixel(buffer, ox + cx + dx, cy + dy, petal);
      setPixel(buffer, ox + cx, cy, heart);
    }
  }
  return toDataTexture(buffer, { repeat: false, mipmaps: false });
}

// Debout, tourné vers la caméra autour de l'axe vertical, étiré comme les
// sprites pour garder des pixels carrés à l'écran ; la pointe ondule.
const TUFT_VERTEX = /* glsl */`
vec3 tuftRight = normalize( vec3( viewMatrix[ 0 ][ 0 ], 0.0, viewMatrix[ 2 ][ 0 ] ) );
vec3 tuftBack = vec3( viewMatrix[ 0 ][ 2 ], viewMatrix[ 1 ][ 2 ], viewMatrix[ 2 ][ 2 ] );
float tuftStretch = 1.0 / max( length( tuftBack.xz ), 0.3 );
float tuftSway = sin( uTime * ${SWAY_RATE.toFixed(2)} + aSeed * 6.2832 ) * ${SWAY.toFixed(3)} * position.y;
vec3 transformed = tuftRight * ( position.x + tuftSway ) + vec3( 0.0, position.y * tuftStretch, 0.0 );
`;

// tufts : liste de { x, y, z, variant } ; time : uniforme de temps partagé.
export function createGrass(tufts, time, seed = 31) {
  const texture = createTuftTexture(seed);
  const texSize = new THREE.Vector2(TUFT_PIXELS * TUFT_VARIANTS, TUFT_PIXELS);
  const size = TUFT_PIXELS / PIXELS_PER_UNIT;

  const material = new THREE.MeshLambertMaterial({ map: texture, alphaTest: 0.5 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float aSeed;\nattribute float aVariant;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = vec3( 0.0, 1.0, 0.0 );')
      .replace('#include <begin_vertex>', TUFT_VERTEX)
      .replace('#include <uv_vertex>', `#include <uv_vertex>\nvMapUv = vec2( ( uv.x + aVariant ) / ${TUFT_VARIANTS.toFixed(1)}, uv.y );`);
    injectSharpSampling(shader, texSize);
  };

  const geometry = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const seeds = new Float32Array(tufts.length);
  const variants = new Float32Array(tufts.length);
  const mesh = new THREE.InstancedMesh(geometry, material, tufts.length);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  const rng = createRng(seed + 2);
  tufts.forEach((tuft, i) => {
    const scale = size * (0.8 + rng() * 0.4);
    matrix.makeScale(scale, scale, scale).setPosition(tuft.x, tuft.y, tuft.z);
    mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, color.setScalar(0.85 + rng() * 0.25));
    seeds[i] = rng();
    variants[i] = tuft.variant;
  });
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  geometry.setAttribute('aVariant', new THREE.InstancedBufferAttribute(variants, 1));
  mesh.name = 'herbe';
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

// Répartition des touffes sur les cases d'herbe libres de la carte : plus
// denses en lisière (au bord d'un chemin, d'un mur, d'une haie), fleuries dans
// les prés désignés et un peu partout ailleurs. blocked(x, z) : vrai si un
// obstacle occupe ce point.
export function scatterTufts(map, { meadows = [], blocked = () => false, seed = 5 } = {}) {
  const rng = createRng(seed);
  const tufts = [];
  const isGrass = (x, z) => {
    const cell = map.cellAt(x, z);
    // Le dessus des falaises compte : on n'y marche pas, mais on le voit.
    return cell && cell.matter === 'grass' && !map.isBuilt(x, z);
  };
  const inMeadow = (x, z) => meadows.some(([x0, z0, x1, z1]) => x >= x0 && x <= x1 && z >= z0 && z <= z1);
  for (let z = 0; z < map.depth; z += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (!isGrass(x, z)) continue;
      const fringe = !isGrass(x - 1, z) || !isGrass(x + 1, z) || !isGrass(x, z - 1) || !isGrass(x, z + 1);
      const count = 2 + Math.floor(rng() * 2) + (fringe ? 2 : 0);
      const meadow = inMeadow(x, z);
      for (let i = 0; i < count; i += 1) {
        const px = x + 0.1 + rng() * 0.8;
        const pz = z + 0.1 + rng() * 0.8;
        if (blocked(px, pz)) continue;
        const flower = rng() < (meadow ? 0.45 : 0.08);
        const variant = flower
          ? GRASS_VARIANTS + Math.floor(rng() * FLOWER_VARIANTS)
          : Math.floor(rng() * GRASS_VARIANTS);
        tufts.push({ x: px, y: map.cellAt(x, z).height, z: pz, variant });
      }
    }
  }
  return tufts;
}
