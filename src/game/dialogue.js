// La boîte de dialogue : du DOM par-dessus le canvas, donc du vrai texte
// français (accents, lisibilité, taille de police du téléphone).
//
// - Machine à écrire à TYPING_SPEED caractères par seconde. Le texte entier
//   est déjà dans la page, la partie pas encore tapée est seulement
//   transparente : la boîte ne change jamais de taille pendant la frappe, et
//   un lecteur d'écran lit la page d'un bloc.
// - Pagination : une action (touche, clic, toucher) termine la page en cours
//   de frappe, puis passe à la suivante, puis ferme à la dernière.
// - Aucune phrase ici : les pages viennent de data/dialogues.js.

const TYPING_SPEED = 55; // caractères par seconde
const FONTS = ['500 1em Newsreader', '600 1em Newsreader'];

// Typographie française : espace insécable avant : ; ! ? et à l'intérieur des
// guillemets, pour qu'une ligne ne se coupe jamais entre un mot et sa
// ponctuation. Faite ici, à l'affichage : les textes restent de l'écriture
// ordinaire, sans caractère invisible.
const NBSP = String.fromCharCode(0xa0);
const nonBreaking = (text) => text.replace(/ (?=[:;!?»])/g, NBSP).replace(/(?<=«) /g, NBSP);

export function createDialogueBox(root, { onClose = () => {} } = {}) {
  const nameElement = root.querySelector('.dialogue-nom');
  const seen = root.querySelector('.vu');
  const rest = root.querySelector('.reste');
  const instant = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  // La police se charge dès le démarrage : sans cela, la première page
  // apparaîtrait d'abord en Georgia, puis changerait de largeur.
  for (const font of FONTS) document.fonts?.load(font).catch(() => {});

  let pages = [];
  let page = 0;
  let characters = [];
  let typed = 0; // fractionnaire : la frappe avance au pas du temps
  let open = false;

  function render() {
    const count = Math.min(Math.floor(typed), characters.length);
    seen.textContent = characters.slice(0, count).join('');
    rest.textContent = characters.slice(count).join('');
    root.dataset.frappe = count < characters.length ? 'oui' : 'non';
    root.dataset.fin = page === pages.length - 1 ? 'oui' : 'non';
  }

  function showPage(index) {
    page = index;
    characters = Array.from(nonBreaking(pages[page]));
    typed = instant ? characters.length : 0;
    render();
  }

  function close() {
    if (!open) return;
    open = false;
    root.hidden = true;
    onClose();
  }

  function advance() {
    if (!open) return;
    if (typed < characters.length) {
      typed = characters.length; // termine la page
      render();
    } else if (page + 1 < pages.length) {
      showPage(page + 1);
    } else {
      close();
    }
  }

  // Un toucher ou un clic sur la boîte vaut l'action au clavier.
  root.addEventListener('click', advance);

  return {
    get isOpen() {
      return open;
    },
    open(name, newPages) {
      if (!newPages.length) return;
      pages = newPages;
      nameElement.textContent = name;
      open = true;
      root.hidden = false;
      showPage(0);
    },
    advance,
    close,
    update(dt) {
      if (!open || typed >= characters.length) return;
      const before = Math.floor(typed);
      typed += TYPING_SPEED * dt;
      if (Math.floor(typed) !== before) render();
    },
    // Pour les tests scriptés (window.__lia).
    snapshot() {
      return {
        open,
        nom: nameElement.textContent,
        page,
        pages: pages.length,
        texte: characters.join(''),
        tape: Math.min(Math.floor(typed), characters.length),
        enFrappe: open && typed < characters.length,
      };
    },
  };
}
