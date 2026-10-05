// Lucioles : quarante points vert-jaune qui flottent près des jardins, des
// arbres et de la rivière. Elles s'allument et s'éteignent lentement (aucun
// clignotement) et leur couleur dépasse 1 quand elles brillent : c'est le
// bloom qui leur donne leur halo. Un seul appel de dessin.

import * as THREE from 'three';
import { effectColors } from '../../data/palette.js';
import { createRng } from '../pixels.js';
import { FX_OUTPUT_GLSL, POINT_SIZE_GLSL } from './points.js';

const COUNT = 40;
const SIZE = 0.09; // environ un gros pixel et demi
const GLOW = 4;

// anchors : [x, z, rayon] autour desquels elles se répartissent.
export function createFireflies(anchors, uniforms) {
  const rng = createRng(77);
  const positions = [];
  const seeds = [];
  for (let i = 0; i < COUNT; i += 1) {
    const [x, z, spread] = anchors[i % anchors.length];
    const angle = rng() * Math.PI * 2;
    const distance = Math.sqrt(rng()) * spread;
    positions.push(x + Math.cos(angle) * distance, 0.4 + rng() * 1.2, z + Math.sin(angle) * distance);
    seeds.push(rng(), 0.6 + rng() * 0.8, rng(), 0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 4));

  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uColor: { value: new THREE.Color(effectColors.luciole) } },
    vertexShader: /* glsl */`
      attribute vec4 seed;
      uniform float uTime;
      varying float vGlow;
      ${POINT_SIZE_GLSL}
      void main() {
        float t = uTime * seed.y;
        vec3 p = position + vec3(
          sin( t * 0.7 + seed.x * 6.28 ) * 0.6,
          sin( t * 1.3 + seed.x * 9.1 ) * 0.25,
          cos( t * 0.5 + seed.x * 4.7 ) * 0.6 );
        vec4 mvPosition = viewMatrix * vec4( p, 1.0 );
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = pixelPointSize( ${SIZE.toFixed(3)}, mvPosition );
        float pulse = 0.5 + 0.5 * sin( uTime * ( 0.9 + seed.y * 0.6 ) + seed.z * 6.28 );
        vGlow = smoothstep( 0.35, 1.0, pulse );
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      varying float vGlow;
      void main() {
        gl_FragColor = vec4( uColor * ( 0.15 + ${GLOW.toFixed(1)} * vGlow ), 1.0 );
        ${FX_OUTPUT_GLSL}
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'lucioles';
  points.frustumCulled = false;
  return points;
}
