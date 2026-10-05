// Passe de composition : l'image finale.
//
// On part de la scène nette (pleine résolution, en HDR linéaire), on y fond le
// flou de profondeur selon le cercle de confusion de chaque pixel, on ajoute
// le bloom, puis on étalonne : exposition, ACES, teinte scindée (ombres vers
// le bleu, hautes lumières vers l'ambre), saturation, contraste, vignette,
// grain. C'est le seul endroit où l'image passe en sRGB.
//
// L'étalonnage est une fonction GLSL partagée : les sprites, dessinés après
// la composition pour rester nets, l'appliquent eux-mêmes à leurs pixels.

import * as THREE from 'three';
import { COC_GLSL } from './dof.js';
import { FULLSCREEN_VERTEX } from './fullscreen.js';

export const EXPOSURE = 1.25;
const SPLIT_TONE = 0.04;
const SATURATION = 1.12;
const CONTRAST = 1.07;
const VIGNETTE = 0.45;
const GRAIN = 0.02;
const BLOOM_STRENGTH = 0.5;
const SHOULDER = 0.85;

const f = (value) => value.toFixed(4);

export const GRADE_GLSL = /* glsl */`
uniform float uTime;

// Courbe ACES ajustée (Stephen Hill), même convention que three.js : le mode
// ?nofx et le rendu final partent de la même image.
vec3 gradeRrtOdt( vec3 v ) {
  vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
  vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
  return a / b;
}

vec3 gradeAces( vec3 color ) {
  const mat3 inputMat = mat3( vec3( 0.59719, 0.07600, 0.02840 ), vec3( 0.35458, 0.90834, 0.13383 ), vec3( 0.04823, 0.01566, 0.83777 ) );
  const mat3 outputMat = mat3( vec3( 1.60475, -0.10208, -0.00327 ), vec3( -0.53108, 1.10813, -0.07276 ), vec3( -0.07367, -0.00605, 1.07602 ) );
  color *= ${f(EXPOSURE)} / 0.6;
  color = outputMat * gradeRrtOdt( inputMat * color );
  return clamp( color, 0.0, 1.0 );
}

vec3 gradeToSrgb( vec3 c ) {
  return mix( c * 12.92, 1.055 * pow( c, vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, c ) );
}

float gradeHash( vec2 p ) {
  return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 );
}

// Du HDR linéaire vers l'écran (sRGB). uv : position dans l'écran, de 0 à 1.
vec3 gradeToDisplay( vec3 hdr, vec2 uv ) {
  vec3 color = gradeAces( hdr );
  float luma = dot( color, vec3( 0.2126, 0.7152, 0.0722 ) );
  color += mix( vec3( -0.6, -0.1, 0.7 ), vec3( 0.7, 0.25, -0.6 ), smoothstep( 0.1, 0.7, luma ) ) * ${f(SPLIT_TONE)};
  color = gradeToSrgb( clamp( color, 0.0, 1.0 ) );
  float l = dot( color, vec3( 0.2126, 0.7152, 0.0722 ) );
  color = mix( vec3( l ), color, ${f(SATURATION)} );
  color = ( color - 0.5 ) * ${f(CONTRAST)} + 0.5;
  // Épaule douce : au-delà de 0,85, la composante la plus forte se tasse au
  // lieu d'être écrêtée, et les autres suivent (la teinte ne bouge pas). Les
  // tuiles au soleil gardent leur relief au lieu de virer à l'orange plat.
  float peak = max( color.r, max( color.g, color.b ) );
  if ( peak > ${f(SHOULDER)} ) {
    color *= ( ${f(SHOULDER)} + ${f(1 - SHOULDER)} * ( 1.0 - exp( - ( peak - ${f(SHOULDER)} ) / ${f(1 - SHOULDER)} ) ) ) / peak;
  }
  color *= 1.0 - ${f(VIGNETTE)} * smoothstep( 0.35, 0.95, length( uv - 0.5 ) );
  color += ( gradeHash( gl_FragCoord.xy + fract( uTime ) * 61.0 ) - 0.5 ) * ${f(GRAIN)};
  return clamp( color, 0.0, 1.0 );
}
`;

// view : 'final', 'raw' (scène nette, ACES seul), 'coc' (carte de flou),
// 'bloom' (bloom seul).
export function createCompositeMaterial(shared, view) {
  return new THREE.ShaderMaterial({
    defines: { VIEW_FINAL: 0, VIEW_RAW: 1, VIEW_COC: 2, VIEW_BLOOM: 3, VIEW: { final: 0, raw: 1, coc: 2, bloom: 3 }[view] ?? 0 },
    uniforms: {
      ...shared,
      uScene: { value: null },
      uDepth: { value: null },
      uDof: { value: null },
      uBloom: { value: null },
      uMaxBlurPixels: { value: 1 },
    },
    vertexShader: FULLSCREEN_VERTEX,
    fragmentShader: /* glsl */`
      uniform sampler2D uScene;
      uniform sampler2D uDepth;
      uniform sampler2D uDof;
      uniform sampler2D uBloom;
      uniform float uMaxBlurPixels;
      varying vec2 vUv;
      ${COC_GLSL}
      ${GRADE_GLSL}

      void main() {
        vec3 sharp = texture2D( uScene, vUv ).rgb;
        float coc = circleOfConfusion( viewDistance( texture2D( uDepth, vUv ).r ), vUv.y );

        #if VIEW == VIEW_COC
          // Net en noir ; flou lointain en bleu, flou proche en orange.
          gl_FragColor = vec4( coc > 0.0 ? vec3( 0.25, 0.5, 1.0 ) * coc : vec3( 1.0, 0.55, 0.2 ) * - coc, 1.0 );
          return;
        #endif

        vec3 bloom = texture2D( uBloom, vUv ).rgb * ${f(BLOOM_STRENGTH)};

        #if VIEW == VIEW_BLOOM
          gl_FragColor = vec4( gradeToSrgb( gradeAces( bloom ) ), 1.0 );
          return;
        #elif VIEW == VIEW_RAW
          gl_FragColor = vec4( gradeToSrgb( gradeAces( sharp ) ), 1.0 );
          return;
        #endif

        // Le demi-format flou prend le relais dès que le cercle dépasse un pixel.
        float blend = smoothstep( 0.5, 2.0, abs( coc ) * uMaxBlurPixels );
        vec3 hdr = mix( sharp, texture2D( uDof, vUv ).rgb, blend ) + bloom;
        gl_FragColor = vec4( gradeToDisplay( hdr, vUv ), 1.0 );
      }
    `,
    depthTest: false,
    depthWrite: false,
  });
}
