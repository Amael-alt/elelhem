// Feuilles qui tombent des arbres roux et papillons des prés : deux petits
// effets de vie, des Points animés par le GPU (aucun calcul par image côté
// JavaScript), un appel de dessin chacun.
//
// - Une feuille naît dans la couronne, tombe en se balançant, se pose et
//   s'efface ; sa couleur est celle de son arbre.
// - Un papillon tourne autour de son point d'ancrage en courbes de Lissajous,
//   bat des ailes (sa largeur à l'écran palpite) et monte et descend un peu.

import * as THREE from 'three';
import { createRng } from '../pixels.js';
import { FX_OUTPUT_GLSL, POINT_SIZE_GLSL } from './points.js';
import { butterflyColors } from '../../data/palette.js';

const LEAVES_PER_TREE = 10;
const LEAF_LIFETIME = 7; // secondes
const LEAF_SIZE = 0.12;

// trees : liste de { x, y, z, radius, tint } (centre de couronne) ; uniforms :
// uniformes partagés des effets.
export function createFallingLeaves(trees, uniforms) {
  const rng = createRng(61);
  const positions = [];
  const seeds = [];
  const colors = [];
  const color = new THREE.Color();
  for (const tree of trees) {
    color.set(tree.tint);
    for (let i = 0; i < LEAVES_PER_TREE; i += 1) {
      const a = rng() * Math.PI * 2;
      const r = rng() * tree.radius;
      positions.push(tree.x + Math.cos(a) * r, tree.y - rng() * 0.4, tree.z + Math.sin(a) * r);
      seeds.push(rng(), rng(), rng(), tree.y);
      colors.push(color.r * (0.8 + rng() * 0.3), color.g * (0.8 + rng() * 0.3), color.b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 4));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms },
    vertexShader: /* glsl */`
      attribute vec4 seed;
      attribute vec3 color;
      uniform float uTime;
      varying vec3 vColor;
      varying float vAlpha;
      ${POINT_SIZE_GLSL}
      void main() {
        float life = fract( uTime / ${LEAF_LIFETIME.toFixed(1)} + seed.x );
        float fall = seed.w * min( life * 1.25, 1.0 ); // tombe jusqu'au sol, puis repose
        float swing = sin( life * 9.0 + seed.y * 6.28 ) * 0.35 * ( 1.0 - life );
        vec3 p = position + vec3( swing + life * 0.6, - fall, cos( life * 7.0 + seed.z * 6.28 ) * 0.2 );
        vec4 mvPosition = viewMatrix * vec4( p, 1.0 );
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = pixelPointSize( ${LEAF_SIZE.toFixed(2)}, mvPosition );
        vColor = color;
        vAlpha = smoothstep( 0.0, 0.05, life ) * ( 1.0 - smoothstep( 0.85, 1.0, life ) );
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        if ( vAlpha < 0.5 ) discard;
        gl_FragColor = vec4( vColor, 1.0 );
        ${FX_OUTPUT_GLSL}
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'feuilles';
  points.frustumCulled = false;
  return points;
}

// anchors : liste de [x, z, rayon] où volent les papillons ; perAnchor : nombre.
export function createButterflies(anchors, uniforms, perAnchor = 3) {
  const rng = createRng(67);
  const positions = [];
  const seeds = [];
  const colors = [];
  const color = new THREE.Color();
  for (const [x, z, radius] of anchors) {
    for (let i = 0; i < perAnchor; i += 1) {
      positions.push(x, 0.5, z);
      seeds.push(rng(), rng(), radius, rng());
      color.set(butterflyColors[Math.floor(rng() * butterflyColors.length)]);
      colors.push(color.r, color.g, color.b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 4));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms },
    vertexShader: /* glsl */`
      attribute vec4 seed;
      attribute vec3 color;
      uniform float uTime;
      varying vec3 vColor;
      varying float vFlap;
      ${POINT_SIZE_GLSL}
      void main() {
        float t = uTime * ( 0.35 + seed.y * 0.25 ) + seed.x * 40.0;
        vec3 p = position + vec3( sin( t * 1.3 ) * seed.z, 0.35 * sin( t * 2.1 ) + 0.25 * seed.w, sin( t * 0.9 + 1.7 ) * seed.z * 0.7 );
        vec4 mvPosition = viewMatrix * vec4( p, 1.0 );
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = pixelPointSize( 0.2, mvPosition );
        vFlap = abs( sin( uTime * 14.0 + seed.x * 30.0 ) );
        vColor = color;
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vColor;
      varying float vFlap;
      void main() {
        // Deux ailes : la largeur visible palpite avec le battement.
        vec2 q = floor( gl_PointCoord * 4.0 ) / 3.0 - 0.5;
        if ( abs( q.x ) > 0.5 * vFlap + 0.05 || abs( q.y ) > 0.34 ) discard;
        gl_FragColor = vec4( vColor * 1.2, 1.0 );
        ${FX_OUTPUT_GLSL}
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'papillons';
  points.frustumCulled = false;
  return points;
}
