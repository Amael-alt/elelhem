// La boîte de dialogue : du DOM par-dessus le canvas, donc du vrai texte
// français (accents, lisibilité, taille de police du téléphone).
//
// - Machine à écrire à TYPING_SPEED caractères par seconde. Le texte entier
//   est déjà dans la page, la partie pas encore tapée est seulement
//   transparente : la boîte ne change jamais de taille pendant la frappe, et
//   un lecteur d'écran lit la page d'un bloc.
// - Pagination : une action (touche, clic, toucher) termine la page en cours
//   de frappe, puis passe à la suivante. Après la dernière, la boîte se ferme,
//   ou passe la main à la suite de la conversation (onDone).
// - Question : le texte se tape comme une page, puis les choix apparaissent,
//   empilés, assez hauts pour le pouce. On choisit d'un toucher, d'un clic, au
//   chiffre (1, 2, 3), ou en montant et descendant (flèches, Z et S sur un
//   AZERTY) puis en validant avec l'action. Aucun choix n'est présélectionné :
//   enchaîner les pages à la touche d'action ne répond jamais à la question
//   par mégarde.
// - Aucune phrase ici : les textes viennent de data/dialogues.js.

const TYPING_SPEED = 55; // caractères par seconde
const FONTS = ['500 1em Newsreader', '600 1em Newsreader'];

// Touches de la question, lues par position physique (event.code) comme le
// déplacement : KeyW et KeyS sont Z et S sur un AZERTY.
const UP_KEYS = new Set(['ArrowUp', 'KeyW']);
const DOWN_KEYS = new Set(['ArrowDown', 'KeyS']);
const DIGIT = /^(?:Digit|Numpad)([1-9])$/;

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
  const list = root.querySelector('.dialogue-choix');
  const instant = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  // La police se charge dès le démarrage : sans cela, la première page
  // apparaîtrait d'abord en Georgia, puis changerait de largeur.
  for (const font of FONTS) document.fonts?.load(font).catch(() => {});

  let mode = 'pages'; // 'pages' ou 'question'
  let pages = [];
  let page = 0;
  let characters = [];
  let typed = 0; // fractionnaire : la frappe avance au pas du temps
  let open = false;
  let onDone = null; // suite de la conversation après la dernière page
  let choices = []; // { texte, ecarte } ; ecarte : déjà essayé, grisé
  let buttons = [];
  let selected = -1;
  let onChoose = null;

  const typing = () => typed < characters.length;

  function render() {
    const count = Math.min(Math.floor(typed), characters.length);
    seen.textContent = characters.slice(0, count).join('');
    rest.textContent = characters.slice(count).join('');
    root.dataset.frappe = count < characters.length ? 'oui' : 'non';
    root.dataset.fin = mode === 'pages' && page === pages.length - 1 && !onDone ? 'oui' : 'non';
    root.dataset.mode = mode;
    // Les choix n'apparaissent qu'une fois la question entièrement tapée.
    list.hidden = mode !== 'question' || typing();
  }

  function setText(text) {
    characters = Array.from(nonBreaking(text));
    typed = instant ? characters.length : 0;
    render();
  }

  function showPage(index) {
    page = index;
    setText(pages[page]);
  }

  function show(name) {
    nameElement.textContent = name;
    open = true;
    root.hidden = false;
  }

  function close() {
    if (!open) return;
    open = false;
    onDone = null;
    onChoose = null;
    mode = 'pages';
    list.hidden = true;
    root.hidden = true;
    onClose();
  }

  function select(index) {
    selected = index;
    buttons.forEach((button, i) => button.classList.toggle('choisi', i === selected));
  }

  // Déplace la sélection d'un cran (step = +1 ou -1) en sautant les choix
  // déjà écartés. Sans sélection, part du haut ou du bas.
  function move(step) {
    const count = choices.length;
    let index = selected === -1 ? (step > 0 ? -1 : count) : selected;
    for (let n = 0; n < count; n += 1) {
      index = (index + step + count) % count;
      if (!choices[index].ecarte) {
        select(index);
        return;
      }
    }
  }

  function choose(index) {
    if (mode !== 'question' || typing() || !choices[index] || choices[index].ecarte) return;
    const callback = onChoose;
    onChoose = null;
    callback?.(index);
  }

  function advance() {
    if (!open) return;
    if (typing()) {
      typed = characters.length; // termine la page
      render();
    } else if (mode === 'question') {
      if (selected === -1) move(1);
      else choose(selected);
    } else if (page + 1 < pages.length) {
      showPage(page + 1);
    } else if (onDone) {
      const next = onDone;
      onDone = null;
      next();
    } else {
      close();
    }
  }

  // Un toucher ou un clic sur la boîte vaut l'action au clavier ; sur un
  // choix, il choisit (et ne remonte pas jusqu'à la boîte).
  root.addEventListener('click', advance);
  list.addEventListener('click', (event) => {
    event.stopPropagation();
    const button = event.target.closest('button');
    if (button) choose(buttons.indexOf(button));
  });
  list.addEventListener('pointermove', (event) => {
    const index = buttons.indexOf(event.target.closest('button'));
    if (index !== -1 && !choices[index].ecarte && index !== selected) select(index);
  });

  window.addEventListener('keydown', (event) => {
    if (!open || mode !== 'question' || typing() || event.repeat) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLInputElement) return;
    const digit = DIGIT.exec(event.code);
    if (digit) choose(Number(digit[1]) - 1);
    else if (UP_KEYS.has(event.code)) move(-1);
    else if (DOWN_KEYS.has(event.code)) move(1);
    else return;
    event.preventDefault();
  });

  return {
    get isOpen() {
      return open;
    },
    // Montre des pages. then : appelé après la dernière, à la place de la
    // fermeture, pour enchaîner la suite de la conversation.
    open(name, newPages, then = null) {
      if (!newPages.length) return;
      mode = 'pages';
      pages = newPages;
      onDone = then;
      show(name);
      showPage(0);
    },
    // Pose une question. options : [{ texte, ecarte }] ; then(index) reçoit le
    // choix fait.
    ask(name, text, options, then) {
      mode = 'question';
      choices = options;
      onChoose = then;
      onDone = null;
      buttons = options.map((option, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.tabIndex = -1; // le clavier passe par les touches du jeu
        button.className = option.ecarte ? 'ecarte' : '';
        button.disabled = option.ecarte;
        button.dataset.touche = String(i + 1);
        button.textContent = nonBreaking(option.texte);
        const item = document.createElement('li');
        item.append(button);
        return button;
      });
      list.replaceChildren(...buttons.map((button) => button.parentElement));
      selected = -1;
      show(name);
      setText(text);
    },
    advance,
    choose,
    close,
    update(dt) {
      if (!open || !typing()) return;
      const before = Math.floor(typed);
      typed += TYPING_SPEED * dt;
      if (Math.floor(typed) !== before) render();
    },
    // Pour les tests scriptés (window.__lia).
    snapshot() {
      return {
        open,
        mode,
        nom: nameElement.textContent,
        page,
        pages: mode === 'pages' ? pages.length : 0,
        texte: characters.join(''),
        tape: Math.min(Math.floor(typed), characters.length),
        enFrappe: open && typing(),
        choix: mode === 'question' ? choices.map((c) => ({ texte: c.texte, ecarte: Boolean(c.ecarte) })) : [],
        selection: selected,
      };
    },
  };
}
