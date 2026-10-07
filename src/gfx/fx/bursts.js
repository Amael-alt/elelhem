// Les bouffées de particules (version 2.8) : de la poussière quand le héros
// tourne court ou part en courant, des feuilles quand il traverse l'herbe.
// À l'inverse des lucioles ou de la fumée (fonctions du temps sur le GPU),
// ces particules naissent sur un événement : une petite réserve de points
// est animée ici, image par image, avec une gravité et un frottement. Un
// seul objet Points, un appel de dessin, qui suit le héros de lieu en lieu.

import * as THREE from 'three';
import { FX_OUTPUT_GLSL, PIXEL_DISC_GLSL, POINT_SIZE_GLSL } from './points.js';

const POOL = 96; // particules au plus, les plus anciennes sont reprises
const ART_PIXELS = 4; // un disque de quatre gros pixels de côté

// Les sortes de bouffées : couleur, taille, vitesse, gravité, durée de vie.
export const BURSTS = {
  poussiere: { colors: ['#c9b38a', '#b89c73', '#e0ceaa'], size: 0.1, speed: 0.9, up: 1.1, gravity: 2.4, drag: 3.5, life: 0.45, count: 6 },
  feuilles: { colors: ['#6fae4a', '#a6d35e', '#4e8a35'], size: 0.075, speed: 0.6, up: 1.4, gravity: 1.6, drag: 2.5, life: 0.65, count: 2 },
};

// pointScale : uniforme { value } partagé avec les autres effets (pixels par
// unité à distance 1, réglé par le village à chaque redimensionnement).
export function createBursts(pointScale) {
  const positions = new Float32Array(POOL * 3);
  const colors = new Float32Array(POOL * 3);
  const sizes = new Float32Array(POOL);
  const alphas = new Float32Array(POOL);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  geometry.setDrawRange(0, 0);

  const material = new THREE.ShaderMaterial({
    uniforms: { uPointScale: pointScale },
    vertexShader: /* glsl */`
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aAlpha;
      varying vec3 vColor;
      varying float vAlpha;
      ${POINT_SIZE_GLSL}
      void main() {
        vColor = aColor;
        vAlpha = aAlpha;
        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
        gl_PointSize = pixelPointSize( aSize, mvPosition );
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vColor;
      varying float vAlpha;
      ${PIXEL_DISC_GLSL}
      void main() {
        if ( vAlpha <= 0.0 || outsidePixelDisc( ${ART_PIXELS.toFixed(1)} ) ) discard;
        gl_FragColor = vec4( vColor, 1.0 );
        ${FX_OUTPUT_GLSL}
      }
    `,
    transparent: false,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.name = 'bouffees';
  points.frustumCulled = false;

  // L'état de chaque particule, hors des attributs : vitesse, âge, durée de vie.
  const particles = Array.from({ length: POOL }, () => ({ vx: 0, vy: 0, vz: 0, age: 0, life: 0, gravity: 0, drag: 0 }));
  let next = 0;
  let alive = 0;
  const color = new THREE.Color();

  return {
    object: points,
    // Une bouffée de la sorte kind en (x, y, z) ; away : direction { x, z }
    // d'où elle est poussée (la direction que le héros quitte), facultatif.
    emit(kind, x, y, z, away = null) {
      const spec = BURSTS[kind];
      for (let n = 0; n < spec.count; n += 1) {
        const i = next;
        next = (next + 1) % POOL;
        const p = particles[i];
        const angle = Math.random() * Math.PI * 2;
        const speed = spec.speed * (0.4 + Math.random() * 0.8);
        p.vx = Math.cos(angle) * speed + (away ? away.x * spec.speed * 0.8 : 0);
        p.vz = Math.sin(angle) * speed + (away ? away.z * spec.speed * 0.8 : 0);
        p.vy = spec.up * (0.5 + Math.random() * 0.7);
        p.age = 0;
        p.life = spec.life * (0.7 + Math.random() * 0.6);
        p.gravity = spec.gravity;
        p.drag = spec.drag;
        positions[i * 3] = x + (Math.random() - 0.5) * 0.2;
        positions[i * 3 + 1] = y + 0.04;
        positions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.2;
        color.set(spec.colors[Math.floor(Math.random() * spec.colors.length)]);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        sizes[i] = spec.size * (0.7 + Math.random() * 0.6);
        alphas[i] = 1;
      }
      alive = POOL;
    },
    update(dt) {
      if (alive === 0) return;
      let living = 0;
      for (let i = 0; i < POOL; i += 1) {
        const p = particles[i];
        if (p.age >= p.life) {
          alphas[i] = 0;
          continue;
        }
        p.age += dt;
        p.vy -= p.gravity * dt;
        const damp = Math.max(0, 1 - p.drag * dt);
        p.vx *= damp;
        p.vz *= damp;
        positions[i * 3] += p.vx * dt;
        positions[i * 3 + 1] += p.vy * dt;
        positions[i * 3 + 2] += p.vz * dt;
        // Au sol, la particule s'arrête et s'efface.
        if (positions[i * 3 + 1] < 0.02) {
          positions[i * 3 + 1] = 0.02;
          p.vy = 0;
          p.vx *= 0.5;
          p.vz *= 0.5;
        }
        alphas[i] = p.age < p.life ? 1 : 0;
        living += 1;
      }
      alive = living;
      geometry.setDrawRange(0, POOL);
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.aColor.needsUpdate = true;
      geometry.attributes.aSize.needsUpdate = true;
      geometry.attributes.aAlpha.needsUpdate = true;
    },
    get count() {
      return alive;
    },
  };
}
