// Garde-fous tactiles : la page ne zoome pas, ne défile pas et n'ouvre pas de
// menu sous un doigt long. Ils complètent styles.css (touch-action,
// overscroll-behavior) et la balise viewport (user-scalable=no), que Safari
// sur iPhone ignore pour le pincement : il faut y bloquer ses gestes.

// Là où le navigateur garde ses gestes : choisir un mot dans le champ du
// prénom, coller, ouvrir le lien du site dans un nouvel onglet.
const KEEP_GESTURES = 'input, a';

const keeps = (event) => event.target instanceof Element && event.target.closest(KEEP_GESTURES);

export function installTouchGuards() {
  const block = (event) => event.preventDefault();
  const options = { passive: false };

  // Safari : le pincement de la page passe par ces événements-là.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, block, options);

  // Double toucher : un zoom de la page sur certains navigateurs.
  document.addEventListener('dblclick', (event) => {
    if (!keeps(event)) event.preventDefault();
  }, options);

  // Deux doigts qui glissent sur un panneau (grimoire, boutique) : ni zoom ni
  // défilement de la page. Un seul doigt y fait toujours défiler la liste.
  document.addEventListener('touchmove', (event) => {
    if (event.touches.length > 1) event.preventDefault();
  }, options);

  // Doigt long : pas de menu contextuel.
  window.addEventListener('contextmenu', (event) => {
    if (!keeps(event)) event.preventDefault();
  });
}

// Écran tactile : html[data-tactile] montre le bouton d'action et le réglage
// du côté du joystick (styles.css). Posé dès le départ si l'appareil a un
// pointeur grossier (un doigt), sinon au premier toucher (ordinateur à écran
// tactile, pointeur détecté tard).
export function trackTouchScreen() {
  const root = document.documentElement;
  if (window.matchMedia?.('(any-pointer: coarse)').matches) {
    root.dataset.tactile = '';
    return;
  }
  const onPointer = (event) => {
    if (event.pointerType !== 'touch') return;
    root.dataset.tactile = '';
    window.removeEventListener('pointerdown', onPointer, true);
  };
  window.addEventListener('pointerdown', onPointer, true);
}
