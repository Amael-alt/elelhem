// Le héros : déplacement, collisions, direction du regard et animation.

import { DIRECTIONS, IDLE_FPS, IDLE_FRAMES, WALK_FPS, WALK_FRAMES } from '../gfx/sprites.js';

const SPEED = 3.4; // unités par seconde
const RADIUS = 0.3;

// En diagonale, on garde la direction en cours si elle fait partie du
// mouvement : le personnage ne tremble pas entre deux vues.
function chooseFacing(move, current) {
  const horizontal = Math.abs(move.x) > 1e-3;
  const vertical = Math.abs(move.z) > 1e-3;
  const h = move.x < 0 ? 'left' : 'right';
  const v = move.z < 0 ? 'up' : 'down';
  if (horizontal && vertical) {
    if (current === h || current === v) return current;
    return Math.abs(move.x) >= Math.abs(move.z) ? h : v;
  }
  return horizontal ? h : v;
}

// village : le lieu où se trouve le héros (le village, ou un intérieur de
// world/interior.js) ; il en change avec setWorld.
export function createPlayer({ sprite, shadow, village }) {
  let world = village;
  const position = { x: world.spawn.x, z: world.spawn.z };
  let facing = 'down';
  let moving = false;
  let clock = 0;

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
      const frames = moving ? WALK_FRAMES : IDLE_FRAMES;
      // En courant (direction plus longue que 1), les jambes vont plus vite.
      const fps = moving ? WALK_FPS * Math.max(1, Math.hypot(direction.x, direction.z)) : IDLE_FPS;
      sprite.setFrame(DIRECTIONS.indexOf(facing), frames[Math.floor(clock * fps) % frames.length]);
      place();
    },
    // Tourne le héros vers une direction ('down', 'left', 'right', 'up').
    face(direction) {
      facing = direction;
    },
    teleport(x, z) {
      position.x = x;
      position.z = z;
      place();
    },
    worldPosition(target) {
      return target.set(position.x, world.groundHeight(position.x, position.z), position.z);
    },
    // Passe dans un autre lieu, posé en (x, z), le regard vers direction. Ses
    // objets (sprite, ombre) changent de scène.
    setWorld(newWorld, x, z, direction = facing) {
      world = newWorld;
      world.scene.add(sprite.object, shadow);
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
