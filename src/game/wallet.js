// La bourse du héros : le compteur de Tokens, sous le compteur de parchemins,
// et ce qui les fait gagner ou dépenser. Chaque gain s'affiche un instant
// (« +10 ») et se sauvegarde aussitôt. La pièce est dessinée en CSS.

import { saveGameState } from './state.js';

const GAIN_MS = 1600;

// root : #tokens ; state : l'état de partie ; texts : textesInterface.tokens.
export function createWallet(root, { state, texts }) {
  const amount = root.querySelector('.tokens-montant');
  const gain = root.querySelector('.tokens-gain');
  let timer = 0;

  function refresh() {
    amount.textContent = String(state.tokens);
    root.setAttribute('aria-label', texts.solde(state.tokens));
  }

  refresh();

  return {
    get balance() {
      return state.tokens;
    },
    show() {
      refresh();
      root.hidden = false;
    },
    refresh,
    // Ajoute n Tokens, avec le petit « +n » qui s'envole.
    earn(n) {
      if (n <= 0) return;
      state.tokens += n;
      saveGameState(state);
      refresh();
      gain.textContent = texts.gain(n);
      gain.classList.remove('tokens-gagne');
      void gain.offsetWidth; // relance l'animation
      gain.classList.add('tokens-gagne');
      clearTimeout(timer);
      timer = setTimeout(() => gain.classList.remove('tokens-gagne'), GAIN_MS);
    },
    // Retire n Tokens si la bourse le permet ; renvoie vrai si c'est fait.
    spend(n) {
      if (n > state.tokens) return false;
      state.tokens -= n;
      saveGameState(state);
      refresh();
      return true;
    },
  };
}
