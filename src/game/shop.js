// La boutique de Berthe : les tenues du héros (data/tokens.js). Une liste en
// DOM, par-dessus le jeu : un échantillon des couleurs, le nom, la
// description, et un bouton qui dit ce qu'on peut faire : acheter (si la
// bourse suffit), porter (si on l'a déjà), ou rien (on la porte).

import { saveGameState } from './state.js';

// root : #boutique ; outfits : tenues de data/tokens.js ; basePalette : la
// palette du héros (pour l'échantillon de la tenue de départ) ; texts :
// textesInterface.boutique ; state : l'état de partie ; wallet : la bourse
// (wallet.js) ; onWear(id) : appelé quand le héros change de tenue.
export function createShop(root, { outfits, basePalette, texts, state, wallet, onWear }) {
  const list = root.querySelector('.boutique-liste');
  const balance = root.querySelector('.boutique-bourse');
  const close = root.querySelector('.boutique-fermer');
  root.querySelector('.boutique-titre').textContent = texts.titre;
  close.textContent = texts.fermer;

  let open = false;

  function wear(id) {
    state.tenue = id;
    saveGameState(state);
    onWear(id);
    render();
  }

  function render() {
    balance.textContent = texts.bourse(state.tokens);
    list.replaceChildren(...outfits.map((outfit) => {
      const owned = state.tenues.has(outfit.id);
      const worn = state.tenue === outfit.id;
      const text = texts.tenues[outfit.id];
      const palette = { ...basePalette, ...outfit.palette };

      const item = document.createElement('li');
      item.className = 'boutique-tenue';
      item.dataset.portee = worn ? 'oui' : 'non';
      const swatch = document.createElement('span');
      swatch.className = 'boutique-echantillon';
      swatch.setAttribute('aria-hidden', 'true');
      swatch.style.background = `linear-gradient(135deg, ${palette.accent[2]} 0 55%, ${palette.vetement[2]} 55% 100%)`;
      const label = document.createElement('div');
      label.className = 'boutique-texte';
      const name = document.createElement('p');
      name.className = 'boutique-nom';
      name.textContent = text.nom;
      const description = document.createElement('p');
      description.className = 'boutique-description';
      description.textContent = text.description;
      label.append(name, description);

      const button = document.createElement('button');
      button.type = 'button';
      if (worn) {
        button.textContent = texts.portee;
        button.disabled = true;
      } else if (owned) {
        button.textContent = texts.porter;
        button.addEventListener('click', () => wear(outfit.id));
      } else if (state.tokens >= outfit.prix) {
        button.textContent = texts.acheter(outfit.prix);
        button.classList.add('principal');
        button.addEventListener('click', () => {
          if (!wallet.spend(outfit.prix)) return;
          state.tenues.add(outfit.id);
          wear(outfit.id);
        });
      } else {
        button.textContent = texts.manque(outfit.prix - state.tokens);
        button.disabled = true;
      }
      item.append(swatch, label, button);
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
