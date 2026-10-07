// Matériaux du décor, greffés sur MeshStandardMaterial de three.js.
//
// Échantillonnage « bilinéaire net ». En filtrage au plus proche, les texels
// scintillent dès que la caméra bouge d'une fraction de pixel. En bilinéaire
// classique, ils deviennent flous. L'astuce : on garde le filtre bilinéaire,
// mais on recale les coordonnées au centre du texel, sauf sur la largeur d'un
// pixel d'écran autour de chaque bord (mesurée par fwidth). Les texels restent
// nets, et leurs bords sont adoucis sur un seul pixel : plus de scintillement.
//
// Occlusion ambiante cuite. La couleur de sommet ne teinte pas la matière :
// elle assombrit la lumière d'ambiance (le ciel) dans les coins et au pied des
// murs, et un peu seulement la lumière directe du soleil.

import * as THREE from 'three';

const AO_ON_DIRECT = 0.35;

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

// Remplace la lecture de la couleur, des normales et de l'émission par
// sharpSample dans le fragment shader d'un matériau standard de three.js.
export function injectSharpSampling(shader, texSize) {
  shader.uniforms.uTexSize = { value: texSize };
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${SHARP_SAMPLE_GLSL}`)
    .replace('#include <map_fragment>', THREE.ShaderChunk.map_fragment
      .replace('texture2D( map, vMapUv )', 'sharpSample( map, vMapUv )'))
    .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps
      .replace('texture2D( normalMap, vNormalMapUv )', 'sharpSample( normalMap, vNormalMapUv )'))
    .replace('#include <emissivemap_fragment>', THREE.ShaderChunk.emissivemap_fragment
      .replace('texture2D( emissiveMap, vEmissiveMapUv )', 'sharpSample( emissiveMap, vEmissiveMapUv )'));
}

function injectBakedAo(shader) {
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <color_fragment>', '')
    .replace('#include <aomap_fragment>', /* glsl */`
      #include <aomap_fragment>
      #ifdef USE_COLOR
        reflectedLight.indirectDiffuse *= vColor.r;
        reflectedLight.directDiffuse *= mix( 1.0, vColor.r, ${AO_ON_DIRECT.toFixed(2)} );
      #endif
    `);
}

// Les ombres des lanternes sont calculées une seule fois. Un objet qui porte ce
// matériau comme customDistanceMaterial n'y projette rien : il est envoyé hors
// du champ. Sert au héros (qui bouge) et aux lanternes elles-mêmes (leur
// poteau, sous la flamme, éteindrait le sol tout autour).
export function createNoPointShadowMaterial() {
  const material = new THREE.MeshDistanceMaterial();
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      '#include <project_vertex>\n  gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );',
    );
  };
  return material;
}

// Matériau du décor : lumières, ombres, brume de three.js, échantillonnage net
// et occlusion cuite. texSize : taille de la texture en pixels, lue sur
// l'image de la carte quand elle n'est pas donnée (une tuile du décor).
export function createPixelMaterial({
  map, normalMap = null, normalStrength = 1, emissiveMap = null, emissiveIntensity = 0,
  roughness = 0.9, texSize = map?.image ? [map.image.width, map.image.height] : [64, 64],
}) {
  const material = new THREE.MeshStandardMaterial({
    map,
    normalMap,
    normalScale: new THREE.Vector2(normalStrength, normalStrength),
    emissiveMap,
    emissive: emissiveMap ? 0xffffff : 0x000000,
    emissiveIntensity,
    roughness,
    metalness: 0,
    vertexColors: true,
  });
  const size = new THREE.Vector2(...texSize);
  material.onBeforeCompile = (shader) => {
    injectSharpSampling(shader, size);
    injectBakedAo(shader);
  };
  return material;
}
