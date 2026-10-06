// Le générique de fin : quand Clodomir a remis le diplôme et qu'on le
// referme, les noms défilent sur le village assombri, comme à la fin d'un
// RPG, jusqu'au remerciement qui reste au milieu de l'écran. Un toucher, un
// clic, Échap ou la touche d'action le referment. Avec le mouvement réduit,
// rien ne défile : le texte se lit d'un bloc, et défile au doigt s'il est long.
//
// Aucune phrase ici : les textes viennent de data/dialogues.js
// (textesInterface.generique), les noms des habitants de leur fiche.

import { onTap } from '../core/input.js';

const SPEED = 55; // pixels par seconde
const CLOSE_KEYS = new Set(['Escape', 'Enter', 'NumpadEnter', 'Space', 'KeyE']);

// root : #generique ; texts : textesInterface.generique ; cast : noms des
// habitants, dans l'ordre où ils apparaissent ; state : l'état de partie (le
// prénom du remerciement).
export function createCredits(root, { texts, cast, state }) {
  const scroller = root.querySelector('.generique-defile');
  const hint = root.querySelector('.generique-passer');
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let open = false;
  let animation = null;

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  };

  // Le contenu est refait à chaque fois : le prénom a pu changer.
  function build() {
    const blocks = [
      element('p', 'generique-titre', texts.titre),
      element('p', 'generique-sous-titre', texts.sousTitre),
    ];
    for (const section of texts.sections) {
      const block = element('section', 'generique-bloc');
      block.append(element('h2', 'generique-role', section.role));
      const names = section.habitants ? cast : section.noms;
      for (const name of names) block.append(element('p', 'generique-nom', name));
      if (section.note) block.append(element('p', 'generique-note', section.note));
      blocks.push(block);
    }
    const end = element('section', 'generique-fin');
    end.append(element('p', 'generique-merci', texts.merci(state.prenom)), element('p', 'generique-site', texts.site));
    blocks.push(end);
    scroller.replaceChildren(...blocks);
    return end;
  }

  function close() {
    if (!open) return;
    open = false;
    animation?.cancel();
    animation = null;
    root.hidden = true;
  }

  function play() {
    const end = build();
    open = true;
    root.hidden = false;
    hint.textContent = texts.passer;
    root.classList.toggle('generique-fixe', still);
    if (still) return;
    // Du bas de l'écran jusqu'au remerciement, centré, où il s'arrête.
    const height = root.clientHeight;
    const stop = end.offsetTop + end.offsetHeight / 2 - height / 2;
    animation = scroller.animate(
      [{ transform: `translateY(${height}px)` }, { transform: `translateY(${-stop}px)` }],
      { duration: ((height + stop) / SPEED) * 1000, easing: 'linear', fill: 'forwards' },
    );
    animation.onfinish = () => {
      hint.textContent = texts.revenir;
    };
  }

  // Avec le mouvement réduit, le texte se fait défiler au doigt : un toucher
  // ne doit pas le fermer, seul le rappel du bas le fait.
  onTap(root, (under) => {
    if (!still || hint.contains(under)) close();
  });
  // En phase de capture, et sans laisser passer : la touche qui ferme le
  // générique ne doit pas aussi rouvrir la conversation avec Clodomir, resté
  // juste à côté.
  window.addEventListener('keydown', (event) => {
    if (!open || !CLOSE_KEYS.has(event.code)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    close();
  }, { capture: true });

  return {
    get isOpen() {
      return open;
    },
    play,
    close,
  };
}
