// Fumée des cheminées : 36 bouffées par cheminée, toutes les cheminées dans
// un seul appel de dessin. Chaque bouffée naît au sommet, monte, s'élargit et
// part avec le vent en s'effaçant ; son âge est fract(temps / durée + graine).
// Les bouffées sont des disques en gros pixels, sombres à la sortie, claires
// et chaudes en haut, là où le soleil du soir les attrape.

import * as THREE from 'three';
import { effectColors } from '../../data/palette.js';
import { createRng } from '../pixels.js';
import { FX_OUTPUT_GLSL, PIXEL_DISC_GLSL, POINT_SIZE_GLSL } from './points.js';

const PER_CHIMNEY = 36;
const LIFETIME = 7; // secondes
const RISE = 2.8;
const WIND = [0.9, 0, -0.35]; // vers l'est, un peu vers le nord : comme les ombres
const OPACITY = 0.32;
const BRIGHTNESS = 0.8;

export function createSmoke(chimneys, uniforms) {
  const rng = createRng(53);
  const positions = [];
  const seeds = [];
  for (const [x, y, z] of chimneys) {
    for (let i = 0; i < PER_CHIMNEY; i += 1) {
      positions.push(x, y, z);
      seeds.push(i / PER_CHIMNEY + rng() * 0.02, rng(), rng(), 0);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 4));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...uniforms,
      uDark: { value: new THREE.Color(effectColors.fumeeSombre) },
      uLight: { value: new THREE.Color(effectColors.fumeeClaire) },
    },
    vertexShader: /* glsl */`
      attribute vec4 seed;
      uniform float uTime;
      varying float vLife;
      varying float vArt;
      ${POINT_SIZE_GLSL}
      void main() {
        float life = fract( uTime / ${LIFETIME.toFixed(1)} + seed.x );
        vec3 wind = vec3( ${WIND.map((v) => v.toFixed(2)).join(', ')} );
        vec3 p = position + vec3( 0.0, life * ${RISE.toFixed(2)}, 0.0 ) + wind * life * life * 1.4
          + vec3( sin( life * 6.0 + seed.y * 6.28 ), 0.0, cos( life * 5.0 + seed.y * 4.0 ) ) * ( 0.1 + 0.25 * life );
        vec4 mvPosition = viewMatrix * vec4( p, 1.0 );
        gl_Position = projectionMatrix * mvPosition;
        float worldSize = mix( 0.2, 0.8, life ) * ( 0.8 + 0.4 * seed.z );
        gl_PointSize = pixelPointSize( worldSize, mvPosition );
        vArt = max( 2.0, floor( worldSize * 8.0 + 0.5 ) ); // des pixels de fumée de deux texels
        vLife = life;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uDark;
      uniform vec3 uLight;
      varying float vLife;
      varying float vArt;
      ${PIXEL_DISC_GLSL}
      void main() {
        if ( outsidePixelDisc( vArt ) ) discard;
        float alpha = smoothstep( 0.0, 0.08, vLife ) * ( 1.0 - vLife ) * ${OPACITY.toFixed(2)};
        vec3 color = mix( uDark, uLight, smoothstep( 0.0, 0.6, vLife ) ) * ${BRIGHTNESS.toFixed(2)};
        gl_FragColor = vec4( color, alpha );
        ${FX_OUTPUT_GLSL}
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'fumee';
  points.frustumCulled = false;
  return points;
}
