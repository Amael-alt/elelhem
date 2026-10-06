// Le combat en temps réel : un coup d'épée à la touche (J, X, un clic, ou le
// bouton épée sur écran tactile), trois coups qui s'enchaînent si l'on appuie
// pendant le coup en cours, le troisième plus fort et plus long, avec une fente.
// Le héros a cinq clartés : chaque Hallucination qui le touche en ôte une, il
// recule, clignote et reste intouchable une seconde. À zéro, il reprend ses
// esprits à la porte du village (onDeath, main.js).
//
// Ce qui se voit : la pose du coup sur la planche du héros (ATTACK_FRAME),
// l'épée qui tourne autour de sa poignée (gfx/weapon.js) et la lame de lumière.

import * as THREE from 'three';
import { ATTACK_FRAME } from '../gfx/sprites.js';
import { HERO_COMBAT, SWORDS } from '../data/enemies.js';

// Les trois coups : durée, fenêtre où la lame porte (de... à...), fente en
// avant, portée, facteur de dégâts, taille de la lame de lumière.
const HITS = [
  { duration: 0.3, from: 0.06, to: 0.17, lunge: 0.15, reach: 1.5, factor: 1, scale: 1.5 },
  { duration: 0.3, from: 0.06, to: 0.17, lunge: 0.15, reach: 1.5, factor: 1, scale: 1.5 },
  { duration: 0.44, from: 0.1, to: 0.26, lunge: 0.55, reach: 1.9, factor: 2, scale: 2.1 },
];
const QUEUE_FROM = 0.1; // à partir de quand un appui prépare le coup suivant
const COOLDOWN = 0.28; // après le troisième coup
const ARC = Math.PI * 0.42; // demi-angle de la lame, devant le héros
const BLINK_PERIOD = 0.09;
const HAND_HEIGHT = 0.72; // la poignée, au-dessus des pieds
const SWORD_LAYER = 0.07; // devant ou derrière le héros, selon la vue
const REST_ANGLE = 0.35; // l'épée au repos, un peu inclinée

// Pour chaque direction : où est la main (dx, dz), l'épée est-elle devant le
// corps, et le balayage du coup (angle de départ, angle d'arrivée), en
// radians, 0 étant la lame vers le haut de l'écran, positif vers la droite.
const VIEWS = {
  down: { hand: [0.26, 0], front: true, swing: [-1.9, 1.9], rest: 0.3 },
  up: { hand: [-0.24, 0], front: false, swing: [-1.2, 1.2], rest: -0.3 },
  left: { hand: [-0.2, 0], front: true, swing: [0.5, -2.6], rest: -0.5 },
  right: { hand: [0.2, 0], front: true, swing: [-0.5, 2.6], rest: 0.5 },
};
const FACING_VECTOR = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

// player : le héros (position, facing, shove, setVisible, worldPosition) ;
// sword, slash : gfx/weapon.js ; state : l'état de partie (epee) ; hud : la
// pastille des clartés (élément #clartes) ; texts : textesInterface.combat ;
// onDeath() : plus de clartés ; canFight() : on est quelque part où l'on se bat.
export function createCombat({ player, sword, slash, state, hud, texts, onDeath, canFight }) {
  let clartes = HERO_COMBAT.clartes;
  let invulnerable = 0;
  let blink = 0;
  let attack = null; // { hit, t, queued, struck: Set, lunged }
  let cooldown = 0;
  let enemies = null; // le groupe d'Hallucinations du lieu, ou null
  let requested = false;
  const point = new THREE.Vector3();
  const hearts = [...hud.querySelectorAll('.clarte')];
  hud.setAttribute('aria-label', texts.clartes);

  function renderHud() {
    hearts.forEach((heart, i) => heart.classList.toggle('perdue', i >= clartes));
    hud.dataset.alerte = clartes <= 1 ? 'oui' : 'non';
  }
  renderHud();

  const swordLevel = () => state.epee ?? 0;
  const swordDamage = () => SWORDS.find((s) => s.niveau === swordLevel())?.degats ?? 0;
  const hasSword = () => swordLevel() > 0;

  function startHit(index) {
    attack = { hit: index, t: 0, queued: false, struck: new Set(), slashed: false };
  }

  // Place l'épée et, au bon moment, lance la lame et porte le coup.
  function animate(dt) {
    const view = VIEWS[player.facing];
    const base = player.worldPosition(point);
    const dz = view.front ? SWORD_LAYER : -SWORD_LAYER;
    if (!attack) {
      if (hasSword() && canFight()) {
        sword.setPose({ x: base.x + view.hand[0], y: base.y + HAND_HEIGHT, z: base.z + dz, angle: view.rest, mirror: false });
      } else sword.hide();
      return;
    }
    const spec = HITS[attack.hit];
    attack.t += dt;
    const progress = Math.min(1, attack.t / spec.duration);
    const mirror = attack.hit === 1; // le deuxième coup revient de l'autre côté
    const [a0, a1] = view.swing;
    const angle = (mirror ? a1 : a0) + ((mirror ? a0 : a1) - (mirror ? a1 : a0)) * easeOut(progress);
    sword.setPose({ x: base.x + view.hand[0], y: base.y + HAND_HEIGHT, z: base.z + dz, angle, mirror: false });

    // La fente : une avance vers l'avant pendant la fenêtre active.
    if (attack.t >= spec.from && attack.t <= spec.to) {
      const [fx, fz] = FACING_VECTOR[player.facing];
      const step = (spec.lunge / (spec.to - spec.from)) * dt;
      player.shove(fx * step, fz * step);
    }
    if (attack.t >= spec.from && !attack.slashed) {
      attack.slashed = true;
      const [fx, fz] = FACING_VECTOR[player.facing];
      slash.play({
        x: base.x + fx * 0.75, y: base.y + 0.7, z: base.z + fz * 0.75 + (player.facing === 'up' ? -0.2 : 0.2),
        angle: player.facing === 'down' ? Math.PI : player.facing === 'left' ? -Math.PI / 2 : player.facing === 'right' ? Math.PI / 2 : 0,
        scale: spec.scale,
      });
      strike(spec);
    }
    if (attack.t >= spec.duration) {
      if (attack.queued && attack.hit < HITS.length - 1) startHit(attack.hit + 1);
      else {
        attack = null;
        cooldown = COOLDOWN;
      }
    }
  }

  // Les Hallucinations devant le héros, à portée, prennent le coup.
  function strike(spec) {
    if (!enemies) return;
    const [fx, fz] = FACING_VECTOR[player.facing];
    const damage = swordDamage() * spec.factor;
    for (const enemy of enemies.alive) {
      if (attack.struck.has(enemy)) continue;
      const dx = enemy.position.x - player.position.x;
      const dz = enemy.position.z - player.position.z;
      const d = Math.hypot(dx, dz);
      if (d > spec.reach) continue;
      const cos = (dx * fx + dz * fz) / (d || 1);
      if (cos < Math.cos(ARC) && d > 0.45) continue;
      attack.struck.add(enemy);
      enemies.hit(enemy, damage, player.position.x, player.position.z);
    }
  }

  return {
    // Le groupe d'Hallucinations du lieu où l'on est (null ailleurs).
    setEnemies(group) {
      enemies = group;
    },
    // Un appui sur la touche ou le bouton d'attaque.
    request() {
      requested = true;
    },
    get isAttacking() {
      return attack !== null;
    },
    get clartes() {
      return clartes;
    },
    get maxClartes() {
      return HERO_COMBAT.clartes;
    },
    get hasSword() {
      return hasSword();
    },
    // Le héros reprend toutes ses clartés (au réveil à la porte).
    restore() {
      clartes = HERO_COMBAT.clartes;
      invulnerable = 0;
      player.setVisible(true);
      renderHud();
    },
    setClartes(n) {
      clartes = Math.max(0, Math.min(HERO_COMBAT.clartes, n));
      renderHud();
    },
    // Une Hallucination touche le héros : une clarté de moins, un recul, une
    // seconde d'invulnérabilité ; à zéro, onDeath.
    takeHit(enemy) {
      if (invulnerable > 0 || clartes <= 0) return;
      clartes -= enemy.type.degats;
      invulnerable = HERO_COMBAT.invulnerable;
      blink = 0;
      const dx = player.position.x - enemy.position.x;
      const dz = player.position.z - enemy.position.z;
      const d = Math.hypot(dx, dz) || 1;
      player.shove((dx / d) * HERO_COMBAT.recul * 0.5, (dz / d) * HERO_COMBAT.recul * 0.5);
      attack = null;
      renderHud();
      if (clartes <= 0) {
        clartes = 0;
        onDeath();
      }
    },
    // dt : temps de l'image ; frozen : le jeu est suspendu (dialogue, écran).
    update(dt, frozen) {
      slash.update(dt);
      if (invulnerable > 0) {
        invulnerable -= dt;
        blink += dt;
        player.setVisible(invulnerable <= 0 || Math.floor(blink / BLINK_PERIOD) % 2 === 0);
      }
      if (cooldown > 0) cooldown -= dt;
      // La pastille des clartés apparaît avec la première épée.
      if (hud.hidden === hasSword()) hud.hidden = !hasSword();
      const wanted = requested;
      requested = false;
      if (frozen) {
        attack = null;
        sword.hide();
        return;
      }
      if (wanted && hasSword() && canFight()) {
        if (!attack && cooldown <= 0) startHit(0);
        else if (attack && attack.t >= QUEUE_FROM) attack.queued = true;
      }
      animate(dt);
    },
    // La colonne de la planche à montrer : la pose du coup pendant un coup.
    get frame() {
      return attack ? ATTACK_FRAME : null;
    },
  };
}

const easeOut = (t) => 1 - (1 - t) * (1 - t);
