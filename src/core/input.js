// Entrées du joueur. Pour l'instant, seulement la porte de chargement.
//
// Pendant les premières images, le navigateur compile les shaders et envoie
// les textures : la page peut se figer une fraction de seconde. Une touche
// enfoncée ou un doigt posé pendant ce temps arriverait en retard et ferait
// partir le héros tout seul. La porte avale donc toutes les entrées, en phase
// de capture sur window (avant tout autre écouteur), jusqu'à ce qu'un nombre
// d'images donné ait été rendu.

const GATED_EVENTS = [
  'keydown', 'keyup',
  'pointerdown', 'pointermove', 'pointerup', 'pointercancel',
  'touchstart', 'touchmove', 'touchend', 'touchcancel',
  'mousedown', 'mousemove', 'mouseup', 'click', 'dblclick',
  'wheel', 'contextmenu',
];

const CAPTURE = { capture: true };

export function createLoadGate(framesToWait) {
  let remaining = framesToWait;

  // On coupe seulement la propagation, sans preventDefault : les raccourcis du
  // navigateur (recharger, quitter l'onglet) restent utilisables pendant le
  // chargement.
  const swallow = (event) => event.stopImmediatePropagation();

  for (const type of GATED_EVENTS) window.addEventListener(type, swallow, CAPTURE);

  return {
    get isOpen() {
      return remaining <= 0;
    },
    frameRendered() {
      if (remaining <= 0) return;
      remaining -= 1;
      if (remaining > 0) return;
      for (const type of GATED_EVENTS) window.removeEventListener(type, swallow, CAPTURE);
    },
  };
}
