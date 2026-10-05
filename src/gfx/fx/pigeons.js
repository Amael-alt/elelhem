// Les pigeons du colombier : quelques oiseaux qui tournent autour de la tour,
// dessinés en un seul appel (InstancedMesh). Chacun est un petit volume (corps,
// tête, queue, ailes) ; le battement d'ailes est un étirement de largeur d'une
// image à l'autre, assez pour qu'on les lise comme des oiseaux à cette
// distance. Le calcul de 6 positions par image est négligeable.

import * as THREE from 'three';
import { createFrame, createMeshBuilder, pushBox, toGeometry } from '../../world/builder.js';
import { effectColors } from '../../data/palette.js';

const FLAP_RATE = 9; // battements par seconde
const FLY_SPEED = 0.55; // radians par seconde

function createBirdGeometry() {
  const builder = createMeshBuilder();
  const frame = createFrame(builder, [0, 0, 0]);
  const flat = { groundAo: 1 };
  pushBox(frame, [-0.16, -0.06, -0.06], [0.14, 0.07, 0.06], flat); // corps, le long de x
  pushBox(frame, [0.12, 0.0, -0.045], [0.24, 0.12, 0.045], flat); // tête
  pushBox(frame, [-0.3, -0.02, -0.04], [-0.14, 0.03, 0.04], flat); // queue
  pushBox(frame, [-0.08, 0.02, -0.3], [0.06, 0.05, 0.3], flat); // ailes
  return toGeometry(builder);
}

// center : [x, y, z] du centre du vol ; radius : rayon moyen ; count : nombre
// d'oiseaux.
export function createPigeons({ center, radius, count }) {
  const material = new THREE.MeshLambertMaterial({ color: effectColors.pigeon, vertexColors: true });
  const mesh = new THREE.InstancedMesh(createBirdGeometry(), material, count);
  mesh.name = 'pigeons';
  mesh.frustumCulled = false;
  const tint = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    mesh.setColorAt(i, tint.set(effectColors.pigeon).offsetHSL(0, 0, (i % 3) * 0.06 - 0.05));
  }
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  return {
    mesh,
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
        // Tangente du cercle : l'oiseau vole dans le sens de sa course.
        quaternion.setFromAxisAngle(up, -angle - Math.PI / 2 + Math.PI);
        const flap = 0.55 + 0.45 * Math.abs(Math.sin(time * FLAP_RATE + phase * 5));
        scale.set(1, 1, flap);
        mesh.setMatrixAt(i, matrix.compose(position, quaternion, scale));
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
