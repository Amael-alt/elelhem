// Flaques de lumière : sous chaque lanterne et autour des feux, un disque de
// lumière chaude posé sur le sol, en anneaux tramés (pixel art), ajouté à
// l'image en HDR : le bloom en fait un halo. Les quatre lanternes éclairantes
// ont déjà une vraie lumière ; les autres n'avaient que leur flamme.
// Un seul InstancedMesh, un appel de dessin.

import * as THREE from 'three';
import { lanternColor } from '../data/palette.js';

const STRENGTH = 0.36; // intensité au centre, en HDR
const RINGS = 5; // paliers de la lumière, comme du pixel art
const PIXELS_PER_UNIT = 16;

// pools : liste de { x, y, z, radius, strength? }.
export function createLightPools(pools) {
  const material = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(lanternColor) } },
    vertexShader: /* glsl */`
      attribute float aStrength;
      varying vec2 vUv;
      varying float vStrength;
      varying float vRadius;
      void main() {
        vUv = uv - 0.5;
        vStrength = aStrength;
        vRadius = length( instanceMatrix[ 0 ].xyz ) * 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vStrength;
      varying float vRadius;
      void main() {
        // Coordonnées arrondies à la grille de pixels du décor.
        float texels = vRadius * ${(2 * PIXELS_PER_UNIT).toFixed(1)};
        vec2 q = ( floor( vUv * texels ) + 0.5 ) / texels;
        float d = length( q ) * 2.0;
        if ( d > 1.0 ) discard;
        float falloff = floor( ( 1.0 - d * d ) * ${RINGS.toFixed(1)} + 0.5 ) / ${RINGS.toFixed(1)};
        gl_FragColor = vec4( uColor * falloff * ${STRENGTH.toFixed(2)} * vStrength, 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const geometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const strengths = new Float32Array(pools.length);
  const mesh = new THREE.InstancedMesh(geometry, material, pools.length);
  const matrix = new THREE.Matrix4();
  pools.forEach((pool, i) => {
    const size = pool.radius * 2;
    matrix.makeScale(size, 1, size).setPosition(pool.x, pool.y + 0.01, pool.z);
    mesh.setMatrixAt(i, matrix);
    strengths[i] = pool.strength ?? 1;
  });
  geometry.setAttribute('aStrength', new THREE.InstancedBufferAttribute(strengths, 1));
  mesh.name = 'flaques-de-lumiere';
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;
  return mesh;
}
