// La forge de Ferrand : le menu « Forger ». Une liste en DOM, par-dessus le
// jeu, comme la boutique de Berthe : les trois épées (data/enemies.js), leur
// description, et un bouton qui dit ce qu'on peut faire : forger (si la bourse
// suffit), rien (déjà forgée, ou le niveau d'avant manque). On forge dans
// l'ordre : le bois, puis le fer, puis l'acier.

import { saveGameState } from './state.js';

// root : #forge ; swords : SWORDS de data/enemies.js ; texts :
// textesInterface.forge ; state : l'état de partie (epee : niveau forgé, 0 au
// départ) ; wallet : la bourse ; onForge(niveau) : appelé quand une épée sort.
export function createForge(root, { swords, texts, state, wallet, onForge = () => {} }) {
  const list = root.querySelector('.forge-liste');
  const balance = root.querySelector('.forge-bourse');
  const close = root.querySelector('.forge-fermer');
  root.querySelector('.forge-titre').textContent = texts.titre;
  close.textContent = texts.fermer;

  let open = false;

  function render() {
    balance.textContent = texts.bourse(state.tokens);
    list.replaceChildren(...swords.map((sword) => {
      const level = state.epee ?? 0;
      const forged = level >= sword.niveau;
      const next = level === sword.niveau - 1;
      const text = texts.epees[sword.id];

      const item = document.createElement('li');
      item.className = 'forge-epee';
      item.dataset.forgee = forged ? 'oui' : 'non';
      item.dataset.niveau = String(sword.niveau);
      const icon = document.createElement('span');
      icon.className = 'forge-icone';
      icon.setAttribute('aria-hidden', 'true');
      const label = document.createElement('div');
      label.className = 'forge-texte';
      const name = document.createElement('p');
      name.className = 'forge-nom';
      name.textContent = text.nom;
      const description = document.createElement('p');
      description.className = 'forge-description';
      description.textContent = text.description;
      label.append(name, description);

      const button = document.createElement('button');
      button.type = 'button';
      if (forged) {
        button.textContent = texts.forgee;
        button.disabled = true;
      } else if (!next) {
        button.textContent = texts.avant;
        button.disabled = true;
      } else if (state.tokens >= sword.prix) {
        button.textContent = texts.forger(sword.prix);
        button.classList.add('principal');
        button.addEventListener('click', () => {
          if (!wallet.spend(sword.prix)) return;
          state.epee = sword.niveau;
          saveGameState(state);
          onForge(sword.niveau);
          render();
        });
      } else {
        button.textContent = texts.manque(sword.prix - state.tokens);
        button.disabled = true;
      }
      item.append(icon, label, button);
      return item;
    }));
  }

  function hide() {
    if (!open) return;
    open = false;
    if (root.contains(document.activeElement)) document.activeElement.blur();
    root.hidden = true;
  }

  close.addEventListener('click', hide);
  root.addEventListener('click', (event) => {
    if (event.target === root) hide();
  });
  window.addEventListener('keydown', (event) => {
    if (open && event.code === 'Escape') {
      event.preventDefault();
      hide();
    }
  });

  return {
    get isOpen() {
      return open;
    },
    open() {
      open = true;
      root.hidden = false;
      render();
    },
    close: hide,
  };
}
