// L'indicateur d'interaction : une bulle au-dessus de la tête de l'habitant à
// portée. On la touche (ou on clique) pour parler, ou on appuie sur la touche
// d'action. Du DOM, pas du canvas : cible tactile de 44 pixels, nette à toute
// résolution.

import * as THREE from 'three';

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
  element.addEventListener('click', () => {
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
