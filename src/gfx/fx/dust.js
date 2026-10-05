// Poussière dorée : des grains d'un pixel qui dérivent dans la lumière du
// soir. Ils remplissent une boîte qui suit la caméra, mais restent fixes dans
// le monde : quand la boîte avance, les grains sortis d'un côté rentrent de
// l'autre (modulo), en s'effaçant près des bords. Un seul appel de dessin.

import * as THREE from 'three';
import { effectColors } from '../../data/palette.js';
import { createRng } from '../pixels.js';
import { FX_OUTPUT_GLSL, POINT_SIZE_GLSL } from './points.js';

const COUNT = 90;
const SIZE = 0.0625; // un gros pixel
const BOX = [26, 3, 20];

export function createDust(uniforms) {
  const rng = createRng(91);
  const seeds = [];
  for (let i = 0; i < COUNT; i += 1) seeds.push(rng(), rng(), rng(), rng());
  const geometry = new THREE.BufferGeometry();
  // Les positions sont calculées par le GPU ; three.js veut tout de même un
  // attribut position pour connaître le nombre de points.
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(COUNT * 3), 3));
  geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 4));

  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uColor: { value: new THREE.Color(effectColors.poussiere) } },
    vertexShader: /* glsl */`
      attribute vec4 seed;
      uniform float uTime;
      uniform vec3 uFocus;
      varying float vLight;
      ${POINT_SIZE_GLSL}
      void main() {
        vec3 box = vec3( ${BOX.map((v) => v.toFixed(1)).join(', ')} );
        vec3 origin = vec3( uFocus.x - box.x * 0.5, 0.2, uFocus.z - box.z * 0.5 );
        vec3 drift = vec3( 0.18, 0.04, -0.12 ) * uTime
          + vec3( sin( uTime * 0.3 + seed.w * 6.28 ) * 0.3, sin( uTime * 0.5 + seed.w * 3.1 ) * 0.2, 0.0 );
        vec3 local = mod( seed.xyz * box + drift - origin, box );
        vec3 edge = min( local, box - local ) / box;
        float fade = smoothstep( 0.0, 0.08, min( edge.x, min( edge.y, edge.z ) ) );
        vec4 mvPosition = viewMatrix * vec4( origin + local, 1.0 );
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = pixelPointSize( ${SIZE.toFixed(4)}, mvPosition );
        vLight = fade * ( 0.35 + 0.65 * ( 0.5 + 0.5 * sin( uTime * 1.6 + seed.w * 20.0 ) ) );
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      varying float vLight;
      void main() {
        gl_FragColor = vec4( uColor * vLight * 0.9, 1.0 );
        ${FX_OUTPUT_GLSL}
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'poussiere';
  points.frustumCulled = false;
  return points;
}
