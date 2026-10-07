// Bloom en chaîne de mips : le halo chaud des fenêtres, des lanternes et des
// flammes.
//
// 1. Seuil doux : seuls les pixels au-dessus de 1,2 (avec un genou de 0,5
//    pour ne pas faire de marche) passent. Les pavés au soleil restent
//    dessous : ils ne doivent jamais briller.
// 2. Descente : chaque mip est la moitié du précédent, moyenne de quatre
//    lectures bilinéaires (seize pixels).
// 3. Remontée : chaque mip, élargi par un filtre en tente, s'ajoute au mip
//    du dessus. Le premier mip contient alors la somme de toutes les tailles
//    de halo, du plus serré au plus large.

import * as THREE from 'three';
import { FULLSCREEN_VERTEX } from './screen-triangle.js';

const THRESHOLD = 1.2; // 0,9 dans le plan, relevé avec le soleil (6,5 au lieu de 4,5)
const KNEE = 0.5; // part du seuil sur laquelle la courbe s'adoucit

const f = (value) => value.toFixed(4);

function pass(fragmentShader, extra = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uSource: { value: null }, uTexel: { value: new THREE.Vector2() } },
    vertexShader: FULLSCREEN_VERTEX,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    ...extra,
  });
}

export function createBloomMaterials() {
  const knee = THRESHOLD * KNEE;
  return {
    threshold: pass(/* glsl */`
      uniform sampler2D uSource;
      varying vec2 vUv;
      void main() {
        vec3 color = texture2D( uSource, vUv ).rgb;
        float brightness = max( color.r, max( color.g, color.b ) );
        float soft = clamp( brightness - ${f(THRESHOLD - knee)}, 0.0, ${f(2 * knee)} );
        soft = soft * soft / ${f(4 * knee + 1e-4)};
        float weight = max( soft, brightness - ${f(THRESHOLD)} ) / max( brightness, 1e-4 );
        gl_FragColor = vec4( color * weight, 1.0 );
      }
    `),
    down: pass(/* glsl */`
      uniform sampler2D uSource;
      uniform vec2 uTexel;
      varying vec2 vUv;
      void main() {
        vec2 o = uTexel;
        gl_FragColor = vec4( 0.25 * (
          texture2D( uSource, vUv + vec2( - o.x, - o.y ) ).rgb + texture2D( uSource, vUv + vec2( o.x, - o.y ) ).rgb
          + texture2D( uSource, vUv + vec2( - o.x, o.y ) ).rgb + texture2D( uSource, vUv + vec2( o.x, o.y ) ).rgb ), 1.0 );
      }
    `),
    // Ajouté au mip du dessus (mélange additif).
    up: pass(/* glsl */`
      uniform sampler2D uSource;
      uniform vec2 uTexel;
      varying vec2 vUv;
      void main() {
        vec2 o = uTexel;
        vec3 sum = texture2D( uSource, vUv ).rgb * 4.0;
        sum += ( texture2D( uSource, vUv + vec2( - o.x, 0.0 ) ).rgb + texture2D( uSource, vUv + vec2( o.x, 0.0 ) ).rgb
          + texture2D( uSource, vUv + vec2( 0.0, - o.y ) ).rgb + texture2D( uSource, vUv + vec2( 0.0, o.y ) ).rgb ) * 2.0;
        sum += texture2D( uSource, vUv + vec2( - o.x, - o.y ) ).rgb + texture2D( uSource, vUv + vec2( o.x, - o.y ) ).rgb
          + texture2D( uSource, vUv + vec2( - o.x, o.y ) ).rgb + texture2D( uSource, vUv + vec2( o.x, o.y ) ).rgb;
        gl_FragColor = vec4( sum / 16.0, 1.0 );
      }
    `, { blending: THREE.AdditiveBlending, transparent: true }),
  };
}
