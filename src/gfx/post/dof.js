// Flou de profondeur hybride, l'ingrédient principal de l'effet maquette.
//
// Le cercle de confusion (la taille du flou) d'un pixel mélange deux idées :
// - une bande d'écran horizontale, nette autour du héros, qui se floute vers
//   le haut et le bas de l'image : c'est ce qui fait « miniature » ;
// - la profondeur : net à 2,2 unités près de la distance du héros, de plus en
//   plus flou devant (rampe de 7 unités) et derrière (rampe de 11).
// Mélange : 70 % bande, 30 % profondeur. Signe négatif devant le point net.
//
// Le flou est calculé en demi-résolution, en deux passes :
// 1. préfiltre : la scène réduite de moitié, et dans le canal alpha la
//    distance à la caméra (la plus proche des quatre pixels réduits) ;
// 2. rassemblement : chaque pixel lit ses voisins sur une spirale d'or et ne
//    garde que ceux dont le flou l'atteint. Un voisin plus lointain ne déborde
//    pas sur un pixel plus net : pas de halo flou autour d'un objet net.

import * as THREE from 'three';
import { FULLSCREEN_VERTEX } from './fullscreen.js';

const SHARP_RANGE = 2.2;
const NEAR_RAMP = 7;
const FAR_RAMP = 11;
// Version 1.2 : bande nette élargie de 20 % (0,10 à 0,12) et flou maximal
// réduit de 20 % (0,024 à 0,019), à la demande de Jordan : l'image est plus
// lisible, l'effet maquette reste. Dans une pièce, la bande couvre presque
// tout l'écran (uBandHalfWidth, réglé par le pipeline) : on voit la pièce nette.
export const BAND_HALF_WIDTH = 0.12;
const BAND_SOFTNESS = 0.4;
const TOP_BLUR_SCALE = 0.8; // le flou du haut de l'écran, réduit d'un cinquième
const DEPTH_MIX = 0.3;
export const MAX_BLUR = 0.019; // rayon maximal, en part de la hauteur d'écran
const GOLDEN_ANGLE = 2.39996323;

const f = (value) => value.toFixed(4);

export const COC_GLSL = /* glsl */`
uniform float uFocusDistance;
uniform float uBandCenter;
uniform float uBandHalfWidth;
uniform float uNear;
uniform float uFar;

// Distance à la caméra depuis la profondeur du tampon (perspective).
float viewDistance( float depth ) {
  return ( uNear * uFar ) / ( uFar - depth * ( uFar - uNear ) );
}

float circleOfConfusion( float distance, float screenY ) {
  float delta = distance - uFocusDistance;
  float depthCoc = clamp( ( abs( delta ) - ${f(SHARP_RANGE)} ) / ( delta > 0.0 ? ${f(FAR_RAMP)} : ${f(NEAR_RAMP)} ), 0.0, 1.0 );
  // Au-dessus du héros (le haut de l'écran), le flou monte un cinquième moins
  // vite : le décor qu'on regarde en marchant reste plus lisible (version 2.6).
  float offBand = screenY - uBandCenter;
  float bandCoc = smoothstep( uBandHalfWidth, uBandHalfWidth + ${f(BAND_SOFTNESS)}, offBand > 0.0 ? offBand * ${f(TOP_BLUR_SCALE)} : - offBand );
  float coc = mix( bandCoc, depthCoc, ${f(DEPTH_MIX)} );
  return delta < 0.0 ? - coc : coc;
}
`;

export function createDofPrefilterMaterial(shared) {
  return new THREE.ShaderMaterial({
    uniforms: { ...shared, uScene: { value: null }, uDepth: { value: null }, uSceneTexel: { value: new THREE.Vector2() } },
    vertexShader: FULLSCREEN_VERTEX,
    fragmentShader: /* glsl */`
      uniform sampler2D uScene;
      uniform sampler2D uDepth;
      uniform vec2 uSceneTexel;
      varying vec2 vUv;
      ${COC_GLSL}

      void main() {
        vec2 o = uSceneTexel * 0.5;
        float depth = min(
          min( texture2D( uDepth, vUv + vec2( - o.x, - o.y ) ).r, texture2D( uDepth, vUv + vec2( o.x, - o.y ) ).r ),
          min( texture2D( uDepth, vUv + vec2( - o.x, o.y ) ).r, texture2D( uDepth, vUv + vec2( o.x, o.y ) ).r ) );
        // Lecture bilinéaire au coin commun : la moyenne des quatre pixels.
        gl_FragColor = vec4( texture2D( uScene, vUv ).rgb, viewDistance( depth ) );
      }
    `,
    depthTest: false,
    depthWrite: false,
  });
}

// samples : nombre de lectures sur la spirale (moins sur téléphone).
export function createDofGatherMaterial(shared, samples) {
  return new THREE.ShaderMaterial({
    defines: { SAMPLES: samples },
    uniforms: { ...shared, uHalf: { value: null }, uHalfTexel: { value: new THREE.Vector2() }, uMaxBlurPixels: { value: 1 } },
    vertexShader: FULLSCREEN_VERTEX,
    fragmentShader: /* glsl */`
      uniform sampler2D uHalf;
      uniform vec2 uHalfTexel;
      uniform float uMaxBlurPixels;
      varying vec2 vUv;
      ${COC_GLSL}

      void main() {
        vec4 center = texture2D( uHalf, vUv );
        float centerRadius = abs( circleOfConfusion( center.a, vUv.y ) ) * uMaxBlurPixels;
        vec3 sum = center.rgb;
        float total = 1.0;
        for ( int i = 0; i < SAMPLES; i ++ ) {
          float fi = float( i ) + 0.5;
          float radius = sqrt( fi / float( SAMPLES ) ) * uMaxBlurPixels;
          float angle = fi * ${f(GOLDEN_ANGLE)};
          vec2 uv = vUv + vec2( cos( angle ), sin( angle ) ) * radius * uHalfTexel;
          vec4 neighbor = texture2D( uHalf, uv );
          float reach = abs( circleOfConfusion( neighbor.a, uv.y ) ) * uMaxBlurPixels;
          if ( neighbor.a > center.a ) reach = min( reach, centerRadius * 2.0 );
          float weight = smoothstep( radius - 1.0, radius + 1.0, reach );
          sum += neighbor.rgb * weight;
          total += weight;
        }
        gl_FragColor = vec4( sum / total, center.a );
      }
    `,
    depthTest: false,
    depthWrite: false,
  });
}
