// L'écran titre, par-dessus le village vivant : la flamme Maintenant Vous
// Savez, le titre, la contrée, l'accroche, la signature, un prénom facultatif
// et l'invitation à commencer. S'il existe une sauvegarde, l'action principale
// reprend la partie et un lien discret en commence une nouvelle. Sur écran
// tactile, un bouton choisit le côté du joystick (main gauche).
//
// Aucune phrase ici : les textes viennent de data/dialogues.js
// (textesInterface). Le jeu ne reçoit aucune entrée tant que l'écran est
// ouvert.

const FADE_MS = 650;
const NAME_MAX = 24;

// root : #titre ; texts : textesInterface ; state : l'état de partie ;
// onStart({ fresh }) : appelé au lancement, fresh vrai pour une nouvelle partie ;
// leftHanded : joystick à droite au départ ; onHandedness(on) : appelé quand
// le joueur change de côté.
export function createTitleScreen(root, { texts, state, onStart, leftHanded = false, onHandedness = () => {} }) {
  const hasSave = state.visites.size > 0 || state.parchemins.size > 0 || state.prenom !== '';
  root.querySelector('.titre-nom').textContent = texts.titre;
  root.querySelector('.titre-contree').textContent = texts.contree;
  root.querySelector('.titre-accroche').textContent = texts.accroche;
  root.querySelector('.titre-signature').textContent = texts.signature;
  const site = root.querySelector('.titre-site');
  site.textContent = texts.site.replace('https://', '');
  site.href = texts.site;
  const label = root.querySelector('.titre-prenom span');
  label.textContent = texts.prenom;
  const input = root.querySelector('.titre-prenom input');
  input.maxLength = NAME_MAX;
  input.value = state.prenom;
  const prompt = root.querySelector('.titre-commencer');
  prompt.textContent = hasSave ? texts.reprendre : texts.commencer;
  const restart = root.querySelector('.titre-nouvelle');
  restart.textContent = texts.nouvellePartie;
  restart.hidden = !hasSave;

  // Le côté du joystick : le bouton dit où il est, un toucher le change.
  const sides = root.querySelector('.titre-commandes');
  const sideLabel = sides.querySelector('span');
  let left = leftHanded;
  const showSide = () => {
    const text = left ? texts.commandes.droite : texts.commandes.gauche;
    sideLabel.textContent = text;
    sides.setAttribute('aria-label', texts.commandes.changer(text));
  };
  showSide();
  sides.addEventListener('click', () => {
    left = !left;
    showSide();
    onHandedness(left);
  });
  root.hidden = false;

  let open = true;

  function start(fresh) {
    if (!open) return;
    open = false;
    root.classList.add('titre-fondu');
    setTimeout(() => {
      root.hidden = true;
    }, FADE_MS);
    onStart({ fresh, prenom: input.value.trim().slice(0, NAME_MAX) });
  }

  // Un clic ou un toucher n'importe où lance le jeu, sauf sur le champ du
  // prénom, le lien du site, le lien « nouvelle partie » et le côté du joystick.
  root.addEventListener('click', (event) => {
    if (event.target.closest('input, label, a, .titre-nouvelle, .titre-commandes')) return;
    start(false);
  });
  restart.addEventListener('click', () => start(true));
  window.addEventListener('keydown', (event) => {
    if (!open) return;
    const inField = event.target === input;
    if (event.code === 'Enter' || event.code === 'NumpadEnter' || (!inField && (event.code === 'Space' || event.code === 'KeyE'))) {
      event.preventDefault();
      start(false);
    }
  });

  return {
    get isOpen() {
      return open;
    },
  };
}
