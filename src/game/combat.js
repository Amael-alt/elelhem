// Le combat en temps réel : un coup d'épée à la touche (J, X, un clic, ou le
// bouton épée sur écran tactile), trois coups qui s'enchaînent si l'on appuie
// pendant le coup en cours, le troisième plus fort et plus long, avec une fente.
// Le héros a cinq clartés : chaque Hallucination qui le touche en ôte une, il
// recule, clignote et reste intouchable une seconde. À zéro, il reprend ses
// esprits à la porte du village (onDeath, main.js).
//
// Ce qui se voit : sur la planche du héros, l'élan puis la frappe de chaque
// coup (STRIKE_FRAMES, dessinés d'après des fiches depuis la version 2.1), la
// lame de lumière, et, pour une tenue qui n'a pas ses poses dessinées, l'épée
// qui tourne autour de sa poignée (gfx/weapon.js).

import * as THREE from 'three';
import { cardinalOf, STRIKE_FRAMES } from '../gfx/sprites.js';
import { HERO_COMBAT, SWORDS } from '../data/enemies.js';

// Les trois coups : durée, fenêtre où la lame porte (de... à...), fente en
// avant, portée, facteur de dégâts, taille de la lame de lumière. Jusqu'à
// `from`, la planche montre l'élan ; ensuite, la frappe.
const HITS = [
  { duration: 0.32, from: 0.09, to: 0.2, lunge: 0.15, reach: 1.5, factor: 1, scale: 1.5 },
  { duration: 0.32, from: 0.09, to: 0.2, lunge: 0.15, reach: 1.5, factor: 1, scale: 1.5 },
  { duration: 0.5, from: 0.14, to: 0.3, lunge: 0.55, reach: 1.9, factor: 2, scale: 2.1 },
];
const QUEUE_FROM = 0.1; // à partir de quand un appui prépare le coup suivant
const COOLDOWN = 0.28; // après le troisième coup
const ARC = Math.PI * 0.42; // demi-angle de la lame, devant le héros
const BLINK_PERIOD = 0.09;
const HAND_HEIGHT = 0.5; // la poignée, au-dessus des pieds (héros de 1,1 unité depuis la version 2.5)
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
// onDeath() : plus de clartés ; onEmpty() : appelé juste avant, vrai si quelque
// chose a sauvé le héros (une fiole de réserve bue, game/spots.js) ;
// canFight() : on est quelque part où l'on se bat ; dummies() : les mannequins
// à portée de coups (points { x, z }, version 2.3) et onDummy(dummy) quand l'un
// d'eux est touché ; onStrike() : un coup part.
// impacts : les éclats d'impact (gfx/weapon.js, version 2.5), facultatif.
// onDamage(target, amount, kind) : un coup a porté (version 2.6, les chiffres
// de dégâts) ; target : l'Hallucination touchée, ou null pour le héros ;
// kind : 'inflige', 'critique' (le troisième coup) ou 'recu'.
export function createCombat({ player, sword, slash, impacts = null, state, hud, texts, onDeath, canFight, onEmpty = () => false, dummies = () => [], onDummy = () => {}, onStrike = () => {}, onDamage = () => {} }) {
  let clartes = HERO_COMBAT.clartes;
  let invulnerable = 0;
  let blink = 0;
  let attack = null; // { hit, t, queued, struck: Set, lunged }
  let cooldown = 0;
  let enemies = null; // le groupe d'Hallucinations du lieu, ou null
  let requested = false;
  let drawnSword = false; // la planche du héros dessine déjà l'épée : pas de sprite à part
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
    // Les coups sont dessinés dans quatre directions : sur une diagonale, le
    // héros se tourne d'abord vers le côté le plus proche (version 2.5).
    if (cardinalOf(player.facing) !== player.facing) player.face(cardinalOf(player.facing));
    attack = { hit: index, t: 0, queued: false, struck: new Set(), slashed: false };
    onStrike();
  }

  // Place l'épée (si la planche ne la dessine pas) et, au bon moment, lance
  // la lame et porte le coup.
  function animate(dt) {
    const facing = cardinalOf(player.facing);
    const view = VIEWS[facing];
    const base = player.worldPosition(point);
    const dz = view.front ? SWORD_LAYER : -SWORD_LAYER;
    if (!attack) {
      if (hasSword() && canFight() && !drawnSword) {
        sword.setPose({ x: base.x + view.hand[0], y: base.y + HAND_HEIGHT, z: base.z + dz, angle: view.rest, mirror: false });
      } else sword.hide();
      return;
    }
    const spec = HITS[attack.hit];
    attack.t += dt;
    if (drawnSword) sword.hide();
    else {
      const progress = Math.min(1, attack.t / spec.duration);
      const mirror = attack.hit === 1; // le deuxième coup revient de l'autre côté
      const [a0, a1] = view.swing;
      const angle = (mirror ? a1 : a0) + ((mirror ? a0 : a1) - (mirror ? a1 : a0)) * easeOut(progress);
      sword.setPose({ x: base.x + view.hand[0], y: base.y + HAND_HEIGHT, z: base.z + dz, angle, mirror: false });
    }

    // La fente : une avance vers l'avant pendant la fenêtre active.
    if (attack.t >= spec.from && attack.t <= spec.to) {
      const [fx, fz] = FACING_VECTOR[facing];
      const step = (spec.lunge / (spec.to - spec.from)) * dt;
      player.shove(fx * step, fz * step);
    }
    if (attack.t >= spec.from && !attack.slashed) {
      attack.slashed = true;
      const [fx, fz] = FACING_VECTOR[facing];
      slash.play({
        x: base.x + fx * 0.6, y: base.y + 0.5, z: base.z + fz * 0.6 + (facing === 'up' ? -0.2 : 0.2),
        angle: facing === 'down' ? Math.PI : facing === 'left' ? -Math.PI / 2 : facing === 'right' ? Math.PI / 2 : 0,
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

  // Devant le héros, à portée : (dx, dz) vers la cible, vrai si la lame porte.
  function inReach(dx, dz, spec) {
    const [fx, fz] = FACING_VECTOR[cardinalOf(player.facing)];
    const d = Math.hypot(dx, dz);
    if (d > spec.reach) return false;
    const cos = (dx * fx + dz * fz) / (d || 1);
    return !(cos < Math.cos(ARC) && d > 0.45);
  }

  // L'éclat d'impact sur la cible, un peu vers le héros et à mi-hauteur ; plus
  // grand au troisième coup.
  function burst(x, z, spec) {
    if (!impacts) return;
    const dx = player.position.x - x;
    const dz = player.position.z - z;
    const d = Math.hypot(dx, dz) || 1;
    impacts.play({ x: x + (dx / d) * 0.2, y: player.worldPosition(point).y + 0.55, z: z + (dz / d) * 0.2 + 0.1, scale: 0.85 * spec.scale });
  }

  // Les Hallucinations devant le héros, à portée, prennent le coup ; les
  // mannequins de l'enclos aussi, pour le défi.
  function strike(spec) {
    for (const dummy of dummies()) {
      if (attack.struck.has(dummy)) continue;
      if (!inReach(dummy.x - player.position.x, dummy.z - player.position.z, spec)) continue;
      attack.struck.add(dummy);
      burst(dummy.x, dummy.z, spec);
      onDummy(dummy);
    }
    if (!enemies) return;
    const [fx, fz] = FACING_VECTOR[cardinalOf(player.facing)];
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
      burst(enemy.position.x, enemy.position.z, spec);
      enemies.hit(enemy, damage, player.position.x, player.position.z);
      // Le troisième coup est toujours critique : ses dégâts sont doublés (factor).
      onDamage(enemy, damage, attack.hit === HITS.length - 1 ? 'critique' : 'inflige');
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
    // Pour les tests : l'épée est-elle dessinée en ce moment (à part, ou sur la planche) ?
    get swordVisible() {
      return sword.visible || (drawnSword && hasSword() && canFight());
    },
    // La planche du héros porte ses propres vues l'épée à la main (gfx/sprites.js,
    // `armed`) : le sprite d'épée à part ne sert plus.
    setDrawnSword(on) {
      drawnSword = Boolean(on);
      if (drawnSword) sword.hide();
    },
    // Le héros tient-il son épée en ce moment : sur la lande, armé.
    get armed() {
      return hasSword() && canFight();
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
    // Une potion ramassée : n clartés de retour, jamais au-delà du plein.
    // Renvoie vrai si quelque chose a été rendu.
    heal(n = 1) {
      if (clartes >= HERO_COMBAT.clartes) return false;
      clartes = Math.min(HERO_COMBAT.clartes, clartes + n);
      renderHud();
      return true;
    },
    // Part des clartés qui restent, de 0 à 1 (la barre sous le héros).
    get ratio() {
      return clartes / HERO_COMBAT.clartes;
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
      onDamage(null, enemy.type.degats, 'recu');
      if (clartes <= 0) {
        clartes = 0;
        // Une fiole de réserve, bue d'elle-même : le héros reste debout.
        if (onEmpty()) {
          clartes = HERO_COMBAT.clartes;
          invulnerable = HERO_COMBAT.invulnerable * 2;
          renderHud();
          return;
        }
        onDeath();
      }
    },
    // dt : temps de l'image ; frozen : le jeu est suspendu (dialogue, écran).
    update(dt, frozen) {
      slash.update(dt);
      impacts?.update(dt);
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
    // La colonne de la planche à montrer pendant un coup : l'élan, puis la
    // frappe dès que la lame porte.
    get frame() {
      if (!attack) return null;
      return STRIKE_FRAMES[attack.hit][attack.t < HITS[attack.hit].from ? 0 : 1];
    },
  };
}

const easeOut = (t) => 1 - (1 - t) * (1 - t);
