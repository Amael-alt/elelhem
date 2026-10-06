// Les Hallucinations de la lande : des sprites comme les habitants, qui
// flottent, errent ou poursuivent le héros, reculent sous ses coups et se
// dissipent quand leurs points de vie tombent à zéro. Les types et les
// emplacements sont dans data/enemies.js ; les coups viennent de combat.js.
//
// Chaque Hallucination : { type, home, position, hp, state, velocity... }.
// state : 'vif' (elle rôde), 'touche' (elle recule, un court instant),
// 'meurt' (elle se dissipe), 'morte' (plus là, jusqu'au prochain reset).

import * as THREE from 'three';
import { createBlobShadow, createSprite } from '../gfx/billboard.js';
import { createCharacterSheet, DIRECTIONS, IDLE_FPS, IDLE_FRAMES } from '../gfx/sprites.js';
import { ENEMY_TYPES, HERO_COMBAT } from '../data/enemies.js';
import { SPRITE_LAYER } from '../gfx/post/pipeline.js';

const RADIUS = 0.35; // pour les murs
const SEPARATION = 0.8; // deux Hallucinations ne se superposent pas
const STUN_SECONDS = 0.28;
const DEATH_SECONDS = 0.55;
const FLASH_SECONDS = 0.1;
const WANDER_MIN = 1.0; // secondes avant de changer de cap
const WANDER_MAX = 2.4;
const FLOAT_RATE = 2.1; // balancement du flottement
const FLOAT_AMPLITUDE = 0.08;
const RETURN_MARGIN = 1.5; // au-delà de son rayon de ce pas, un poursuivant rentre chez lui

const facingOf = (dx, dz, current) => {
  if (Math.abs(dx) < 1e-3 && Math.abs(dz) < 1e-3) return current;
  return Math.abs(dx) > Math.abs(dz) ? (dx < 0 ? 'left' : 'right') : dz < 0 ? 'up' : 'down';
};

// placements : [{ type, x, z }] ; world : la lande ; sunDirection, post :
// pour les sprites ; wallet : la bourse (les Tokens gagnés) ; rng : nombres
// au hasard dans [0, 1) (Math.random par défaut, fixé par les tests).
export function createEnemies(placements, { world, sunDirection, post, wallet, rng = Math.random }) {
  const sheets = new Map();
  const sheetOf = (type) => {
    if (!sheets.has(type.sprite)) sheets.set(type.sprite, createCharacterSheet({ id: type.sprite, sprite: type.sprite }));
    return sheets.get(type.sprite);
  };

  const enemies = placements.map((placement, index) => {
    const type = ENEMY_TYPES[placement.type];
    if (!type) throw new Error(`Hallucination inconnue : « ${placement.type} »`);
    const sprite = createSprite(sheetOf(type), sunDirection, post);
    sprite.object.layers.set(SPRITE_LAYER); // dessinée après le post-traitement, comme les habitants
    const shadow = createBlobShadow({ width: 0.7, depth: 0.36, opacity: 0.3 });
    sprite.object.material.transparent = true;
    world.scene.add(sprite.object, shadow);
    return {
      id: `${placement.type}-${index}`,
      kind: placement.type,
      type,
      home: { x: placement.x, z: placement.z },
      position: { x: placement.x, z: placement.z },
      velocity: { x: 0, z: 0 },
      goal: { x: placement.x, z: placement.z },
      hp: type.pv,
      state: 'vif',
      timer: 0,
      flash: 0,
      wander: 0,
      facing: 'down',
      clock: rng() * 10,
      seed: index * 1.37,
      sprite,
      shadow,
    };
  });

  function place(enemy, time) {
    const ground = world.groundHeight(enemy.position.x, enemy.position.z);
    const lift = enemy.type.flotte + FLOAT_AMPLITUDE * Math.sin(time * FLOAT_RATE + enemy.seed);
    enemy.sprite.object.position.set(enemy.position.x, ground + lift, enemy.position.z);
    enemy.shadow.position.set(enemy.position.x, ground + 0.01, enemy.position.z);
    enemy.shadow.material.opacity = 0.3 - 0.4 * (lift - enemy.type.flotte);
  }

  function reset() {
    for (const enemy of enemies) {
      enemy.position.x = enemy.home.x;
      enemy.position.z = enemy.home.z;
      enemy.goal.x = enemy.home.x;
      enemy.goal.z = enemy.home.z;
      enemy.velocity.x = 0;
      enemy.velocity.z = 0;
      enemy.hp = enemy.type.pv;
      enemy.state = 'vif';
      enemy.timer = 0;
      enemy.flash = 0;
      enemy.wander = 0;
      enemy.sprite.object.visible = true;
      enemy.sprite.object.scale.setScalar(1);
      enemy.sprite.object.material.opacity = 1;
      enemy.sprite.object.material.color.setScalar(1);
      enemy.shadow.visible = true;
      place(enemy, 0);
    }
  }
  reset();

  // Un nouveau cap au hasard, autour de chez elle.
  function pickGoal(enemy) {
    const angle = rng() * Math.PI * 2;
    const distance = rng() * enemy.type.rayon;
    enemy.goal.x = enemy.home.x + Math.cos(angle) * distance;
    enemy.goal.z = enemy.home.z + Math.sin(angle) * distance;
    enemy.wander = WANDER_MIN + rng() * (WANDER_MAX - WANDER_MIN);
  }

  function steer(enemy, dt, player) {
    const { type } = enemy;
    let speed = type.vitesse;
    let targetX = enemy.goal.x;
    let targetZ = enemy.goal.z;
    const toPlayer = Math.hypot(player.x - enemy.position.x, player.z - enemy.position.z);
    const fromHome = Math.hypot(enemy.home.x - enemy.position.x, enemy.home.z - enemy.position.z);
    if (type.comportement === 'poursuit' && toPlayer < type.vue && fromHome < type.rayon + RETURN_MARGIN) {
      targetX = player.x;
      targetZ = player.z;
    } else if (type.comportement === 'poursuit' && fromHome >= type.rayon + RETURN_MARGIN) {
      targetX = enemy.home.x;
      targetZ = enemy.home.z;
    } else {
      enemy.wander -= dt;
      if (enemy.wander <= 0 || Math.hypot(targetX - enemy.position.x, targetZ - enemy.position.z) < 0.2) pickGoal(enemy);
      speed *= 0.7;
    }
    const dx = targetX - enemy.position.x;
    const dz = targetZ - enemy.position.z;
    const length = Math.hypot(dx, dz);
    if (length > 0.15) {
      // Accélération douce vers le cap : le vol tangue un peu.
      const ax = (dx / length) * speed;
      const az = (dz / length) * speed;
      enemy.velocity.x += (ax - enemy.velocity.x) * Math.min(1, dt * 3);
      enemy.velocity.z += (az - enemy.velocity.z) * Math.min(1, dt * 3);
    } else {
      enemy.velocity.x *= Math.max(0, 1 - dt * 4);
      enemy.velocity.z *= Math.max(0, 1 - dt * 4);
    }
  }

  function separate(enemy) {
    for (const other of enemies) {
      if (other === enemy || other.state === 'morte' || other.state === 'meurt') continue;
      const dx = enemy.position.x - other.position.x;
      const dz = enemy.position.z - other.position.z;
      const d = Math.hypot(dx, dz);
      if (d < SEPARATION && d > 1e-4) {
        const push = (SEPARATION - d) * 0.5;
        enemy.position.x += (dx / d) * push;
        enemy.position.z += (dz / d) * push;
      }
    }
  }

  return {
    list: enemies,
    reset,
    get alive() {
      return enemies.filter((enemy) => enemy.state === 'vif' || enemy.state === 'touche');
    },
    // Un coup du héros : dégâts, recul depuis (fromX, fromZ), flash. Renvoie
    // vrai si l'Hallucination se dissipe.
    hit(enemy, damage, fromX, fromZ) {
      if (enemy.state !== 'vif' && enemy.state !== 'touche') return false;
      enemy.hp -= damage;
      enemy.state = 'touche';
      enemy.timer = STUN_SECONDS;
      enemy.flash = FLASH_SECONDS;
      const dx = enemy.position.x - fromX;
      const dz = enemy.position.z - fromZ;
      const d = Math.hypot(dx, dz) || 1;
      enemy.velocity.x = (dx / d) * HERO_COMBAT.reculEnnemi * 2.2;
      enemy.velocity.z = (dz / d) * HERO_COMBAT.reculEnnemi * 2.2;
      enemy.sprite.object.material.color.setScalar(3.5);
      if (enemy.hp <= 0) {
        enemy.state = 'meurt';
        enemy.timer = DEATH_SECONDS;
        wallet.earn(enemy.type.tokens);
        return true;
      }
      return false;
    },
    // dt, time : le temps ; player : { x, z } ; onContact(enemy) : une
    // Hallucination vive touche le héros.
    update(dt, time, player, onContact) {
      for (const enemy of enemies) {
        if (enemy.state === 'morte') continue;
        if (enemy.flash > 0) {
          enemy.flash -= dt;
          if (enemy.flash <= 0) enemy.sprite.object.material.color.setScalar(1);
        }
        if (enemy.state === 'meurt') {
          enemy.timer -= dt;
          const t = Math.max(0, enemy.timer / DEATH_SECONDS);
          enemy.sprite.object.scale.set(0.3 + 0.7 * t, 0.3 + 0.7 * t, 1);
          enemy.sprite.object.material.opacity = t;
          enemy.shadow.material.opacity = 0.3 * t;
          enemy.sprite.object.position.y += dt * 0.6; // elle s'élève en s'effaçant
          if (enemy.timer <= 0) {
            enemy.state = 'morte';
            enemy.sprite.object.visible = false;
            enemy.shadow.visible = false;
          }
          continue;
        }
        if (enemy.state === 'touche') {
          enemy.timer -= dt;
          enemy.velocity.x *= Math.max(0, 1 - dt * 6);
          enemy.velocity.z *= Math.max(0, 1 - dt * 6);
          if (enemy.timer <= 0) enemy.state = 'vif';
        } else {
          steer(enemy, dt, player);
        }
        world.collider.move(enemy.position, enemy.velocity.x * dt, enemy.velocity.z * dt, RADIUS);
        separate(enemy);
        enemy.facing = facingOf(enemy.velocity.x, enemy.velocity.z, enemy.facing);
        enemy.clock += dt;
        enemy.sprite.setFrame(DIRECTIONS.indexOf(enemy.facing), IDLE_FRAMES[Math.floor(enemy.clock * IDLE_FPS) % IDLE_FRAMES.length]);
        place(enemy, time);
        if (enemy.state === 'vif' && Math.hypot(player.x - enemy.position.x, player.z - enemy.position.z) < enemy.type.portee + 0.3) {
          onContact(enemy);
        }
      }
    },
  };
}
