// Sprites en billboard : un quad qui garde toujours la face vers la caméra et
// reçoit la lumière de la scène comme le décor.
//
// - Le quad reste vertical et pivote seulement autour de l'axe vertical, aligné
//   sur le plan de la caméra (tous les sprites sont parallèles). Sa hauteur est
//   allongée de 1 / cos(plongée) pour que les pixels restent carrés à l'écran.
//   Debout plutôt qu'incliné, il ne s'enfonce jamais dans un mur derrière lui.
// - Sa normale regarde la caméra, inclinée vers le haut, avec un Lambert
//   enveloppé : le personnage prend la couleur de la lumière sans s'éteindre
//   quand le soleil passe derrière lui.
// - Liseré : sur le bord de la silhouette tourné vers une lumière, le pixel de
//   contour s'éclaire de la couleur de cette lumière.
// - Ombre du soleil : un matériau maison tourne le quad vers la lumière,
//   l'ombre portée est une silhouette entière, jamais un trait. Les ombres des
//   lanternes sont calculées une seule fois au chargement (elles ne bougent
//   pas) : le sprite, qui bouge, n'y figure pas.
// - L'ombre reçue est lue en un seul point, au milieu du corps et avancé vers
//   le soleil : le sprite ne reçoit jamais sa propre ombre, mais s'assombrit
//   dans celle d'un mur.
// - alphaTest et depthWrite, jamais transparent : aucun problème de tri.

import * as THREE from 'three';
import { FRAME, FEET_ROW, PIXELS_PER_UNIT } from './sprites.js';
import { createNoPointShadowMaterial, injectSharpSampling } from './materials.js';
import { createPixelBuffer, hexToRgb, setPixel, toDataTexture } from './pixels.js';
import { outlineColor } from '../data/palette.js';

const NORMAL_TILT = 0.6;
const LIGHT_WRAP = 0.45;
const SHADOW_SAMPLE_HEIGHT = 0.45;
const SHADOW_SAMPLE_PUSH = 0.45;
const RIM_STRENGTH = 0.12;

// Quad de la taille d'un cadre, pivot sous les bottes.
function createSpriteGeometry() {
  const size = FRAME / PIXELS_PER_UNIT;
  const belowFeet = (FRAME - FEET_ROW - 1) / PIXELS_PER_UNIT;
  const geometry = new THREE.PlaneGeometry(size, size);
  geometry.translate(0, size / 2 - belowFeet, 0);
  return geometry;
}

const VISIBLE_VERTEX = /* glsl */`
#include <beginnormal_vertex>
// Axes de la caméra, lus dans la matrice de vue : droite à l'horizontale,
// et direction vers la caméra ramenée au sol.
vec3 spriteRight = normalize( vec3( viewMatrix[ 0 ][ 0 ], 0.0, viewMatrix[ 2 ][ 0 ] ) );
vec3 spriteBack = vec3( viewMatrix[ 0 ][ 2 ], viewMatrix[ 1 ][ 2 ], viewMatrix[ 2 ][ 2 ] );
float spriteStretch = 1.0 / max( length( spriteBack.xz ), 0.3 );
vec3 spriteFacing = normalize( vec3( spriteBack.x, 0.0, spriteBack.z ) );
objectNormal = normalize( spriteFacing + vec3( 0.0, ${NORMAL_TILT.toFixed(2)}, 0.0 ) );
`;

const VISIBLE_BEGIN = /* glsl */`
vec3 transformed = spriteRight * position.x + vec3( 0.0, position.y * spriteStretch, 0.0 );
`;

const VISIBLE_WORLDPOS = /* glsl */`
#include <worldpos_vertex>
#ifdef USE_SHADOWMAP
  worldPosition = modelMatrix * vec4( 0.0, ${SHADOW_SAMPLE_HEIGHT.toFixed(2)}, 0.0, 1.0 )
    + vec4( uSunDirection * ${SHADOW_SAMPLE_PUSH.toFixed(2)}, 0.0 );
#endif
`;

// Lambert enveloppé, plus le liseré. La lumière arrive en repère de vue : x
// vers la droite de l'écran, y vers le haut. Si le texel voisin, du côté de
// la lumière, est transparent, on est sur le bord : il s'éclaire.
const SPRITE_LIGHTING = THREE.ShaderChunk.lights_lambert_pars_fragment
  .replace('void RE_Direct_Lambert', /* glsl */`
float spriteEdge( vec2 offset ) {
  vec2 texel = ( floor( vMapUv * uTexSize ) + 0.5 + offset ) / uTexSize;
  return step( texture2D( map, texel ).a, 0.5 );
}

void RE_Direct_Lambert`)
  .replace('float dotNL = saturate( dot( geometryNormal, directLight.direction ) );', /* glsl */`
  float dotNL = saturate( ( dot( geometryNormal, directLight.direction ) + ${LIGHT_WRAP.toFixed(2)} ) / ${(1 + LIGHT_WRAP).toFixed(2)} );
  vec3 toLight = directLight.direction;
  float rim = spriteEdge( vec2( sign( toLight.x ), 0.0 ) ) * abs( toLight.x )
    + spriteEdge( vec2( 0.0, 1.0 ) ) * max( toLight.y, 0.0 );
  reflectedLight.directDiffuse += min( rim, 1.0 ) * directLight.color * ${RIM_STRENGTH.toFixed(2)};`);

function createVisibleMaterial(texture, texSize, sunDirection) {
  const material = new THREE.MeshLambertMaterial({ map: texture, alphaTest: 0.5 });
  material.shadowSide = THREE.DoubleSide;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDirection = { value: sunDirection };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uSunDirection;')
      .replace('#include <beginnormal_vertex>', VISIBLE_VERTEX)
      .replace('#include <begin_vertex>', VISIBLE_BEGIN)
      .replace('#include <worldpos_vertex>', VISIBLE_WORLDPOS);
    injectSharpSampling(shader, texSize);
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_lambert_pars_fragment>', SPRITE_LIGHTING);
  };
  return material;
}

// Ombre du soleil : le quad, debout et à sa vraie hauteur, face à la caméra
// d'ombre (donc à la lumière).
function createDepthMaterial(texture) {
  const material = new THREE.MeshDepthMaterial({ map: texture, alphaTest: 0.5 });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', /* glsl */`
      vec3 lightRight = normalize( vec3( viewMatrix[ 0 ][ 0 ], 0.0, viewMatrix[ 2 ][ 0 ] ) );
      vec3 transformed = lightRight * position.x + vec3( 0.0, position.y, 0.0 );
    `);
  };
  return material;
}

// Un sprite animé : sa propre copie de la texture (même image sur le GPU),
// dont le décalage choisit le cadre. Les matériaux d'ombre lisent la même.
export function createSprite(sheet, sunDirection) {
  const texture = sheet.texture.clone();
  texture.repeat.set(1 / sheet.columns, 1 / sheet.rows);
  const texSize = new THREE.Vector2(sheet.columns * FRAME, sheet.rows * FRAME);

  const mesh = new THREE.Mesh(createSpriteGeometry(), createVisibleMaterial(texture, texSize, sunDirection));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false; // le quad tourne dans le shader, sa boîte englobante ne le suit pas
  mesh.customDepthMaterial = createDepthMaterial(texture);
  // Les ombres des lanternes, figées au chargement, ne doivent pas le garder.
  mesh.customDistanceMaterial = createNoPointShadowMaterial();

  return {
    object: mesh,
    // row : ligne de la planche (direction) ; column : image.
    setFrame(row, column) {
      texture.offset.set(column / sheet.columns, 1 - (row + 1) / sheet.rows);
    },
  };
}

// Décalque d'ombre douce sous les pieds : il pose le personnage au sol même
// quand l'ombre du soleil part loin derrière lui.
export function createBlobShadow({ width = 0.95, depth = 0.5, opacity = 0.45 } = {}) {
  const size = 32;
  const buffer = createPixelBuffer(size, size);
  const rgb = hexToRgb(outlineColor);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d = Math.hypot((x + 0.5) / size - 0.5, (y + 0.5) / size - 0.5) * 2;
      const alpha = Math.max(0, 1 - d) ** 1.5;
      setPixel(buffer, x, y, rgb, Math.round(alpha * 255));
    }
  }
  const material = new THREE.MeshBasicMaterial({
    map: toDataTexture(buffer, { repeat: false, mipmaps: false }),
    transparent: true,
    opacity,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 1;
  return mesh;
}
