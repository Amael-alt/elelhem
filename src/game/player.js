// Le héros : déplacement, collisions, direction du regard et animation.

import { ARMED_IDLE_FRAMES, ARMED_RUN_FRAMES, ARMED_WALK_FRAMES, DIRECTIONS, directionOf, IDLE_FPS, IDLE_FRAMES, RUN_FRAMES, WALK_FPS, WALK_FRAMES } from '../gfx/sprites.js';

const SPEED = 3.4; // unités par seconde
const RADIUS = 0.3;
const RUN_FROM = 1.3; // au-delà de ce facteur de vitesse, la foulée de course

// Le regard suit le déplacement dans huit directions (version 2.5 : les
// diagonales ont leurs vues). La direction en cours est gardée tant que le
// mouvement n'en sort pas franchement : pas de tremblement entre deux vues.
const chooseFacing = (move, current) => directionOf(move.x, move.z, current);

// village : le lieu où se trouve le héros (le village, ou un intérieur de
// world/interior.js) ; il en change avec setWorld.
export function createPlayer({ sprite, shadow, village, extras = [] }) {
  let world = village;
  const position = { x: world.spawn.x, z: world.spawn.z };
  let facing = 'down';
  let moving = false;
  let clock = 0;
  let armed = false; // l'épée à la main : les colonnes armées de la planche

  function place() {
    const y = world.groundHeight(position.x, position.z);
    sprite.object.position.set(position.x, y, position.z);
    shadow.position.set(position.x, y + 0.01, position.z);
  }

  place();

  return {
    position,
    get facing() {
      return facing;
    },
    get moving() {
      return moving;
    },
    // direction : { x, z } de longueur 1 à la marche, jusqu'à RUN_FACTOR
    // (core/input.js) en courant ; la vitesse suit cette longueur.
    update(dt, direction) {
      const wasMoving = moving;
      moving = Math.hypot(direction.x, direction.z) > 0.01;
      if (moving !== wasMoving) clock = 0;
      clock += dt;
      if (moving) {
        world.collider.move(position, direction.x * SPEED * dt, direction.z * SPEED * dt, RADIUS);
        facing = chooseFacing(direction, facing);
      }
      const pace = Math.hypot(direction.x, direction.z);
      const running = moving && pace >= RUN_FROM;
      const frames = !moving ? (armed ? ARMED_IDLE_FRAMES : IDLE_FRAMES)
        : running ? (armed ? ARMED_RUN_FRAMES : RUN_FRAMES)
          : (armed ? ARMED_WALK_FRAMES : WALK_FRAMES);
      // En courant (direction plus longue que 1), les jambes vont plus vite.
      const fps = moving ? WALK_FPS * Math.max(1, pace) : IDLE_FPS;
      sprite.setFrame(DIRECTIONS.indexOf(facing), frames[Math.floor(clock * fps) % frames.length]);
      place();
    },
    // L'épée à la main (sur la lande, armé) : repos et marche changent de colonnes.
    setArmed(on) {
      armed = Boolean(on);
    },
    // Tourne le héros vers une direction (DIRECTIONS de gfx/sprites.js).
    face(direction) {
      facing = direction;
    },
    teleport(x, z) {
      position.x = x;
      position.z = z;
      place();
    },
    // Pousse le héros de (dx, dz) en respectant les murs : recul d'un coup reçu, fente d'un coup donné.
    shove(dx, dz) {
      world.collider.move(position, dx, dz, RADIUS);
      place();
    },
    // Le héros clignote quand il vient d'être touché.
    setVisible(on) {
      sprite.object.visible = on;
    },
    worldPosition(target) {
      return target.set(position.x, world.groundHeight(position.x, position.z), position.z);
    },
    // Passe dans un autre lieu, posé en (x, z), le regard vers direction. Ses
    // objets (sprite, ombre) changent de scène.
    setWorld(newWorld, x, z, direction = facing) {
      world = newWorld;
      world.scene.add(sprite.object, shadow, ...extras);
      facing = direction;
      position.x = x;
      position.z = z;
      place();
    },
    get world() {
      return world;
    },
  };
}
