// Échantillonnage « bilinéaire net » greffé sur les matériaux de three.js.
//
// En filtrage au plus proche, les texels scintillent dès que la caméra bouge
// d'une fraction de pixel. En bilinéaire classique, ils deviennent flous.
// L'astuce : on garde le filtre bilinéaire, mais on recale les coordonnées au
// centre du texel, sauf sur la largeur d'un pixel d'écran autour de chaque
// bord (mesurée par fwidth). Les texels restent nets, et leurs bords sont
// adoucis sur un seul pixel : plus de scintillement.

import * as THREE from 'three';

export const SHARP_SAMPLE_GLSL = /* glsl */`
uniform vec2 uTexSize;

vec4 sharpSample( sampler2D tex, vec2 uv ) {
  vec2 texel = uv * uTexSize;
  vec2 seam = floor( texel + 0.5 );
  vec2 width = max( fwidth( texel ), vec2( 1e-5 ) );
  texel = seam + clamp( ( texel - seam ) / width, -0.5, 0.5 );
  // Les dérivées d'origine gardent le bon niveau de mipmap au loin.
  return textureGrad( tex, texel / uTexSize, dFdx( uv ), dFdy( uv ) );
}
`;

// Remplace la lecture de la couleur (et des normales si besoin) par
// sharpSample dans le fragment shader d'un matériau standard de three.js.
export function injectSharpSampling(shader, texSize) {
  shader.uniforms.uTexSize = { value: texSize };
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${SHARP_SAMPLE_GLSL}`)
    .replace('#include <map_fragment>', THREE.ShaderChunk.map_fragment
      .replace('texture2D( map, vMapUv )', 'sharpSample( map, vMapUv )'))
    .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps
      .replace('texture2D( normalMap, vNormalMapUv )', 'sharpSample( normalMap, vNormalMapUv )'));
}

// Matériau du décor : MeshStandardMaterial et ses lumières, ombres, brume,
// avec l'échantillonnage net. Toutes les tuiles font la même taille.
export function createPixelMaterial({ map, normalMap = null, normalStrength = 1, roughness = 0.9, texSize = 64 }) {
  const material = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(normalStrength, normalStrength),
    roughness,
    metalness: 0,
  });
  const size = new THREE.Vector2(texSize, texSize);
  material.onBeforeCompile = (shader) => injectSharpSampling(shader, size);
  return material;
}
