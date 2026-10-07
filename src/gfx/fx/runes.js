// Les runes de la place (version 2.9) : la nuit, un cercle de signes luit
// doucement sur les dalles autour du puits, la magie LIA qui affleure. Des
// glyphes de pixels tirés une fois pour toutes (symétriques, comme des
// lettres), posés à plat, en lumière additive : le bloom en fait le halo.
// Leur force vient de la part de nuit (uNight, world/daylight.js).

import * as THREE from 'three';
import { createPixelBuffer, createRng, setPixel, toDataTexture } from '../pixels.js';
import { FX_OUTPUT_GLSL } from './points.js';
import { effectColors } from '../../data/palette.js';

const GLYPH = 12; // pixels de côté
const VARIANTS = 6;
const SIZE = 0.55; // unités, au sol

function createGlyphTexture(seed) {
  const rng = createRng(seed);
  const buffer = createPixelBuffer(GLYPH * VARIANTS, GLYPH);
  const ink = [255, 255, 255];
  for (let v = 0; v < VARIANTS; v += 1) {
    const ox = v * GLYPH;
    // Quelques traits sur la moitié gauche, recopiés en miroir à droite.
    const strokes = 3 + Math.floor(rng() * 3);
    for (let s = 0; s < strokes; s += 1) {
      let x = 1 + Math.floor(rng() * (GLYPH / 2 - 1));
      let y = 1 + Math.floor(rng() * (GLYPH - 2));
      const length = 2 + Math.floor(rng() * 5);
      const dir = Math.floor(rng() * 3); // 0 bas, 1 droite, 2 diagonale
      for (let k = 0; k < length; k += 1) {
        const mx = GLYPH - 1 - x;
        if (x >= 0 && x < GLYPH && y >= 0 && y < GLYPH) {
          setPixel(buffer, ox + x, y, ink);
          setPixel(buffer, ox + mx, y, ink);
        }
        if (dir === 0) y += 1;
        else if (dir === 1) x += 1;
        else { x += 1; y += 1; }
      }
    }
    // Un point au centre, presque toujours.
    if (rng() < 0.8) {
      setPixel(buffer, ox + GLYPH / 2 - 1, GLYPH / 2, ink);
      setPixel(buffer, ox + GLYPH / 2, GLYPH / 2, ink);
    }
  }
  const texture = toDataTexture(buffer, { color: false, repeat: false, mipmaps: false });
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  return texture;
}

// center : { x, z } ; radius : rayon du cercle ; count : nombre de runes ;
// uniforms : les uniformes partagés des effets (uTime, uNight).
export function createRunes({ center, radius, count = 8, y = 0.03 }, uniforms, seed = 17) {
  const texture = createGlyphTexture(seed);
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uMap: { value: texture }, uColor: { value: new THREE.Color(effectColors.rune ?? '#8fd3ff') } },
    vertexShader: /* glsl */`
      attribute float aVariant;
      attribute float aPhase;
      varying vec2 vUv;
      varying float vPhase;
      void main() {
        vUv = vec2( ( uv.x + aVariant ) / ${VARIANTS.toFixed(1)}, uv.y );
        vPhase = aPhase;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uNight;
      varying vec2 vUv;
      varying float vPhase;
      void main() {
        float ink = texture2D( uMap, vUv ).r;
        if ( ink < 0.5 || uNight < 0.02 ) discard;
        float pulse = 0.6 + 0.4 * sin( uTime * 1.1 + vPhase * 6.2832 );
        gl_FragColor = vec4( uColor * uNight * pulse * 1.6, 1.0 );
        ${FX_OUTPUT_GLSL}
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const geometry = new THREE.PlaneGeometry(SIZE, SIZE).rotateX(-Math.PI / 2);
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = 'runes';
  mesh.frustumCulled = false;
  const variants = new Float32Array(count);
  const phases = new Float32Array(count);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    matrix.makeRotationY(-angle).setPosition(center.x + Math.cos(angle) * radius, y, center.z + Math.sin(angle) * radius);
    mesh.setMatrixAt(i, matrix);
    variants[i] = i % VARIANTS;
    phases[i] = i / count;
  }
  geometry.setAttribute('aVariant', new THREE.InstancedBufferAttribute(variants, 1));
  geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
  return mesh;
}
