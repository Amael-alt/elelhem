// Entrées du joueur : porte de chargement, clavier (déplacement, course,
// action), molette, toucher des boutons, joystick et pincement.
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
// Courir : Maj maintenue, comme le joystick poussé à fond.
const ACTION_KEYS = new Set(['KeyE', 'Enter', 'NumpadEnter', 'Space']);
const CANCEL_KEYS = new Set(['Escape']);
const RUN_KEYS = new Set(['ShiftLeft', 'ShiftRight']);
// Touches qui comptent une fois par appui, lues par takeKey : frapper (J ou
// X), ouvrir la feuille de personnage (F).
const ONCE_KEYS = new Set(['KeyJ', 'KeyX', 'KeyF']);

// La course : le héros va RUN_FACTOR fois plus vite qu'à la marche. Les
// entrées renvoient une direction de longueur RUN_FACTOR au plus, le héros
// (game/player.js) multiplie sa vitesse par cette longueur.
export const RUN_FACTOR = 1.6;

export function createKeyboard() {
  const pressed = new Set();
  const running = new Set();
  let zoomSteps = 0;
  let action = false;
  let cancel = false;
  const once = new Set();

  window.addEventListener('keydown', (event) => {
    if (RUN_KEYS.has(event.code)) running.add(event.code);
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
    if (ONCE_KEYS.has(event.code)) {
      if (!event.repeat) once.add(event.code);
      event.preventDefault();
      return;
    }
    if (!MOVE_KEYS[event.code]) return;
    pressed.add(event.code);
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    pressed.delete(event.code);
    running.delete(event.code);
  });

  // Une touche relâchée hors de la page n'envoie pas de keyup : on oublie tout
  // quand la page perd le focus.
  const forget = () => {
    pressed.clear();
    running.clear();
  };
  window.addEventListener('blur', forget);
  document.addEventListener('visibilitychange', forget);

  window.addEventListener('wheel', (event) => {
    zoomSteps += Math.sign(event.deltaY);
    event.preventDefault();
  }, { passive: false });

  return {
    // Direction voulue, de longueur 1 (RUN_FACTOR en courant) ; la diagonale
    // ne va pas plus vite.
    direction() {
      let x = 0;
      let z = 0;
      for (const code of pressed) {
        x += MOVE_KEYS[code][0];
        z += MOVE_KEYS[code][1];
      }
      const length = Math.hypot(x, z);
      if (length === 0) return { x: 0, z: 0 };
      const speed = running.size > 0 ? RUN_FACTOR : 1;
      return { x: (x / length) * speed, z: (z / length) * speed };
    },
    // Vrai une fois par appui sur l'une des touches données (codes physiques).
    takeKey(...codes) {
      let hit = false;
      for (const code of codes) if (once.delete(code)) hit = true;
      return hit;
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

// Un toucher sur un bouton du jeu. Le navigateur d'un téléphone ne fabrique
// pas de « click » pour un doigt qui touche l'écran pendant qu'un autre y est
// déjà posé : en paysage, le pouce gauche tient le joystick pendant que le
// droit touche le bouton d'action ou la minimap. On écoute donc pointerdown
// puis pointerup, qui arrivent pour chaque doigt, et le toucher compte si le
// doigt est relevé au-dessus de l'élément. Le click ne sert plus qu'aux
// activations sans pointeur (clavier, lecteur d'écran : detail vaut 0).
// handler(element touché) reçoit l'élément sous le doigt.
export function onTap(element, handler) {
  let pointerId = null;
  element.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerId = event.pointerId;
  });
  element.addEventListener('pointerup', (event) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    const under = document.elementFromPoint(event.clientX, event.clientY);
    if (under && element.contains(under)) handler(under);
  });
  element.addEventListener('pointercancel', (event) => {
    if (event.pointerId === pointerId) pointerId = null;
  });
  element.addEventListener('click', (event) => {
    if (event.detail === 0) handler(event.target);
  });
}

// Contrôles tactiles (étape 4) : joystick flottant et pincement pour zoomer.
//
// - Joystick : on pose le pouce dans la moitié basse de l'écran, du côté du
//   joystick (gauche par défaut, droite pour jouer de la main gauche) ; le
//   stick apparaît sous le pouce et glisser donne la direction. Rayon 64 px,
//   zone morte 13 %. Jusqu'à 85 % de la course, on marche, d'autant plus vite
//   qu'on pousse loin ; au-delà, on court. Si le doigt dépasse le rayon, le
//   centre le suit : on n'a jamais à revenir en arrière. Un seul doigt le
//   tient, capturé pour ne pas le perdre en sortant du canvas.
// - Pincement : deux doigts sur le canvas, n'importe où, zooment. Le second
//   doigt posé prend le relais du joystick (le héros s'arrête) ; quand un
//   doigt se lève, celui qui reste redevient le joystick s'il est de son côté,
//   recentré sous lui pour que le héros ne parte pas tout seul.
// - Souris exclue (le clavier et la molette suffisent au bureau) : toucher et
//   stylet seulement.
const STICK_RADIUS = 64;
const STICK_DEAD_ZONE = 0.13;
const RUN_THRESHOLD = 0.85; // au-delà de cette part de la course, on court
const STICK_ZONE_TOP = 0.35; // le haut de l'écran (HUD, bandeau) ne fait pas naître le stick

export function createTouchControls(canvas, element) {
  const knob = element.querySelector('.stick-bille');
  const touches = new Map(); // doigts posés sur le canvas : identifiant -> { x, y }
  const center = { x: 0, y: 0 };
  const vector = { x: 0, z: 0 };
  let stickId = null;
  let pinch = null; // { a, b, distance } : les deux doigts et leur dernier écart
  let zoomFactor = 1;
  let leftHanded = false;

  // Côté du joystick : la moitié gauche, ou la droite pour la main gauche.
  function inStickZone(x, y) {
    if (y < canvas.clientHeight * STICK_ZONE_TOP) return false;
    const half = canvas.clientWidth / 2;
    return leftHanded ? x >= half : x <= half;
  }

  function place(x, y) {
    element.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  function startStick(id, x, y) {
    stickId = id;
    center.x = x;
    center.y = y;
    place(x, y);
    knob.style.transform = 'translate(0px, 0px)';
    element.classList.remove('stick-course');
    element.hidden = false;
  }

  function releaseStick() {
    stickId = null;
    vector.x = 0;
    vector.z = 0;
    element.classList.remove('stick-course');
    element.hidden = true;
  }

  function moveStick(x, y) {
    let dx = x - center.x;
    let dy = y - center.y;
    const distance = Math.hypot(dx, dy);
    if (distance > STICK_RADIUS) {
      // Le centre suit le doigt : le stick reste tendu au maximum.
      const over = (distance - STICK_RADIUS) / distance;
      center.x += dx * over;
      center.y += dy * over;
      place(center.x, center.y);
      dx = x - center.x;
      dy = y - center.y;
    }
    knob.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px)`;
    const length = Math.hypot(dx, dy);
    const strength = Math.min(1, length / STICK_RADIUS);
    const running = strength >= RUN_THRESHOLD;
    element.classList.toggle('stick-course', running);
    if (strength < STICK_DEAD_ZONE) {
      vector.x = 0;
      vector.z = 0;
      return;
    }
    // Marche : pleine vitesse au seuil de la course ; course : RUN_FACTOR.
    const speed = running ? RUN_FACTOR : strength / RUN_THRESHOLD;
    vector.x = (dx / length) * speed;
    vector.z = (dy / length) * speed;
  }

  const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  canvas.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    event.preventDefault();
    if (pinch || touches.size >= 2) return; // un troisième doigt ne compte pas
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Pointeur déjà fini (événement rejoué) : les contrôles marchent sans capture.
    }
    if (touches.size === 2) {
      // Deux doigts : le pincement prend le relais du joystick.
      const [a, b] = [...touches.keys()];
      pinch = { a, b, distance: Math.max(1, gap(touches.get(a), touches.get(b))) };
      releaseStick();
    } else if (inStickZone(event.clientX, event.clientY)) {
      startStick(event.pointerId, event.clientX, event.clientY);
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    const touch = touches.get(event.pointerId);
    if (!touch) return;
    touch.x = event.clientX;
    touch.y = event.clientY;
    if (pinch) {
      const distance = Math.max(1, gap(touches.get(pinch.a), touches.get(pinch.b)));
      zoomFactor *= distance / pinch.distance;
      pinch.distance = distance;
    } else if (event.pointerId === stickId) {
      moveStick(touch.x, touch.y);
    }
  });

  function lift(event) {
    if (!touches.delete(event.pointerId)) return;
    if (pinch) {
      // Fin du pincement : le doigt qui reste reprend le joystick, s'il est de son côté.
      pinch = null;
      const [rest] = touches.entries();
      if (rest && inStickZone(rest[1].x, rest[1].y)) startStick(rest[0], rest[1].x, rest[1].y);
    } else if (event.pointerId === stickId) {
      releaseStick();
    }
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, lift);

  // Page quittée en plein geste : plus aucun doigt ne compte.
  const forgetAll = () => {
    touches.clear();
    pinch = null;
    releaseStick();
  };
  window.addEventListener('blur', forgetAll);
  document.addEventListener('visibilitychange', forgetAll);

  return {
    // Direction voulue, longueur RUN_FACTOR au plus, nulle au repos.
    direction: () => vector,
    get active() {
      return stickId !== null;
    },
    // Facteur de zoom du pincement depuis la dernière lecture (plus de 1 :
    // les doigts s'écartent, on s'approche).
    takeZoomFactor() {
      const factor = zoomFactor;
      zoomFactor = 1;
      return factor;
    },
    // Joystick à droite (main gauche) ou à gauche.
    setLeftHanded(on) {
      leftHanded = Boolean(on);
      forgetAll();
    },
    // État lisible par les tests.
    snapshot: () => ({
      doigts: touches.size,
      stick: stickId !== null,
      course: element.classList.contains('stick-course'),
      direction: { x: Number(vector.x.toFixed(3)), z: Number(vector.z.toFixed(3)) },
      pincement: pinch !== null,
      mainGauche: leftHanded,
    }),
  };
}
