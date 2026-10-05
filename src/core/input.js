// Entrées du joueur : porte de chargement, clavier (déplacement, action), molette.
//
// Porte de chargement. Pendant les premières images, le navigateur compile les
// shaders et envoie les textures : la page peut se figer une fraction de
// seconde. Une touche enfoncée ou un doigt posé pendant ce temps arriverait en
// retard et ferait partir le héros tout seul. La porte avale donc toutes les
// entrées, en phase de capture sur window (avant tout autre écouteur), jusqu'à
// ce qu'un nombre d'images donné ait été rendu.

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

// Clavier. On lit event.code, la position physique de la touche, et non la
// lettre : les touches KeyW, KeyA, KeyS, KeyD sont ZQSD sur un clavier AZERTY
// et WASD sur un QWERTY, sans rien détecter. Les flèches marchent partout.
// Nord = -z (vers le haut de l'écran), est = +x.
const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

// Action (parler, passer une page) : E, Entrée ou Espace. Annuler : Échap.
const ACTION_KEYS = new Set(['KeyE', 'Enter', 'NumpadEnter', 'Space']);
const CANCEL_KEYS = new Set(['Escape']);

export function createKeyboard() {
  const pressed = new Set();
  let zoomSteps = 0;
  let action = false;
  let cancel = false;

  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (ACTION_KEYS.has(event.code) || CANCEL_KEYS.has(event.code)) {
      // Une touche maintenue répète keydown : une seule action par appui.
      if (!event.repeat) {
        if (ACTION_KEYS.has(event.code)) action = true;
        else cancel = true;
      }
      event.preventDefault();
      return;
    }
    if (!MOVE_KEYS[event.code]) return;
    pressed.add(event.code);
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => pressed.delete(event.code));

  // Une touche relâchée hors de la page n'envoie pas de keyup : on oublie tout
  // quand la page perd le focus.
  window.addEventListener('blur', () => pressed.clear());
  document.addEventListener('visibilitychange', () => pressed.clear());

  window.addEventListener('wheel', (event) => {
    zoomSteps += Math.sign(event.deltaY);
    event.preventDefault();
  }, { passive: false });

  return {
    // Direction voulue, longueur 1 au plus (la diagonale ne va pas plus vite).
    direction() {
      let x = 0;
      let z = 0;
      for (const code of pressed) {
        x += MOVE_KEYS[code][0];
        z += MOVE_KEYS[code][1];
      }
      const length = Math.hypot(x, z);
      return length > 0 ? { x: x / length, z: z / length } : { x: 0, z: 0 };
    },
    // Vrai une fois par appui sur une touche d'action, puis faux jusqu'au suivant.
    takeAction() {
      const pressedNow = action;
      action = false;
      return pressedNow;
    },
    takeCancel() {
      const pressedNow = cancel;
      cancel = false;
      return pressedNow;
    },
    // Crans de molette depuis la dernière lecture (positif : on s'éloigne).
    takeZoomSteps() {
      const steps = zoomSteps;
      zoomSteps = 0;
      return steps;
    },
  };
}
