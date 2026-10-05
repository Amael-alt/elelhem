// Flammes des lanternes, dessinées par le GPU sur une grille de 7 × 11 gros
// pixels. Toutes les flammes du village tiennent dans un seul maillage (un
// appel de dessin) : chaque quad connaît son centre et tourne face à la caméra
// dans le vertex shader. Le fragment shader découpe une goutte qui ondule et
// la colore par paliers, du rouge sombre au blanc. Sa couleur dépasse 1 : le
// bloom de l'étape 1c en fera un halo.

import * as THREE from 'three';

const INTENSITY = 2.6;
const STEPS_PER_SECOND = 12; // animation par paliers, comme du pixel art

const VERTEX = /* glsl */`
attribute vec3 center;
attribute float seed;
varying vec2 vUv;
varying float vSeed;

void main() {
  vec3 right = vec3( viewMatrix[ 0 ][ 0 ], viewMatrix[ 1 ][ 0 ], viewMatrix[ 2 ][ 0 ] );
  vec3 up = vec3( viewMatrix[ 0 ][ 1 ], viewMatrix[ 1 ][ 1 ], viewMatrix[ 2 ][ 1 ] );
  vec3 world = center + right * position.x + up * position.y;
  vUv = uv;
  vSeed = seed;
  gl_Position = projectionMatrix * viewMatrix * vec4( world, 1.0 );
}
`;

const FRAGMENT = /* glsl */`
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;
varying float vSeed;

float hash( vec2 p ) {
  return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
}

float noise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( hash( i ), hash( i + vec2( 1.0, 0.0 ) ), f.x ),
              mix( hash( i + vec2( 0.0, 1.0 ) ), hash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
}

void main() {
  vec2 grid = vec2( 7.0, 11.0 );
  vec2 p = ( floor( vUv * grid ) + 0.5 ) / grid; // centre du gros pixel
  float t = floor( uTime * ${STEPS_PER_SECOND.toFixed(1)} ) / ${STEPS_PER_SECOND.toFixed(1)};

  // La goutte : large en bas, pointue en haut, son sommet ondule.
  float sway = ( noise( vec2( p.y * 2.5 - t * 3.0, vSeed ) ) - 0.5 ) * 0.5 * p.y;
  float across = abs( p.x - 0.5 - sway ) * 2.0;
  float width = mix( 0.95, 0.12, smoothstep( 0.0, 1.0, p.y ) );
  float lick = noise( vec2( p.x * 5.0 + vSeed, p.y * 4.0 - t * 7.0 ) );
  float heat = ( 1.0 - across / width ) * ( 1.2 - p.y ) + ( lick - 0.5 ) * 0.5;
  if ( heat < 0.2 ) discard;

  vec3 color = heat > 0.85 ? vec3( 1.0, 0.96, 0.8 )
    : heat > 0.6 ? vec3( 1.0, 0.78, 0.35 )
    : heat > 0.38 ? vec3( 1.0, 0.5, 0.12 )
    : vec3( 0.78, 0.22, 0.05 );
  gl_FragColor = vec4( color * uIntensity, 1.0 );

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

// points : centres du pied des flammes ; size : { width, height } en unités.
export function createFlames(points, { width, height }) {
  const positions = [];
  const uvs = [];
  const centers = [];
  const seeds = [];
  const indices = [];
  points.forEach((point, i) => {
    for (const [cx, cy] of [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]]) {
      positions.push(cx * width, cy * height, 0);
      uvs.push(cx + 0.5, cy);
      centers.push(point.x, point.y, point.z);
      seeds.push(1.7 + i * 7.13);
    }
    indices.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('center', new THREE.Float32BufferAttribute(centers, 3));
  geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 1));
  geometry.setIndex(indices);

  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uIntensity: { value: INTENSITY } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'flammes';
  mesh.frustumCulled = false; // les quads tournent dans le shader

  return {
    mesh,
    update(time) {
      material.uniforms.uTime.value = time;
    },
  };
}
