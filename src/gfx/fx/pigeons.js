// Les pigeons du colombier : quelques oiseaux qui tournent autour de la tour.
// Version 2.6 : ils étaient quatre boîtes et un battement par étirement.
// Chacun est maintenant un corps fuselé (poitrail rond, cou, tête, bec,
// queue en éventail) et deux ailes à part, articulées à l'épaule, qui
// battent en tournant : trois InstancedMesh, trois appels de dessin pour
// toute la volée. Les ailes se plient aussi un peu quand l'oiseau plane.

import * as THREE from 'three';
import { createFrame, createMeshBuilder, pushBox, pushRevolution, pushSkewBox, toGeometry } from '../../world/builder.js';
import { effectColors } from '../../data/palette.js';

const FLAP_RATE = 7; // battements par seconde
const FLAP_ANGLE = 0.95; // amplitude du battement, en radians
const FLY_SPEED = 0.55; // radians par seconde
const GLIDE_PERIOD = 5.5; // de temps en temps, l'oiseau plane
const WING_OFFSET = 0.045; // l'épaule, de part et d'autre du corps
const BIRD_SCALE = 1.5; // un pigeon d'une demi-unité d'envergure environ : lisible depuis le sol

// Le corps, le long de x (la tête vers +x), tourné vers l'avant du vol.
function createBodyGeometry() {
  const builder = createMeshBuilder();
  const frame = createFrame(builder, [0, 0, 0]);
  const flat = { groundAo: 1 };
  // Le corps : une surface de révolution autour de x, obtenue en la tournant
  // d'un quart de tour (les anneaux sont donnés le long de y).
  const body = createMeshBuilder();
  const spindle = createFrame(body, [0, 0, 0]);
  pushRevolution(spindle, [[-0.2, 0.01], [-0.12, 0.05], [0.0, 0.075], [0.1, 0.065], [0.17, 0.035], [0.2, 0.01]], { sides: 8, groundAo: 1 });
  const rotate = new THREE.Matrix4().makeRotationZ(-Math.PI / 2);
  for (let i = 0; i < body.positions.length; i += 3) {
    const v = new THREE.Vector3(body.positions[i], body.positions[i + 1], body.positions[i + 2]).applyMatrix4(rotate);
    const n = new THREE.Vector3(body.normals[i], body.normals[i + 1], body.normals[i + 2]).applyMatrix4(rotate);
    builder.positions.push(v.x, v.y, v.z);
    builder.normals.push(n.x, n.y, n.z);
  }
  builder.uvs.push(...body.uvs);
  builder.colors.push(...body.colors);
  builder.indices.push(...body.indices);
  pushBox(frame, [0.16, 0.0, -0.025], [0.24, 0.07, 0.025], flat); // le cou
  pushBox(frame, [0.21, 0.03, -0.035], [0.3, 0.11, 0.035], flat); // la tête
  pushBox(frame, [0.3, 0.055, -0.01], [0.345, 0.075, 0.01], flat); // le bec
  pushSkewBox(frame, [-0.19, -0.02, -0.055], [[-0.14, 0.02, -0.03], [0, 0.015, 0], [0, 0, 0.11]], flat); // la queue, en éventail
  pushSkewBox(frame, [-0.19, -0.02, 0.0], [[-0.14, 0.02, 0.03], [0, 0.015, 0], [0, 0, 0.055]], flat);
  return toGeometry(builder);
}

// Une aile, à plat, articulée en son bord intérieur (z = 0), tendue vers +z :
// l'os de l'épaule puis la main, un peu reculée, et des rémiges au bout.
function createWingGeometry() {
  const builder = createMeshBuilder();
  const frame = createFrame(builder, [0, 0, 0]);
  const flat = { groundAo: 1 };
  pushSkewBox(frame, [-0.07, 0, 0], [[0.17, 0, 0], [0, 0.012, 0], [-0.03, 0, 0.17]], flat); // le bras
  pushSkewBox(frame, [-0.13, 0, 0.16], [[0.19, 0, 0], [0, 0.01, 0], [-0.06, 0, 0.15]], flat); // la main
  for (let k = 0; k < 3; k += 1) {
    pushSkewBox(frame, [-0.2 + k * 0.05, 0, 0.3], [[0.035, 0, 0], [0, 0.008, 0], [-0.04 + k * 0.012, 0, 0.09 - k * 0.012]], flat); // les rémiges
  }
  return toGeometry(builder);
}

// center : [x, y, z] du centre du vol ; radius : rayon moyen ; count : nombre
// d'oiseaux.
export function createPigeons({ center, radius, count }) {
  const material = new THREE.MeshLambertMaterial({ color: effectColors.pigeon, vertexColors: true });
  const bodies = new THREE.InstancedMesh(createBodyGeometry(), material, count);
  const wings = new THREE.InstancedMesh(createWingGeometry(), material, count * 2);
  bodies.name = 'pigeons';
  wings.name = 'pigeons-ailes';
  bodies.frustumCulled = false;
  wings.frustumCulled = false;
  const tint = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    // Des gris et des blancs variés : chaque oiseau a sa robe, ses ailes un peu plus claires.
    tint.set(effectColors.pigeon).offsetHSL(0, (i % 2) * -0.1, (i % 3) * 0.08 - 0.06);
    bodies.setColorAt(i, tint);
    wings.setColorAt(i * 2, tint.clone().offsetHSL(0, 0, 0.05));
    wings.setColorAt(i * 2 + 1, tint.clone().offsetHSL(0, 0, 0.05));
  }
  const group = new THREE.Group();
  group.add(bodies, wings);

  const matrix = new THREE.Matrix4();
  const bodyMatrix = new THREE.Matrix4();
  const wingMatrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const roll = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const one = new THREE.Vector3(BIRD_SCALE, BIRD_SCALE, BIRD_SCALE);
  const up = new THREE.Vector3(0, 1, 0);
  const forward = new THREE.Vector3(1, 0, 0);
  const shoulder = new THREE.Vector3();
  const unit = new THREE.Vector3(1, 1, 1);
  const unscaledBody = new THREE.Matrix4();

  return {
    mesh: group,
    update(time) {
      for (let i = 0; i < count; i += 1) {
        const phase = (i / count) * Math.PI * 2;
        const speed = FLY_SPEED * (1 + (i % 3) * 0.12);
        const angle = time * speed + phase;
        const r = radius * (0.8 + 0.25 * Math.sin(phase * 3 + time * 0.3));
        position.set(
          center[0] + Math.cos(angle) * r,
          center[1] + Math.sin(time * 0.7 + phase * 2) * 0.45,
          center[2] + Math.sin(angle) * r,
        );
        // Tangente du cercle : l'oiseau vole dans le sens de sa course, et
        // s'incline vers l'intérieur du virage.
        quaternion.setFromAxisAngle(up, -angle + Math.PI / 2);
        roll.setFromAxisAngle(forward, -0.25);
        quaternion.multiply(roll);
        bodyMatrix.compose(position, quaternion, one);
        bodies.setMatrixAt(i, bodyMatrix);
        // Le battement : un coup d'aile vers le bas, plus bref que la remontée ;
        // et par moments, l'oiseau plane, les ailes tendues.
        const glide = Math.sin(time / GLIDE_PERIOD * Math.PI * 2 + phase * 1.7) > 0.72;
        const beat = Math.sin(time * FLAP_RATE * Math.PI * 2 + phase * 5);
        const flap = glide ? 0.15 : FLAP_ANGLE * (beat > 0 ? beat : beat * 0.6);
        for (const side of [1, -1]) {
          shoulder.set(0.02, 0.03, side * WING_OFFSET);
          // L'aile se replie sur l'axe du corps (x) ; l'aile gauche est en miroir.
          wingMatrix.makeRotationX(side * flap);
          wingMatrix.multiply(matrix.makeScale(BIRD_SCALE, BIRD_SCALE, side * BIRD_SCALE));
          wingMatrix.setPosition(shoulder.multiplyScalar(BIRD_SCALE));
          wingMatrix.premultiply(unscaledBody.compose(position, quaternion, unit));
          wings.setMatrixAt(i * 2 + (side > 0 ? 0 : 1), wingMatrix);
        }
      }
      bodies.instanceMatrix.needsUpdate = true;
      wings.instanceMatrix.needsUpdate = true;
    },
  };
}
