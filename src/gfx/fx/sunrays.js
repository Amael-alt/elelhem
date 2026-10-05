// Rayons de soleil : de longs quads translucides, dans le sens de la lumière
// du soir et tournés vers la caméra autour de leur axe. Le soleil étant
// derrière la caméra, des rayons exactement parallèles à la lumière seraient
// presque horizontaux à l'écran : on les incline vers le bas (RAY_DROP) pour
// qu'ils se lisent comme des rayons qui tombent, de la gauche vers la droite,
// du côté du soleil. Ils s'ajoutent à l'image
// (mélange additif), restent discrets (opacité de 0,06 à 0,12) et respirent
// lentement. Leur intensité est tramée sur quatre paliers (Bayer 4 × 4) : des
// rayons de pixel art, pas un dégradé lisse. Absents des deux démos de
// référence, demandés pour la lumière dorée. Un seul appel de dessin.

import * as THREE from 'three';
import { effectColors } from '../../data/palette.js';
import { FX_OUTPUT_GLSL } from './points.js';

const DITHER_CELL = 2.0; // côté d'une case de tramage, en pixels d'écran
const RAY_DROP = 1.2;

// rays : [{ center: [x, y, z], length, width, opacity }].
export function createSunRays(rays, sunDirection, uniforms) {
  const corners = [];
  const centers = [];
  const sizes = [];
  const looks = [];
  const indices = [];
  rays.forEach((ray, i) => {
    for (const [cx, cy] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
      corners.push(cx, cy, 0);
      centers.push(...ray.center);
      sizes.push(ray.length, ray.width);
      looks.push(ray.opacity, i * 1.618);
    }
    indices.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3));
  geometry.setAttribute('center', new THREE.Float32BufferAttribute(centers, 3));
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 2));
  geometry.setAttribute('look', new THREE.Float32BufferAttribute(looks, 2));
  geometry.setIndex(indices);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniforms.uTime,
      uSunDirection: { value: sunDirection },
      uColor: { value: new THREE.Color(effectColors.rayon) },
    },
    vertexShader: /* glsl */`
      attribute vec3 center;
      attribute vec2 size;
      attribute vec2 look;
      uniform vec3 uSunDirection;
      varying vec2 vUv;
      varying float vOpacity;
      varying float vSeed;
      void main() {
        vec3 axis = normalize( - uSunDirection - vec3( 0.0, ${RAY_DROP.toFixed(2)}, 0.0 ) );
        vec3 side = normalize( cross( axis, normalize( cameraPosition - center ) ) );
        vec3 world = center + axis * position.y * size.x + side * position.x * size.y;
        vUv = position.xy + 0.5;
        vOpacity = look.x;
        vSeed = look.y;
        gl_Position = projectionMatrix * viewMatrix * vec4( world, 1.0 );
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying float vOpacity;
      varying float vSeed;

      float bayer4( vec2 p ) {
        ivec2 i = ivec2( mod( floor( p ), 4.0 ) );
        const float m[ 16 ] = float[ 16 ]( 0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0 );
        return ( m[ i.x + i.y * 4 ] + 0.5 ) / 16.0;
      }

      void main() {
        float across = 1.0 - abs( vUv.x * 2.0 - 1.0 );
        float along = smoothstep( 0.0, 0.25, vUv.y ) * smoothstep( 1.0, 0.55, vUv.y );
        float breath = 0.75 + 0.25 * sin( uTime * 0.25 + vSeed * 6.28 );
        float k = across * across * along * breath;
        float level = floor( k * 4.0 + bayer4( gl_FragCoord.xy / ${DITHER_CELL.toFixed(1)} ) ) / 4.0;
        gl_FragColor = vec4( uColor * level * vOpacity, 1.0 );
        ${FX_OUTPUT_GLSL}
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'rayons';
  mesh.frustumCulled = false;
  return mesh;
}
