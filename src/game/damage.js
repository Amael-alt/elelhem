// Les chiffres de dégâts (version 2.6) : à chaque coup qui porte, le nombre
// de points ôtés apparaît au-dessus de la cible puis s'efface. Du DOM, posé
// sur le canvas par projection (game/ui.js) : net à toute résolution, et la
// police du jeu.
//
// Version 2.8 : le chiffre jaillit (une impulsion vers le haut), retombe sur
// sa ligne et rebondit une fois, puis s'efface ; sa taille grandit avec les
// dégâts. Un coup critique (le troisième de l'enchaînement) est plus grand,
// jaune, et porte sa mention ; un coup reçu par le héros est rouge
// (styles.css, .degat-recu).

import * as THREE from 'three';
import { projectToScreen } from './ui.js';

const LIFE_SECONDS = 1.15; // durée de vie d'un chiffre
const IMPULSE = 150; // vitesse de départ vers le haut, en pixels CSS par seconde
const GRAVITY = 640; // pixels par seconde carrée
const BOUNCE = 0.38; // part de la vitesse rendue au rebond
const BASE_REM = 1.3; // taille d'un dégât de 1
const GROWTH = 0.14; // de plus par point de dégât, jusqu'à GROWTH_MAX
const GROWTH_MAX = 1.0;
const MAX_SHOWN = 12; // au-delà, les plus anciens disparaissent

// container : #degats ; camera, canvas : pour la projection ; texts :
// textesInterface.combat.degats ({ critique }).
export function createDamageNumbers(container, { camera, canvas, texts }) {
  const shown = []; // { element, point, age, drift, lift, velocity, bounced }
  const screen = { x: 0, y: 0 };

  // point : { x, y, z } dans le monde ; amount : points ôtés ; kind :
  // 'inflige' (sur une Hallucination), 'critique', ou 'recu' (le héros).
  function show(point, amount, kind = 'inflige') {
    const element = document.createElement('span');
    element.className = `degat degat-${kind}`;
    element.textContent = kind === 'recu' ? `-${amount}` : String(amount);
    const growth = Math.min(GROWTH_MAX, GROWTH * Math.max(0, amount - 1));
    element.style.fontSize = `${(BASE_REM * (1 + growth) * (kind === 'critique' ? 1.5 : 1)).toFixed(2)}rem`;
    if (kind === 'critique') {
      const label = document.createElement('small');
      label.textContent = texts.critique;
      element.append(label);
    }
    container.append(element);
    // Un léger écart de côté, pour que deux chiffres d'affilée ne se couvrent pas.
    const drift = (shown.length % 3 - 1) * 14;
    shown.push({
      element, point: new THREE.Vector3(point.x, point.y, point.z), age: 0, drift,
      lift: 0, velocity: IMPULSE * (kind === 'critique' ? 1.25 : 1), bounced: false,
    });
    while (shown.length > MAX_SHOWN) shown.shift().element.remove();
  }

  return {
    show,
    update(dt) {
      for (let i = shown.length - 1; i >= 0; i -= 1) {
        const item = shown[i];
        item.age += dt;
        if (item.age >= LIFE_SECONDS) {
          item.element.remove();
          shown.splice(i, 1);
          continue;
        }
        // Le jaillissement : monte, retombe, rebondit une fois sur sa ligne.
        item.velocity -= GRAVITY * dt;
        item.lift += item.velocity * dt;
        if (item.lift < 0) {
          item.lift = 0;
          if (!item.bounced) {
            item.bounced = true;
            item.velocity = -item.velocity * BOUNCE;
          } else item.velocity = 0;
        }
        const at = projectToScreen(item.point, camera, canvas, screen);
        if (!at) {
          item.element.style.opacity = '0';
          continue;
        }
        item.element.style.transform = `translate(${Math.round(at.x + item.drift)}px, ${Math.round(at.y - item.lift)}px)`;
        const progress = item.age / LIFE_SECONDS;
        item.element.style.opacity = progress < 0.65 ? '1' : String(1 - (progress - 0.65) / 0.35);
      }
    },
    // Tout effacer (changement de lieu).
    clear() {
      for (const item of shown) item.element.remove();
      shown.length = 0;
    },
    get count() {
      return shown.length;
    },
  };
}
