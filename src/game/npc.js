// Un habitant : sprite en billboard posé sur sa case, qui respire au repos,
// se tourne vers le héros quand il approche et fait obstacle comme un poteau.
// Tout ce qui le décrit est de la donnée (data/characters.js) : le moteur ne
// connaît aucun habitant par son nom.

import { createBlobShadow, createSprite } from '../gfx/billboard.js';
import { DIRECTIONS, IDLE_FPS, IDLE_FRAMES } from '../gfx/sprites.js';
import { SPRITE_LAYER } from '../gfx/post/pipeline.js';

export const INTERACTION_RADIUS = 2.2; // en dessous, on peut lui parler
const TURN_RADIUS = 4.5; // en dessous, il se tourne vers le héros
const BODY_RADIUS = 0.35; // le héros ne le traverse pas
const HEAD_HEIGHT = 2.05; // au-dessus de ses pieds, où se pose l'indicateur
const TURN_BIAS = 1.25; // garde son regard sur la diagonale, pas de tremblement
const GLOW_PULSE = 0.16; // respiration de la lumière, en part de l'émission
const GLOW_RATE = 2.2; // radians par seconde

// Direction du regard pour un écart (dx, dz) vers le héros. Sud = +z = bas de
// l'écran. L'axe du regard actuel est favorisé de 25 % : sur une diagonale,
// l'habitant ne bascule pas d'une vue à l'autre.
export function directionToward(dx, dz, current) {
  const horizontal = Math.abs(dx) * (current === 'left' || current === 'right' ? TURN_BIAS : 1);
  const vertical = Math.abs(dz) * (current === 'up' || current === 'down' ? TURN_BIAS : 1);
  if (horizontal > vertical) return dx < 0 ? 'left' : 'right';
  return dz < 0 ? 'up' : 'down';
}

// character : une entrée de data/characters.js avec une position ; sheet : sa
// planche (createCharacterSheet) ; post : crochets du post-traitement.
export function createNpc({ character, sheet, village, sunDirection, post }) {
  if (!character.position) throw new Error(`Habitant « ${character.id} » sans position.`);
  const position = { x: character.position.x, z: character.position.z };
  const sprite = createSprite(sheet, sunDirection, post);
  sprite.object.layers.set(SPRITE_LAYER);
  const shadow = createBlobShadow();

  const ground = village.groundHeight(position.x, position.z);
  sprite.object.position.set(position.x, ground, position.z);
  shadow.position.set(position.x, ground + 0.01, position.z);
  village.addObstacle(position.x, position.z, BODY_RADIUS);

  let facing = character.direction;
  let clock = 0;

  const npc = {
    id: character.id,
    character,
    position,
    objects: [sprite.object, shadow],
    get facing() {
      return facing;
    },
    distanceTo(point) {
      return Math.hypot(point.x - position.x, point.z - position.z);
    },
    // Point au-dessus de sa tête, pour ancrer l'indicateur à l'écran.
    headPoint(target) {
      return target.set(position.x, ground + HEAD_HEIGHT, position.z);
    },
    // Le regard va vers le héros dans TURN_RADIUS, revient à sa direction
    // d'origine au-delà.
    update(dt, time, heroPosition) {
      clock += dt;
      const dx = heroPosition.x - position.x;
      const dz = heroPosition.z - position.z;
      facing = Math.hypot(dx, dz) < TURN_RADIUS ? directionToward(dx, dz, facing) : character.direction;
      sprite.setFrame(DIRECTIONS.indexOf(facing), IDLE_FRAMES[Math.floor(clock * IDLE_FPS) % IDLE_FRAMES.length]);
      sprite.setGlow(1 + GLOW_PULSE * Math.sin(time * GLOW_RATE));
    },
    // Tourne l'habitant vers un point (au début d'une conversation).
    faceToward(point) {
      facing = directionToward(point.x - position.x, point.z - position.z, facing);
    },
  };
  sprite.setFrame(DIRECTIONS.indexOf(facing), IDLE_FRAMES[0]);
  sprite.setGlow(1);
  return npc;
}
