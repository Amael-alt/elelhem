// La feuille de personnage : la fiche d'apprenti mage, par-dessus le jeu
// (touche F, ou le bouton livre du HUD). Le portrait du héros dans son cadre
// rond, le prénom et la tenue, les huit notions et leur état, les Tokens, les
// clartés, l'épée, les lieux découverts. Que de la lecture : rien ne s'y change.

import { onTap } from '../core/input.js';

// root : #feuille ; texts : textesInterface.feuille ; notions :
// textesInterface.parchemins.notions (id -> nom) ; ids : ordre des parchemins ;
// state : l'état de partie ; outfits : tenues de data/tokens.js et outfitTexts
// (textesInterface.boutique.tenues) ; swords : SWORDS et swordTexts
// (textesInterface.forge.epees) ; combat : clartes et maxClartes ; places :
// nombre de lieux à découvrir ; canOpen() : rien d'autre n'occupe l'écran.
// button : le bouton livre du HUD (#fiche), qui ouvre et ferme la feuille.
export function createSheet(root, { button, texts, notions, ids, state, outfits, outfitTexts, swords, swordTexts, combat, places, canOpen }) {
  const close = root.querySelector('.feuille-fermer');
  const name = root.querySelector('.feuille-prenom');
  const subtitle = root.querySelector('.feuille-sous-titre');
  const stats = root.querySelector('.feuille-stats');
  const list = root.querySelector('.feuille-notions');
  root.querySelector('.feuille-titre').textContent = texts.titre;
  root.querySelector('.feuille-notions-titre').textContent = texts.notions;
  close.textContent = texts.fermer;

  let open = false;

  const stat = (label, value) => {
    const item = document.createElement('div');
    item.className = 'feuille-stat';
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = value;
    item.append(term, detail);
    return item;
  };

  function render() {
    name.textContent = state.prenom || texts.anonyme;
    const outfit = outfitTexts[state.tenue]?.nom ?? '';
    subtitle.textContent = texts.sousTitre(state.parchemins.size, ids.length, outfit);
    const level = state.epee ?? 0;
    const sword = swords.find((s) => s.niveau === level);
    stats.replaceChildren(
      stat(texts.tokens, String(state.tokens)),
      stat(texts.clartes, `${combat.clartes} / ${combat.maxClartes}`),
      stat(texts.epee, sword ? swordTexts[sword.id].nom : texts.sansEpee),
      stat(texts.lieux, `${state.decouvertes.size} / ${places}`),
    );
    list.replaceChildren(...ids.map((id) => {
      const item = document.createElement('li');
      const learned = state.parchemins.has(id);
      item.dataset.etat = learned ? 'apprise' : 'a-apprendre';
      const label = document.createElement('span');
      label.className = 'feuille-notion';
      label.textContent = notions[id];
      const status = document.createElement('span');
      status.className = 'feuille-etat';
      const mistakes = state.erreurs.get(id) ?? 0;
      status.textContent = learned ? (mistakes ? texts.apprise : texts.appriseDuPremierCoup) : texts.aApprendre;
      item.append(label, status);
      return item;
    }));
  }

  function hide() {
    if (!open) return;
    open = false;
    if (root.contains(document.activeElement)) document.activeElement.blur();
    root.hidden = true;
  }

  function show() {
    if (open || !canOpen()) return;
    open = true;
    root.hidden = false;
    render();
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

  const toggle = () => {
    if (open) hide();
    else show();
  };
  if (button) {
    button.setAttribute('aria-label', texts.bouton);
    button.title = texts.bouton;
    onTap(button, toggle);
  }

  return {
    get isOpen() {
      return open;
    },
    open: show,
    close: hide,
    toggle,
    showButton() {
      if (button) button.hidden = false;
    },
  };
}
