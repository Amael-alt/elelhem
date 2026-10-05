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
    // Dans un champ de saisie (le prénom), les touches écrivent ; sur un bouton
    // qui a le focus (ceux du diplôme), Entrée et Espace l'activent : on n'y
    // touche pas.
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
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

// Joystick flottant, version minimale (étape 1f) : on pose le pouce dans la
// moitié gauche de l'écran, le stick apparaît là, et glisser donne la
// direction. Rayon 64 px, zone morte 13 %, un seul doigt. Si le doigt dépasse
// le rayon, le centre le suit : on n'a jamais à revenir en arrière. Souris
// exclue (le clavier suffit au bureau), toucher et stylet seulement.
// Le bouton d'action et l'option main gauche viennent à l'étape 4.
const STICK_RADIUS = 64;
const STICK_DEAD_ZONE = 0.13;

export function createFloatingStick(canvas, element) {
  const knob = element.querySelector('.stick-bille');
  let pointerId = null;
  const center = { x: 0, y: 0 };
  const vector = { x: 0, z: 0 };

  function place(x, y) {
    element.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  function release() {
    pointerId = null;
    vector.x = 0;
    vector.z = 0;
    element.hidden = true;
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (pointerId !== null || event.pointerType === 'mouse') return;
    if (event.clientX > window.innerWidth / 2) return;
    pointerId = event.pointerId;
    try {
      canvas.setPointerCapture(pointerId);
    } catch {
      // Pointeur déjà fini (événement rejoué) : le stick marche sans capture.
    }
    center.x = event.clientX;
    center.y = event.clientY;
    place(center.x, center.y);
    knob.style.transform = 'translate(0px, 0px)';
    element.hidden = false;
    event.preventDefault();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    let dx = event.clientX - center.x;
    let dy = event.clientY - center.y;
    const distance = Math.hypot(dx, dy);
    if (distance > STICK_RADIUS) {
      // Le centre suit le doigt : le stick reste tendu au maximum.
      const over = (distance - STICK_RADIUS) / distance;
      center.x += dx * over;
      center.y += dy * over;
      place(center.x, center.y);
      dx = event.clientX - center.x;
      dy = event.clientY - center.y;
    }
    knob.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px)`;
    const length = Math.hypot(dx, dy);
    const strength = Math.min(1, length / STICK_RADIUS);
    if (strength < STICK_DEAD_ZONE) {
      vector.x = 0;
      vector.z = 0;
    } else {
      vector.x = (dx / length) * strength;
      vector.z = (dy / length) * strength;
    }
  });

  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(type, (event) => {
      if (event.pointerId === pointerId) release();
    });
  }
  window.addEventListener('blur', release);

  return {
    // Direction voulue, longueur 1 au plus, nulle au repos.
    direction: () => vector,
    get active() {
      return pointerId !== null;
    },
  };
}
