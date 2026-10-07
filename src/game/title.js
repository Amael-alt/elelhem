// L'écran titre (version 2.1) : une page de parchemin, l'illustration du
// voyageur qui bondit vers la flamme, le titre, la contrée, l'accroche, puis
// le menu : « Continuer » s'il existe une sauvegarde, « Nouvelle partie »,
// un prénom facultatif, la signature. Sur écran tactile, un bouton choisit le
// côté du joystick (main gauche).
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
  root.querySelector('.titre-droits').textContent = texts.droits;
  root.querySelector('.titre-illustration').alt = texts.illustration;
  const site = root.querySelector('.titre-site');
  site.textContent = texts.site.replace('https://', '');
  site.href = texts.site;
  const label = root.querySelector('.titre-prenom span');
  label.textContent = texts.prenom;
  const input = root.querySelector('.titre-prenom input');
  input.maxLength = NAME_MAX;
  input.value = state.prenom;
  // Le menu : le premier bouton continue la partie s'il y en a une, sinon il
  // en commence une ; le second, « Nouvelle partie », n'existe qu'avec une
  // sauvegarde à écraser.
  const primary = root.querySelector('.titre-commencer');
  primary.textContent = hasSave ? texts.continuer : texts.nouvellePartie;
  const restart = root.querySelector('.titre-nouvelle');
  restart.textContent = texts.nouvellePartie;
  restart.hidden = !hasSave;
  const buttons = [primary, ...(hasSave ? [restart] : [])];
  let selected = 0;
  const select = (index) => {
    selected = (index + buttons.length) % buttons.length;
    buttons.forEach((button, i) => button.classList.toggle('choisi', i === selected));
  };
  select(0);

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

  primary.addEventListener('click', () => start(!hasSave));
  restart.addEventListener('click', () => start(true));
  for (const [i, button] of buttons.entries()) button.addEventListener('pointerenter', () => select(i));
  // Au clavier : Entrée, Espace ou E lancent le bouton choisi ; les flèches
  // (ou Z et S sur un AZERTY, W et S ailleurs) changent de bouton.
  window.addEventListener('keydown', (event) => {
    if (!open) return;
    const inField = event.target === input;
    if (event.code === 'Enter' || event.code === 'NumpadEnter' || (!inField && (event.code === 'Space' || event.code === 'KeyE'))) {
      event.preventDefault();
      if (selected === 0) start(!hasSave);
      else start(true);
      return;
    }
    if (inField) return;
    if (event.code === 'ArrowUp' || event.code === 'KeyW') {
      event.preventDefault();
      select(selected - 1);
    } else if (event.code === 'ArrowDown' || event.code === 'KeyS') {
      event.preventDefault();
      select(selected + 1);
    }
  });

  return {
    get isOpen() {
      return open;
    },
  };
}
