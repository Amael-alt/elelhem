// Un habitant : sprite en billboard posé sur sa case, qui respire au repos,
// se tourne vers le héros quand il approche et fait obstacle comme un poteau.
// Un figurant (champ `trajet`) ne s'arrête pas pour le héros : il fait des
// allers-retours le long de son trajet, avec une pause à chaque bout.
// Tout ce qui les décrit est de la donnée (data/characters.js) : le moteur ne
// connaît aucun habitant par son nom.

import { createBlobShadow, createSprite } from '../gfx/billboard.js';
import { DIRECTIONS, FEET_ROW, IDLE_FPS, IDLE_FRAMES, PIXELS_PER_UNIT, WALK_FPS, WALK_FRAMES } from '../gfx/sprites.js';
import { SPRITE_LAYER } from '../gfx/post/pipeline.js';

export const INTERACTION_RADIUS = 2.2; // en dessous, on peut lui parler
export const NAME_RADIUS = 4.5; // en dessous, son nom s'affiche et il se tourne vers le héros
const BODY_RADIUS = 0.35; // le héros ne le traverse pas
const HEAD_MARGIN = 0.12; // au-dessus du haut du sprite, où se pose l'indicateur
const TURN_BIAS = 1.25; // garde son regard sur la diagonale, pas de tremblement
const GLOW_PULSE = 0.16; // respiration de la lumière, en part de l'émission
const GLOW_RATE = 2.2; // radians par seconde
const WALK_SPEED = 1.1; // figurants : unités par seconde
const EXTRA_WALK_FPS = WALK_FPS * 0.7; // les figurants flânent : foulée plus lente
const PAUSE_SECONDS = 1.8; // arrêt à chaque bout du trajet

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
// planche (createCharacterSheet) ; village : le lieu où il se tient (le
// village ou un intérieur, voir world/interior.js) ; post : crochets du
// post-traitement. at : { x, z, direction } pour le poser ailleurs qu'à sa
// position de la fiche (Claudette, qui attend dans la maison au début).
export function createNpc({ character, sheet, village, sunDirection, post, at = null }) {
  if (!character.position) throw new Error(`Habitant « ${character.id} » sans position.`);
  const position = { x: (at ?? character.position).x, z: (at ?? character.position).z };
  let world = village;
  let rest = at?.direction ?? character.direction; // où il regarde au repos
  const sprite = createSprite(sheet, sunDirection, post);
  // Haut du personnage (chapeau compris), lu dans sa planche.
  const headHeight = (FEET_ROW + 1 - sheet.top) / PIXELS_PER_UNIT + HEAD_MARGIN;
  sprite.object.layers.set(SPRITE_LAYER);
  const shadow = createBlobShadow();

  let ground = world.groundHeight(position.x, position.z);
  sprite.object.position.set(position.x, ground, position.z);
  shadow.position.set(position.x, ground + 0.01, position.z);
  const route = character.trajet ?? null;
  let obstacle = route ? null : world.addObstacle(position.x, position.z, BODY_RADIUS);

  let facing = rest;
  let clock = 0;
  let leg = 0; // trajet : indice du point visé
  let step = 1; // sens du parcours, 1 ou -1
  let pause = 0;

  // Un pas du figurant vers son prochain point ; renvoie vrai s'il marche.
  function walk(dt) {
    if (pause > 0) {
      pause -= dt;
      return false;
    }
    const target = route[leg + step] ?? null;
    if (!target) {
      step = -step;
      return false;
    }
    const dx = target[0] - position.x;
    const dz = target[1] - position.z;
    const distance = Math.hypot(dx, dz);
    const stride = WALK_SPEED * dt;
    if (distance <= stride) {
      position.x = target[0];
      position.z = target[1];
      leg += step;
      pause = PAUSE_SECONDS;
      return false;
    }
    position.x += (dx / distance) * stride;
    position.z += (dz / distance) * stride;
    facing = directionToward(dx, dz, facing);
    return true;
  }

  const npc = {
    id: character.id,
    character,
    position,
    // Un figurant : il a un trajet, ou le dit (figurant : vrai, le marchand et
    // la lavandière de la version 2.3, qui restent à leur poste).
    isExtra: Boolean(route) || character.figurant === true,
    objects: [sprite.object, shadow],
    get facing() {
      return facing;
    },
    distanceTo(point) {
      return Math.hypot(point.x - position.x, point.z - position.z);
    },
    // Point au-dessus de sa tête, pour ancrer l'indicateur à l'écran.
    headPoint(target) {
      return target.set(position.x, ground + headHeight, position.z);
    },
    // Le regard va vers le héros dans TURN_RADIUS, revient à sa direction
    // d'origine au-delà.
    update(dt, time, heroPosition) {
      clock += dt;
      if (route) {
        const walking = walk(dt);
        const frames = walking ? WALK_FRAMES : IDLE_FRAMES;
        const fps = walking ? EXTRA_WALK_FPS : IDLE_FPS;
        sprite.setFrame(DIRECTIONS.indexOf(facing), frames[Math.floor(clock * fps) % frames.length]);
        const y = world.groundHeight(position.x, position.z);
        sprite.object.position.set(position.x, y, position.z);
        shadow.position.set(position.x, y + 0.01, position.z);
        return;
      }
      const dx = heroPosition.x - position.x;
      const dz = heroPosition.z - position.z;
      facing = Math.hypot(dx, dz) < NAME_RADIUS ? directionToward(dx, dz, facing) : rest;
      sprite.setFrame(DIRECTIONS.indexOf(facing), IDLE_FRAMES[Math.floor(clock * IDLE_FPS) % IDLE_FRAMES.length]);
      sprite.setGlow(1 + GLOW_PULSE * Math.sin(time * GLOW_RATE));
    },
    get world() {
      return world;
    },
    // L'habitant change de lieu (du village à un intérieur, ou l'inverse) :
    // ses objets passent dans l'autre scène, son obstacle le suit.
    moveTo(newWorld, x, z, direction = character.direction) {
      if (obstacle) world.removeObstacle(obstacle);
      world = newWorld;
      position.x = x;
      position.z = z;
      rest = direction;
      facing = direction;
      ground = world.groundHeight(x, z);
      sprite.object.position.set(x, ground, z);
      shadow.position.set(x, ground + 0.01, z);
      world.scene.add(sprite.object, shadow);
      if (!route) obstacle = world.addObstacle(x, z, BODY_RADIUS);
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
