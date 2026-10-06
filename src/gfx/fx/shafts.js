// Rais de lumière (version 1.3) : le jour qui entre par une fenêtre et tombe en
// biais dans la pièce, comme dans les intérieurs des RPG en HD-2D. Pour chaque
// fenêtre : trois nappes translucides (haut, milieu et bas de la fenêtre)
// tendues de la fenêtre jusqu'au sol dans la direction de la lumière, qui
// s'élargissent un peu en descendant, et la tache claire sur le sol là où le
// jour se pose. Mélange additif, intensité tramée sur quatre paliers comme
// les rayons du village (gfx/fx/sunrays.js), respiration lente. Un seul appel
// de dessin par pièce.

import * as THREE from 'three';
import { effectColors } from '../../data/palette.js';
import { FX_OUTPUT_GLSL } from './points.js';

const DITHER_CELL = 2.0; // côté d'une case de tramage, en pixels d'écran
const SHEETS = [[1.0, 0.16], [0.5, 0.11], [0.0, 0.13]]; // [hauteur dans la fenêtre, opacité]
const PATCH_OPACITY = 0.28;
const SPREAD = 1.3; // la nappe s'élargit de ce facteur en arrivant au sol
const FLOOR_LIFT = 0.006; // la tache, juste au-dessus du plancher

// windows : [{ x, y, z, width, height }], la fenêtre sur la face intérieure du
// mur nord (en z), y son bas ; direction : où va la lumière (vers le bas,
// normalisée) ; uniforms : ceux des effets (uTime).
export function createLightShafts(windows, direction, uniforms) {
  const positions = [];
  const uvs = [];
  const looks = []; // opacité, graine, sorte (0 : nappe, 1 : tache au sol)
  const indices = [];
  // Où un point, emporté par la lumière, touche le sol.
  const floorHit = ([x, y, z]) => {
    const t = y / -direction.y;
    return [x + direction.x * t, FLOOR_LIFT, z + direction.z * t];
  };
  // Un quadrilatère : u en travers (0 à 1), v le long (0 à la fenêtre, 1 au sol).
  const quad = (corners, opacity, seed, kind) => {
    const start = positions.length / 3;
    corners.forEach((corner, i) => {
      positions.push(...corner);
      uvs.push(i === 0 || i === 3 ? 0 : 1, i < 2 ? 0 : 1);
      looks.push(opacity, seed, kind);
    });
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  };
  windows.forEach((w, n) => {
    const half = w.width / 2;
    const z = w.z + 0.03;
    for (const [h, opacity] of SHEETS) {
      const y = w.y + w.height * h;
      const [fx, fy, fz] = floorHit([w.x, y, z]);
      quad([[w.x - half, y, z], [w.x + half, y, z], [fx + half * SPREAD, fy, fz], [fx - half * SPREAD, fy, fz]], opacity, n * 1.618 + h, 0);
    }
    const near = floorHit([w.x, w.y, z]);
    const far = floorHit([w.x, w.y + w.height, z]);
    quad([
      [near[0] - half * SPREAD, FLOOR_LIFT, near[2]], [near[0] + half * SPREAD, FLOOR_LIFT, near[2]],
      [far[0] + half * SPREAD, FLOOR_LIFT, far[2]], [far[0] - half * SPREAD, FLOOR_LIFT, far[2]],
    ], PATCH_OPACITY, n * 1.618 + 0.7, 1);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('look', new THREE.Float32BufferAttribute(looks, 3));
  geometry.setIndex(indices);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniforms.uTime,
      uColor: { value: new THREE.Color(effectColors.rayon) },
    },
    vertexShader: /* glsl */`
      attribute vec3 look;
      varying vec2 vUv;
      varying vec3 vLook;
      void main() {
        vUv = uv;
        vLook = look;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying vec3 vLook;

      float bayer4( vec2 p ) {
        ivec2 i = ivec2( mod( floor( p ), 4.0 ) );
        const float m[ 16 ] = float[ 16 ]( 0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0 );
        return ( m[ i.x + i.y * 4 ] + 0.5 ) / 16.0;
      }

      void main() {
        float across = 1.0 - abs( vUv.x * 2.0 - 1.0 );
        float soft = across * across;
        // Une nappe est pleine à la fenêtre et s'éteint vers le sol ; la tache
        // au sol se fond à ses deux bouts.
        float along = vLook.z < 0.5
          ? mix( 1.0, 0.3, vUv.y )
          : smoothstep( 0.0, 0.25, vUv.y ) * smoothstep( 1.0, 0.75, vUv.y );
        float breath = 0.85 + 0.15 * sin( uTime * 0.3 + vLook.y * 6.28 );
        float k = soft * along * breath;
        float level = floor( k * 4.0 + bayer4( gl_FragCoord.xy / ${DITHER_CELL.toFixed(1)} ) ) / 4.0;
        gl_FragColor = vec4( uColor * level * vLook.x, 1.0 );
        ${FX_OUTPUT_GLSL}
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'rais';
  mesh.frustumCulled = false;
  return mesh;
}
