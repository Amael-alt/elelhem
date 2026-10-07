// La cascade : la rivière du plateau tombe dans le village. Un rideau d'eau
// dont la texture défile vers le bas, plus clair que la rivière (l'eau qui
// tombe se charge d'air), de l'écume qui bouillonne au pied et une brume qui
// s'en échappe. Trois appels de dessin.

import * as THREE from 'three';
import { createMeshBuilder, pushPolygon, toGeometry } from '../../world/builder.js';
import { TILE_PIXELS, TILE_UNITS } from '../textures.js';
import { createRng } from '../pixels.js';
import { FX_OUTPUT_GLSL, PIXEL_DISC_GLSL, POINT_SIZE_GLSL } from './points.js';
import { effectColors } from '../../data/palette.js';

const FALL_SPEED = 0.9; // défilement de la texture, en tuiles par seconde
const WHITEN = 0.16; // part de blanc dans l'eau qui tombe
const STREAKS = 0.3; // filets d'écume verticaux, d'un texel de large
const GLOW = 0.12; // l'eau qui tombe accroche la lumière, même à l'ombre
const FOAM_PER_UNIT = 26;
const MIST_PER_UNIT = 10;

const u = (value) => value / TILE_UNITS;

// Bouillons et brume : des disques de pixels qui naissent au pied de la
// chute, montent un peu, s'étalent et s'effacent.
function createSpray(x0, x1, z, y, uniforms, { perUnit, life, rise, spread, size, opacity, seed }) {
  const rng = createRng(seed);
  const count = Math.round((x1 - x0) * perUnit);
  const positions = [];
  const seeds = [];
  for (let i = 0; i < count; i += 1) {
    positions.push(x0 + rng() * (x1 - x0), y, z + rng() * 0.3);
    seeds.push(rng(), rng(), rng(), rng());
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 4));
  const material = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uColor: { value: new THREE.Color(effectColors.ecume) } },
    vertexShader: /* glsl */`
      attribute vec4 seed;
      uniform float uTime;
      varying float vLife;
      varying float vArt;
      ${POINT_SIZE_GLSL}
      void main() {
        float life = fract( uTime / ${life.toFixed(2)} + seed.x );
        vec3 p = position + vec3( ( seed.y - 0.5 ) * ${spread.toFixed(2)} * life, life * ${rise.toFixed(2)}, seed.z * ${spread.toFixed(2)} * life );
        vec4 mvPosition = viewMatrix * vec4( p, 1.0 );
        gl_Position = projectionMatrix * mvPosition;
        float worldSize = ${size.toFixed(2)} * ( 0.6 + 0.8 * life ) * ( 0.7 + 0.6 * seed.w );
        gl_PointSize = pixelPointSize( worldSize, mvPosition );
        vArt = max( 2.0, floor( worldSize * 10.0 + 0.5 ) );
        vLife = life;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      varying float vLife;
      varying float vArt;
      ${PIXEL_DISC_GLSL}
      void main() {
        if ( outsidePixelDisc( vArt ) ) discard;
        float alpha = smoothstep( 0.0, 0.1, vLife ) * ( 1.0 - vLife ) * ${opacity.toFixed(2)};
        gl_FragColor = vec4( uColor * 1.4, alpha );
        ${FX_OUTPUT_GLSL}
      }
    `,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

// fall : { x0, x1, z, top, bottom } (la face de la falaise est le plan z,
// la chute se voit depuis le sud) ; waterMap : la texture de l'eau ;
// uniforms : les uniformes partagés des effets (temps, taille des points).
export function createWaterfall({ x0, x1, z, top, bottom }, waterMap, uniforms) {
  const builder = createMeshBuilder();
  const front = z + 0.04;
  pushPolygon(
    builder,
    [[x0, bottom, front], [x1, bottom, front], [x1, top, front], [x0, top, front]],
    [[u(x0), u(bottom)], [u(x1), u(bottom)], [u(x1), u(top)], [u(x0), u(top)]],
  );
  // Le bord de la chute, sur le plateau : l'eau bascule.
  pushPolygon(
    builder,
    [[x0, top, front], [x1, top, front], [x1, top + 0.02, front - 0.35], [x0, top + 0.02, front - 0.35]],
    [[u(x0), u(top)], [u(x1), u(top)], [u(x1), u(top + 0.35)], [u(x0), u(top + 0.35)]],
  );
  const material = new THREE.MeshLambertMaterial({ map: waterMap });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>\nvMapUv.y += uTime * ${FALL_SPEED.toFixed(2)};`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        // Filets d'écume : certaines colonnes de texels plus claires que d'autres.
        float column = floor( vMapUv.x * ${TILE_PIXELS.toFixed(1)} );
        float streak = step( 0.62, fract( sin( column * 12.9898 ) * 43758.5453 ) );
        diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.86, 0.93, 1.0 ), ${WHITEN.toFixed(2)} + streak * ${STREAKS.toFixed(2)} );`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * ${GLOW.toFixed(2)};`);
  };
  const sheet = new THREE.Mesh(toGeometry(builder), material);
  sheet.name = 'cascade';
  sheet.receiveShadow = true;

  const group = new THREE.Group();
  group.name = 'cascade';
  const foam = createSpray(x0 + 0.1, x1 - 0.1, front + 0.05, bottom + 0.02, uniforms, {
    perUnit: FOAM_PER_UNIT, life: 1.1, rise: 0.35, spread: 0.7, size: 0.22, opacity: 0.85, seed: 11,
  });
  const mist = createSpray(x0, x1, front + 0.2, bottom + 0.1, uniforms, {
    perUnit: MIST_PER_UNIT, life: 3.2, rise: 1.6, spread: 1.4, size: 0.6, opacity: 0.22, seed: 12,
  });
  foam.name = 'ecume';
  mist.name = 'brume-cascade';
  group.add(sheet, foam, mist);
  return group;
}
