// Le compteur de parchemins, en haut à gauche : un emplacement par parchemin,
// vide tant qu'on ne l'a pas, rempli d'or ensuite. À l'obtention,
// l'emplacement s'illumine et une annonce donne la notion gagnée. Le compteur
// est un bouton : il ouvre le grimoire. Du DOM, dessiné en CSS : aucune image.

const ANNOUNCE_MS = 4500;

// root : #parchemins ; notions : identifiant -> notion (data/dialogues.js),
// dans l'ordre des emplacements ; texts : textesInterface.parchemins ;
// state : l'état de partie ; onOpen : appelé quand on touche le compteur.
export function createScrollCounter(root, { notions, texts, state, onOpen = () => {} }) {
  const row = root.querySelector('.parchemins-rangee');
  const announce = root.querySelector('.parchemins-annonce');
  const ids = Object.keys(notions);
  const slots = new Map();
  let timer = 0;

  for (const id of ids) {
    const slot = document.createElement('span');
    slot.className = 'parchemin';
    slot.dataset.id = id;
    row.append(slot);
    slots.set(id, slot);
  }

  // Remet chaque emplacement d'accord avec l'état (chargement, nouvelle partie).
  function refresh() {
    let count = 0;
    for (const [id, slot] of slots) {
      const owned = state.parchemins.has(id);
      if (owned) count += 1;
      slot.classList.toggle('obtenu', owned);
      slot.title = owned ? notions[id] : `${notions[id]} : ${texts.manquant}`;
    }
    row.setAttribute('aria-label', texts.ouvrir(count, ids.length));
  }

  // L'annonce sous le compteur : un titre, une ligne, un rappel facultatif.
  function say(title, line, note = '') {
    const parts = [title, document.createElement('br'), line];
    if (note) {
      const small = document.createElement('small');
      small.textContent = note;
      parts.push(small);
    }
    announce.replaceChildren(...parts);
    announce.hidden = false;
    announce.classList.remove('parchemins-sortie');
    clearTimeout(timer);
    timer = setTimeout(() => announce.classList.add('parchemins-sortie'), ANNOUNCE_MS);
  }

  refresh();
  row.addEventListener('click', () => {
    row.blur(); // les touches Espace et Entrée reviennent au jeu
    onOpen();
  });

  return {
    ids,
    show() {
      refresh();
      root.hidden = false;
    },
    refresh,
    // Un parchemin vient d'être gagné : l'emplacement s'illumine, l'annonce
    // passe.
    gain(id) {
      refresh();
      const slot = slots.get(id);
      if (!slot) return;
      slot.classList.remove('gagne');
      void slot.offsetWidth; // relance l'animation si elle vient de jouer
      slot.classList.add('gagne');
      say(texts.obtenu, notions[id], texts.relire);
    },
    // Une autre annonce au même endroit (un coffre ouvert, par exemple).
    say,
  };
}
