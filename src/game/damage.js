// Les chiffres de dégâts (version 2.6) : à chaque coup qui porte, le nombre
// de points ôtés s'élève au-dessus de la cible puis s'efface. Du DOM, posé
// sur le canvas par projection (game/ui.js) : net à toute résolution, et la
// police du jeu. Un coup critique (le troisième de l'enchaînement) est plus
// grand et porte sa mention ; un coup reçu par le héros est d'une autre
// couleur (styles.css, .degat-recu).

import * as THREE from 'three';
import { projectToScreen } from './ui.js';

const LIFE_SECONDS = 0.95; // durée de vie d'un chiffre
const RISE_PIXELS = 46; // de combien il monte, en pixels CSS
const MAX_SHOWN = 12; // au-delà, les plus anciens disparaissent

// container : #degats ; camera, canvas : pour la projection ; texts :
// textesInterface.combat.degats ({ critique }).
export function createDamageNumbers(container, { camera, canvas, texts }) {
  const shown = []; // { element, point, age, drift }
  const screen = { x: 0, y: 0 };

  // point : { x, y, z } dans le monde ; amount : points ôtés ; kind :
  // 'inflige' (sur une Hallucination), 'critique', ou 'recu' (le héros).
  function show(point, amount, kind = 'inflige') {
    const element = document.createElement('span');
    element.className = `degat degat-${kind}`;
    element.textContent = kind === 'recu' ? `-${amount}` : String(amount);
    if (kind === 'critique') {
      const label = document.createElement('small');
      label.textContent = texts.critique;
      element.append(label);
    }
    container.append(element);
    // Un léger écart de côté, pour que deux chiffres d'affilée ne se couvrent pas.
    const drift = (shown.length % 3 - 1) * 14;
    shown.push({ element, point: new THREE.Vector3(point.x, point.y, point.z), age: 0, drift });
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
        const progress = item.age / LIFE_SECONDS;
        const at = projectToScreen(item.point, camera, canvas, screen);
        if (!at) {
          item.element.style.opacity = '0';
          continue;
        }
        const rise = RISE_PIXELS * (1 - (1 - progress) * (1 - progress));
        item.element.style.transform = `translate(${Math.round(at.x + item.drift)}px, ${Math.round(at.y - rise)}px)`;
        item.element.style.opacity = progress < 0.6 ? '1' : String(1 - (progress - 0.6) / 0.4);
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
