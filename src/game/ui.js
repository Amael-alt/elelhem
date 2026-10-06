// L'indicateur d'interaction : une bulle au-dessus de la tête de l'habitant à
// portée. On la touche (ou on clique) pour parler, ou on appuie sur la touche
// d'action ou sur le bouton d'action des écrans tactiles. Du DOM, pas du
// canvas : cibles tactiles de 44 pixels au moins, nettes à toute résolution.

import * as THREE from 'three';
import { onTap } from '../core/input.js';

const point = new THREE.Vector3();

// Position à l'écran, en pixels CSS depuis le coin haut gauche du canvas, d'un
// point du monde. Renvoie null s'il est derrière la caméra.
export function projectToScreen(worldPoint, camera, canvas, out = { x: 0, y: 0 }) {
  point.copy(worldPoint).project(camera);
  if (point.z > 1) return null;
  out.x = (point.x * 0.5 + 0.5) * canvas.clientWidth;
  out.y = (0.5 - point.y * 0.5) * canvas.clientHeight;
  return out;
}

// L'étiquette de nom : un petit panneau au-dessus de la tête de l'habitant
// qui approche. lift : décalage vers le haut en pixels, pour passer au-dessus
// de la bulle quand elle est là.
export function createNameLabel(element) {
  let shown = false;
  let text = '';
  return {
    show(screen, name, lift) {
      if (!shown) {
        shown = true;
        element.hidden = false;
      }
      if (text !== name) {
        text = name;
        element.textContent = name;
      }
      element.style.transform = `translate(${Math.round(screen.x)}px, ${Math.round(screen.y - lift)}px)`;
    },
    hide() {
      if (!shown) return;
      shown = false;
      element.hidden = true;
    },
  };
}

// element : le bouton #indice ; onActivate : appelé au toucher ou au clic.
export function createInteractionHint(element, onActivate) {
  let shown = false;
  onTap(element, () => {
    element.blur(); // les touches Espace et Entrée ne doivent plus viser le bouton
    onActivate();
  });
  return {
    get isShown() {
      return shown;
    },
    // screen : { x, y } du point d'ancrage ; label : texte pour lecteur d'écran.
    show(screen, label) {
      if (!shown) {
        shown = true;
        element.hidden = false;
      }
      if (element.getAttribute('aria-label') !== label) element.setAttribute('aria-label', label);
      element.style.transform = `translate(${Math.round(screen.x)}px, ${Math.round(screen.y)}px)`;
    },
    hide() {
      if (!shown) return;
      shown = false;
      element.hidden = true;
    },
  };
}

// Le bouton d'action des écrans tactiles (étape 4) : rond, en bas à droite (à
// gauche pour jouer de la main gauche), sous le pouce qui ne tient pas le
// joystick. Son pictogramme dit ce qu'il fera : une étincelle au repos, une
// bulle quand un habitant est à portée. Il se cache pendant une conversation :
// la boîte de dialogue, en bas, se touche elle-même pour avancer.
// Il agit dès que le doigt se pose, comme un bouton de manette ; le click ne
// sert qu'à un lecteur d'écran.
export function createActionButton(element, onActivate) {
  let shown = false;
  let mode = '';
  element.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault(); // pas de focus, pas d'événements de souris rejoués
    onActivate();
  });
  element.addEventListener('click', (event) => {
    if (event.detail === 0) onActivate();
  });
  return {
    // mode : 'repos' ou 'parler' ; label : texte pour lecteur d'écran.
    show(newMode, label) {
      if (!shown) {
        shown = true;
        element.hidden = false;
      }
      if (mode !== newMode) {
        mode = newMode;
        element.dataset.mode = newMode;
      }
      if (element.getAttribute('aria-label') !== label) element.setAttribute('aria-label', label);
    },
    hide() {
      if (!shown) return;
      shown = false;
      element.hidden = true;
    },
    get mode() {
      return shown ? mode : null;
    },
  };
}
