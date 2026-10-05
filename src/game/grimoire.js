// Le grimoire : un livre qui rassemble les parchemins gagnés, pour relire ce
// qu'on a appris. Une page par notion, dans l'ordre du compteur : l'habitant
// qui l'enseigne, sa maxime et sa leçon ; une page vierge pour celles qui
// restent à trouver. On l'ouvre en touchant le compteur (ou touche G), on
// tourne les pages aux flèches, au doigt sur les onglets ou avec les boutons.
// Du DOM : du vrai texte, qui défile dans la page si la leçon est longue.

import { nonBreaking } from './dialogue.js';

const PREVIOUS_KEYS = new Set(['ArrowLeft', 'KeyA']);
const NEXT_KEYS = new Set(['ArrowRight', 'KeyD']);
const TOGGLE_KEY = 'KeyG';

// root : #grimoire ; ids : les parchemins dans l'ordre du compteur ; notions :
// identifiant -> notion ; texts : data/dialogues.js (nom, maxime, lecon de
// chaque habitant) ; labels : textesInterface.grimoire ; state : l'état de
// partie ; canOpen() : faux tant qu'on ne peut pas l'ouvrir (écran titre,
// conversation en cours).
export function createGrimoire(root, { ids, notions, texts, labels, state, canOpen }) {
  const tabs = root.querySelector('.grimoire-onglets');
  const page = root.querySelector('.grimoire-page');
  const number = root.querySelector('.grimoire-numero');
  const notion = root.querySelector('.grimoire-notion');
  const master = root.querySelector('.grimoire-maitre');
  const maxim = root.querySelector('.grimoire-maxime');
  const lesson = root.querySelector('.grimoire-lecon');
  const previous = root.querySelector('.grimoire-precedente');
  const next = root.querySelector('.grimoire-suivante');
  const close = root.querySelector('.grimoire-fermer');
  root.querySelector('.grimoire-titre').textContent = labels.titre;
  previous.textContent = labels.precedente;
  next.textContent = labels.suivante;
  close.textContent = labels.fermer;

  const tabButtons = ids.map((id, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'grimoire-onglet';
    button.setAttribute('aria-label', labels.page(i + 1, notions[id]));
    button.addEventListener('click', () => show(i));
    tabs.append(button);
    return button;
  });

  let open = false;
  let index = 0;

  function show(newIndex) {
    index = Math.max(0, Math.min(ids.length - 1, newIndex));
    const id = ids[index];
    const entry = texts[id];
    const owned = state.parchemins.has(id);
    root.dataset.vierge = owned ? 'non' : 'oui';
    number.textContent = labels.numero(index + 1, ids.length);
    notion.textContent = notions[id];
    master.textContent = owned ? entry.nom : '';
    maxim.textContent = owned && entry.maxime ? nonBreaking(`« ${entry.maxime} »`) : '';
    if (owned) {
      lesson.replaceChildren(...entry.lecon.map((text) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = nonBreaking(text);
        return paragraph;
      }));
    } else {
      const blank = document.createElement('p');
      blank.className = 'grimoire-vierge';
      blank.textContent = nonBreaking(labels.vierge(entry.nom));
      lesson.replaceChildren(blank);
    }
    tabButtons.forEach((button, i) => {
      button.classList.toggle('obtenu', state.parchemins.has(ids[i]));
      button.setAttribute('aria-current', i === index ? 'page' : 'false');
    });
    previous.disabled = index === 0;
    next.disabled = index === ids.length - 1;
    page.scrollTop = 0;
  }

  function hide() {
    if (!open) return;
    open = false;
    if (root.contains(document.activeElement)) document.activeElement.blur();
    root.hidden = true;
  }

  // Ouvre à la page demandée, sinon à la dernière notion gagnée.
  function openAt(at) {
    const owned = ids.map((id, i) => (state.parchemins.has(id) ? i : -1)).filter((i) => i !== -1);
    open = true;
    root.hidden = false;
    show(at ?? owned.at(-1) ?? 0);
  }

  previous.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  close.addEventListener('click', hide);
  root.addEventListener('click', (event) => {
    if (event.target === root) hide(); // un clic sur le fond referme
  });

  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.target instanceof HTMLInputElement) return;
    if (!open) {
      if (event.code === TOGGLE_KEY && canOpen()) openAt();
      return;
    }
    if (event.code === 'Escape' || event.code === TOGGLE_KEY) hide();
    else if (PREVIOUS_KEYS.has(event.code)) show(index - 1);
    else if (NEXT_KEYS.has(event.code)) show(index + 1);
    else return;
    event.preventDefault();
  });

  return {
    get isOpen() {
      return open;
    },
    get page() {
      return index;
    },
    open: openAt,
    close: hide,
    show,
  };
}
