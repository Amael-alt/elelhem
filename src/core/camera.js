// Caméra fixe qui suit le héros : focale étroite, haute, en plongée, comme un
// regard posé sur une maquette. Elle ne tourne jamais ; elle glisse vers sa
// cible avec un lissage exponentiel, indépendant du nombre d'images par seconde.

import * as THREE from 'three';

const FOV_DEG = 25;
const PITCH_DEG = 36;
const DISTANCE = 28;
const LOOK_AHEAD = 2.5; // la cible est devant le héros (vers le nord) : il voit où il va
const FOLLOW_RATE = 4; // lissage 1 - exp(-4 dt)
const ZOOM_MIN = 0.8;
const ZOOM_MAX = 1.4;
const ZOOM_STEP = 1.08;
// En portrait, la caméra recule pour garder la largeur du village à l'écran.
const PORTRAIT_REFERENCE = 1.25;
const PORTRAIT_MAX = 1.9;

export function createFollowCamera() {
  const camera = new THREE.PerspectiveCamera(FOV_DEG, 1, 1, 200);
  const pitch = THREE.MathUtils.degToRad(PITCH_DEG);
  const focus = new THREE.Vector3();
  const goal = new THREE.Vector3();
  let zoom = 1;
  let portrait = 1;

  function place() {
    const distance = (DISTANCE * portrait) / zoom;
    camera.position.set(focus.x, focus.y + Math.sin(pitch) * distance, focus.z + Math.cos(pitch) * distance);
    camera.lookAt(focus);
  }

  function goalFor(target) {
    return goal.set(target.x, target.y, target.z - LOOK_AHEAD);
  }

  return {
    camera,
    setAspect(aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      portrait = Math.min(PORTRAIT_MAX, Math.max(1, PORTRAIT_REFERENCE / aspect));
      place();
    },
    zoomBy(steps) {
      zoom = THREE.MathUtils.clamp(zoom * ZOOM_STEP ** -steps, ZOOM_MIN, ZOOM_MAX);
      place();
    },
    follow(target, dt) {
      focus.lerp(goalFor(target), 1 - Math.exp(-FOLLOW_RATE * dt));
      place();
    },
    snap(target) {
      focus.copy(goalFor(target));
      place();
    },
  };
}
