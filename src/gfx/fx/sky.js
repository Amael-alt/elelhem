// Le ciel : une sphère toujours centrée sur la caméra et renvoyée au plan
// lointain (z = w dans le vertex shader), derrière tout le reste.
//
// La caméra regarde vers le bas : on ne voit du ciel que ce qui dépasse
// autour du socle, sous l'horizon. Le dégradé suit donc la hauteur du regard
// dans cette plage : pêche en bas de l'image, bleu en haut. Une lueur chaude
// monte du côté du soleil (à gauche de l'image), et son disque apparaîtrait si
// la caméra le regardait.

import * as THREE from 'three';
import { skyColors } from '../../data/palette.js';
import { FX_OUTPUT_GLSL } from './points.js';

const LOW_ELEVATION = -0.85; // radians : bas de l'image
const HIGH_ELEVATION = -0.35; // haut de l'image
const INTENSITY = 0.55; // ramène le ciel, une fois étalonné, vers ses couleurs

export function createSky(sunDirection) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uLow: { value: new THREE.Color(skyColors.bas) },
      uHigh: { value: new THREE.Color(skyColors.haut) },
      uSun: { value: new THREE.Color(skyColors.soleil) },
      uSunDirection: { value: sunDirection },
      // La nuit (version 2.9, world/daylight.js) : le ciel vire au bleu profond.
      uNight: { value: 0 },
      uNightSky: { value: new THREE.Color('#121a36') },
    },
    vertexShader: /* glsl */`
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        vec4 clip = projectionMatrix * vec4( mat3( viewMatrix ) * position, 1.0 );
        gl_Position = clip.xyww;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uLow;
      uniform vec3 uHigh;
      uniform vec3 uSun;
      uniform float uNight;
      uniform vec3 uNightSky;
      uniform vec3 uSunDirection;
      varying vec3 vDirection;
      void main() {
        vec3 direction = normalize( vDirection );
        float elevation = asin( clamp( direction.y, -1.0, 1.0 ) );
        vec3 color = mix( uLow, uHigh, smoothstep( ${LOW_ELEVATION.toFixed(3)}, ${HIGH_ELEVATION.toFixed(3)}, elevation ) );
        float side = max( dot( normalize( direction.xz + 1e-5 ), normalize( uSunDirection.xz ) ), 0.0 );
        float facing = max( dot( direction, uSunDirection ), 0.0 );
        color += uSun * ( pow( side, 3.0 ) * 0.35 + pow( facing, 64.0 ) * 0.8 + step( 0.9995, facing ) * 4.0 );
        gl_FragColor = vec4( mix( color, uNightSky, uNight * 0.85 ) * ${INTENSITY.toFixed(3)}, 1.0 );
        ${FX_OUTPUT_GLSL}
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), material);
  mesh.name = 'ciel';
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  mesh.setNight = (night) => {
    material.uniforms.uNight.value = night;
  };
  return mesh;
}
